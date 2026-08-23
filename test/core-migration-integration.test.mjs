import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const factorySource = readFileSync(new URL("../src/app/task-schedule-factory.js", import.meta.url), "utf8");
const modalSource = readFileSync(new URL("../src/app/modal-schedule-controller.js", import.meta.url), "utf8");
const runtimeSource = readFileSync(new URL("../src/app/core-runtime-bridge.js", import.meta.url), "utf8");
const storageSource = readFileSync(new URL("../state-storage.js", import.meta.url), "utf8");
const scheduleSource = readFileSync(new URL("../schedule-model.js", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("../src/app/schedule-layout-controller.js", import.meta.url), "utf8");
const dateTargetSource = readFileSync(
  new URL("../src/features/date-target/implementation.js", import.meta.url),
  "utf8"
);
const dateGuardSource = readFileSync(
  new URL("../src/features/date-modal-target-guard/implementation.js", import.meta.url),
  "utf8"
);

function scriptIndex(path) {
  const index = indexSource.indexOf(path);
  assert.notEqual(index, -1, `${path} must be loaded by index.html`);
  return index;
}

test("Core migration ownership layers stay in the intended runtime order", () => {
  const app = scriptIndex("./app.js");
  const factory = scriptIndex("./src/app/task-schedule-factory.js");
  const modal = scriptIndex("./src/app/modal-schedule-controller.js");
  const runtime = scriptIndex("./src/app/core-runtime-bridge.js");
  const storage = scriptIndex("./state-storage.js");
  const dateTarget = scriptIndex("./src/features/date-target/implementation.js");
  const schedule = scriptIndex("./schedule-model.js");
  const layout = scriptIndex("./src/app/schedule-layout-controller.js");
  const dateGuard = scriptIndex("./src/features/date-modal-target-guard/implementation.js");
  const sameDay = scriptIndex("./src/features/same-day-layout/implementation.js");

  assert.ok(app < factory);
  assert.ok(factory < modal);
  assert.ok(modal < runtime);
  assert.ok(runtime < storage);
  assert.ok(storage < dateTarget);
  assert.ok(dateTarget < schedule);
  assert.ok(schedule < layout);
  assert.ok(layout < dateGuard);
  assert.ok(dateGuard < sameDay);
});

test("base app keeps stable modal listeners while app-layer controllers own live behavior", () => {
  assert.match(appSource, /taskSaveBtn\.addEventListener\("click", \(\) => saveTaskModal\(\)\)/);
  assert.match(appSource, /dateSaveBtn\.addEventListener\("click", \(\) => saveDateModal\(\)\)/);

  assert.match(factorySource, /makeTask = function canonicalMakeTask/);
  assert.match(factorySource, /makeInitialState = function canonicalMakeInitialState/);
  assert.match(modalSource, /openCreateTaskModal = function canonicalCreateTaskModal/);
  assert.match(modalSource, /openEditTaskModal = function canonicalEditTaskModal/);
  assert.match(modalSource, /saveTaskModal = function canonicalSaveTaskModal/);
  assert.match(modalSource, /openChangeDateModal = function canonicalChangeDateModal/);
  assert.match(modalSource, /saveDateModal = function canonicalSaveDateModal/);

  assert.doesNotMatch(scheduleSource, /makeTask\s*=\s*function/);
  assert.doesNotMatch(scheduleSource, /makeInitialState\s*=\s*function/);
  assert.doesNotMatch(scheduleSource, /openCreateTaskModal\s*=\s*function/);
  assert.doesNotMatch(scheduleSource, /openEditTaskModal\s*=\s*function/);
  assert.doesNotMatch(scheduleSource, /saveTaskModal\s*=\s*function/);
  assert.doesNotMatch(scheduleSource, /openChangeDateModal\s*=\s*function/);
  assert.doesNotMatch(scheduleSource, /saveDateModal\s*=\s*function/);
});

test("schedule-model is semantic compatibility only, not layout or persistence ownership", () => {
  assert.match(scheduleSource, /function normalizeAllTasks\(\)/);
  assert.match(scheduleSource, /function getTaskSchedule\(task\)/);
  assert.match(scheduleSource, /function setTaskSchedule\(task, schedule\)/);
  assert.match(scheduleSource, /function installTargetAtAccessor\(task, schedule\)/);

  for (const name of [
    "saveNow",
    "refreshLaneDates",
    "taskX",
    "taskY",
    "sortByDateThenTitle",
    "resolveTrackCollisions"
  ]) {
    assert.doesNotMatch(scheduleSource, new RegExp(`${name}\\s*=\\s*function`));
  }

  assert.match(storageSource, /function normalizeBeforeSave\(\)/);
  assert.match(storageSource, /window\.cherrySchedule\?\.normalizeAllTasks/);
  assert.match(storageSource, /normalizeBeforeSave\(\);\n    writeItem\(currentStorageKey, JSON\.stringify\(state\)\);/);

  assert.match(layoutSource, /refreshLaneDates = function canonicalRefreshLaneDates/);
  assert.match(layoutSource, /taskX = function canonicalTaskX/);
  assert.match(layoutSource, /taskY = function canonicalTaskY/);
  assert.match(layoutSource, /sortByDateThenTitle = function canonicalSortByDateThenTitle/);
  assert.match(layoutSource, /resolveTrackCollisions = function canonicalResolveTrackCollisions/);
});

test("date targeting remains detection/correction only and does not reclaim creation ownership", () => {
  assert.doesNotMatch(dateTargetSource, /openCreateTaskModal\s*=/);
  assert.doesNotMatch(dateTargetSource, /saveTaskModal\s*=/);
  assert.match(dateTargetSource, /questStickyRecentDateHit|recentDateHit|dateHit/i);

  assert.doesNotMatch(dateGuardSource, /openCreateTaskModal\s*=/);
  assert.match(dateGuardSource, /openChangeDateModal|saveDateModal/);
});

test("Core runtime history remains separate from schedule UI ownership", () => {
  assert.match(runtimeSource, /registerCommand\("state\.replace"/);
  assert.match(runtimeSource, /registerCommand\("state\.update"/);
  assert.match(runtimeSource, /registerCommand\("state\.capture-legacy"/);
  assert.doesNotMatch(runtimeSource, /openCreateTaskModal\s*=/);
  assert.doesNotMatch(runtimeSource, /saveTaskModal\s*=/);
});
