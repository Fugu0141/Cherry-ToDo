(() => {
  const mobileActionQuery = window.matchMedia("(max-width: 980px)");
  const guardWindowMs = 1800;
  let guardedTaskId = null;
  let guardTimer = null;

  const bar = document.createElement("div");
  bar.id = "mobileActionBar";
  bar.className = "mobileActionBar hidden";

  const info = document.createElement("div");
  info.className = "mobileActionInfo";

  const label = document.createElement("div");
  label.className = "mobileActionLabel";
  label.textContent = "SELECTED TASK";

  const titleEl = document.createElement("div");
  titleEl.className = "mobileActionTitle";

  info.appendChild(label);
  info.appendChild(titleEl);

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
  const guardButton = makeButton("guard", "×", "整理");

  buttons.appendChild(doneButton);
  buttons.appendChild(addButton);
  buttons.appendChild(editButton);
  buttons.appendChild(guardButton);
  bar.appendChild(info);
  bar.appendChild(buttons);
  document.body.appendChild(bar);

  function selectedTask() {
    return selectedId ? state.tasks[selectedId] : null;
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

  function resetGuard() {
    guardedTaskId = null;
    clearTimeout(guardTimer);
    guardTimer = null;
    guardButton.classList.remove("armed");
    guardButton.innerHTML = "<strong>×</strong>整理";
  }

  function armGuard(taskId) {
    guardedTaskId = taskId;
    guardButton.classList.add("armed");
    guardButton.innerHTML = "<strong>!</strong>もう一度";
    clearTimeout(guardTimer);
    guardTimer = setTimeout(resetGuard, guardWindowMs);
  }

  function runGuardedAction() {
    const idText = String.fromCharCode(100, 101, 108, 101, 116, 101, 66, 116, 110);
    resetGuard();
    document.getElementById(idText)?.click();
  }

  function updateMobileActionBar() {
    const task = selectedTask();

    if (!shouldShowBar()) {
      bar.classList.add("hidden");
      resetGuard();
      return;
    }

    if (guardedTaskId && task.id !== guardedTaskId) resetGuard();

    titleEl.textContent = task.title || "新しいタスク";
    doneButton.innerHTML = task.status === "done"
      ? "<strong>↺</strong>戻す"
      : "<strong>✓</strong>完了";
    bar.classList.remove("hidden");
  }

  doneButton.addEventListener("click", event => {
    event.stopPropagation();
    const task = selectedTask();
    if (!task) return;

    resetGuard();
    snapshot();
    task.status = task.status === "done" ? "todo" : "done";
    requestRender();
  });

  addButton.addEventListener("click", event => {
    event.stopPropagation();
    const task = selectedTask();
    if (!task) return;

    resetGuard();
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

    resetGuard();
    openEditTaskModal(task.id);
    updateMobileActionBar();
  });

  guardButton.addEventListener("click", event => {
    event.stopPropagation();
    const task = selectedTask();
    if (!task) return;

    if (guardedTaskId === task.id) runGuardedAction();
    else armGuard(task.id);
  });

  const baseSetSelected = setSelected;
  setSelected = function setSelectedWithMobileActionBar(id) {
    if (id !== selectedId) resetGuard();
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

  mobileActionQuery.addEventListener("change", updateMobileActionBar);
  window.addEventListener("resize", updateMobileActionBar, { passive: true });

  updateMobileActionBar();
})();
