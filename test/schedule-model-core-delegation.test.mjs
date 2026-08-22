import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { scheduleModel } from "../src/core/schedule.js";

const source = readFileSync(new URL("../schedule-model.js", import.meta.url), "utf8");
const helperStart = source.indexOf("  function coreScheduleModel()");
const helperEnd = source.indexOf("\n\n  function getLegacyTargetAt", helperStart);

assert.notEqual(helperStart, -1, "Core schedule accessor must exist");
assert.notEqual(helperEnd, -1, "pure helper boundary must remain stable");

const helperSource = source.slice(helperStart, helperEnd);

function loadHelpers(getScheduleModel) {
  const context = vm.createContext({
    window: {
      CherryScheduleBridge: { getScheduleModel }
    },
    Date,
    Number,
    Object
  });
  vm.runInContext(helperSource, context);
  return context;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("schedule-model keeps its synchronous fallback before Core is ready", () => {
  const context = loadHelpers(() => null);

  assert.equal(context.isValidISODate("2026-08-22"), true);
  assert.equal(context.isValidISODate("2026-02-30"), false);
  assert.equal(context.isValidTime("23:59"), true);
  assert.equal(context.isValidTime("24:00"), false);

  assert.deepEqual(
    plain(context.normalizeSchedule(
      { type: "none", date: "2026-08-22", time: "10:00" },
      "2026-08-30"
    )),
    { type: "none", date: null, time: null }
  );

  assert.deepEqual(
    plain(context.normalizeSchedule(
      { type: "datetime", date: "invalid", time: "10:00" },
      "2026-08-30"
    )),
    { type: "date", date: "2026-08-30", time: null }
  );
});

test("pure helpers delegate to the live Core schedule model after it arrives", () => {
  let liveModel = null;
  const calls = new Map();
  const names = [
    "isValidISODate",
    "isValidTime",
    "makeScheduleNone",
    "makeScheduleDate",
    "makeScheduleDateTime",
    "scheduleFromLegacyTargetAt",
    "normalizeSchedule",
    "scheduleDate",
    "sameSchedule"
  ];
  const core = Object.fromEntries(names.map(name => [
    name,
    (...args) => {
      calls.set(name, (calls.get(name) || 0) + 1);
      return scheduleModel[name](...args);
    }
  ]));

  const context = loadHelpers(() => liveModel);

  // The same already-loaded helper set starts on fallback...
  assert.deepEqual(plain(context.makeScheduleDate("2026-08-22")), {
    type: "date",
    date: "2026-08-22",
    time: null
  });
  assert.equal(calls.size, 0);

  // ...and switches to Core without reloading schedule-model.js.
  liveModel = core;

  assert.equal(context.isValidISODate("2026-08-22"), true);
  assert.equal(context.isValidTime("09:30"), true);
  assert.deepEqual(plain(context.makeScheduleNone()), { type: "none", date: null, time: null });
  assert.deepEqual(plain(context.makeScheduleDate("2026-08-23")), {
    type: "date",
    date: "2026-08-23",
    time: null
  });
  assert.deepEqual(plain(context.makeScheduleDateTime("2026-08-24", "18:30")), {
    type: "datetime",
    date: "2026-08-24",
    time: "18:30"
  });
  assert.deepEqual(plain(context.scheduleFromLegacyTargetAt("2026-08-25")), {
    type: "date",
    date: "2026-08-25",
    time: null
  });
  const normalized = context.normalizeSchedule(
    { type: "date", date: "2026-08-26", time: "ignored" },
    "2026-08-27"
  );
  assert.deepEqual(plain(normalized), { type: "date", date: "2026-08-26", time: null });
  assert.equal(context.scheduleDate(normalized), "2026-08-26");
  assert.equal(context.sameSchedule(normalized, { type: "date", date: "2026-08-26", time: null }), true);

  for (const name of names) {
    assert.equal(calls.get(name), 1, `${name} must delegate to Core`);
  }
});

test("schedule-model does not cache a stale Core schedule model", () => {
  let liveModel;
  let firstCalls = 0;
  let secondCalls = 0;
  const first = {
    makeScheduleNone() {
      firstCalls += 1;
      return scheduleModel.makeScheduleNone();
    }
  };
  const second = {
    makeScheduleNone() {
      secondCalls += 1;
      return scheduleModel.makeScheduleNone();
    }
  };

  const context = loadHelpers(() => liveModel);
  liveModel = first;
  context.makeScheduleNone();
  liveModel = second;
  context.makeScheduleNone();

  assert.equal(firstCalls, 1);
  assert.equal(secondCalls, 1);
});

test("delegation stays inside pure schedule helpers and leaves layout fallback unchanged", () => {
  assert.match(helperSource, /CherryScheduleBridge\?\.getScheduleModel/);
  assert.match(source, /function taskLayoutDate\(task\) \{\n    return getTaskDate\(task\) \|\| todayISO\(\);/);
  assert.doesNotMatch(helperSource, /task\.x|task\.y|branchLayout|requestRender|saveNow/);
});
