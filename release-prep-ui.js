(() => {
  if (!window.CherryI18n) return;

  function t(key, values = {}) {
    return window.CherryI18n.t(key, values);
  }

  function ensureToolbarButton(id, textKey, beforeId) {
    let button = document.getElementById(id);
    if (button) return button;

    const toolbar = document.querySelector(".toolbar");
    if (!toolbar) return null;

    button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.textContent = t(textKey);

    const before = beforeId ? document.getElementById(beforeId) : null;
    if (before && before.parentElement === toolbar) toolbar.insertBefore(button, before);
    else toolbar.appendChild(button);
    return button;
  }

  function ensureReleaseButtons() {
    const languageButton = ensureToolbarButton("languageToggleBtn", "toolbar.language", "undoBtn");
    if (languageButton && !languageButton.dataset.releasePrepBound) {
      languageButton.dataset.releasePrepBound = "1";
      languageButton.addEventListener("click", () => window.CherryI18n.toggleLanguage());
    }

    ensureToolbarButton("startPageBtn", "toolbar.start", "undoBtn");
    ensureToolbarButton("tutorialBtn", "toolbar.guide", "undoBtn");
  }

  function setText(id, key) {
    const element = document.getElementById(id);
    if (element) element.textContent = t(key);
  }

  function setTitle(id, key) {
    const element = document.getElementById(id);
    if (element) element.title = t(key);
  }

  function applyStaticUi() {
    document.documentElement.lang = window.CherryI18n.getLanguage();
    document.title = t("app.title");

    const brandTitle = document.querySelector(".brand h1");
    if (brandTitle) brandTitle.textContent = t("app.title");

    const brandLead = document.querySelector(".brand p");
    if (brandLead) brandLead.textContent = t("app.tagline");

    setText("addRootBtn", "toolbar.addRoot");
    setText("treeLayoutBtn", "toolbar.autoLayout");
    setText("verticalLayoutBtn", "toolbar.verticalLayout");
    setText("languageToggleBtn", "toolbar.language");
    setText("startPageBtn", "toolbar.start");
    setText("tutorialBtn", "toolbar.guide");
    setText("undoBtn", "toolbar.undo");
    setText("deleteBtn", "toolbar.delete");
    setText("resetBtn", "toolbar.reset");

    const help = document.querySelector(".help");
    if (help) help.textContent = t("stage.help");

    const laneButton = document.getElementById("toggleLanesBtn");
    if (laneButton && typeof state !== "undefined") {
      laneButton.textContent = t("toolbar.dateLanes", { state: state.showLanes ? "ON" : "OFF" });
    }

    const themeButton = document.getElementById("themeToggleBtn");
    const mode = themeButton?.dataset.themeMode || document.documentElement.dataset.theme || "system";
    if (themeButton) {
      const labelKey = mode === "light" ? "toolbar.themeLight" : mode === "dark" ? "toolbar.themeDark" : "toolbar.themeAuto";
      const titleKey = mode === "light" ? "theme.lightTitle" : mode === "dark" ? "theme.darkTitle" : "theme.systemTitle";
      const label = t(labelKey);
      themeButton.textContent = label;
      themeButton.title = t(titleKey);
      themeButton.setAttribute("aria-label", t("theme.aria", { label }));
    }

    const taskNameInput = document.getElementById("taskNameInput");
    if (taskNameInput) taskNameInput.placeholder = t("modal.taskNamePlaceholder");

    const taskLabels = document.querySelectorAll("#taskModal label span, #dateModal label span");
    if (taskLabels[0]) taskLabels[0].textContent = t("modal.taskName");
    if (taskLabels[1]) taskLabels[1].textContent = t("modal.targetDate");
    if (taskLabels[2]) taskLabels[2].textContent = t("modal.targetDate");

    setText("taskCancelBtn", "modal.cancel");
    setText("taskSaveBtn", "modal.save");
    setText("dateCancelBtn", "modal.restore");
    setText("dateSaveBtn", "modal.change");

    const dateModalTitle = document.querySelector("#dateModal h2");
    if (dateModalTitle) dateModalTitle.textContent = t("modal.changeDate");

    const dateModalText = document.querySelector("#dateModal .modalText");
    if (dateModalText) dateModalText.textContent = t("modal.changeDateDescription");

    translateDynamicControls();
    translateWelcomeSplash();
  }

  function translateDynamicControls() {
    const title = document.getElementById("taskModalTitle");
    if (title) {
      const key = title.dataset.i18nDynamicKey || matchTaskModalTitle(title.textContent.trim());
      if (key) {
        title.dataset.i18nDynamicKey = key;
        title.textContent = t(key);
      }
    }

    document.querySelectorAll(".deleteBtn").forEach(element => {
      element.title = t("note.delete");
    });

    document.querySelectorAll(".doneBtn").forEach(element => {
      element.title = t("note.toggleDone");
    });

    const vertical = document.getElementById("board")?.classList.contains("verticalMode");
    document.querySelectorAll(".handle").forEach(element => {
      element.title = t(vertical ? "note.addSameMobile" : "note.addBranchDesktop");
    });
  }

  function matchTaskModalTitle(value) {
    const map = {
      "タスクを作成": "modal.createTask",
      "Create task": "modal.createTask",
      "ルートタスクを作成": "modal.createRoot",
      "Create root task": "modal.createRoot",
      "同じブランチに追加": "modal.createSameBranch",
      "Add to same branch": "modal.createSameBranch",
      "分岐タスクを作成": "modal.createBranch",
      "Create branch task": "modal.createBranch",
      "タスクを追加": "modal.addTask",
      "Add task": "modal.addTask",
      "タスクを編集": "modal.editTask",
      "Edit task": "modal.editTask"
    };
    return map[value] || null;
  }

  function translateWelcomeSplash() {
    const splash = document.getElementById("welcomeSplash");
    if (!splash) return;

    const close = splash.querySelector(".welcomeSplashClose");
    if (close) close.setAttribute("aria-label", t("welcome.close"));

    const kicker = splash.querySelector(".welcomeSplashKicker");
    if (kicker) kicker.textContent = t("welcome.kicker");

    const title = splash.querySelector("#welcomeSplashTitle");
    if (title) title.textContent = t("welcome.title");

    const lead = splash.querySelector(".welcomeSplashLead");
    if (lead) lead.textContent = t("welcome.lead");

    const flow = splash.querySelector(".welcomeSplashFlow");
    if (flow) {
      flow.setAttribute("aria-label", t("welcome.conceptLabel"));
      const spans = flow.querySelectorAll("span");
      if (spans[0]) spans[0].textContent = t("welcome.root");
      if (spans[2]) spans[2].textContent = t("welcome.child");
      if (spans[4]) spans[4].textContent = t("welcome.today");
    }

    const hint = splash.querySelector(".welcomeSplashHint");
    if (hint) hint.textContent = t("welcome.hint");

    const start = splash.querySelector(".welcomeSplashStart");
    if (start) start.textContent = t("welcome.start");

    const footer = splash.querySelector(".welcomeSplashFooter");
    if (footer) {
      const items = footer.querySelectorAll("a, span");
      if (items[0]) items[0].textContent = t("welcome.github");
      if (items[1]) items[1].textContent = t("welcome.contribute");
      if (items[2]) items[2].textContent = t("welcome.donationPending");
      if (items[3]) items[3].textContent = t("welcome.releases");
      if (!footer.querySelector("[data-tutorial-open]")) {
        const guide = document.createElement("button");
        guide.type = "button";
        guide.className = "welcomeSplashFooterButton";
        guide.dataset.tutorialOpen = "1";
        guide.textContent = t("welcome.guide");
        footer.appendChild(guide);
      } else {
        footer.querySelector("[data-tutorial-open]").textContent = t("welcome.guide");
      }
    }
  }

  function patchTaskModalTitleKeys() {
    if (typeof openCreateTaskModal === "function") {
      const baseOpenCreate = openCreateTaskModal;
      openCreateTaskModal = function localizedCreateTaskModal(context = {}) {
        baseOpenCreate(context);
        const title = document.getElementById("taskModalTitle");
        if (!title) return;
        const parentId = context.parentId ?? null;
        const branchMode = context.branchMode || "same";
        const key = parentId ? (branchMode === "same" ? "modal.createSameBranch" : "modal.createBranch") : "modal.createRoot";
        title.dataset.i18nDynamicKey = key;
        title.textContent = t(key);
      };
    }

    if (typeof openEditTaskModal === "function") {
      const baseOpenEdit = openEditTaskModal;
      openEditTaskModal = function localizedEditTaskModal(taskId) {
        baseOpenEdit(taskId);
        const title = document.getElementById("taskModalTitle");
        if (title) {
          title.dataset.i18nDynamicKey = "modal.editTask";
          title.textContent = t("modal.editTask");
        }
      };
    }
  }

  function patchResetConfirm() {
    const resetButton = document.getElementById("resetBtn");
    if (!resetButton || resetButton.dataset.releasePrepResetBound) return;
    resetButton.dataset.releasePrepResetBound = "1";

    resetButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!confirm(t("modal.resetConfirm"))) return;

      snapshot();
      state = makeInitialState();
      selectedId = null;
      branchLayout();
      requestRender();
    }, true);
  }

  function patchRenderTranslation() {
    if (typeof render !== "function" || render.releasePrepLocalized) return;
    const baseRender = render;
    render = function localizedRender() {
      baseRender();
      requestAnimationFrame(applyStaticUi);
    };
    render.releasePrepLocalized = true;
  }

  let queued = false;
  function queueApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applyStaticUi();
    });
  }

  function init() {
    ensureReleaseButtons();
    patchTaskModalTitleKeys();
    patchResetConfirm();
    patchRenderTranslation();
    applyStaticUi();

    window.CherryI18n.onChange(() => {
      applyStaticUi();
      if (typeof requestRender === "function") requestRender();
    });

    const observer = new MutationObserver(queueApply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "data-theme-mode"] });
  }

  init();
})();
