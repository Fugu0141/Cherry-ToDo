import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const releaseSource = await readFile(
  new URL("../release-prep-ui.js", import.meta.url),
  "utf8"
);
const controllerSource = await readFile(
  new URL("../src/app/modal-schedule-controller.js", import.meta.url),
  "utf8"
);

test("release edit wrapper only localizes while app modal controller owns the effective date", () => {
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

  const controllerStart = controllerSource.indexOf("openEditTaskModal = function canonicalEditTaskModal");
  const controllerEnd = controllerSource.indexOf("getSameBranchTail = function", controllerStart);
  const controllerEdit = controllerSource.slice(controllerStart, controllerEnd);

  assert.notEqual(controllerStart, -1);
  assert.doesNotMatch(controllerEdit, /normalizeTaskSchedule\(task\)/);
  assert.match(controllerEdit, /taskDateInput\.value = currentTaskDate\(task\) \|\| ""/);
  assert.match(controllerSource, /window\.getTaskDate\(task\)/);
});
