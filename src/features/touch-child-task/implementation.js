(() => {
  const isTouchLike = event => event.pointerType === "touch" || window.matchMedia("(pointer: coarse)").matches;

  function taskScheduleForChild(task) {
    const getTaskDate = window.CherryScheduleBridge?.getTaskDate;
    const date = typeof getTaskDate === "function" ? getTaskDate(task) : null;
    return date
      ? { type: "date", date, time: null }
      : { type: "none", date: null, time: null };
  }

  document.addEventListener("pointerdown", event => {
    const handle = event.target.closest?.(".handle");
    if (!handle || !isTouchLike(event)) return;

    const note = handle.closest(".note");
    if (!note || !note.dataset.id) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const parent = state.tasks?.[note.dataset.id] || null;
    if (typeof openCreateTaskModal === "function") {
      openCreateTaskModal({
        parentId: note.dataset.id,
        schedule: taskScheduleForChild(parent),
        branchMode: "same"
      });
    }
  }, true);
})();
