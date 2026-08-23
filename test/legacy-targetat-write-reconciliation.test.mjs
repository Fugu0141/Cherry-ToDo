import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { scheduleModel } from "../src/core/schedule.js";

const source = readFileSync(
  new URL("../src/app/core-runtime-bridge.js", import.meta.url),
  "utf8"
);

const helperStart = source.indexOf("    function reconcileLegacyTargetAtWrites");
const helperEnd = source.indexOf("\n\n    function renderLegacyApp", helperStart);

assert.notEqual(helperStart, -1, "legacy targetAt reconciliation helper must exist");
assert.notEqual(helperEnd, -1, "legacy reconciliation helper boundary must remain stable");

const helperSource = source.slice(helperStart, helperEnd);

function loadHelper(schedule = scheduleModel) {
  const context = vm.createContext({
    schedule,
    serialize: value => JSON.stringify(value),
    Object
  });
  vm.runInContext(helperSource, context);
  return context.reconcileLegacyTargetAtWrites;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("legacy plain task drag promotes a targetAt-only date write into canonical schedule", () => {
  const reconcile = loadHelper();
  const previous = {
    tasks: {
      old: {
        targetAt: "2026-08-22",
        schedule: { type: "date", date: "2026-08-22", time: null }
      }
    }
  };
  const next = {
    tasks: {
      old: {
        targetAt: "2026-08-30",
        schedule: { type: "date", date: "2026-08-22", time: null }
      }
    }
  };

  assert.equal(reconcile(previous, next), true);

  assert.equal(next.tasks.old.targetAt, "2026-08-30");
  assert.deepEqual(plain(next.tasks.old.schedule), {
    type: "date",
    date: "2026-08-30",
    time: null
  });
});

test("pre-Core targetAt-only task drag gains a canonical schedule", () => {
  const reconcile = loadHelper();
  const previous = { tasks: { old: { targetAt: "2026-08-22" } } };
  const next = { tasks: { old: { targetAt: "2026-08-30" } } };

  assert.equal(reconcile(previous, next), true);

  assert.equal(next.tasks.old.targetAt, "2026-08-30");
  assert.deepEqual(plain(next.tasks.old.schedule), {
    type: "date",
    date: "2026-08-30",
    time: null
  });
});

test("canonical writers remain authoritative when they update schedule themselves", () => {
  const reconcile = loadHelper();
  const previous = {
    tasks: {
      task: {
        targetAt: "2026-08-22",
        schedule: { type: "date", date: "2026-08-22", time: null }
      }
    }
  };
  const next = {
    tasks: {
      task: {
        targetAt: "2026-08-30",
        schedule: { type: "datetime", date: "2026-08-30", time: "18:30" }
      }
    }
  };

  assert.equal(reconcile(previous, next), false);

  assert.deepEqual(plain(next.tasks.task.schedule), {
    type: "datetime",
    date: "2026-08-30",
    time: "18:30"
  });
});

test("legacy reconciliation stays disabled when Core schedule helpers are unavailable", () => {
  const reconcile = loadHelper({});
  const previous = {
    tasks: {
      old: {
        targetAt: "2026-08-22",
        schedule: { type: "date", date: "2026-08-22", time: null }
      }
    }
  };
  const next = {
    tasks: {
      old: {
        targetAt: "2026-08-30",
        schedule: { type: "date", date: "2026-08-22", time: null }
      }
    }
  };

  assert.equal(reconcile(previous, next), false);

  assert.equal(next.tasks.old.targetAt, "2026-08-30");
  assert.deepEqual(plain(next.tasks.old.schedule), {
    type: "date",
    date: "2026-08-22",
    time: null
  });
});

test("legacy mutation capture reconciles and relayouts before the render that records history", () => {
  const requestStart = source.indexOf("requestRender = function coreAwareRequestRender");
  const requestEnd = source.indexOf("\n      };", requestStart);
  assert.notEqual(requestStart, -1);
  assert.notEqual(requestEnd, -1);

  const requestSource = source.slice(requestStart, requestEnd);
  assert.match(requestSource, /const current = safeState\(\);/);
  assert.match(requestSource, /const reconciledLegacyDate = reconcileLegacyTargetAtWrites\(previous, current\);/);
  assert.match(requestSource, /if \(reconciledLegacyDate && typeof branchLayout === "function"\) branchLayout\(\);/);
  assert.match(requestSource, /const next = clone\(current\);/);

  const reconcileIndex = requestSource.indexOf("reconcileLegacyTargetAtWrites(previous, current)");
  const layoutIndex = requestSource.indexOf("branchLayout()");
  const renderIndex = requestSource.indexOf("originalRequestRender()");
  assert.ok(reconcileIndex < layoutIndex, "canonical date reconciliation must happen before relayout");
  assert.ok(layoutIndex < renderIndex, "relayout must happen before the first rendered frame");
});
