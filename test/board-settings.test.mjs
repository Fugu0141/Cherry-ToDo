import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  DEFAULT_BOARD_SETTINGS,
  makeDefaultBoardSettings,
  normalizeBoardSettings,
  normalizeBoardState,
  normalizeTabState
} from "../src/core/board-settings.js";
import {
  makeEmptyTabState,
  normalizeWorkspace,
  parseWorkspace,
  serializeWorkspace
} from "../src/core/workspace.js";

const cherryFileFormat = "cherry-workspace-encrypted";
const cherryFileVersion = 1;
const cherryKdfIterations = 250000;

function toBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

async function deriveCherryKey(passphrase, salt) {
  const material = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return webcrypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: cherryKdfIterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptCherryPayload(payload, passphrase) {
  const salt = Uint8Array.from({ length: 16 }, (_, index) => index + 1);
  const iv = Uint8Array.from({ length: 12 }, (_, index) => index + 17);
  const key = await deriveCherryKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = new Uint8Array(await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));

  return {
    format: cherryFileFormat,
    version: cherryFileVersion,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: cherryKdfIterations,
      salt: toBase64(salt)
    },
    cipher: { name: "AES-GCM", iv: toBase64(iv) },
    data: toBase64(ciphertext)
  };
}

async function decryptCherryPayload(fileData, passphrase) {
  assert.equal(fileData.format, cherryFileFormat);
  assert.equal(fileData.version, cherryFileVersion);
  assert.equal(fileData.kdf?.iterations, cherryKdfIterations);

  const salt = fromBase64(fileData.kdf.salt);
  const iv = fromBase64(fileData.cipher.iv);
  const ciphertext = fromBase64(fileData.data);
  const key = await deriveCherryKey(passphrase, salt);
  const plaintext = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

test("board settings defaults preserve the current board behavior", () => {
  const first = makeDefaultBoardSettings();
  const second = makeDefaultBoardSettings();

  assert.deepEqual(first, {
    showDateLanes: true,
    autoLayout: true,
    timeGuide: "auto"
  });
  assert.deepEqual(first, DEFAULT_BOARD_SETTINGS);
  assert.notStrictEqual(first, second);
});

test("legacy showLanes migrates without changing its value", () => {
  assert.deepEqual(normalizeBoardSettings(undefined, false), {
    showDateLanes: false,
    autoLayout: true,
    timeGuide: "auto"
  });

  const normalized = normalizeTabState({
    tasks: { task: { id: "task", x: 12, y: 34 } },
    showLanes: false,
    viewMode: "list"
  });

  assert.equal(normalized.showLanes, false);
  assert.equal(normalized.board.settings.showDateLanes, false);
  assert.deepEqual(normalized.tasks.task, { id: "task", x: 12, y: 34 });
  assert.equal(normalized.viewMode, "list");
});

test("representative quest-sticky-todo-v10 state loads additively and idempotently", () => {
  const storedState = JSON.stringify({
    tasks: {
      root: {
        id: "root",
        title: "Legacy root",
        parentId: null,
        x: 44,
        y: 55,
        targetAt: "2026-07-01",
        status: "todo",
        branchMode: null,
        unknownTaskData: { keep: true }
      }
    },
    links: [{ from: "root", to: "future-task", kind: "legacy" }],
    showLanes: false,
    viewMode: "list",
    listFilters: { status: "todo" },
    unknownStateData: { keep: "state" }
  });

  const original = JSON.parse(storedState);
  const normalized = normalizeTabState(original);
  const normalizedAgain = normalizeTabState(normalized);

  assert.equal(normalized.showLanes, false);
  assert.equal(normalized.board.settings.showDateLanes, false);
  assert.deepEqual(normalized.tasks, original.tasks);
  assert.deepEqual(normalized.links, original.links);
  assert.deepEqual(normalized.listFilters, original.listFilters);
  assert.deepEqual(normalized.unknownStateData, original.unknownStateData);
  assert.deepEqual(normalizedAgain, normalized);
});

test("legacy showLanes wins while current UI writers still use it", () => {
  const source = {
    tasks: {},
    showLanes: true,
    board: {
      positions: { task: { x: 8, y: 13 } },
      settings: {
        showDateLanes: false,
        autoLayout: false,
        timeGuide: "shown"
      }
    }
  };

  const normalized = normalizeTabState(source);

  assert.equal(normalized.showLanes, true);
  assert.deepEqual(normalized.board.settings, {
    showDateLanes: true,
    autoLayout: false,
    timeGuide: "shown"
  });
  assert.deepEqual(normalized.board.positions, source.board.positions);
  assert.deepEqual(source.board.settings, {
    showDateLanes: false,
    autoLayout: false,
    timeGuide: "shown"
  });
});

test("canonical settings are accepted when no legacy mirror exists", () => {
  const normalized = normalizeTabState({
    tasks: {},
    board: {
      settings: {
        showDateLanes: false,
        autoLayout: false,
        timeGuide: "hidden"
      }
    }
  });

  assert.equal(normalized.showLanes, false);
  assert.deepEqual(normalized.board.settings, {
    showDateLanes: false,
    autoLayout: false,
    timeGuide: "hidden"
  });
});

test("invalid settings fall back safely while unrelated board data survives", () => {
  const normalized = normalizeBoardState({
    viewport: { x: 1, y: 2, zoom: 0.75 },
    settings: {
      showDateLanes: "no",
      autoLayout: null,
      timeGuide: "sometimes",
      futureSetting: { keep: true }
    }
  }, false);

  assert.deepEqual(normalized, {
    viewport: { x: 1, y: 2, zoom: 0.75 },
    settings: {
      showDateLanes: false,
      autoLayout: true,
      timeGuide: "auto",
      futureSetting: { keep: true }
    }
  });
});

test("workspace normalization and serialization migrate old tab state additively", () => {
  const oldWorkspace = {
    version: 1,
    activeTabId: "tab-1",
    tabs: [{
      id: "tab-1",
      name: "Plan",
      state: {
        tasks: {
          task: {
            id: "task",
            title: "Keep me",
            parentId: null,
            x: 21,
            y: 34,
            targetAt: "2026-08-12"
          }
        },
        showLanes: false,
        viewMode: "board"
      },
      updatedAt: "2026-08-12T00:00:00.000Z"
    }],
    updatedAt: "2026-08-12T00:00:00.000Z"
  };

  const normalized = normalizeWorkspace(oldWorkspace);
  const roundTrip = parseWorkspace(serializeWorkspace(normalized));
  const state = roundTrip.tabs[0].state;

  assert.equal(state.showLanes, false);
  assert.deepEqual(state.board.settings, {
    showDateLanes: false,
    autoLayout: true,
    timeGuide: "auto"
  });
  assert.deepEqual(state.tasks.task, oldWorkspace.tabs[0].state.tasks.task);
  assert.equal(roundTrip.activeTabId, "tab-1");
});

test("workspace normalization preserves unknown workspace, tab, board, and view data", () => {
  const workspace = {
    version: 1,
    activeTabId: "tab-1",
    unknownWorkspaceData: { keep: "workspace" },
    tabs: [{
      id: "tab-1",
      name: "Plan",
      unknownTabData: { keep: "tab" },
      state: {
        tasks: { task: { id: "task", x: 3, y: 5, parentId: null } },
        showLanes: false,
        viewMode: "list",
        viewState: { selectedTaskId: "task", futureViewData: true },
        board: {
          positions: { task: { x: 8, y: 13 } },
          viewport: { x: 1, y: 2, zoom: 0.8 },
          unknownBoardData: { keep: "board" },
          settings: { futureSetting: { keep: "settings" } }
        }
      },
      updatedAt: "2026-08-12T00:00:00.000Z"
    }],
    updatedAt: "2026-08-12T00:00:00.000Z"
  };

  const normalized = normalizeWorkspace(workspace);
  const normalizedAgain = normalizeWorkspace(normalized);
  const serializedRoundTrip = parseWorkspace(serializeWorkspace(normalized));

  assert.deepEqual(normalized.unknownWorkspaceData, workspace.unknownWorkspaceData);
  assert.deepEqual(normalized.tabs[0].unknownTabData, workspace.tabs[0].unknownTabData);
  assert.deepEqual(normalized.tabs[0].state.tasks, workspace.tabs[0].state.tasks);
  assert.deepEqual(normalized.tabs[0].state.viewState, workspace.tabs[0].state.viewState);
  assert.deepEqual(normalized.tabs[0].state.board.positions, workspace.tabs[0].state.board.positions);
  assert.deepEqual(normalized.tabs[0].state.board.viewport, workspace.tabs[0].state.board.viewport);
  assert.deepEqual(normalized.tabs[0].state.board.unknownBoardData, workspace.tabs[0].state.board.unknownBoardData);
  assert.deepEqual(normalized.tabs[0].state.board.settings.futureSetting, { keep: "settings" });
  assert.deepEqual(normalizedAgain, normalized);
  assert.deepEqual(serializedRoundTrip, normalized);
});

test("pre-change encrypted Cherry workspace survives import-export normalization", async () => {
  const passphrase = "compatibility-test-passphrase";
  const oldWorkspace = {
    version: 1,
    activeTabId: "tab-legacy",
    unknownWorkspaceData: { keep: "encrypted-workspace" },
    tabs: [{
      id: "tab-legacy",
      name: "Legacy encrypted tab",
      unknownTabData: { keep: "encrypted-tab" },
      state: {
        tasks: {
          root: {
            id: "root",
            title: "Root",
            parentId: null,
            x: 21,
            y: 34,
            targetAt: "2026-06-30",
            status: "todo",
            branchMode: null
          },
          child: {
            id: "child",
            title: "Child",
            parentId: "root",
            x: 55,
            y: 89,
            targetAt: "2026-07-01",
            status: "done",
            branchMode: "same"
          }
        },
        links: [{ from: "root", to: "child", kind: "legacy" }],
        showLanes: false,
        viewMode: "list",
        listFilters: { status: "todo" },
        board: {
          positions: { root: { x: 21, y: 34 }, child: { x: 55, y: 89 } },
          unknownBoardData: { keep: "encrypted-board" }
        }
      },
      updatedAt: "2026-06-30T00:00:00.000Z"
    }],
    updatedAt: "2026-06-30T00:00:00.000Z"
  };
  const oldPayload = {
    format: "cherry-workspace",
    version: 1,
    exportedAt: "2026-06-30T00:00:00.000Z",
    workspace: oldWorkspace
  };

  const fixtureUrl = new URL("./fixtures/pre-change-workspace.cherry", import.meta.url);
  const oldFile = JSON.parse(await readFile(fixtureUrl, "utf8"));
  const importedPayload = await decryptCherryPayload(oldFile, passphrase);
  assert.deepEqual(importedPayload, oldPayload);
  const normalizedWorkspace = normalizeWorkspace(importedPayload.workspace);
  const exportedPayload = {
    format: "cherry-workspace",
    version: 1,
    exportedAt: "2026-08-12T00:00:00.000Z",
    workspace: normalizedWorkspace
  };
  const exportedFile = await encryptCherryPayload(exportedPayload, passphrase);
  const roundTripPayload = await decryptCherryPayload(exportedFile, passphrase);
  const roundTripWorkspace = normalizeWorkspace(roundTripPayload.workspace);

  assert.equal(roundTripPayload.format, "cherry-workspace");
  assert.equal(roundTripPayload.version, 1);
  assert.equal(roundTripWorkspace.tabs[0].state.showLanes, false);
  assert.equal(roundTripWorkspace.tabs[0].state.board.settings.showDateLanes, false);
  assert.deepEqual(roundTripWorkspace.tabs[0].state.tasks, oldWorkspace.tabs[0].state.tasks);
  assert.deepEqual(roundTripWorkspace.tabs[0].state.links, oldWorkspace.tabs[0].state.links);
  assert.deepEqual(roundTripWorkspace.tabs[0].state.listFilters, oldWorkspace.tabs[0].state.listFilters);
  assert.deepEqual(roundTripWorkspace.tabs[0].state.board.positions, oldWorkspace.tabs[0].state.board.positions);
  assert.deepEqual(roundTripWorkspace.tabs[0].state.board.unknownBoardData, oldWorkspace.tabs[0].state.board.unknownBoardData);
  assert.deepEqual(roundTripWorkspace.unknownWorkspaceData, oldWorkspace.unknownWorkspaceData);
  assert.deepEqual(roundTripWorkspace.tabs[0].unknownTabData, oldWorkspace.tabs[0].unknownTabData);
  assert.deepEqual(roundTripWorkspace, normalizedWorkspace);
});

test("new empty tabs contain both canonical settings and the legacy mirror", () => {
  const state = makeEmptyTabState();

  assert.equal(state.showLanes, true);
  assert.deepEqual(state.board.settings, DEFAULT_BOARD_SETTINGS);
  assert.deepEqual(state.tasks, {});
  assert.equal(state.viewMode, "board");
});
