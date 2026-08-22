import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const scheduleModelSource = readFileSync(new URL("../schedule-model.js", import.meta.url), "utf8");

function extractInstallCurrentModalSaveHandlers() {
  const start = scheduleModelSource.indexOf("  function installCurrentModalSaveHandlers() {");
  const end = scheduleModelSource.indexOf("\n\n  window.isValidISODate", start);

  assert.notEqual(start, -1, "modal save handoff helper must exist");
  assert.notEqual(end, -1, "modal save handoff helper boundary must remain stable");
  return scheduleModelSource.slice(start, end);
}

function fakeButton() {
  const listeners = [];
  return {
    addEventListener(type, handler) {
      if (type === "click") listeners.push(handler);
    },
    removeEventListener(type, handler) {
      if (type !== "click") return;
      const index = listeners.indexOf(handler);
      if (index >= 0) listeners.splice(index, 1);
    },
    click() {
      for (const handler of [...listeners]) handler({ type: "click" });
    }
  };
}

test("schedule model replaces stale direct modal save listeners with current handlers", () => {
  const taskSaveBtn = fakeButton();
  const dateSaveBtn = fakeButton();
  let legacyTaskSaves = 0;
  let legacyDateSaves = 0;
  let currentTaskSaves = 0;
  let currentDateSaves = 0;
  let laterTaskListeners = 0;

  const baseSaveTaskModal = () => {
    legacyTaskSaves += 1;
  };
  const baseSaveDateModal = () => {
    legacyDateSaves += 1;
  };

  taskSaveBtn.addEventListener("click", baseSaveTaskModal);
  dateSaveBtn.addEventListener("click", baseSaveDateModal);

  const context = vm.createContext({
    taskSaveBtn,
    dateSaveBtn,
    baseSaveTaskModal,
    baseSaveDateModal,
    saveTaskModal() {
      currentTaskSaves += 1;
    },
    saveDateModal() {
      currentDateSaves += 1;
    }
  });

  vm.runInContext(`${extractInstallCurrentModalSaveHandlers()}\ninstallCurrentModalSaveHandlers();`, context);

  // Later feature listeners must remain ordinary bubble listeners and still run.
  taskSaveBtn.addEventListener("click", () => {
    laterTaskListeners += 1;
  });

  taskSaveBtn.click();
  dateSaveBtn.click();

  assert.equal(legacyTaskSaves, 0);
  assert.equal(legacyDateSaves, 0);
  assert.equal(currentTaskSaves, 1);
  assert.equal(currentDateSaves, 1);
  assert.equal(laterTaskListeners, 1);
});

test("modal save handoff uses removeEventListener instead of capture-order masking", () => {
  const helper = extractInstallCurrentModalSaveHandlers();

  assert.match(helper, /removeEventListener\("click", baseSaveTaskModal\)/);
  assert.match(helper, /removeEventListener\("click", baseSaveDateModal\)/);
  assert.match(helper, /addEventListener\("click", \(\) => saveTaskModal\(\)\)/);
  assert.match(helper, /addEventListener\("click", \(\) => saveDateModal\(\)\)/);
  assert.doesNotMatch(helper, /true\s*\)/);
});
