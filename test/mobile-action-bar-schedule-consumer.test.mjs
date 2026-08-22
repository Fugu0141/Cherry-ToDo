import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { scheduleModel } from "../src/core/schedule.js";

const implementationSource = readFileSync(
  new URL("../src/features/mobile-action-bar/implementation.js", import.meta.url),
  "utf8"
);
const bridgeSource = readFileSync(new URL("../legacy-core-bridge.js", import.meta.url), "utf8");

function extractTaskScheduleForChild() {
  const start = implementationSource.indexOf("  function taskScheduleForChild(task) {");
  const end = implementationSource.indexOf("\n\n  function runDeleteAction()", start);

  assert.notEqual(start, -1, "taskScheduleForChild helper must exist");
  assert.notEqual(end, -1, "taskScheduleForChild helper boundary must remain stable");
  return implementationSource.slice(start, end);
}

function runTaskScheduleForChild(task, { withBridge = true } = {}) {
  const window = {
    CherryCore: { schedule: scheduleModel },
    addEventListener() {}
  };
  const context = vm.createContext({ window, task, result: undefined });

  if (withBridge) vm.runInContext(bridgeSource, context);
  vm.runInContext(`${extractTaskScheduleForChild()}\nresult = taskScheduleForChild(task);`, context);
  return JSON.parse(JSON.stringify(context.result));
}

test("mobile child default uses canonical schedule date and preserves undated parents", () => {
  assert.deepEqual(runTaskScheduleForChild({
    schedule: { type: "none", date: null, time: null },
    targetAt: "2026-08-23"
  }), { type: "none", date: null, time: null });

  assert.deepEqual(runTaskScheduleForChild({
    schedule: { type: "date", date: "2026-08-25", time: null },
    targetAt: "2026-08-23"
  }), { type: "date", date: "2026-08-25", time: null });

  assert.deepEqual(runTaskScheduleForChild({
    schedule: { type: "datetime", date: "2026-08-26", time: "18:30" },
    targetAt: "2026-08-23"
  }), { type: "date", date: "2026-08-26", time: null });
});

test("mobile child default keeps legacy-only date compatibility through the Core bridge", () => {
  assert.deepEqual(
    runTaskScheduleForChild({ targetAt: "2026-08-27" }),
    { type: "date", date: "2026-08-27", time: null }
  );
});

test("mobile child default is conservative when the schedule bridge is unavailable", () => {
  assert.deepEqual(
    runTaskScheduleForChild({ targetAt: "2026-08-27" }, { withBridge: false }),
    { type: "none", date: null, time: null }
  );
});

test("mobile add passes an explicit inherited schedule instead of an overridable targetAt", () => {
  const helperSource = extractTaskScheduleForChild();
  const addStart = implementationSource.indexOf("  addButton.addEventListener");
  const addEnd = implementationSource.indexOf("\n\n  editButton.addEventListener", addStart);
  const addSource = implementationSource.slice(addStart, addEnd);

  assert.match(helperSource, /window\.CherryScheduleBridge\?\.getTaskDate/);
  assert.doesNotMatch(helperSource, /todayISO/);
  assert.doesNotMatch(helperSource, /task\.targetAt/);
  assert.match(addSource, /schedule: taskScheduleForChild\(task\)/);
  assert.doesNotMatch(addSource, /targetAt:/);
});
