import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

import { parseIcsTodos } from "../src/core/ics.js";

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
      ics: { parseIcsTodos }
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

test("live ICS import reconciles legacy today fallback back to canonical schedules", async () => {
  const harness = makeHarness({
    nativeImport({ model }) {
      // Reproduce the current legacy tab-manager importer: VTODO without DUE
      // receives today's date before workspace normalization.
      model.tabs.push({
        id: "imported",
        name: "calendar",
        state: {
          tasks: {
            first: {
              id: "first",
              title: "No date",
              targetAt: "2026-08-23",
              schedule: { type: "date", date: "2026-08-23", time: null },
              status: "todo"
            },
            second: {
              id: "second",
              title: "Dated",
              targetAt: "2026-08-30",
              schedule: { type: "date", date: "2026-08-30", time: null },
              status: "done"
            }
          }
        }
      });
    }
  });

  const file = {
    name: "calendar.ics",
    async text() { return sampleIcs(); }
  };

  await harness.importers.get("workspace.cherry").run(file);

  const imported = harness.model.tabs.find(tab => tab.id === "imported");
  const [undated, dated] = Object.values(imported.state.tasks);

  assert.deepEqual(clone(undated.schedule), {
    type: "none",
    date: null,
    time: null
  });
  assert.equal(undated.targetAt, null);

  assert.deepEqual(clone(dated.schedule), {
    type: "date",
    date: "2026-08-30",
    time: null
  });
  assert.equal(dated.targetAt, "2026-08-30");

  assert.equal(harness.getNativeImportCalls(), 1);
  assert.equal(harness.getUpdateCalls(), 1);
  assert.deepEqual(harness.warnings, []);
});

test("native Cherry imports bypass ICS schedule reconciliation", async () => {
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

test("ICS reconciliation refuses partial remapping when task counts do not match", async () => {
  const harness = makeHarness({
    nativeImport({ model }) {
      model.tabs.push({
        id: "imported",
        name: "calendar",
        state: {
          tasks: {
            only: {
              id: "only",
              title: "No date",
              targetAt: "2026-08-23",
              schedule: { type: "date", date: "2026-08-23", time: null },
              status: "todo"
            }
          }
        }
      });
    }
  });

  await harness.importers.get("workspace.cherry").run({
    name: "calendar.ics",
    async text() { return sampleIcs(); }
  });

  const imported = harness.model.tabs.find(tab => tab.id === "imported");
  assert.equal(imported.state.tasks.only.targetAt, "2026-08-23");
  assert.deepEqual(clone(imported.state.tasks.only.schedule), {
    type: "date",
    date: "2026-08-23",
    time: null
  });
  assert.equal(harness.getUpdateCalls(), 0);
  assert.equal(harness.warnings.length, 1);
});