(() => {
  const MOBILE_QUERY = "(max-width: 980px)";
  const MAP_WIDTH = 132;
  const MAP_HEIGHT = 172;
  const MAP_BOTTOM_LABEL_SPACE = 12;
  const WORLD_TO_MAP_SCALE_Y = 0.12;
  const WORLD_TO_MAP_SCALE_X = 0.085;

  function safeNormalizeDate(value) {
    try {
      return normalizeDate(value);
    } catch {
      return String(value || "").slice(0, 10);
    }
  }

  function compareTasksForFlow(a, b) {
    const sameA = a.branchMode === "same";
    const sameB = b.branchMode === "same";
    if (sameA !== sameB) return sameA ? -1 : 1;

    const dateDiff = safeNormalizeDate(a.targetAt).localeCompare(safeNormalizeDate(b.targetAt));
    if (dateDiff !== 0) return dateDiff;

    const titleDiff = String(a.title || "").localeCompare(String(b.title || ""), "ja");
    if (titleDiff !== 0) return titleDiff;

    return String(a.id || "").localeCompare(String(b.id || ""));
  }

  function childrenForFlow(taskId) {
    return getChildren(taskId).slice().sort(compareTasksForFlow);
  }

  if (typeof orderChildrenForLayout === "function") {
    orderChildrenForLayout = function orderChildrenForRelationshipLayout(taskId) {
      return childrenForFlow(taskId);
    };
  }

  if (typeof assignBranchTracks === "function") {
    assignBranchTracks = function assignRelationshipTracks(taskId, track, nextTrack) {
      const task = state.tasks[taskId];
      if (!task) return nextTrack;

      task._track = Math.max(0, track);
      const children = childrenForFlow(taskId);
      if (!children.length) return Math.max(nextTrack, task._track + 1);

      const mainChild = children.find(child => child.branchMode === "same") || null;
      let cursor = Math.max(nextTrack, task._track + 1);

      if (mainChild) {
        cursor = assignBranchTracks(mainChild.id, task._track, cursor);
      }

      for (const child of children) {
        if (mainChild && child.id === mainChild.id) continue;

        const childTrack = Math.max(cursor, task._track + 1);
        cursor = assignBranchTracks(child.id, childTrack, childTrack + 1);
      }

      return Math.max(cursor, task._track + 1);
    };
  }

  function relationshipLayoutOrder() {
    const result = [];
    const seen = new Set();

    function visit(taskId) {
      if (!taskId || seen.has(taskId) || !state.tasks[taskId]) return;
      seen.add(taskId);
      result.push(state.tasks[taskId]);
      for (const child of childrenForFlow(taskId)) visit(child.id);
    }

    getRoots().slice().sort(sortByDateThenTitle).forEach(root => visit(root.id));

    for (const task of getTasks()) {
      if (!seen.has(task.id)) result.push(task);
    }

    return result;
  }

  function layoutCollisionKey(task, track = task._track) {
    return [
      safeNormalizeDate(task.targetAt),
      task._dayColumn ?? 0,
      track ?? 0
    ].join(":");
  }

  if (typeof resolveTrackCollisions === "function") {
    resolveTrackCollisions = function resolveRelationshipTrackCollisions() {
      const tasks = relationshipLayoutOrder();

      for (let pass = 0; pass < 12; pass++) {
        let changed = false;
        const occupied = new Set();

        for (const task of tasks) {
          if (!Number.isFinite(task._track)) task._track = 0;

          let track = task._track;
          while (occupied.has(layoutCollisionKey(task, track))) track += 1;

          if (track !== task._track) {
            shiftSubtreeTracks(task.id, track - task._track);
            changed = true;
          }

          occupied.add(layoutCollisionKey(task));
        }

        if (!changed) break;
      }

      maxTrack = Math.max(0, ...getTasks().map(task => Number.isFinite(task._track) ? task._track : 0));
    };
  }

  function injectMobileActionDragStyle() {
    if (document.getElementById("mobileActionDragHideStyle")) return;

    const style = document.createElement("style");
    style.id = "mobileActionDragHideStyle";
    style.textContent = `
      @media (max-width: 980px) {
        #mobileActionBar.dragHidden {
          opacity: 0;
          pointer-events: none;
          transform: translateY(6px) scale(.96);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setMobileActionDragHidden(hidden) {
    const bar = document.getElementById("mobileActionBar");
    if (!bar) return;
    bar.classList.toggle("dragHidden", hidden);
  }

  function isMovingSelectedBlock() {
    try {
      return Boolean(drag && drag.moved);
    } catch {
      return false;
    }
  }

  function installMobileActionDragHide() {
    injectMobileActionDragStyle();

    window.addEventListener("pointermove", () => {
      if (isMovingSelectedBlock()) setMobileActionDragHidden(true);
    }, true);

    const reveal = () => {
      requestAnimationFrame(() => setMobileActionDragHidden(false));
    };

    window.addEventListener("pointerup", reveal, true);
    window.addEventListener("pointercancel", reveal, true);
  }

  function boardEl() {
    return document.getElementById("board");
  }

  function currentTasks() {
    try {
      return getTasks().filter(task => task && task.id);
    } catch {
      return [];
    }
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

  function computeMapTransform(board) {
    return {
      scaleX: WORLD_TO_MAP_SCALE_X,
      scaleY: WORLD_TO_MAP_SCALE_Y,
      camera: {
        x: board.scrollLeft + board.clientWidth / 2,
        y: board.scrollTop + board.clientHeight / 2
      },
      centerX: MAP_WIDTH / 2,
      centerY: (MAP_HEIGHT - MAP_BOTTOM_LABEL_SPACE) / 2
    };
  }

  function taskCenter(task, noteSize) {
    return {
      x: Number(task.x || 0) + noteSize.width / 2,
      y: Number(task.y || 0) + noteSize.height / 2
    };
  }

  function toMini(point, transform) {
    return {
      x: transform.centerX + (point.x - transform.camera.x) * transform.scaleX,
      y: transform.centerY + (point.y - transform.camera.y) * transform.scaleY
    };
  }

  function isInsideMap(point, margin = 14) {
    return point.x >= -margin
      && point.x <= MAP_WIDTH + margin
      && point.y >= -margin
      && point.y <= MAP_HEIGHT - MAP_BOTTOM_LABEL_SPACE + margin;
  }

  function flowMapPath(parent, child, noteSize, transform, vertical) {
    const parentPoint = toMini(taskCenter(parent, noteSize), transform);
    const childPoint = toMini(taskCenter(child, noteSize), transform);

    const dx = childPoint.x - parentPoint.x;
    const dy = childPoint.y - parentPoint.y;
    const sameBranch = child.branchMode === "same" || Math.abs(dx) < 3 || Math.abs(dy) < 3;

    if (sameBranch) {
      return `M ${parentPoint.x} ${parentPoint.y} L ${childPoint.x} ${childPoint.y}`;
    }

    if (vertical) {
      const stepY = Math.sign(dy || 1) * Math.max(5, Math.min(16, Math.abs(dy) * 0.42));
      const elbowY = parentPoint.y + stepY;
      return `M ${parentPoint.x} ${parentPoint.y} L ${parentPoint.x} ${elbowY} L ${childPoint.x} ${elbowY} L ${childPoint.x} ${childPoint.y}`;
    }

    const stepX = Math.sign(dx || 1) * Math.max(5, Math.min(16, Math.abs(dx) * 0.42));
    const elbowX = parentPoint.x + stepX;
    return `M ${parentPoint.x} ${parentPoint.y} L ${elbowX} ${parentPoint.y} L ${elbowX} ${childPoint.y} L ${childPoint.x} ${childPoint.y}`;
  }

  function patchFlowMapLinks() {
    const map = document.getElementById("flowMap");
    const svg = map?.querySelector("svg");
    const linkGroup = svg?.querySelector(".flowMapLinks");
    const board = boardEl();
    if (!map || !svg || !linkGroup || !board || !window.matchMedia(MOBILE_QUERY).matches) return;

    const tasks = currentTasks();
    const taskById = new Map(tasks.map(task => [task.id, task]));
    const noteSize = readNoteSize(board);
    const transform = computeMapTransform(board);
    const vertical = typeof isVerticalMode === "function" ? isVerticalMode() : true;

    const visibleLinks = [];
    for (const task of tasks) {
      if (!task.parentId || !taskById.has(task.parentId)) continue;
      const parent = taskById.get(task.parentId);
      const parentPoint = toMini(taskCenter(parent, noteSize), transform);
      const childPoint = toMini(taskCenter(task, noteSize), transform);
      if (!isInsideMap(parentPoint) && !isInsideMap(childPoint)) continue;
      visibleLinks.push({ parent, child: task });
    }

    const paths = Array.from(linkGroup.querySelectorAll("path.flowMapLink"));
    paths.forEach((path, index) => {
      const link = visibleLinks[index];
      if (!link) return;
      path.setAttribute("d", flowMapPath(link.parent, link.child, noteSize, transform, vertical));
      path.classList.toggle("sameBranch", link.child.branchMode === "same");
      path.classList.toggle("branch", link.child.branchMode !== "same");
    });
  }

  let flowMapPatchQueued = false;
  function scheduleFlowMapPatch() {
    if (flowMapPatchQueued) return;
    flowMapPatchQueued = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flowMapPatchQueued = false;
        patchFlowMapLinks();
      });
    });
  }

  function observeFlowMap() {
    const board = boardEl();
    if (!board) return;

    board.addEventListener("scroll", scheduleFlowMapPatch, { passive: true });
    window.addEventListener("resize", scheduleFlowMapPatch, { passive: true });
    window.matchMedia(MOBILE_QUERY).addEventListener("change", scheduleFlowMapPatch);

    const waitForMap = () => {
      const map = document.getElementById("flowMap");
      const svg = map?.querySelector("svg");
      if (!map || !svg) {
        requestAnimationFrame(waitForMap);
        return;
      }

      new MutationObserver(scheduleFlowMapPatch).observe(svg, { childList: true, subtree: true });
      scheduleFlowMapPatch();
    };

    waitForMap();
  }

  function applyRelationshipLayout() {
    try {
      branchLayout();
      requestRender();
    } catch (error) {
      console.warn("Cherry-ToDo relationship layout fix failed.", error);
    }
  }

  installMobileActionDragHide();
  observeFlowMap();
  applyRelationshipLayout();
})();