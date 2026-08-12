import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeTaskSchedule,
  normalizeTaskSchedules
} from "../src/core/schedule.js";
import {
  normalizeTabState,
  normalizeWorkspace,
  parseWorkspace,
  serializeWorkspace
} from "../src/core/workspace.js";

const NONE = { type: "none", date: null, time: null };

test("valid schedule:none is canonicalized without changing legacy targetAt", () => {
  const task = normalizeTaskSchedule({
    id: "none",
    targetAt: "2026-08-12",
    schedule: { type: "none", date: "2026-08-12", time: "09:30" }
  });

  assert.deepEqual(task.schedule, NONE);
  assert.equal(task.targetAt, "2026-08-12");
});

test("valid schedule:date keeps its date and clears time", () => {
  const task = normalizeTaskSchedule({
    id: "date",
    schedule: { type: "date", date: "2026-08-13", time: "09:30" }
  });

  assert.deepEqual(task.schedule, { type: "date", date: "2026-08-13", time: null });
});

test("valid schedule:datetime preserves its date and time", () => {
  const task = normalizeTaskSchedule({
    id: "datetime",
    schedule: { type: "datetime", date: "2026-08-14", time: "23:59" }
  });

  assert.deepEqual(task.schedule, {
    type: "datetime",
    date: "2026-08-14",
    time: "23:59"
  });
});

test("legacy targetAt migrates to a date schedule", () => {
  const task = normalizeTaskSchedule({ id: "legacy", targetAt: "2026-08-15" });

  assert.deepEqual(task.schedule, { type: "date", date: "2026-08-15", time: null });
  assert.equal(task.targetAt, "2026-08-15");
});

test("valid canonical schedule takes precedence over conflicting targetAt", () => {
  const task = normalizeTaskSchedule({
    id: "canonical",
    targetAt: "2026-08-16",
    schedule: { type: "datetime", date: "2026-08-17", time: "08:45" }
  });

  assert.deepEqual(task.schedule, {
    type: "datetime",
    date: "2026-08-17",
    time: "08:45"
  });
  assert.equal(task.targetAt, "2026-08-16");
});

test("invalid canonical schedule falls back to a valid targetAt", () => {
  const task = normalizeTaskSchedule({
    id: "fallback",
    targetAt: "2026-08-18",
    schedule: { type: "datetime", date: "2026-08-19", time: "24:00" }
  });

  assert.deepEqual(task.schedule, { type: "date", date: "2026-08-18", time: null });
});

test("invalid or missing persisted dates become undated and never today", () => {
  const tasks = normalizeTaskSchedules({
    missing: { id: "missing" },
    invalidLegacy: { id: "invalidLegacy", targetAt: "tomorrow" },
    invalidCanonical: {
      id: "invalidCanonical",
      schedule: { type: "date", date: "2026-99-99", time: null }
    }
  });

  assert.deepEqual(tasks.missing.schedule, NONE);
  assert.deepEqual(tasks.invalidLegacy.schedule, NONE);
  assert.deepEqual(tasks.invalidCanonical.schedule, NONE);
});

test("task normalization preserves unrelated and unknown fields", () => {
  const original = {
    id: "preserved",
    title: "Keep everything",
    parentId: "root",
    branchMode: "same",
    x: 21,
    y: 34,
    targetAt: "2026-08-20",
    status: "todo",
    unknownTaskData: { nested: [1, 2, 3] }
  };
  const normalized = normalizeTaskSchedule(original);

  assert.deepEqual(normalized, {
    ...original,
    schedule: { type: "date", date: "2026-08-20", time: null }
  });
  assert.deepEqual(original, {
    id: "preserved",
    title: "Keep everything",
    parentId: "root",
    branchMode: "same",
    x: 21,
    y: 34,
    targetAt: "2026-08-20",
    status: "todo",
    unknownTaskData: { nested: [1, 2, 3] }
  });
});

test("workspace serialization round-trip adds schedules without changing other data", () => {
  const workspace = {
    version: 1,
    activeTabId: "tab-1",
    unknownWorkspaceData: { keep: "workspace" },
    tabs: [{
      id: "tab-1",
      name: "Compatibility",
      unknownTabData: { keep: "tab" },
      state: {
        tasks: {
          root: {
            id: "root",
            parentId: null,
            x: 8,
            y: 13,
            targetAt: "2026-08-21",
            futureTaskField: true
          },
          child: {
            id: "child",
            parentId: "root",
            x: 21,
            y: 34,
            targetAt: null,
            branchMode: "same"
          }
        },
        links: [{ from: "root", to: "child", kind: "legacy" }],
        showLanes: false,
        viewMode: "list",
        viewState: { selectedTaskId: "child" },
        board: {
          positions: { root: { x: 8, y: 13 }, child: { x: 21, y: 34 } },
          viewport: { x: 3, y: 5, zoom: 0.8 },
          unknownBoardData: { keep: true }
        }
      },
      updatedAt: "2026-08-12T00:00:00.000Z"
    }],
    updatedAt: "2026-08-12T00:00:00.000Z"
  };

  const roundTrip = parseWorkspace(serializeWorkspace(workspace));
  const state = roundTrip.tabs[0].state;

  assert.deepEqual(state.tasks.root.schedule, {
    type: "date",
    date: "2026-08-21",
    time: null
  });
  assert.deepEqual(state.tasks.child.schedule, NONE);
  assert.equal(state.tasks.root.targetAt, "2026-08-21");
  assert.equal(state.tasks.child.targetAt, null);
  assert.equal(state.tasks.root.futureTaskField, true);
  assert.deepEqual(state.links, workspace.tabs[0].state.links);
  assert.deepEqual(state.board.positions, workspace.tabs[0].state.board.positions);
  assert.deepEqual(state.board.viewport, workspace.tabs[0].state.board.viewport);
  assert.deepEqual(state.viewState, workspace.tabs[0].state.viewState);
  assert.deepEqual(state.board.unknownBoardData, { keep: true });
  assert.deepEqual(roundTrip.unknownWorkspaceData, workspace.unknownWorkspaceData);
  assert.deepEqual(roundTrip.tabs[0].unknownTabData, workspace.tabs[0].unknownTabData);
});

test("task and workspace normalization are idempotent", () => {
  const workspace = {
    version: 1,
    activeTabId: "tab-1",
    tabs: [{
      id: "tab-1",
      state: {
        tasks: {
          task: {
            id: "task",
            targetAt: "2026-08-22",
            schedule: { type: "date", date: "2026-08-22", time: null }
          }
        },
        showLanes: true
      }
    }]
  };
  const once = normalizeWorkspace(workspace, { now: () => "2026-08-12T00:00:00.000Z" });
  const twice = normalizeWorkspace(once, { now: () => "2026-08-12T00:00:00.000Z" });

  assert.deepEqual(twice, once);
  assert.deepEqual(
    normalizeTaskSchedule(once.tabs[0].state.tasks.task),
    once.tabs[0].state.tasks.task
  );
});

test("representative pre-change quest-sticky-todo-v10 state normalizes additively", () => {
  const storedState = JSON.stringify({
    tasks: {
      root: {
        id: "root",
        title: "Legacy root",
        parentId: null,
        x: 44,
        y: 55,
        targetAt: "2026-07-01",
        status: "todo",
        branchMode: null
      },
      child: {
        id: "child",
        title: "Legacy undated child",
        parentId: "root",
        x: 89,
        y: 144,
        targetAt: "invalid",
        status: "done",
        branchMode: "same",
        unknownTaskData: "keep"
      }
    },
    links: [{ from: "root", to: "child", kind: "legacy" }],
    showLanes: false,
    viewMode: "board",
    unknownStateData: { keep: true }
  });

  const normalized = normalizeTabState(JSON.parse(storedState));

  assert.deepEqual(normalized.tasks.root.schedule, {
    type: "date",
    date: "2026-07-01",
    time: null
  });
  assert.deepEqual(normalized.tasks.child.schedule, NONE);
  assert.equal(normalized.tasks.child.targetAt, "invalid");
  assert.equal(normalized.tasks.child.parentId, "root");
  assert.equal(normalized.tasks.child.x, 89);
  assert.equal(normalized.tasks.child.y, 144);
  assert.equal(normalized.tasks.child.unknownTaskData, "keep");
  assert.deepEqual(normalized.links, [{ from: "root", to: "child", kind: "legacy" }]);
  assert.equal(normalized.showLanes, false);
  assert.equal(normalized.board.settings.showDateLanes, false);
  assert.deepEqual(normalized.unknownStateData, { keep: true });
});
