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

function addLegacyImportedTab(model, { oneTaskOnly = false } = {}) {
  model.tabs.push({
    id: "imported",
    name: "calendar",
    state: {
      tasks: {
        legacyFirst: {
          id: "legacyFirst",
          title: "Legacy wrong title",
          parentId: "legacy-parent",
          x: 321,
          y: 654,
          targetAt: "2026-08-23",
          schedule: { type: "date", date: "2026-08-23", time: null },
          status: "done",
          branchMode: "same"
        },
        ...(oneTaskOnly ? {} : {
          legacySecond: {
            id: "legacySecond",
            title: "Legacy second",
            parentId: null,
            x: 50,
            y: 60,
            targetAt: "2026-08-30",
            schedule: { type: "date", date: "2026-08-30", time: null },
            status: "todo",
            branchMode: null
          }
        })
      },
      showLanes: false,
      viewMode: "list",
      legacyOnly: true
    }
  });
}

function assertImportedStateComesFromCore(harness) {
  const imported = harness.model.tabs.find(tab => tab.id === "imported");
  const tasks = Object.values(imported.state.tasks);

  assert.equal(tasks.length, 2);
  assert.equal(imported.state.showLanes, true);
  assert.equal(imported.state.viewMode, "board");
  assert.equal(imported.state.legacyOnly, undefined);

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

test("live ICS import replaces legacy parsed task state with Core-built state", async () => {
  const harness = makeHarness({
    nativeImport({ model }) {
      addLegacyImportedTab(model);
    }
  });

  const file = {
    name: "calendar.ics",
    async text() { return sampleIcs(); }
  };

  await harness.importers.get("workspace.cherry").run(file);

  assertImportedStateComesFromCore(harness);
  assert.equal(harness.getNativeImportCalls(), 1);
  assert.equal(harness.getUpdateCalls(), 1);
  assert.deepEqual(harness.warnings, []);
});

test("actual file input change event routes ICS task state through Core", async () => {
  const harness = makeHarness({
    nativeImport({ model }) {
      addLegacyImportedTab(model);
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

test("Core state routing does not depend on the legacy importer task count", async () => {
  const harness = makeHarness({
    nativeImport({ model }) {
      addLegacyImportedTab(model, { oneTaskOnly: true });
    }
  });

  await harness.importers.get("workspace.cherry").run({
    name: "calendar.ics",
    async text() { return sampleIcs(); }
  });

  assertImportedStateComesFromCore(harness);
  assert.equal(harness.getUpdateCalls(), 1);
  assert.deepEqual(harness.warnings, []);
});

test("native Cherry imports bypass Core ICS state routing", async () => {
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
  assert.equal(harness.getUpdateCalls(), 0);
  assert.equal(textCalls, 0);
});

test("Core state routing refuses ambiguous imported-tab identification", async () => {
  const harness = makeHarness({
    nativeImport({ model }) {
      addLegacyImportedTab(model);
      model.tabs.push({
        id: "unexpected-second-import",
        name: "Other",
        state: { tasks: {} }
      });
    }
  });

  await harness.importers.get("workspace.cherry").run({
    name: "calendar.ics",
    async text() { return sampleIcs(); }
  });

  const imported = harness.model.tabs.find(tab => tab.id === "imported");
  assert.equal(imported.state.legacyOnly, true);
  assert.equal(harness.getUpdateCalls(), 0);
  assert.equal(harness.warnings.length, 1);
});