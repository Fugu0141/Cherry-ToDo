(() => {
  const collapsedDoneDatesKey = "quest-sticky-collapsed-done-dates-v2";
  const compactHGap = 132;
  const compactVGap = 92;
  const originalSetSelected = typeof setSelected === "function" ? setSelected : null;
  const originalOpenCreateTaskModal = typeof openCreateTaskModal === "function" ? openCreateTaskModal : null;

  let lastDropHit = null;
  let lastDropHitAt = 0;

  const debugHud = document.createElement("div");
  debugHud.id = "dateDebugHud";
  debugHud.style.cssText = [
    "position:fixed",
    "right:12px",
    "bottom:12px",
    "z-index:9999",
    "padding:8px 10px",
    "border-radius:10px",
    "background:rgba(20,20,28,.82)",
    "color:white",
    "font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace",
    "box-shadow:0 8px 24px rgba(0,0,0,.22)",
    "pointer-events:none",
    "white-space:pre",
    "display:none"
  ].join(";");
  document.body.appendChild(debugHud);

  function rememberHit(hit, anchor = null) {
    lastDropHit = hit;
    lastDropHitAt = Date.now();

    if (!hit || !(drag || connectDrag)) {
      debugHud.style.display = "none";
      return;
    }

    const a = anchor == null ? "" : `\nanchor:${Math.round(anchor)}`;
    debugHud.textContent = `date hit\nkind:${hit.kind}\ndate:${hit.date || "-"}\nmode:${hit.mode || "-"}${a}`;
    debugHud.style.display = "block";
  }

  function hideDebugSoon() {
    setTimeout(() => {
      if (!(drag || connectDrag)) debugHud.style.display = "none";
    }, 500);
  }

  function addDaysISO(date, days = 1) {
    const d = new Date(`${normalizeDate(date)}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function readCollapsedDates() {
    try {
      return new Set(JSON.parse(localStorage.getItem(collapsedDoneDatesKey) || "[]"));
    } catch {
      return new Set();
    }
  }

  function writeCollapsedDates(dates) {
    localStorage.setItem(collapsedDoneDatesKey, JSON.stringify([...dates]));
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
    return isDateComplete(normalized) && readCollapsedDates().has(normalized);
  }

  function setDateCollapsed(date, collapsed) {
    const normalized = normalizeDate(date);
    const dates = readCollapsedDates();
    if (collapsed) dates.add(normalized);
    else dates.delete(normalized);
    writeCollapsedDates(dates);
  }

  function autoFoldCompleteDate(date) {
    const normalized = normalizeDate(date);
    if (isDateComplete(normalized)) setDateCollapsed(normalized, true);
    else setDateCollapsed(normalized, false);
  }

  function isTaskCollapsed(task) {
    return !!task && isDateCollapsed(task.targetAt);
  }

  function dateSpan(date) {
    return isVerticalMode()
      ? isDateCollapsed(date) ? compactVGap : vDateGap
      : isDateCollapsed(date) ? compactHGap : hDateGap;
  }

  function taskToneClass(task) {
    if (task.status === "done") return "doneTask";
    const date = normalizeDate(task.targetAt);
    if (date < todayISO()) return "overdueTask";
    if (date === todayISO()) return "todayTask";
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

  function findVisibleParent(task) {
    let parent = task?.parentId ? state.tasks[task.parentId] : null;
    while (parent && isTaskCollapsed(parent)) {
      parent = parent.parentId ? state.tasks[parent.parentId] : null;
    }
    return parent;
  }

  function lineHitTolerance() {
    return isVerticalMode()
      ? Math.max(28, noteH * 0.34)
      : Math.max(38, noteW * 0.18);
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

  function hitFromAnchor(anchor) {
    if (!state.showLanes) return { kind: "none", date: null, mode: "free" };

    const lanes = getLaneDates();
    if (!lanes.length) return { kind: "blank", date: todayISO(), mode: "ask" };

    const tolerance = lineHitTolerance();

    if (isVerticalMode()) {
      if (anchor >= vEndLineY() - tolerance) {
        return { kind: "blank", date: addDaysISO(lanes.at(-1), 1), mode: "ask" };
      }

      let nearestLineIndex = 0;
      let nearestLineDistance = Infinity;
      lanes.forEach((date, index) => {
        const dist = Math.abs(anchor - vDateLineY(date));
        if (dist < nearestLineDistance) {
          nearestLineDistance = dist;
          nearestLineIndex = index;
        }
      });

      if (nearestLineDistance <= tolerance) {
        return { kind: "line", date: nextDateAfterLine(lanes, nearestLineIndex), mode: "ask" };
      }

      for (const date of lanes) {
        const top = vDateLineY(date);
        const bottom = top + dateSpan(date);
        if (anchor >= top && anchor < bottom) {
          const span = dateSpan(date);
          const forwardZone = isDateCollapsed(date)
            ? span
            : Math.min(span - 28, Math.max(42, span * 0.38));
          if (anchor >= bottom - forwardZone) {
            return { kind: "blank", date: addDaysISO(date, 1), mode: "ask" };
          }
          return { kind: "lane", date, mode: "snap" };
        }
      }

      if (anchor > vEndLineY()) return { kind: "blank", date: addDaysISO(lanes.at(-1), 1), mode: "ask" };
      return { kind: "lane", date: lanes[0], mode: "snap" };
    }

    if (anchor >= hEndLineX() - tolerance) {
      return { kind: "blank", date: addDaysISO(lanes.at(-1), 1), mode: "ask" };
    }

    let nearestLineIndex = 0;
    let nearestLineDistance = Infinity;
    lanes.forEach((date, index) => {
      const dist = Math.abs(anchor - hDateLineX(date));
      if (dist < nearestLineDistance) {
        nearestLineDistance = dist;
        nearestLineIndex = index;
      }
    });

    if (nearestLineDistance <= tolerance) {
      return { kind: "line", date: nextDateAfterLine(lanes, nearestLineIndex), mode: "ask" };
    }

    for (const date of lanes) {
      const left = hDateLineX(date);
      const right = left + dateSpan(date);
      if (anchor >= left && anchor < right) {
        const span = dateSpan(date);
        const forwardZone = isDateCollapsed(date)
          ? span
          : Math.min(span - 36, Math.max(66, span * 0.34));
        if (anchor >= right - forwardZone) {
          return { kind: "blank", date: addDaysISO(date, 1), mode: "ask" };
        }
        return { kind: "lane", date, mode: "snap" };
      }
    }

    if (anchor > hEndLineX()) return { kind: "blank", date: addDaysISO(lanes.at(-1), 1), mode: "ask" };
    return { kind: "lane", date: lanes[0], mode: "snap" };
  }

  hitTestDateArea = function(noteMainStart) {
    const leadOffset = isVerticalMode() ? 20 : 20;
    const anchor = noteMainStart + leadOffset;
    const hit = hitFromAnchor(anchor);
    rememberHit(hit, anchor);
    return hit;
  };

  getDateForPointer = function(event) {
    const point = boardPoint(event);
    const leadStart = isVerticalMode() ? point.y - noteH / 2 : point.x - noteW / 2;
    const hit = hitTestDateArea(leadStart);
    return hit.date || todayISO();
  };

  if (originalOpenCreateTaskModal) {
    openCreateTaskModal = function(options = {}) {
      const next = { ...options };
      const recentBoundaryHit = lastDropHit
        && lastDropHit.mode === "ask"
        && lastDropHit.date
        && Date.now() - lastDropHitAt < 1200;

      if (next.parentId && recentBoundaryHit && normalizeDate(next.targetAt) === todayISO()) {
        next.targetAt = lastDropHit.date;
      }

      return originalOpenCreateTaskModal(next);
    };
  }

  window.addEventListener("pointerup", hideDebugSoon, true);
  window.addEventListener("pointercancel", hideDebugSoon, true);

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

  if (originalSetSelected) {
    setSelected = function(id) {
      originalSetSelected(id);
      renderLinks();
    };
  }

  branchLayout();
  render();
})();