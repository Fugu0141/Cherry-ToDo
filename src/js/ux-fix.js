(() => {
  const previousSyncStickyDateLabels = typeof syncStickyDateLabels === "function" ? syncStickyDateLabels : null;
  const originalSetSelected = typeof setSelected === "function" ? setSelected : null;

  const expandedDoneDatesKey = "quest-sticky-expanded-done-dates-v1";
  const compactHGap = 108;
  const compactVGap = 58;

  let expandedDoneDates = new Set();
  try {
    expandedDoneDates = new Set(JSON.parse(localStorage.getItem(expandedDoneDatesKey) || "[]"));
  } catch {
    expandedDoneDates = new Set();
  }

  function saveExpandedDoneDates() {
    localStorage.setItem(expandedDoneDatesKey, JSON.stringify([...expandedDoneDates]));
  }

  function addDaysISO(date, days = 1) {
    const d = new Date(`${normalizeDate(date)}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function tasksOnDate(date) {
    const normalized = normalizeDate(date);
    return getTasks().filter(task => normalizeDate(task.targetAt) === normalized);
  }

  function isDateComplete(date) {
    const tasks = tasksOnDate(date);
    return tasks.length > 0 && tasks.every(task => task.status === "done");
  }

  function autoFoldCompleteDate(date) {
    const normalized = normalizeDate(date);
    if (!isDateComplete(normalized)) return;
    expandedDoneDates.delete(normalized);
    saveExpandedDoneDates();
  }

  function isDateCollapsed(date) {
    const normalized = normalizeDate(date);
    if (normalized === todayISO()) return false;
    return isDateComplete(normalized) && !expandedDoneDates.has(normalized);
  }

  function isTaskCollapsed(task) {
    return task && isDateCollapsed(task.targetAt);
  }

  function findVisibleParent(task) {
    let parent = task?.parentId ? state.tasks[task.parentId] : null;
    while (parent && isTaskCollapsed(parent)) {
      parent = parent.parentId ? state.tasks[parent.parentId] : null;
    }
    return parent;
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

  function nearestFreeTrack(preferred, occupied) {
    preferred = Math.max(0, Math.round(preferred || 0));
    if (!occupied.has(preferred)) return preferred;

    for (let delta = 1; delta < 80; delta++) {
      const down = preferred + delta;
      if (!occupied.has(down)) return down;

      const up = preferred - delta;
      if (up >= 0 && !occupied.has(up)) return up;
    }

    return preferred + occupied.size + 1;
  }

  function toggleDoneDate(date) {
    const normalized = normalizeDate(date);
    if (!isDateComplete(normalized)) return;

    if (expandedDoneDates.has(normalized)) expandedDoneDates.delete(normalized);
    else expandedDoneDates.add(normalized);

    saveExpandedDoneDates();
    snapshot();
    branchLayout();
    requestRender();
  }

  function lineHitTolerance() {
    return isVerticalMode()
      ? Math.max(34, noteH * 0.42)
      : Math.max(50, noteW * 0.23);
  }

  function nextDateAfterLine(lanes, index) {
    if (index <= 0) return lanes[0] || todayISO();
    return addDaysISO(lanes[index - 1], 1);
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
    return hDateLineX(date) + (isDateCollapsed(date) ? 22 : 34);
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
    return vDateLineY(date) + (isDateCollapsed(date) ? 16 : vTaskTopOffset);
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
      let nearestLineIndex = 0;
      let nearestLineDistance = Infinity;

      lanes.forEach((date, index) => {
        const dist = Math.abs(anchorY - vDateLineY(date));
        if (dist < nearestLineDistance) {
          nearestLineDistance = dist;
          nearestLineIndex = index;
        }
      });

      if (nearestLineDistance <= tolerance) {
        return { kind: "line", date: nextDateAfterLine(lanes, nearestLineIndex) };
      }

      for (const date of lanes) {
        const top = vDateLineY(date);
        const bottom = top + dateSpan(date);
        if (anchorY >= top && anchorY < bottom) {
          const forwardZone = isDateCollapsed(date)
            ? dateSpan(date)
            : Math.min(46, Math.max(30, dateSpan(date) * 0.28));
          if (anchorY >= bottom - forwardZone) {
            return { kind: "blank", date: addDaysISO(date, 1) };
          }
          return { kind: "lane", date };
        }
      }

      if (anchorY >= vEndLineY()) return { kind: "blank", date: addDaysISO(lanes.at(-1), 1) };
      return { kind: "lane", date: lanes[0] };
    }

    const anchorX = noteMainStart + noteW / 2;
    let nearestLineIndex = 0;
    let nearestLineDistance = Infinity;

    lanes.forEach((date, index) => {
      const dist = Math.abs(anchorX - hDateLineX(date));
      if (dist < nearestLineDistance) {
        nearestLineDistance = dist;
        nearestLineIndex = index;
      }
    });

    if (nearestLineDistance <= tolerance) {
      return { kind: "line", date: nextDateAfterLine(lanes, nearestLineIndex) };
    }

    for (const date of lanes) {
      const left = hDateLineX(date);
      const right = left + dateSpan(date);
      if (anchorX >= left && anchorX < right) {
        const forwardZone = isDateCollapsed(date)
          ? dateSpan(date)
          : Math.min(72, Math.max(42, dateSpan(date) * 0.28));
        if (anchorX >= right - forwardZone) {
          return { kind: "blank", date: addDaysISO(date, 1) };
        }
        return { kind: "lane", date };
      }
    }

    if (anchorX >= hEndLineX()) return { kind: "blank", date: addDaysISO(lanes.at(-1), 1) };
    return { kind: "lane", date: lanes[0] };
  };

  ensureContentSize = function() {
    refreshLaneDates();
    currentMode = getLayoutMode();
    board.classList.toggle("verticalMode", isVerticalMode());
    board.classList.toggle("horizontalMode", !isVerticalMode());
    syncMetrics();

    let farX = boardMinWidth;
    let farY = boardMinHeight;
    for (const task of getTasks()) {
      if (!Number.isFinite(task.x)) task.x = 0;
      if (!Number.isFinite(task.y)) task.y = 0;
      farX = Math.max(farX, task.x + noteW + 220);
      farY = Math.max(farY, task.y + noteH + 180);
    }

    if (isVerticalMode()) {
      contentWidth = Math.max(720, farX, vTrackToX(maxTrack + 2) + noteW + 160);
      contentHeight = Math.max(boardMinHeight, farY, vEndLineY() + 220);
    } else {
      contentWidth = Math.max(boardMinWidth, farX, hEndLineX() + 360);
      contentHeight = Math.max(boardMinHeight, farY, hTrackToY(maxTrack + 2) + 180);
    }

    [links, lanesEl, dateHud, notesEl].forEach(el => {
      if (!el) return;
      el.style.minWidth = `${contentWidth}px`;
      el.style.minHeight = `${contentHeight}px`;
    });
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
      if (isTaskCollapsed(task)) continue;

      const visibleParent = findVisibleParent(task);
      if (!visibleParent) continue;

      const path = makeBranchPath(visibleParent, task, "#191919", 4, "");
      path.classList.add("linkPath");

      const compressed = visibleParent.id !== task.parentId;
      if (compressed) path.classList.add("compressedLink");

      if (selectedId && related.has(visibleParent.id) && related.has(task.id)) {
        path.classList.add("focusedLink");
      } else if (compressed || isDateCollapsed(visibleParent.targetAt) || isDateCollapsed(task.targetAt)) {
        path.classList.add("collapsedLink");
      } else if (selectedId) {
        path.classList.add("mutedLink");
      } else if (task.status === "done" && visibleParent.status === "done") {
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
        const oldDate = normalizeDate(task.targetAt);
        task.status = task.status === "done" ? "todo" : "done";
        autoFoldCompleteDate(oldDate);
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

  branchLayout = function() {
    refreshLaneDates();
    currentMode = getLayoutMode();
    syncMetrics();

    const occupiedByDate = new Map();
    const visited = new Set();
    maxTrack = 0;

    const mark = task => {
      const date = normalizeDate(task.targetAt);
      if (!occupiedByDate.has(date)) occupiedByDate.set(date, new Set());
      return occupiedByDate.get(date);
    };

    const assign = (task, preferredTrack = 0) => {
      if (!task || visited.has(task.id)) return;
      visited.add(task.id);

      const occupied = mark(task);
      const track = nearestFreeTrack(preferredTrack, occupied);
      task._track = track;
      occupied.add(track);
      maxTrack = Math.max(maxTrack, track);

      const children = getChildren(task.id).sort(sortByDateThenTitle);
      const sameChildren = children.filter(child => child.branchMode === "same");
      const branchChildren = children.filter(child => child.branchMode !== "same");

      sameChildren.forEach(child => assign(child, track));
      branchChildren.forEach((child, index) => assign(child, track + index + 1));
    };

    const roots = getRoots().sort(sortByDateThenTitle);
    roots.forEach((root, index) => assign(root, index));

    for (const task of getTasks().sort(sortByDateThenTitle)) {
      if (!visited.has(task.id)) assign(task, 0);
    }

    applyTracksToPositions();
    deleteTempTracks();
  };

  if (originalSetSelected) {
    setSelected = function(id) {
      originalSetSelected(id);
      renderLinks();
    };
  }

  let lastDateHudTransform = "";
  let stickyDateQueued = false;

  syncStickyDateLabels = function() {
    if (!dateHud) return;
    const next = isVerticalMode()
      ? `translate3d(${board.scrollLeft}px, 0, 0)`
      : `translate3d(0, ${board.scrollTop}px, 0)`;

    if (next !== lastDateHudTransform) {
      dateHud.style.transform = next;
      lastDateHudTransform = next;
    }
  };

  function requestStickyDateSync() {
    if (stickyDateQueued) return;
    stickyDateQueued = true;
    requestAnimationFrame(() => {
      stickyDateQueued = false;
      syncStickyDateLabels();
    });
  }

  if (previousSyncStickyDateLabels) {
    board.removeEventListener("scroll", previousSyncStickyDateLabels);
  }
  board.addEventListener("scroll", requestStickyDateSync, { passive: true });

  branchLayout();
  render();
})();
