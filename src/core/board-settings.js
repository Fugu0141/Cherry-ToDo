export const TIME_GUIDE_MODES = Object.freeze(["auto", "shown", "hidden"]);

export const DEFAULT_BOARD_SETTINGS = Object.freeze({
  showDateLanes: true,
  autoLayout: true,
  timeGuide: "auto"
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function makeDefaultBoardSettings() {
  return { ...DEFAULT_BOARD_SETTINGS };
}

export function normalizeBoardSettings(candidate, legacyShowLanes) {
  const settings = isRecord(candidate) ? candidate : {};

  return {
    ...settings,
    // The current UI still writes showLanes directly. Keep that value first
    // during migration so normalization cannot undo a user's latest toggle.
    showDateLanes: typeof legacyShowLanes === "boolean"
      ? legacyShowLanes
      : typeof settings.showDateLanes === "boolean"
        ? settings.showDateLanes
        : DEFAULT_BOARD_SETTINGS.showDateLanes,
    autoLayout: typeof settings.autoLayout === "boolean"
      ? settings.autoLayout
      : DEFAULT_BOARD_SETTINGS.autoLayout,
    timeGuide: TIME_GUIDE_MODES.includes(settings.timeGuide)
      ? settings.timeGuide
      : DEFAULT_BOARD_SETTINGS.timeGuide
  };
}

export function normalizeBoardState(candidate, legacyShowLanes) {
  const board = isRecord(candidate) ? candidate : {};

  return {
    ...board,
    settings: normalizeBoardSettings(board.settings, legacyShowLanes)
  };
}

export function normalizeTabState(candidate) {
  const state = isRecord(candidate) ? candidate : {};
  const board = normalizeBoardState(state.board, state.showLanes);

  return {
    ...state,
    board,
    // Keep the legacy field authoritative for the current runtime until its
    // consumers migrate to board.settings.showDateLanes.
    showLanes: board.settings.showDateLanes
  };
}

export const boardSettingsModel = Object.freeze({
  defaults: DEFAULT_BOARD_SETTINGS,
  timeGuideModes: TIME_GUIDE_MODES,
  makeDefaultBoardSettings,
  normalizeBoardSettings,
  normalizeBoardState,
  normalizeTabState
});
