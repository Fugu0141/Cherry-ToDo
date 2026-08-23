import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layoutSource = readFileSync(
  new URL("../src/app/schedule-layout-controller.js", import.meta.url),
  "utf8"
);
const scheduleSource = readFileSync(new URL("../schedule-model.js", import.meta.url), "utf8");
const storageSource = readFileSync(new URL("../state-storage.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("schedule layout controller loads after schedule semantics and before later layout/date wrappers", () => {
  const scheduleIndex = indexSource.indexOf("./schedule-model.js");
  const controllerIndex = indexSource.indexOf("./src/app/schedule-layout-controller.js");
  const dateGuardIndex = indexSource.indexOf("./src/features/date-modal-target-guard/implementation.js");
  const sameDayIndex = indexSource.indexOf("./src/features/same-day-layout/implementation.js");

  assert.ok(scheduleIndex >= 0);
  assert.ok(controllerIndex > scheduleIndex);
  assert.ok(dateGuardIndex > controllerIndex);
  assert.ok(sameDayIndex > controllerIndex);
});

test("base schedule layout reads canonical dates and keeps undated collision buckets independent", () => {
  assert.match(layoutSource, /window\.getTaskDate/);
  assert.match(layoutSource, /window\.taskSortDate/);
  assert.match(layoutSource, /CherryScheduleBridge\?\.collectLaneDates/);
  assert.match(layoutSource, /getTaskDate\(task\).*`none:\$\{task\.id\}`/s);

  assert.doesNotMatch(layoutSource, /task\.targetAt/);
  assert.doesNotMatch(layoutSource, /normalizeDate\(task\.targetAt\)/);
});

test("schedule model no longer owns persistence or layout replacement", () => {
  assert.doesNotMatch(scheduleSource, /baseSaveNow/);
  assert.doesNotMatch(scheduleSource, /saveNow\s*=\s*function/);
  assert.match(storageSource, /window\.cherrySchedule\?\.normalizeAllTasks/);

  for (const name of [
    "refreshLaneDates",
    "taskX",
    "taskY",
    "sortByDateThenTitle",
    "resolveTrackCollisions"
  ]) {
    assert.doesNotMatch(scheduleSource, new RegExp(`${name}\\s*=\\s*function`));
  }
});
