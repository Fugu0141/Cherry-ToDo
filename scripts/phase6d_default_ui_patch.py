from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} target not found')
    return text.replace(old, new, 1)


p = Path('src/ui/default/index.ts')
s = p.read_text()

# Make every connection pill removable through the formal UI contract.
start = s.index('function renderConnectionSummary(')
end = s.index('function renderBoard(', start)
replacement = '''function renderConnectionSummary(
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

'''
s = s[:start] + replacement + s[end:]

# History controls in the workspace header.
old = """  viewSwitch.append(boardButton, listButton);
  header.append(brand, title, viewSwitch);"""
new = """  viewSwitch.append(boardButton, listButton);
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
  header.append(brand, title, viewSwitch, historyActions);"""
s = replace_once(s, old, new, 'workspace history controls')

# Explicit reorder controls are only shown when the read model proves one isolated chain.
marker = """  if (workspace.activeView === 'board') {
    const settings = element('div', 'cherry-board-settings');"""
insert = """  if (workspace.linearFlowOrder !== null) {
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
          [next[index - 1], next[index]] = [next[index], next[index - 1]];
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
          [next[index], next[index + 1]] = [next[index + 1], next[index]];
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

"""
if marker not in s:
    raise SystemExit('reorder insertion marker not found')
s = s.replace(marker, insert + marker, 1)

# Destructive choices in Task editor use the two explicitly designed scopes.
old = """      actions.append(cancel, save);
      panel.append(
        heading,
        titleField.wrap,
        notesLabel,
        scheduleKind.wrap,
        scheduleFields,
        actions,
      );"""
new = """      actions.append(cancel, save);
      const danger = element('div', 'cherry-editor-danger');
      const deleteOnly = button(
        context.i18n.t('task.deleteOnly'),
        () => {
          if (!window.confirm(context.i18n.t('task.deleteConfirm'))) return;
          void perform(context, context.intents.task.deleteOnly(task.id)).then(() => selectTask(null));
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
      );"""
s = replace_once(s, old, new, 'Task editor delete controls')

# Escape closes the editor or cancels a pending direct connection; remove listener on unmount.
old = """    const unsubscribe = context.subscribe(render);
    render();
    return {
      unmount() {
        unsubscribe();
        root.replaceChildren();
      },
    };"""
new = """    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      if (selectedTaskId === null && connectionDraft === null) return;
      selectedTaskId = null;
      connectionDraft = null;
      render();
    };
    document.addEventListener('keydown', onKeyDown);
    const unsubscribe = context.subscribe(render);
    render();
    return {
      unmount() {
        document.removeEventListener('keydown', onKeyDown);
        unsubscribe();
        root.replaceChildren();
      },
    };"""
s = replace_once(s, old, new, 'keyboard cleanup')
p.write_text(s)


p = Path('src/ui/default/styles.css')
s = p.read_text()
s += '''

/* Phase 6D: desktop maintenance and accessibility */
.cherry-history-actions { margin-left: auto; display: flex; gap: 6px; }
.cherry-icon-button:disabled { opacity: .35; cursor: not-allowed; }
.cherry-connection { display: inline-flex; align-items: center; gap: 7px; }
.cherry-connection-remove { border: 0; background: transparent; color: currentColor; width: 20px; height: 20px; border-radius: 999px; padding: 0; line-height: 1; }
.cherry-connection-remove:hover, .cherry-connection-remove:focus-visible { background: rgba(0,0,0,.08); outline: 2px solid rgba(216,51,82,.22); }
.cherry-flow-reorder { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; border-left: 1px solid #e2e5e9; padding-left: 12px; }
.cherry-flow-reorder-row { display: inline-flex; align-items: center; gap: 4px; padding: 3px 5px 3px 9px; border: 1px solid #e1e4e8; border-radius: 999px; background: #fff; font-size: 12px; }
.cherry-editor-danger { margin-top: 4px; padding-top: 14px; border-top: 1px solid #eadfe1; display: grid; gap: 8px; }
.cherry-button.danger { background: #b72842; border-color: #b72842; color: #fff; }
.cherry-button.danger.ghost { background: #fff; color: #a3263d; }
.cherry-button:focus-visible, .cherry-icon-button:focus-visible, .cherry-segment-button:focus-visible, .cherry-workspace-card:focus-visible { outline: 3px solid rgba(216,51,82,.25); outline-offset: 2px; }
'''
p.write_text(s)
