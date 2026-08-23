import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("../src/features/date-target/implementation.js", import.meta.url),
  "utf8"
);
const guardSource = readFileSync(
  new URL("../src/features/date-modal-target-guard/implementation.js", import.meta.url),
  "utf8"
);
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function makeHarness() {
  const listeners = new Map();
  const originalCreate = () => "create";
  const originalChange = () => "change";
  const window = {
    cherryDateOnly: null,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    }
  };

  const context = vm.createContext({
    window,
    document: { getElementById: () => null },
    openCreateTaskModal: originalCreate,
    openChangeDateModal: originalChange,
    state: { showLanes: true, tasks: {} },
    drag: null,
    connectDrag: null,
    noteW: 220,
    noteH: 104,
    hotLaneDate: null,
    hotLineDate: null,
    ghost: {},
    isVerticalMode: () => false,
    getLaneDates: () => ["2026-08-22", "2026-08-23"],
    hDateLineX: date => date === "2026-08-22" ? 100 : 380,
    hEndLineX: () => 660,
    vDateLineY: () => 0,
    vEndLineY: () => 0,
    normalizeDate: value => value || "2026-08-22",
    todayISO: () => "2026-08-22",
    boardPoint: () => ({ x: 0, y: 0 }),
    setObjectPos() {},
    updatePreviewBranch() {},
    renderLanes() {},
    Date,
    Math
  });

  vm.runInContext(source, context);
  return { context, window, listeners, originalCreate, originalChange };
}

test("date-target no longer owns task or date modal wrappers", () => {
  const { context, originalCreate, originalChange } = makeHarness();

  assert.equal(context.openCreateTaskModal, originalCreate);
  assert.equal(context.openChangeDateModal, originalChange);
  assert.doesNotMatch(source, /targetAt/);
  assert.doesNotMatch(source, /openCreateTaskModal|openChangeDateModal/);
});

test("date-target still publishes recent boundary hits for the later guard", () => {
  const { context, window } = makeHarness();

  const hit = context.hitTestDateArea(-10);

  assert.equal(hit.kind, "line");
  assert.equal(hit.date, "2026-08-22");
  assert.equal(hit.targetDate, "2026-08-23");
  assert.equal(hit.mode, "ask");
  assert.equal(window.questStickyRecentDateHit.kind, "line");
  assert.equal(window.questStickyRecentDateHit.targetDate, "2026-08-23");
  assert.equal(typeof window.questStickyRecentDateHit.at, "number");
});

test("date-target keeps the pointermove hit-testing hook", () => {
  const { listeners } = makeHarness();
  assert.equal(typeof listeners.get("pointermove"), "function");
});

test("board lane drag writes dates through the canonical schedule writer", () => {
  const pointerUpStart = appSource.indexOf('window.addEventListener("pointerup"');
  const pointerUpEnd = appSource.indexOf("\nfunction finishDragUI", pointerUpStart);

  assert.ok(pointerUpStart >= 0);
  assert.ok(pointerUpEnd > pointerUpStart);

  const pointerUpSource = appSource.slice(pointerUpStart, pointerUpEnd);
  assert.match(pointerUpSource, /window\.setTaskDate\(task, hit\.date\)/);
  assert.doesNotMatch(pointerUpSource, /task\.targetAt\s*=\s*hit\.date/);
});

test("schedule-model owns create scheduling while the late guard only corrects date changes", () => {
  const dateTarget = indexSource.indexOf("src/features/date-target/implementation.js");
  const scheduleModel = indexSource.indexOf("schedule-model.js");
  const lateGuard = indexSource.indexOf("src/features/date-modal-target-guard/implementation.js");

  assert.ok(dateTarget >= 0);
  assert.ok(scheduleModel > dateTarget);
  assert.ok(lateGuard > scheduleModel);
  assert.doesNotMatch(guardSource, /openCreateTaskModal|targetAt/);
  assert.match(guardSource, /openChangeDateModal/);
});
