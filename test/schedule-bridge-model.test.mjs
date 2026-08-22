import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../legacy-core-bridge.js", import.meta.url), "utf8");

function loadBridge({ core = null, normalizeSchedule = null } = {}) {
  const listeners = new Map();
  const window = {
    CherryCore: core,
    normalizeSchedule,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    }
  };

  vm.runInNewContext(source, {
    window,
    Promise,
    TypeError,
    Array,
    Set
  });

  return { window, bridge: window.CherryScheduleBridge, listeners };
}

test("schedule bridge exposes no model before the deferred Core is ready", () => {
  const { bridge } = loadBridge();

  assert.equal(bridge.getScheduleModel(), null);
});

test("the same schedule bridge sees Core when it appears after bridge startup", () => {
  const { window, bridge } = loadBridge();
  const schedule = {
    normalizeSchedule() {},
    scheduleDate() {}
  };

  assert.equal(bridge.getScheduleModel(), null);
  window.CherryCore = { schedule };
  assert.equal(bridge.getScheduleModel(), schedule);
});

test("task date reads delegate to a late-arriving Core schedule model", () => {
  const calls = [];
  const { window, bridge } = loadBridge({
    normalizeSchedule() {
      throw new Error("legacy fallback must not run after Core arrives");
    }
  });

  window.CherryCore = {
    schedule: {
      normalizeSchedule(schedule, targetAt) {
        calls.push(["normalize", schedule, targetAt]);
        return schedule;
      },
      scheduleDate(schedule) {
        calls.push(["date", schedule]);
        return schedule?.date || null;
      }
    }
  };

  const task = {
    schedule: { type: "date", date: "2026-08-26", time: null },
    targetAt: "2026-08-20"
  };

  assert.equal(bridge.getTaskDate(task), "2026-08-26");
  assert.deepEqual(calls, [
    ["normalize", task.schedule, task.targetAt],
    ["date", task.schedule]
  ]);
});

test("early startup keeps the existing pure legacy fallback until Core arrives", () => {
  let calls = 0;
  const { bridge } = loadBridge({
    normalizeSchedule(schedule, targetAt) {
      calls += 1;
      return schedule || { type: "date", date: targetAt, time: null };
    }
  });

  assert.equal(bridge.getTaskDate({ targetAt: "2026-08-27" }), "2026-08-27");
  assert.equal(calls, 1);
});

test("schedule bridge model access remains read-only and dynamically resolved", () => {
  assert.match(source, /function getScheduleModel\(\)/);
  assert.match(source, /currentCore\(\)\?\.schedule/);
  assert.match(source, /Object\.freeze\(\{ getScheduleModel, getTaskDate, collectLaneDates \}\)/);
  assert.doesNotMatch(source, /let coreSchedule/);
});
