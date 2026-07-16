(() => {
  const startup = window.CherryStartupState;
  if (startup?.route !== "workspace") return;

  const root = document.documentElement;
  const stage = document.querySelector(".stage");
  const startPage = document.getElementById("startPage");

  root.dataset.cherryWorkspacePhase = "restoring";
  stage?.classList.remove("startPageMode");
  startPage?.classList.add("hidden");
  document.body.classList.remove("startPageFocusMode");

  function markReady() {
    stage?.classList.remove("startPageMode");
    startPage?.classList.add("hidden");
    document.body.classList.remove("startPageFocusMode");

    requestRender?.();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.dataset.cherryWorkspacePhase = "ready";
        window.dispatchEvent(new CustomEvent("cherry-workspace-view-ready", {
          detail: {
            activeTabId: window.cherryWorkspace?.getActiveTabId?.() || null,
            viewMode: typeof state !== "undefined" ? (state.viewMode || "board") : "board"
          }
        }));
      });
    });
  }

  markReady();
})();