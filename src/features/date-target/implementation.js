(() => {
  const recentHitKey = "questStickyRecentDateHit";
  const originalOpenCreateTaskModal = typeof openCreateTaskModal === "function" ? openCreateTaskModal : null;
  const originalOpenChangeDateModal = typeof openChangeDateModal === "function" ? openChangeDateModal : null;

  let recentHit = null;
  let recentHitAt = 0;

  function formatUTCDateKey(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDaysISO(date, days = 1) {
    if (window.cherryDateOnly?.addDays) return window.cherryDateOnly.addDays(date, days);

    const [year, month, day] = normalizeDate(date).split("-").map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() + days);
    return formatUTCDateKey(d);
  }

  function lineTolerance() {
    return isVerticalMode()
      ? Math.max(16, noteH * 0.18)
      : Math.max(28, noteW * 0.13);
  }

  function remember(hit, anchor, boundaryIndex = null) {
    recentHit = hit;
    recentHitAt = Date.now();
    try {
      window[recentHitKey] = { ...hit, anchor, boundaryIndex, at: recentHitAt };
    } catch (_) {}

    const hud = document.getElementById("dateDebugHud");
    if (hud && (drag || connectDrag)) {
      const targetText = hit.targetDate && hit.targetDate !== hit.date ? `\ntarget:${hit.targetDate}` : "";
      const boundaryText = boundaryIndex == null ? "" : `\nboundary:${boundaryIndex}`;
      hud.textContent = `date hit\nkind:${hit.kind}\nline:${hit.date || "-"}${targetText}\nmode:${hit.mode || "-"}\nanchor:${Math.round(anchor)}${boundaryText}`;
      hud.style.display = "block";
    }
  }

  function linePos(date) {
    return isVerticalMode() ? vDateLineY(date) : hDateLineX(date);
  }

  function endLinePos() {
    return isVerticalMode() ? vEndLineY() : hEndLineX();
  }

  function buildIntervals() {
    const lanes = getLaneDates();
    const lines = lanes.map(date => linePos(date));
    const endLine = endLinePos();
    return { lanes, lines, endLine };
  }

  function targetDateForBoundary(lanes, boundaryIndex) {
    if (!lanes.length) return todayISO();
    const baseDate = boundaryIndex > 0 ? lanes[boundaryIndex - 1] : lanes[0];
    return addDaysISO(baseDate || todayISO(), 1);
  }

  function makeLineHit(lanes, boundaryIndex) {
    const lineDate = lanes[boundaryIndex] || lanes.at(-1) || todayISO();
    const targetDate = targetDateForBoundary(lanes, boundaryIndex);
    const hit = { kind: "line", date: lineDate, targetDate, mode: "ask" };
    hit._boundaryIndex = boundaryIndex;
    return hit;
  }

  function makeBlankHit(lanes) {
    const targetDate = addDaysISO(lanes.at(-1), 1);
    const hit = { kind: "blank", date: targetDate, targetDate, mode: "ask" };
    hit._boundaryIndex = lanes.length;
    return hit;
  }

  function hitFromAnchor(anchor) {
    if (!state.showLanes) return { kind: "none", date: null, targetDate: null, mode: "free" };

    const { lanes, lines, endLine } = buildIntervals();
    if (!lanes.length) return { kind: "blank", date: todayISO(), targetDate: todayISO(), mode: "ask" };

    const tol = lineTolerance();

    for (let i = 0; i < lines.length; i++) {
      if (Math.abs(anchor - lines[i]) <= tol) return makeLineHit(lanes, i);
    }

    if (Math.abs(anchor - endLine) <= tol || anchor > endLine) return makeBlankHit(lanes);

    for (let i = 0; i < lanes.length; i++) {
      const start = lines[i];
      const end = i + 1 < lines.length ? lines[i + 1] : endLine;
      if (anchor > start + tol && anchor < end - tol) {
        return { kind: "lane", date: lanes[i], targetDate: lanes[i], mode: "snap" };
      }
    }

    for (let i = 0; i < lanes.length; i++) {
      const start = lines[i];
      const end = i + 1 < lanes.length ? lines[i + 1] : endLine;
      if (anchor >= start && anchor < end) {
        return { kind: "lane", date: lanes[i], targetDate: lanes[i], mode: "snap" };
      }
    }

    if (anchor <= lines[0]) return { kind: "lane", date: lanes[0], targetDate: lanes[0], mode: "snap" };
    return makeBlankHit(lanes);
  }

  function isFreshAskHit(hit, at, defaultDate = null) {
    if (!hit || !hit.targetDate || hit.mode !== "ask") return false;
    if (Date.now() - at < 5000) return true;
    if (!defaultDate || !hit.date) return false;
    return normalizeDate(defaultDate) === normalizeDate(hit.date);
  }

  hitTestDateArea = function(noteMainStart) {
    const size = isVerticalMode() ? noteH : noteW;
    const anchor = noteMainStart + size / 2;
    const hit = hitFromAnchor(anchor);
    remember(hit, anchor, hit._boundaryIndex ?? null);
    return hit;
  };

  getDateForPointer = function(event) {
    const point = boardPoint(event);
    const start = isVerticalMode() ? point.y - noteH / 2 : point.x - noteW / 2;
    const hit = hitTestDateArea(start);
    return hit.targetDate || hit.date || todayISO();
  };

  function updateConnectGhostFreely(event) {
    if (!connectDrag) return false;

    const parent = state.tasks[connectDrag.parentId];
    const point = boardPoint(event);

    connectDrag.x = point.x;
    connectDrag.y = point.y;

    const hit = isVerticalMode()
      ? hitTestDateArea(point.y - noteH / 2)
      : hitTestDateArea(point.x - noteW / 2);
    const nextHotLane = hit.kind === "lane" ? hit.date : null;
    const nextHotLine = hit.kind === "line" ? hit.date : null;
    const hotChanged = nextHotLane !== hotLaneDate || nextHotLine !== hotLineDate;

    hotLaneDate = nextHotLane;
    hotLineDate = nextHotLine;

    const gx = point.x - noteW / 2;
    const gy = point.y - noteH / 2;
    setObjectPos(ghost, Math.max(40, gx), Math.max(30, gy));

    if (parent) updatePreviewBranch();
    if (hotChanged) renderLanes();

    return true;
  }

  window.addEventListener("pointermove", event => {
    if (!updateConnectGhostFreely(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

  if (originalOpenCreateTaskModal) {
    openCreateTaskModal = function(options = {}) {
      const next = { ...options };
      const hit = recentHit || window[recentHitKey];
      const at = recentHitAt || hit?.at || 0;
      if (next.parentId && isFreshAskHit(hit, at)) next.targetAt = hit.targetDate;
      return originalOpenCreateTaskModal(next);
    };
  }

  if (originalOpenChangeDateModal) {
    openChangeDateModal = function(taskId, defaultDate, original) {
      const hit = recentHit || window[recentHitKey];
      const at = recentHitAt || hit?.at || 0;
      const fixedDate = isFreshAskHit(hit, at, defaultDate) ? hit.targetDate : defaultDate;
      return originalOpenChangeDateModal(taskId, fixedDate, original);
    };
  }
})();
