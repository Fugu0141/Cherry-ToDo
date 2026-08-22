import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const scheduleModelSource = readFileSync(new URL("../schedule-model.js", import.meta.url), "utf8");

function fakeButton() {
  const capture = [];
  const bubble = [];
  return {
    addEventListener(type, handler, options) {
      if (type !== "click") return;
      const isCapture = options === true || options?.capture === true;
      (isCapture ? capture : bubble).push(handler);
    },
    removeEventListener(type, handler, options) {
      if (type !== "click") return;
      const isCapture = options === true || options?.capture === true;
      const list = isCapture ? capture : bubble;
      const index = list.indexOf(handler);
      if (index >= 0) list.splice(index, 1);
    },
    click() {
      let immediateStopped = false;
      const event = {
        type: "click",
        preventDefault() {},
        stopImmediatePropagation() { immediateStopped = true; }
      };

      for (const handler of [...capture]) {
        handler(event);
        if (immediateStopped) return;
      }
      for (const handler of [...bubble]) {
        handler(event);
        if (immediateStopped) return;
      }
    }
  };
}

function loadScheduleModel() {
  const tasks = [];
  const addRootBtn = fakeButton();
  const taskModalTitle = { textContent: "" };
  const taskNameInput = { value: "", focus() {}, select() {} };
  const taskDateInput = { value: "" };
  const taskModal = { classList: { add() {}, remove() {} } };
  const changeDateInput = { value: "", focus() {} };
  const dateModal = { classList: { add() {}, remove() {} } };
  let legacyRootClicks = 0;

  const context = vm.createContext({
    window: {},
    Date,
    Object,
    String,
    Math,
    console,
    makeTask() {},
    makeInitialState() { return { tasks: {} }; },
    saveNow() {},
    getTasks() { return tasks; },
    todayISO() { return "2026-08-22"; },
    id() { return "generated"; },
    addRootBtn,
    cachedLaneDates: [],
    isVerticalMode() { return false; },
    vTrackToX() { return 0; },
    hDateToX() { return 0; },
    vDateToY() { return 0; },
    hTrackToY() { return 0; },
    sortByDateThenTitle() { return 0; },
    state: { tasks: {} },
    getChildren() { return []; },
    getTaskDepth() { return 0; },
    shiftSubtreeTracks() {},
    maxTrack: 0,
    taskModalMode: null,
    taskModalContext: null,
    taskModalTitle,
    taskNameInput,
    taskDateInput,
    taskModal,
    requestAnimationFrame(callback) { callback(); },
    selectedId: null,
    snapshot() {},
    closeTaskModal() {},
    refreshLaneDates() {},
    branchLayout() {},
    requestRender() {},
    dateModalContext: null,
    changeDateInput,
    dateModal,
    hotLaneDate: null,
    hotLineDate: null,
    taskX() {},
    taskY() {},
    getSameBranchTail() {},
    resolveTrackCollisions() {},
    openCreateTaskModal() {},
    openEditTaskModal() {},
    saveTaskModal() {},
    openChangeDateModal() {},
    saveDateModal() {}
  });

  // This models app.js's existing anonymous root-add listener.
  addRootBtn.addEventListener("click", () => {
    legacyRootClicks += 1;
    context.openCreateTaskModal({
      parentId: null,
      targetAt: context.todayISO(),
      branchMode: "same"
    });
  });

  vm.runInContext(scheduleModelSource, context);
  return { context, addRootBtn, taskDateInput, legacyRootClicks: () => legacyRootClicks };
}

test("context-free task creation defaults to schedule:none instead of today", () => {
  const { context } = loadScheduleModel();
  const task = context.makeTask({ title: "Undated" });

  assert.equal(task.targetAt, null);
  assert.deepEqual(
    JSON.parse(JSON.stringify(task.schedule)),
    { type: "none", date: null, time: null }
  );
});

test("context-free create modal starts with a blank date", () => {
  const { context, taskDateInput } = loadScheduleModel();

  context.openCreateTaskModal();
  assert.equal(taskDateInput.value, "");
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.taskModalContext.schedule)),
    { type: "none", date: null, time: null }
  );
});

test("explicit date context is still preserved", () => {
  const { context, taskDateInput } = loadScheduleModel();

  context.openCreateTaskModal({ targetAt: "2026-08-30" });
  assert.equal(taskDateInput.value, "2026-08-30");

  const task = context.makeTask({ targetAt: "2026-08-31" });
  assert.equal(task.targetAt, "2026-08-31");
  assert.equal(task.schedule.type, "date");
});

test("explicit child schedule is authoritative over a recent spatial date hit", () => {
  const { context, taskDateInput } = loadScheduleModel();
  context.window.questStickyRecentDateHit = {
    mode: "ask",
    targetDate: "2026-09-05",
    at: Date.now()
  };

  context.openCreateTaskModal({
    parentId: "parent",
    schedule: { type: "none", date: null, time: null },
    branchMode: "branch"
  });
  assert.equal(taskDateInput.value, "");

  context.openCreateTaskModal({
    parentId: "parent",
    schedule: { type: "date", date: "2026-08-30", time: null },
    branchMode: "branch"
  });
  assert.equal(taskDateInput.value, "2026-08-30");

  // Spatial/date-target creation still uses the recent hit when no canonical schedule is supplied.
  context.openCreateTaskModal({
    parentId: "parent",
    targetAt: "2026-08-30",
    branchMode: "branch"
  });
  assert.equal(taskDateInput.value, "2026-09-05");
});

test("toolbar root Add bypasses the legacy today-default listener and opens undated", () => {
  const { context, addRootBtn, taskDateInput, legacyRootClicks } = loadScheduleModel();

  addRootBtn.click();

  assert.equal(legacyRootClicks(), 0);
  assert.equal(taskDateInput.value, "");
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.taskModalContext.schedule)),
    { type: "none", date: null, time: null }
  );
});

test("an explicit root request for today remains dated", () => {
  const { context, taskDateInput } = loadScheduleModel();

  context.openCreateTaskModal({
    parentId: null,
    targetAt: context.todayISO(),
    branchMode: "same"
  });

  assert.equal(taskDateInput.value, "2026-08-22");
});
