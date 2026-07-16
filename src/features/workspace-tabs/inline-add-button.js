(() => {
  function ensureInlineAddButton() {
    const bar = document.getElementById("workspaceBar");
    const list = bar?.querySelector(".workspaceTabList");
    const sourceButton = bar?.querySelector(":scope > .workspaceAddTab");
    if (!bar || !list || !sourceButton) return;

    let inlineButton = list.querySelector(".workspaceAddTabInline");
    if (!inlineButton) {
      inlineButton = document.createElement("button");
      inlineButton.type = "button";
      inlineButton.className = "workspaceAddTab workspaceAddTabInline";
      inlineButton.dataset.inlineAddTab = "1";
      inlineButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        sourceButton.click();
      });
    }

    inlineButton.textContent = sourceButton.textContent || "+";
    inlineButton.title = sourceButton.title || "";
    inlineButton.setAttribute("aria-label", sourceButton.getAttribute("aria-label") || "+");

    if (list.lastElementChild !== inlineButton) list.appendChild(inlineButton);
  }

  let scheduled = false;
  function scheduleEnsureInlineAddButton() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      ensureInlineAddButton();
    });
  }

  function init() {
    ensureInlineAddButton();
    window.addEventListener("cherry-workspace-updated", scheduleEnsureInlineAddButton);
    window.CherryI18n?.onChange?.(scheduleEnsureInlineAddButton);

    const observer = new MutationObserver(scheduleEnsureInlineAddButton);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
