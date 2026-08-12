(() => {
  if (window.CherryLegacyCore) return;

  let resolveReady;
  const readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
  });

  let resolved = false;

  function currentCore() {
    return window.CherryCore && typeof window.CherryCore === "object"
      ? window.CherryCore
      : null;
  }

  function getTaskDate(task) {
    const coreSchedule = currentCore()?.schedule;
    if (typeof coreSchedule?.normalizeSchedule === "function" && typeof coreSchedule?.scheduleDate === "function") {
      return coreSchedule.scheduleDate(coreSchedule.normalizeSchedule(task?.schedule, task?.targetAt));
    }

    // The module bootstrap is deferred. Preserve early legacy startup by using
    // the existing pure normalizer until Core is synchronously available.
    if (typeof window.normalizeSchedule !== "function") return null;
    const normalized = window.normalizeSchedule(task?.schedule, task?.targetAt);
    return normalized && (normalized.type === "date" || normalized.type === "datetime")
      ? normalized.date
      : null;
  }

  window.CherryScheduleBridge = Object.freeze({ getTaskDate });

  function installScheduleCompatibility(core) {
    const schedule = core?.schedule;
    if (!schedule) return;

    window.isValidISODate = schedule.isValidISODate;
    window.isValidTime = schedule.isValidTime;
    window.makeScheduleNone = schedule.makeScheduleNone;
    window.makeScheduleDate = schedule.makeScheduleDate;
    window.makeScheduleDateTime = schedule.makeScheduleDateTime;
    window.scheduleFromLegacyTargetAt = schedule.scheduleFromLegacyTargetAt;
    window.normalizeSchedule = schedule.normalizeSchedule;

    if (window.cherrySchedule && typeof window.cherrySchedule === "object") {
      window.cherrySchedule.makeScheduleNone = schedule.makeScheduleNone;
      window.cherrySchedule.makeScheduleDate = schedule.makeScheduleDate;
      window.cherrySchedule.makeScheduleDateTime = schedule.makeScheduleDateTime;
    }
  }

  function installWorkspaceCompatibility(core) {
    const workspace = core?.workspace;
    if (!workspace) return;

    window.CherryWorkspaceModel = workspace;
    window.makeEmptyWorkspaceState = workspace.makeEmptyTabState;
    window.makeDefaultWorkspace = workspace.makeDefaultWorkspace;
    window.normalizeWorkspaceTab = workspace.normalizeTab;
    window.normalizeWorkspace = workspace.normalizeWorkspace;
    window.normalizeWorkspaceOrDefault = workspace.normalizeWorkspaceOrDefault;
    window.parseWorkspace = workspace.parseWorkspace;
    window.loadWorkspace = workspace.loadWorkspace;
    window.serializeWorkspace = workspace.serializeWorkspace;
  }

  function installStoreCompatibility(core) {
    const store = core?.store;
    if (!store) return;

    window.CherryStoreCore = store;
    window.CherryTaskSelectors = store.selectors;
  }

  function installBoardSettingsCompatibility(core) {
    if (core?.boardSettings) window.CherryBoardSettings = core.boardSettings;
  }

  function installCommandCompatibility(core) {
    const commands = core?.commands;
    if (!commands) return;

    window.CherryCommandCore = commands;
  }

  function installInfrastructureCompatibility(core) {
    if (core?.events) window.CherryEventCore = core.events;
    if (core?.storage) window.CherryStorageCore = core.storage;
    if (core?.runtime) window.CherryCoreRuntime = core.runtime;
  }

  function resolveIfReady() {
    const core = currentCore();
    if (!core) return null;

    installScheduleCompatibility(core);
    installWorkspaceCompatibility(core);
    installStoreCompatibility(core);
    installBoardSettingsCompatibility(core);
    installCommandCompatibility(core);
    installInfrastructureCompatibility(core);
    if (resolved) return core;

    resolved = true;
    resolveReady(core);
    return core;
  }

  window.addEventListener("cherry-core-ready", resolveIfReady, { once: true });

  window.CherryLegacyCore = Object.freeze({
    get() {
      return currentCore();
    },
    ready() {
      const core = resolveIfReady();
      return core ? Promise.resolve(core) : readyPromise;
    },
    withCore(callback) {
      if (typeof callback !== "function") {
        return Promise.reject(new TypeError("CherryLegacyCore.withCore requires a callback"));
      }
      return this.ready().then(callback);
    }
  });

  resolveIfReady();
})();
