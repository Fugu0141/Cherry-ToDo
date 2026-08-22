import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("../src/features/layout-debug/implementation.js", import.meta.url),
  "utf8"
);

function makeHarness(tasks) {
  const datePositionCalls = [];
  const window = {
    CherryScheduleBridge: {
      getTaskDate(task) {
        const schedule = task?.schedule;
        return schedule && (schedule.type === "date" || schedule.type === "datetime")
          ? schedule.date
          : null;
      }
    }
  };

  const context = vm.createContext({
    window,
    console: { table() {}, warn() {}, info() {} },
    noteW: 220,
    noteH: 104,
    vTrackLeft: 0,
    vTrackGap: 100,
    hTrackTop: 0,
    hTrackGap: 100,
    isVerticalMode: () => false,
    vDateToY(date) {
      datePositionCalls.push(date);
      return 0;
    },
    hDateToX(date) {
      datePositionCalls.push(date);
      return 100;
    },
    getTasks: () => tasks,
    getTaskDepth: () => 0,
    Number,
    Math,
    Map,
    Set
  });

  vm.runInContext(source, context);
  return { window, datePositionCalls };
}

test("layout debug reads canonical dates through CherryScheduleBridge", () => {
  const tasks = [
    {
      id: "dated",
      title: "Canonical",
      parentId: null,
      status: "todo",
      x: 100,
      y: 0,
      targetAt: "2026-08-20",
      schedule: { type: "date", date: "2026-08-25", time: null }
    },
    {
      id: "none",
      title: "Undated",
      parentId: null,
      status: "todo",
      x: 100,
      y: 0,
      targetAt: "2026-08-22",
      schedule: { type: "none", date: null, time: null }
    }
  ];

  const { window, datePositionCalls } = makeHarness(tasks);
  const rows = window.cherryLayoutDebug.slots();

  assert.equal(rows[0].id, "dated");
  assert.equal(rows[0].date, "2026-08-25");
  assert.equal(rows[1].id, "none");
  assert.equal(rows[1].date, null);
  assert.equal(rows[1].dayColumn, 0);
  assert.deepEqual(datePositionCalls, ["2026-08-25"]);
});

test("undated collision diagnostics use an explicit none bucket", () => {
  const tasks = [
    {
      id: "a",
      title: "A",
      status: "todo",
      x: 100,
      y: 0,
      schedule: { type: "none", date: null, time: null }
    },
    {
      id: "b",
      title: "B",
      status: "todo",
      x: 100,
      y: 0,
      schedule: { type: "none", date: null, time: null }
    }
  ];

  const { window } = makeHarness(tasks);
  const collisions = window.cherryLayoutDebug.collisions();

  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].slot, "none:0:0");
  assert.deepEqual(Array.from(collisions[0].tasks), ["a", "b"]);
});

test("layout debug no longer reads legacy targetAt directly", () => {
  assert.doesNotMatch(source, /task\.targetAt/);
  assert.match(source, /CherryScheduleBridge\?\.getTaskDate/);
});
