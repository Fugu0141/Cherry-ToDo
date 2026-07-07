(() => {
  const copy = {
    ja: {
      title: "ようこそ、Cherryへ",
      subtitle: "作業タブの切り替え、追加、ファイルの読み書きはここから始められます。"
    },
    en: {
      title: "Welcome to Cherry",
      subtitle: "Start here to switch tabs, create workspaces, and import or export files."
    }
  };

  function language() {
    return window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja";
  }

  function applyStartPageCopy() {
    const page = document.getElementById("startPage");
    if (!page) return;

    const current = copy[language()];
    const title = page.querySelector("#startPageTitle");
    const subtitle = page.querySelector(".startPageHeader p:not(.startPageKicker)");

    if (title && title.textContent !== current.title) title.textContent = current.title;
    if (subtitle && subtitle.textContent !== current.subtitle) subtitle.textContent = current.subtitle;
  }

  function queueApply() {
    requestAnimationFrame(applyStartPageCopy);
    setTimeout(applyStartPageCopy, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", queueApply, { once: true });
  } else {
    queueApply();
  }

  window.CherryI18n?.onChange(queueApply);
  window.addEventListener("cherry-workspace-updated", queueApply);

  document.addEventListener("click", event => {
    if (event.target.closest("#startPageBtn, .workspaceStartMini, [data-action], [data-tab-action]")) {
      queueApply();
    }
  });
})();
