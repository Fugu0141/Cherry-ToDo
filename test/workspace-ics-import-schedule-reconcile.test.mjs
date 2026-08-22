import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

import { makeTabFromIcs } from "../src/core/ics.js";

const source = await readFile(
  new URL("../src/features/workspace-transfer/registration.js", import.meta.url),
  "utf8"
);

function makeRegistry() {
  const entries = new Map();
  return {
    has: key => entries.has(key),
    register(key, value) { entries.set(key, value); },
    get: key => entries.get(key) || null
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeHarness({ nativeImport } = {}) {
  const exporters = makeRegistry();
  const importers = makeRegistry();
  const listeners = new Map();
  const warnings = [];
  const nativeFiles = [];
  let nativeImportCalls = 0;
  let updateCalls = 0;

  const model = {
    version: 1,
    activeTabId: "existing",
    tabs: [{
      id: "existing",
      name: "Existing",
      state: { tasks: {} }
    }]
  };

  const workspace = {
    async importWorkspace(file) {
      nativeImportCalls += 1;
      nativeFiles.push(file);
      if (nativeImport) return nativeImport({ file, model });
    },
    exportWorkspace() {},
    getWorkspace() { return clone(model); },
    updateTabState(tabId, updater) {
      updateCalls += 1;
      const tab = model.tabs.find(item => item.id === tabId);
      if (tab) updater(tab.state);
    }
  };

  const window = {
    crypto: {
      getRandomValues(value) { return value; },
      subtle: {}
    },
    CherryI18n: { getLanguage: () => "ja" },
    CherryCore: {
      extensions: { exporters, importers },
      ics: { makeTabFromIcs }
    },
    cherryWorkspace: workspace
  };

  const document = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    querySelector() { return null; }
  };

  vm.runInNewContext(source, {
    window,
    document,
    console: {
      warn: message => warnings.push(message),
      error() {}
    },
    Promise,
    Set,
    Object,
    String
  });

  return {
    model,
    importers,
    listeners,
    warnings,
    nativeFiles,
    getNativeImportCalls: () => nativeImportCalls,
    getUpdateCalls: () => updateCalls
  };
}

function sampleIcs() {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VTODO",
    "UID:no-date@cherry",
    "SUMMARY:No date",
    "STATUS:NEEDS-ACTION",
    "END:VTODO",
    "BEGIN:VTODO",
    "UID:dated@cherry",
    "SUMMARY:Dated",
    "DUE;VALUE=DATE:20260830",
    "STATUS:COMPLETED",
    "END:VTODO",
    "END:VCALENDAR"
  ].join("\r\n");
}

function addLegacyShellTab(model, id = "imported") {
  model.tabs.push({
    id,
    name: "calendar",
    state: {
      tasks: {},
      showLanes: true,
      viewMode: "board"
    }
  });
}

async function assertTaskFreeLegacyShell(file) {
  const text = await file.text();
  assert.match(text, /BEGIN:VCALENDAR/i);
  assert.match(text, /END:VCALENDAR/i);
  assert.doesNotMatch(text, /BEGIN:VTODO/i);
  assert.doesNotMatch(text, /SUMMARY:/i);
  assert.doesNotMatch(text, /DUE(?:;VALUE=DATE)?:/i);
}

function assertImportedStateComesFromCore(harness) {
  const imported = harness.model.tabs.find(tab => tab.id === "imported");
  const tasks = Object.values(imported.state.tasks);

  assert.equal(tasks.length, 2);
  assert.equal(imported.state.showLanes, true);
  assert.equal(imported.state.viewMode, "board");

  const undated = tasks.find(task => task.title === "No date");
  const dated = tasks.find(task => task.title === "Dated");

  assert.ok(undated);
  assert.deepEqual(clone(undated.schedule), {
    type: "none",
    date: null,
    time: null
  });
  assert.equal(undated.targetAt, null);
  assert.equal(undated.parentId, null);
  assert.equal(undated.x, 0);
  assert.equal(undated.y, 0);
  assert.equal(undated.status, "todo");
  assert.equal(undated.branchMode, null);

  assert.ok(dated);
  assert.deepEqual(clone(dated.schedule), {
    type: "date",
    date: "2026-08-30",
    time: null
  });
  assert.equal(dated.targetAt, "2026-08-30");
  assert.equal(dated.parentId, null);
  assert.equal(dated.x, 0);
  assert.equal(dated.y, 0);
  assert.equal(dated.status, "done");
  assert.equal(dated.branchMode, null);
}

test("live ICS import keeps the legacy shell task-free and installs Core-built state", async () => {
  let sourceTextCalls = 0;
  const harness = makeHarness({
    async nativeImport({ file, model }) {
      await assertTaskFreeLegacyShell(file);
      addLegacyShellTab(model);
    }
  });

  const file = {
    name: "calendar.ics",
    async text() {
      sourceTextCalls += 1;
      return sampleIcs();
    }
  };

  await harness.importers.get("workspace.cherry").run(file);

  assertImportedStateComesFromCore(harness);
  assert.equal(sourceTextCalls, 1);
  assert.equal(harness.getNativeImportCalls(), 1);
  assert.notEqual(harness.nativeFiles[0], file);
  assert.equal(harness.getUpdateCalls(), 1);
  assert.deepEqual(harness.warnings, []);
});

test("actual file input change routes ICS through Core without exposing VTODOs to the legacy shell", async () => {
  const harness = makeHarness({
    async nativeImport({ file, model }) {
      await assertTaskFreeLegacyShell(file);
      addLegacyShellTab(model);
    }
  });

  const file = {
    name: "calendar.ics",
    async text() { return sampleIcs(); }
  };
  const input = {
    type: "file",
    accept: ".cherry,.ics,text/calendar,application/json",
    files: [file],
    value: "calendar.ics"
  };
  let stopped = false;

  harness.listeners.get("change")({
    target: input,
    stopPropagation() { stopped = true; }
  });

  await new Promise(resolve => setImmediate(resolve));

  assert.equal(stopped, true);
  assert.equal(input.value, "");
  assertImportedStateComesFromCore(harness);
  assert.equal(harness.getNativeImportCalls(), 1);
  assert.equal(harness.getUpdateCalls(), 1);
  assert.deepEqual(harness.warnings, []);
});

test("native Cherry imports bypass Core ICS shell routing", async () => {
  const harness = makeHarness();
  let textCalls = 0;
  const file = {
    name: "backup.cherry",
    async text() {
      textCalls += 1;
      throw new Error("registration should not read native Cherry files");
    }
  };

  await harness.importers.get("workspace.cherry").run(file);

  assert.equal(harness.getNativeImportCalls(), 1);
  assert.equal(harness.nativeFiles[0], file);
  assert.equal(harness.getUpdateCalls(), 0);
  assert.equal(textCalls, 0);
});

test("Core state routing still refuses ambiguous imported-tab identification", async () => {
  const harness = makeHarness({
    async nativeImport({ file, model }) {
      await assertTaskFreeLegacyShell(file);
      addLegacyShellTab(model);
      addLegacyShellTab(model, "unexpected-second-import");
    }
  });

  await harness.importers.get("workspace.cherry").run({
    name: "calendar.ics",
    async text() { return sampleIcs(); }
  });

  const imported = harness.model.tabs.find(tab => tab.id === "imported");
  assert.deepEqual(imported.state.tasks, {});
  assert.equal(harness.getUpdateCalls(), 0);
  assert.equal(harness.warnings.length, 1);
});