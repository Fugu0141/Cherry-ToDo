import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { scheduleModel } from "../src/core/schedule.js";

const implementationSource = readFileSync(
  new URL("../src/features/touch-child-task/implementation.js", import.meta.url),
  "utf8"
);
const bridgeSource = readFileSync(new URL("../legacy-core-bridge.js", import.meta.url), "utf8");

function extractTaskScheduleForChild() {
  const start = implementationSource.indexOf("  function taskScheduleForChild(task) {");
  const end = implementationSource.indexOf("\n\n  document.addEventListener", start);

  assert.notEqual(start, -1, "touch taskScheduleForChild helper must exist");
  assert.notEqual(end, -1, "touch helper boundary must remain stable");
  return implementationSource.slice(start, end);
}

function runTaskScheduleForChild(task, { withBridge = true } = {}) {
  const window = { CherryCore: { schedule: scheduleModel } };
  const context = vm.createContext({ window, task, result: undefined });

  if (withBridge) vm.runInContext(bridgeSource, context);
  vm.runInContext(`${extractTaskScheduleForChild()}\nresult = taskScheduleForChild(task);`, context);
  return JSON.parse(JSON.stringify(context.result));
}

test("touch child creation preserves canonical undated state and effective parent date", () => {
  assert.deepEqual(runTaskScheduleForChild({
    schedule: { type: "none", date: null, time: null },
    targetAt: "2026-08-22"
  }), { type: "none", date: null, time: null });

  assert.deepEqual(runTaskScheduleForChild({
    schedule: { type: "date", date: "2026-08-25", time: null },
    targetAt: "2026-08-22"
  }), { type: "date", date: "2026-08-25", time: null });

  assert.deepEqual(runTaskScheduleForChild({
    schedule: { type: "datetime", date: "2026-08-26", time: "19:00" },
    targetAt: "2026-08-22"
  }), { type: "date", date: "2026-08-26", time: null });
});

test("touch child creation keeps legacy date compatibility and conservative bridge fallback", () => {
  assert.deepEqual(
    runTaskScheduleForChild({ targetAt: "2026-08-27" }),
    { type: "date", date: "2026-08-27", time: null }
  );
  assert.deepEqual(
    runTaskScheduleForChild({ targetAt: "2026-08-27" }, { withBridge: false }),
    { type: "none", date: null, time: null }
  );
});

test("simple touch plus no longer infers a date from pointer position or today", () => {
  assert.match(implementationSource, /schedule: taskScheduleForChild\(parent\)/);
  assert.doesNotMatch(implementationSource, /getDateForPointer/);
  assert.doesNotMatch(implementationSource, /todayISO/);
  assert.doesNotMatch(implementationSource, /fallbackToday/);
  assert.doesNotMatch(implementationSource, /dateFromPointer/);
});
