import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const releaseSource = await readFile(
  new URL("../release-prep-ui.js", import.meta.url),
  "utf8"
);
const scheduleSource = await readFile(
  new URL("../schedule-model.js", import.meta.url),
  "utf8"
);

test("release edit wrapper only localizes while schedule-model owns the effective date", () => {
  const releaseStart = releaseSource.indexOf("openEditTaskModal = function localizedEditTaskModal");
  const releaseEnd = releaseSource.indexOf("function patchResetConfirm", releaseStart);
  const editWrapper = releaseSource.slice(releaseStart, releaseEnd);

  assert.notEqual(releaseStart, -1);
  assert.match(editWrapper, /baseOpenEdit\(taskId\)/);
  assert.match(editWrapper, /modal\.editTask/);
  assert.doesNotMatch(editWrapper, /CherryScheduleBridge/);
  assert.doesNotMatch(editWrapper, /getTaskDate/);
  assert.doesNotMatch(editWrapper, /taskDateInput/);
  assert.doesNotMatch(editWrapper, /targetAt/);

  const scheduleStart = scheduleSource.indexOf("openEditTaskModal = function openEditTaskModalWithSchedule");
  const scheduleEnd = scheduleSource.indexOf("saveTaskModal = function", scheduleStart);
  const scheduleEdit = scheduleSource.slice(scheduleStart, scheduleEnd);

  assert.notEqual(scheduleStart, -1);
  assert.match(scheduleEdit, /normalizeTaskSchedule\(task\)/);
  assert.match(scheduleEdit, /taskDateInput\.value = getTaskDate\(task\) \|\| ""/);
});
