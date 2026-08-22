import assert from "node:assert/strict";
import test from "node:test";

import { makeIcs, makeTabFromIcs, parseIcsTodos } from "../src/core/ics.js";

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

test("Core builds the current one-tab ICS import shape with canonical schedules", () => {
  const ids = ["task-undated", "task-dated", "tab-imported"];
  const importedAt = "2026-08-23T01:10:00.000Z";
  const tab = makeTabFromIcs(calendar(
    todo("SUMMARY:No date", "STATUS:NEEDS-ACTION"),
    todo("SUMMARY:Dated", "DUE;VALUE=DATE:20260830", "STATUS:COMPLETED")
  ), "calendar.ics", {
    makeId: () => ids.shift(),
    now: () => importedAt
  });

  assert.equal(tab.id, "tab-imported");
  assert.equal(tab.name, "calendar");
  assert.equal(tab.systemNameKey, null);
  assert.equal(tab.updatedAt, importedAt);
  assert.equal(tab.state.showLanes, true);
  assert.equal(tab.state.viewMode, "board");

  assert.deepEqual(tab.state.tasks["task-undated"], {
    id: "task-undated",
    title: "No date",
    parentId: null,
    x: 0,
    y: 0,
    schedule: { type: "none", date: null, time: null },
    targetAt: null,
    status: "todo",
    branchMode: null
  });

  assert.deepEqual(tab.state.tasks["task-dated"], {
    id: "task-dated",
    title: "Dated",
    parentId: null,
    x: 0,
    y: 0,
    schedule: { type: "date", date: "2026-08-30", time: null },
    targetAt: "2026-08-30",
    status: "done",
    branchMode: null
  });
});

test("Core ICS tab construction keeps the legacy filename fallback", () => {
  const ids = ["tab-imported"];
  const tab = makeTabFromIcs(calendar(), "", {
    makeId: () => ids.shift(),
    now: () => "2026-08-23T01:10:00.000Z"
  });

  assert.equal(tab.name, "iCalendar");
  assert.deepEqual(tab.state.tasks, {});
});

test("canonical unscheduled survives Cherry ICS export and Core import", () => {
  const workspace = {
    version: 1,
    activeTabId: "tab-1",
    tabs: [{
      id: "tab-1",
      name: "Main",
      state: {
        tasks: {
          task1: {
            id: "task1",
            title: "Still undated",
            schedule: { type: "none", date: null, time: null },
            targetAt: "2026-08-25",
            status: "todo"
          }
        }
      }
    }]
  };

  const exported = makeIcs(workspace, { getTabName: tab => tab.name });
  const [imported] = parseIcsTodos(exported);

  assert.doesNotMatch(exported, /DUE(?:;VALUE=DATE)?:/);
  assert.deepEqual(imported.schedule, {
    type: "none",
    date: null,
    time: null
  });
});