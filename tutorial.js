(() => {
  if (!window.CherryI18n) return;

  function t(key, values = {}) {
    return window.CherryI18n.t(key, values);
  }

  function steps() {
    return window.CherryI18n.list("tutorial.steps");
  }

  let index = 0;
  let backdrop = null;
  let previouslyFocused = null;

  function build() {
    backdrop = document.createElement("div");
    backdrop.id = "tutorialOverlay";
    backdrop.className = "tutorialBackdrop hidden";
    backdrop.innerHTML = `
      <section class="tutorialPanel" role="dialog" aria-modal="true" aria-labelledby="tutorialTitle">
        <div class="tutorialHead">
          <div class="tutorialTitleBlock">
            <p class="tutorialStepCount"></p>
            <h2 id="tutorialTitle"></h2>
          </div>
          <button type="button" class="tutorialClose" aria-label="${t("tutorial.close")}">×</button>
        </div>
        <div class="tutorialBody">
          <p class="tutorialText"></p>
          <div class="tutorialPreview" aria-hidden="true"></div>
        </div>
        <div class="tutorialActions">
          <button type="button" class="tutorialSecondary tutorialBack"></button>
          <button type="button" class="tutorialPrimary tutorialNext"></button>
        </div>
      </section>
    `;

    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", event => {
      if (event.target === backdrop || event.target.closest(".tutorialClose")) close();
      if (event.target.closest(".tutorialBack")) previous();
      if (event.target.closest(".tutorialNext")) next();
    });

    document.addEventListener("keydown", event => {
      if (!backdrop || backdrop.classList.contains("hidden")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    });
  }

  function renderPreview(stepIndex) {
    const preview = backdrop.querySelector(".tutorialPreview");
    const language = window.CherryI18n.getLanguage?.() === "en" ? "en" : "ja";
    const labels = language === "en"
      ? { root: "Root", child: "Child", branch: "Branch", date: "Date lane", list: "List", file: ".cherry / .ics", allTabs: "All tabs", today: "Today" }
      : { root: "ルート", child: "子タスク", branch: "分岐", date: "日付レーン", list: "リスト", file: ".cherry / .ics", allTabs: "全タブ", today: "今日" };

    const previews = [
      `<div class="tutorialScene rootScene"><div class="tutorialToolbarChip">+ ${labels.root}</div><div class="tutorialArrow">→</div><div class="tutorialTaskCard strong">${labels.root}</div></div>`,
      `<div class="tutorialScene branchScene"><div class="tutorialTaskCard strong">${labels.root}</div><div class="tutorialLinkLine"></div><div class="tutorialTaskStack"><div class="tutorialTaskCard">${labels.child}</div><div class="tutorialTaskCard offset">${labels.branch}</div></div></div>`,
      `<div class="tutorialScene dateScene"><div class="tutorialLane"><span>${labels.date}</span></div><div class="tutorialTaskCard floating">${labels.today}</div><div class="tutorialCalendarDots"><span></span><span></span><span></span></div></div>`,
      `<div class="tutorialScene listScene"><div class="tutorialListHeader">${labels.list} · ${labels.allTabs}</div><div class="tutorialListRow"><span class="dot"></span><strong>${labels.today}</strong><em>7/6</em></div><div class="tutorialListRow"><span class="dot hollow"></span><strong>${labels.child}</strong><em>7/7</em></div></div>`,
      `<div class="tutorialScene fileScene"><div class="tutorialTabsMini"><span>${labels.root}</span><span>${labels.branch}</span><span>+</span></div><div class="tutorialFileIcon">${labels.file}</div><div class="tutorialLock">🔒</div></div>`
    ];

    preview.innerHTML = previews[stepIndex] || previews[0];
  }

  function render() {
    if (!backdrop) build();
    const currentSteps = steps();
    const total = currentSteps.length;
    const step = currentSteps[index] || currentSteps[0];
    if (!step) return;

    backdrop.querySelector(".tutorialStepCount").textContent = t("tutorial.stepCount", { current: index + 1, total });
    backdrop.querySelector("#tutorialTitle").textContent = step.title;
    backdrop.querySelector(".tutorialText").textContent = step.body;
    backdrop.querySelector(".tutorialClose").setAttribute("aria-label", t("tutorial.close"));
    renderPreview(index);

    const back = backdrop.querySelector(".tutorialBack");
    back.textContent = t("tutorial.previous");
    back.disabled = index === 0;

    const nextButton = backdrop.querySelector(".tutorialNext");
    nextButton.textContent = index === total - 1 ? t("tutorial.done") : t("tutorial.next");
  }

  function open() {
    if (!backdrop) build();
    index = 0;
    previouslyFocused = document.activeElement;
    render();
    backdrop.classList.remove("hidden");
    backdrop.querySelector(".tutorialNext")?.focus({ preventScroll: true });
  }

  function close() {
    if (!backdrop) return;
    backdrop.classList.add("hidden");
    previouslyFocused?.focus?.({ preventScroll: true });
  }

  function previous() {
    index = Math.max(0, index - 1);
    render();
  }

  function next() {
    const total = steps().length;
    if (index >= total - 1) {
      close();
      return;
    }
    index += 1;
    render();
  }

  function bindOpenTriggers() {
    document.getElementById("tutorialBtn")?.addEventListener("click", open);
    document.body.addEventListener("click", event => {
      if (event.target.closest("[data-tutorial-open]")) open();
    });
  }

  window.CherryI18n.onChange(() => {
    if (backdrop && !backdrop.classList.contains("hidden")) render();
  });

  window.cherryTutorial = { open, close };

  bindOpenTriggers();
})();
