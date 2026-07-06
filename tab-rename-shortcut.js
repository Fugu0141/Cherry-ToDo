(() => {
  const copy = {
    ja: "タブ名を変更",
    en: "Rename tab"
  };

  function language() {
    return window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja";
  }

  function bind() {
    const bar = document.getElementById("workspaceBar");
    if (!bar || bar.dataset.renameShortcutBound) return;
    bar.dataset.renameShortcutBound = "1";

    bar.addEventListener("dblclick", async event => {
      const closeButton = event.target.closest("[data-tab-delete]");
      if (closeButton) return;

      const tabButton = event.target.closest("[data-tab-open]");
      if (!tabButton) return;

      event.preventDefault();
      event.stopPropagation();

      const tabId = tabButton.dataset.tabOpen;
      if (!tabId || !window.cherryWorkspace?.renameTab) return;

      tabButton.title = copy[language()];
      document.body.classList.add("tabRenameDialogMode");
      try {
        await window.cherryWorkspace.renameTab(tabId);
      } finally {
        setTimeout(() => document.body.classList.remove("tabRenameDialogMode"), 120);
      }
    });
  }

  function decorateTabs() {
    document.querySelectorAll("[data-tab-open]").forEach(button => {
      button.dataset.renameHint = "true";
      button.title = copy[language()];
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
