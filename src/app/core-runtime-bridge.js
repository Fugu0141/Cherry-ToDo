(() => {
  if (window.CherryStateRuntime) return;

  const clone = value => JSON.parse(JSON.stringify(value));
  const serialize = value => JSON.stringify(value);

  function safeState() {
    return typeof state === "object" && state ? state : { tasks: {}, showLanes: true, viewMode: "board" };
  }

  window.CherryLegacyCore?.withCore(core => {
    const runtime = core.runtime;
    const store = runtime?.store;
    const commands = runtime?.commands;
    const events = runtime?.events;
    if (!store || !commands || !events) return;

    const originalRequestRender = typeof requestRender === "function" ? requestRender : null;
    let pendingLegacyState = null;
    let applyingCoreState = false;

    function renderLegacyApp() {
      if (typeof branchLayout === "function") branchLayout();
      originalRequestRender?.();
      if (typeof scheduleSave === "function") scheduleSave();
    }

    function mirrorState(nextState, metadata = {}) {
      const next = clone(nextState);
      store.replaceState(next, metadata);
      events.emit("state:changed", clone(next), metadata);
      return next;
    }

    function publishState(nextState, metadata = {}) {
      applyingCoreState = true;
      try {
        state = clone(nextState);
        renderLegacyApp();
        return mirrorState(state, metadata);
      } finally {
        applyingCoreState = false;
      }
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

    registerCommand("state.capture-legacy", payload => {
      const previous = clone(payload?.previous || safeState());
      const next = clone(payload?.next || safeState());
      mirrorState(next, { source: "legacy-ui", command: "state.capture-legacy" });
      return {
        undo: () => publishState(previous, { source: "undo", command: "state.capture-legacy" }),
        redo: () => publishState(next, { source: "redo", command: "state.capture-legacy" }),
        meta: payload?.meta || null
      };
    });

    if (typeof snapshot === "function") {
      snapshot = function captureLegacySnapshot() {
        if (applyingCoreState || pendingLegacyState) return;
        pendingLegacyState = clone(safeState());
      };
    }

    if (originalRequestRender) {
      requestRender = function coreAwareRequestRender() {
        const previous = pendingLegacyState;
        pendingLegacyState = null;
        const result = originalRequestRender();

        if (!applyingCoreState && previous) {
          const next = clone(safeState());
          if (serialize(previous) !== serialize(next)) {
            void commands.dispatch("state.capture-legacy", {
              previous,
              next,
              meta: { source: "legacy-ui" }
            }).catch(error => console.error("[Cherry Core] Failed to capture legacy mutation.", error));
          }
        }

        return result;
      };
    }

    function runUndo(event) {
      event?.preventDefault?.();
      event?.stopImmediatePropagation?.();
      void commands.undo();
    }

    function runRedo(event) {
      event?.preventDefault?.();
      event?.stopImmediatePropagation?.();
      void commands.redo();
    }

    if (typeof undoBtn !== "undefined" && undoBtn) {
      undoBtn.addEventListener("click", runUndo, true);
    }

    window.addEventListener("keydown", event => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();
      if (key === "z" && event.shiftKey) runRedo(event);
      else if (key === "z") runUndo(event);
      else if (key === "y") runRedo(event);
    }, true);

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
      canUndo: commands.canUndo,
      canRedo: commands.canRedo,
      getHistoryState: commands.getHistoryState,
      subscribeHistory: commands.subscribeHistory,
      getState: store.getState,
      subscribe: store.subscribe
    });

    events.emit("state-runtime:ready", {
      commands: commands.registry.list()
    });
  });
})();