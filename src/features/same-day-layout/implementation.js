(() => {
  const baseRenderLanes = renderLanes;

  let laneMetrics = {
    key: "",
    hStarts: new Map(),
    hWidths: new Map(),
    vStarts: new Map(),
    vHeights: new Map(),
    hEnd: hAxisLeft,
    vEnd: vAxisTop
  };

  function sameDayStepX() {
    return noteW + 44;
  }

  function sameDayStepY() {
    return noteH + 34;
  }

  function dateMetricsKey() {
    return getLaneDates().join("|");
  }

  function sameDayLaneWidth(maxColumn) {
    return Math.max(hDateGap, 34 + noteW + maxColumn * sameDayStepX() + 62);
  }

  function sameDayLaneHeight(maxColumn) {
    return Math.max(vDateGap, vTaskTopOffset + noteH + maxColumn * sameDayStepY() + 54);
  }

  function defineTemp(task, key, value) {
    Object.defineProperty(task, key, {
      value,
      writable: true,
      configurable: true,
      enumerable: false
    });
  }

  function sameDate(a, b) {
    return normalizeDate(a) === normalizeDate(b);
  }

  function resetSameDayColumns() {
    for (const task of getTasks()) defineTemp(task, "_dayColumn", 0);
  }

  function assignSameDayColumns() {
    resetSameDayColumns();
    const seen = new Set();

    function visit(task) {
      if (!task || seen.has(task.id)) return;
      seen.add(task.id);

      for (const child of orderChildrenForLayout(task.id)) {
        const nextColumn = sameDate(child.targetAt, task.targetAt)
          ? (task._dayColumn ?? 0) + 1
          : 0;
        defineTemp(child, "_dayColumn", nextColumn);
        visit(child);
      }
    }

    for (const root of getRoots().sort(sortByDateThenTitle)) visit(root);
  }

  function updateLaneMetrics() {
    const lanes = getLaneDates();
    const maxColumns = new Map(lanes.map(date => [date, 0]));

    for (const task of getTasks()) {
      const date = normalizeDate(task.targetAt);
      maxColumns.set(date, Math.max(maxColumns.get(date) ?? 0, task._dayColumn ?? 0));
    }

    const hStarts = new Map();
    const hWidths = new Map();
    let hCursor = hAxisLeft;
    for (const date of lanes) {
      const width = sameDayLaneWidth(maxColumns.get(date) ?? 0);
      hStarts.set(date, hCursor);
      hWidths.set(date, width);
      hCursor += width;
    }

    const vStarts = new Map();
    const vHeights = new Map();
    let vCursor = vAxisTop;
    for (const date of lanes) {
      const height = sameDayLaneHeight(maxColumns.get(date) ?? 0);
      vStarts.set(date, vCursor);
      vHeights.set(date, height);
      vCursor += height;
    }

    laneMetrics = {
      key: dateMetricsKey(),
      hStarts,
      hWidths,
      vStarts,
      vHeights,
      hEnd: hCursor,
      vEnd: vCursor
    };
  }

  function ensureLaneMetrics() {
    if (laneMetrics.key !== dateMetricsKey()) updateLaneMetrics();
  }

  function hLaneWidth(date) {
    ensureLaneMetrics();
    return laneMetrics.hWidths.get(normalizeDate(date)) ?? hDateGap;
  }

  function vLaneHeight(date) {
    ensureLaneMetrics();
    return laneMetrics.vHeights.get(normalizeDate(date)) ?? vDateGap;
  }

  hDateLineX = function(date) {
    ensureLaneMetrics();
    return laneMetrics.hStarts.get(normalizeDate(date)) ?? laneMetrics.hEnd;
  };

  hDateToX = function(date) {
    return hDateLineX(date) + 34;
  };

  hEndLineX = function() {
    ensureLaneMetrics();
    return laneMetrics.hEnd;
  };

  vDateLineY = function(date) {
    ensureLaneMetrics();
    return laneMetrics.vStarts.get(normalizeDate(date)) ?? laneMetrics.vEnd;
  };

  vDateToY = function(date) {
    return vDateLineY(date) + vTaskTopOffset;
  };

  vEndLineY = function() {
    ensureLaneMetrics();
    return laneMetrics.vEnd;
  };

  taskX = function(task) {
    const sameDayColumn = task._dayColumn ?? 0;
    return isVerticalMode()
      ? vTrackToX(task._track ?? 0)
      : hDateToX(task.targetAt) + sameDayColumn * sameDayStepX();
  };

  taskY = function(task) {
    const sameDayColumn = task._dayColumn ?? 0;
    return isVerticalMode()
      ? vDateToY(task.targetAt) + sameDayColumn * sameDayStepY()
      : hTrackToY(task._track ?? 0);
  };

  ensureContentSize = function() {
    refreshLaneDates();
    currentMode = getLayoutMode();
    board.classList.toggle("verticalMode", isVerticalMode());
    board.classList.toggle("horizontalMode", !isVerticalMode());
    syncMetrics();
    ensureLaneMetrics();

    let farX = boardMinWidth;
    let farY = boardMinHeight;
    for (const task of getTasks()) {
      if (!Number.isFinite(task.x)) task.x = 0;
      if (!Number.isFinite(task.y)) task.y = 0;
      farX = Math.max(farX, task.x + noteW + 220);
      farY = Math.max(farY, task.y + noteH + 180);
    }

    if (isVerticalMode()) {
      const laneHeight = Math.max(vAxisTop + Math.max(5, getLaneDates().length) * vDateGap + 220, vEndLineY() + 220);
      contentWidth = Math.max(720, farX, vTrackToX(maxTrack + 2) + noteW + 160);
      contentHeight = Math.max(boardMinHeight, farY, laneHeight);
    } else {
      const laneWidth = Math.max(hAxisLeft + Math.max(5, getLaneDates().length) * hDateGap + 360, hEndLineX() + 360);
      contentWidth = Math.max(boardMinWidth, farX, laneWidth);
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

    ensureLaneMetrics();

    const laneFragment = document.createDocumentFragment();
    const labelFragment = document.createDocumentFragment();
    const lanes = getLaneDates();
    const activeDate = activeTodayBandDate();

    lanes.forEach((date, index) => {
      const prev = lanes[index - 1];
      const isMonthStart = index === 0 || !sameMonth(prev, date);
      const isTodayBand = date === activeDate;
      const isTodayLine = date === todayISO();
      const parts = formatDateParts(date);

      const band = document.createElement("div");
      band.className = `laneBand ${isTodayBand ? "todayBand" : ""} ${hotLaneDate === date ? "highlight" : ""}`;

      const line = document.createElement("div");
      line.className = `laneLine ${isTodayLine ? "todayLine" : ""} ${hotLineDate === date ? "hot" : ""}`;

      const label = document.createElement("div");
      label.className = `laneLabel ${isTodayLine ? "todayLabel" : ""} ${isMonthStart ? "monthStart" : ""}`;
      label.innerHTML = isMonthStart
        ? `<div class="laneMonthMarker">${parts.monthName}</div><div class="laneDay">${parts.day}</div>`
        : `<div class="laneDay">${parts.day}</div><div class="laneMonth">${parts.monthName}</div>`;

      if (isVerticalMode()) {
        const y = vDateLineY(date);
        band.style.top = `${y}px`;
        band.style.height = `${vLaneHeight(date)}px`;
        line.style.top = `${y}px`;
        label.style.top = `${y + 8}px`;
        label.style.left = "14px";
      } else {
        const x = hDateLineX(date);
        band.style.left = `${x}px`;
        band.style.width = `${hLaneWidth(date)}px`;
        line.style.left = `${x}px`;
        label.style.left = `${x + 14}px`;
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

  resolveTrackCollisions = function() {
    const tasks = getTasks()
      .slice()
      .sort((a, b) => {
        const dateDiff = normalizeDate(a.targetAt).localeCompare(normalizeDate(b.targetAt));
        if (dateDiff !== 0) return dateDiff;
        const dayColumnDiff = (a._dayColumn ?? 0) - (b._dayColumn ?? 0);
        if (dayColumnDiff !== 0) return dayColumnDiff;
        return getTaskDepth(a.id) - getTaskDepth(b.id);
      });

    for (let pass = 0; pass < 8; pass++) {
      let changed = false;
      const occupied = new Set();

      for (const task of tasks) {
        if (!Number.isFinite(task._track)) task._track = 0;

        let track = task._track;
        const date = normalizeDate(task.targetAt);
        const dayColumn = task._dayColumn ?? 0;
        while (occupied.has(`${date}:${dayColumn}:${track}`)) track += 1;

        if (track !== task._track) {
          shiftSubtreeTracks(task.id, track - task._track);
          changed = true;
        }

        occupied.add(`${date}:${dayColumn}:${task._track}`);
        maxTrack = Math.max(maxTrack, task._track);
      }

      if (!changed) break;
    }
  };

  branchLayout = function() {
    refreshLaneDates();
    currentMode = getLayoutMode();
    syncMetrics();
    assignSameDayColumns();

    const roots = getRoots().sort(sortByDateThenTitle);
    let nextTrack = 0;
    maxTrack = 0;

    for (const root of roots) {
      nextTrack = assignBranchTracks(root.id, nextTrack, nextTrack + 1);
      nextTrack += 1;
    }

    maxTrack = Math.max(0, nextTrack);
    resolveTrackCollisions();
    updateLaneMetrics();
    applyTracksToPositions();
    deleteTempTracks();
  };

  deleteTempTracks = function() {
    for (const task of getTasks()) {
      delete task._track;
      delete task._dayColumn;
    }
  };

  try {
    branchLayout();
    requestRender();
    window.cherrySameDayLayout = {
      refresh: () => {
        branchLayout();
        requestRender();
      },
      metrics: () => laneMetrics
    };
  } catch (error) {
    console.warn("Cherry-ToDo same-day layout patch failed; falling back to base lanes.", error);
    renderLanes = baseRenderLanes;
  }
})();
