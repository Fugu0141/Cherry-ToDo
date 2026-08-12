import test from "node:test";
import assert from "node:assert/strict";

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
      timeGuide: "sometimes"
    }
  }, false);

  assert.deepEqual(normalized, {
    viewport: { x: 1, y: 2, zoom: 0.75 },
    settings: {
      showDateLanes: false,
      autoLayout: true,
      timeGuide: "auto"
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

test("new empty tabs contain both canonical settings and the legacy mirror", () => {
  const state = makeEmptyTabState();

  assert.equal(state.showLanes, true);
  assert.deepEqual(state.board.settings, DEFAULT_BOARD_SETTINGS);
  assert.deepEqual(state.tasks, {});
  assert.equal(state.viewMode, "board");
});
