import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../tab-manager.js", import.meta.url), "utf8");

function extract(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing ${startMarker}`);
  assert.notEqual(end, -1, `missing ${endMarker}`);
  return source.slice(start, end);
}

test("tab manager delegates ICS tab construction to Core", () => {
  const importSource = extract("async function importWorkspace(file)", "async function makeIcs(sourceWorkspace)");
  const factorySource = extract("async function makeTabFromIcs(text, filename)", "function updateTabState");

  assert.match(importSource, /tabs: \[await makeTabFromIcs\(text, file\.name\)\]/);
  assert.match(factorySource, /CherryLegacyCore\?\.ready/);
  assert.match(factorySource, /core\?\.ics\?\.makeTabFromIcs/);
  assert.match(factorySource, /makeTab\(text, filename, \{ makeId, now \}\)/);

  assert.doesNotMatch(factorySource, /split\(\/BEGIN:VTODO/);
  assert.doesNotMatch(factorySource, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/);
  assert.doesNotMatch(factorySource, /STATUS:COMPLETED/);
});

test("tab manager delegates live ICS export to Core", () => {
  const exportSource = extract("async function exportWorkspace()", "async function askImportMode()");
  const exporterSource = extract("async function makeIcs(sourceWorkspace)", "async function makeTabFromIcs(text, filename)");

  assert.match(exportSource, /await makeIcs\(workspace\)/);
  assert.match(exporterSource, /CherryLegacyCore\?\.ready/);
  assert.match(exporterSource, /core\?\.ics\?\.makeIcs/);
  assert.match(exporterSource, /exportIcs\(sourceWorkspace, \{ getTabName: tabDisplayName \}\)/);

  assert.doesNotMatch(exporterSource, /task\.targetAt/);
  assert.doesNotMatch(exporterSource, /BEGIN:VTODO/);
  assert.doesNotMatch(exporterSource, /DUE;VALUE=DATE/);
  assert.doesNotMatch(source, /function escapeIcs\(/);
});
