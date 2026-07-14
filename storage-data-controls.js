(() => {
  const bridge = window.CherryStorageSessionBridge;
  const policy = window.CherryStoragePolicy;
  if (!bridge || !policy || !window.cherryDialog) return;

  const copy = {
    ja: {
      manage: "保存データを管理",
      noData: "この端末に保存されたCherryの作業データはありません。",
      title: "この端末の保存データを削除しますか？",
      message: "保存したワークスペース、タブ、タスク、復元情報をこの端末から削除します。表示言語やテーマ設定は残ります。この操作は元に戻せません。",
      confirm: "保存データを削除",
      cancel: "キャンセル",
      failed: "保存データを削除できませんでした。"
    },
    en: {
      manage: "Manage saved data",
      noData: "There is no saved Cherry work data on this device.",
      title: "Delete saved data from this device?",
      message: "This deletes saved workspaces, tabs, tasks, and restore context from this device. Language and theme preferences remain. This cannot be undone.",
      confirm: "Delete saved data",
      cancel: "Cancel",
      failed: "Saved data could not be deleted."
    }
  };

  function language() {
    return window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja";
  }

  function c(key) {
    return copy[language()][key] || copy.ja[key] || key;
  }

  function setStatus(message) {
    const status = document.querySelector("#startPage .startPageStatus");
    if (status) status.textContent = message;
  }

  function ensureControl() {
    const footer = document.querySelector("#startPage .startPageFooter");
    if (!footer) return null;

    let button = footer.querySelector(".startPageStorageManage");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "startPageStorageManage";
      footer.appendChild(button);
      button.addEventListener("click", async () => {
        if (!bridge.hasPersistentData()) {
          setStatus(c("noData"));
          return;
        }

        const confirmed = await window.cherryDialog.confirm({
          kicker: "Cherry",
          title: c("title"),
          message: c("message"),
          confirmText: c("confirm"),
          cancelText: c("cancel"),
          danger: true
        });
        if (!confirmed) return;

        policy.setMode("session");
        if (!bridge.clearPersistentData()) {
          setStatus(c("failed"));
          return;
        }
        location.reload();
      });
    }

    button.textContent = c("manage");
    return button;
  }

  function render() {
    ensureControl();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render, { once: true });
  } else {
    render();
  }

  window.CherryI18n?.onChange(render);
  window.addEventListener("cherry-start-page-ready", render);
  window.addEventListener("cherry-workspace-updated", render);
})();