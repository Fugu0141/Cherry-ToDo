from pathlib import Path

path = Path('src/ui/default/index.ts')
text = path.read_text()

old = """    const from = element('select', 'cherry-select');
    const to = element('select', 'cherry-select');
"""
new = """    const from = element('select', 'cherry-select');
    from.setAttribute('aria-label', context.i18n.t('flow.from'));
    const to = element('select', 'cherry-select');
    to.setAttribute('aria-label', context.i18n.t('flow.to'));
"""
if old not in text:
    raise SystemExit('flow select anchor not found')
text = text.replace(old, new, 1)

old = """    const kind = element('select', 'cherry-select');
    const kinds: readonly CherryFlowKind[] = ['continuation', 'branch', 'reference'];
"""
new = """    const kind = element('select', 'cherry-select');
    kind.setAttribute('aria-label', context.i18n.t('flow.kind'));
    const kinds: readonly CherryFlowKind[] = ['continuation', 'branch', 'reference'];
"""
if old not in text:
    raise SystemExit('flow kind anchor not found')
text = text.replace(old, new, 1)

old = """  viewSwitch.append(boardButton, listButton);
"""
new = """  boardButton.setAttribute('aria-pressed', String(workspace.activeView === 'board'));
  listButton.setAttribute('aria-pressed', String(workspace.activeView === 'list'));
  viewSwitch.append(boardButton, listButton);
"""
if old not in text:
    raise SystemExit('view switch anchor not found')
text = text.replace(old, new, 1)

old = """      const overlay = element('div', 'cherry-overlay');
      const panel = element('form', 'cherry-editor');
      const heading = element('h2');
      heading.textContent = context.i18n.t('task.edit');
"""
new = """      const overlay = element('div', 'cherry-overlay');
      const panel = element('form', 'cherry-editor');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-labelledby', 'cherry-task-editor-title');
      const heading = element('h2');
      heading.id = 'cherry-task-editor-title';
      heading.textContent = context.i18n.t('task.edit');
"""
if old not in text:
    raise SystemExit('editor dialog anchor not found')
text = text.replace(old, new, 1)

path.write_text(text)
