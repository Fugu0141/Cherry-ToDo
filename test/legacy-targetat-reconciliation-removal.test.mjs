import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const runtimeSource = readFileSync(
  new URL("../src/app/core-runtime-bridge.js", import.meta.url),
  "utf8"
);
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const scheduleSource = readFileSync(new URL("../schedule-model.js", import.meta.url), "utf8");

test("legacy capture no longer reconciles targetAt-only writes or relayouts before render", () => {
  assert.doesNotMatch(runtimeSource, /reconcileLegacyTargetAtWrites/);

  const requestStart = runtimeSource.indexOf("requestRender = function coreAwareRequestRender");
  const requestEnd = runtimeSource.indexOf("\n      };", requestStart);
  assert.notEqual(requestStart, -1);
  assert.notEqual(requestEnd, -1);

  const requestSource = runtimeSource.slice(requestStart, requestEnd);
  assert.match(requestSource, /const result = originalRequestRender\(\);/);
  assert.match(requestSource, /const next = clone\(safeState\(\)\);/);
  assert.match(requestSource, /commands\.dispatch\("state\.capture-legacy"/);
  assert.doesNotMatch(requestSource, /branchLayout\(\)/);
  assert.doesNotMatch(requestSource, /targetAt/);
});

test("live date-changing paths use the canonical schedule boundary", () => {
  const pointerUpStart = appSource.indexOf('window.addEventListener("pointerup"');
  const pointerUpEnd = appSource.indexOf("\nfunction finishDragUI", pointerUpStart);
  assert.ok(pointerUpStart >= 0);
  assert.ok(pointerUpEnd > pointerUpStart);

  const pointerUpSource = appSource.slice(pointerUpStart, pointerUpEnd);
  assert.match(pointerUpSource, /window\.setTaskDate\(task, hit\.date\)/);
  assert.doesNotMatch(pointerUpSource, /task\.targetAt\s*=\s*hit\.date/);

  const saveTaskStart = scheduleSource.indexOf("saveTaskModal = function saveTaskModalWithSchedule");
  const saveTaskEnd = scheduleSource.indexOf("\n\n  openChangeDateModal = function", saveTaskStart);
  const saveDateStart = scheduleSource.indexOf("saveDateModal = function saveDateModalWithSchedule");
  const saveDateEnd = scheduleSource.indexOf("\n\n  normalizeAllTasks();", saveDateStart);

  assert.ok(saveTaskStart >= 0 && saveTaskEnd > saveTaskStart);
  assert.ok(saveDateStart >= 0 && saveDateEnd > saveDateStart);

  const saveTaskSource = scheduleSource.slice(saveTaskStart, saveTaskEnd);
  const saveDateSource = scheduleSource.slice(saveDateStart, saveDateEnd);
  assert.match(saveTaskSource, /setTaskSchedule\(task, nextSchedule\)/);
  assert.match(saveDateSource, /setTaskDateFromInput\(task, changeDateInput\.value\)/);
});

test("schedule-model no longer rewires modal save listeners", () => {
  assert.doesNotMatch(scheduleSource, /baseSaveTaskModal/);
  assert.doesNotMatch(scheduleSource, /baseSaveDateModal/);
  assert.doesNotMatch(scheduleSource, /installCurrentModalSaveHandlers/);
  assert.doesNotMatch(scheduleSource, /removeEventListener\("click"/);

  assert.match(appSource, /taskSaveBtn\.addEventListener\("click", \(\) => saveTaskModal\(\)\)/);
  assert.match(appSource, /dateSaveBtn\.addEventListener\("click", \(\) => saveDateModal\(\)\)/);
});
