import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const controllerSource = readFileSync(
  new URL("../src/app/modal-schedule-controller.js", import.meta.url),
  "utf8"
);
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function loadController(task, { showLanes = false } = {}) {
  const state = { tasks: { [task.id]: task }, showLanes };
  const taskModalTitle = { textContent: "" };
  const taskNameInput = { value: "", select() {}, focus() {} };
  const taskDateInput = { value: "" };
  const taskModal = { classList: { add() {}, remove() {} } };
  const changeDateInput = { value: "", focus() {} };
  const dateModal = { classList: { add() {}, remove() {} } };
  const calls = { setTaskSchedule: 0, setTaskDateFromInput: 0, renders: 0, layouts: 0 };

  const window = {
    getTaskDate(candidate) {
      const schedule = candidate?.schedule;
      return schedule && (schedule.type === "date" || schedule.type === "datetime")
        ? schedule.date
        : null;
    },
    hasTaskDate(candidate) {
      return Boolean(this.getTaskDate(candidate));
    },
    isValidISODate(value) {
      return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
    },
    normalizeSchedule(schedule, legacyTargetAt) {
      if (schedule && typeof schedule === "object") return { ...schedule };
      return legacyTargetAt
        ? { type: "date", date: legacyTargetAt, time: null }
        : { type: "none", date: null, time: null };
    },
    makeScheduleDate(date) {
      return { type: "date", date, time: null };
    },
    setTaskDateFromInput(candidate, value) {
      calls.setTaskDateFromInput += 1;
      const date = String(value || "").trim();
      const schedule = date
        ? { type: "date", date, time: null }
        : { type: "none", date: null, time: null };
      candidate.schedule = schedule;
      return schedule;
    },
    setTaskSchedule(candidate, schedule) {
      calls.setTaskSchedule += 1;
      candidate.schedule = { ...schedule };
      return candidate.schedule;
    }
  };

  const context = vm.createContext({
    window,
    Date,
    state,
    taskModalMode: null,
    taskModalContext: null,
    taskModalTitle,
    taskNameInput,
    taskDateInput,
    taskModal,
    requestAnimationFrame(callback) { callback(); },
    getChildren(parentId) {
      return Object.values(state.tasks).filter(candidate => candidate.parentId === parentId);
    },
    sortByDateThenTitle() { return 0; },
    snapshot() {},
    makeTask({ title, parentId, schedule, branchMode }) {
      return { id: "created", title, parentId, x: 0, y: 0, schedule, branchMode };
    },
    selectedId: null,
    closeTaskModal() {
      context.taskModalMode = null;
      context.taskModalContext = null;
    },
    refreshLaneDates() {},
    branchLayout() { calls.layouts += 1; },
    requestRender() { calls.renders += 1; },
    dateModalContext: null,
    changeDateInput,
    dateModal,
    hotLaneDate: null,
    hotLineDate: null,
    Set
  });

  vm.runInContext(controllerSource, context);
  return { context, calls, taskNameInput, taskDateInput, changeDateInput };
}

test("create modal preserves explicit canonical schedule intent", () => {
  const task = { id: "task", title: "Existing", schedule: { type: "none", date: null, time: null } };
  const { context, taskDateInput } = loadController(task);
  context.window.questStickyRecentDateHit = {
    mode: "ask",
    targetDate: "2026-08-30",
    at: Date.now()
  };

  context.openCreateTaskModal({
    parentId: "task",
    schedule: { type: "none", date: null, time: null },
    branchMode: "same"
  });

  assert.equal(taskDateInput.value, "");
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.taskModalContext.schedule)),
    { type: "none", date: null, time: null }
  );
});

test("free-layout child creation keeps existing task positions and places only the new child", () => {
  const parent = {
    id: "parent",
    title: "Parent",
    x: 320,
    y: 210,
    schedule: { type: "none", date: null, time: null }
  };
  const { context, calls, taskNameInput } = loadController(parent, { showLanes: false });
  context.state.tasks.other = {
    id: "other",
    title: "Other",
    x: 880,
    y: 640,
    schedule: { type: "none", date: null, time: null }
  };

  context.openCreateTaskModal({
    parentId: parent.id,
    schedule: { type: "none", date: null, time: null },
    branchMode: "branch"
  });
  taskNameInput.value = "Child";
  context.saveTaskModal();

  const created = context.state.tasks.created;
  assert.equal(calls.layouts, 0);
  assert.equal(parent.x, 320);
  assert.equal(parent.y, 210);
  assert.equal(context.state.tasks.other.x, 880);
  assert.equal(context.state.tasks.other.y, 640);
  assert.equal(created.parentId, parent.id);
  assert.ok(created.x > parent.x);
  assert.ok(created.y > parent.y);
});

test("free-layout creation respects an explicit drag position", () => {
  const parent = {
    id: "parent",
    title: "Parent",
    x: 100,
    y: 100,
    schedule: { type: "none", date: null, time: null }
  };
  const { context, calls, taskNameInput } = loadController(parent, { showLanes: false });

  context.openCreateTaskModal({
    parentId: parent.id,
    schedule: { type: "none", date: null, time: null },
    branchMode: "branch",
    position: { x: 610, y: 430 }
  });
  taskNameInput.value = "Placed child";
  context.saveTaskModal();

  assert.equal(calls.layouts, 0);
  assert.equal(context.state.tasks.created.x, 610);
  assert.equal(context.state.tasks.created.y, 430);
});

test("dated-lane task creation keeps the existing layout behavior", () => {
  const parent = {
    id: "parent",
    title: "Parent",
    x: 320,
    y: 210,
    schedule: { type: "date", date: "2026-08-23", time: null }
  };
  const { context, calls, taskNameInput } = loadController(parent, { showLanes: true });

  context.openCreateTaskModal({
    parentId: parent.id,
    schedule: { type: "date", date: "2026-08-23", time: null },
    branchMode: "branch"
  });
  taskNameInput.value = "Child";
  context.saveTaskModal();

  assert.equal(calls.layouts, 1);
});

test("edit save reads and writes through canonical schedule helpers without rearranging free layout", () => {
  const task = {
    id: "task",
    title: "Before",
    x: 10,
    y: 20,
    schedule: { type: "datetime", date: "2026-08-23", time: "09:30" }
  };
  const { context, calls, taskNameInput, taskDateInput } = loadController(task, { showLanes: false });

  context.openEditTaskModal(task.id);
  assert.equal(taskDateInput.value, "2026-08-23");

  taskNameInput.value = "After";
  taskDateInput.value = "2026-08-25";
  context.saveTaskModal();

  assert.equal(task.title, "After");
  assert.deepEqual(task.schedule, { type: "date", date: "2026-08-25", time: null });
  assert.equal(task.x, 10);
  assert.equal(task.y, 20);
  assert.equal(calls.layouts, 0);
  assert.equal(calls.setTaskSchedule, 1);
  assert.equal(calls.setTaskDateFromInput, 1);
});

test("date modal cancel restores position without degrading an existing datetime schedule", () => {
  const task = {
    id: "task",
    title: "Timed",
    x: 400,
    y: 500,
    schedule: { type: "datetime", date: "2026-08-23", time: "09:30" }
  };
  const { context, calls } = loadController(task);

  context.openChangeDateModal(task.id, "2026-08-24", { x: 10, y: 20, targetAt: "2026-08-23" });
  context.closeDateModal({ restore: true });

  assert.equal(task.x, 10);
  assert.equal(task.y, 20);
  assert.deepEqual(task.schedule, { type: "datetime", date: "2026-08-23", time: "09:30" });
  assert.equal(calls.setTaskSchedule, 0);
  assert.equal(calls.setTaskDateFromInput, 0);
});

test("canonical task factory and modal controller load immediately after the base app", () => {
  const appIndex = indexSource.indexOf('./app.js');
  const factoryIndex = indexSource.indexOf('./src/app/task-schedule-factory.js');
  const controllerIndex = indexSource.indexOf('./src/app/modal-schedule-controller.js');
  const runtimeIndex = indexSource.indexOf('./src/app/core-runtime-bridge.js');
  const scheduleIndex = indexSource.indexOf('./schedule-model.js');

  assert.ok(appIndex >= 0);
  assert.ok(factoryIndex > appIndex);
  assert.ok(controllerIndex > factoryIndex);
  assert.ok(runtimeIndex > controllerIndex);
  assert.ok(scheduleIndex > controllerIndex);
});