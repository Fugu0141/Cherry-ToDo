(function initListView() {
  const stage = document.querySelector(".stage");
  const toolbar = document.querySelector(".toolbar");
  const undoButton = document.getElementById("undoBtn");

  if (!stage || !toolbar || typeof getTasks !== "function" || typeof requestRender !== "function") return;

  function t(key, values = {}) {
    return window.CherryI18n?.t(key, values) || key;
  }

  const listViewButton = document.createElement("button");
  listViewButton.id = "listViewBtn";
  listViewButton.type = "button";
  listViewButton.textContent = t("list.openList");
  listViewButton.title = t("list.buttonTitle");

  if (undoButton) toolbar.insertBefore(listViewButton, undoButton);
  else toolbar.appendChild(listViewButton);

  const listView = document.createElement("section");
  listView.id = "listView";
  listView.className = "listView hidden";
  listView.setAttribute("aria-label", t("list.title"));
  stage.appendChild(listView);

  if (!state.viewMode) state.viewMode = "board";

  const originalRender = render;
  render = function renderWithListView() {
    originalRender();
    renderListView();
  };

  window.CherryI18n?.onChange(() => renderListView());

  listViewButton.addEventListener("click", () => {
    state.viewMode = state.viewMode === "list" ? "board" : "list";
    requestRender();
  });

  function scheduleDate(task) {
    if (typeof getTaskDate === "function") return getTaskDate(task);
    return task.targetAt ? normalizeDate(task.targetAt) : null;
  }

  function renderListView() {
    const isListMode = state.viewMode === "list";
    stage.classList.toggle("listMode", isListMode);
    listView.classList.toggle("hidden", !isListMode);
    listViewButton.classList.toggle("activeView", isListMode);
    listViewButton.textContent = isListMode ? t("list.openBoard") : t("list.openList");
    listViewButton.title = t("list.buttonTitle");

    if (!isListMode) return;

    const tasks = getTasks().slice().sort(sortByListOrder);
    const actionTasks = tasks.filter(isActionTask);
    const todoCount = actionTasks.filter(task => task.status !== "done").length;
    const doneCount = actionTasks.length - todoCount;

    listView.innerHTML = "";
    listView.setAttribute("aria-label", t("list.title"));

    const header = document.createElement("div");
    header.className = "listHeader";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = t("list.title");
    const lead = document.createElement("p");
    lead.textContent = t("list.lead");
    titleWrap.appendChild(title);
    titleWrap.appendChild(lead);

    const summary = document.createElement("div");
    summary.className = "listSummary";
    summary.textContent = t("list.summary", { todo: todoCount, done: doneCount });

    header.appendChild(titleWrap);
    header.appendChild(summary);
    listView.appendChild(header);

    const today = todayISO();
    const sections = [
      {
        key: "unscheduled",
        title: t("list.unscheduled"),
        description: t("list.unscheduledDescription"),
        tasks: actionTasks.filter(task => !scheduleDate(task))
      },
      {
        key: "today",
        title: t("list.today"),
        description: t("list.todayDescription"),
        tasks: actionTasks.filter(task => {
          const date = scheduleDate(task);
          return date && date <= today;
        })
      },
      {
        key: "upcoming",
        title: t("list.upcoming"),
        description: t("list.upcomingDescription"),
        tasks: actionTasks.filter(task => {
          const date = scheduleDate(task);
          return date && date > today;
        })
      }
    ];

    for (const section of sections) renderListSection(section);
  }

  function renderListSection(section) {
    const sectionEl = document.createElement("section");
    sectionEl.className = `listSection listSection-${section.key}`;

    const head = document.createElement("div");
    head.className = "listSectionHead";

    const title = document.createElement("h3");
    title.textContent = section.title;

    const count = document.createElement("span");
    count.className = "listSectionCount";
    count.textContent = t("list.count", { count: section.tasks.length });

    const description = document.createElement("p");
    description.textContent = section.description;

    head.appendChild(title);
    head.appendChild(count);
    sectionEl.appendChild(head);
    sectionEl.appendChild(description);

    if (!section.tasks.length) {
      const empty = document.createElement("div");
      empty.className = "listEmpty";
      empty.textContent = section.key === "unscheduled"
        ? t("list.emptyUnscheduled")
        : section.key === "today" ? t("list.emptyToday") : t("list.emptyUpcoming");
      sectionEl.appendChild(empty);
      listView.appendChild(sectionEl);
      return;
    }

    const groups = groupByRoot(section.tasks);
    for (const group of groups) sectionEl.appendChild(renderRootGroup(group));

    listView.appendChild(sectionEl);
  }

  function renderRootGroup(group) {
    const groupEl = document.createElement("div");
    groupEl.className = "listRootGroup";

    const rootTitle = document.createElement("div");
    rootTitle.className = "listRootTitle";
    rootTitle.textContent = group.root.title;
    groupEl.appendChild(rootTitle);

    const rows = document.createElement("div");
    rows.className = "listTaskRows";

    for (const task of group.tasks) rows.appendChild(renderTaskRow(task, group.root));

    groupEl.appendChild(rows);
    return groupEl;
  }

  function renderTaskRow(task, root) {
    const row = document.createElement("div");
    row.className = `listTaskRow ${task.status === "done" ? "done" : ""}`;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "listDoneToggle";
    toggle.textContent = task.status === "done" ? "✓" : "○";
    toggle.title = task.status === "done" ? t("list.markTodo") : t("list.markDone");
    toggle.addEventListener("click", event => {
      event.stopPropagation();
      toggleTaskStatus(task.id);
    });

    const main = document.createElement("div");
    main.className = "listTaskMain";

    const titleLine = document.createElement("div");
    titleLine.className = "listTaskTitleLine";

    const title = document.createElement("span");
    title.className = "listTaskTitle";
    title.textContent = task.title;

    const date = document.createElement("span");
    date.className = "listTaskDate";
    date.textContent = formatTaskDate(task);

    titleLine.appendChild(title);
    titleLine.appendChild(date);

    const path = document.createElement("div");
    path.className = "listTaskPath";
    path.textContent = makeTaskPath(task, root);

    main.appendChild(titleLine);
    main.appendChild(path);

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "listOpenButton";
    openButton.textContent = t("list.board");
    openButton.title = t("list.openOnBoard");
    openButton.addEventListener("click", event => {
      event.stopPropagation();
      openTaskOnBoard(task.id);
    });

    row.addEventListener("click", () => setSelected(task.id));

    row.appendChild(toggle);
    row.appendChild(main);
    row.appendChild(openButton);
    return row;
  }

  function isActionTask(task) {
    return Boolean(task.parentId && state.tasks[task.parentId]);
  }

  function toggleTaskStatus(taskId) {
    const task = state.tasks[taskId];
    if (!task || !isActionTask(task)) return;
    snapshot();
    task.status = task.status === "done" ? "todo" : "done";
    requestRender();
  }

  function openTaskOnBoard(taskId) {
    const task = state.tasks[taskId];
    if (!task) return;

    state.viewMode = "board";
    setSelected(taskId);
    requestRender();

    requestAnimationFrame(() => {
      board.scrollTo({
        left: Math.max(0, task.x - 160),
        top: Math.max(0, task.y - 140),
        behavior: "smooth"
      });
    });
  }

  function groupByRoot(tasks) {
    const map = new Map();

    for (const task of tasks) {
      const root = getRootTask(task);
      if (!map.has(root.id)) map.set(root.id, { root, tasks: [] });
      map.get(root.id).tasks.push(task);
    }

    return [...map.values()]
      .map(group => ({ ...group, tasks: group.tasks.sort(sortByListOrder) }))
      .sort((a, b) => sortByListOrder(a.root, b.root));
  }

  function getRootTask(task) {
    let current = task;
    const seen = new Set();

    while (current.parentId && state.tasks[current.parentId] && !seen.has(current.parentId)) {
      seen.add(current.id);
      current = state.tasks[current.parentId];
    }

    return current;
  }

  function makeTaskPath(task, root) {
    const names = [];
    let current = task;
    const seen = new Set();

    while (current.parentId && state.tasks[current.parentId] && !seen.has(current.parentId)) {
      seen.add(current.id);
      const parent = state.tasks[current.parentId];
      if (parent.id !== root.id) names.unshift(parent.title);
      current = parent;
    }

    return names.length ? names.join(" → ") : t("list.rootDirect");
  }

  function formatTaskDate(task) {
    const date = scheduleDate(task);
    if (!date) return t("list.noDate");
    const parts = formatDateParts(date);
    return `${parts.month}/${parts.day}`;
  }

  function sortByListOrder(a, b) {
    const dateA = scheduleDate(a) || "9999-12-31";
    const dateB = scheduleDate(b) || "9999-12-31";
    const dateDiff = dateA.localeCompare(dateB);
    if (dateDiff !== 0) return dateDiff;

    const rootA = getRootTask(a);
    const rootB = getRootTask(b);
    const rootDiff = String(rootA.title).localeCompare(String(rootB.title), window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja");
    if (rootDiff !== 0) return rootDiff;

    const depthDiff = getTaskDepth(a.id) - getTaskDepth(b.id);
    if (depthDiff !== 0) return depthDiff;

    return String(a.title).localeCompare(String(b.title), window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja");
  }

  renderListView();
})();
