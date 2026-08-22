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

function plain(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
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

test("effective task schedule reads delegate to a late-arriving Core schedule model without mutating the task", () => {
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
        if (schedule?.type === "none") return { type: "none", date: null, time: null };
        if (schedule?.type === "datetime") return { type: "datetime", date: schedule.date, time: schedule.time };
        return { type: "date", date: schedule?.date || targetAt, time: null };
      },
      scheduleDate(schedule) {
        calls.push(["date", schedule]);
        return schedule?.type === "none" ? null : schedule?.date || null;
      }
    }
  };

  const task = {
    id: "task-1",
    schedule: { type: "datetime", date: "2026-08-26", time: "18:30" },
    targetAt: "2026-08-20",
    unknownField: { keep: true }
  };
  const before = JSON.stringify(task);

  assert.deepEqual(plain(bridge.getTaskSchedule(task)), {
    type: "datetime",
    date: "2026-08-26",
    time: "18:30"
  });
  assert.equal(JSON.stringify(task), before);
  assert.deepEqual(calls, [
    ["normalize", task.schedule, task.targetAt]
  ]);
});

test("task date reads reuse the effective task schedule and Core date projection", () => {
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

test("early startup keeps the existing pure legacy fallback for schedule and date reads until Core arrives", () => {
  let calls = 0;
  const { bridge } = loadBridge({
    normalizeSchedule(schedule, targetAt) {
      calls += 1;
      return schedule || { type: "date", date: targetAt, time: null };
    }
  });

  assert.deepEqual(plain(bridge.getTaskSchedule({ targetAt: "2026-08-27" })), {
    type: "date",
    date: "2026-08-27",
    time: null
  });
  assert.equal(bridge.getTaskDate({ targetAt: "2026-08-28" }), "2026-08-28");
  assert.equal(calls, 2);
});

test("effective task schedule preserves canonical none instead of stale targetAt", () => {
  const { window, bridge } = loadBridge();
  window.CherryCore = {
    schedule: {
      normalizeSchedule(schedule, targetAt) {
        if (schedule?.type === "none") return { type: "none", date: null, time: null };
        return { type: "date", date: targetAt, time: null };
      },
      scheduleDate(schedule) {
        return schedule?.type === "none" ? null : schedule?.date || null;
      }
    }
  };

  const task = {
    schedule: { type: "none", date: null, time: null },
    targetAt: "2026-08-29"
  };

  assert.deepEqual(plain(bridge.getTaskSchedule(task)), {
    type: "none",
    date: null,
    time: null
  });
  assert.equal(bridge.getTaskDate(task), null);
});

test("schedule bridge model access remains read-only and dynamically resolved", () => {
  assert.match(source, /function getScheduleModel\(\)/);
  assert.match(source, /function getTaskSchedule\(task\)/);
  assert.match(source, /currentCore\(\)\?\.schedule/);
  assert.match(source, /Object\.freeze\(\{ getScheduleModel, getTaskSchedule, getTaskDate, collectLaneDates \}\)/);
  assert.doesNotMatch(source, /let coreSchedule/);
  assert.doesNotMatch(source, /task\.schedule\s*=/);
  assert.doesNotMatch(source, /Object\.defineProperty\(task/);
});
