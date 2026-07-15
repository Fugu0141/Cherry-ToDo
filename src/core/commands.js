function assertCommandName(name) {
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError("Command name must be a non-empty string.");
  }
  return name.trim();
}

function createHistory(limit = 80) {
  const past = [];
  const future = [];
  const maxEntries = Math.max(1, Number(limit) || 80);

  return {
    push(entry) {
      past.push(entry);
      if (past.length > maxEntries) past.shift();
      future.length = 0;
    },
    popUndo() {
      const entry = past.pop() || null;
      if (entry) future.push(entry);
      return entry;
    },
    popRedo() {
      const entry = future.pop() || null;
      if (entry) past.push(entry);
      return entry;
    },
    clear() {
      past.length = 0;
      future.length = 0;
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
    snapshot() {
      return {
        undoCount: past.length,
        redoCount: future.length
      };
    }
  };
}

export function createCommandRegistry() {
  const handlers = new Map();

  return Object.freeze({
    register(name, handler) {
      const commandName = assertCommandName(name);
      if (typeof handler !== "function") {
        throw new TypeError(`Command handler for ${commandName} must be a function.`);
      }
      if (handlers.has(commandName)) {
        throw new Error(`Command already registered: ${commandName}`);
      }
      handlers.set(commandName, handler);
      return () => handlers.delete(commandName);
    },
    has(name) {
      return handlers.has(name);
    },
    get(name) {
      return handlers.get(name) || null;
    },
    list() {
      return [...handlers.keys()];
    }
  });
}

export function createCommandDispatcher({ registry = createCommandRegistry(), historyLimit = 80 } = {}) {
  const history = createHistory(historyLimit);

  async function dispatch(name, payload, context = {}) {
    const commandName = assertCommandName(name);
    const handler = registry.get(commandName);
    if (!handler) throw new Error(`Unknown command: ${commandName}`);

    const result = await handler(payload, context);
    if (result?.undo && typeof result.undo === "function") {
      history.push({
        name: commandName,
        undo: result.undo,
        redo: typeof result.redo === "function" ? result.redo : null,
        meta: result.meta || null
      });
    }
    return result;
  }

  async function undo(context = {}) {
    const entry = history.popUndo();
    if (!entry) return false;
    await entry.undo(context);
    return true;
  }

  async function redo(context = {}) {
    const entry = history.popRedo();
    if (!entry) return false;
    if (entry.redo) await entry.redo(context);
    return true;
  }

  return Object.freeze({
    registry,
    dispatch,
    undo,
    redo,
    clearHistory: history.clear,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    getHistoryState: history.snapshot
  });
}

export const commandCore = Object.freeze({
  createCommandRegistry,
  createCommandDispatcher
});
