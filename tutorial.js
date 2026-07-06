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
          <div class="tutorialPreview" aria-hidden="true">
            <span class="tutorialPreviewChip">Root</span>
            <span>→</span>
            <span class="tutorialPreviewChip">Task</span>
            <span>→</span>
            <span class="tutorialPreviewChip">Today</span>
          </div>
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

    const back = backdrop.querySelector(".tutorialBack");
    back.textContent = t("tutorial.previous");
    back.disabled = index === 0;

    const nextButton = backdrop.querySelector(".tutorialNext");
    nextButton.textContent = index === total - 1 ? t("tutorial.done") : t("tutorial.next");
  }

  function open() {
    if (!backdrop) build();
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
