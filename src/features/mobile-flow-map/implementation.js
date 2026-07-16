(() => {
  const MOBILE_QUERY = "(max-width: 980px)";
  const MAP_WIDTH = 132;
  const MAP_HEIGHT = 172;
  const PADDING = 10;
  const ACTIVE_TIMEOUT = 1400;
  const TOOLBAR_SUPPRESS_TIMEOUT = 2200;
  const WORLD_TO_MAP_SCALE_Y = 0.12;
  const WORLD_TO_MAP_SCALE_X = 0.085;
  const SVG_NS = "http://www.w3.org/2000/svg";

  const mobileQuery = window.matchMedia(MOBILE_QUERY);
  let mapEl = null;
  let svg = null;
  let chromeHint = null;
  let activeTimer = null;
  let renderQueued = false;
  let isPointerActive = false;
  let latestTransform = null;
  let suppressFlowMapUntil = 0;

  function boardEl() {
    return document.getElementById("board");
  }

  function tasksFromApp() {
    try {
      if (typeof getTasks === "function") return getTasks();
    } catch {
      // Fall through to DOM fallback.
    }

    return Array.from(document.querySelectorAll(".note[data-id]")).map(note => {
      const x = Number.parseFloat(note.style.getPropertyValue("--x")) || note.offsetLeft || 0;
      const y = Number.parseFloat(note.style.getPropertyValue("--y")) || note.offsetTop || 0;
      return {
        id: note.dataset.id,
        parentId: null,
        x,
        y,
        status: note.classList.contains("done") ? "done" : "todo"
      };
    });
  }

  function selectedTaskId() {
    return document.querySelector(".note.selected[data-id]")?.dataset.id || null;
  }

  function hasSelectedTask() {
    return Boolean(selectedTaskId());
  }

  function readNoteSize(board) {
    const sample = document.querySelector(".note[data-id]");
    const boardStyle = window.getComputedStyle(board);
    const cssW = Number.parseFloat(boardStyle.getPropertyValue("--note-w"));
    const cssH = Number.parseFloat(boardStyle.getPropertyValue("--note-h"));

    return {
      width: Number.isFinite(cssW) ? cssW : (sample?.offsetWidth || 176),
      height: Number.isFinite(cssH) ? cssH : (sample?.offsetHeight || 82)
    };
  }

  function ensureFlowMap() {
    if (mapEl) return mapEl;

    mapEl = document.createElement("div");
    mapEl.id = "flowMap";
    mapEl.className = "hidden";
    mapEl.setAttribute("role", "button");
    mapEl.setAttribute("tabindex", "0");
    mapEl.setAttribute("aria-hidden", "true");
    mapEl.setAttribute("aria-label", "Flow Map: board overview and navigation");

    svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
    svg.setAttribute("aria-hidden", "true");
    mapEl.appendChild(svg);

    const chrome = document.createElement("div");
    chrome.className = "flowMapChrome";

    chromeHint = document.createElement("div");
    chromeHint.className = "flowMapHint";
    chromeHint.textContent = "Flow Map";

    const dot = document.createElement("div");
    dot.className = "flowMapDot";

    chrome.appendChild(chromeHint);
    chrome.appendChild(dot);
    mapEl.appendChild(chrome);

    mapEl.addEventListener("pointerdown", onMapPointerDown);
    mapEl.addEventListener("pointermove", onMapPointerMove);
    mapEl.addEventListener("pointerup", onMapPointerUp);
    mapEl.addEventListener("pointercancel", onMapPointerUp);
    mapEl.addEventListener("keydown", onMapKeyDown);

    document.body.appendChild(mapEl);
    return mapEl;
  }

  function hideFlowMap() {
    if (!mapEl) return;
    mapEl.classList.remove("visible", "active");
    mapEl.setAttribute("aria-hidden", "true");
  }

  function isTopToolbarTarget(target) {
    return Boolean(target?.closest?.(".topbar"));
  }

  function suppressFlowMapForTopToolbar(event) {
    if (!isTopToolbarTarget(event.target)) return;
    if (hasSelectedTask()) return;

    suppressFlowMapUntil = Date.now() + TOOLBAR_SUPPRESS_TIMEOUT;
    hideFlowMap();
  }

  function isFlowMapSuppressed() {
    return Date.now() < suppressFlowMapUntil;
  }

  function showFlowMap() {
    if (!mapEl || !mobileQuery.matches) return;
    if (isFlowMapSuppressed() && !hasSelectedTask()) {
      hideFlowMap();
      return;
    }

    mapEl.classList.remove("hidden");
    mapEl.classList.add("visible");
    mapEl.setAttribute("aria-hidden", "false");
    window.clearTimeout(activeTimer);
    activeTimer = window.setTimeout(() => {
      if (!isPointerActive && !hasSelectedTask()) hideFlowMap();
    }, ACTIVE_TIMEOUT);
  }

  function scheduleRender({ active = false } = {}) {
    if (active) showFlowMap();
    if (renderQueued) return;

    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderFlowMap();
    });
  }

  function clearSvg() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function makeSvgElement(name, attrs = {}) {
    const el = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined) continue;
      el.setAttribute(key, String(value));
    }
    return el;
  }

  function taskCenter(task, noteSize) {
    return {
      x: Number(task.x || 0) + noteSize.width / 2,
      y: Number(task.y || 0) + noteSize.height / 2
    };
  }

  function computeCamera(board) {
    return {
      x: board.scrollLeft + board.clientWidth / 2,
      y: board.scrollTop + board.clientHeight / 2
    };
  }

  function computeTransform(board) {
    const camera = computeCamera(board);
    return {
      scaleX: WORLD_TO_MAP_SCALE_X,
      scaleY: WORLD_TO_MAP_SCALE_Y,
      camera,
      centerX: MAP_WIDTH / 2,
      centerY: (MAP_HEIGHT - 12) / 2
    };
  }

  function toMini(point, transform) {
    return {
      x: transform.centerX + (point.x - transform.camera.x) * transform.scaleX,
      y: transform.centerY + (point.y - transform.camera.y) * transform.scaleY
    };
  }

  function fromMini(point, transform) {
    return {
      x: (point.x - transform.centerX) / transform.scaleX + transform.camera.x,
      y: (point.y - transform.centerY) / transform.scaleY + transform.camera.y
    };
  }

  function isInsideMap(point, margin = 14) {
    return point.x >= -margin
      && point.x <= MAP_WIDTH + margin
      && point.y >= -margin
      && point.y <= MAP_HEIGHT - 12 + margin;
  }

  function connectedToSelected(task, selectedId) {
    if (!selectedId) return false;
    return task.id === selectedId || task.parentId === selectedId;
  }

  function drawDateLanes(transform) {
    let dates = [];
    try {
      if (typeof getLaneDates === "function") dates = getLaneDates();
    } catch {
      return;
    }

    if (!Array.isArray(dates) || !dates.length) return;
    let vertical = true;
    try {
      if (typeof isVerticalMode === "function") vertical = isVerticalMode();
    } catch {
      vertical = true;
    }

    dates.forEach(date => {
      let worldPoint;
      try {
        worldPoint = vertical && typeof vDateLineY === "function"
          ? { x: transform.camera.x, y: vDateLineY(date) }
          : typeof hDateLineX === "function"
            ? { x: hDateLineX(date), y: transform.camera.y }
            : null;
      } catch {
        worldPoint = null;
      }

      if (!worldPoint) return;
      const mini = toMini(worldPoint, transform);
      if (!isInsideMap(mini, 0)) return;

      const line = vertical
        ? makeSvgElement("line", { class: "flowMapLane", x1: PADDING, y1: mini.y, x2: MAP_WIDTH - PADDING, y2: mini.y })
        : makeSvgElement("line", { class: "flowMapLane", x1: mini.x, y1: PADDING, x2: mini.x, y2: MAP_HEIGHT - PADDING - 12 });
      svg.appendChild(line);
    });
  }

  function linkOffsetFor(task, siblingsByParent) {
    if (!task.parentId) return 0;
    const siblings = siblingsByParent.get(task.parentId) || [];
    if (siblings.length <= 1) return 0;

    const index = siblings.findIndex(sibling => sibling.id === task.id);
    if (index < 0) return 0;

    const centeredIndex = index - (siblings.length - 1) / 2;
    return Math.max(-8, Math.min(8, centeredIndex * 4));
  }

  function buildElbowPath(parentPoint, childPoint, offset = 0) {
    const dx = childPoint.x - parentPoint.x;
    const dy = childPoint.y - parentPoint.y;
    const closeEnough = Math.abs(dx) < 14 || Math.abs(dy) < 14;

    if (closeEnough) {
      return `M ${parentPoint.x} ${parentPoint.y} L ${childPoint.x} ${childPoint.y}`;
    }

    if (Math.abs(dx) >= Math.abs(dy)) {
      const midX = parentPoint.x + dx / 2 + offset;
      return `M ${parentPoint.x} ${parentPoint.y} L ${midX} ${parentPoint.y} L ${midX} ${childPoint.y} L ${childPoint.x} ${childPoint.y}`;
    }

    const midY = parentPoint.y + dy / 2 + offset;
    return `M ${parentPoint.x} ${parentPoint.y} L ${parentPoint.x} ${midY} L ${childPoint.x} ${midY} L ${childPoint.x} ${childPoint.y}`;
  }

  function drawLinks(tasks, taskById, noteSize, transform, selectedId) {
    const group = makeSvgElement("g", { class: "flowMapLinks" });
    const siblingsByParent = new Map();

    for (const task of tasks) {
      if (!task.parentId) continue;
      if (!siblingsByParent.has(task.parentId)) siblingsByParent.set(task.parentId, []);
      siblingsByParent.get(task.parentId).push(task);
    }

    for (const siblings of siblingsByParent.values()) {
      siblings.sort((a, b) => (Number(a.y || 0) - Number(b.y || 0)) || (Number(a.x || 0) - Number(b.x || 0)));
    }

    for (const task of tasks) {
      if (!task.parentId || !taskById.has(task.parentId)) continue;

      const parent = taskById.get(task.parentId);
      const parentPoint = toMini(taskCenter(parent, noteSize), transform);
      const childPoint = toMini(taskCenter(task, noteSize), transform);
      if (!isInsideMap(parentPoint) && !isInsideMap(childPoint)) continue;

      const isConnected = selectedId && (task.id === selectedId || parent.id === selectedId);
      const offset = linkOffsetFor(task, siblingsByParent);

      group.appendChild(makeSvgElement("path", {
        class: `flowMapLink ${isConnected ? "connected" : ""}`,
        d: buildElbowPath(parentPoint, childPoint, offset)
      }));
    }

    svg.appendChild(group);
  }

  function drawNodes(tasks, noteSize, transform, selectedId) {
    const group = makeSvgElement("g", { class: "flowMapNodes" });

    for (const task of tasks) {
      const point = toMini(taskCenter(task, noteSize), transform);
      if (!isInsideMap(point, 4)) continue;

      const classes = ["flowMapNode"];
      if (task.status === "done") classes.push("done");
      if (connectedToSelected(task, selectedId)) classes.push("connected");
      if (task.id === selectedId) classes.push("selected");

      group.appendChild(makeSvgElement("rect", {
        class: classes.join(" "),
        x: point.x - 3.5,
        y: point.y - 3.5,
        width: 7,
        height: 7,
        rx: 2.5,
        ry: 2.5
      }));
    }

    svg.appendChild(group);
  }

  function renderEmpty() {
    clearSvg();
    svg.appendChild(makeSvgElement("text", {
      class: "flowMapEmptyText",
      x: MAP_WIDTH / 2,
      y: MAP_HEIGHT / 2
    }));
    svg.lastChild.textContent = "No tasks";
  }

  function renderFlowMap() {
    const board = boardEl();
    ensureFlowMap();

    if (!board || !mobileQuery.matches) {
      mapEl.classList.add("hidden");
      hideFlowMap();
      return;
    }

    const tasks = tasksFromApp().filter(task => task && task.id);
    mapEl.classList.toggle("hidden", tasks.length === 0);
    if (!tasks.length) {
      hideFlowMap();
      renderEmpty();
      return;
    }

    const noteSize = readNoteSize(board);
    const selectedId = selectedTaskId();
    const transform = computeTransform(board);
    const taskById = new Map(tasks.map(task => [task.id, task]));

    latestTransform = transform;
    clearSvg();
    drawDateLanes(transform);
    drawLinks(tasks, taskById, noteSize, transform, selectedId);
    drawNodes(tasks, noteSize, transform, selectedId);

    if (selectedId) showFlowMap();
    if (chromeHint) chromeHint.textContent = selectedId ? "Selected" : "Flow Map";
  }

  function moveBoardFromEvent(event) {
    const board = boardEl();
    if (!board || !latestTransform) return;

    const rect = mapEl.getBoundingClientRect();
    const mini = {
      x: Math.max(0, Math.min(MAP_WIDTH, (event.clientX - rect.left) * MAP_WIDTH / rect.width)),
      y: Math.max(0, Math.min(MAP_HEIGHT, (event.clientY - rect.top) * MAP_HEIGHT / rect.height))
    };
    const world = fromMini(mini, latestTransform);

    board.scrollTo({
      left: Math.max(0, world.x - board.clientWidth / 2),
      top: Math.max(0, world.y - board.clientHeight / 2),
      behavior: "auto"
    });
    scheduleRender({ active: true });
  }

  function onMapPointerDown(event) {
    if (!mobileQuery.matches) return;
    event.preventDefault();
    event.stopPropagation();
    isPointerActive = true;
    mapEl.classList.add("active", "visible");
    mapEl.setAttribute("aria-hidden", "false");
    mapEl.setPointerCapture(event.pointerId);
    moveBoardFromEvent(event);
  }

  function onMapPointerMove(event) {
    if (!isPointerActive) return;
    event.preventDefault();
    moveBoardFromEvent(event);
  }

  function onMapPointerUp(event) {
    if (!isPointerActive) return;
    isPointerActive = false;
    mapEl.classList.remove("active");
    try {
      mapEl.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
    showFlowMap();
  }

  function onMapKeyDown(event) {
    const board = boardEl();
    if (!board || !mobileQuery.matches) return;

    const step = 120;
    let handled = true;
    if (event.key === "ArrowUp") board.scrollTop -= step;
    else if (event.key === "ArrowDown") board.scrollTop += step;
    else if (event.key === "ArrowLeft") board.scrollLeft += -step;
    else if (event.key === "ArrowRight") board.scrollLeft += step;
    else handled = false;

    if (handled) {
      event.preventDefault();
      scheduleRender({ active: true });
    }
  }

  function observeBoard() {
    const board = boardEl();
    if (!board) return;

    document.addEventListener("pointerdown", suppressFlowMapForTopToolbar, true);
    document.addEventListener("click", suppressFlowMapForTopToolbar, true);
    board.addEventListener("scroll", () => scheduleRender({ active: true }), { passive: true });
    window.addEventListener("resize", () => scheduleRender({ active: false }), { passive: true });
    mobileQuery.addEventListener("change", () => scheduleRender({ active: false }));

    const observer = new MutationObserver(() => scheduleRender({ active: false }));
    observer.observe(board, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-id"]
    });
  }

  function init() {
    ensureFlowMap();
    observeBoard();
    scheduleRender({ active: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
