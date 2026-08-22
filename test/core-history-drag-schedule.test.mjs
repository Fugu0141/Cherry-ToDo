import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { scheduleModel } from "../src/core/schedule.js";

const source = readFileSync(
  new URL("../src/app/core-runtime-bridge.js", import.meta.url),
  "utf8"
);

const helperStart = source.indexOf("    function restoreDragSnapshotTask");
const helperEnd = source.indexOf("\n\n    function renderLegacyApp", helperStart);

assert.notEqual(helperStart, -1, "drag snapshot schedule helper must exist");
assert.notEqual(helperEnd, -1, "drag snapshot helper boundary must remain stable");

const helperSource = source.slice(helperStart, helperEnd);

function loadHelper(schedule = scheduleModel) {
  const context = vm.createContext({ schedule });
  vm.runInContext(helperSource, context);
  return context.restoreDragSnapshotTask;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("date-changing drag history restores the original canonical date", () => {
  const restore = loadHelper();
  const task = {
    id: "task",
    x: 500,
    y: 600,
    targetAt: "2026-08-30",
    schedule: { type: "date", date: "2026-08-30", time: null }
  };

  restore(task, { x: 120, y: 140, targetAt: "2026-08-22" });

  assert.equal(task.x, 120);
  assert.equal(task.y, 140);
  assert.equal(task.targetAt, "2026-08-22");
  assert.deepEqual(plain(task.schedule), {
    type: "date",
    date: "2026-08-22",
    time: null
  });
});

test("undo snapshot restores an originally undated task to schedule none", () => {
  const restore = loadHelper();
  const task = {
    id: "task",
    x: 500,
    y: 600,
    targetAt: "2026-08-30",
    schedule: { type: "date", date: "2026-08-30", time: null }
  };

  restore(task, { x: 120, y: 140, targetAt: null });

  assert.equal(task.targetAt, null);
  assert.deepEqual(plain(task.schedule), {
    type: "none",
    date: null,
    time: null
  });
});

test("same-date drag history preserves an existing datetime schedule", () => {
  const restore = loadHelper();
  const task = {
    id: "task",
    x: 500,
    y: 600,
    targetAt: "2026-08-22",
    schedule: { type: "datetime", date: "2026-08-22", time: "18:30" }
  };

  restore(task, { x: 120, y: 140, targetAt: "2026-08-22" });

  assert.equal(task.x, 120);
  assert.equal(task.y, 140);
  assert.equal(task.targetAt, "2026-08-22");
  assert.deepEqual(plain(task.schedule), {
    type: "datetime",
    date: "2026-08-22",
    time: "18:30"
  });
});

test("missing Core schedule helpers preserve the previous targetAt-only fallback", () => {
  const restore = loadHelper({});
  const task = {
    x: 500,
    y: 600,
    targetAt: "2026-08-30",
    schedule: { type: "date", date: "2026-08-30", time: null }
  };

  restore(task, { x: 12, y: 34, targetAt: "2026-08-22" });

  assert.equal(task.x, 12);
  assert.equal(task.y, 34);
  assert.equal(task.targetAt, "2026-08-22");
  assert.deepEqual(plain(task.schedule), {
    type: "date",
    date: "2026-08-30",
    time: null
  });
});

test("legacy snapshot capture delegates drag restoration to the schedule-aware helper", () => {
  const snapshotStart = source.indexOf("snapshot = function captureLegacySnapshot");
  const snapshotEnd = source.indexOf("\n      };", snapshotStart);
  assert.notEqual(snapshotStart, -1);
  assert.notEqual(snapshotEnd, -1);

  const snapshotSource = source.slice(snapshotStart, snapshotEnd);
  assert.match(snapshotSource, /restoreDragSnapshotTask\(draggedTask, activeDrag\.original\)/);
  assert.doesNotMatch(snapshotSource, /draggedTask\.targetAt\s*=\s*activeDrag\.original\.targetAt/);
});
