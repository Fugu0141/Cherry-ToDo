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
      title.textContent = '流れを置いて、つないで、進める。';
      const sub = el('p');
      sub.textContent = 'タスクをリストに入力するのではなく、ボードを直接触って計画します。';
      const newButton = btn(
        '＋ 新しいワークスペース',
        () => {
          const name = window.prompt('ワークスペース名', 'My Cherry');
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
        heading.textContent = 'つづきから';
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
        done.setAttribute('aria-label', task.status === 'done' ? '未完了に戻す' : '完了');
        done.addEventListener('click', (event) => {
          event.stopPropagation();
          void perform(context.intents.task.setCompleted(task.id, task.status !== 'done'));
        });
        top.append(done);
      }
      const text = el('div', 'cg-task-copy');
      const title = el('strong', 'cg-task-title');
      title.textContent = task.title || '無題のタスク';
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
      handle.title = '次のタスクをつなぐ';
      handle.setAttribute('aria-label', '次のタスクをつなぐ');
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
            `${collapsedLaneIds.has(lane.id) ? '＋' : '−'} ${lane.date ?? '日付なし'}`,
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
      title.textContent = '今やること';
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
      dock.setAttribute('aria-label', '選択中のタスク操作');
      if (task.canManuallyComplete) {
        dock.append(
          btn(task.status === 'done' ? '↺ 戻す' : '✓ 完了', () => {
            void perform(context.intents.task.setCompleted(task.id, task.status !== 'done'));
          }),
        );
      }
      dock.append(
        btn(
          '＋ 次へ',
          () => {
            createDraft = { parentTaskId: task.id, kind: 'continuation' };
            render();
          },
          'cg-btn cg-primary',
        ),
        btn('↗ 分岐', () => {
          createDraft = { parentTaskId: task.id, kind: 'branch' };
          render();
        }),
        btn('🔗 既存へ', () => {
          connectDraft = { fromTaskId: task.id, kind: 'continuation' };
          render();
        }),
        btn('✎ 編集', () => {
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
      title.textContent = createDraft.parentTaskId ? '次にやることは？' : '何をやる？';
      const input = el('input', 'cg-quick-input');
      input.placeholder = 'タスク名を入力…';
      input.autofocus = true;
      const modes = el('div', 'cg-create-modes');
      if (createDraft.parentTaskId) {
        for (const [kind, label] of [
          ['continuation', '→ 続き'],
          ['branch', '↗ 分岐'],
          ['reference', '↝ 参照'],
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
          'キャンセル',
          () => {
            createDraft = null;
            render();
          },
          'cg-btn cg-quiet',
        ),
      );
      const submit = el('button', 'cg-btn cg-primary');
      submit.type = 'submit';
      submit.textContent = '作成';
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
      heading.textContent = 'タスクを編集';
      const title = field('タスク名', task.title);
      const notesWrap = el('label', 'cg-field');
      const notesLabel = el('span', 'cg-field-label');
      notesLabel.textContent = 'メモ';
      const notes = el('textarea', 'cg-textarea');
      notes.value = task.notes;
      notesWrap.append(notesLabel, notes);
      const schedule = scheduleValue(task);
      const scheduleKind = el('select', 'cg-input');
      for (const [value, label] of [
        ['none', '日付なし'],
        ['date', '日付'],
        ['datetime', '日時'],
      ] as const) {
        const option = el('option');
        option.value = value;
        option.textContent = label;
        scheduleKind.append(option);
      }
      scheduleKind.value = schedule.kind;
      const date = field('日付', schedule.date);
      date.input.type = 'date';
      const time = field('時刻', schedule.time);
      time.input.type = 'time';
      const danger = btn(
        '削除',
        () => {
          if (!window.confirm('このタスクを削除しますか？')) return;
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
          'キャンセル',
          () => {
            editingTaskId = null;
            render();
          },
          'cg-btn cg-quiet',
        ),
      );
      const save = el('button', 'cg-btn cg-primary');
      save.type = 'submit';
      save.textContent = '保存';
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
      title.textContent = '表示と操作';
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
        toggle('日付レーン', workspace.board.settings.showDateLanes, (checked) =>
          apply({ showDateLanes: checked }),
        ),
        toggle('自動整列', workspace.board.settings.autoLayout, (checked) =>
          apply({ autoLayout: checked }),
        ),
      );
      const guide = el('select', 'cg-input');
      for (const [value, label] of [
        ['auto', '時間ガイド: 自動'],
        ['shown', '時間ガイド: 表示'],
        ['hidden', '時間ガイド: 非表示'],
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
      if (context.capabilities.persistentStorageEnabled) {
        panel.append(
          btn(
            '端末保存を停止',
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
                '名前を変更',
                () => {
                  const name = window.prompt('タブ名', tab.name);
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
                '複製',
                () => {
                  tabMenuId = null;
                  void perform(context.intents.workspace.duplicateTab(tab.id));
                },
                'cg-tab-menu-action',
              ),
              btn(
                '削除',
                () => {
                  tabMenuId = null;
                  if (!window.confirm(`「${tab.name}」を削除しますか？`)) {
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
            const name = window.prompt('タブ名', '新しいタブ');
            if (name?.trim())
              void perform(context.intents.workspace.createTab({ name: name.trim() }));
          },
          'cg-tab cg-tab-add',
        ),
      );

      const right = el('div', 'cg-topbar-actions');
      const board = btn(
        'ボード',
        () => {
          void perform(context.intents.workspace.setView('board'));
        },
        workspace.activeView === 'board' ? 'cg-view active' : 'cg-view',
      );
      const list = btn(
        'リスト',
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
      add.setAttribute('aria-label', 'タスクを追加');
      shell.append(add);

      if (connectDraft) {
        const hint = el('div', 'cg-connect-hint');
        hint.textContent = '接続先のタスクを選んでください  ·  Escでキャンセル';
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
        title.textContent = 'この端末に作業を保存しますか？';
        const body = el('p');
        body.textContent = '許可すると、閉じても続きから再開できます。あとから変更できます。';
        const actions = el('div', 'cg-dialog-actions');
        actions.append(
          btn(
            '今回は保存しない',
            () => {
              void perform(context.intents.storage.notNow());
            },
            'cg-btn cg-quiet',
          ),
          btn(
            '保存する',
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
        title.textContent = 'Cherryを開けませんでした';
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
