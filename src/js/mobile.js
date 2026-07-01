(() => {
  const isTouchLike = event => event.pointerType === "touch" || window.matchMedia("(pointer: coarse)").matches;

  function fallbackToday() {
    try {
      if (typeof todayISO === "function") return todayISO();
    } catch (_) {}
    return new Date().toISOString().slice(0, 10);
  }

  function dateFromPointer(event) {
    try {
      if (typeof getDateForPointer === "function") return getDateForPointer(event);
    } catch (_) {}
    return fallbackToday();
  }

  document.addEventListener("pointerdown", event => {
    const handle = event.target.closest?.(".handle");
    if (!handle || !isTouchLike(event)) return;

    const note = handle.closest(".note");
    if (!note || !note.dataset.id) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (typeof openCreateTaskModal === "function") {
      openCreateTaskModal({
        parentId: note.dataset.id,
        targetAt: dateFromPointer(event),
        branchMode: "same"
      });
    }
  }, true);
})();
