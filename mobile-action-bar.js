(() => {
  const mobileActionQuery = window.matchMedia("(max-width: 980px)");

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

  buttons.appendChild(doneButton);
  buttons.appendChild(addButton);
  buttons.appendChild(editButton);
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

  function updateMobileActionBar() {
    const task = selectedTask();

    if (!shouldShowBar()) {
      bar.classList.add("hidden");
      return;
    }

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

  mobileActionQuery.addEventListener("change", updateMobileActionBar);
  window.addEventListener("resize", updateMobileActionBar, { passive: true });

  updateMobileActionBar();
})();
