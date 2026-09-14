import type {
  CherryFlowKind,
  CherryUIContext,
  CherryUIHandle,
  CherryUIPackage,
  TaskCardModel,
  UIActionResult,
  WorkspaceScreenModel,
} from '../../ui-contract/index';

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

function renderTask(
  context: CherryUIContext,
  task: TaskCardModel,
  onEdit: (taskId: string) => void,
): HTMLElement {
  const card = element('article', 'cherry-task');
  const states = ['task-card'];
  if (task.status === 'done') states.push('task-completed');
  if (task.blocked) states.push('task-blocked');
  if (task.isDerivedGoal) states.push('derived-goal');
  card.setAttribute(context.semanticTokens.stateAttribute, states.join(' '));

  const top = element('div', 'cherry-task-top');
  if (task.canManuallyComplete) {
    const checkbox = element('input', 'cherry-check');
    checkbox.type = 'checkbox';
    checkbox.checked = task.status === 'done';
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
    blocked.textContent = context.i18n.t(task.blockedReasonKey);
    card.append(blocked);
  }
  return card;
}

function connectionLabel(workspace: WorkspaceScreenModel, fromId: string, toId: string): string {
  const byId = new Map(workspace.tasks.map((task) => [task.id, task.title]));
  return `${byId.get(fromId) ?? fromId} → ${byId.get(toId) ?? toId}`;
}

function renderWorkspace(
  root: HTMLElement,
  context: CherryUIContext,
  workspace: WorkspaceScreenModel,
  selectedTaskId: string | null,
  selectTask: (id: string | null) => void,
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
  header.append(brand, title, viewSwitch);

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

  const content = element(
    'main',
    workspace.activeView === 'board' ? 'cherry-board' : 'cherry-list',
  );
  for (const task of workspace.tasks) {
    content.append(renderTask(context, task, (id) => selectTask(id)));
  }

  if (workspace.connections.length > 0) {
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
      pill.textContent = connectionLabel(workspace, edge.fromTaskId, edge.toTaskId);
      connections.append(pill);
    }
    content.append(connections);
  }

  root.replaceChildren(header, toolbar, content);

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
      const actions = element('div', 'cherry-editor-actions');
      const cancel = button(context.i18n.t('common.cancel'), () => selectTask(null));
      const save = element('button', 'cherry-button primary');
      save.type = 'submit';
      save.textContent = context.i18n.t('common.save');
      actions.append(cancel, save);
      panel.append(heading, titleField.wrap, notesLabel, actions);
      panel.addEventListener('submit', (event) => {
        event.preventDefault();
        void perform(
          context,
          context.intents.task.update({
            taskId: task.id,
            title: titleField.input.value,
            notes: notes.value,
          }),
        ).then(() => selectTask(null));
      });
      overlay.append(panel);
      root.append(overlay);
    }
  }
}

export class DefaultCherryUI implements CherryUIPackage<HTMLElement> {
  mount(root: HTMLElement, context: CherryUIContext): CherryUIHandle {
    let selectedTaskId: string | null = null;

    const render = (): void => {
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

      renderWorkspace(root, context, screen.workspace, selectedTaskId, (id) => {
        selectedTaskId = id;
        render();
      });
    };

    const unsubscribe = context.subscribe(render);
    render();
    return {
      unmount() {
        unsubscribe();
        root.replaceChildren();
      },
    };
  }
}
