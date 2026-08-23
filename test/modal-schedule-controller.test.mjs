import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const controllerSource = readFileSync(
  new URL("../src/app/modal-schedule-controller.js", import.meta.url),
  "utf8"
);
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function loadController(task) {
  const state = { tasks: { [task.id]: task } };
  const taskModalTitle = { textContent: "" };
  const taskNameInput = { value: "", select() {} };
  const taskDateInput = { value: "" };
  const taskModal = { classList: { add() {}, remove() {} } };
  const changeDateInput = { value: "", focus() {} };
  const dateModal = { classList: { add() {}, remove() {} } };
  const calls = { setTaskSchedule: 0, setTaskDateFromInput: 0, renders: 0 };

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
    state,
    taskModalMode: null,
    taskModalContext: null,
    taskModalTitle,
    taskNameInput,
    taskDateInput,
    taskModal,
    requestAnimationFrame(callback) { callback(); },
    getChildren() { return []; },
    sortByDateThenTitle() { return 0; },
    snapshot() {},
    makeTask({ title, parentId, schedule, branchMode }) {
      return { id: "created", title, parentId, schedule, branchMode };
    },
    selectedId: null,
    closeTaskModal() {
      context.taskModalMode = null;
      context.taskModalContext = null;
    },
    refreshLaneDates() {},
    branchLayout() {},
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

test("edit save reads and writes through canonical schedule helpers", () => {
  const task = {
    id: "task",
    title: "Before",
    x: 10,
    y: 20,
    schedule: { type: "datetime", date: "2026-08-23", time: "09:30" }
  };
  const { context, calls, taskNameInput, taskDateInput } = loadController(task);

  context.openEditTaskModal(task.id);
  assert.equal(taskDateInput.value, "2026-08-23");

  taskNameInput.value = "After";
  taskDateInput.value = "2026-08-25";
  context.saveTaskModal();

  assert.equal(task.title, "After");
  assert.deepEqual(task.schedule, { type: "date", date: "2026-08-25", time: null });
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

test("canonical modal controller loads immediately after the base app and before late schedule wrappers", () => {
  const appIndex = indexSource.indexOf('./app.js');
  const controllerIndex = indexSource.indexOf('./src/app/modal-schedule-controller.js');
  const runtimeIndex = indexSource.indexOf('./src/app/core-runtime-bridge.js');
  const scheduleIndex = indexSource.indexOf('./schedule-model.js');

  assert.ok(appIndex >= 0);
  assert.ok(controllerIndex > appIndex);
  assert.ok(runtimeIndex > controllerIndex);
  assert.ok(scheduleIndex > controllerIndex);
});
