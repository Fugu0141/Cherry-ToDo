(() => {
  const primaryIds = ["listViewBtn", "addRootBtn", "toggleLanesBtn"];
  const secondaryIds = ["treeLayoutBtn", "verticalLayoutBtn", "themeToggleBtn", "languageToggleBtn", "startPageBtn", "tutorialBtn", "undoBtn", "deleteBtn", "resetBtn"];

  const label = {
    ja: "その他",
    en: "More"
  };

  function language() {
    return window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja";
  }

  function setup() {
    const toolbar = document.querySelector(".toolbar");
    if (!toolbar || toolbar.dataset.commandMenuReady) return true;

    const primaryButtons = primaryIds.map(id => document.getElementById(id));
    const secondaryButtons = secondaryIds.map(id => document.getElementById(id));
    if (primaryButtons.some(button => !button) || secondaryButtons.some(button => !button)) return false;

    toolbar.dataset.commandMenuReady = "1";
    toolbar.classList.add("commandMenuReady");

    const spacer = document.createElement("span");
    spacer.className = "toolbarPrimarySpacer";

    const more = document.createElement("button");
    more.type = "button";
    more.id = "toolbarMoreBtn";
    more.className = "toolbarMoreButton";
    more.setAttribute("aria-haspopup", "menu");
    more.setAttribute("aria-expanded", "false");

    const panel = document.createElement("div");
    panel.id = "toolbarMorePanel";
    panel.className = "toolbarMorePanel hidden";
    panel.setAttribute("role", "menu");

    primaryButtons.forEach(button => toolbar.appendChild(button));
    toolbar.appendChild(spacer);
    toolbar.appendChild(more);
    toolbar.appendChild(panel);
    secondaryButtons.forEach(button => panel.appendChild(button));

    function setOpen(open) {
      panel.classList.toggle("hidden", !open);
      more.setAttribute("aria-expanded", open ? "true" : "false");
    }

    more.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(panel.classList.contains("hidden"));
    });

    panel.addEventListener("click", () => setOpen(false));
    document.addEventListener("click", event => {
      if (!toolbar.contains(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") setOpen(false);
    });

    function refreshText() {
      more.textContent = label[language()];
      more.setAttribute("aria-label", label[language()]);
    }

    refreshText();
    window.CherryI18n?.onChange(refreshText);
    return true;
  }

  function retry(count = 0) {
    if (setup() || count > 20) return;
    setTimeout(() => retry(count + 1), 80);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => retry(), { once: true });
  } else {
    retry();
  }
})();
