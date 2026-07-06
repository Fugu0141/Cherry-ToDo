(function initListView() {
  const stage = document.querySelector(".stage");
  const toolbar = document.querySelector(".toolbar");
  const undoButton = document.getElementById("undoBtn");
  if (!stage || !toolbar || typeof requestRender !== "function") return;

  const settingsKey = "cherry-list-settings-v2";
  const labels = {
    ja: {
      scope: "範囲", allTabs: "すべてのタブ", currentTab: "現在のタブ",
      sort: "並び", dateSort: "日付順", rootSort: "ルート別",
      range: "表示", all: "すべて", unscheduled: "未定", due: "今日まで", future: "今後",
      titleDate: "実行リスト", titleRoot: "実行リスト / ルート別",
      leadDate: "すべてのタブから、日付を最優先してやることを確認できます。",
      leadRoot: "ルートを見出しとして、タスクの流れごとに確認できます。",
      empty: "条件に合うタスクはありません。", count: "{count}件", todoDone: "未完了 {todo} / 完了 {done}",
      tab: "タブ", root: "ルート", noRoot: "ルート", noDate: "未定", today: "今日",
      rootDirect: "ルート直下", board: "ボード", openOnBoard: "ボード上で見る", markTodo: "未完了に戻す", markDone: "完了にする"
    },
    en: {
      scope: "Scope", allTabs: "All tabs", currentTab: "Current tab",
      sort: "Sort", dateSort: "Date", rootSort: "Root",
      range: "Show", all: "All", unscheduled: "No date", due: "Due", future: "Upcoming",
      titleDate: "Execution list", titleRoot: "Execution list / By root",
      leadDate: "Review work from all tabs with date as the top priority.",
      leadRoot: "Review tasks grouped by root and flow.",
      empty: "No tasks match these filters.", count: "{count}", todoDone: "Todo {todo} / Done {done}",
      tab: "Tab", root: "Root", noRoot: "Root", noDate: "No date", today: "Today",
      rootDirect: "Directly under root", board: "Board", openOnBoard: "Open on board", markTodo: "Mark as todo", markDone: "Mark as done"
    }
  };

  function lang() {
    return window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja";
  }

  function l(key, values = {}) {
    const raw = labels[lang()][key] || labels.ja[key] || key;
    return raw.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
  }

  function t(key, values = {}) {
    return window.CherryI18n?.t(key, values) || key;
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(settingsKey) || "{}");
      const range = Array.isArray(saved.range) ? saved.range : (saved.range ? [saved.range] : ["all"]);
      return {
        scope: ["all", "current"].includes(saved.scope) ? saved.scope : "all",
        sort: ["date", "root"].includes(saved.sort) ? saved.sort : "date",
        range: normalizeRange(range)
      };
    } catch (_) {
      return { scope: "all", sort: "date", range: ["all"] };
    }
  }

  function normalizeRange(range) {
    const allowed = range.filter(value => ["all", "unscheduled", "due", "future"].includes(value));
    if (!allowed.length || allowed.includes("all")) return ["all"];
    return [...new Set(allowed)];
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
    window.cherryWorkspace?.closeStartPage?.();
    state.viewMode = state.viewMode === "list" ? "board" : "list";
    requestRender();
  });

  function scheduleDate(task) {
    const raw = task?.schedule?.date || task?.targetAt || "";
    const value = String(raw).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }

  function activeTabId() {
    return window.cherryWorkspace?.getActiveTabId?.() || "current";
  }

  function tabName(tab) {
    if (!tab) return l("currentTab");
    return window.cherryWorkspace?.getTabDisplayName?.(tab) || tab.name || l("currentTab");
  }

  function getSourceTabs() {
    const workspace = window.cherryWorkspace?.getWorkspace?.();
    if (!workspace?.tabs?.length || listSettings.scope === "current") {
      const active = workspace?.tabs?.find(tab => tab.id === workspace.activeTabId);
      return [{ id: activeTabId(), name: tabName(active), state }];
    }
    return workspace.tabs.map(tab => ({ id: tab.id, name: tabName(tab), state: tab.state }));
  }

  function rows() {
    const result = [];
    for (const tab of getSourceTabs()) {
      for (const task of Object.values(tab.state?.tasks || {})) {
        const root = rootOf(task, tab.state);
        const row = { tabId: tab.id, tabName: tab.name, state: tab.state, task, root, date: scheduleDate(task), depth: depthOf(task.id, tab.state) };
        if (matchesRange(row)) result.push(row);
      }
    }
    return result;
  }

  function matchesRange(row) {
    const selected = listSettings.range;
    if (selected.includes("all")) return true;
    if (!row.date && selected.includes("unscheduled")) return true;
    if (row.date && row.date <= todayISO() && selected.includes("due")) return true;
    if (row.date && row.date > todayISO() && selected.includes("future")) return true;
    return false;
  }

  function renderListView() {
    const isListMode = state.viewMode === "list";
    stage.classList.toggle("listMode", isListMode);
    listView.classList.toggle("hidden", !isListMode);
    listViewButton.classList.toggle("activeView", isListMode);
    listViewButton.textContent = isListMode ? t("list.openBoard") : t("list.openList");
    listViewButton.title = t("list.buttonTitle");
    if (!isListMode) return;

    const data = rows();
    const todoCount = data.filter(row => row.task.status !== "done").length;
    const doneCount = data.length - todoCount;

    listView.innerHTML = "";
    const header = document.createElement("div");
    header.className = "listHeader enhancedListHeader";
    header.innerHTML = `
      <div><h2></h2><p></p></div>
      <div class="listSummary"></div>
    `;
    header.querySelector("h2").textContent = listSettings.sort === "root" ? l("titleRoot") : l("titleDate");
    header.querySelector("p").textContent = listSettings.sort === "root" ? l("leadRoot") : l("leadDate");
    header.querySelector(".listSummary").textContent = l("todoDone", { todo: todoCount, done: doneCount });
    listView.appendChild(header);
    listView.appendChild(renderControls());

    if (!data.length) {
      const empty = document.createElement("div");
      empty.className = "listEmpty";
      empty.textContent = l("empty");
      listView.appendChild(empty);
      return;
    }

    if (listSettings.sort === "root") renderRootGroups(data);
    else renderDateGroups(data);
  }

  function renderControls() {
    const controls = document.createElement("div");
    controls.className = "listControls";
    controls.appendChild(renderSingleSegment(l("scope"), "scope", [["all", l("allTabs")], ["current", l("currentTab")]]));
    controls.appendChild(renderSingleSegment(l("sort"), "sort", [["date", l("dateSort")], ["root", l("rootSort")]]));
    controls.appendChild(renderRangeSegment());
    return controls;
  }

  function renderSingleSegment(label, key, options) {
    const group = document.createElement("div");
    group.className = "listControlGroup";
    group.innerHTML = `<span class="listControlLabel"></span><div class="listSegment"></div>`;
    group.querySelector(".listControlLabel").textContent = label;
    const segment = group.querySelector(".listSegment");
    options.forEach(([value, title]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = listSettings[key] === value ? "active" : "";
      button.textContent = title;
      button.addEventListener("click", () => {
        listSettings[key] = value;
        saveSettings();
        renderListView();
      });
      segment.appendChild(button);
    });
    return group;
  }

  function renderRangeSegment() {
    const group = document.createElement("div");
    group.className = "listControlGroup";
    group.innerHTML = `<span class="listControlLabel"></span><div class="listSegment listRangeSegment"></div>`;
    group.querySelector(".listControlLabel").textContent = l("range");
    const segment = group.querySelector(".listSegment");
    [["all", l("all")], ["unscheduled", l("unscheduled")], ["due", l("due")], ["future", l("future")]].forEach(([value, title]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = listSettings.range.includes(value) ? "active" : "";
      button.textContent = title;
      button.addEventListener("click", () => {
        if (value === "all") {
          listSettings.range = ["all"];
        } else {
          const current = listSettings.range.filter(item => item !== "all");
          if (current.includes(value)) listSettings.range = current.filter(item => item !== value);
          else listSettings.range = [...current, value];
          if (!listSettings.range.length) listSettings.range = ["all"];
        }
        listSettings.range = normalizeRange(listSettings.range);
        saveSettings();
        renderListView();
      });
      segment.appendChild(button);
    });
    return group;
  }

  function renderDateGroups(data) {
    const sorted = data.slice().sort(sortByDate);
    const grouped = new Map();
    sorted.forEach(row => {
      const key = row.date || "__none";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });
    grouped.forEach((groupRows, key) => {
      const section = document.createElement("section");
      section.className = "listSection listDateSection";
      section.innerHTML = `<div class="listSectionHead"><h3></h3><span class="listSectionCount"></span></div><div class="listTaskRows"></div>`;
      section.querySelector("h3").textContent = dateGroupTitle(key);
      section.querySelector(".listSectionCount").textContent = l("count", { count: groupRows.length });
      const container = section.querySelector(".listTaskRows");
      groupRows.forEach(row => container.appendChild(taskRow(row, { showTab: listSettings.scope === "all", showRoot: true })));
      listView.appendChild(section);
    });
  }

  function renderRootGroups(data) {
    const sorted = data.slice().sort(sortByRoot);
    const grouped = new Map();
    sorted.forEach(row => {
      const key = `${row.tabId}:${row.root?.id || "root"}`;
      if (!grouped.has(key)) grouped.set(key, { row, rows: [] });
      grouped.get(key).rows.push(row);
    });
    grouped.forEach(group => {
      const groupEl = document.createElement("div");
      groupEl.className = "listRootGroup";
      const title = document.createElement("div");
      title.className = "listRootTitle";
      title.textContent = listSettings.scope === "all" ? `${group.row.tabName} / ${group.row.root?.title || l("noRoot")}` : group.row.root?.title || l("noRoot");
      const container = document.createElement("div");
      container.className = "listTaskRows";
      group.rows.forEach(row => container.appendChild(taskRow(row, { showTab: false, showRoot: false })));
      groupEl.appendChild(title);
      groupEl.appendChild(container);
      listView.appendChild(groupEl);
    });
  }

  function taskRow(row, options) {
    const el = document.createElement("div");
    el.className = `listTaskRow ${row.task.status === "done" ? "done" : ""}`;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "listDoneToggle";
    toggle.textContent = row.task.status === "done" ? "✓" : "○";
    toggle.title = row.task.status === "done" ? l("markTodo") : l("markDone");
    toggle.addEventListener("click", event => {
      event.stopPropagation();
      toggleDone(row);
    });

    const main = document.createElement("div");
    main.className = "listTaskMain";
    const titleLine = document.createElement("div");
    titleLine.className = "listTaskTitleLine";
    const title = document.createElement("span");
    title.className = "listTaskTitle";
    title.textContent = row.task.title;
    const date = document.createElement("span");
    date.className = "listTaskDate";
    date.textContent = row.date ? dateLabel(row.date) : l("noDate");
    titleLine.appendChild(title);
    titleLine.appendChild(date);
    const path = document.createElement("div");
    path.className = "listTaskPath";
    const meta = [];
    if (options.showTab) meta.push(`${l("tab")}: ${row.tabName}`);
    if (options.showRoot && row.root) meta.push(`${l("root")}: ${row.root.title}`);
    const branchPath = taskPath(row.task, row.root, row.state);
    if (branchPath) meta.push(branchPath);
    path.textContent = meta.join(" / ") || l("rootDirect");
    main.appendChild(titleLine);
    main.appendChild(path);

    const open = document.createElement("button");
    open.type = "button";
    open.className = "listOpenButton";
    open.textContent = l("board");
    open.title = l("openOnBoard");
    open.addEventListener("click", event => {
      event.stopPropagation();
      openOnBoard(row);
    });
    el.addEventListener("click", () => openOnBoard(row));
    el.appendChild(toggle);
    el.appendChild(main);
    el.appendChild(open);
    return el;
  }

  function toggleDone(row) {
    window.cherryWorkspace?.updateTabState?.(row.tabId, tabState => {
      const task = tabState.tasks?.[row.task.id];
      if (task) task.status = task.status === "done" ? "todo" : "done";
    });
    if (!window.cherryWorkspace?.updateTabState) {
      const task = state.tasks?.[row.task.id];
      if (task) {
        snapshot();
        task.status = task.status === "done" ? "todo" : "done";
        requestRender();
      }
    }
    renderListView();
  }

  function openOnBoard(row) {
    if (row.tabId !== activeTabId()) window.cherryWorkspace?.openTab?.(row.tabId);
    document.querySelector(".stage")?.classList.remove("startPageMode");
    state.viewMode = "board";
    requestAnimationFrame(() => {
      const task = state.tasks?.[row.task.id];
      if (!task) return;
      setSelected(task.id);
      requestRender();
      requestAnimationFrame(() => board.scrollTo({ left: Math.max(0, task.x - 160), top: Math.max(0, task.y - 140), behavior: "smooth" }));
    });
  }

  function rootOf(task, sourceState) {
    let current = task;
    const seen = new Set();
    while (current?.parentId && sourceState.tasks?.[current.parentId] && !seen.has(current.parentId)) {
      seen.add(current.id);
      current = sourceState.tasks[current.parentId];
    }
    return current || task;
  }

  function depthOf(taskId, sourceState) {
    let depth = 0;
    let current = sourceState.tasks?.[taskId];
    const seen = new Set();
    while (current?.parentId && sourceState.tasks?.[current.parentId] && !seen.has(current.parentId)) {
      seen.add(current.id);
      depth += 1;
      current = sourceState.tasks[current.parentId];
    }
    return depth;
  }

  function taskPath(task, root, sourceState) {
    const names = [];
    let current = task;
    const seen = new Set();
    while (current?.parentId && sourceState.tasks?.[current.parentId] && !seen.has(current.parentId)) {
      seen.add(current.id);
      const parent = sourceState.tasks[current.parentId];
      if (parent.id !== root.id) names.unshift(parent.title);
      current = parent;
    }
    return names.length ? names.join(" → ") : l("rootDirect");
  }

  function dateLabel(date) {
    const [, month, day] = date.split("-").map(Number);
    return `${month}/${day}`;
  }

  function dateGroupTitle(key) {
    if (key === "__none") return l("noDate");
    const label = dateLabel(key);
    return key === todayISO() ? `${label} · ${l("today")}` : label;
  }

  function sortByDate(a, b) {
    const dateDiff = (a.date || "0000-00-00").localeCompare(b.date || "0000-00-00");
    if (dateDiff) return dateDiff;
    return `${a.tabName} ${a.root?.title || ""} ${a.task.title}`.localeCompare(`${b.tabName} ${b.root?.title || ""} ${b.task.title}`, lang());
  }

  function sortByRoot(a, b) {
    const rootDiff = `${a.tabName} ${a.root?.title || ""}`.localeCompare(`${b.tabName} ${b.root?.title || ""}`, lang());
    if (rootDiff) return rootDiff;
    const dateDiff = (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31");
    if (dateDiff) return dateDiff;
    const depthDiff = a.depth - b.depth;
    if (depthDiff) return depthDiff;
    return String(a.task.title).localeCompare(String(b.task.title), lang());
  }

  renderListView();
})();
