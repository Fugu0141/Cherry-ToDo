import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const finalFixSource = readFileSync(new URL("../final-fix.js", import.meta.url), "utf8");
const sameDayLayoutSource = readFileSync(
  new URL("../src/features/same-day-layout/implementation.js", import.meta.url),
  "utf8"
);
const uxPolishSource = readFileSync(
  new URL("../src/features/ux-polish/styles.css", import.meta.url),
  "utf8"
);

test("completed-date collapse state is exported before same-day layout overrides lane rendering", () => {
  const finalFixIndex = indexSource.indexOf("./final-fix.js");
  const sameDayLayoutIndex = indexSource.indexOf("./src/features/same-day-layout/implementation.js");

  assert.notEqual(finalFixIndex, -1);
  assert.notEqual(sameDayLayoutIndex, -1);
  assert.ok(finalFixIndex < sameDayLayoutIndex, "collapse bridge must load before same-day layout");

  assert.match(finalFixSource, /window\.CherryCompletedDateCollapse = Object\.freeze\(/);
  assert.match(finalFixSource, /getState: dateCollapseState/);
  assert.match(finalFixSource, /toggleDate: toggleDoneDate/);
});

test("final-fix no longer owns create-modal schedule correction", () => {
  assert.doesNotMatch(finalFixSource, /originalOpenCreateTaskModal/);
  assert.doesNotMatch(finalFixSource, /openCreateTaskModal\s*=/);
  assert.doesNotMatch(finalFixSource, /\btargetAt\b/);
});

test("same-day layout keeps the completed-date expand/collapse affordance after overriding renderLanes", () => {
  const renderStart = sameDayLayoutSource.indexOf("renderLanes = function() {");
  const renderEnd = sameDayLayoutSource.indexOf("resolveTrackCollisions = function() {");
  const renderSource = sameDayLayoutSource.slice(renderStart, renderEnd);

  assert.notEqual(renderStart, -1);
  assert.notEqual(renderEnd, -1);
  assert.match(renderSource, /const completedState = completedDateState\(date\)/);
  assert.match(renderSource, /completeDate/);
  assert.match(renderSource, /collapsedDate/);
  assert.match(renderSource, /laneMonthTitle/);
  assert.match(renderSource, /laneDay/);
  assert.match(renderSource, /laneStatus/);
  assert.match(renderSource, /完了 \$\{count\}/);
  assert.match(renderSource, /クリックで完了タスクを展開/);
  assert.match(renderSource, /クリックで完了タスクを折り畳み/);
  assert.match(renderSource, /label\.addEventListener\("click"/);
  assert.match(renderSource, /toggleCompletedDate\(date\)/);
});

test("lane labels only show the month at a real month boundary whether collapsed or expanded", () => {
  const renderStart = sameDayLayoutSource.indexOf("renderLanes = function() {");
  const renderEnd = sameDayLayoutSource.indexOf("resolveTrackCollisions = function() {");
  const renderSource = sameDayLayoutSource.slice(renderStart, renderEnd);
  const labelStart = renderSource.indexOf("label.innerHTML = collapsed");
  const labelEnd = renderSource.indexOf("if (collapsible)");
  const labelSource = renderSource.slice(labelStart, labelEnd);

  // 8/22 -> 8/23 must keep Aug on 8/22 only in both expanded and collapsed states.
  // 8/31 -> 9/1 must show Sep because the month actually changed.
  assert.match(renderSource, /const isMonthStart = index === 0 \|\| !sameMonth\(prev, date\)/);
  assert.match(labelSource, /label\.innerHTML = collapsed\s*\? isMonthStart/);
  assert.match(labelSource, /laneMonthTitle/);
  assert.match(labelSource, /: `<div class="laneDay">\$\{parts\.day\}<\/div><div class="laneStatus">完了 \$\{count\}<\/div>`/);
  assert.match(
    labelSource,
    /: isMonthStart\s*\? `<div class="laneMonthMarker">\$\{parts\.monthName\}<\/div><div class="laneDay">\$\{parts\.day\}<\/div>`\s*: `<div class="laneDay">\$\{parts\.day\}<\/div>`;/
  );
  assert.doesNotMatch(labelSource, /<div class="laneMonth">\$\{parts\.monthName\}<\/div>/);
});

test("collapsed completed dates use compact same-day lane metrics in both orientations", () => {
  assert.match(
    sameDayLayoutSource,
    /function sameDayLaneWidth\(date, maxColumn\)[\s\S]*?if \(state\?\.collapsed\) return state\.horizontalSpan;/
  );
  assert.match(
    sameDayLayoutSource,
    /function sameDayLaneHeight\(date, maxColumn\)[\s\S]*?if \(state\?\.collapsed\) return state\.verticalSpan;/
  );
  assert.match(
    sameDayLayoutSource,
    /map\(date => `\$\{date\}:\$\{completedDateState\(date\)\?\.collapsed \? 1 : 0\}`\)/
  );
});

test("collapsed completed-date labels keep their date readable in light and dark themes", () => {
  const collapsedStart = uxPolishSource.indexOf(".laneLabel.collapsedDate {");
  const collapsedEnd = uxPolishSource.indexOf(".laneLine.pastLane");
  const collapsedStyles = uxPolishSource.slice(collapsedStart, collapsedEnd);

  assert.notEqual(collapsedStart, -1);
  assert.notEqual(collapsedEnd, -1);
  assert.match(collapsedStyles, /background: var\(--lane-label-bg,/);
  assert.match(collapsedStyles, /color: var\(--ink,/);
  assert.match(collapsedStyles, /\.laneLabel\.collapsedDate \.laneMonthTitle/);
  assert.match(collapsedStyles, /\.laneLabel\.collapsedDate \.laneDay/);
  assert.match(collapsedStyles, /\.laneLabel\.collapsedDate \.laneStatus/);
});

test("collapse presentation and same-day layout share Core-aware date state", () => {
  assert.match(finalFixSource, /function dateCollapseState\(date\)/);
  assert.match(finalFixSource, /const tasks = tasksOnDate\(normalized\)/);
  assert.match(finalFixSource, /function isTaskCollapsed\(task\)/);
  assert.match(finalFixSource, /const date = taskDate\(task\)/);
  assert.match(sameDayLayoutSource, /CherryCompletedDateCollapse\?\.getState/);

  assert.match(sameDayLayoutSource, /function taskLayoutDate\(task\)/);
  assert.match(sameDayLayoutSource, /CherryScheduleBridge\?\.getTaskDate/);
  assert.match(sameDayLayoutSource, /hDateToX\(taskLayoutDate\(task\)\)/);
  assert.match(sameDayLayoutSource, /taskLayoutDate\(a\)\.localeCompare\(taskLayoutDate\(b\)\)/);
  assert.doesNotMatch(sameDayLayoutSource, /hDateToX\(task\.targetAt\)/);
  assert.doesNotMatch(sameDayLayoutSource, /normalizeDate\(a\.targetAt\)/);
});
