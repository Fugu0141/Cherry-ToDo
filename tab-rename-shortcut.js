(() => {
  let clickTimer = null;
  const doubleClickDelay = 230;

  function bind() {
    const bar = document.getElementById("workspaceBar");
    const list = bar?.querySelector(".workspaceTabList");
    if (!bar || !list || bar.dataset.renameShortcutBound) return;
    bar.dataset.renameShortcutBound = "1";

    list.addEventListener("click", event => {
      const closeButton = event.target.closest("[data-tab-delete]");
      if (closeButton) return;

      const tabButton = event.target.closest("[data-tab-open]");
      if (!tabButton) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const tabId = tabButton.dataset.tabOpen;
      if (!tabId) return;

      if (event.detail >= 2) {
        clearTimeout(clickTimer);
        clickTimer = null;
        openRename(tabId);
        return;
      }

      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        clickTimer = null;
        window.cherryWorkspace?.openTab?.(tabId);
      }, doubleClickDelay);
    }, true);

    list.addEventListener("dblclick", event => {
      const tabButton = event.target.closest("[data-tab-open]");
      if (!tabButton) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      clearTimeout(clickTimer);
      clickTimer = null;
      openRename(tabButton.dataset.tabOpen);
    }, true);
  }

  async function openRename(tabId) {
    if (!tabId || !window.cherryWorkspace?.renameTab) return;
    document.body.classList.add("tabRenameDialogMode");
    try {
      await window.cherryWorkspace.renameTab(tabId);
    } finally {
      setTimeout(() => document.body.classList.remove("tabRenameDialogMode"), 120);
    }
  }

  function decorateTabs() {
    document.querySelectorAll("#workspaceBar [data-tab-open]").forEach(button => {
      button.dataset.renameHint = "true";
      button.removeAttribute("title");
    });
  }

  function refresh() {
    bind();
    decorateTabs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh, { once: true });
  } else {
    refresh();
  }

  window.addEventListener("cherry-workspace-updated", refresh);
  window.CherryI18n?.onChange(refresh);
})();
