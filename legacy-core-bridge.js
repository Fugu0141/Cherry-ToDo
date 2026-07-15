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

  function resolveIfReady() {
    if (resolved) return currentCore();
    const core = currentCore();
    if (!core) return null;
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
