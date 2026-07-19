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
  }

  function resolveIfReady() {
    const core = currentCore();
    if (!core) return null;

    installScheduleCompatibility(core);
    installWorkspaceCompatibility(core);
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