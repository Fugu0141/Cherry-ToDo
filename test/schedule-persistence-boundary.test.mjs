import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const storageSource = readFileSync(new URL("../state-storage.js", import.meta.url), "utf8");
const scheduleSource = readFileSync(new URL("../schedule-model.js", import.meta.url), "utf8");

function loadStorage({ normalizeAllTasks } = {}) {
  const writes = [];
  const listeners = new Map();
  const state = {
    tasks: {
      legacy: { id: "legacy", title: "Legacy", targetAt: "2026-08-24" }
    },
    showLanes: true,
    viewMode: "board"
  };

  const window = {
    CherryWorkDataStorage: {
      keys: {
        taskState: "quest-sticky-todo-v10",
        legacyTaskStates: []
      },
      get() { return null; },
      getFirst() { return null; },
      set(key, value) {
        writes.push([key, value]);
        return true;
      }
    },
    CherryStartupState: {
      shouldMountWorkspace() { return false; }
    },
    cherrySchedule: normalizeAllTasks ? { normalizeAllTasks } : undefined,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener() {}
  };

  const context = vm.createContext({
    window,
    state,
    saveNow() {},
    scheduleSave() {},
    load() {},
    snapshot() {},
    makeInitialState() { return { tasks: {} }; },
    refreshLaneDates() {},
    branchLayout() {},
    requestRender() {},
    undoStack: [],
    saveTimer: null,
    clearTimeout() {},
    setTimeout(callback) { callback(); return 1; },
    JSON,
    Object
  });

  vm.runInContext(storageSource, context);
  return { context, state, writes, listeners };
}

test("storage normalizes schedules at the persistence boundary before serializing", () => {
  let stateRef;
  const calls = [];
  const { context, state, writes } = loadStorage({
    normalizeAllTasks() {
      calls.push("normalize");
      stateRef.tasks.legacy.schedule = { type: "date", date: "2026-08-24", time: null };
    }
  });
  stateRef = state;

  context.saveNow();

  assert.deepEqual(calls, ["normalize"]);
  assert.equal(writes.length, 1);
  const persisted = JSON.parse(writes[0][1]);
  assert.deepEqual(persisted.tasks.legacy.schedule, {
    type: "date",
    date: "2026-08-24",
    time: null
  });
});

test("storage remains usable before schedule semantics are available", () => {
  const { context, writes } = loadStorage();

  context.saveNow();

  assert.equal(writes.length, 1);
  const persisted = JSON.parse(writes[0][1]);
  assert.equal(persisted.tasks.legacy.targetAt, "2026-08-24");
});

test("beforeunload and debounced saves share the same normalized persistence path", () => {
  let normalizations = 0;
  const { context, listeners, writes } = loadStorage({
    normalizeAllTasks() {
      normalizations += 1;
    }
  });

  context.scheduleSave();
  listeners.get("beforeunload")();

  assert.equal(normalizations, 2);
  assert.equal(writes.length, 2);
});

test("schedule-model no longer replaces saveNow after storage has installed it", () => {
  assert.doesNotMatch(scheduleSource, /baseSaveNow/);
  assert.doesNotMatch(scheduleSource, /saveNow\s*=\s*function/);
  assert.doesNotMatch(scheduleSource, /saveNowWithSchedule/);
  assert.match(storageSource, /window\.cherrySchedule\?\.normalizeAllTasks/);
});
