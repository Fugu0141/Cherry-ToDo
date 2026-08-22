import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { scheduleModel } from "../src/core/schedule.js";

const bridgeSource = readFileSync(new URL("../legacy-core-bridge.js", import.meta.url), "utf8");
const finalFixSource = readFileSync(new URL("../final-fix.js", import.meta.url), "utf8");

const exposureMarker = "  branchLayout();\n  render();\n})();";
const instrumentedFinalFixSource = finalFixSource.replace(
  exposureMarker,
  "  window.__collapseScheduleTest = Object.freeze({ taskDate, tasksOnDate, isDateComplete, isTaskCollapsed });\n"
    + exposureMarker
);

assert.notEqual(instrumentedFinalFixSource, finalFixSource, "final-fix test exposure marker must remain valid");

function normalizeLegacyDate(value) {
  return scheduleModel.isValidISODate(value) ? value : "2026-08-22";
}

function loadCollapseHelpers({ tasks, collapsedDates = [], schedule = scheduleModel, withBridge = true } = {}) {
  const storage = new Map([
    ["quest-sticky-collapsed-done-dates-v2", JSON.stringify(collapsedDates)]
  ]);
  const window = {
    CherryCore: { schedule },
    addEventListener() {}
  };
  const document = {
    body: {
      appendChild() {}
    },
    createElement() {
      return {
        style: {},
        appendChild() {},
        addEventListener() {},
        classList: { add() {} },
        dataset: {}
      };
    },
    createDocumentFragment() {
      return { appendChild() {} };
    }
  };

  const context = vm.createContext({
    window,
    document,
    localStorage: {
      getItem(key) {
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      }
    },
    normalizeDate: normalizeLegacyDate,
    todayISO() {
      return "2026-08-22";
    },
    getTasks() {
      return tasks;
    },
    branchLayout() {},
    render() {}
  });

  if (withBridge) vm.runInContext(bridgeSource, context);
  vm.runInContext(instrumentedFinalFixSource, context);

  return {
    helpers: window.__collapseScheduleTest,
    storage
  };
}

test("completed-date collapse readers use canonical schedule precedence and legacy fallback", () => {
  const canonicalNone = {
    id: "none",
    status: "done",
    schedule: { type: "none", date: null, time: null },
    targetAt: "2026-08-20"
  };
  const canonicalDate = {
    id: "canonical",
    status: "done",
    schedule: { type: "datetime", date: "2026-08-24", time: "18:30" },
    targetAt: "2026-08-20"
  };
  const legacyOnly = {
    id: "legacy",
    status: "done",
    targetAt: "2026-08-20"
  };
  const tasks = [canonicalNone, canonicalDate, legacyOnly];
  const before = structuredClone(tasks);
  const { helpers } = loadCollapseHelpers({
    tasks,
    collapsedDates: ["2026-08-20", "2026-08-24"]
  });

  assert.deepEqual(helpers.tasksOnDate("2026-08-20").map(task => task.id), ["legacy"]);
  assert.deepEqual(helpers.tasksOnDate("2026-08-24").map(task => task.id), ["canonical"]);
  assert.equal(helpers.isDateComplete("2026-08-20"), true);
  assert.equal(helpers.isDateComplete("2026-08-24"), true);

  assert.equal(helpers.isTaskCollapsed(canonicalNone), false);
  assert.equal(helpers.isTaskCollapsed(canonicalDate), true);
  assert.equal(helpers.isTaskCollapsed(legacyOnly), true);
  assert.deepEqual(tasks, before, "collapse reads must not mutate task schedule data");
});

test("an incomplete canonical date does not become complete because stale targetAt tasks match it", () => {
  const tasks = [
    {
      id: "canonical-todo",
      status: "todo",
      schedule: { type: "date", date: "2026-08-25", time: null },
      targetAt: "2026-08-20"
    },
    {
      id: "legacy-done",
      status: "done",
      targetAt: "2026-08-20"
    }
  ];
  const { helpers } = loadCollapseHelpers({ tasks, collapsedDates: ["2026-08-20", "2026-08-25"] });

  assert.equal(helpers.isDateComplete("2026-08-20"), true);
  assert.equal(helpers.isDateComplete("2026-08-25"), false);
  assert.equal(helpers.isTaskCollapsed(tasks[0]), false);
  assert.equal(helpers.isTaskCollapsed(tasks[1]), true);
});

test("missing schedule bridge degrades conservatively without reading targetAt directly", () => {
  let legacyReads = 0;
  const task = { id: "legacy", status: "done" };
  Object.defineProperty(task, "targetAt", {
    enumerable: true,
    get() {
      legacyReads += 1;
      throw new Error("collapse reader must not read targetAt directly");
    }
  });

  const { helpers } = loadCollapseHelpers({
    tasks: [task],
    collapsedDates: ["2026-08-20"],
    withBridge: false
  });

  assert.deepEqual(helpers.tasksOnDate("2026-08-20"), []);
  assert.equal(helpers.isTaskCollapsed(task), false);
  assert.equal(legacyReads, 0);
});

test("the focused change migrates collapse membership but leaves task tone for a later PR", () => {
  const tasksOnDateStart = finalFixSource.indexOf("function tasksOnDate");
  const tasksOnDateEnd = finalFixSource.indexOf("function isDateComplete");
  const collapseStart = finalFixSource.indexOf("function isTaskCollapsed");
  const collapseEnd = finalFixSource.indexOf("function dateSpan");

  assert.match(finalFixSource, /CherryScheduleBridge\?\.getTaskDate/);
  assert.match(finalFixSource.slice(tasksOnDateStart, tasksOnDateEnd), /taskDate\(task\) === normalized/);
  assert.doesNotMatch(finalFixSource.slice(tasksOnDateStart, tasksOnDateEnd), /targetAt/);
  assert.match(finalFixSource.slice(collapseStart, collapseEnd), /const date = taskDate\(task\)/);
  assert.doesNotMatch(finalFixSource, /isDateCollapsed\(task\.targetAt\)/);
  assert.match(finalFixSource, /const oldDate = taskDate\(task\)/);

  // Task tone remains an intentionally separate presentation consumer.
  assert.match(finalFixSource, /const date = normalizeDate\(task\.targetAt\);/);
});
