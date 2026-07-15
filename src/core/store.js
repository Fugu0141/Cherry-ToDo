export function createStore(initialState, { clone = structuredCloneSafe } = {}) {
  let state = clone(initialState);
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(nextState, meta = {}) {
    const previousState = state;
    state = typeof nextState === "function"
      ? nextState(previousState)
      : nextState;

    for (const listener of [...listeners]) {
      listener(state, previousState, meta);
    }

    return state;
  }

  function replaceState(nextState, meta = {}) {
    return setState(clone(nextState), meta);
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Store subscriber must be a function.");
    }

    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return Object.freeze({
    getState,
    setState,
    replaceState,
    subscribe
  });
}

export function createSelector(select) {
  if (typeof select !== "function") {
    throw new TypeError("Selector must be a function.");
  }

  return state => select(state);
}

export function selectTasks(state) {
  return state?.tasks && typeof state.tasks === "object" ? state.tasks : {};
}

export function selectTaskList(state) {
  return Object.values(selectTasks(state));
}

export function selectTaskById(state, taskId) {
  return selectTasks(state)[taskId] || null;
}

export function selectShowLanes(state) {
  return state?.showLanes !== false;
}

export function selectViewMode(state) {
  return state?.viewMode === "list" ? "list" : "board";
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export const storeCore = Object.freeze({
  createStore,
  createSelector,
  selectors: Object.freeze({
    tasks: selectTasks,
    taskList: selectTaskList,
    taskById: selectTaskById,
    showLanes: selectShowLanes,
    viewMode: selectViewMode
  })
});
