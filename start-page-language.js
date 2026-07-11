(() => {
  if (!window.CherryI18n) return;

  const labels = {
    ja: { label: "言語", japanese: "日本語", english: "English" },
    en: { label: "Language", japanese: "日本語", english: "English" }
  };

  let renderQueued = false;

  function language() {
    return window.CherryI18n.getLanguage?.() === "en" ? "en" : "ja";
  }

  function copy(key) {
    const lang = language();
    return labels[lang]?.[key] || labels.ja[key] || key;
  }

  function ensureSelector() {
    const actions = document.querySelector("#startPage .startPageActions");
    if (!actions) return null;

    let selector = actions.querySelector(".startPageLanguage");
    if (selector) return selector;

    selector = document.createElement("div");
    selector.className = "startPageLanguage";
    selector.innerHTML = `
      <span class="startPageLanguageLabel"></span>
      <div class="startPageLanguageOptions" role="group"></div>
    `;

    const options = selector.querySelector(".startPageLanguageOptions");
    [["ja", "japanese"], ["en", "english"]].forEach(([value, key]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "startPageLanguageButton";
      button.dataset.language = value;
      button.dataset.labelKey = key;
      options.appendChild(button);
    });

    selector.addEventListener("click", event => {
      const button = event.target.closest("[data-language]");
      if (!button) return;
      window.CherryI18n.setLanguage?.(button.dataset.language);
      queueRender();
    });

    actions.insertAdjacentElement("afterbegin", selector);
    return selector;
  }

  function render() {
    renderQueued = false;
    const selector = ensureSelector();
    if (!selector) return;

    const activeLanguage = language();
    selector.querySelector(".startPageLanguageLabel").textContent = copy("label");
    selector.querySelectorAll(".startPageLanguageButton").forEach(button => {
      button.textContent = copy(button.dataset.labelKey);
      button.setAttribute("aria-pressed", button.dataset.language === activeLanguage ? "true" : "false");
    });
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(render);
    setTimeout(render, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", queueRender, { once: true });
  } else {
    queueRender();
  }

  window.CherryI18n.onChange(queueRender);
  window.addEventListener("cherry-workspace-updated", queueRender);
  window.addEventListener("cherry-start-page-ready", queueRender);

  document.addEventListener("click", event => {
    if (event.target.closest("#startPageBtn, .workspaceStartMini, [data-action], [data-tab-action]")) queueRender();
  });
})();
