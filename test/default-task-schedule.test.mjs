import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const scheduleModelSource = readFileSync(new URL("../schedule-model.js", import.meta.url), "utf8");

function loadScheduleModel() {
  const rootClickCaptureHandlers = [];
  const queuedMicrotasks = [];
  const tasks = [];
  const taskModalTitle = { textContent: "" };
  const taskNameInput = { value: "", focus() {}, select() {} };
  const taskDateInput = { value: "" };
  const taskModal = { classList: { add() {}, remove() {} } };
  const changeDateInput = { value: "", focus() {} };
  const dateModal = { classList: { add() {}, remove() {} } };

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
    queueMicrotask(callback) { queuedMicrotasks.push(callback); },
    addRootBtn: {
      addEventListener(type, handler, capture) {
        if (type === "click" && capture === true) rootClickCaptureHandlers.push(handler);
      }
    },
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

  vm.runInContext(scheduleModelSource, context);
  return { context, rootClickCaptureHandlers, queuedMicrotasks, taskDateInput };
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

test("legacy root Add button no longer forces today's date", () => {
  const { context, rootClickCaptureHandlers, queuedMicrotasks, taskDateInput } = loadScheduleModel();

  assert.equal(rootClickCaptureHandlers.length, 1);
  rootClickCaptureHandlers[0]();

  // app.js currently invokes the root create action with targetAt: todayISO().
  context.openCreateTaskModal({
    parentId: null,
    targetAt: context.todayISO(),
    branchMode: "same"
  });
  assert.equal(taskDateInput.value, "");

  while (queuedMicrotasks.length) queuedMicrotasks.shift()();

  // An explicit date request made outside that legacy button click stays dated.
  context.openCreateTaskModal({
    parentId: null,
    targetAt: context.todayISO(),
    branchMode: "same"
  });
  assert.equal(taskDateInput.value, "2026-08-22");
});

test("legacy root Add marker expires even if its old bubble listener does not run", () => {
  const { context, rootClickCaptureHandlers, queuedMicrotasks, taskDateInput } = loadScheduleModel();

  rootClickCaptureHandlers[0]();
  while (queuedMicrotasks.length) queuedMicrotasks.shift()();

  context.openCreateTaskModal({
    parentId: null,
    targetAt: context.todayISO(),
    branchMode: "same"
  });
  assert.equal(taskDateInput.value, "2026-08-22");
});
