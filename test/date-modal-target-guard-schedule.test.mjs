import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("../src/features/date-modal-target-guard/implementation.js", import.meta.url),
  "utf8"
);

function makeHarness(hit) {
  const calls = { change: [] };
  const originalCreate = options => options;
  const window = { questStickyRecentDateHit: hit };
  const context = vm.createContext({
    window,
    calls,
    normalizeDate: value => value,
    openCreateTaskModal: originalCreate,
    openChangeDateModal(...args) {
      calls.change.push(JSON.parse(JSON.stringify(args)));
      return args;
    }
  });

  vm.runInContext(source, context);
  return { context, calls, originalCreate };
}

function freshHit() {
  return {
    mode: "ask",
    date: "2026-08-22",
    targetDate: "2026-08-30",
    at: Date.now()
  };
}

test("date-target guard no longer wraps task creation", () => {
  const { context, originalCreate } = makeHarness(freshHit());

  assert.equal(context.openCreateTaskModal, originalCreate);
  assert.doesNotMatch(source, /targetAt/);
  assert.doesNotMatch(source, /baseOpenCreateTaskModal/);
});

test("fresh ask target is applied to the date-change modal", () => {
  const { context, calls } = makeHarness(freshHit());

  context.openChangeDateModal("task", "2026-08-22", { x: 10, y: 20 });
  assert.equal(calls.change[0][1], "2026-08-30");
});

test("matching boundary fallback keeps the target date after the freshness window", () => {
  const hit = freshHit();
  hit.at = 0;
  const { context, calls } = makeHarness(hit);

  context.openChangeDateModal("task", "2026-08-22", { x: 10, y: 20 });
  assert.equal(calls.change[0][1], "2026-08-30");
});

test("unrelated stale boundary hit leaves the requested date unchanged", () => {
  const hit = freshHit();
  hit.at = 0;
  const { context, calls } = makeHarness(hit);

  context.openChangeDateModal("task", "2026-08-24", { x: 10, y: 20 });
  assert.equal(calls.change[0][1], "2026-08-24");
});
