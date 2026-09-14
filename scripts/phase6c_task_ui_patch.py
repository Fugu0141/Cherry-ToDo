from pathlib import Path

p = Path('src/ui/default/index.ts')
s = p.read_text()

insert_at = s.index('function renderTask(')
s = s[:insert_at] + """interface FlowConnectionDraft {
  readonly fromTaskId: string;
  readonly kind: CherryFlowKind;
}

""" + s[insert_at:]

start = s.index('function renderTask(')
end = s.index('function connectionLabel(', start)
replacement = '''function renderTask(
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
      const handle = button(symbol, () => startConnection(task.id, kind), 'cherry-flow-handle');
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

'''
s = s[:start] + replacement + s[end:]
p.write_text(s)
