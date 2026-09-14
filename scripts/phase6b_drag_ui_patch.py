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
): HTMLElement {
  const scroll = element('main', 'cherry-board-scroll');
  const canvas = element('section', 'cherry-board-canvas');
  canvas.style.minWidth = `${Math.max(workspace.board.width, 760)}px`;
  canvas.style.minHeight = `${Math.max(workspace.board.height, 520)}px`;
  canvas.dataset.timeGuide = workspace.board.settings.timeGuide;
  const dragMime = 'application/x-cherry-task-id';

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

  const laneByTaskId = new Map<string, string>();
  for (const lane of workspace.board.lanes) {
    for (const taskId of lane.taskIds) laneByTaskId.set(taskId, lane.id);
  }

  for (const task of workspace.tasks) {
    const card = renderTask(context, task, onEdit);
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
    const laneId = laneByTaskId.get(task.id);
    if (laneId !== undefined && collapsedLaneIds.has(laneId)) card.hidden = true;
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

old = '''  selectedTaskId: string | null,
  selectTask: (id: string | null) => void,
): void {'''
new = '''  selectedTaskId: string | null,
  selectTask: (id: string | null) => void,
  collapsedLaneIds: ReadonlySet<string>,
  toggleLane: (laneId: string) => void,
): void {'''
if old not in s:
    raise SystemExit('renderWorkspace signature target not found')
s = s.replace(old, new, 1)

old = '''      ? renderBoard(context, workspace, (id) => selectTask(id))
      : renderList(context, workspace, (id) => selectTask(id));'''
new = '''      ? renderBoard(
          context,
          workspace,
          (id) => selectTask(id),
          collapsedLaneIds,
          toggleLane,
        )
      : renderList(context, workspace, (id) => selectTask(id));'''
if old not in s:
    raise SystemExit('renderBoard call target not found')
s = s.replace(old, new, 1)

old = '''  mount(root: HTMLElement, context: CherryUIContext): CherryUIHandle {
    let selectedTaskId: string | null = null;

    const render = (): void => {'''
new = '''  mount(root: HTMLElement, context: CherryUIContext): CherryUIHandle {
    let selectedTaskId: string | null = null;
    let lastWorkspaceId: string | null = null;
    const collapsedLaneIds = new Set<string>();

    const render = (): void => {'''
if old not in s:
    raise SystemExit('mount state target not found')
s = s.replace(old, new, 1)

old = '''      renderWorkspace(root, context, screen.workspace, selectedTaskId, (id) => {
        selectedTaskId = id;
        render();
      });'''
new = '''      if (lastWorkspaceId !== screen.workspace.workspaceId) {
        collapsedLaneIds.clear();
        lastWorkspaceId = screen.workspace.workspaceId;
      }
      renderWorkspace(
        root,
        context,
        screen.workspace,
        selectedTaskId,
        (id) => {
          selectedTaskId = id;
          render();
        },
        collapsedLaneIds,
        (laneId) => {
          if (collapsedLaneIds.has(laneId)) collapsedLaneIds.delete(laneId);
          else collapsedLaneIds.add(laneId);
          render();
        },
      );'''
if old not in s:
    raise SystemExit('renderWorkspace call target not found')
s = s.replace(old, new, 1)
p.write_text(s)
