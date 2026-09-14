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
import { InteractionCoordinator } from '../default/interaction/interaction-coordinator';
import { installDesktopHandleConnection } from './interaction/desktop-handle-connection';
import { installMobileFlowMap } from './interaction/mobile-flow-map';
import { installMobileBoardInteraction } from '../default/interaction/mobile-board-interaction';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function btn(
  label: string,
  onClick: (event: MouseEvent) => void,
  className = 'cg-btn',
): HTMLButtonElement {
  const node = el('button', className);
  node.type = 'button';
  node.textContent = label;
  node.addEventListener('click', onClick);
  return node;
}

async function run(
  context: CherryUIContext,
  promise: Promise<UIActionResult>,
): Promise<UIActionResult> {
  let result = await promise;
  if (result.kind === 'confirmation-required') {
    const c = result.confirmation;
    const accepted = window.confirm(
      `${context.i18n.t(c.titleKey)}\n\n${context.i18n.t(c.messageKey)}`,
    );
    result = accepted
      ? await context.intents.confirmation.confirm(c.id)
      : await context.intents.confirmation.cancel(c.id);
  }
  if (result.kind === 'error') window.alert(context.i18n.t(result.error.messageKey));
  return result;
}

function field(label: string, value = ''): { wrap: HTMLLabelElement; input: HTMLInputElement } {
  const wrap = el('label', 'cg-field');
  const caption = el('span', 'cg-field-label');
  caption.textContent = label;
  const input = el('input', 'cg-input');
  input.value = value;
  wrap.append(caption, input);
  return { wrap, input };
}

function downloadTextFile(fileName: string, mimeType: string, content: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function scheduleValue(task: TaskCardModel): { kind: string; date: string; time: string } {
  if (task.schedule.kind === 'none') return { kind: 'none', date: '', time: '' };
  if (task.schedule.kind === 'date') return { kind: 'date', date: task.schedule.date, time: '' };
  return { kind: 'datetime', date: task.schedule.date, time: task.schedule.time };
}

interface CreateDraft {
  readonly parentTaskId: string | null;
  readonly kind: CherryFlowKind;
}

interface ConnectDraft {
  readonly fromTaskId: string;
  readonly kind: CherryFlowKind;
}

export class CherryGameUI implements CherryUIPackage<HTMLElement> {
  mount(root: HTMLElement, context: CherryUIContext): CherryUIHandle {
    let selectedTaskId: string | null = null;
    let createDraft: CreateDraft | null = null;
    let editingTaskId: string | null = null;
    let connectDraft: ConnectDraft | null = null;
    let settingsOpen = false;
    let tabMenuId: string | null = null;
    let boardCleanup: (() => void) | null = null;
    let lastTabId: string | null = null;
    const collapsedLaneIds = new Set<string>();
    const coordinator = new InteractionCoordinator();

    const perform = (promise: Promise<UIActionResult>) => run(context, promise);
    const tr = (ja: string, en: string): string => (context.i18n.locale === 'ja' ? ja : en);

    const currentWorkspace = (): WorkspaceScreenModel | null => {
      const screen = context.getScreen();
      return screen.kind === 'workspace' ? screen.workspace : null;
    };

    const createTask = async (
      title: string,
      parentTaskId: string | null,
      kind: CherryFlowKind,
    ): Promise<void> => {
      const before = currentWorkspace();
      const existing = new Set(before?.tasks.map((task) => task.id) ?? []);
      const result = await perform(context.intents.task.create({ title }));
      if (result.kind !== 'ok' || parentTaskId === null) return;
      const after = currentWorkspace();
      const created = after?.tasks.find((task) => !existing.has(task.id));
      if (!created) return;
      await perform(
        context.intents.flow.connect({ fromTaskId: parentTaskId, toTaskId: created.id, kind }),
      );
      selectedTaskId = created.id;
    };

    const closeTransient = (): void => {
      createDraft = null;
      editingTaskId = null;
      connectDraft = null;
      settingsOpen = false;
      tabMenuId = null;
      coordinator.cancel();
    };

    const renderStart = (
      screen: Extract<ReturnType<CherryUIContext['getScreen']>, { kind: 'start' }>,
    ): void => {
      const main = el('main', 'cg-start');
      const hero = el('section', 'cg-start-hero');
      const brand = el('div', 'cg-wordmark');
      brand.textContent = 'Cherry';
      const title = el('h1');
      title.textContent = tr(
        '流れを置いて、つないで、進める。',
        'Place it. Connect it. Move forward.',
      );
      const sub = el('p');
      sub.textContent = tr(
        'タスクをリストに入力するのではなく、ボードを直接触って計画します。',
        'Plan by working directly on the board instead of filling out a task form.',
      );
      const newButton = btn(
        tr('＋ 新しいワークスペース', '＋ New workspace'),
        () => {
          const name = window.prompt(tr('ワークスペース名', 'Workspace name'), 'My Cherry');
          if (!name?.trim()) return;
          void perform(context.intents.workspace.create({ name: name.trim() }));
        },
        'cg-btn cg-primary cg-large',
      );
      hero.append(brand, title, sub, newButton);
      main.append(hero);

      if (screen.workspaces.length > 0) {
        const recent = el('section', 'cg-start-recent');
        const heading = el('h2');
        heading.textContent = tr('つづきから', 'Continue');
        recent.append(heading);
        const grid = el('div', 'cg-workspace-grid');
        for (const workspace of screen.workspaces) {
          const card = btn(
            workspace.name,
            () => {
              void perform(context.intents.workspace.open(workspace.id));
            },
            'cg-workspace-card',
          );
          grid.append(card);
        }
        recent.append(grid);
        main.append(recent);
      }
      root.replaceChildren(main);
    };

    const renderTaskCard = (task: TaskCardModel): HTMLElement => {
      const card = el('article', 'cg-task');
      card.dataset.taskId = task.id;
      if (task.id === selectedTaskId) card.dataset.selected = 'true';
      if (task.status === 'done') card.dataset.done = 'true';
      if (task.blocked) card.dataset.blocked = 'true';
      if (task.isDerivedGoal) card.dataset.goal = 'true';
      if (task.isMergeTarget) card.dataset.merge = 'true';
      if (connectDraft !== null && connectDraft.fromTaskId !== task.id)
        card.dataset.connectTarget = 'true';
      card.tabIndex = 0;

      const top = el('div', 'cg-task-main');
      if (task.canManuallyComplete) {
        const done = el('button', 'cg-check');
        done.type = 'button';
        done.textContent = task.status === 'done' ? '✓' : '';
        done.setAttribute(
          'aria-label',
          task.status === 'done' ? tr('未完了に戻す', 'Reopen') : tr('完了', 'Complete'),
        );
        done.addEventListener('click', (event) => {
          event.stopPropagation();
          void perform(context.intents.task.setCompleted(task.id, task.status !== 'done'));
        });
        top.append(done);
      }
      const text = el('div', 'cg-task-copy');
      const title = el('strong', 'cg-task-title');
      title.textContent = task.title || tr('無題のタスク', 'Untitled task');
      text.append(title);
      if (task.scheduleLabel) {
        const schedule = el('small', 'cg-task-schedule');
        schedule.textContent = task.scheduleLabel;
        text.append(schedule);
      }
      top.append(text);
      card.append(top);

      if (task.isDerivedGoal || task.isMergeTarget || task.blocked) {
        const badges = el('div', 'cg-badges');
        if (task.isDerivedGoal) {
          const badge = el('span', 'cg-badge cg-goal');
          badge.textContent = 'GOAL';
          badges.append(badge);
        }
        if (task.isMergeTarget) {
          const badge = el('span', 'cg-badge');
          badge.textContent = 'MERGE';
          badges.append(badge);
        }
        if (task.blocked) {
          const badge = el('span', 'cg-badge cg-warn');
          badge.textContent = 'LOCKED';
          badges.append(badge);
        }
        card.append(badges);
      }

      const handle = el('button', 'cg-flow-handle');
      handle.type = 'button';
      handle.textContent = '+';
      handle.title = tr('次のタスクをつなぐ', 'Connect next task');
      handle.setAttribute('aria-label', tr('次のタスクをつなぐ', 'Connect next task'));
      handle.addEventListener('click', (event) => {
        event.stopPropagation();
        if (handle.dataset.suppressClick === 'true') {
          delete handle.dataset.suppressClick;
          return;
        }
        selectedTaskId = task.id;
        createDraft = { parentTaskId: task.id, kind: 'continuation' };
        render();
      });
      card.append(handle);

      card.addEventListener('click', () => {
        if (connectDraft !== null && connectDraft.fromTaskId !== task.id) {
          const draft = connectDraft;
          connectDraft = null;
          void perform(
            context.intents.flow.connect({
              fromTaskId: draft.fromTaskId,
              toTaskId: task.id,
              kind: draft.kind,
            }),
          );
          return;
        }
        selectedTaskId = selectedTaskId === task.id ? null : task.id;
        render();
      });
      card.addEventListener('dblclick', () => {
        selectedTaskId = task.id;
        editingTaskId = task.id;
        render();
      });
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          selectedTaskId = task.id;
          editingTaskId = task.id;
          render();
        }
      });
      return card;
    };

    const renderBoard = (workspace: WorkspaceScreenModel): HTMLElement => {
      const scroll = el('main', 'cg-board-scroll');
      const canvas = el('section', 'cg-board');
      canvas.style.minWidth = `${Math.max(workspace.board.width, 1000)}px`;
      canvas.style.minHeight = `${Math.max(workspace.board.height, 680)}px`;
      canvas.dataset.timeGuide = workspace.board.settings.timeGuide;

      const hidden = new Set<string>();
      for (const lane of workspace.board.lanes) {
        if (!collapsedLaneIds.has(lane.id)) continue;
        for (const taskId of lane.taskIds) hidden.add(taskId);
      }

      if (workspace.board.settings.showDateLanes) {
        for (const lane of workspace.board.lanes) {
          const laneNode = el('section', 'cg-lane');
          laneNode.dataset.laneId = lane.id;
          laneNode.style.top = `${lane.startY}px`;
          laneNode.style.height = `${collapsedLaneIds.has(lane.id) ? 48 : lane.height}px`;
          const label = btn(
            `${collapsedLaneIds.has(lane.id) ? '＋' : '−'} ${lane.date ?? tr('日付なし', 'No date')}`,
            (event) => {
              event.stopPropagation();
              if (collapsedLaneIds.has(lane.id)) collapsedLaneIds.delete(lane.id);
              else collapsedLaneIds.add(lane.id);
              render();
            },
            'cg-lane-label',
          );
          laneNode.append(label);
          canvas.append(laneNode);
        }
      }

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'cg-flow-layer');
      svg.setAttribute(
        'viewBox',
        `0 0 ${Math.max(workspace.board.width, 1000)} ${Math.max(workspace.board.height, 680)}`,
      );
      svg.setAttribute('aria-hidden', 'true');
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      for (const kind of ['continuation', 'branch', 'reference'] as const) {
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.id = `cg-arrow-${kind}`;
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '6');
        marker.setAttribute('orient', 'auto');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        marker.append(path);
        defs.append(marker);
      }
      svg.append(defs);
      for (const edge of workspace.connections) {
        if (!edge.path || hidden.has(edge.fromTaskId) || hidden.has(edge.toTaskId)) continue;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', edge.path);
        path.setAttribute('class', `cg-flow cg-flow-${edge.kind}`);
        path.setAttribute('marker-end', `url(#cg-arrow-${edge.kind})`);
        svg.append(path);
      }
      canvas.append(svg);

      for (const task of workspace.tasks) {
        const card = renderTaskCard(task);
        card.classList.add('cg-board-task');
        if (hidden.has(task.id)) card.hidden = true;
        if (task.position) {
          card.style.left = `${task.position.x}px`;
          card.style.top = `${task.position.y}px`;
        }
        card.draggable = true;
        card.addEventListener('dragstart', (event) => {
          if (!event.dataTransfer) return;
          event.dataTransfer.setData('application/x-cherry-task-id', task.id);
          card.dataset.dragging = 'true';
        });
        card.addEventListener('dragend', () => delete card.dataset.dragging);
        canvas.append(card);
      }

      canvas.addEventListener('dragover', (event) => event.preventDefault());
      canvas.addEventListener('drop', (event) => {
        event.preventDefault();
        const taskId = event.dataTransfer?.getData('application/x-cherry-task-id');
        if (!taskId) return;
        const rect = canvas.getBoundingClientRect();
        void perform(
          context.intents.board.dropTask({
            taskId,
            target: {
              kind: 'canvas',
              point: { x: event.clientX - rect.left, y: event.clientY - rect.top },
            },
          }),
        );
      });
      canvas.addEventListener('click', (event) => {
        if (event.target === canvas || event.target === svg) {
          selectedTaskId = null;
          connectDraft = null;
          render();
        }
      });

      const mobileCleanup = installMobileBoardInteraction({
        scroll,
        canvas,
        workspace,
        collapsedLaneIds,
        coordinator,
        dropTask: (taskId, target) => {
          void perform(context.intents.board.dropTask({ taskId, target }));
        },
      });
      const handleCleanup = installDesktopHandleConnection({
        scroll,
        canvas,
        resolveKind: (sourceTaskId) =>
          workspace.connections.some(
            (edge) => edge.fromTaskId === sourceTaskId && edge.kind !== 'reference',
          )
            ? 'branch'
            : 'continuation',
        createNext: (sourceTaskId, kind) => {
          selectedTaskId = sourceTaskId;
          connectDraft = null;
          createDraft = { parentTaskId: sourceTaskId, kind };
          render();
        },
        connectExisting: (sourceTaskId, targetTaskId, kind) => {
          connectDraft = null;
          selectedTaskId = targetTaskId;
          void perform(
            context.intents.flow.connect({
              fromTaskId: sourceTaskId,
              toTaskId: targetTaskId,
              kind,
            }),
          );
        },
      });
      const flowMapCleanup = installMobileFlowMap({
        scroll,
        canvas,
        workspace,
        selectedTaskId: () => selectedTaskId,
      });
      boardCleanup = () => {
        flowMapCleanup();
        handleCleanup();
        mobileCleanup();
      };
      scroll.append(canvas);
      return scroll;
    };

    const renderList = (workspace: WorkspaceScreenModel): HTMLElement => {
      const main = el('main', 'cg-list');
      const heading = el('div', 'cg-list-heading');
      const title = el('h2');
      title.textContent = tr('今やること', 'Now');
      const meta = el('span');
      meta.textContent = `${workspace.tasks.filter((task) => task.status !== 'done').length} tasks`;
      heading.append(title, meta);
      main.append(heading);
      for (const task of workspace.tasks) {
        const row = renderTaskCard(task);
        row.classList.add('cg-list-task');
        main.append(row);
      }
      return main;
    };

    const renderTaskActions = (task: TaskCardModel): HTMLElement => {
      const dock = el('aside', 'cg-action-dock');
      dock.setAttribute('aria-label', tr('選択中のタスク操作', 'Selected task actions'));
      if (task.canManuallyComplete) {
        dock.append(
          btn(
            task.status === 'done' ? tr('↺ 戻す', '↺ Reopen') : tr('✓ 完了', '✓ Complete'),
            () => {
              void perform(context.intents.task.setCompleted(task.id, task.status !== 'done'));
            },
          ),
        );
      }
      dock.append(
        btn(
          tr('＋ 次へ', '＋ Next'),
          () => {
            createDraft = { parentTaskId: task.id, kind: 'continuation' };
            render();
          },
          'cg-btn cg-primary',
        ),
        btn(tr('↗ 分岐', '↗ Branch'), () => {
          createDraft = { parentTaskId: task.id, kind: 'branch' };
          render();
        }),
        btn(tr('🔗 既存へ', '🔗 Existing'), () => {
          connectDraft = { fromTaskId: task.id, kind: 'continuation' };
          render();
        }),
        btn(tr('✎ 編集', '✎ Edit'), () => {
          editingTaskId = task.id;
          render();
        }),
      );
      return dock;
    };

    const renderCreateDialog = (): HTMLElement | null => {
      if (!createDraft) return null;
      const overlay = el('div', 'cg-overlay');
      const form = el('form', 'cg-dialog cg-quick-create');
      const kicker = el('span', 'cg-kicker');
      kicker.textContent = createDraft.parentTaskId ? 'FLOW' : 'NEW TASK';
      const title = el('h2');
      title.textContent = createDraft.parentTaskId
        ? tr('次にやることは？', "What's next?")
        : tr('何をやる？', 'What do you want to do?');
      const input = el('input', 'cg-quick-input');
      input.placeholder = tr('タスク名を入力…', 'Enter a task name…');
      input.autofocus = true;
      const modes = el('div', 'cg-create-modes');
      if (createDraft.parentTaskId) {
        for (const [kind, label] of [
          ['continuation', tr('→ 続き', '→ Continue')],
          ['branch', tr('↗ 分岐', '↗ Branch')],
          ['reference', tr('↝ 参照', '↝ Reference')],
        ] as const) {
          const mode = btn(
            label,
            (event) => {
              event.preventDefault();
              createDraft = { parentTaskId: createDraft?.parentTaskId ?? null, kind };
              render();
            },
            createDraft.kind === kind ? 'cg-chip active' : 'cg-chip',
          );
          modes.append(mode);
        }
      }
      const actions = el('div', 'cg-dialog-actions');
      actions.append(
        btn(
          tr('キャンセル', 'Cancel'),
          () => {
            createDraft = null;
            render();
          },
          'cg-btn cg-quiet',
        ),
      );
      const submit = el('button', 'cg-btn cg-primary');
      submit.type = 'submit';
      submit.textContent = tr('作成', 'Create');
      actions.append(submit);
      form.append(kicker, title, input, modes, actions);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const value = input.value.trim();
        const draft = createDraft;
        if (!value || !draft) return;
        createDraft = null;
        void createTask(value, draft.parentTaskId, draft.kind).then(render);
      });
      overlay.addEventListener('pointerdown', (event) => {
        if (event.target === overlay) {
          createDraft = null;
          render();
        }
      });
      overlay.append(form);
      queueMicrotask(() => input.focus());
      return overlay;
    };

    const renderEditor = (workspace: WorkspaceScreenModel): HTMLElement | null => {
      if (!editingTaskId) return null;
      const task = workspace.tasks.find((candidate) => candidate.id === editingTaskId);
      if (!task) return null;
      const overlay = el('div', 'cg-overlay');
      const form = el('form', 'cg-dialog cg-editor');
      const heading = el('h2');
      heading.textContent = tr('タスクを編集', 'Edit task');
      const title = field(tr('タスク名', 'Task name'), task.title);
      const notesWrap = el('label', 'cg-field');
      const notesLabel = el('span', 'cg-field-label');
      notesLabel.textContent = tr('メモ', 'Notes');
      const notes = el('textarea', 'cg-textarea');
      notes.value = task.notes;
      notesWrap.append(notesLabel, notes);
      const schedule = scheduleValue(task);
      const scheduleKind = el('select', 'cg-input');
      for (const [value, label] of [
        ['none', tr('日付なし', 'No date')],
        ['date', tr('日付', 'Date')],
        ['datetime', tr('日時', 'Date & time')],
      ] as const) {
        const option = el('option');
        option.value = value;
        option.textContent = label;
        scheduleKind.append(option);
      }
      scheduleKind.value = schedule.kind;
      const date = field(tr('日付', 'Date'), schedule.date);
      date.input.type = 'date';
      const time = field(tr('時刻', 'Time'), schedule.time);
      time.input.type = 'time';
      const danger = btn(
        tr('削除', 'Delete'),
        () => {
          if (!window.confirm(tr('このタスクを削除しますか？', 'Delete this task?'))) return;
          editingTaskId = null;
          selectedTaskId = null;
          void perform(context.intents.task.deleteOnly(task.id));
        },
        'cg-btn cg-danger',
      );
      const actions = el('div', 'cg-dialog-actions');
      actions.append(
        danger,
        btn(
          tr('キャンセル', 'Cancel'),
          () => {
            editingTaskId = null;
            render();
          },
          'cg-btn cg-quiet',
        ),
      );
      const save = el('button', 'cg-btn cg-primary');
      save.type = 'submit';
      save.textContent = tr('保存', 'Save');
      actions.append(save);
      form.append(heading, title.wrap, notesWrap, scheduleKind, date.wrap, time.wrap, actions);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        let nextSchedule: CherryScheduleModel = { kind: 'none' };
        if (scheduleKind.value === 'date' && date.input.value)
          nextSchedule = { kind: 'date', date: date.input.value };
        if (scheduleKind.value === 'datetime' && date.input.value && time.input.value) {
          nextSchedule = { kind: 'datetime', date: date.input.value, time: time.input.value };
        }
        editingTaskId = null;
        void (async () => {
          await perform(
            context.intents.task.update({
              taskId: task.id,
              title: title.input.value,
              notes: notes.value,
            }),
          );
          await perform(context.intents.task.setSchedule(task.id, nextSchedule));
        })();
      });
      overlay.append(form);
      return overlay;
    };

    const renderSettings = (workspace: WorkspaceScreenModel): HTMLElement | null => {
      if (!settingsOpen) return null;
      const panel = el('aside', 'cg-settings');
      const head = el('div', 'cg-settings-head');
      const title = el('strong');
      title.textContent = tr('表示と操作', 'Display & controls');
      head.append(
        title,
        btn(
          '×',
          () => {
            settingsOpen = false;
            render();
          },
          'cg-icon',
        ),
      );
      panel.append(head);
      const toggle = (
        label: string,
        checked: boolean,
        onChange: (checked: boolean) => void,
      ): HTMLElement => {
        const row = el('label', 'cg-setting-row');
        const text = el('span');
        text.textContent = label;
        const input = el('input');
        input.type = 'checkbox';
        input.checked = checked;
        input.addEventListener('change', () => onChange(input.checked));
        row.append(text, input);
        return row;
      };
      const apply = (next: Partial<typeof workspace.board.settings>) => {
        void perform(
          context.intents.workspace.setBoardSettings({ ...workspace.board.settings, ...next }),
        );
      };
      panel.append(
        toggle(tr('日付レーン', 'Date lanes'), workspace.board.settings.showDateLanes, (checked) =>
          apply({ showDateLanes: checked }),
        ),
        toggle(tr('自動整列', 'Auto layout'), workspace.board.settings.autoLayout, (checked) =>
          apply({ autoLayout: checked }),
        ),
      );
      const guide = el('select', 'cg-input');
      for (const [value, label] of [
        ['auto', tr('時間ガイド: 自動', 'Time guide: Auto')],
        ['shown', tr('時間ガイド: 表示', 'Time guide: Shown')],
        ['hidden', tr('時間ガイド: 非表示', 'Time guide: Hidden')],
      ] as const) {
        const option = el('option');
        option.value = value;
        option.textContent = label;
        guide.append(option);
      }
      guide.value = workspace.board.settings.timeGuide;
      guide.addEventListener('change', () =>
        apply({ timeGuide: guide.value as CherryTimeGuideMode }),
      );
      panel.append(guide);

      const dataHeading = el('strong', 'cg-settings-section-title');
      dataHeading.textContent = tr('データ', 'Data');
      const importFile = (accept: string, kind: 'csv' | 'ics'): void => {
        const input = el('input');
        input.type = 'file';
        input.accept = accept;
        input.hidden = true;
        input.addEventListener('change', () => {
          const file = input.files?.[0];
          if (!file) return;
          void file
            .text()
            .then((source) =>
              perform(
                kind === 'csv'
                  ? context.intents.interop.importCsv({ source, name: file.name })
                  : context.intents.interop.importIcs({ source, name: file.name }),
              ),
            );
        });
        panel.append(input);
        input.click();
      };
      panel.append(
        dataHeading,
        btn(tr('CSVを書き出す', 'Export CSV'), () => {
          void context.intents.interop.exportCsv().then((result) => {
            if (result.kind === 'error') {
              window.alert(context.i18n.t(result.error.messageKey));
              return;
            }
            downloadTextFile(result.fileName, result.mimeType, result.content);
          });
        }),
        btn(tr('CSVを取り込む', 'Import CSV'), () => importFile('.csv,text/csv', 'csv')),
        btn(tr('ICSを取り込む', 'Import ICS'), () => importFile('.ics,text/calendar', 'ics')),
      );

      if (context.capabilities.persistentStorageEnabled) {
        panel.append(
          btn(
            tr('端末保存を停止', 'Stop device storage'),
            () => {
              void perform(context.intents.storage.disable(false));
            },
            'cg-btn cg-quiet',
          ),
        );
      }
      return panel;
    };

    const renderWorkspace = (workspace: WorkspaceScreenModel): void => {
      if (lastTabId !== workspace.tabId) {
        selectedTaskId = null;
        editingTaskId = null;
        createDraft = null;
        connectDraft = null;
        collapsedLaneIds.clear();
        lastTabId = workspace.tabId;
      }

      const shell = el('div', 'cg-shell');
      const header = el('header', 'cg-topbar');
      const left = el('div', 'cg-topbar-left');
      const brand = btn(
        'Cherry',
        () => {
          void perform(context.intents.workspace.goToStart());
        },
        'cg-brand',
      );
      const workspaceName = el('span', 'cg-workspace-name');
      workspaceName.textContent = workspace.workspaceName;
      left.append(brand, workspaceName);

      const center = el('nav', 'cg-tabs');
      for (const tab of workspace.tabs) {
        const item = el('div', 'cg-tab-item');
        const tabButton = btn(
          tab.name,
          () => {
            tabMenuId = null;
            if (tab.id !== workspace.tabId) void perform(context.intents.workspace.openTab(tab.id));
          },
          tab.id === workspace.tabId ? 'cg-tab active' : 'cg-tab',
        );
        item.append(tabButton);
        if (tab.id === workspace.tabId) {
          item.append(
            btn(
              '⋯',
              (event) => {
                event.stopPropagation();
                tabMenuId = tabMenuId === tab.id ? null : tab.id;
                render();
              },
              'cg-tab-more',
            ),
          );
          if (tabMenuId === tab.id) {
            const menu = el('div', 'cg-tab-menu');
            menu.append(
              btn(
                tr('名前を変更', 'Rename'),
                () => {
                  const name = window.prompt(tr('タブ名', 'Tab name'), tab.name);
                  tabMenuId = null;
                  if (name?.trim()) {
                    void perform(
                      context.intents.workspace.renameTab({ tabId: tab.id, name: name.trim() }),
                    );
                  } else {
                    render();
                  }
                },
                'cg-tab-menu-action',
              ),
              btn(
                tr('複製', 'Duplicate'),
                () => {
                  tabMenuId = null;
                  void perform(context.intents.workspace.duplicateTab(tab.id));
                },
                'cg-tab-menu-action',
              ),
              btn(
                tr('削除', 'Delete'),
                () => {
                  tabMenuId = null;
                  if (
                    !window.confirm(
                      tr(`「${tab.name}」を削除しますか？`, `Delete \"${tab.name}\"?`),
                    )
                  ) {
                    render();
                    return;
                  }
                  void perform(context.intents.workspace.deleteTab(tab.id));
                },
                'cg-tab-menu-action danger',
              ),
            );
            item.append(menu);
          }
        }
        center.append(item);
      }
      center.append(
        btn(
          '+',
          () => {
            const name = window.prompt(tr('タブ名', 'Tab name'), tr('新しいタブ', 'New tab'));
            if (name?.trim())
              void perform(context.intents.workspace.createTab({ name: name.trim() }));
          },
          'cg-tab cg-tab-add',
        ),
      );

      const right = el('div', 'cg-topbar-actions');
      const board = btn(
        tr('ボード', 'Board'),
        () => {
          void perform(context.intents.workspace.setView('board'));
        },
        workspace.activeView === 'board' ? 'cg-view active' : 'cg-view',
      );
      const list = btn(
        tr('リスト', 'List'),
        () => {
          void perform(context.intents.workspace.setView('list'));
        },
        workspace.activeView === 'list' ? 'cg-view active' : 'cg-view',
      );
      const undo = btn(
        '↶',
        () => {
          void perform(context.intents.history.undo());
        },
        'cg-icon',
      );
      undo.disabled = !workspace.canUndo;
      const redo = btn(
        '↷',
        () => {
          void perform(context.intents.history.redo());
        },
        'cg-icon',
      );
      redo.disabled = !workspace.canRedo;
      right.append(
        board,
        list,
        undo,
        redo,
        btn(
          '•••',
          () => {
            settingsOpen = !settingsOpen;
            render();
          },
          'cg-icon',
        ),
      );
      header.append(left, center, right);
      shell.append(header);

      const content =
        workspace.activeView === 'board' ? renderBoard(workspace) : renderList(workspace);
      shell.append(content);

      const add = btn(
        '+',
        () => {
          createDraft = { parentTaskId: null, kind: 'continuation' };
          render();
        },
        'cg-fab',
      );
      add.setAttribute('aria-label', tr('タスクを追加', 'Add task'));
      shell.append(add);

      if (connectDraft) {
        const hint = el('div', 'cg-connect-hint');
        hint.textContent = tr(
          '接続先のタスクを選んでください  ·  Escでキャンセル',
          'Choose a task to connect  ·  Esc to cancel',
        );
        shell.append(hint);
      }
      const selected = workspace.tasks.find((task) => task.id === selectedTaskId);
      if (selected) shell.append(renderTaskActions(selected));
      const settings = renderSettings(workspace);
      if (settings) shell.append(settings);
      const createDialog = renderCreateDialog();
      if (createDialog) shell.append(createDialog);
      const editor = renderEditor(workspace);
      if (editor) shell.append(editor);
      root.replaceChildren(shell);
    };

    const render = (): void => {
      boardCleanup?.();
      boardCleanup = null;
      const screen = context.getScreen();
      if (screen.kind === 'loading') {
        const splash = el('main', 'cg-splash');
        const word = el('div', 'cg-wordmark');
        word.textContent = 'Cherry';
        splash.append(word);
        root.replaceChildren(splash);
        return;
      }
      if (screen.kind === 'storage-decision') {
        const main = el('main', 'cg-start');
        const card = el('section', 'cg-storage-card');
        const word = el('div', 'cg-wordmark');
        word.textContent = 'Cherry';
        const title = el('h1');
        title.textContent = tr('この端末に作業を保存しますか？', 'Save your work on this device?');
        const body = el('p');
        body.textContent = tr(
          '許可すると、閉じても続きから再開できます。あとから変更できます。',
          'Allow storage to resume where you left off after closing Cherry. You can change this later.',
        );
        const actions = el('div', 'cg-dialog-actions');
        actions.append(
          btn(
            tr('今回は保存しない', 'Not now'),
            () => {
              void perform(context.intents.storage.notNow());
            },
            'cg-btn cg-quiet',
          ),
          btn(
            tr('保存する', 'Save on this device'),
            () => {
              void perform(context.intents.storage.allow());
            },
            'cg-btn cg-primary',
          ),
        );
        card.append(word, title, body, actions);
        main.append(card);
        root.replaceChildren(main);
        return;
      }
      if (screen.kind === 'start') {
        renderStart(screen);
        return;
      }
      if (screen.kind === 'error') {
        const main = el('main', 'cg-start');
        const card = el('section', 'cg-storage-card');
        const title = el('h1');
        title.textContent = tr('Cherryを開けませんでした', 'Cherry could not be opened');
        const body = el('p');
        body.textContent = context.i18n.t(screen.error.messageKey);
        card.append(title, body);
        main.append(card);
        root.replaceChildren(main);
        return;
      }
      renderWorkspace(screen.workspace);
    };

    const keydown = (event: KeyboardEvent): void => {
      const target = event.target;
      const editingText =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if ((event.ctrlKey || event.metaKey) && !editingText && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) void perform(context.intents.history.redo());
        else void perform(context.intents.history.undo());
        return;
      }
      if (event.key === 'Escape') {
        if (createDraft || editingTaskId || connectDraft || settingsOpen || selectedTaskId) {
          closeTransient();
          selectedTaskId = null;
          render();
        }
      }
      if (!editingText && event.key.toLowerCase() === 'n') {
        createDraft = { parentTaskId: selectedTaskId, kind: 'continuation' };
        render();
      }
    };
    document.addEventListener('keydown', keydown);
    const unsubscribe = context.subscribe(render);
    render();
    return {
      unmount() {
        boardCleanup?.();
        coordinator.cancel();
        document.removeEventListener('keydown', keydown);
        unsubscribe();
        root.replaceChildren();
      },
    };
  }
}
