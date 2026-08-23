import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const scheduleModelSource = readFileSync(new URL("../schedule-model.js", import.meta.url), "utf8");
const taskFactorySource = readFileSync(new URL("../src/app/task-schedule-factory.js", import.meta.url), "utf8");
const modalControllerSource = readFileSync(new URL("../src/app/modal-schedule-controller.js", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function loadScheduleStack() {
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
    Set,
    console,
    makeTask() {},
    makeInitialState() {
      return {
        tasks: {
          legacy: {
            id: "legacy",
            title: "Legacy",
            parentId: null,
            x: 0,
            y: 0,
            targetAt: "2026-08-29",
            status: "todo",
            branchMode: null
          }
        }
      };
    },
    saveNow() {},
    getTasks() { return tasks; },
    todayISO() { return "2026-08-22"; },
    id() { return "generated"; },
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
    closeDateModal() {},
    saveDateModal() {}
  });

  // Match browser ownership order: app factories/controllers install first;
  // schedule-model then publishes the canonical helpers they call at interaction time.
  vm.runInContext(taskFactorySource, context);
  vm.runInContext(modalControllerSource, context);
  vm.runInContext(scheduleModelSource, context);
  return { context, taskDateInput };
}

test("context-free task creation defaults to schedule:none instead of today", () => {
  const { context } = loadScheduleStack();
  const task = context.makeTask({ title: "Undated" });

  assert.equal(task.targetAt, null);
  assert.deepEqual(
    JSON.parse(JSON.stringify(task.schedule)),
    { type: "none", date: null, time: null }
  );
});

test("context-free create modal starts with a blank date", () => {
  const { context, taskDateInput } = loadScheduleStack();

  context.openCreateTaskModal();
  assert.equal(taskDateInput.value, "");
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.taskModalContext.schedule)),
    { type: "none", date: null, time: null }
  );
});

test("explicit date context is still preserved", () => {
  const { context, taskDateInput } = loadScheduleStack();

  context.openCreateTaskModal({ targetAt: "2026-08-30" });
  assert.equal(taskDateInput.value, "2026-08-30");

  const task = context.makeTask({ targetAt: "2026-08-31" });
  assert.equal(task.targetAt, "2026-08-31");
  assert.equal(task.schedule.type, "date");
});

test("explicit child schedule is authoritative over a recent spatial date hit", () => {
  const { context, taskDateInput } = loadScheduleStack();
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

  context.openCreateTaskModal({
    parentId: "parent",
    targetAt: "2026-08-30",
    branchMode: "branch"
  });
  assert.equal(taskDateInput.value, "2026-09-05");
});

test("reset/default state factory normalizes legacy dates through the canonical schedule writer", () => {
  const { context } = loadScheduleStack();
  const next = context.makeInitialState();
  const task = next.tasks.legacy;

  assert.equal(task.targetAt, "2026-08-29");
  assert.deepEqual(
    JSON.parse(JSON.stringify(task.schedule)),
    { type: "date", date: "2026-08-29", time: null }
  );
});

test("toolbar root Add owns canonical undated intent without a capture shim", () => {
  const start = appSource.indexOf('addRootBtn.addEventListener("click"');
  const end = appSource.indexOf('treeLayoutBtn.addEventListener("click"', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const rootAddListener = appSource.slice(start, end);
  assert.match(rootAddListener, /schedule:\s*\{\s*type:\s*"none",\s*date:\s*null,\s*time:\s*null\s*\}/);
  assert.doesNotMatch(rootAddListener, /targetAt|todayISO/);
  assert.doesNotMatch(scheduleModelSource, /addRootBtn\.addEventListener/);
  assert.doesNotMatch(scheduleModelSource, /stopImmediatePropagation/);
});

test("creation ownership no longer lives in schedule-model", () => {
  assert.doesNotMatch(scheduleModelSource, /baseMakeTask|makeTaskWithSchedule/);
  assert.doesNotMatch(scheduleModelSource, /baseMakeInitialState|makeInitialStateWithSchedule/);
  assert.doesNotMatch(scheduleModelSource, /openCreateTaskModalWithSchedule|recentAskTargetDate/);

  assert.match(taskFactorySource, /makeTask = function canonicalMakeTask/);
  assert.match(taskFactorySource, /makeInitialState = function canonicalMakeInitialState/);
  assert.match(modalControllerSource, /openCreateTaskModal = function canonicalCreateTaskModal/);
});

test("an explicit root request for today remains dated", () => {
  const { context, taskDateInput } = loadScheduleStack();

  context.openCreateTaskModal({
    parentId: null,
    targetAt: context.todayISO(),
    branchMode: "same"
  });

  assert.equal(taskDateInput.value, "2026-08-22");
});
