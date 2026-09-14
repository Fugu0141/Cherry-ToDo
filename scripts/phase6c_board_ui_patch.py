from pathlib import Path

p = Path('src/ui/default/index.ts')
s = p.read_text()

start = s.index('function renderBoard(')
end = s.index('function renderList(', start)
replacement = '''function renderBoard(
  context: CherryUIContext,
  workspace: WorkspaceScreenModel,
  onEdit: (taskId: string) => void,
  collapsedLaneIds: ReadonlySet<string>,
  toggleLane: (laneId: string) => void,
  connectionDraft: FlowConnectionDraft | null,
  startConnection: (taskId: string, kind: CherryFlowKind) => void,
  connectTarget: (taskId: string) => void,
  cancelConnection: () => void,
): HTMLElement {
  const scroll = element('main', 'cherry-board-scroll');
  const canvas = element('section', 'cherry-board-canvas');
  canvas.style.minWidth = `${Math.max(workspace.board.width, 760)}px`;
  canvas.style.minHeight = `${Math.max(workspace.board.height, 520)}px`;
  canvas.dataset.timeGuide = workspace.board.settings.timeGuide;
  const dragMime = 'application/x-cherry-task-id';

  const laneByTaskId = new Map<string, string>();
  for (const lane of workspace.board.lanes) {
    for (const taskId of lane.taskIds) laneByTaskId.set(taskId, lane.id);
  }
  const hiddenTaskIds = new Set(
    workspace.tasks
      .filter((task) => {
        const laneId = laneByTaskId.get(task.id);
        return laneId !== undefined && collapsedLaneIds.has(laneId);
      })
      .map((task) => task.id),
  );

  const flowLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  flowLayer.setAttribute('class', 'cherry-flow-layer');
  flowLayer.setAttribute(
    'viewBox',
    `0 0 ${Math.max(workspace.board.width, 760)} ${Math.max(workspace.board.height, 520)}`,
  );
  flowLayer.setAttribute('aria-hidden', 'true');
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const markerColors: Readonly<Record<CherryFlowKind, string>> = {
    continuation: '#68717d',
    branch: '#d83352',
    reference: '#89919c',
  };
  for (const kind of ['continuation', 'branch', 'reference'] as const) {
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.id = `cherry-arrow-${kind}`;
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '7');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('orient', 'auto-start-reverse');
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrow.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    arrow.setAttribute('fill', markerColors[kind]);
    marker.append(arrow);
    defs.append(marker);
  }
  flowLayer.append(defs);
  for (const edge of workspace.connections) {
    if (
      edge.path === null ||
      hiddenTaskIds.has(edge.fromTaskId) ||
      hiddenTaskIds.has(edge.toTaskId)
    ) {
      continue;
    }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', edge.path);
    path.setAttribute('class', 'cherry-flow-line');
    path.setAttribute(
      context.semanticTokens.stateAttribute,
      edge.kind === 'branch'
        ? 'flow-branch'
        : edge.kind === 'reference'
          ? 'flow-reference'
          : 'flow-continuation',
    );
    path.setAttribute('marker-end', `url(#cherry-arrow-${edge.kind})`);
    flowLayer.append(path);
  }
  canvas.append(flowLayer);

  const droppedTaskId = (event: DragEvent): string | null => {
    const value =
      event.dataTransfer?.getData(dragMime) || event.dataTransfer?.getData('text/plain');
    return value === undefined || value.length === 0 ? null : value;
  };

  canvas.addEventListener('dragover', (event) => {
    if (event.dataTransfer !== null) event.preventDefault();
  });
  canvas.addEventListener('drop', (event) => {
    event.preventDefault();
    const taskId = droppedTaskId(event);
    if (taskId === null) return;
    const rect = canvas.getBoundingClientRect();
    void perform(
      context,
      context.intents.board.dropTask({
        taskId,
        target: {
          kind: 'canvas',
          point: { x: event.clientX - rect.left, y: event.clientY - rect.top },
        },
      }),
    );
  });

  if (workspace.board.settings.showDateLanes) {
    for (const lane of workspace.board.lanes) {
      const collapsed = collapsedLaneIds.has(lane.id);
      const laneNode = element('section', 'cherry-date-lane');
      laneNode.dataset.laneId = lane.id;
      laneNode.dataset.collapsed = String(collapsed);
      laneNode.style.top = `${lane.startY}px`;
      laneNode.style.height = `${collapsed ? 52 : lane.height}px`;
      const laneTitle =
        lane.kind === 'date' && lane.date !== null ? lane.date : context.i18n.t('board.undated');
      const label = button(
        `${collapsed ? '＋' : '−'} ${laneTitle}`,
        () => toggleLane(lane.id),
        'cherry-date-lane-label',
      );
      laneNode.append(label);

      laneNode.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.stopPropagation();
        laneNode.dataset.dropActive = 'true';
      });
      laneNode.addEventListener('dragleave', () => {
        delete laneNode.dataset.dropActive;
      });
      laneNode.addEventListener('drop', (event) => {
        event.preventDefault();
        event.stopPropagation();
        delete laneNode.dataset.dropActive;
        const taskId = droppedTaskId(event);
        if (taskId === null) return;
        const canvasRect = canvas.getBoundingClientRect();
        const laneRect = laneNode.getBoundingClientRect();
        const localY = collapsed ? 0 : Math.max(0, event.clientY - laneRect.top - 68);
        void perform(
          context,
          context.intents.board.dropTask({
            taskId,
            target: {
              kind: 'date-lane',
              date: lane.date,
              point: { x: event.clientX - canvasRect.left, y: localY },
              collapsed,
            },
          }),
        );
      });
      canvas.append(laneNode);
    }
  }

  for (const task of workspace.tasks) {
    const card = renderTask(
      context,
      task,
      onEdit,
      connectionDraft,
      startConnection,
      connectTarget,
      cancelConnection,
    );
    card.classList.add('cherry-board-task');
    card.draggable = true;
    card.addEventListener('dragstart', (event) => {
      if (event.dataTransfer === null) return;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData(dragMime, task.id);
      event.dataTransfer.setData('text/plain', task.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    if (hiddenTaskIds.has(task.id)) card.hidden = true;
    if (task.position !== null) {
      card.style.left = `${task.position.x}px`;
      card.style.top = `${task.position.y}px`;
    }
    canvas.append(card);
  }

  scroll.append(canvas);
  return scroll;
}

'''
s = s[:start] + replacement + s[end:]

start = s.index('function renderList(')
end = s.index('function scheduleFromEditor(', start)
replacement = '''function renderList(
  context: CherryUIContext,
  workspace: WorkspaceScreenModel,
  onEdit: (taskId: string) => void,
  connectionDraft: FlowConnectionDraft | null,
  startConnection: (taskId: string, kind: CherryFlowKind) => void,
  connectTarget: (taskId: string) => void,
  cancelConnection: () => void,
): HTMLElement {
  const list = element('main', 'cherry-list');
  for (const task of workspace.tasks) {
    list.append(
      renderTask(
        context,
        task,
        onEdit,
        connectionDraft,
        startConnection,
        connectTarget,
        cancelConnection,
      ),
    );
  }
  const connections = renderConnectionSummary(context, workspace);
  if (connections !== null) list.append(connections);
  return list;
}

'''
s = s[:start] + replacement + s[end:]
p.write_text(s)
