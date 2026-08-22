import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

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

function makeHarness({ nativeImport } = {}) {
  const exporters = makeRegistry();
  const importers = makeRegistry();
  const listeners = new Map();
  const nativeArgs = [];

  const workspace = {
    async importWorkspace(...args) {
      nativeArgs.push(args);
      return nativeImport ? nativeImport(...args) : "native-import-result";
    },
    exportWorkspace() {}
  };

  const window = {
    crypto: {
      getRandomValues(value) { return value; },
      subtle: {}
    },
    CherryI18n: { getLanguage: () => "ja" },
    CherryCore: {
      extensions: { exporters, importers }
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
    console: { warn() {}, error() {} },
    Promise,
    String
  });

  return {
    importers,
    listeners,
    nativeArgs
  };
}

test("workspace importer registry delegates directly to the native Core-aware importer", async () => {
  const harness = makeHarness();
  let textCalls = 0;
  const file = {
    name: "calendar.ics",
    async text() {
      textCalls += 1;
      throw new Error("registration must not pre-read ICS files");
    }
  };

  const result = await harness.importers.get("workspace.cherry").run(file, "extra-arg");

  assert.equal(result, "native-import-result");
  assert.equal(harness.nativeArgs.length, 1);
  assert.equal(harness.nativeArgs[0][0], file);
  assert.equal(harness.nativeArgs[0][1], "extra-arg");
  assert.equal(textCalls, 0);
});

test("actual file input change passes the original ICS file straight through", async () => {
  const harness = makeHarness();
  let textCalls = 0;
  const file = {
    name: "calendar.ics",
    async text() {
      textCalls += 1;
      throw new Error("registration must leave ICS parsing to tab-manager/Core");
    }
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
  assert.equal(harness.nativeArgs.length, 1);
  assert.equal(harness.nativeArgs[0][0], file);
  assert.equal(textCalls, 0);
});

test("encrypted Cherry files use the same direct native import boundary", async () => {
  const harness = makeHarness();
  let textCalls = 0;
  const file = {
    name: "backup.cherry",
    async text() {
      textCalls += 1;
      throw new Error("registration must not read encrypted Cherry files");
    }
  };

  await harness.importers.get("workspace.cherry").run(file);

  assert.equal(harness.nativeArgs.length, 1);
  assert.equal(harness.nativeArgs[0][0], file);
  assert.equal(textCalls, 0);
});

test("workspace transfer registration no longer owns ICS parsing or reconciliation", () => {
  assert.doesNotMatch(source, /emptyIcsShell/);
  assert.doesNotMatch(source, /makeLegacyIcsShellFile/);
  assert.doesNotMatch(source, /importWorkspaceWithCoreIcs/);
  assert.doesNotMatch(source, /replaceTabState/);
  assert.doesNotMatch(source, /makeTabFromIcs/);
  assert.doesNotMatch(source, /getWorkspace\?\./);
  assert.doesNotMatch(source, /updateTabState\?\./);
  assert.doesNotMatch(source, /BEGIN:VCALENDAR/);
  assert.match(source, /run: \(\.\.\.args\) => workspace\.importWorkspace\?\.\(\.\.\.args\)/);
});