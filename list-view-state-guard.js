(() => {
  let syncing = false;

  function isListMode() {
    try {
      return typeof state !== "undefined" && state?.viewMode === "list";
    } catch (_) {
      return false;
    }
  }

  function syncListState() {
    if (syncing) return;
    syncing = true;
    requestAnimationFrame(() => {
      syncing = false;
      const stage = document.querySelector(".stage");
      const listView = document.getElementById("listView");
      const listButton = document.getElementById("listViewBtn");
      if (!stage || !listView) return;

      if (isListMode()) {
        stage.classList.remove("startPageMode");
        document.body.classList.remove("startPageFocusMode");
        stage.classList.add("listMode");
        listView.classList.remove("hidden");
        listButton?.classList.add("activeView");
      } else {
        stage.classList.remove("listMode");
        listView.classList.add("hidden");
        listButton?.classList.remove("activeView");
      }
    });
  }

  function boot() {
    syncListState();
    const stage = document.querySelector(".stage");
    if (stage && !stage.dataset.listStateGuardBound) {
      stage.dataset.listStateGuardBound = "1";
      new MutationObserver(syncListState).observe(stage, { attributes: true, attributeFilter: ["class"] });
    }

    const listButton = document.getElementById("listViewBtn");
    if (listButton && !listButton.dataset.listStateGuardBound) {
      listButton.dataset.listStateGuardBound = "1";
      listButton.addEventListener("click", () => {
        setTimeout(syncListState, 0);
        setTimeout(syncListState, 80);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener("cherry-workspace-updated", syncListState);
  window.addEventListener("resize", syncListState, { passive: true });
  setInterval(syncListState, 600);
})();
