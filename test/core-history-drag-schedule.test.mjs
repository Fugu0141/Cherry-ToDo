import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("../src/app/core-runtime-bridge.js", import.meta.url),
  "utf8"
);

const helperStart = source.indexOf("    function restoreDragSnapshotTask");
const helperEnd = source.indexOf("\n\n    function renderLegacyApp", helperStart);

assert.notEqual(helperStart, -1, "drag snapshot geometry helper must exist");
assert.notEqual(helperEnd, -1, "drag snapshot helper boundary must remain stable");

const helperSource = source.slice(helperStart, helperEnd);

function loadHelper() {
  const context = vm.createContext({});
  vm.runInContext(helperSource, context);
  return context.restoreDragSnapshotTask;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("drag history restores geometry while keeping the captured canonical date schedule", () => {
  const restore = loadHelper();
  const task = {
    id: "task",
    x: 500,
    y: 600,
    targetAt: "2026-08-22",
    schedule: { type: "date", date: "2026-08-22", time: null }
  };

  restore(task, { x: 120, y: 140, targetAt: "2099-01-01" });

  assert.equal(task.x, 120);
  assert.equal(task.y, 140);
  assert.equal(task.targetAt, "2026-08-22");
  assert.deepEqual(plain(task.schedule), {
    type: "date",
    date: "2026-08-22",
    time: null
  });
});

test("drag history keeps a captured undated schedule unchanged", () => {
  const restore = loadHelper();
  const task = {
    id: "task",
    x: 500,
    y: 600,
    targetAt: null,
    schedule: { type: "none", date: null, time: null }
  };

  restore(task, { x: 120, y: 140, targetAt: "2026-08-22" });

  assert.equal(task.x, 120);
  assert.equal(task.y, 140);
  assert.equal(task.targetAt, null);
  assert.deepEqual(plain(task.schedule), {
    type: "none",
    date: null,
    time: null
  });
});

test("drag history preserves datetime time because the cloned schedule is authoritative", () => {
  const restore = loadHelper();
  const task = {
    id: "task",
    x: 500,
    y: 600,
    targetAt: "2026-08-22",
    schedule: { type: "datetime", date: "2026-08-22", time: "18:30" }
  };

  restore(task, { x: 120, y: 140, targetAt: null });

  assert.equal(task.x, 120);
  assert.equal(task.y, 140);
  assert.equal(task.targetAt, "2026-08-22");
  assert.deepEqual(plain(task.schedule), {
    type: "datetime",
    date: "2026-08-22",
    time: "18:30"
  });
});

test("drag snapshot restoration no longer reads or rewrites schedule compatibility fields", () => {
  assert.doesNotMatch(helperSource, /targetAt/);
  assert.doesNotMatch(helperSource, /\.schedule\b/);
  assert.doesNotMatch(source, /const schedule = core\.schedule/);
});

test("legacy snapshot capture only repairs moved geometry before recording history", () => {
  const snapshotStart = source.indexOf("snapshot = function captureLegacySnapshot");
  const snapshotEnd = source.indexOf("\n      };", snapshotStart);
  assert.notEqual(snapshotStart, -1);
  assert.notEqual(snapshotEnd, -1);

  const snapshotSource = source.slice(snapshotStart, snapshotEnd);
  assert.match(snapshotSource, /pendingLegacyState = clone\(safeState\(\)\)/);
  assert.match(snapshotSource, /restoreDragSnapshotTask\(draggedTask, activeDrag\.original\)/);
  assert.doesNotMatch(snapshotSource, /targetAt/);
  assert.doesNotMatch(snapshotSource, /\.schedule\b/);
});
