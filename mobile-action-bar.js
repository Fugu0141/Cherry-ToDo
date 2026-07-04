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

  let mobileAddParentContext = null;

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

  function clearMobileAddParentContext() {
    mobileAddParentContext = null;
  }

  function restoreMobileAddParentAfterSave() {
    const context = mobileAddParentContext;
    if (!context) return;

    if (!taskModal.classList.contains("hidden")) return;
    mobileAddParentContext = null;

    if (!context.parentId || !state.tasks[context.parentId]) return;

    setSelected(context.parentId);
    requestRender();
  }

  function restoreMobileAddParentAfterEnter(event) {
    if (event.key === "Enter") restoreMobileAddParentAfterSave();
  }

  function ensureSelectedTaskNotHidden(task) {
    const noteEl = selectedNoteElement(task);
    if (!noteEl || !mobileActionQuery.matches) return;

    const boardRect = board.getBoundingClientRect();
    const noteRect = noteEl.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const bottomDock = barRect.height + 30;
    const visibleBottom = Math.min(window.innerHeight, boardRect.bottom) - bottomDock;
    const visibleTop = Math.max(boardRect.top, 8);

    if (noteRect.bottom > visibleBottom) {
      board.scrollTop += Math.ceil(noteRect.bottom - visibleBottom + 16);
      return;
    }

    if (noteRect.top < visibleTop) {
      board.scrollTop -= Math.ceil(visibleTop - noteRect.top + 12);
    }
  }

  function positionBar(task) {
    if (!selectedNoteElement(task)) return false;

    bar.style.left = "";
    bar.style.top = "";
    bar.style.right = "";
    bar.style.bottom = "";
    bar.dataset.placement = "dock";

    requestAnimationFrame(() => ensureSelectedTaskNotHidden(task));
    return true;
  }

  function updateMobileActionBar() {
    const task = selectedTask();

    if (!shouldShowBar()) {
      bar.classList.add("hidden");
      document.body.classList.remove("mobileActionBarVisible");
      return;
    }

    doneButton.innerHTML = task.status === "done"
      ? "<strong>↺</strong>戻す"
      : "<strong>✓</strong>完了";

    bar.classList.remove("hidden");
    document.body.classList.add("mobileActionBarVisible");
    if (!positionBar(task)) {
      bar.classList.add("hidden");
      document.body.classList.remove("mobileActionBarVisible");
    }
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

    mobileAddParentContext = { parentId: task.id };
    openCreateTaskModal({
      parentId: task.id,
      targetAt: taskDateForChild(task),
      branchMode: "branch"
    });
    taskModalTitle.textContent = "タスクを追加";
    updateMobileActionBar();
  });

  editButton.addEventListener("click", event => {
    event.stopPropagation();
    clearMobileAddParentContext();
    const task = selectedTask();
    if (!task) return;

    openEditTaskModal(task.id);
    updateMobileActionBar();
  });

  deleteButton.addEventListener("click", event => {
    event.stopPropagation();
    clearMobileAddParentContext();
    if (!selectedTask()) return;
    runDeleteAction();
  });

  taskSaveBtn.addEventListener("click", restoreMobileAddParentAfterSave);
  taskNameInput.addEventListener("keydown", restoreMobileAddParentAfterEnter);
  taskDateInput.addEventListener("keydown", restoreMobileAddParentAfterEnter);
  taskCancelBtn.addEventListener("click", clearMobileAddParentContext);
  taskModal.addEventListener("pointerdown", event => {
    if (event.target === taskModal) clearMobileAddParentContext();
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
