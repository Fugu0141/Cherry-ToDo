import type {
  CherryFlowKind,
  CherryScheduleModel,
  CherryTimeGuideMode,
  CherryUIContext,
  CherryUIHandle,
  CherryUIPackage,
  TaskCardModel,
  UIActionResult,
  WorkspaceScreenModel,
} from '../../ui-contract/index';
import {
  beginMobileConnection,
  cancelMobileConnection,
  completeMobileConnection,
} from './interaction/mobile-connection-flow';
import { buildListFlowContext } from './interaction/mobile-flow-presentation';
import { InteractionCoordinator } from './interaction/interaction-coordinator';
import { installMobileBoardInteraction } from './interaction/mobile-board-interaction';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

function button(label: string, action: () => void, className = 'cherry-button'): HTMLButtonElement {
  const node = element('button', className);
  node.type = 'button';
  node.textContent = label;
  node.addEventListener('click', action);
  return node;
}

function labeledInput(
  label: string,
  name: string,
  value = '',
): { wrap: HTMLLabelElement; input: HTMLInputElement } {
  const wrap = element('label', 'cherry-field');
  const text = element('span', 'cherry-label');
  text.textContent = label;
  const input = element('input', 'cherry-input');
  input.name = name;
  input.value = value;
  wrap.append(text, input);
  return { wrap, input };
}

function labeledSelect(
  label: string,
  className = 'cherry-select',
): {
  wrap: HTMLLabelElement;
  select: HTMLSelectElement;
} {
  const wrap = element('label', 'cherry-field');
  const text = element('span', 'cherry-label');
  text.textContent = label;
  const select = element('select', className);
  wrap.append(text, select);
  return { wrap, select };
}

function checkControl(label: string, checked: boolean, onChange: (checked: boolean) => void) {
  const wrap = element('label', 'cherry-toggle');
  const input = element('input');
  input.type = 'checkbox';
  input.checked = checked;
  const text = element('span');
  text.textContent = label;
  input.addEventListener('change', () => onChange(input.checked));
  wrap.append(input, text);
  return wrap;
}

async function perform(context: CherryUIContext, promise: Promise<UIActionResult>): Promise<void> {
  let result = await promise;
  if (result.kind === 'confirmation-required') {
    const confirmation = result.confirmation;
    const accepted = window.confirm(
      `${context.i18n.t(confirmation.titleKey)}\n\n${context.i18n.t(confirmation.messageKey)}`,
    );
    result = accepted
      ? await context.intents.confirmation.confirm(confirmation.id)
      : await context.intents.confirmation.cancel(confirmation.id);
  }
  if (result.kind === 'error') {
    window.alert(context.i18n.t(result.error.messageKey));
  }
}

interface FlowConnectionDraft {
  readonly fromTaskId: string;
  readonly kind: CherryFlowKind;
}

function renderTask(
  context: CherryUIContext,
  task: TaskCardModel,
  onEdit: (taskId: string) => void,
  connectionDraft: FlowConnectionDraft | null,
  startConnection: (taskId: string, kind: CherryFlowKind) => void,
  connectTarget: (taskId: string) => void,
  cancelConnection: () => void,
): HTMLElement {
  const card = element('article', 'cherry-task');
  const states = ['task-card'];
  if (task.status === 'done') states.push('task-completed');
  if (task.blocked) states.push('task-blocked');
  if (task.isDerivedGoal) states.push('derived-goal');
  if (task.isMergeTarget) states.push('merge-target');
  if (connectionDraft?.fromTaskId === task.id) states.push('flow-connect-source');
  else if (connectionDraft !== null) states.push('flow-connect-target');
  card.setAttribute(context.semanticTokens.stateAttribute, states.join(' '));
  card.dataset.taskId = task.id;

  const top = element('div', 'cherry-task-top');
  if (task.canManuallyComplete) {
    const checkbox = element('input', 'cherry-check');
    checkbox.type = 'checkbox';
    checkbox.checked = task.status === 'done';
    checkbox.setAttribute(
      'aria-label',
      context.i18n.t(task.status === 'done' ? 'task.reopen' : 'task.complete'),
    );
    checkbox.addEventListener('change', () => {
      void perform(context, context.intents.task.setCompleted(task.id, checkbox.checked));
    });
    top.append(checkbox);
  }

  const title = element('strong', 'cherry-task-title');
  title.textContent = task.title || '—';
  top.append(title);

  const edit = button(context.i18n.t('task.edit'), () => onEdit(task.id), 'cherry-icon-button');
  top.append(edit);
  card.append(top);

  if (task.isDerivedGoal || task.isMergeTarget) {
    const badges = element('div', 'cherry-task-badges');
    if (task.isDerivedGoal) {
      const goal = element('span', 'cherry-task-badge goal');
      goal.textContent = context.i18n.t('task.goal');
      badges.append(goal);
    }
    if (task.isMergeTarget) {
      const merge = element('span', 'cherry-task-badge merge');
      merge.textContent = context.i18n.t('task.merge');
      badges.append(merge);
    }
    card.append(badges);
  }

  if (task.notes.length > 0) {
    const notes = element('p', 'cherry-task-notes');
    notes.textContent = task.notes;
    card.append(notes);
  }
  if (task.scheduleLabel !== null) {
    const schedule = element('small', 'cherry-task-meta');
    schedule.textContent = task.scheduleLabel;
    card.append(schedule);
  }
  if (task.blockedReasonKey !== null) {
    const blocked = element('small', 'cherry-task-blocked');
    blocked.textContent = `🔒 ${context.i18n.t(task.blockedReasonKey)}`;
    card.append(blocked);
  }

  const connectors = element('div', 'cherry-task-connectors');
  if (connectionDraft === null) {
    const options = [
      ['continuation', '→', 'flow.connectContinuation'],
      ['branch', '↗', 'flow.connectBranch'],
      ['reference', '↝', 'flow.connectReference'],
    ] as const;
    for (const [kind, symbol, labelKey] of options) {
      const handle = button('', () => startConnection(task.id, kind), 'cherry-flow-handle');
      const glyph = element('span', 'cherry-flow-handle-glyph');
      glyph.textContent = symbol;
      const mobileLabel = element('span', 'cherry-mobile-flow-label');
      mobileLabel.textContent = context.i18n.t(labelKey);
      handle.append(glyph, mobileLabel);
      handle.title = context.i18n.t(labelKey);
      handle.setAttribute('aria-label', context.i18n.t(labelKey));
      connectors.append(handle);
    }
  } else if (connectionDraft.fromTaskId === task.id) {
    const cancel = button('×', cancelConnection, 'cherry-flow-handle active');
    cancel.title = context.i18n.t('flow.cancelConnect');
    cancel.setAttribute('aria-label', context.i18n.t('flow.cancelConnect'));
    connectors.append(cancel);
  } else {
    connectors.append(
      button(
        context.i18n.t('flow.chooseTarget'),
        () => connectTarget(task.id),
        'cherry-flow-target-button',
      ),
    );
  }
  card.append(connectors);
  return card;
}

function connectionLabel(workspace: WorkspaceScreenModel, fromId: string, toId: string): string {
  const byId = new Map(workspace.tasks.map((task) => [task.id, task.title]));
  return `${byId.get(fromId) ?? fromId} → ${byId.get(toId) ?? toId}`;
}

function renderConnectionSummary(
  context: CherryUIContext,
  workspace: WorkspaceScreenModel,
): HTMLElement | null {
  if (workspace.connections.length === 0) return null;
  const connections = element('aside', 'cherry-connections');
  for (const edge of workspace.connections) {
    const pill = element('span', 'cherry-connection');
    pill.setAttribute(
      context.semanticTokens.stateAttribute,
      edge.kind === 'branch'
        ? 'flow-branch'
        : edge.kind === 'reference'
          ? 'flow-reference'
          : 'flow-continuation',
    );
    const label = element('span');
    label.textContent = connectionLabel(workspace, edge.fromTaskId, edge.toTaskId);
    const remove = button(
      '×',
      () => {
        void perform(context, context.intents.flow.disconnect(edge.id));
      },
      'cherry-connection-remove',
    );
    remove.title = context.i18n.t('flow.disconnect');
    remove.setAttribute('aria-label', context.i18n.t('flow.disconnect'));
    pill.append(label, remove);
    connections.append(pill);
  }
  return connections;
}

function renderBoard(
  context: CherryUIContext,
  workspace: WorkspaceScreenModel,
  onEdit: (taskId: string) => void,
  collapsedLaneIds: ReadonlySet<string>,
  toggleLane: (laneId: string) => void,
  connectionDraft: FlowConnectionDraft | null,
  startConnection: (taskId: string, kind: CherryFlowKind) => void,
  connectTarget: (taskId: string) => void,
  cancelConnection: () => void,
  interactionCoordinator: InteractionCoordinator,
  registerInteractionCleanup: (cleanup: () => void) => void,
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

  registerInteractionCleanup(
    installMobileBoardInteraction({
      scroll,
      canvas,
      workspace,
      collapsedLaneIds,
      coordinator: interactionCoordinator,
      dropTask: (taskId, target) => {
        void perform(context, context.intents.board.dropTask({ taskId, target }));
      },
    }),
  );

  scroll.append(canvas);
  return scroll;
}

function renderList(
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
    const card = renderTask(
      context,
      task,
      onEdit,
      connectionDraft,
      startConnection,
      connectTarget,
      cancelConnection,
    );
    const flow = buildListFlowContext(workspace, task.id);
    if (
      flow.incomingStructuralTitles.length > 0 ||
      flow.outgoingStructuralTitles.length > 0 ||
      flow.referenceTitles.length > 0
    ) {
      const contextLine = element('div', 'cherry-list-flow-context');
      if (flow.incomingStructuralTitles.length > 0) {
        const incoming = element('span');
        incoming.textContent = `${context.i18n.t('flow.from')}: ${flow.incomingStructuralTitles.join(', ')}`;
        contextLine.append(incoming);
      }
      if (flow.outgoingStructuralTitles.length > 0) {
        const outgoing = element('span');
        outgoing.textContent = `${context.i18n.t('flow.to')}: ${flow.outgoingStructuralTitles.join(', ')}`;
        contextLine.append(outgoing);
      }
      if (flow.referenceTitles.length > 0) {
        const references = element('span');
        references.textContent = `↝ ${flow.referenceTitles.join(', ')}`;
        references.setAttribute('aria-label', context.i18n.t('flow.connectReference'));
        contextLine.append(references);
      }
      card.append(contextLine);
    }
    list.append(card);
  }
  const connections = renderConnectionSummary(context, workspace);
  if (connections !== null) list.append(connections);
  return list;
}

function scheduleFromEditor(
  kind: HTMLSelectElement,
  date: HTMLInputElement,
  time: HTMLInputElement,
): CherryScheduleModel | null {
  if (kind.value === 'none') return { kind: 'none' };
  if (date.value.length === 0) return null;
  if (kind.value === 'date') return { kind: 'date', date: date.value };
  if (time.value.length === 0) return null;
  return { kind: 'datetime', date: date.value, time: time.value };
}

function renderWorkspace(
  root: HTMLElement,
  context: CherryUIContext,
  workspace: WorkspaceScreenModel,
  selectedTaskId: string | null,
  selectTask: (id: string | null) => void,
  collapsedLaneIds: ReadonlySet<string>,
  toggleLane: (laneId: string) => void,
  connectionDraft: FlowConnectionDraft | null,
  startConnection: (taskId: string, kind: CherryFlowKind) => void,
  connectTarget: (taskId: string) => void,
  cancelConnection: () => void,
  interactionCoordinator: InteractionCoordinator,
  registerInteractionCleanup: (cleanup: () => void) => void,
): void {
  const header = element('header', 'cherry-header');
  const brand = button(
    context.i18n.t('app.name'),
    () => {
      void perform(context, context.intents.workspace.goToStart());
    },
    'cherry-brand',
  );
  const title = element('h1', 'cherry-workspace-title');
  title.textContent = workspace.workspaceName;
  const viewSwitch = element('div', 'cherry-segment');
  const boardButton = button(
    context.i18n.t('workspace.board'),
    () => {
      void perform(context, context.intents.workspace.setView('board'));
    },
    workspace.activeView === 'board' ? 'cherry-segment-button active' : 'cherry-segment-button',
  );
  const listButton = button(
    context.i18n.t('workspace.list'),
    () => {
      void perform(context, context.intents.workspace.setView('list'));
    },
    workspace.activeView === 'list' ? 'cherry-segment-button active' : 'cherry-segment-button',
  );
  viewSwitch.append(boardButton, listButton);
  const historyActions = element('div', 'cherry-history-actions');
  const undo = button(
    '↶',
    () => {
      void perform(context, context.intents.history.undo());
    },
    'cherry-icon-button',
  );
  undo.disabled = !workspace.canUndo;
  undo.title = context.i18n.t('history.undo');
  undo.setAttribute('aria-label', context.i18n.t('history.undo'));
  const redo = button(
    '↷',
    () => {
      void perform(context, context.intents.history.redo());
    },
    'cherry-icon-button',
  );
  redo.disabled = !workspace.canRedo;
  redo.title = context.i18n.t('history.redo');
  redo.setAttribute('aria-label', context.i18n.t('history.redo'));
  historyActions.append(undo, redo);
  header.append(brand, title, viewSwitch, historyActions);

  const toolbar = element('section', 'cherry-toolbar');
  const taskForm = element('form', 'cherry-inline-form');
  const newTitle = labeledInput(context.i18n.t('task.title'), 'title');
  const add = element('button', 'cherry-button primary');
  add.type = 'submit';
  add.textContent = context.i18n.t('task.create');
  taskForm.append(newTitle.wrap, add);
  taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void perform(context, context.intents.task.create({ title: newTitle.input.value })).then(() => {
      newTitle.input.value = '';
    });
  });
  toolbar.append(taskForm);

  if (workspace.tasks.length === 0) {
    const startFlow = element('section', 'cherry-mobile-flow-start');
    const startFlowTitle = element('strong');
    startFlowTitle.textContent = context.i18n.t('mobile.startFlow');
    const startFlowHint = element('p');
    startFlowHint.textContent = context.i18n.t('mobile.startFlowHint');
    const startFlowAction = button(
      context.i18n.t('task.create'),
      () => newTitle.input.focus(),
      'cherry-button primary',
    );
    startFlow.append(startFlowTitle, startFlowHint, startFlowAction);
    toolbar.append(startFlow);
  }

  if (connectionDraft !== null) {
    const connectionHint = element('p', 'cherry-mobile-connection-hint');
    connectionHint.textContent = context.i18n.t('mobile.connectionHint');
    connectionHint.setAttribute('role', 'status');
    toolbar.append(connectionHint);
  }

  if (workspace.tasks.length >= 2) {
    const flowForm = element('form', 'cherry-flow-form');
    const from = element('select', 'cherry-select');
    const to = element('select', 'cherry-select');
    for (const task of workspace.tasks) {
      const a = element('option');
      a.value = task.id;
      a.textContent = task.title;
      from.append(a);
      const b = element('option');
      b.value = task.id;
      b.textContent = task.title;
      to.append(b);
    }
    if (workspace.tasks[1] !== undefined) to.value = workspace.tasks[1].id;
    const kind = element('select', 'cherry-select');
    const kinds: readonly CherryFlowKind[] = ['continuation', 'branch', 'reference'];
    const symbols: Readonly<Record<CherryFlowKind, string>> = {
      continuation: '→',
      branch: '↗',
      reference: '↝',
    };
    for (const value of kinds) {
      const option = element('option');
      option.value = value;
      option.textContent = symbols[value];
      kind.append(option);
    }
    const connect = element('button', 'cherry-button');
    connect.type = 'submit';
    connect.textContent = context.i18n.t('flow.connect');
    flowForm.append(from, kind, to, connect);
    flowForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (from.value === to.value) return;
      void perform(
        context,
        context.intents.flow.connect({
          fromTaskId: from.value,
          toTaskId: to.value,
          kind: kind.value as CherryFlowKind,
        }),
      );
    });
    toolbar.append(flowForm);
  }

  if (workspace.linearFlowOrder !== null) {
    const reorder = element('section', 'cherry-flow-reorder');
    const heading = element('strong');
    heading.textContent = context.i18n.t('flow.reorder');
    reorder.append(heading);
    const byId = new Map(workspace.tasks.map((task) => [task.id, task.title]));
    for (const [index, taskId] of workspace.linearFlowOrder.entries()) {
      const row = element('div', 'cherry-flow-reorder-row');
      const name = element('span');
      name.textContent = byId.get(taskId) ?? taskId;
      const earlier = button(
        '↑',
        () => {
          if (index === 0 || workspace.linearFlowOrder === null) return;
          const next = [...workspace.linearFlowOrder];
          const current = next[index];
          const previous = next[index - 1];
          if (current === undefined || previous === undefined) return;
          next[index - 1] = current;
          next[index] = previous;
          void perform(context, context.intents.flow.reorder(next));
        },
        'cherry-icon-button',
      );
      earlier.disabled = index === 0;
      earlier.title = context.i18n.t('flow.moveEarlier');
      earlier.setAttribute('aria-label', context.i18n.t('flow.moveEarlier'));
      const later = button(
        '↓',
        () => {
          if (workspace.linearFlowOrder === null || index >= workspace.linearFlowOrder.length - 1) {
            return;
          }
          const next = [...workspace.linearFlowOrder];
          const current = next[index];
          const following = next[index + 1];
          if (current === undefined || following === undefined) return;
          next[index] = following;
          next[index + 1] = current;
          void perform(context, context.intents.flow.reorder(next));
        },
        'cherry-icon-button',
      );
      later.disabled = index >= workspace.linearFlowOrder.length - 1;
      later.title = context.i18n.t('flow.moveLater');
      later.setAttribute('aria-label', context.i18n.t('flow.moveLater'));
      row.append(name, earlier, later);
      reorder.append(row);
    }
    toolbar.append(reorder);
  }

  if (workspace.activeView === 'board') {
    const settings = element('div', 'cherry-board-settings');
    const applySettings = (next: Partial<typeof workspace.board.settings>) => {
      void perform(
        context,
        context.intents.workspace.setBoardSettings({ ...workspace.board.settings, ...next }),
      );
    };
    settings.append(
      checkControl(
        context.i18n.t('board.dateLanes'),
        workspace.board.settings.showDateLanes,
        (checked) => applySettings({ showDateLanes: checked }),
      ),
      checkControl(
        context.i18n.t('board.autoLayout'),
        workspace.board.settings.autoLayout,
        (checked) => applySettings({ autoLayout: checked }),
      ),
    );
    const timeGuide = labeledSelect(context.i18n.t('board.timeGuide'));
    const timeGuideOptions: readonly CherryTimeGuideMode[] = ['auto', 'shown', 'hidden'];
    const timeGuideLabels: Record<CherryTimeGuideMode, string> = {
      auto: context.i18n.t('board.timeGuideAuto'),
      shown: context.i18n.t('board.timeGuideShown'),
      hidden: context.i18n.t('board.timeGuideHidden'),
    };
    for (const value of timeGuideOptions) {
      const option = element('option');
      option.value = value;
      option.textContent = timeGuideLabels[value];
      timeGuide.select.append(option);
    }
    timeGuide.select.value = workspace.board.settings.timeGuide;
    timeGuide.select.addEventListener('change', () => {
      applySettings({ timeGuide: timeGuide.select.value as CherryTimeGuideMode });
    });
    settings.append(timeGuide.wrap);
    toolbar.append(settings);
  }

  const content =
    workspace.activeView === 'board'
      ? renderBoard(
          context,
          workspace,
          (id) => selectTask(id),
          collapsedLaneIds,
          toggleLane,
          connectionDraft,
          startConnection,
          connectTarget,
          cancelConnection,
          interactionCoordinator,
          registerInteractionCleanup,
        )
      : renderList(
          context,
          workspace,
          (id) => selectTask(id),
          connectionDraft,
          startConnection,
          connectTarget,
          cancelConnection,
        );

  root.replaceChildren(header, toolbar, content);

  if (workspace.activeView === 'board') {
    const connections = renderConnectionSummary(context, workspace);
    if (connections !== null) {
      const flowSummary = element('section', 'cherry-board-flow-summary');
      flowSummary.append(connections);
      root.append(flowSummary);
    }
  }

  if (selectedTaskId !== null) {
    const task = workspace.tasks.find((candidate) => candidate.id === selectedTaskId);
    if (task !== undefined) {
      const overlay = element('div', 'cherry-overlay');
      const panel = element('form', 'cherry-editor');
      const heading = element('h2');
      heading.textContent = context.i18n.t('task.edit');
      const titleField = labeledInput(context.i18n.t('task.title'), 'title', task.title);
      const notesLabel = element('label', 'cherry-field');
      const notesText = element('span', 'cherry-label');
      notesText.textContent = context.i18n.t('task.notes');
      const notes = element('textarea', 'cherry-textarea');
      notes.value = task.notes;
      notesLabel.append(notesText, notes);

      const scheduleKind = labeledSelect(context.i18n.t('task.schedule'));
      const scheduleKinds = [
        ['none', context.i18n.t('task.scheduleNone')],
        ['date', context.i18n.t('task.scheduleDate')],
        ['datetime', context.i18n.t('task.scheduleDateTime')],
      ] as const;
      for (const [value, label] of scheduleKinds) {
        const option = element('option');
        option.value = value;
        option.textContent = label;
        scheduleKind.select.append(option);
      }
      scheduleKind.select.value = task.schedule.kind;

      const dateField = labeledInput(
        context.i18n.t('task.date'),
        'date',
        task.schedule.kind === 'none' ? '' : task.schedule.date,
      );
      dateField.input.type = 'date';
      const timeField = labeledInput(
        context.i18n.t('task.time'),
        'time',
        task.schedule.kind === 'datetime' ? task.schedule.time : '',
      );
      timeField.input.type = 'time';
      const scheduleFields = element('div', 'cherry-schedule-fields');
      scheduleFields.append(dateField.wrap, timeField.wrap);
      const syncScheduleFields = () => {
        const noDate = scheduleKind.select.value === 'none';
        const dateTime = scheduleKind.select.value === 'datetime';
        dateField.input.disabled = noDate;
        timeField.input.disabled = !dateTime;
      };
      scheduleKind.select.addEventListener('change', syncScheduleFields);
      syncScheduleFields();

      const actions = element('div', 'cherry-editor-actions');
      const cancel = button(context.i18n.t('common.cancel'), () => selectTask(null));
      const save = element('button', 'cherry-button primary');
      save.type = 'submit';
      save.textContent = context.i18n.t('common.save');
      actions.append(cancel, save);
      const danger = element('div', 'cherry-editor-danger');
      const deleteOnly = button(
        context.i18n.t('task.deleteOnly'),
        () => {
          if (!window.confirm(context.i18n.t('task.deleteConfirm'))) return;
          void perform(context, context.intents.task.deleteOnly(task.id)).then(() =>
            selectTask(null),
          );
        },
        'cherry-button danger',
      );
      const deleteDownstream = button(
        context.i18n.t('task.deleteDownstream'),
        () => {
          if (!window.confirm(context.i18n.t('task.deleteConfirm'))) return;
          void perform(context, context.intents.task.deleteDownstream(task.id)).then(() =>
            selectTask(null),
          );
        },
        'cherry-button danger ghost',
      );
      danger.append(deleteOnly, deleteDownstream);
      panel.append(
        heading,
        titleField.wrap,
        notesLabel,
        scheduleKind.wrap,
        scheduleFields,
        actions,
        danger,
      );
      panel.addEventListener('submit', (event) => {
        event.preventDefault();
        const schedule = scheduleFromEditor(scheduleKind.select, dateField.input, timeField.input);
        if (schedule === null) {
          window.alert(context.i18n.t('error.validation'));
          return;
        }
        void (async () => {
          await perform(
            context,
            context.intents.task.update({
              taskId: task.id,
              title: titleField.input.value,
              notes: notes.value,
            }),
          );
          await perform(context, context.intents.task.setSchedule(task.id, schedule));
          selectTask(null);
        })();
      });
      overlay.append(panel);
      root.append(overlay);
    }
  }
}

export class DefaultCherryUI implements CherryUIPackage<HTMLElement> {
  mount(root: HTMLElement, context: CherryUIContext): CherryUIHandle {
    let selectedTaskId: string | null = null;
    let connectionDraft: FlowConnectionDraft | null = null;
    let lastWorkspaceId: string | null = null;
    const collapsedLaneIds = new Set<string>();
    const interactionCoordinator = new InteractionCoordinator();
    let boardInteractionCleanup: (() => void) | null = null;

    const render = (): void => {
      boardInteractionCleanup?.();
      boardInteractionCleanup = null;
      const screen = context.getScreen();
      if (screen.kind === 'loading') {
        const loading = element('main', 'cherry-center');
        const name = element('h1', 'cherry-logo');
        name.textContent = context.i18n.t('app.name');
        loading.append(name);
        root.replaceChildren(loading);
        return;
      }

      if (screen.kind === 'storage-decision') {
        const center = element('main', 'cherry-center');
        const card = element('section', 'cherry-dialog');
        const title = element('h1');
        title.textContent = context.i18n.t('storage.title');
        const description = element('p');
        description.textContent = context.i18n.t('storage.description');
        const actions = element('div', 'cherry-dialog-actions');
        actions.append(
          button(context.i18n.t('storage.notNow'), () => {
            void perform(context, context.intents.storage.notNow());
          }),
          button(
            context.i18n.t('storage.allow'),
            () => {
              void perform(context, context.intents.storage.allow());
            },
            'cherry-button primary',
          ),
        );
        card.append(title, description, actions);
        center.append(card);
        root.replaceChildren(center);
        return;
      }

      if (screen.kind === 'start') {
        const main = element('main', 'cherry-start');
        const heading = element('div', 'cherry-start-heading');
        const logo = element('h1', 'cherry-logo');
        logo.textContent = context.i18n.t('app.name');
        const subtitle = element('p');
        subtitle.textContent = context.i18n.t('start.title');
        heading.append(logo, subtitle);
        const form = element('form', 'cherry-create-workspace');
        const field = labeledInput(context.i18n.t('start.workspaceName'), 'name');
        const create = element('button', 'cherry-button primary');
        create.type = 'submit';
        create.textContent = context.i18n.t('start.createWorkspace');
        form.append(field.wrap, create);
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          void perform(context, context.intents.workspace.create({ name: field.input.value }));
        });
        const list = element('section', 'cherry-workspace-list');
        for (const workspace of screen.workspaces) {
          const open = button(
            workspace.name,
            () => {
              void perform(context, context.intents.workspace.open(workspace.id));
            },
            'cherry-workspace-card',
          );
          list.append(open);
        }
        main.append(heading, form, list);
        root.replaceChildren(main);
        return;
      }

      if (screen.kind === 'error') {
        const center = element('main', 'cherry-center');
        const card = element('section', 'cherry-dialog');
        const title = element('h1');
        title.textContent = context.i18n.t('app.name');
        const message = element('p');
        message.textContent = context.i18n.t(screen.error.messageKey);
        card.append(title, message);
        center.append(card);
        root.replaceChildren(center);
        return;
      }

      if (lastWorkspaceId !== screen.workspace.workspaceId) {
        collapsedLaneIds.clear();
        connectionDraft = null;
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
        connectionDraft,
        (taskId, kind) => {
          const draft = beginMobileConnection(interactionCoordinator, taskId, kind);
          if (draft === null) return;
          connectionDraft = draft;
          render();
        },
        (taskId) => {
          if (connectionDraft === null) return;
          const intent = completeMobileConnection(interactionCoordinator, taskId);
          if (intent === null) return;
          connectionDraft = null;
          render();
          void perform(context, context.intents.flow.connect(intent));
        },
        () => {
          cancelMobileConnection(interactionCoordinator);
          connectionDraft = null;
          render();
        },
        interactionCoordinator,
        (cleanup) => {
          boardInteractionCleanup = cleanup;
        },
      );
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      if (selectedTaskId === null && connectionDraft === null) return;
      selectedTaskId = null;
      cancelMobileConnection(interactionCoordinator);
      connectionDraft = null;
      render();
    };
    document.addEventListener('keydown', onKeyDown);
    const unsubscribe = context.subscribe(render);
    render();
    return {
      unmount() {
        boardInteractionCleanup?.();
        interactionCoordinator.cancel();
        document.removeEventListener('keydown', onKeyDown);
        unsubscribe();
        root.replaceChildren();
      },
    };
  }
}
