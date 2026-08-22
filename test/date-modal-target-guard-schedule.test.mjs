import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("../src/features/date-modal-target-guard/implementation.js", import.meta.url),
  "utf8"
);

function makeHarness(hit) {
  const calls = { create: [], change: [] };
  const window = { questStickyRecentDateHit: hit };
  const context = vm.createContext({
    window,
    calls,
    normalizeDate: value => value,
    openCreateTaskModal(options) {
      calls.create.push(JSON.parse(JSON.stringify(options)));
      return options;
    },
    openChangeDateModal(...args) {
      calls.change.push(JSON.parse(JSON.stringify(args)));
      return args;
    }
  });

  vm.runInContext(source, context);
  return { context, calls };
}

function freshHit() {
  return {
    mode: "ask",
    date: "2026-08-22",
    targetDate: "2026-08-30",
    at: Date.now()
  };
}

test("explicit canonical none is not overridden by a recent date hit", () => {
  const { context, calls } = makeHarness(freshHit());
  context.openCreateTaskModal({
    parentId: "parent",
    targetAt: null,
    schedule: { type: "none", date: null, time: null },
    branchMode: "same"
  });

  assert.deepEqual(calls.create[0], {
    parentId: "parent",
    targetAt: null,
    schedule: { type: "none", date: null, time: null },
    branchMode: "same"
  });
});

test("explicit canonical date is not rewritten by a recent date hit", () => {
  const { context, calls } = makeHarness(freshHit());
  context.openCreateTaskModal({
    parentId: "parent",
    targetAt: "2026-08-22",
    schedule: { type: "date", date: "2026-08-25", time: null },
    branchMode: "branch"
  });

  assert.equal(calls.create[0].targetAt, "2026-08-22");
  assert.deepEqual(calls.create[0].schedule, {
    type: "date",
    date: "2026-08-25",
    time: null
  });
});

test("legacy parent creation without schedule still accepts the recent date target", () => {
  const { context, calls } = makeHarness(freshHit());
  context.openCreateTaskModal({
    parentId: "parent",
    targetAt: "2026-08-22",
    branchMode: "same"
  });

  assert.equal(calls.create[0].targetAt, "2026-08-30");
  assert.equal("schedule" in calls.create[0], false);
});

test("root creation is not retargeted and date-change guard behavior is preserved", () => {
  const { context, calls } = makeHarness(freshHit());

  context.openCreateTaskModal({ parentId: null, targetAt: "2026-08-22" });
  assert.equal(calls.create[0].targetAt, "2026-08-22");

  context.openChangeDateModal("task", "2026-08-22", { x: 10, y: 20 });
  assert.equal(calls.change[0][1], "2026-08-30");
});

test("create guard explicitly gates legacy targetAt retargeting on missing schedule", () => {
  assert.match(source, /next\.parentId && next\.schedule === undefined/);
});
