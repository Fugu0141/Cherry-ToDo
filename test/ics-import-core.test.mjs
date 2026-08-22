import assert from "node:assert/strict";
import test from "node:test";

import { parseIcsTodos } from "../src/core/ics.js";

function calendar(...todos) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    ...todos,
    "END:VCALENDAR"
  ].join("\r\n");
}

function todo(...lines) {
  return ["BEGIN:VTODO", ...lines, "END:VTODO"].join("\r\n");
}

test("VTODO without DUE imports as canonical unscheduled", () => {
  const [task] = parseIcsTodos(calendar(todo(
    "SUMMARY:No date",
    "STATUS:NEEDS-ACTION"
  )));

  assert.deepEqual(task, {
    title: "No date",
    schedule: { type: "none", date: null, time: null },
    status: "todo"
  });
});

test("date-only DUE imports as a canonical date schedule", () => {
  const [task] = parseIcsTodos(calendar(todo(
    "SUMMARY:Dated task",
    "DUE;VALUE=DATE:20260830",
    "STATUS:NEEDS-ACTION"
  )));

  assert.deepEqual(task.schedule, {
    type: "date",
    date: "2026-08-30",
    time: null
  });
});

test("invalid date-only DUE does not manufacture a schedule", () => {
  const [task] = parseIcsTodos(calendar(todo(
    "SUMMARY:Bad date",
    "DUE;VALUE=DATE:20260230"
  )));

  assert.deepEqual(task.schedule, {
    type: "none",
    date: null,
    time: null
  });
});

test("ICS task status and escaped summary keep current Cherry semantics", () => {
  const tasks = parseIcsTodos(calendar(
    todo("SUMMARY:Done\\, task\\; line\\n2", "STATUS:COMPLETED"),
    todo("SUMMARY:Open task", "STATUS:NEEDS-ACTION")
  ));

  assert.equal(tasks[0].title, "Done, task; line\n2");
  assert.equal(tasks[0].status, "done");
  assert.equal(tasks[1].status, "todo");
});

test("missing SUMMARY keeps the existing numbered fallback", () => {
  const tasks = parseIcsTodos(calendar(
    todo("STATUS:NEEDS-ACTION"),
    todo("STATUS:COMPLETED")
  ));

  assert.equal(tasks[0].title, "Task 1");
  assert.equal(tasks[1].title, "Task 2");
});
