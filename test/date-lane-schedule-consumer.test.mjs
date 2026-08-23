import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { scheduleModel } from "../src/core/schedule.js";

const bridgeSource = readFileSync(new URL("../legacy-core-bridge.js", import.meta.url), "utf8");
const layoutControllerSource = readFileSync(
  new URL("../src/app/schedule-layout-controller.js", import.meta.url),
  "utf8"
);
const scheduleRuntimeSource = readFileSync(new URL("../schedule-model.js", import.meta.url), "utf8");

function loadBridge(schedule) {
  const window = {
    CherryCore: { schedule },
    addEventListener() {}
  };

  vm.runInNewContext(bridgeSource, { window });
  return window.CherryScheduleBridge;
}

test("date-lane collection uses canonical Core schedule semantics without mutating tasks", () => {
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
  const bridge = loadBridge(coreSchedule);
  const tasks = [
    {
      id: "none",
      schedule: { type: "none", date: null, time: null },
      targetAt: "2026-08-20"
    },
    {
      id: "date",
      schedule: { type: "date", date: "2026-08-21", time: null },
      targetAt: "2026-08-20"
    },
    {
      id: "datetime",
      schedule: { type: "datetime", date: "2026-08-22", time: "18:30" },
      targetAt: "2026-08-20"
    },
    {
      id: "legacy-fallback",
      schedule: { type: "date", date: "tomorrow", time: null },
      targetAt: "2026-08-23"
    },
    {
      id: "invalid",
      schedule: { type: "datetime", date: null, time: "18:30" },
      targetAt: "tomorrow"
    },
    { id: "missing" },
    {
      id: "duplicate",
      schedule: { type: "date", date: "2026-08-21", time: null },
      targetAt: "2026-08-21"
    },
    { id: "earlier-legacy", targetAt: "2026-08-16" }
  ];
  const before = structuredClone(tasks);

  assert.deepEqual(
    [...bridge.collectLaneDates(tasks, "2026-08-17")],
    ["2026-08-16", "2026-08-17", "2026-08-21", "2026-08-22", "2026-08-23"]
  );
  assert.deepEqual(tasks, before);
  assert.equal(calls.normalize, tasks.length);
  assert.equal(calls.date, tasks.length);
});

test("date-lane collection preserves the intentional today lane with no dated tasks", () => {
  const bridge = loadBridge(scheduleModel);
  const tasks = [
    { schedule: { type: "none", date: null, time: null }, targetAt: "2026-08-20" },
    { targetAt: "invalid" }
  ];

  assert.deepEqual([...bridge.collectLaneDates(tasks, "2026-08-17")], ["2026-08-17"]);
  assert.deepEqual([...bridge.collectLaneDates([], "2026-08-17")], ["2026-08-17"]);
});

test("the effective date-lane reader belongs to the layout controller and delegates only to the explicit schedule bridge", () => {
  const start = layoutControllerSource.indexOf("refreshLaneDates = function canonicalRefreshLaneDates");
  const end = layoutControllerSource.indexOf("\n\n  taskX =", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const laneReader = layoutControllerSource.slice(start, end);
  assert.match(laneReader, /CherryScheduleBridge\?\.collectLaneDates/);
  assert.doesNotMatch(laneReader, /getTaskDate\(task\)/);
  assert.doesNotMatch(laneReader, /targetAt/);
  assert.doesNotMatch(scheduleRuntimeSource, /refreshLaneDates\s*=\s*function/);
});
