import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { scheduleModel } from "../src/core/schedule.js";

const bridgeSource = readFileSync(new URL("../legacy-core-bridge.js", import.meta.url), "utf8");
const listViewSource = readFileSync(new URL("../src/features/list-view/implementation.js", import.meta.url), "utf8");

function loadBridge(schedule, extraWindow = {}) {
  const listeners = new Map();
  const window = {
    CherryCore: schedule ? { schedule } : null,
    addEventListener(name, callback) {
      listeners.set(name, callback);
    },
    ...extraWindow
  };

  vm.runInNewContext(bridgeSource, { window });
  return { bridge: window.CherryScheduleBridge, listeners, window };
}

test("List View schedule bridge delegates date semantics to Core without mutating tasks", () => {
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
  const { bridge } = loadBridge(coreSchedule);
  const cases = [
    {
      name: "canonical none wins over stale targetAt",
      task: { schedule: { type: "none", date: null, time: null }, targetAt: "2026-08-20" },
      expected: null
    },
    {
      name: "canonical date wins over conflicting targetAt",
      task: { schedule: { type: "date", date: "2026-08-21", time: null }, targetAt: "2026-08-20" },
      expected: "2026-08-21"
    },
    {
      name: "canonical datetime uses its date without adding time display semantics",
      task: { schedule: { type: "datetime", date: "2026-08-22", time: "18:30" }, targetAt: "2026-08-20" },
      expected: "2026-08-22"
    },
    {
      name: "invalid canonical schedule falls back to valid targetAt",
      task: { schedule: { type: "date", date: "tomorrow", time: null }, targetAt: "2026-08-23" },
      expected: "2026-08-23"
    },
    {
      name: "invalid and missing dates remain undated",
      task: { schedule: { type: "datetime", date: null, time: "18:30" }, targetAt: "tomorrow" },
      expected: null
    },
    {
      name: "legacy-only valid targetAt remains dated",
      task: { targetAt: "2026-08-24" },
      expected: "2026-08-24"
    }
  ];

  for (const { name, task, expected } of cases) {
    const before = structuredClone(task);
    assert.equal(bridge.getTaskDate(task), expected, name);
    assert.deepEqual(task, before, `${name} must remain read-only`);
  }

  assert.equal(calls.normalize, cases.length);
  assert.equal(calls.date, cases.length);
  assert.equal(Object.isFrozen(bridge), true);
});

test("schedule bridge keeps a pure early-startup fallback until Core is available", () => {
  const { bridge } = loadBridge(null, { normalizeSchedule: scheduleModel.normalizeSchedule });
  const task = {
    schedule: { type: "none", date: null, time: null },
    targetAt: "2026-08-20"
  };
  const before = structuredClone(task);

  assert.equal(bridge.getTaskDate(task), null);
  assert.deepEqual(task, before);
});

test("List View obtains task dates only through the explicit schedule bridge", () => {
  assert.match(listViewSource, /CherryScheduleBridge\?\.getTaskDate/);
  assert.doesNotMatch(listViewSource, /task\?\.schedule\?\.date\s*\|\|\s*task\?\.targetAt/);
});
