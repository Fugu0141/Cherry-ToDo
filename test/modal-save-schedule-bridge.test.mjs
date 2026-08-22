import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const guardSource = readFileSync(
  new URL("../src/features/date-modal-target-guard/implementation.js", import.meta.url),
  "utf8"
);

function fakeButton() {
  const capture = [];
  const bubble = [];
  return {
    addEventListener(type, handler, options) {
      if (type !== "click") return;
      const isCapture = options === true || options?.capture === true;
      (isCapture ? capture : bubble).push(handler);
    },
    click() {
      for (const handler of capture) handler({ type: "click" });
      for (const handler of bubble) handler({ type: "click" });
    }
  };
}

test("schedule-aware task save runs before the legacy captured save listener", () => {
  const taskSaveBtn = fakeButton();
  const dateSaveBtn = fakeButton();
  let coreSaves = 0;
  let legacyWrites = 0;
  let laterListeners = 0;

  const context = vm.createContext({
    window: {},
    taskSaveBtn,
    dateSaveBtn,
    taskModalMode: "create",
    dateModalContext: null,
    saveTaskModal() {
      coreSaves += 1;
      context.taskModalMode = null;
    },
    saveDateModal() {},
    openChangeDateModal() {},
    openCreateTaskModal() {},
    normalizeDate(value) { return value || "2026-08-22"; }
  });

  // app.js registered this listener before schedule-model.js replaced saveTaskModal.
  taskSaveBtn.addEventListener("click", () => {
    if (context.taskModalMode === "create") legacyWrites += 1;
  });

  vm.runInContext(guardSource, context);

  // Later features (for example the mobile action bar) must still receive the click.
  taskSaveBtn.addEventListener("click", () => {
    laterListeners += 1;
  });

  taskSaveBtn.click();

  assert.equal(coreSaves, 1);
  assert.equal(legacyWrites, 0);
  assert.equal(laterListeners, 1);
});

test("schedule-aware date save also wins over the legacy captured listener", () => {
  const taskSaveBtn = fakeButton();
  const dateSaveBtn = fakeButton();
  let coreSaves = 0;
  let legacyWrites = 0;

  const context = vm.createContext({
    window: {},
    taskSaveBtn,
    dateSaveBtn,
    taskModalMode: null,
    dateModalContext: { taskId: "task" },
    saveTaskModal() {},
    saveDateModal() {
      coreSaves += 1;
      context.dateModalContext = null;
    },
    openChangeDateModal() {},
    openCreateTaskModal() {},
    normalizeDate(value) { return value || "2026-08-22"; }
  });

  dateSaveBtn.addEventListener("click", () => {
    if (context.dateModalContext) legacyWrites += 1;
  });

  vm.runInContext(guardSource, context);
  dateSaveBtn.click();

  assert.equal(coreSaves, 1);
  assert.equal(legacyWrites, 0);
});
