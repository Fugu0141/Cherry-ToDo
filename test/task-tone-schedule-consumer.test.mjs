import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { scheduleModel } from "../src/core/schedule.js";

const finalFixSource = readFileSync(new URL("../final-fix.js", import.meta.url), "utf8");
const bridgeSource = readFileSync(new URL("../legacy-core-bridge.js", import.meta.url), "utf8");

function extractFunction(name, nextMarker) {
  const start = finalFixSource.indexOf(`  function ${name}`);
  const end = finalFixSource.indexOf(nextMarker, start);
  assert.notEqual(start, -1, `${name} must exist`);
  assert.notEqual(end, -1, `${name} boundary must remain stable`);
  return finalFixSource.slice(start, end);
}

const taskDateSource = extractFunction("taskDate(task) {", "\n\n  function tasksOnDate");
const taskToneSource = extractFunction("taskToneClass(task) {", "\n\n  function collectRelatedIds");

function tone(task, { withBridge = true } = {}) {
  const window = {
    CherryCore: { schedule: scheduleModel },
    addEventListener() {}
  };
  const context = vm.createContext({
    window,
    task,
    result: undefined,
    todayISO() { return "2026-08-22"; }
  });

  if (withBridge) vm.runInContext(bridgeSource, context);
  vm.runInContext(`${taskDateSource}\n${taskToneSource}\nresult = taskToneClass(task);`, context);
  return context.result;
}

test("canonical undated tasks keep the neutral base card tone", () => {
  let legacyReads = 0;
  const task = {
    status: "todo",
    schedule: { type: "none", date: null, time: null }
  };
  Object.defineProperty(task, "targetAt", {
    enumerable: true,
    get() {
      legacyReads += 1;
      return "2026-08-22";
    }
  });

  assert.equal(tone(task), "");
  assert.equal(legacyReads, 0, "canonical schedule:none must not consult stale targetAt");
});

test("canonical dates drive overdue, today, and future tones", () => {
  assert.equal(tone({
    status: "todo",
    schedule: { type: "date", date: "2026-08-21", time: null },
    targetAt: "2026-08-30"
  }), "overdueTask");

  assert.equal(tone({
    status: "todo",
    schedule: { type: "datetime", date: "2026-08-22", time: "18:30" },
    targetAt: "2026-08-30"
  }), "todayTask");

  assert.equal(tone({
    status: "todo",
    schedule: { type: "date", date: "2026-08-23", time: null },
    targetAt: "2026-08-20"
  }), "futureTask");
});

test("legacy-only dated tasks keep compatibility through the Core bridge", () => {
  assert.equal(tone({ status: "todo", targetAt: "2026-08-21" }), "overdueTask");
  assert.equal(tone({ status: "todo", targetAt: "2026-08-22" }), "todayTask");
  assert.equal(tone({ status: "todo", targetAt: "2026-08-23" }), "futureTask");
});

test("done tone remains authoritative regardless of schedule", () => {
  assert.equal(tone({
    status: "done",
    schedule: { type: "none", date: null, time: null },
    targetAt: "2026-08-22"
  }), "doneTask");
});

test("missing schedule bridge fails neutral without reading targetAt directly", () => {
  let legacyReads = 0;
  const task = { status: "todo" };
  Object.defineProperty(task, "targetAt", {
    get() {
      legacyReads += 1;
      throw new Error("taskToneClass must not read targetAt directly");
    }
  });

  assert.equal(tone(task, { withBridge: false }), "");
  assert.equal(legacyReads, 0);
});

test("task tone reader uses the effective Core date and preserves layout scope", () => {
  assert.match(taskToneSource, /const date = taskDate\(task\)/);
  assert.match(taskToneSource, /if \(date === null\) return ""/);
  assert.doesNotMatch(taskToneSource, /targetAt/);
  assert.doesNotMatch(taskToneSource, /normalizeDate/);

  // This PR is presentation-only: no board position or schedule writes belong here.
  assert.doesNotMatch(taskToneSource, /\.x\s*=/);
  assert.doesNotMatch(taskToneSource, /\.y\s*=/);
  assert.doesNotMatch(taskToneSource, /setTask/);
});
