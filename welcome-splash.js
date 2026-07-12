(() => {
  const policy = window.CherryStoragePolicy;
  if (!policy || policy.hasPersistentConsent()) return;

  const languageKey = "cherry-language-v1";
  const supportedLanguages = ["ja", "en"];
  const copy = {
    ja: {
      languageLabel: "🌐 表示言語 / Display language",
      japanese: "日本語",
      english: "English",
      kicker: "最初に選んでください",
      title: "作ったタスクを、この端末に残しますか？",
      lead: "Cherryから外へ送信されることはありません。あとで変更もできます。",
      persistentTitle: "この端末に保存する",
      persistentDescription: "次に開いたときも、続きから使えます。",
      recommended: "おすすめ",
      sessionTitle: "今だけ使う",
      sessionDescription: "この画面を閉じると、今回の内容は消えます。",
      note: "どちらを選んでも、タスクはインターネットへ送信されません。",
      storageUnavailable: "この端末では保存を利用できません。「今だけ使う」を選んでください。"
    },
    en: {
      languageLabel: "🌐 表示言語 / Display language",
      japanese: "日本語",
      english: "English",
      kicker: "Choose first",
      title: "Save your tasks on this device?",
      lead: "Cherry does not send your tasks outside this device. You can change this later.",
      persistentTitle: "Save on this device",
      persistentDescription: "Continue where you left off the next time you open Cherry.",
      recommended: "Recommended",
      sessionTitle: "Use only this time",
      sessionDescription: "Your current work will be cleared when you close this screen.",
      note: "Either way, your tasks are not sent to the internet.",
      storageUnavailable: "Saving is not available on this device. Choose “Use only this time”."
    }
  };

  function loadLanguage() {
    try {
      const saved = localStorage.getItem(languageKey);
      if (supportedLanguages.includes(saved)) return saved;
    } catch (_) {}
    return String(navigator.language || "ja").toLowerCase().startsWith("en") ? "en" : "ja";
  }

  function saveLanguage(nextLanguage) {
    try { localStorage.setItem(languageKey, nextLanguage); } catch (_) {}
  }

  function setText(root, key) {
    const element = root.querySelector(`[data-storage-copy="${key}"]`);
    if (element) element.textContent = copy[currentLanguage][key];
  }

  function renderLanguage(root) {
    document.documentElement.lang = currentLanguage;
    [
      "languageLabel",
      "kicker",
      "title",
      "lead",
      "persistentTitle",
      "persistentDescription",
      "recommended",
      "sessionTitle",
      "sessionDescription",
      "note"
    ].forEach(key => setText(root, key));

    root.querySelectorAll("[data-language]").forEach(button => {
      const language = button.dataset.language;
      button.textContent = language === "en" ? copy[currentLanguage].english : copy[currentLanguage].japanese;
      button.setAttribute("aria-pressed", language === currentLanguage ? "true" : "false");
    });

    const error = root.querySelector(".storageChoiceError");
    if (error?.dataset.errorKey) error.textContent = copy[currentLanguage][error.dataset.errorKey];
  }

  let currentLanguage = loadLanguage();

  const backdrop = document.createElement("div");
  backdrop.className = "welcomeSplashBackdrop storageChoiceBackdrop";
  backdrop.innerHTML = `
    <section class="welcomeSplash storageChoiceDialog" role="dialog" aria-modal="true" aria-labelledby="saveTitle" tabindex="-1">
      <div class="welcomeSplashContent">
        <div class="storageChoiceLanguage" aria-label="Display language">
          <span class="storageChoiceLanguageLabel" data-storage-copy="languageLabel"></span>
          <div class="storageChoiceLanguageOptions" role="group" aria-label="Display language">
            <button type="button" class="storageChoiceLanguageButton" data-language="ja"></button>
            <button type="button" class="storageChoiceLanguageButton" data-language="en"></button>
          </div>
        </div>
        <p class="welcomeSplashKicker" style="color:var(--accent,#8d7cff)" data-storage-copy="kicker"></p>
        <h2 id="saveTitle" style="color:var(--ink,#e8edf5)" data-storage-copy="title"></h2>
        <p class="welcomeSplashLead" style="color:var(--muted,#9aa6b8)" data-storage-copy="lead"></p>
        <div class="storageChoiceOptions">
          <button type="button" class="storageChoiceOption storageChoicePrimary" data-mode="persistent">
            <b data-storage-copy="persistentTitle"></b>
            <small data-storage-copy="persistentDescription"></small>
            <i data-storage-copy="recommended"></i>
          </button>
          <button type="button" class="storageChoiceOption" data-mode="session">
            <b data-storage-copy="sessionTitle"></b>
            <small data-storage-copy="sessionDescription"></small>
          </button>
        </div>
        <p class="storageChoiceNote" data-storage-copy="note"></p>
        <p class="storageChoiceError" aria-live="polite"></p>
      </div>
    </section>
  `;

  document.body.append(backdrop);
  document.documentElement.classList.add("storageChoiceOpen");
  renderLanguage(backdrop);

  const dialog = backdrop.querySelector(".storageChoiceDialog");
  const error = backdrop.querySelector(".storageChoiceError");
  backdrop.querySelectorAll("[data-language]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const nextLanguage = button.dataset.language;
      if (!supportedLanguages.includes(nextLanguage)) return;
      currentLanguage = nextLanguage;
      saveLanguage(currentLanguage);
      renderLanguage(backdrop);
    });
  });

  backdrop.querySelectorAll("[data-mode]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.mode === "persistent") {
        if (!policy.setMode("persistent")) {
          error.dataset.errorKey = "storageUnavailable";
          error.textContent = copy[currentLanguage].storageUnavailable;
          return;
        }
        location.reload();
        return;
      }

      policy.setMode("session");
      backdrop.remove();
      document.documentElement.classList.remove("storageChoiceOpen");
    });
  });

  setTimeout(() => backdrop.classList.add("storageChoiceVisible"), 0);
  dialog?.focus({ preventScroll: true });
})();