import assert from "node:assert/strict";
import test from "node:test";

import { makeIcs } from "../src/core/ics.js";

function workspaceWith(tasks) {
  return {
    version: 1,
    activeTabId: "tab-1",
    tabs: [{
      id: "tab-1",
      name: "Main, Work",
      state: { tasks }
    }]
  };
}

function exportIcs(tasks) {
  return makeIcs(workspaceWith(tasks), {
    getTabName: tab => tab.name
  });
}

test("legacy-only tasks keep the current Cherry VTODO format", () => {
  const result = exportIcs({
    task1: {
      id: "task1",
      title: "Plan; ship, test\\again\nnext",
      targetAt: "2026-08-25",
      status: "todo"
    }
  });

  assert.equal(result, [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cherry//Cherry v0.1//EN",
    "BEGIN:VTODO",
    "UID:task1@cherry",
    "SUMMARY:Plan\\; ship\\, test\\\\again\\nnext",
    "CATEGORIES:Main\\, Work",
    "DUE;VALUE=DATE:20260825",
    "STATUS:NEEDS-ACTION",
    "END:VTODO",
    "END:VCALENDAR"
  ].join("\r\n"));
});

test("canonical none suppresses a stale legacy due date", () => {
  const result = exportIcs({
    task1: {
      id: "task1",
      title: "Undated",
      schedule: { type: "none", date: null, time: null },
      targetAt: "2026-08-25",
      status: "todo"
    }
  });

  assert.doesNotMatch(result, /DUE;VALUE=DATE:/);
});

test("canonical date wins over conflicting targetAt", () => {
  const result = exportIcs({
    task1: {
      id: "task1",
      title: "Canonical date",
      schedule: { type: "date", date: "2026-08-27", time: null },
      targetAt: "2026-08-25",
      status: "todo"
    }
  });

  assert.match(result, /DUE;VALUE=DATE:20260827/);
  assert.doesNotMatch(result, /20260825/);
});

test("datetime keeps current date-only VTODO due representation", () => {
  const result = exportIcs({
    task1: {
      id: "task1",
      title: "Timed task",
      schedule: { type: "datetime", date: "2026-08-28", time: "18:30" },
      targetAt: "2026-08-25",
      status: "done"
    }
  });

  assert.match(result, /DUE;VALUE=DATE:20260828/);
  assert.doesNotMatch(result, /1830|18:30/);
  assert.match(result, /STATUS:COMPLETED/);
});

test("invalid canonical schedule retains valid legacy fallback and export reads do not mutate input", () => {
  const workspace = workspaceWith({
    task1: {
      id: "task1",
      title: "Fallback",
      schedule: { type: "date", date: "not-a-date", time: null },
      targetAt: "2026-08-29",
      status: "todo",
      unknownField: { keep: true }
    }
  });
  const before = structuredClone(workspace);

  const result = makeIcs(workspace, { getTabName: tab => tab.name });

  assert.match(result, /DUE;VALUE=DATE:20260829/);
  assert.deepEqual(workspace, before);
});
