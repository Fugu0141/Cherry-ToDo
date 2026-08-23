import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../schedule-model.js", import.meta.url), "utf8");

function extractAssignment(name, nextName) {
  const start = source.indexOf(`  ${name} = function `);
  const end = source.indexOf(`\n\n  ${nextName} = function `, start);

  assert.notEqual(start, -1, `${name} override must exist`);
  assert.notEqual(end, -1, `${name} override boundary must remain stable`);
  return source.slice(start, end);
}

test("opening edit and date-change modals does not normalize task state in place", () => {
  const editSource = extractAssignment("openEditTaskModal", "saveTaskModal");
  const dateSource = extractAssignment("openChangeDateModal", "saveDateModal");

  assert.match(editSource, /getTaskDate\(task\)/);
  assert.doesNotMatch(editSource, /normalizeTaskSchedule\(task\)/);

  assert.match(dateSource, /getTaskDate\(task\)/);
  assert.doesNotMatch(dateSource, /normalizeTaskSchedule\(task\)/);
});
