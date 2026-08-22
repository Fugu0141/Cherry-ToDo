import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { scheduleModel } from "../src/core/schedule.js";

const bridgeSource = readFileSync(new URL("../legacy-core-bridge.js", import.meta.url), "utf8");
const featureSource = readFileSync(
  new URL("../src/features/same-day-layout/implementation.js", import.meta.url),
  "utf8"
);

function legacyDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value : "";
}

function effectiveDate(task) {
  return scheduleModel.scheduleDate(scheduleModel.normalizeSchedule(task?.schedule, task?.targetAt));
}

function loadLayout({ parent, child, schedule = scheduleModel, withBridge = true, vertical = false }) {
  const tasks = [parent, child];
  const warnings = [];
  const columns = new Map();
  const positions = new Map();
  const laneDates = [...new Set(
    tasks.flatMap(task => [legacyDate(task.targetAt), effectiveDate(task)]).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  const window = {
    CherryCore: { schedule },
    addEventListener() {}
  };

  let context;
  context = vm.createContext({
    window,
    console: {
      warn(...args) {
        warnings.push(args);
      }
    },
    renderLanes() {},
    hAxisLeft: 60,
    vAxisTop: 50,
    noteW: 180,
    noteH: 90,
    hDateGap: 280,
    vDateGap: 180,
    vTaskTopOffset: 40,
    currentMode: "horizontal",
    maxTrack: 0,
    getLaneDates() {
      return laneDates;
    },
    getTasks() {
      return tasks;
    },
    orderChildrenForLayout(taskId) {
      return taskId === parent.id ? [child] : [];
    },
    getRoots() {
      return [parent];
    },
    sortByDateThenTitle() {
      return 0;
    },
    normalizeDate: legacyDate,
    refreshLaneDates() {},
    getLayoutMode() {
      return vertical ? "vertical" : "horizontal";
    },
    syncMetrics() {},
    assignBranchTracks() {
      parent._track = 0;
      child._track = 1;
      return 2;
    },
    getTaskDepth(taskId) {
      return taskId === parent.id ? 0 : 1;
    },
    shiftSubtreeTracks(taskId, delta) {
      const task = tasks.find(candidate => candidate.id === taskId);
      if (task) task._track += delta;
    },
    applyTracksToPositions() {
      for (const task of tasks) {
        columns.set(task.id, task._dayColumn ?? 0);
        const x = context.taskX(task);
        const y = context.taskY(task);
        positions.set(task.id, {
          x,
          y,
          baseX: context.hDateToX(task.targetAt),
          baseY: context.vDateToY(task.targetAt)
        });
        task.x = x;
        task.y = y;
      }
    },
    requestRender() {},
    isVerticalMode() {
      return vertical;
    },
    vTrackToX(track) {
      return 100 + track * 200;
    },
    hTrackToY(track) {
      return 120 + track * 160;
    }
  });

  if (withBridge) vm.runInContext(bridgeSource, context);
  vm.runInContext(featureSource, context);

  return { columns, positions, warnings };
}

function cloneScheduleState(task) {
  return {
    schedule: structuredClone(task.schedule),
    targetAt: task.targetAt
  };
}

test("same-day layout column assignment uses Core schedule precedence and preserves layout geometry formulas", () => {
  const calls = { normalize: 0, date: 0 };
  const coreSchedule = {
    ...scheduleModel,
    normalizeSchedule(...args) {
      calls.normalize += 1;
      return scheduleModel.normalizeSchedule(...args);
    },
    scheduleDate(schedule) {
      calls.date += 1;
      return scheduleModel.scheduleDate(schedule);
    }
  };

  const parent = {
    id: "parent",
    schedule: { type: "date", date: "2026-08-24", time: null },
    targetAt: "2026-08-20"
  };
  const child = {
    id: "child",
    schedule: { type: "datetime", date: "2026-08-24", time: "18:30" },
    targetAt: "2026-08-21"
  };
  const parentBefore = cloneScheduleState(parent);
  const childBefore = cloneScheduleState(child);

  const horizontal = loadLayout({ parent, child, schedule: coreSchedule });

  assert.deepEqual(horizontal.warnings, []);
  assert.equal(horizontal.columns.get("parent"), 0);
  assert.equal(horizontal.columns.get("child"), 1);
  assert.equal(horizontal.positions.get("child").x - horizontal.positions.get("child").baseX, 224);
  assert.equal(horizontal.positions.get("child").y, 280);
  assert.equal(calls.normalize, 2);
  assert.equal(calls.date, 2);
  assert.deepEqual(cloneScheduleState(parent), parentBefore);
  assert.deepEqual(cloneScheduleState(child), childBefore);

  const verticalParent = structuredClone({ ...parent, x: undefined, y: undefined });
  const verticalChild = structuredClone({ ...child, x: undefined, y: undefined });
  const vertical = loadLayout({ parent: verticalParent, child: verticalChild, vertical: true });

  assert.deepEqual(vertical.warnings, []);
  assert.equal(vertical.columns.get("child"), 1);
  assert.equal(vertical.positions.get("child").x, 300);
  assert.equal(vertical.positions.get("child").y - vertical.positions.get("child").baseY, 124);
});

test("canonical none does not become same-day from a stale matching targetAt", () => {
  const parent = {
    id: "parent",
    schedule: { type: "none", date: null, time: null },
    targetAt: "2026-08-25"
  };
  const child = {
    id: "child",
    schedule: { type: "date", date: "2026-08-25", time: null },
    targetAt: "2026-08-25"
  };

  const result = loadLayout({ parent, child });

  assert.deepEqual(result.warnings, []);
  assert.equal(result.columns.get("parent"), 0);
  assert.equal(result.columns.get("child"), 0);
  assert.equal(result.positions.get("child").x - result.positions.get("child").baseX, 0);
});

test("legacy-only matching targetAt values retain same-day column behavior", () => {
  const parent = { id: "parent", targetAt: "2026-08-26" };
  const child = { id: "child", targetAt: "2026-08-26" };

  const result = loadLayout({ parent, child });

  assert.deepEqual(result.warnings, []);
  assert.equal(result.columns.get("child"), 1);
  assert.equal(result.positions.get("child").x - result.positions.get("child").baseX, 224);
});

test("missing schedule bridge degrades to separate columns instead of legacy equality", () => {
  const parent = { id: "parent", targetAt: "2026-08-27" };
  const child = { id: "child", targetAt: "2026-08-27" };

  const result = loadLayout({ parent, child, withBridge: false });

  assert.deepEqual(result.warnings, []);
  assert.equal(result.columns.get("child"), 0);
});

test("only the same-day column equality reader is migrated in this focused change", () => {
  const start = featureSource.indexOf("function assignSameDayColumns");
  const end = featureSource.indexOf("function updateLaneMetrics");
  const columnAssignmentSource = featureSource.slice(start, end);

  assert.match(featureSource, /CherryScheduleBridge\?\.getTaskDate/);
  assert.match(columnAssignmentSource, /sameTaskDate\(child, task\)/);
  assert.doesNotMatch(columnAssignmentSource, /targetAt/);

  // Other legacy layout readers intentionally remain for later focused PRs.
  assert.match(featureSource, /normalizeDate\(task\.targetAt\)/);
  assert.match(featureSource, /hDateToX\(task\.targetAt\)/);
});
