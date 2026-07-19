function assertCommandName(name) {
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError("Command name must be a non-empty string.");
  }
  return name.trim();
}

function createHistory(limit = 80) {
  const past = [];
  const future = [];
  const listeners = new Set();
  const maxEntries = Math.max(1, Number(limit) || 80);

  function redoableEntries() {
    return future.filter(entry => typeof entry?.redo === "function");
  }

  function snapshot() {
    const undoEntry = past[past.length - 1] || null;
    const redoEntry = [...future].reverse().find(entry => typeof entry?.redo === "function") || null;
    return Object.freeze({
      undoCount: past.length,
      redoCount: redoableEntries().length,
      nextUndoName: undoEntry?.name || null,
      nextRedoName: redoEntry?.name || null
    });
  }

  function notify(reason) {
    const state = snapshot();
    for (const listener of [...listeners]) listener(state, reason);
    return state;
  }

  return Object.freeze({
    push(entry) {
      past.push(entry);
      if (past.length > maxEntries) past.shift();
      future.length = 0;
      notify("push");
    },
    popUndo() {
      const entry = past.pop() || null;
      if (entry) {
        future.push(entry);
        notify("undo");
      }
      return entry;
    },
    rollbackUndo(entry) {
      if (future[future.length - 1] !== entry) return false;
      future.pop();
      past.push(entry);
      notify("undo-rollback");
      return true;
    },
    popRedo() {
      while (future.length) {
        const entry = future.pop();
        if (typeof entry?.redo !== "function") continue;
        past.push(entry);
        notify("redo");
        return entry;
      }
      return null;
    },
    rollbackRedo(entry) {
      if (past[past.length - 1] !== entry) return false;
      past.pop();
      future.push(entry);
      notify("redo-rollback");
      return true;
    },
    clear() {
      past.length = 0;
      future.length = 0;
      notify("clear");
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return redoableEntries().length > 0;
    },
    snapshot,
    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("History subscriber must be a function.");
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  });
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

      const entry = Object.freeze({ handler });
      handlers.set(commandName, entry);

      return () => {
        if (handlers.get(commandName) !== entry) return false;
        return handlers.delete(commandName);
      };
    },
    has(name) {
      return handlers.has(assertCommandName(name));
    },
    get(name) {
      return handlers.get(assertCommandName(name))?.handler || null;
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

  async function dispatchMany(commands, context = {}) {
    if (!Array.isArray(commands)) {
      throw new TypeError("Command batch must be an array.");
    }

    const results = [];
    for (const command of commands) {
      if (!command || typeof command !== "object") {
        throw new TypeError("Each command batch entry must be an object.");
      }
      results.push(await dispatch(command.name, command.payload, command.context || context));
    }
    return results;
  }

  async function undo(context = {}) {
    const entry = history.popUndo();
    if (!entry) return false;

    try {
      await entry.undo(context);
      return true;
    } catch (error) {
      history.rollbackUndo(entry);
      throw error;
    }
  }

  async function redo(context = {}) {
    const entry = history.popRedo();
    if (!entry) return false;

    try {
      await entry.redo(context);
      return true;
    } catch (error) {
      history.rollbackRedo(entry);
      throw error;
    }
  }

  return Object.freeze({
    registry,
    dispatch,
    dispatchMany,
    undo,
    redo,
    clearHistory: history.clear,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    getHistoryState: history.snapshot,
    subscribeHistory: history.subscribe
  });
}

export const commandCore = Object.freeze({
  createCommandRegistry,
  createCommandDispatcher
});
