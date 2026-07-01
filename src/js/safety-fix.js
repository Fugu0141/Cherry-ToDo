(() => {
  const STORAGE_KEYS = [
    "quest-sticky-todo-v10",
    "quest-sticky-todo-v9",
    "quest-sticky-todo-v8",
    "quest-sticky-todo-v6",
    "quest-sticky-todo-v5",
    "quest-sticky-todo-v4",
    "quest-sticky-todo-v3",
    "quest-sticky-todo-v2"
  ];

  const collapsedDoneDatesKey = "quest-sticky-collapsed-done-dates-v2";
  const compactHGap = 132;
  const compactVGap = 92;

  const originalDeleteTask = typeof deleteTask === "function" ? deleteTask : null;
  const originalSetSelected = typeof setSelected === "function" ? setSelected : null;

  let collapsedDoneDates = new Set();
  try {
    collapsedDoneDates = new Set(JSON.parse(localStorage.getItem(collapsedDoneDatesKey) || "[]"));
  } catch {
    collapsedDoneDates = new Set();
  }

  // v13 used the opposite meaning and auto-collapsed completed dates.
  // Drop it so completing the middle task in a chain does not suddenly compress the lane.
  localStorage.removeItem("quest-sticky-expanded-done-dates-v1");

  function saveCollapsedDoneDates() {
    localStorage.setItem(collapsedDoneDatesKey, JSON.stringify([...collapsedDoneDates]));
  }

  function emptyInitialState() {
    return { tasks: {}, showLanes: true };
  }

  function hasSavedData() {
    return STORAGE_KEYS.some(key => localStorage.getItem(key));
  }

  function looksLikeSampleState() {
    const ids = Object.keys(state?.tasks || {}).sort().join(",");
    return ids === "a,b,c,d,root" && state.tasks.root?.title === "数IIIテスト勉強";
  }

  function tasksOnDate(date) {
    const normalized = normalizeDate(date);
    return getTasks().filter(task => normalizeDate(task.targetAt) === normalized);
  }

  function isDateComplete(date) {
    const tasks = tasksOnDate(date);
    return tasks.length > 0 && tasks.every(task => task.status === "done");
  }

  function isDateCollapsed(date) {
    const normalized = normalizeDate(date);
    if (normalized === todayISO()) return false;
    return isDateComplete(normalized) && collapsedDoneDates.has(normalized);
  }

  function dateSpan(date) {
    if (isVerticalMode()) return isDateCollapsed(date) ? compactVGap : vDateGap;
    return isDateCollapsed(date) ? compactHGap : hDateGap;
  }

  function dateToneClass(date) {
    const today = todayISO();
    const normalized = normalizeDate(date);
    if (isDateCollapsed(normalized)) return "collapsedDoneLane";
    if (normalized === today) return "todayLane";
    return normalized < today ? "pastLane" : "futureLane";
  }

  function taskToneClass(task) {
    if (task.status === "done") return "doneTask";
    const date = normalizeDate(task.targetAt);
    const today = todayISO();
    if (date < today) return "overdueTask";
    if (date === today) return "todayTask";
    return "futureTask";
  }

  function collectRelatedIds(taskId) {
    const related = new Set();
    if (!taskId || !state.tasks[taskId]) return related;

    let current = state.tasks[taskId];
    while (current) {
      related.add(current.id);
      current = current.parentId ? state.tasks[current.parentId] : null;
    }

    const walk = id => {
      for (const child of getChildren(id)) {
        related.add(child.id);
        walk(child.id);
      }
    };
    walk(taskId);
    return related;
  }

  function clampBoardScroll() {
    const maxLeft = Math.max(0, contentWidth - board.clientWidth);
    const maxTop = Math.max(0, contentHeight - board.clientHeight);
    if (board.scrollLeft > maxLeft) board.scrollLeft = maxLeft;
    if (board.scrollTop > maxTop) board.scrollTop = maxTop;
  }

  function lineHitTolerance() {
    return isVerticalMode()
      ? Math.max(34, noteH * 0.42)
      : Math.max(50, noteW * 0.23);
  }

  function toggleDoneDate(date) {
    const normalized = normalizeDate(date);
    if (!isDateComplete(normalized)) return;

    if (collapsedDoneDates.has(normalized)) collapsedDoneDates.delete(normalized);
    else collapsedDoneDates.add(normalized);

    saveCollapsedDoneDates();
    snapshot();
    branchLayout();
    requestRender();
  }

  makeInitialState = emptyInitialState;

  if (!hasSavedData() && looksLikeSampleState()) {
    state = makeInitialState();
    selectedId = null;
    refreshLaneDates();
    branchLayout();
    render();
    saveNow();
  }

  hDateLineX = function(date) {
    const target = normalizeDate(date);
    let x = hAxisLeft;
    for (const laneDate of getLaneDates()) {
      if (laneDate === target) return x;
      x += dateSpan(laneDate);
    }
    return x;
  };

  hDateToX = function(date) {
    return hDateLineX(date) + (isDateCollapsed(date) ? 24 : 34);
  };

  hEndLineX = function() {
    let x = hAxisLeft;
    for (const laneDate of getLaneDates()) x += dateSpan(laneDate);
    return x;
  };

  vDateLineY = function(date) {
    const target = normalizeDate(date);
    let y = vAxisTop;
    for (const laneDate of getLaneDates()) {
      if (laneDate === target) return y;
      y += dateSpan(laneDate);
    }
    return y;
  };

  vDateToY = function(date) {
    return vDateLineY(date) + (isDateCollapsed(date) ? 20 : vTaskTopOffset);
  };

  vEndLineY = function() {
    let y = vAxisTop;
    for (const laneDate of getLaneDates()) y += dateSpan(laneDate);
    return y;
  };

  hitTestDateArea = function(noteMainStart) {
    if (!state.showLanes) return { kind: "none", date: null };

    const lanes = getLaneDates();
    if (!lanes.length) return { kind: "blank", date: todayISO() };

    const tolerance = lineHitTolerance();

    if (isVerticalMode()) {
      const anchorY = noteMainStart + noteH / 2;
      let nearestLine = null;
      let nearestLineDistance = Infinity;

      for (const date of lanes) {
        const dist = Math.abs(anchorY - vDateLineY(date));
        if (dist < nearestLineDistance) {
          nearestLineDistance = dist;
          nearestLine = date;
        }
      }

      if (nearestLineDistance <= tolerance) return { kind: "line", date: nearestLine };

      for (const date of lanes) {
        const top = vDateLineY(date);
        const bottom = top + dateSpan(date);
        if (anchorY >= top && anchorY < bottom) return { kind: "lane", date };
      }

      if (anchorY >= vEndLineY()) return { kind: "blank", date: lanes.at(-1) };
      return { kind: "lane", date: lanes[0] };
    }

    const anchorX = noteMainStart + noteW / 2;
    let nearestLine = null;
    let nearestLineDistance = Infinity;

    for (const date of lanes) {
      const dist = Math.abs(anchorX - hDateLineX(date));
      if (dist < nearestLineDistance) {
        nearestLineDistance = dist;
        nearestLine = date;
      }
    }

    if (nearestLineDistance <= tolerance) return { kind: "line", date: nearestLine };

    for (const date of lanes) {
      const left = hDateLineX(date);
      const right = left + dateSpan(date);
      if (anchorX >= left && anchorX < right) return { kind: "lane", date };
    }

    if (anchorX >= hEndLineX()) return { kind: "blank", date: lanes.at(-1) };
    return { kind: "lane", date: lanes[0] };
  };

  renderLanes = function() {
    lanesEl.innerHTML = "";
    if (dateHud) dateHud.innerHTML = "";
    if (!state.showLanes) return;

    const laneFragment = document.createDocumentFragment();
    const labelFragment = document.createDocumentFragment();
    const lanes = getLaneDates();
    const activeDate = activeTodayBandDate();

    lanes.forEach((date, index) => {
      const prev = lanes[index - 1];
      const isMonthStart = index === 0 || !sameMonth(prev, date);
      const isTodayBand = date === activeDate;
      const isTodayLine = date === todayISO();
      const collapsed = isDateCollapsed(date);
      const complete = isDateComplete(date);
      const count = tasksOnDate(date).length;
      const tone = dateToneClass(date);
      const parts = formatDateParts(date);
      const span = dateSpan(date);

      const band = document.createElement("div");
      band.className = `laneBand ${tone} ${collapsed ? "collapsedLane" : ""} ${isTodayBand ? "todayBand" : ""} ${hotLaneDate === date ? "highlight" : ""}`;

      const line = document.createElement("div");
      line.className = `laneLine ${tone} ${collapsed ? "collapsedLane" : ""} ${isTodayLine ? "todayLine" : ""} ${hotLineDate === date ? "hot" : ""}`;

      const label = document.createElement("div");
      label.className = `laneLabel ${tone} ${complete ? "completeDate" : ""} ${collapsed ? "collapsedDate" : ""} ${isTodayLine ? "todayLabel" : ""} ${isMonthStart ? "monthStart" : ""}`;
      label.innerHTML = collapsed
        ? `<div class="laneMonthTitle">${parts.monthName}</div><div class="laneDay">${parts.day}</div><div class="laneStatus">完了 ${count}</div>`
        : isMonthStart
          ? `<div class="laneMonthTitle">${parts.monthName}</div><div class="laneDay">${parts.day}</div>`
          : `<div class="laneDay">${parts.day}</div><div class="laneMonth">${parts.monthName}</div>`;

      if (complete) {
        label.title = collapsed ? "クリックで完了タスクを展開" : "クリックで完了タスクを折り畳み";
        label.addEventListener("click", event => {
          event.stopPropagation();
          toggleDoneDate(date);
        });
      }

      if (isVerticalMode()) {
        const y = vDateLineY(date);
        band.style.top = `${y}px`;
        band.style.height = `${span}px`;
        line.style.top = `${y}px`;
        label.style.top = `${y + 8}px`;
        label.style.left = "10px";
      } else {
        const x = hDateLineX(date);
        band.style.left = `${x}px`;
        band.style.width = `${span}px`;
        line.style.left = `${x}px`;
        label.style.left = `${x + 12}px`;
        label.style.top = "12px";
      }

      laneFragment.appendChild(band);
      laneFragment.appendChild(line);
      labelFragment.appendChild(label);
    });

    const endLine = document.createElement("div");
    endLine.className = "laneLine laneEndLine";
    if (isVerticalMode()) endLine.style.top = `${vEndLineY()}px`;
    else endLine.style.left = `${hEndLineX()}px`;
    laneFragment.appendChild(endLine);

    lanesEl.appendChild(laneFragment);
    if (dateHud) dateHud.appendChild(labelFragment);
    syncStickyDateLabels();
  };

  renderLinks = function() {
    previewPath = null;
    links.innerHTML = "";
    links.setAttribute("width", String(contentWidth));
    links.setAttribute("height", String(contentHeight));

    const fragment = document.createDocumentFragment();
    const related = collectRelatedIds(selectedId);

    for (const task of getTasks()) {
      if (!task.parentId || !state.tasks[task.parentId]) continue;
      const parent = state.tasks[task.parentId];
      const path = makeBranchPath(parent, task, "#191919", 4, "");
      path.classList.add("linkPath");

      if (isDateCollapsed(parent.targetAt) || isDateCollapsed(task.targetAt)) {
        path.classList.add("collapsedLink");
      } else if (selectedId && related.has(parent.id) && related.has(task.id)) {
        path.classList.add("focusedLink");
      } else if (selectedId) {
        path.classList.add("mutedLink");
      } else if (task.status === "done" && parent.status === "done") {
        path.classList.add("doneLink");
      } else {
        path.classList.add("defaultLink");
      }

      fragment.appendChild(path);
    }

    links.appendChild(fragment);
  };

  renderNotes = function() {
    notesEl.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for (const task of getTasks()) {
      const collapsed = isDateCollapsed(task.targetAt);
      const el = document.createElement("div");
      el.className = `note ${taskToneClass(task)} ${collapsed ? "collapsedTask" : ""} ${task.status === "done" ? "done" : ""} ${task.id === selectedId ? "selected" : ""}`;
      el.dataset.id = task.id;
      setObjectPos(el, task.x, task.y);

      const text = document.createElement("div");
      text.className = "noteText";
      text.textContent = task.title;
      el.appendChild(text);

      const deleteControl = document.createElement("div");
      deleteControl.className = "deleteBtn";
      deleteControl.textContent = "×";
      deleteControl.title = "削除";
      deleteControl.addEventListener("pointerdown", event => event.stopPropagation());
      deleteControl.addEventListener("click", event => {
        event.stopPropagation();
        deleteTask(task.id);
      });
      el.appendChild(deleteControl);

      const done = document.createElement("div");
      done.className = "doneBtn";
      done.textContent = task.status === "done" ? "✓" : "○";
      done.title = "完了切替";
      done.addEventListener("pointerdown", event => event.stopPropagation());
      done.addEventListener("click", event => {
        event.stopPropagation();
        snapshot();
        task.status = task.status === "done" ? "todo" : "done";
        if (task.status !== "done") collapsedDoneDates.delete(normalizeDate(task.targetAt));
        saveCollapsedDoneDates();
        branchLayout();
        requestRender();
      });
      el.appendChild(done);

      const handle = document.createElement("div");
      handle.className = "handle";
      handle.textContent = "+";
      handle.title = isVerticalMode() ? "タップで同じブランチに追加" : "右へ引くと同じブランチ / 下へずらすと分岐";
      handle.addEventListener("pointerdown", onHandlePointerDown);
      el.appendChild(handle);

      el.addEventListener("pointerdown", onNotePointerDown);
      el.addEventListener("dblclick", () => openEditTaskModal(task.id));

      fragment.appendChild(el);
    }

    notesEl.appendChild(fragment);
  };

  if (originalSetSelected) {
    setSelected = function(id) {
      originalSetSelected(id);
      renderLinks();
    };
  }

  if (originalDeleteTask) {
    deleteTask = function(taskId = selectedId) {
      const task = state.tasks?.[taskId];
      if (!task) return;
      const ok = confirm(`「${task.title}」を削除しますか？\n\n子タスクは親側につなぎ直されます。`);
      if (!ok) return;
      originalDeleteTask(taskId);
      clampBoardScroll();
    };
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const ok = confirm("すべてのタスクを削除して、空の状態に戻しますか？");
      if (!ok) return;

      snapshot();
      state = makeInitialState();
      selectedId = null;
      undoStack = [];
      collapsedDoneDates.clear();
      saveCollapsedDoneDates();
      STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
      refreshLaneDates();
      branchLayout();
      render();
      saveNow();
      board.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    }, true);
  }

  ensureContentSize = function() {
    refreshLaneDates();
    currentMode = getLayoutMode();
    board.classList.toggle("verticalMode", isVerticalMode());
    board.classList.toggle("horizontalMode", !isVerticalMode());
    syncMetrics();

    const viewW = Math.max(1, board.clientWidth || window.innerWidth || 360);
    const viewH = Math.max(1, board.clientHeight || window.innerHeight || 520);
    let farX = viewW;
    let farY = viewH;

    for (const task of getTasks()) {
      if (!Number.isFinite(task.x)) task.x = 0;
      if (!Number.isFinite(task.y)) task.y = 0;
      if (isDateCollapsed(task.targetAt)) continue;
      farX = Math.max(farX, task.x + noteW + 96);
      farY = Math.max(farY, task.y + noteH + 96);
    }

    if (isVerticalMode()) {
      contentWidth = Math.max(viewW + 1, farX, vTrackToX(maxTrack) + noteW + 96);
      contentHeight = Math.max(viewH + 1, farY, vEndLineY() + noteH + 110);
    } else {
      contentWidth = Math.max(viewW + 1, farX, hEndLineX() + 160);
      contentHeight = Math.max(viewH + 1, farY, hTrackToY(maxTrack) + noteH + 120);
    }

    [links, lanesEl, dateHud, notesEl].forEach(el => {
      if (!el) return;
      el.style.minWidth = `${contentWidth}px`;
      el.style.width = `${contentWidth}px`;
      el.style.minHeight = `${contentHeight}px`;
      el.style.height = `${contentHeight}px`;
    });

    requestAnimationFrame(clampBoardScroll);
  };

  window.addEventListener("resize", () => {
    requestAnimationFrame(() => {
      ensureContentSize();
      clampBoardScroll();
    });
  }, { passive: true });

  branchLayout();
  render();
})();
