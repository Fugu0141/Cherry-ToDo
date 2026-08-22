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

function extractTaskDateForChild() {
  const start = implementationSource.indexOf("  function taskDateForChild(task) {");
  const end = implementationSource.indexOf("\n\n  function runDeleteAction()", start);

  assert.notEqual(start, -1, "taskDateForChild helper must exist");
  assert.notEqual(end, -1, "taskDateForChild helper boundary must remain stable");
  return implementationSource.slice(start, end);
}

function runTaskDateForChild(task, { withBridge = true } = {}) {
  const window = { CherryCore: { schedule: scheduleModel } };
  const context = vm.createContext({ window, task, result: undefined });

  if (withBridge) vm.runInContext(bridgeSource, context);
  vm.runInContext(`${extractTaskDateForChild()}\nresult = taskDateForChild(task);`, context);
  return context.result;
}

test("mobile child default uses canonical schedule date and preserves undated parents", () => {
  assert.equal(runTaskDateForChild({
    schedule: { type: "none", date: null, time: null },
    targetAt: "2026-08-23"
  }), null);

  assert.equal(runTaskDateForChild({
    schedule: { type: "date", date: "2026-08-25", time: null },
    targetAt: "2026-08-23"
  }), "2026-08-25");

  assert.equal(runTaskDateForChild({
    schedule: { type: "datetime", date: "2026-08-26", time: "18:30" },
    targetAt: "2026-08-23"
  }), "2026-08-26");
});

test("mobile child default keeps legacy-only date compatibility through the Core bridge", () => {
  assert.equal(runTaskDateForChild({ targetAt: "2026-08-27" }), "2026-08-27");
});

test("mobile child default is conservative when the schedule bridge is unavailable", () => {
  assert.equal(runTaskDateForChild({ targetAt: "2026-08-27" }, { withBridge: false }), null);
});

test("mobile add action no longer invents today or direct-reads targetAt", () => {
  const helperSource = extractTaskDateForChild();
  const addStart = implementationSource.indexOf("  addButton.addEventListener");
  const addEnd = implementationSource.indexOf("\n\n  editButton.addEventListener", addStart);
  const addSource = implementationSource.slice(addStart, addEnd);

  assert.match(helperSource, /window\.CherryScheduleBridge\?\.getTaskDate/);
  assert.doesNotMatch(helperSource, /todayISO/);
  assert.doesNotMatch(helperSource, /task\.targetAt/);
  assert.match(addSource, /targetAt: taskDateForChild\(task\)/);
});
