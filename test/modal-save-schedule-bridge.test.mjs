import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const scheduleModelSource = readFileSync(new URL("../schedule-model.js", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function fakeButton() {
  const listeners = [];
  return {
    addEventListener(type, handler) {
      if (type === "click") listeners.push(handler);
    },
    click() {
      for (const handler of [...listeners]) handler({ type: "click" });
    }
  };
}

function extractModalButtonBindings() {
  const start = appSource.indexOf('taskSaveBtn.addEventListener("click"');
  const end = appSource.indexOf('\ntaskNameInput.addEventListener', start);

  assert.notEqual(start, -1, "task save listener must exist");
  assert.ok(end > start, "modal button listener boundary must remain stable");
  return appSource.slice(start, end);
}

test("modal save buttons delegate through the live save function bindings", () => {
  const taskSaveBtn = fakeButton();
  const dateSaveBtn = fakeButton();
  const dateCancelBtn = fakeButton();

  let legacyTaskSaves = 0;
  let legacyDateSaves = 0;
  let currentTaskSaves = 0;
  let currentDateSaves = 0;

  const context = vm.createContext({
    taskSaveBtn,
    dateSaveBtn,
    dateCancelBtn,
    saveTaskModal() {
      legacyTaskSaves += 1;
    },
    saveDateModal() {
      legacyDateSaves += 1;
    },
    closeDateModal() {}
  });

  vm.runInContext(extractModalButtonBindings(), context);

  context.saveTaskModal = () => {
    currentTaskSaves += 1;
  };
  context.saveDateModal = () => {
    currentDateSaves += 1;
  };

  taskSaveBtn.click();
  dateSaveBtn.click();

  assert.equal(legacyTaskSaves, 0);
  assert.equal(legacyDateSaves, 0);
  assert.equal(currentTaskSaves, 1);
  assert.equal(currentDateSaves, 1);
});

test("legacy app owns stable delegating modal save listeners", () => {
  const bindings = extractModalButtonBindings();

  assert.match(bindings, /taskSaveBtn\.addEventListener\("click", \(\) => saveTaskModal\(\)\)/);
  assert.match(bindings, /dateSaveBtn\.addEventListener\("click", \(\) => saveDateModal\(\)\)/);
  assert.doesNotMatch(bindings, /taskSaveBtn\.addEventListener\("click", saveTaskModal\)/);
  assert.doesNotMatch(bindings, /dateSaveBtn\.addEventListener\("click", saveDateModal\)/);
});

test("schedule model no longer owns a modal save listener handoff", () => {
  assert.doesNotMatch(scheduleModelSource, /baseSaveTaskModal/);
  assert.doesNotMatch(scheduleModelSource, /baseSaveDateModal/);
  assert.doesNotMatch(scheduleModelSource, /installCurrentModalSaveHandlers/);
  assert.doesNotMatch(scheduleModelSource, /removeEventListener\("click"/);
});
