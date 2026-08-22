import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { scheduleModel } from "../src/core/schedule.js";

const source = readFileSync(
  new URL("../src/features/connect-existing-tasks/implementation.js", import.meta.url),
  "utf8"
);
const bridgeSource = readFileSync(new URL("../legacy-core-bridge.js", import.meta.url), "utf8");

function extractHelper(name, nextMarker) {
  const start = source.indexOf(`  function ${name}`);
  const end = source.indexOf(nextMarker, start);
  assert.notEqual(start, -1, `${name} must exist`);
  assert.notEqual(end, -1, `${name} boundary must remain stable`);
  return source.slice(start, end);
}

function runTaskScheduleForChild(task) {
  const helper = extractHelper("taskScheduleForChild(parent) {", "\n\n  function escapeId");
  const window = { CherryCore: { schedule: scheduleModel } };
  const context = vm.createContext({ window, parent: task, result: undefined });
  vm.runInContext(bridgeSource, context);
  vm.runInContext(`${helper}\nresult = taskScheduleForChild(parent);`, context);
  return JSON.parse(JSON.stringify(context.result));
}

test("desktop simple-handle child creation inherits effective parent schedule", () => {
  assert.deepEqual(runTaskScheduleForChild({
    schedule: { type: "none", date: null, time: null },
    targetAt: "2026-08-22"
  }), { type: "none", date: null, time: null });

  assert.deepEqual(runTaskScheduleForChild({
    schedule: { type: "date", date: "2026-08-25", time: null },
    targetAt: "2026-08-22"
  }), { type: "date", date: "2026-08-25", time: null });
});

test("implicit desktop create prefers inherited canonical schedule while drag keeps spatial date", () => {
  const openCreate = extractHelper("openCreateFromContext(context) {", "\n\n  function connectTargetToSource");
  const pointerUpStart = source.indexOf('  window.addEventListener("pointerup"');
  const pointerUpEnd = source.indexOf('\n\n  window.addEventListener("pointercancel"', pointerUpStart);
  const pointerUp = source.slice(pointerUpStart, pointerUpEnd);

  assert.match(openCreate, /if \(context\.schedule\) options\.schedule = context\.schedule/);
  assert.match(openCreate, /else options\.targetAt = context\.targetAt/);
  assert.match(pointerUp, /schedule: handleDrag\.moved \? null : taskScheduleForChild\(source\)/);
  assert.match(pointerUp, /targetAt: targetDateFor\(event\)/);
});
