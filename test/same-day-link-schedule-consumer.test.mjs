import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { scheduleModel } from "../src/core/schedule.js";

const bridgeSource = readFileSync(new URL("../legacy-core-bridge.js", import.meta.url), "utf8");
const featureSource = readFileSync(
  new URL("../src/features/same-day-link-style/implementation.js", import.meta.url),
  "utf8"
);

function loadFeature({ schedule = scheduleModel, withBridge = true } = {}) {
  const baseCalls = [];
  const window = {
    CherryCore: { schedule },
    addEventListener() {}
  };
  const context = vm.createContext({
    window,
    makeBranchPath(parent, child, color, width, dash) {
      const classes = new Set();
      const path = {
        classList: {
          add(name) {
            classes.add(name);
          },
          contains(name) {
            return classes.has(name);
          }
        },
        classes
      };
      baseCalls.push({ parent, child, color, width, dash, path });
      return path;
    }
  });

  if (withBridge) vm.runInContext(bridgeSource, context);
  vm.runInContext(featureSource, context);

  return { makeBranchPath: context.makeBranchPath, baseCalls, window };
}

test("same-day link wrapper uses Core schedule semantics without mutating tasks or geometry inputs", () => {
  const calls = { normalize: 0, date: 0 };
  const coreSchedule = {
    ...scheduleModel,
    normalizeSchedule(...args) {
      calls.normalize += 1;
      return scheduleModel.normalizeSchedule(...args);
    },
    scheduleDate(schedule) {
      calls.date += 1;
      return scheduleModel.scheduleDate(schedule);
    }
  };
  const { makeBranchPath, baseCalls } = loadFeature({ schedule: coreSchedule });
  const cases = [
    {
      name: "canonical none wins over a stale matching targetAt",
      parent: { schedule: { type: "none", date: null, time: null }, targetAt: "2026-08-20" },
      child: { schedule: { type: "date", date: "2026-08-20", time: null }, targetAt: "2026-08-20" },
      expected: "crossDayLink"
    },
    {
      name: "matching canonical date schedules are same-day",
      parent: { schedule: { type: "date", date: "2026-08-21", time: null }, targetAt: "2026-08-20" },
      child: { schedule: { type: "date", date: "2026-08-21", time: null }, targetAt: "2026-08-22" },
      expected: "sameDayLink"
    },
    {
      name: "matching canonical date and datetime schedules are same-day",
      parent: { schedule: { type: "date", date: "2026-08-21", time: null }, targetAt: "2026-08-20" },
      child: { schedule: { type: "datetime", date: "2026-08-21", time: "18:30" }, targetAt: "2026-08-22" },
      expected: "sameDayLink"
    },
    {
      name: "different canonical dates are cross-day",
      parent: { schedule: { type: "date", date: "2026-08-21", time: null }, targetAt: "2026-08-21" },
      child: { schedule: { type: "date", date: "2026-08-22", time: null }, targetAt: "2026-08-21" },
      expected: "crossDayLink"
    },
    {
      name: "two undated tasks are cross-day",
      parent: { schedule: { type: "none", date: null, time: null }, targetAt: "2026-08-20" },
      child: { schedule: { type: "none", date: null, time: null }, targetAt: "2026-08-20" },
      expected: "crossDayLink"
    },
    {
      name: "one dated and one undated task are cross-day",
      parent: { schedule: { type: "date", date: "2026-08-21", time: null }, targetAt: "2026-08-21" },
      child: { schedule: { type: "none", date: null, time: null }, targetAt: "2026-08-21" },
      expected: "crossDayLink"
    },
    {
      name: "invalid canonical schedules use matching valid legacy fallbacks",
      parent: { schedule: { type: "date", date: "tomorrow", time: null }, targetAt: "2026-08-24" },
      child: { schedule: { type: "datetime", date: "2026-08-24", time: "25:00" }, targetAt: "2026-08-24" },
      expected: "sameDayLink"
    },
    {
      name: "matching legacy-only targetAt values remain same-day",
      parent: { targetAt: "2026-08-25" },
      child: { targetAt: "2026-08-25" },
      expected: "sameDayLink"
    },
    {
      name: "invalid and missing schedule data remain cross-day",
      parent: { schedule: { type: "date", date: "tomorrow", time: null }, targetAt: "tomorrow" },
      child: {},
      expected: "crossDayLink"
    }
  ];

  for (const [index, { name, parent, child, expected }] of cases.entries()) {
    const parentBefore = structuredClone(parent);
    const childBefore = structuredClone(child);
    const color = `color-${index}`;
    const width = index + 1;
    const dash = `dash-${index}`;
    const path = makeBranchPath(parent, child, color, width, dash);
    const baseCall = baseCalls[index];

    assert.equal(path.classList.contains(expected), true, name);
    assert.equal(path.classList.contains(expected === "sameDayLink" ? "crossDayLink" : "sameDayLink"), false, name);
    assert.strictEqual(baseCall.parent, parent, `${name}: parent geometry input`);
    assert.strictEqual(baseCall.child, child, `${name}: child geometry input`);
    assert.equal(baseCall.color, color, `${name}: color geometry input`);
    assert.equal(baseCall.width, width, `${name}: width geometry input`);
    assert.equal(baseCall.dash, dash, `${name}: dash geometry input`);
    assert.strictEqual(path, baseCall.path, `${name}: base SVG path`);
    assert.deepEqual(parent, parentBefore, `${name}: parent must remain read-only`);
    assert.deepEqual(child, childBefore, `${name}: child must remain read-only`);
  }

  assert.equal(baseCalls.length, cases.length);
  assert.equal(calls.normalize, cases.length * 2);
  assert.equal(calls.date, cases.length * 2);
});

test("a missing schedule bridge degrades conservatively without reading targetAt", () => {
  let legacyReads = 0;
  const legacyTask = {};
  Object.defineProperty(legacyTask, "targetAt", {
    enumerable: true,
    get() {
      legacyReads += 1;
      throw new Error("targetAt must not be read directly");
    }
  });
  const { makeBranchPath } = loadFeature({ withBridge: false });
  const path = makeBranchPath(legacyTask, legacyTask, "black", 4, "");

  assert.equal(path.classList.contains("sameDayLink"), false);
  assert.equal(path.classList.contains("crossDayLink"), true);
  assert.equal(legacyReads, 0);
});

test("same-day link classification reads dates only through CherryScheduleBridge", () => {
  assert.match(featureSource, /CherryScheduleBridge\?\.getTaskDate/);
  assert.doesNotMatch(featureSource, /\btargetAt\b/);
  assert.doesNotMatch(featureSource, /normalizeDate/);
});
