(() => {
  if (!window.CherryI18n) return;

  const labels = {
    ja: { label: "言語", japanese: "日本語", english: "English" },
    en: { label: "Language", japanese: "日本語", english: "English" }
  };

  const storagePromptCopy = {
    ja: {
      kicker: "最初に選んでください",
      title: "作ったタスクを、この端末に残しますか？",
      lead: "Cherryから外へ送信されることはありません。あとで変更もできます。",
      persistentTitle: "この端末に保存する",
      persistentDescription: "次に開いたときも、続きから使えます。",
      recommended: "おすすめ",
      sessionTitle: "今だけ使う",
      sessionDescription: "この画面を閉じると、今回の内容は消えます。",
      privacyNote: "どちらを選んでも、タスクはインターネットへ送信されません。"
    },
    en: {
      kicker: "Choose first",
      title: "Save your tasks on this device?",
      lead: "Cherry does not send your tasks outside this device. You can change this later.",
      persistentTitle: "Save on this device",
      persistentDescription: "Continue where you left off the next time you open Cherry.",
      recommended: "Recommended",
      sessionTitle: "Use only this time",
      sessionDescription: "Your current work will be cleared when you close this screen.",
      privacyNote: "Either way, your tasks are not sent to the internet."
    }
  };

  const storagePromptKeys = [
    "kicker",
    "title",
    "lead",
    "persistentTitle",
    "persistentDescription",
    "recommended",
    "sessionTitle",
    "sessionDescription",
    "privacyNote"
  ];

  let renderQueued = false;
  let observer = null;

  function language() {
    return window.CherryI18n.getLanguage?.() === "en" ? "en" : "ja";
  }

  function copy(key) {
    const lang = language();
    return labels[lang]?.[key] || labels.ja[key] || key;
  }

  function setTextIfChanged(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function ensureStartPageSelector() {
    const actions = document.querySelector("#startPage .startPageActions");
    if (!actions) return null;

    let selector = actions.querySelector(".startPageLanguage");
    if (selector) return selector;

    selector = createSelector("startPageLanguage");
    actions.insertAdjacentElement("afterbegin", selector);
    return selector;
  }

  function createSelector(className) {
    const selector = document.createElement("div");
    selector.className = className;
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
      event.preventDefault();
      event.stopPropagation();
      window.CherryI18n.setLanguage?.(button.dataset.language);
      queueRender();
    });

    return selector;
  }

  function renderSelector(selector) {
    if (!selector) return;
    const activeLanguage = language();
    setTextIfChanged(selector.querySelector(".startPageLanguageLabel"), copy("label"));
    selector.querySelectorAll(".startPageLanguageButton").forEach(button => {
      setTextIfChanged(button, copy(button.dataset.labelKey));
      button.setAttribute("aria-pressed", button.dataset.language === activeLanguage ? "true" : "false");
    });
  }

  function visibleText(element) {
    return element?.innerText || element?.textContent || "";
  }

  function looksLikeStoragePrompt(element) {
    const text = visibleText(element);
    return /作ったタスクを|Save your tasks|この端末に保存|Save on this device/.test(text)
      && /今だけ使う|Use only this time/.test(text);
  }

  function findStoragePrompt() {
    const candidates = Array.from(document.querySelectorAll("section, dialog, div"))
      .filter(element => element.isConnected && looksLikeStoragePrompt(element))
      .sort((a, b) => visibleText(a).length - visibleText(b).length);
    return candidates[0] || null;
  }

  function translateStoragePrompt(prompt) {
    if (!prompt) return;
    const current = language();
    const replacements = new Map();
    storagePromptKeys.forEach(key => {
      replacements.set(storagePromptCopy.ja[key], storagePromptCopy[current][key]);
      replacements.set(storagePromptCopy.en[key], storagePromptCopy[current][key]);
    });

    const walker = document.createTreeWalker(prompt, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const trimmed = node.nodeValue.trim();
      if (!trimmed || !replacements.has(trimmed)) return;
      const next = replacements.get(trimmed);
      if (trimmed !== next) node.nodeValue = node.nodeValue.replace(trimmed, next);
    });
  }

  function ensureStoragePromptSelector(prompt) {
    if (!prompt) return null;
    prompt.classList.add("storageChoiceLanguageHost");

    let selector = prompt.querySelector(".storageChoiceLanguage");
    if (selector) return selector;

    selector = createSelector("startPageLanguage storageChoiceLanguage");
    const title = Array.from(prompt.querySelectorAll("h1, h2, [role='heading']"))
      .find(element => /作ったタスクを|Save your tasks/.test(visibleText(element)));

    if (title?.parentElement) title.parentElement.insertBefore(selector, title);
    else prompt.insertAdjacentElement("afterbegin", selector);
    return selector;
  }

  function renderStoragePrompt() {
    const prompt = findStoragePrompt();
    if (!prompt) return;
    translateStoragePrompt(prompt);
    renderSelector(ensureStoragePromptSelector(prompt));
  }

  function render() {
    renderQueued = false;
    renderSelector(ensureStartPageSelector());
    renderStoragePrompt();
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(render);
    setTimeout(render, 0);
  }

  function observeStoragePrompt() {
    if (observer) return;
    observer = new MutationObserver(queueRender);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      observeStoragePrompt();
      queueRender();
    }, { once: true });
  } else {
    observeStoragePrompt();
    queueRender();
  }

  window.CherryI18n.onChange(queueRender);
  window.addEventListener("cherry-workspace-updated", queueRender);
  window.addEventListener("cherry-start-page-ready", queueRender);

  document.addEventListener("click", event => {
    if (event.target.closest("#startPageBtn, .workspaceStartMini, [data-action], [data-tab-action]")) queueRender();
  });
})();
