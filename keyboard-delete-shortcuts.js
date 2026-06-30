(() => {
  const deleteKeys = new Set(["Delete", "Backspace", "Escape"]);

  function isTypingTarget(target) {
    const tag = target?.tagName;
    return target?.isContentEditable
      || tag === "INPUT"
      || tag === "TEXTAREA"
      || tag === "SELECT";
  }

  window.addEventListener("keydown", event => {
    if (!deleteKeys.has(event.key)) return;
    if (isTypingTarget(document.activeElement)) return;
    if (!selectedId || typeof deleteTask !== "function") return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.repeat) return;

    deleteTask(selectedId);
  }, true);
})();
