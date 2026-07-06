(() => {
  function syncStartFocusMode() {
    const stage = document.querySelector(".stage");
    const active = Boolean(stage && stage.classList.contains("startPageMode"));
    document.body.classList.toggle("startPageFocusMode", active);
  }

  function scheduleSync() {
    requestAnimationFrame(syncStartFocusMode);
    setTimeout(syncStartFocusMode, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleSync, { once: true });
  } else {
    scheduleSync();
  }

  document.addEventListener("click", event => {
    if (event.target.closest("#startPageBtn, .workspaceStartMini, .startPageClose, [data-action], [data-tab-action]")) {
      scheduleSync();
    }
  });

  window.addEventListener("cherry-workspace-updated", scheduleSync);
  window.addEventListener("resize", scheduleSync, { passive: true });
  setInterval(syncStartFocusMode, 700);
})();
