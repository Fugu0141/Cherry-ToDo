from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} target not found')
    return text.replace(old, new, 1)


# UI contract message keys.
p = Path('src/ui-contract/index.ts')
s = p.read_text()
s = replace_once(
    s,
    """  | 'board.undated'
  | 'task.create'""",
    """  | 'board.undated'
  | 'mobile.startFlow'
  | 'mobile.startFlowHint'
  | 'mobile.connectionHint'
  | 'task.create'""",
    'mobile message keys',
)
p.write_text(s)


# i18n strings.
p = Path('src/ui-contract/i18n.ts')
s = p.read_text()
s = replace_once(
    s,
    """    'board.undated': '日付なし',
    'task.create':""",
    """    'board.undated': '日付なし',
    'mobile.startFlow': '最初のタスクを作ってFlowを始める',
    'mobile.startFlowHint': 'タスクを追加したら、カードの接続ボタンから次のタスクへつなげられます。',
    'mobile.connectionHint': '接続先のタスクを選んでください',
    'task.create':""",
    'ja mobile strings',
)
s = replace_once(
    s,
    """    'board.undated': 'Undated',
    'task.create':""",
    """    'board.undated': 'Undated',
    'mobile.startFlow': 'Create the first task and start a Flow',
    'mobile.startFlowHint': 'After adding a task, use its connection actions to link the next task.',
    'mobile.connectionHint': 'Choose a task to connect to',
    'task.create':""",
    'en mobile strings',
)
p.write_text(s)


# Default UI mobile Flow integration.
p = Path('src/ui/default/index.ts')
s = p.read_text()
s = replace_once(
    s,
    """import { InteractionCoordinator } from './interaction/interaction-coordinator';
import { installMobileBoardInteraction } from './interaction/mobile-board-interaction';""",
    """import {
  beginMobileConnection,
  cancelMobileConnection,
  completeMobileConnection,
} from './interaction/mobile-connection-flow';
import { buildListFlowContext } from './interaction/mobile-flow-presentation';
import { InteractionCoordinator } from './interaction/interaction-coordinator';
import { installMobileBoardInteraction } from './interaction/mobile-board-interaction';""",
    'mobile flow imports',
)
s = replace_once(
    s,
    """      const handle = button(symbol, () => startConnection(task.id, kind), 'cherry-flow-handle');
      handle.title = context.i18n.t(labelKey);
      handle.setAttribute('aria-label', context.i18n.t(labelKey));
      connectors.append(handle);""",
    """      const handle = button('', () => startConnection(task.id, kind), 'cherry-flow-handle');
      const glyph = element('span', 'cherry-flow-handle-glyph');
      glyph.textContent = symbol;
      const mobileLabel = element('span', 'cherry-mobile-flow-label');
      mobileLabel.textContent = context.i18n.t(labelKey);
      handle.append(glyph, mobileLabel);
      handle.title = context.i18n.t(labelKey);
      handle.setAttribute('aria-label', context.i18n.t(labelKey));
      connectors.append(handle);""",
    'mobile visible connection labels',
)
old_list = """  const list = element('main', 'cherry-list');
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
  const connections = renderConnectionSummary(context, workspace);"""
new_list = """  const list = element('main', 'cherry-list');
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
  const connections = renderConnectionSummary(context, workspace);"""
s = replace_once(s, old_list, new_list, 'flow-preserving List')
s = replace_once(
    s,
    """  toolbar.append(taskForm);

  if (workspace.tasks.length >= 2) {""",
    """  toolbar.append(taskForm);

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

  if (workspace.tasks.length >= 2) {""",
    'flow-first mobile onboarding',
)
s = replace_once(
    s,
    """        (taskId, kind) => {
          connectionDraft = { fromTaskId: taskId, kind };
          render();
        },
        (taskId) => {
          const draft = connectionDraft;
          if (draft === null || draft.fromTaskId === taskId) return;
          connectionDraft = null;
          render();
          void perform(
            context,
            context.intents.flow.connect({
              fromTaskId: draft.fromTaskId,
              toTaskId: taskId,
              kind: draft.kind,
            }),
          );
        },
        () => {
          connectionDraft = null;
          render();
        },""",
    """        (taskId, kind) => {
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
        },""",
    'connection coordinator callbacks',
)
s = replace_once(
    s,
    """      selectedTaskId = null;
      connectionDraft = null;
      render();""",
    """      selectedTaskId = null;
      cancelMobileConnection(interactionCoordinator);
      connectionDraft = null;
      render();""",
    'Escape cancels connection owner',
)
p.write_text(s)


# Do not let Board render cleanup cancel a non-pointer connection mode.
p = Path('src/ui/default/interaction/mobile-board-interaction.ts')
s = p.read_text()
s = replace_once(
    s,
    """    drag = null;
    pan = null;
    coordinator.cancel();
    for (const cleanup of cleanups) cleanup();""",
    """    const state = coordinator.state;
    if (state.kind === 'dragging-task' || state.kind === 'panning') coordinator.cancel();
    drag = null;
    pan = null;
    for (const cleanup of cleanups) cleanup();""",
    'mobile cleanup ownership',
)
p.write_text(s)


# Mobile presentation polish.
p = Path('src/ui/default/styles.css')
s = p.read_text()
addition = """

/* Phase 7C: flow-first mobile presentation */
.cherry-mobile-flow-label,
.cherry-mobile-flow-start,
.cherry-mobile-connection-hint {
  display: none;
}

.cherry-list-flow-context {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
  font-size: 12px;
  color: #68717d;
}

@media (max-width: 680px), (pointer: coarse) {
  .cherry-mobile-flow-start {
    display: grid;
    gap: 8px;
    width: 100%;
    padding: 14px;
    border: 1px solid rgba(216, 51, 82, .2);
    border-radius: 16px;
    background: rgba(216, 51, 82, .055);
  }

  .cherry-mobile-flow-start p {
    margin: 0;
    color: #5f6670;
    line-height: 1.5;
  }

  .cherry-mobile-connection-hint {
    display: block;
    width: 100%;
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: #fff3f5;
    color: #8f1f36;
    font-weight: 650;
  }

  .cherry-task-connectors {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .cherry-flow-handle {
    width: auto;
    padding: 8px 12px;
    border-radius: 12px;
    justify-content: flex-start;
    gap: 8px;
  }

  .cherry-mobile-flow-label {
    display: inline;
    font-size: 12px;
    font-weight: 650;
  }

  .cherry-flow-target-button {
    width: 100%;
  }

  .cherry-flow-form,
  .cherry-flow-reorder {
    display: none;
  }

  .cherry-overlay {
    align-items: end;
    padding: 0;
  }

  .cherry-editor {
    width: 100%;
    max-width: none;
    max-height: 84dvh;
    overflow: auto;
    border-radius: 22px 22px 0 0;
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
  }

  .cherry-editor-danger {
    margin-top: 12px;
  }
}
"""
if '/* Phase 7C: flow-first mobile presentation */' not in s:
    s += addition
p.write_text(s)
