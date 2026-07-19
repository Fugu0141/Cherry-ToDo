(() => {
  if (window.CherryStateRuntime) return;

  const clone = value => JSON.parse(JSON.stringify(value));

  function safeState() {
    return typeof state === "object" && state ? state : { tasks: {}, showLanes: true, viewMode: "board" };
  }

  function refreshLegacyApp(nextState) {
    state = clone(nextState);
    if (typeof branchLayout === "function") branchLayout();
    if (typeof requestRender === "function") requestRender();
    if (typeof scheduleSave === "function") scheduleSave();
    return state;
  }

  window.CherryLegacyCore?.withCore(core => {
    const runtime = core.runtime;
    const store = runtime?.store;
    const commands = runtime?.commands;
    const events = runtime?.events;
    if (!store || !commands || !events) return;

    function publishState(nextState, metadata = {}) {
      const applied = refreshLegacyApp(nextState);
      store.replaceState(applied, metadata);
      events.emit("state:changed", clone(applied), metadata);
      return applied;
    }

    function registerCommand(name, handler) {
      if (!commands.registry.has(name)) commands.registry.register(name, handler);
    }

    registerCommand("state.replace", nextState => {
      const previous = clone(safeState());
      const next = clone(nextState);
      publishState(next, { source: "command", command: "state.replace" });
      return {
        undo: () => publishState(previous, { source: "undo", command: "state.replace" }),
        redo: () => publishState(next, { source: "redo", command: "state.replace" })
      };
    });

    registerCommand("state.update", updater => {
      if (typeof updater !== "function") {
        throw new TypeError("state.update requires an updater function.");
      }
      const previous = clone(safeState());
      const updated = updater(clone(previous));
      const next = clone(updated == null ? previous : updated);
      publishState(next, { source: "command", command: "state.update" });
      return {
        undo: () => publishState(previous, { source: "undo", command: "state.update" }),
        redo: () => publishState(next, { source: "redo", command: "state.update" })
      };
    });

    store.replaceState(safeState(), { source: "legacy-initial-state" });

    events.on("storage:set", event => {
      const taskStateKey = window.CherryWorkDataStorage?.keys?.taskState;
      if (event.detail?.key !== taskStateKey || typeof event.detail.value !== "string") return;
      try {
        store.replaceState(JSON.parse(event.detail.value), { source: "storage:set" });
      } catch (_) {
        // Storage owns malformed-data handling; the runtime mirror stays unchanged.
      }
    });

    window.addEventListener("cherry-workspace-updated", event => {
      const workspace = event.detail;
      const active = workspace?.tabs?.find(tab => tab.id === workspace.activeTabId);
      if (active?.state) store.replaceState(active.state, { source: "workspace" });
    });

    window.CherryStateRuntime = Object.freeze({
      store,
      commands,
      events,
      replace: nextState => commands.dispatch("state.replace", nextState),
      update: updater => commands.dispatch("state.update", updater),
      undo: () => commands.undo(),
      redo: () => commands.redo(),
      getState: store.getState,
      subscribe: store.subscribe
    });

    events.emit("state-runtime:ready", {
      commands: commands.registry.list()
    });
  });
})();
