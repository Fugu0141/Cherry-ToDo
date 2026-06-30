(() => {
  const mobileActionQuery = window.matchMedia("(max-width: 980px)");

  const bar = document.createElement("div");
  bar.id = "mobileActionBar";
  bar.className = "mobileActionBar hidden";

  const buttons = document.createElement("div");
  buttons.className = "mobileActionButtons";

  function makeButton(className, icon, text) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `mobileActionButton ${className}`;
    button.innerHTML = `<strong>${icon}</strong>${text}`;
    return button;
  }

  const doneButton = makeButton("done", "✓", "完了");
  const addButton = makeButton("add", "＋", "追加");
  const editButton = makeButton("edit", "✎", "編集");
  const deleteButton = makeButton("delete", "×", "削除");

  buttons.appendChild(doneButton);
  buttons.appendChild(addButton);
  buttons.appendChild(editButton);
  buttons.appendChild(deleteButton);
  bar.appendChild(buttons);
  document.body.appendChild(bar);

  function selectedTask() {
    return selectedId ? state.tasks[selectedId] : null;
  }

  function selectedNoteElement(task) {
    if (!task) return null;
    const escapedId = window.CSS?.escape ? CSS.escape(task.id) : task.id.replace(/"/g, "\\\"");
    return notesEl.querySelector(`[data-id="${escapedId}"]`);
  }

  function shouldShowBar() {
    return mobileActionQuery.matches
      && state.viewMode !== "list"
      && selectedTask()
      && taskModal.classList.contains("hidden")
      && dateModal.classList.contains("hidden");
  }

  function taskDateForChild(task) {
    if (typeof getTaskDate === "function") return getTaskDate(task) || todayISO();
    return task.targetAt || todayISO();
  }

  function runDeleteAction() {
    document.getElementById("deleteBtn")?.click();
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function positionBar(task) {
    const noteEl = selectedNoteElement(task);
    if (!noteEl) return false;

    const noteRect = noteEl.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const gap = 10;
    const safe = 8;
    const viewportW = document.documentElement.clientWidth;
    const viewportH = document.documentElement.clientHeight;

    let left = noteRect.left + noteRect.width / 2 - barRect.width / 2;
    left = clamp(left, safe, Math.max(safe, viewportW - barRect.width - safe));

    let top = noteRect.bottom + gap;
    let placement = "below";

    if (top + barRect.height > viewportH - safe) {
      top = noteRect.top - barRect.height - gap;
      placement = "above";
    }

    if (top < safe) {
      top = clamp(noteRect.top + noteRect.height / 2 - barRect.height / 2, safe, Math.max(safe, viewportH - barRect.height - safe));
      placement = "middle";
    }

    bar.style.left = `${Math.round(left)}px`;
    bar.style.top = `${Math.round(top)}px`;
    bar.dataset.placement = placement;
    return true;
  }

  function updateMobileActionBar() {
    const task = selectedTask();

    if (!shouldShowBar()) {
      bar.classList.add("hidden");
      return;
    }

    doneButton.innerHTML = task.status === "done"
      ? "<strong>↺</strong>戻す"
      : "<strong>✓</strong>完了";

    bar.classList.remove("hidden");
    if (!positionBar(task)) bar.classList.add("hidden");
  }

  doneButton.addEventListener("click", event => {
    event.stopPropagation();
    const task = selectedTask();
    if (!task) return;

    snapshot();
    task.status = task.status === "done" ? "todo" : "done";
    requestRender();
  });

  addButton.addEventListener("click", event => {
    event.stopPropagation();
    const task = selectedTask();
    if (!task) return;

    openCreateTaskModal({
      parentId: task.id,
      targetAt: taskDateForChild(task),
      branchMode: "same"
    });
    updateMobileActionBar();
  });

  editButton.addEventListener("click", event => {
    event.stopPropagation();
    const task = selectedTask();
    if (!task) return;

    openEditTaskModal(task.id);
    updateMobileActionBar();
  });

  deleteButton.addEventListener("click", event => {
    event.stopPropagation();
    if (!selectedTask()) return;
    runDeleteAction();
  });

  const baseSetSelected = setSelected;
  setSelected = function setSelectedWithMobileActionBar(id) {
    baseSetSelected(id);
    updateMobileActionBar();
  };

  const baseRender = render;
  render = function renderWithMobileActionBar() {
    baseRender();
    updateMobileActionBar();
  };

  [taskCancelBtn, taskSaveBtn, dateCancelBtn, dateSaveBtn].forEach(button => {
    button.addEventListener("click", () => requestAnimationFrame(updateMobileActionBar));
  });

  board.addEventListener("scroll", updateMobileActionBar, { passive: true });
  mobileActionQuery.addEventListener("change", updateMobileActionBar);
  window.addEventListener("resize", updateMobileActionBar, { passive: true });

  updateMobileActionBar();
})();
