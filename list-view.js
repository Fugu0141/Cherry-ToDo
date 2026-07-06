(function initListView() {
  const stage = document.querySelector(".stage");
  const toolbar = document.querySelector(".toolbar");
  const undoButton = document.getElementById("undoBtn");

  if (!stage || !toolbar || typeof getTasks !== "function" || typeof requestRender !== "function") return;

  const settingsKey = "cherry-list-settings-v1";
  const fallbackCopy = {
    ja: {
      scope: "範囲",
      allTabs: "すべてのタブ",
      currentTab: "現在のタブ",
      sort: "並び",
      dateSort: "日付順",
      rootSort: "ルート別",
      range: "表示",
      all: "すべて",
      unscheduled: "未定",
      due: "今日まで",
      future: "今後",
      titleDate: "実行リスト",
      titleRoot: "実行リスト / ルート別",
      leadDate: "すべてのタブから、日付順でやることを確認できます。",
      leadRoot: "ルートを見出しとして、タスクの流れごとに確認できます。",
      tabLabel: "タブ",
      rootLabel: "ルート",
      noRoot: "ルート",
      noDateGroup: "未定",
      dateGroupToday: "今日",
      empty: "条件に合うタスクはありません。",
      count: "{count}件",
      todoDone: "未完了 {todo} / 完了 {done}",
      rootDirect: "ルート直下",
      board: "ボード",
      openOnBoard: "ボード上で見る",
      markTodo: "未完了に戻す",
      markDone: "完了にする"
    },
    en: {
      scope: "Scope",
      allTabs: "All tabs",
      currentTab: "Current tab",
      sort: "Sort",
      dateSort: "Date",
      rootSort: "Root",
      range: "Show",
      all: "All",
      unscheduled: "No date",
      due: "Due",
      future: "Upcoming",
      titleDate: "Execution list",
      titleRoot: "Execution list / By root",
      leadDate: "Review tasks from all tabs in date order.",
      leadRoot: "Review tasks grouped by root and flow.",
      tabLabel: "Tab",
      rootLabel: "Root",
      noRoot: "Root",
      noDateGroup: "No date",
      dateGroupToday: "Today",
      empty: "No tasks match these filters.",
      count: "{count}",
      todoDone: "Todo {todo} / Done {done}",
      rootDirect: "Directly under root",
      board: "Board",
      openOnBoard: "Open on board",
      markTodo: "Mark as todo",
      markDone: "Mark as done"
    }
  };

  function lang() {
    return window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja";
  }

  function text(key, values = {}) {
    const raw = fallbackCopy[lang()][key] || fallbackCopy.ja[key] || key;
    return raw.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
  }

  function t(key, values = {}) {
    return window.CherryI18n?.t(key, values) || key;
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(settingsKey) || "{}");
      return {
        scope: ["all", "current"].includes(saved.scope) ? saved.scope : "all",
        sort: ["date", "root"].includes(saved.sort) ? saved.sort : "date",
        range: ["all", "unscheduled", "due", "future"].includes(saved.range) ? saved.range : "all"
      };
    } catch (_) {
      return { scope: "all", sort: "date", range: "all" };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(settingsKey, JSON.stringify(listSettings));
    } catch (_) {
      // Non-critical.
    }
  }

  const listSettings = loadSettings();

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
  window.addEventListener("cherry-workspace-updated", () => renderListView());

  listViewButton.addEventListener("click", () => {
    document.querySelector(".stage")?.classList.remove("startPageMode");
    state.viewMode = state.viewMode === "list" ? "board" : "list";
    requestRender();
  });

  function ownNormalizeDate(value) {
    const raw = typeof value === "string" ? value.slice(0, 10) : "";
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
  }

  function scheduleDate(task) {
    if (task?.schedule?.type === "date" || task?.schedule?.type === "datetime") {
      return ownNormalizeDate(task.schedule.date || task.targetAt);
    }
    return ownNormalizeDate(task?.targetAt);
  }

  function activeTabId() {
    return window.cherryWorkspace?.getActiveTabId?.() || "current";
  }

  function currentTabName() {
    const workspace = window.cherryWorkspace?.getWorkspace?.();
    const active = workspace?.tabs?.find(tab => tab.id === workspace.activeTabId);
    return active ? tabDisplayName(active) : text("currentTab");
  }

  function tabDisplayName(tab) {
    if (!tab) return text("currentTab");
    if (window.cherryWorkspace?.getTabDisplayName) return window.cherryWorkspace.getTabDisplayName(tab);
    if (tab.systemNameKey) return t(tab.systemNameKey);
    return tab.name || text("currentTab");
  }

  function getSourceTabs() {
    const workspace = window.cherryWorkspace?.getWorkspace?.();
    if (!workspace?.tabs?.length || listSettings.scope === "current") {
      return [{ id: activeTabId(), name: currentTabName(), state }];
    }
    return workspace.tabs.map(tab => ({ id: tab.id, name: tabDisplayName(tab), state: tab.state }));
  }

  function collectRows() {
    const rows = [];
    for (const tab of getSourceTabs()) {
      const tasks = Object.values(tab.state?.tasks || {});
      for (const task of tasks) {
        const root = getRootTask(task, tab.state);
        const row = {
          tabId: tab.id,
          tabName: tab.name,
          task,
          root,
          date: scheduleDate(task),
          path: makeTaskPath(task, root, tab.state),
          depth: getTaskDepthInState(task.id, tab.state)
        };
        if (matchesRange(row)) rows.push(row);
      }
    }
    return rows;
  }

  function matchesRange(row) {
    if (listSettings.range === "all") return true;
    if (listSettings.range === "unscheduled") return !row.date;
    if (listSettings.range === "due") return row.date && row.date <= todayISO();
    if (listSettings.range === "future") return row.date && row.date > todayISO();
    return true;
  }

  function renderListView() {
    const isListMode = state.viewMode === "list";
    stage.classList.toggle("listMode", isListMode);
    listView.classList.toggle("hidden", !isListMode);
    listViewButton.classList.toggle("activeView", isListMode);
    listViewButton.textContent = isListMode ? t("list.openBoard") : t("list.openList");
    listViewButton.title = t("list.buttonTitle");

    if (!isListMode) return;

    const rows = collectRows();
    const todoCount = rows.filter(row => row.task.status !== "done").length;
    const doneCount = rows.length - todoCount;

    listView.innerHTML = "";
    listView.setAttribute("aria-label", t("list.title"));

    const header = document.createElement("div");
    header.className = "listHeader enhancedListHeader";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = listSettings.sort === "root" ? text("titleRoot") : text("titleDate");
    const lead = document.createElement("p");
    lead.textContent = listSettings.sort === "root" ? text("leadRoot") : text("leadDate");
    titleWrap.appendChild(title);
    titleWrap.appendChild(lead);

    const summary = document.createElement("div");
    summary.className = "listSummary";
    summary.textContent = text("todoDone", { todo: todoCount, done: doneCount });

    header.appendChild(titleWrap);
    header.appendChild(summary);
    listView.appendChild(header);
    listView.appendChild(renderControls());

    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "listEmpty";
      empty.textContent = text("empty");
      listView.appendChild(empty);
      return;
    }

    if (listSettings.sort === "root") renderRootSorted(rows);
    else renderDateSorted(rows);
  }

  function renderControls() {
    const controls = document.createElement("div");
    controls.className = "listControls";
    controls.appendChild(renderSegment(text("scope"), "scope", [
      ["all", text("allTabs")],
      ["current", text("currentTab")]
    ]));
    controls.appendChild(renderSegment(text("sort"), "sort", [
      ["date", text("dateSort")],
      ["root", text("rootSort")]
    ]));
    controls.appendChild(renderSegment(text("range"), "range", [
      ["all", text("all")],
      ["unscheduled", text("unscheduled")],
      ["due", text("due")],
      ["future", text("future")]
    ]));
    return controls;
  }

  function renderSegment(label, key, options) {
    const group = document.createElement("div");
    group.className = "listControlGroup";

    const labelEl = document.createElement("span");
    labelEl.className = "listControlLabel";
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const buttons = document.createElement("div");
    buttons.className = "listSegment";
    for (const [value, title] of options) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = value === listSettings[key] ? "active" : "";
      button.textContent = title;
      button.addEventListener("click", () => {
        listSettings[key] = value;
        saveSettings();
        renderListView();
      });
      buttons.appendChild(button);
    }
    group.appendChild(buttons);
    return group;
  }

  function renderDateSorted(rows) {
    const sorted = rows.slice().sort(sortRowsByDate);
    const groups = new Map();
    for (const row of sorted) {
      const key = row.date || "__unscheduled";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }

    for (const [key, groupRows] of groups) {
      const section = document.createElement("section");
      section.className = "listSection listDateSection";
      const head = document.createElement("div");
      head.className = "listSectionHead";
      const title = document.createElement("h3");
      title.textContent = formatDateGroupTitle(key);
      const count = document.createElement("span");
      count.className = "listSectionCount";
      count.textContent = text("count", { count: groupRows.length });
      head.appendChild(title);
      head.appendChild(count);
      section.appendChild(head);

      const container = document.createElement("div");
      container.className = "listTaskRows";
      for (const row of groupRows) container.appendChild(renderTaskRow(row, { showTab: listSettings.scope === "all", showRoot: true }));
      section.appendChild(container);
      listView.appendChild(section);
    }
  }

  function renderRootSorted(rows) {
    const sorted = rows.slice().sort(sortRowsByRoot);
    const groups = new Map();
    for (const row of sorted) {
      const key = `${row.tabId}:${row.root?.id || "root"}`;
      if (!groups.has(key)) groups.set(key, { tabName: row.tabName, root: row.root, rows: [] });
      groups.get(key).rows.push(row);
    }

    for (const group of groups.values()) {
      const groupEl = document.createElement("div");
      groupEl.className = "listRootGroup";

      const rootTitle = document.createElement("div");
      rootTitle.className = "listRootTitle";
      rootTitle.textContent = listSettings.scope === "all"
        ? `${group.tabName} / ${group.root?.title || text("noRoot")}`
        : group.root?.title || text("noRoot");
      groupEl.appendChild(rootTitle);

      const rowsEl = document.createElement("div");
      rowsEl.className = "listTaskRows";
      for (const row of group.rows) rowsEl.appendChild(renderTaskRow(row, { showTab: false, showRoot: false }));
      groupEl.appendChild(rowsEl);
      listView.appendChild(groupEl);
    }
  }

  function renderTaskRow(row, options = {}) {
    const { task, tabId } = row;
    const el = document.createElement("div");
    el.className = `listTaskRow ${task.status === "done" ? "done" : ""}`;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "listDoneToggle";
    toggle.textContent = task.status === "done" ? "✓" : "○";
    toggle.title = task.status === "done" ? text("markTodo") : text("markDone");
    toggle.addEventListener("click", event => {
      event.stopPropagation();
      toggleTaskStatus(row);
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
    date.textContent = row.date ? formatDateLabel(row.date) : text("unscheduled");

    titleLine.appendChild(title);
    titleLine.appendChild(date);

    const path = document.createElement("div");
    path.className = "listTaskPath";
    const meta = [];
    if (options.showTab) meta.push(`${text("tabLabel")}: ${row.tabName}`);
    if (options.showRoot && row.root) meta.push(`${text("rootLabel")}: ${row.root.title}`);
    if (row.path) meta.push(row.path);
    path.textContent = meta.join(" / ") || text("rootDirect");

    main.appendChild(titleLine);
    main.appendChild(path);

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "listOpenButton";
    openButton.textContent = text("board");
    openButton.title = text("openOnBoard");
    openButton.addEventListener("click", event => {
      event.stopPropagation();
      openTaskOnBoard(tabId, task.id);
    });

    el.addEventListener("click", () => openTaskOnBoard(tabId, task.id));
    el.appendChild(toggle);
    el.appendChild(main);
    el.appendChild(openButton);
    return el;
  }

  function toggleTaskStatus(row) {
    if (window.cherryWorkspace?.updateTabState) {
      window.cherryWorkspace.updateTabState(row.tabId, tabState => {
        const task = tabState.tasks?.[row.task.id];
        if (task) task.status = task.status === "done" ? "todo" : "done";
      });
      renderListView();
      return;
    }

    const task = state.tasks[row.task.id];
    if (!task) return;
    snapshot();
    task.status = task.status === "done" ? "todo" : "done";
    requestRender();
  }

  function openTaskOnBoard(tabId, taskId) {
    const current = activeTabId();
    if (tabId !== current && window.cherryWorkspace?.openTab) {
      window.cherryWorkspace.openTab(tabId);
    } else {
      document.querySelector(".stage")?.classList.remove("startPageMode");
      state.viewMode = "board";
    }

    requestAnimationFrame(() => {
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
    });
  }

  function getTaskDepthInState(taskId, sourceState) {
    let depth = 0;
    let task = sourceState.tasks?.[taskId];
    const seen = new Set();
    while (task && task.parentId && sourceState.tasks?.[task.parentId] && !seen.has(task.parentId)) {
      seen.add(task.id);
      depth += 1;
      task = sourceState.tasks[task.parentId];
    }
    return depth;
  }

  function getRootTask(task, sourceState) {
    let current = task;
    const seen = new Set();
    while (current?.parentId && sourceState.tasks?.[current.parentId] && !seen.has(current.parentId)) {
      seen.add(current.id);
      current = sourceState.tasks[current.parentId];
    }
    return current || task;
  }

  function makeTaskPath(task, root, sourceState) {
    const names = [];
    let current = task;
    const seen = new Set();
    while (current?.parentId && sourceState.tasks?.[current.parentId] && !seen.has(current.parentId)) {
      seen.add(current.id);
      const parent = sourceState.tasks[current.parentId];
      if (parent.id !== root.id) names.unshift(parent.title);
      current = parent;
    }
    return names.length ? names.join(" → ") : text("rootDirect");
  }

  function formatDateLabel(date) {
    const [year, month, day] = date.split("-").map(Number);
    return `${month}/${day}`;
  }

  function formatDateGroupTitle(key) {
    if (key === "__unscheduled") return text("noDateGroup");
    const label = formatDateLabel(key);
    return key === todayISO() ? `${label} · ${text("dateGroupToday")}` : label;
  }

  function sortRowsByDate(a, b) {
    const dateA = a.date || "0000-00-00";
    const dateB = b.date || "0000-00-00";
    const dateDiff = dateA.localeCompare(dateB);
    if (dateDiff !== 0) return dateDiff;
    const tabDiff = String(a.tabName).localeCompare(String(b.tabName), lang());
    if (tabDiff !== 0) return tabDiff;
    const rootDiff = String(a.root?.title || "").localeCompare(String(b.root?.title || ""), lang());
    if (rootDiff !== 0) return rootDiff;
    return String(a.task.title).localeCompare(String(b.task.title), lang());
  }

  function sortRowsByRoot(a, b) {
    const tabDiff = String(a.tabName).localeCompare(String(b.tabName), lang());
    if (tabDiff !== 0) return tabDiff;
    const rootDiff = String(a.root?.title || "").localeCompare(String(b.root?.title || ""), lang());
    if (rootDiff !== 0) return rootDiff;
    const dateA = a.date || "9999-12-31";
    const dateB = b.date || "9999-12-31";
    const dateDiff = dateA.localeCompare(dateB);
    if (dateDiff !== 0) return dateDiff;
    const depthDiff = a.depth - b.depth;
    if (depthDiff !== 0) return depthDiff;
    return String(a.task.title).localeCompare(String(b.task.title), lang());
  }

  renderListView();
})();
