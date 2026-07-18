(() => {
  const isTouchLike = event => event.pointerType === "touch" || window.matchMedia("(pointer: coarse)").matches;

  function localTodayFallback() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function fallbackToday() {
    try {
      if (window.cherryDateOnly?.today) return window.cherryDateOnly.today();
      if (typeof todayISO === "function") return todayISO();
    } catch (_) {}
    return localTodayFallback();
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
