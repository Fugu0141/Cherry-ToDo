import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/app/modal-schedule-controller.js", import.meta.url),
  "utf8"
);

function extractAssignment(name, nextName) {
  const start = source.indexOf(`  ${name} = function `);
  const end = source.indexOf(`\n\n  ${nextName} = function `, start);

  assert.notEqual(start, -1, `${name} controller must exist`);
  assert.notEqual(end, -1, `${name} controller boundary must remain stable`);
  return source.slice(start, end);
}

test("opening edit and date-change modals reads effective dates without mutating task state", () => {
  assert.match(source, /window\.getTaskDate\(task\)/);

  const editSource = extractAssignment("openEditTaskModal", "getSameBranchTail");
  const dateSource = extractAssignment("openChangeDateModal", "closeDateModal");

  assert.match(editSource, /currentTaskDate\(task\)/);
  assert.doesNotMatch(editSource, /normalizeTaskSchedule|targetAt/);

  assert.match(dateSource, /currentTaskDate\(task\)/);
  assert.doesNotMatch(dateSource, /normalizeTaskSchedule|targetAt/);
});

test("date modal cancel restores geometry without rewriting schedule state", () => {
  const closeSource = extractAssignment("closeDateModal", "saveDateModal");

  assert.match(closeSource, /task\.x = original\.x/);
  assert.match(closeSource, /task\.y = original\.y/);
  assert.doesNotMatch(closeSource, /targetAt/);
  assert.doesNotMatch(closeSource, /setTaskSchedule|setTaskDateFromInput/);
});
