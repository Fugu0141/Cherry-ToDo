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
  const window = {
    CherryCore: { schedule: scheduleModel },
    addEventListener() {}
  };
  const context = vm.createContext({ window, parent: task, result: undefined });
  vm.runInContext(bridgeSource, context);
  vm.runInContext(`${helper}\nresult = taskScheduleForChild(parent);`, context);
  return JSON.parse(JSON.stringify(context.result));
}

test("desktop child creation inherits effective parent schedule", () => {
  assert.deepEqual(runTaskScheduleForChild({
    schedule: { type: "none", date: null, time: null },
    targetAt: "2026-08-22"
  }), { type: "none", date: null, time: null });

  assert.deepEqual(runTaskScheduleForChild({
    schedule: { type: "date", date: "2026-08-25", time: null },
    targetAt: "2026-08-22"
  }), { type: "date", date: "2026-08-25", time: null });

  assert.deepEqual(runTaskScheduleForChild({
    schedule: { type: "datetime", date: "2026-08-26", time: "18:30" },
    targetAt: "2026-08-22"
  }), { type: "date", date: "2026-08-26", time: null });
});

test("desktop drag passes canonical schedule context whether or not it targets a date lane", () => {
  const openCreate = extractHelper("openCreateFromContext(context) {", "\n\n  function connectTargetToSource");
  const targetDate = extractHelper("targetDateFor(event) {", "\n\n  function scheduleForSpatialDate");
  const spatialSchedule = extractHelper("scheduleForSpatialDate(event) {", "\n\n  function isAncestor");
  const pointerUpStart = source.indexOf('  window.addEventListener("pointerup"');
  const pointerUpEnd = source.indexOf('\n\n  window.addEventListener("pointercancel"', pointerUpStart);
  const pointerUp = source.slice(pointerUpStart, pointerUpEnd);

  assert.match(openCreate, /schedule: context\.schedule \|\| \{ type: "none", date: null, time: null \}/);
  assert.doesNotMatch(openCreate, /targetAt/);
  assert.match(targetDate, /if \(!state\.showLanes\) return null/);
  assert.match(spatialSchedule, /\? \{ type: "date", date, time: null \}/);
  assert.match(spatialSchedule, /: \{ type: "none", date: null, time: null \}/);
  assert.match(pointerUp, /const usesSpatialDate = handleDrag\.moved && state\.showLanes/);
  assert.match(pointerUp, /schedule: usesSpatialDate \? scheduleForSpatialDate\(event\) : taskScheduleForChild\(source\)/);
  assert.doesNotMatch(pointerUp, /targetAt/);
});

test("connect-existing live creation no longer owns legacy targetAt context", () => {
  assert.doesNotMatch(source, /targetAt/);
});
