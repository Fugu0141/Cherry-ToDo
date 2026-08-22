import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/features/workspace-transfer/registration.js", import.meta.url), "utf8");

function makeRegistry() {
  const entries = new Map();
  return {
    has: key => entries.has(key),
    register(key, value) { entries.set(key, value); },
    get: key => entries.get(key) || null
  };
}

function runRegistration({ subtle = {}, language = "ja" } = {}) {
  const listeners = new Map();
  const status = { textContent: "" };
  const exporters = makeRegistry();
  const importers = makeRegistry();
  let exportCalls = 0;

  const window = {
    crypto: {
      getRandomValues(value) { return value; },
      subtle
    },
    CherryI18n: { getLanguage: () => language },
    CherryCore: { extensions: { exporters, importers } },
    cherryWorkspace: {
      exportWorkspace() { exportCalls += 1; },
      importWorkspace() {}
    }
  };

  const document = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    querySelector(selector) {
      return selector === "#startPage .startPageStatus" ? status : null;
    }
  };

  const consoleMessages = [];
  vm.runInNewContext(source, {
    window,
    document,
    console: { warn: message => consoleMessages.push(message), error() {} },
    Promise
  });

  return { listeners, status, exporters, importers, getExportCalls: () => exportCalls, consoleMessages };
}

function exportClickEvent() {
  let prevented = false;
  let stopped = false;
  return {
    target: { closest: selector => selector === "#startPage [data-action='export']" ? {} : null },
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; },
    get prevented() { return prevented; },
    get stopped() { return stopped; }
  };
}

test("encrypted export is blocked with a clear explanation when Web Crypto subtle is unavailable", () => {
  const harness = runRegistration({ subtle: null, language: "ja" });
  const event = exportClickEvent();

  harness.listeners.get("click")(event);

  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
  assert.equal(harness.getExportCalls(), 0);
  assert.match(harness.status.textContent, /HTTPS|localhost/);
  assert.match(harness.status.textContent, /192\.168/);
  assert.equal(harness.consoleMessages.length, 1);
});

test("secure environments keep routing export through the registered workspace exporter", async () => {
  const harness = runRegistration({ subtle: {} });
  const event = exportClickEvent();

  harness.listeners.get("click")(event);
  await Promise.resolve();

  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
  assert.equal(harness.getExportCalls(), 1);
});

test("workspace transfer import/export registrations remain available", () => {
  const harness = runRegistration({ subtle: {} });

  assert.equal(harness.exporters.has("workspace.cherry"), true);
  assert.equal(harness.importers.has("workspace.cherry"), true);
});