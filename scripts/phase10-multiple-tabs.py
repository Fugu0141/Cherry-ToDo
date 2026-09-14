from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f'anchor not found in {path}: {old[:100]!r}')
    file.write_text(text.replace(old, new, count))


# Application: add a named-tab creation command at the canonical workspace boundary.
replace(
    'src/modules/workspace/application/application-store.ts',
    """import {\n  validateBoardDocumentState,\n""",
    """import {\n  createEmptyBoardDocumentState,\n  validateBoardDocumentState,\n""",
)
replace(
    'src/modules/workspace/application/application-store.ts',
    """export type ApplicationError =\n  | { readonly code: 'tab-not-found'; readonly tabId: TabId }\n""",
    """export type ApplicationError =\n  | { readonly code: 'tab-not-found'; readonly tabId: TabId }\n  | { readonly code: 'tab-id-in-use'; readonly tabId: TabId }\n  | { readonly code: 'invalid-tab-name' }\n""",
)
replace(
    'src/modules/workspace/application/application-store.ts',
    """  get historyState(): HistoryState {\n    return this.#history.state;\n  }\n\n  undo(): Result<WorkspaceDocument, ApplicationError> {\n""",
    """  get historyState(): HistoryState {\n    return this.#history.state;\n  }\n\n  createTab(tabId: TabId, rawName: string): Result<MutationOutcome, ApplicationError> {\n    if (this.#workspace.tabs[tabId] !== undefined) {\n      return err({ code: 'tab-id-in-use', tabId });\n    }\n\n    const name = rawName.trim();\n    if (name.length === 0) return err({ code: 'invalid-tab-name' });\n\n    const now = this.#now();\n    const tab: TabDocument = {\n      id: tabId,\n      name,\n      tasks: {},\n      flowEdges: {},\n      annotations: {},\n      board: createEmptyBoardDocumentState(),\n      meta: { createdAt: now, updatedAt: now, revision: 0 },\n    };\n    const candidate = bumpWorkspaceRevision(\n      {\n        ...this.#workspace,\n        tabs: { ...this.#workspace.tabs, [tabId]: tab },\n        tabOrder: [...this.#workspace.tabOrder, tabId],\n      },\n      now,\n    );\n    const validation = validateWorkspaceDocument(candidate);\n    if (!validation.ok) return err({ code: 'workspace-invalid', causes: validation.error });\n    this.#commitCanonical(validation.value);\n    return ok({ kind: 'committed', workspace: this.#workspace });\n  }\n\n  undo(): Result<WorkspaceDocument, ApplicationError> {\n""",
)

# UI contract: expose ordered tab summaries and create/open intents.
replace(
    'src/ui-contract/index.ts',
    """export interface WorkspaceSummaryModel {\n  readonly id: string;\n  readonly name: string;\n  readonly updatedAt: string;\n}\n\nexport interface TaskCardModel {\n""",
    """export interface WorkspaceSummaryModel {\n  readonly id: string;\n  readonly name: string;\n  readonly updatedAt: string;\n}\n\nexport interface WorkspaceTabSummaryModel {\n  readonly id: string;\n  readonly name: string;\n}\n\nexport interface TaskCardModel {\n""",
)
replace(
    'src/ui-contract/index.ts',
    """  readonly tabId: string;\n  readonly tabName: string;\n  readonly activeView: CherryView;\n""",
    """  readonly tabId: string;\n  readonly tabName: string;\n  readonly tabs: readonly WorkspaceTabSummaryModel[];\n  readonly activeView: CherryView;\n""",
)
replace(
    'src/ui-contract/index.ts',
    """export interface CreateWorkspaceIntent {\n  readonly name: string;\n}\n\nexport interface CreateTaskIntent {\n""",
    """export interface CreateWorkspaceIntent {\n  readonly name: string;\n}\n\nexport interface CreateTabIntent {\n  readonly name: string;\n}\n\nexport interface CreateTaskIntent {\n""",
)
replace(
    'src/ui-contract/index.ts',
    """    create(input: CreateWorkspaceIntent): Promise<UIActionResult>;\n    open(workspaceId: string): Promise<UIActionResult>;\n    goToStart(): Promise<UIActionResult>;\n""",
    """    create(input: CreateWorkspaceIntent): Promise<UIActionResult>;\n    open(workspaceId: string): Promise<UIActionResult>;\n    createTab(input: CreateTabIntent): Promise<UIActionResult>;\n    openTab(tabId: string): Promise<UIActionResult>;\n    goToStart(): Promise<UIActionResult>;\n""",
)
replace(
    'src/ui-contract/index.ts',
    """  | 'workspace.board'\n  | 'workspace.list'\n""",
    """  | 'workspace.board'\n  | 'workspace.list'\n  | 'workspace.tabs'\n  | 'workspace.tabName'\n  | 'workspace.createTab'\n""",
)

# i18n for the tab surface.
replace(
    'src/ui-contract/i18n.ts',
    """    'workspace.board': 'ボード',\n    'workspace.list': 'リスト',\n""",
    """    'workspace.board': 'ボード',\n    'workspace.list': 'リスト',\n    'workspace.tabs': '計画タブ',\n    'workspace.tabName': 'タブ名',\n    'workspace.createTab': '新しいタブ',\n""",
)
replace(
    'src/ui-contract/i18n.ts',
    """    'workspace.board': 'Board',\n    'workspace.list': 'List',\n""",
    """    'workspace.board': 'Board',\n    'workspace.list': 'List',\n    'workspace.tabs': 'Planning tabs',\n    'workspace.tabName': 'Tab name',\n    'workspace.createTab': 'New tab',\n""",
)

# Runtime: switch/create tabs through the contract and persist active-tab session context.
replace(
    'src/composition/cherry-ui-runtime.ts',
    """    error.code === 'task-id-in-use' ||\n    error.code === 'annotation-id-in-use' ||\n""",
    """    error.code === 'tab-id-in-use' ||\n    error.code === 'task-id-in-use' ||\n    error.code === 'annotation-id-in-use' ||\n""",
)
replace(
    'src/composition/cherry-ui-runtime.ts',
    """        create: (input) => this.#createWorkspace(input.name),\n        open: (workspaceId) => this.#openWorkspace(workspaceId),\n        goToStart: () => this.#showStart(),\n""",
    """        create: (input) => this.#createWorkspace(input.name),\n        open: (workspaceId) => this.#openWorkspace(workspaceId),\n        createTab: (input) => this.#createTab(input.name),\n        openTab: (tabId) => this.#openTab(tabId),\n        goToStart: () => this.#showStart(),\n""",
)
replace(
    'src/composition/cherry-ui-runtime.ts',
    """  async #setView(view: CherryView): Promise<UIActionResult> {\n""",
    """  async #createTab(rawName: string): Promise<UIActionResult> {\n    if (this.#store === null || this.#tabId === null) {\n      return this.#error('not-found', 'error.notFound');\n    }\n    const name = rawName.trim();\n    if (name.length === 0) return this.#error('validation', 'error.validation');\n\n    const previous = this.#store.workspace;\n    const tabId = unwrapId(parseTabId(randomId('tab')));\n    const result = this.#store.createTab(tabId, name);\n    if (!result.ok) return { kind: 'error', error: presentationError(result.error) };\n    if (result.value.kind === 'confirmation-required') return confirmationResult(result.value);\n\n    const saved = await this.#application.persistence.workspaceRepository.save(\n      this.#store.workspace,\n      previous.meta.revision,\n    );\n    if (saved.kind !== 'saved') {\n      this.#store = new ApplicationStore(previous);\n      this.#refreshWorkspace();\n      return this.#error(\n        saved.kind === 'revision-conflict' ? 'conflict' : 'persistence',\n        saved.kind === 'revision-conflict' ? 'error.conflict' : 'error.persistence',\n      );\n    }\n\n    this.#tabId = tabId;\n    await this.#rememberSession();\n    this.#refreshWorkspace();\n    return OK;\n  }\n\n  async #openTab(rawId: string): Promise<UIActionResult> {\n    if (this.#store === null) return this.#error('not-found', 'error.notFound');\n    const parsed = parseTabId(rawId);\n    if (!parsed.ok) return this.#error('validation', 'error.validation');\n    if (this.#store.workspace.tabs[parsed.value] === undefined) {\n      return this.#error('not-found', 'error.notFound');\n    }\n    this.#tabId = parsed.value;\n    await this.#rememberSession();\n    this.#refreshWorkspace();\n    return OK;\n  }\n\n  async #setView(view: CherryView): Promise<UIActionResult> {\n""",
)
replace(
    'src/composition/cherry-ui-runtime.ts',
    """    if (saved.kind !== 'saved') {\n      this.#store = new ApplicationStore(previous);\n      this.#refreshWorkspace();\n      return this.#error('persistence', 'error.persistence');\n    }\n    this.#refreshWorkspace();\n    return OK;\n  }\n\n  async #confirm(planId: string): Promise<UIActionResult> {\n""",
    """    if (saved.kind !== 'saved') {\n      this.#store = new ApplicationStore(previous);\n      this.#refreshWorkspace();\n      return this.#error('persistence', 'error.persistence');\n    }\n    if (this.#tabId === null || result.value.tabs[this.#tabId] === undefined) {\n      const fallbackTabId = result.value.tabOrder[0];\n      if (fallbackTabId === undefined) return this.#error('not-found', 'error.notFound');\n      this.#tabId = fallbackTabId;\n      await this.#rememberSession();\n    }\n    this.#refreshWorkspace();\n    return OK;\n  }\n\n  async #confirm(planId: string): Promise<UIActionResult> {\n""",
)
replace(
    'src/composition/cherry-ui-runtime.ts',
    """      tabId: tab.id,\n      tabName: tab.name,\n      activeView: this.#view,\n""",
    """      tabId: tab.id,\n      tabName: tab.name,\n      tabs: workspace.tabOrder.flatMap((tabId) => {\n        const candidate = workspace.tabs[tabId];\n        return candidate === undefined ? [] : [{ id: candidate.id, name: candidate.name }];\n      }),\n      activeView: this.#view,\n""",
)

# Default UI: visible planning-tab switcher + named-tab creation.
replace(
    'src/ui/default/index.ts',
    """function renderWorkspace(\n""",
    """function renderTabBar(\n  context: CherryUIContext,\n  workspace: WorkspaceScreenModel,\n): HTMLElement {\n  const bar = element('nav', 'cherry-tab-bar');\n  bar.setAttribute('aria-label', context.i18n.t('workspace.tabs'));\n\n  const list = element('div', 'cherry-tab-list');\n  for (const tab of workspace.tabs) {\n    const active = tab.id === workspace.tabId;\n    const open = button(\n      tab.name,\n      () => {\n        if (active) return;\n        void perform(context, context.intents.workspace.openTab(tab.id));\n      },\n      active ? 'cherry-tab-button active' : 'cherry-tab-button',\n    );\n    if (active) open.setAttribute('aria-current', 'page');\n    list.append(open);\n  }\n\n  const form = element('form', 'cherry-create-tab');\n  const field = labeledInput(context.i18n.t('workspace.tabName'), 'tabName');\n  const create = element('button', 'cherry-button');\n  create.type = 'submit';\n  create.textContent = context.i18n.t('workspace.createTab');\n  form.append(field.wrap, create);\n  form.addEventListener('submit', (event) => {\n    event.preventDefault();\n    void perform(context, context.intents.workspace.createTab({ name: field.input.value }));\n  });\n\n  bar.append(list, form);\n  return bar;\n}\n\nfunction renderWorkspace(\n""",
)
replace(
    'src/ui/default/index.ts',
    """  header.append(brand, title, viewSwitch, historyActions);\n\n  const toolbar = element('section', 'cherry-toolbar');\n""",
    """  header.append(brand, title, viewSwitch, historyActions);\n  const tabBar = renderTabBar(context, workspace);\n\n  const toolbar = element('section', 'cherry-toolbar');\n""",
)
replace(
    'src/ui/default/index.ts',
    """  root.replaceChildren(header, toolbar, content);\n""",
    """  root.replaceChildren(header, tabBar, toolbar, content);\n""",
)
replace(
    'src/ui/default/index.ts',
    """    let drawingEnabled = false;\n    let lastWorkspaceId: string | null = null;\n    const collapsedLaneIds = new Set<string>();\n""",
    """    let drawingEnabled = false;\n    let lastWorkspaceId: string | null = null;\n    let lastTabId: string | null = null;\n    const collapsedLaneIds = new Set<string>();\n""",
)
replace(
    'src/ui/default/index.ts',
    """      if (lastWorkspaceId !== screen.workspace.workspaceId) {\n        collapsedLaneIds.clear();\n        connectionDraft = null;\n        drawingEnabled = false;\n        lastWorkspaceId = screen.workspace.workspaceId;\n      }\n""",
    """      if (\n        lastWorkspaceId !== screen.workspace.workspaceId ||\n        lastTabId !== screen.workspace.tabId\n      ) {\n        collapsedLaneIds.clear();\n        selectedTaskId = null;\n        cancelMobileConnection(interactionCoordinator);\n        interactionCoordinator.cancel();\n        connectionDraft = null;\n        drawingEnabled = false;\n        lastWorkspaceId = screen.workspace.workspaceId;\n        lastTabId = screen.workspace.tabId;\n      }\n""",
)

# Default UI styling for desktop/mobile tab navigation.
styles = Path('src/ui/default/styles.css')
text = styles.read_text()
anchor = ".cherry-segment-button.active { background: white; box-shadow: 0 1px 4px rgba(0,0,0,.08); }\n"
if anchor not in text:
    raise SystemExit('tab style anchor not found')
addition = anchor + """\n.cherry-tab-bar { display: flex; align-items: end; gap: 14px; padding: 10px 22px; overflow-x: auto; background: #fff; border-bottom: 1px solid #e6e8eb; }\n.cherry-tab-list { display: flex; gap: 6px; min-width: max-content; }\n.cherry-tab-button { border: 1px solid transparent; border-radius: 999px; background: #f0f2f4; color: inherit; padding: 8px 13px; white-space: nowrap; }\n.cherry-tab-button.active { border-color: #e2a3af; background: #fff0f3; color: #a3263d; font-weight: 750; }\n.cherry-create-tab { margin-left: auto; display: flex; align-items: end; gap: 8px; min-width: 260px; }\n.cherry-create-tab .cherry-field { flex: 1; }\n"""
text = text.replace(anchor, addition, 1)
text = text.replace(
    ".cherry-button:focus-visible, .cherry-icon-button:focus-visible, .cherry-segment-button:focus-visible, .cherry-workspace-card:focus-visible {",
    ".cherry-button:focus-visible, .cherry-icon-button:focus-visible, .cherry-segment-button:focus-visible, .cherry-tab-button:focus-visible, .cherry-workspace-card:focus-visible {",
    1,
)
text = text.replace(
    "  .cherry-toolbar, .cherry-inline-form, .cherry-flow-form { align-items: stretch; }\n",
    "  .cherry-tab-bar { align-items: stretch; flex-wrap: wrap; }\n  .cherry-tab-list { width: 100%; overflow-x: auto; }\n  .cherry-create-tab { width: 100%; min-width: 0; margin-left: 0; }\n  .cherry-toolbar, .cherry-inline-form, .cherry-flow-form { align-items: stretch; }\n",
    1,
)
styles.write_text(text)

# Dark/system theme includes the tab surface and active state.
theme = Path('src/ui/default/theme.css')
text = theme.read_text()
text = text.replace(
    ":root[data-cherry-theme='dark'] .cherry-header,\n:root[data-cherry-theme='dark'] .cherry-toolbar,",
    ":root[data-cherry-theme='dark'] .cherry-header,\n:root[data-cherry-theme='dark'] .cherry-tab-bar,\n:root[data-cherry-theme='dark'] .cherry-toolbar,",
    1,
)
text = text.replace(
    ":root[data-cherry-theme='dark'] .cherry-button,\n:root[data-cherry-theme='dark'] .cherry-icon-button,",
    ":root[data-cherry-theme='dark'] .cherry-button,\n:root[data-cherry-theme='dark'] .cherry-tab-button,\n:root[data-cherry-theme='dark'] .cherry-icon-button,",
    1,
)
text = text.replace(
    ":root:not([data-cherry-theme='light']) .cherry-header,\n  :root:not([data-cherry-theme='light']) .cherry-toolbar,",
    ":root:not([data-cherry-theme='light']) .cherry-header,\n  :root:not([data-cherry-theme='light']) .cherry-tab-bar,\n  :root:not([data-cherry-theme='light']) .cherry-toolbar,",
    1,
)
text = text.replace(
    ":root:not([data-cherry-theme='light']) .cherry-button,\n  :root:not([data-cherry-theme='light']) .cherry-icon-button,",
    ":root:not([data-cherry-theme='light']) .cherry-button,\n  :root:not([data-cherry-theme='light']) .cherry-tab-button,\n  :root:not([data-cherry-theme='light']) .cherry-icon-button,",
    1,
)
text += """\n\n:root[data-cherry-theme='dark'] .cherry-tab-button.active {\n  background: #3a1e28;\n  border-color: #8f3a4d;\n  color: #ff9aac;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root:not([data-cherry-theme='light']) .cherry-tab-button.active {\n    background: #3a1e28;\n    border-color: #8f3a4d;\n    color: #ff9aac;\n  }\n}\n"""
theme.write_text(text)

# Contract test doubles implement the expanded workspace intent contract.
for path in ['test/contracts/ui-contract.test.ts', 'test/contracts/ui-replaceability.test.ts']:
    replace(
        path,
        """      create: ok,\n      open: ok,\n      goToStart: ok,\n""",
        """      create: ok,\n      open: ok,\n      createTab: ok,\n      openTab: ok,\n      goToStart: ok,\n""",
    )

# Application coverage for canonical tab creation and per-tab Board settings.
app_test = Path('test/application/application-store.test.ts')
text = app_test.read_text()
text += """\n\ndescribe('Application workspace tabs', () => {\n  it('creates a named planning tab with independent semantic and Board state', () => {\n    const { workspace, tabId } = fixture([task('Existing task')]);\n    const store = new ApplicationStore(workspace, () => '2026-09-14T02:00:00.000Z');\n    const secondTabId = unwrapId(parseTabId('research'));\n\n    committed(expectOk(store.createTab(secondTabId, ' Research ')));\n\n    expect(store.workspace.tabOrder).toEqual([tabId, secondTabId]);\n    expect(tab(store, secondTabId).name).toBe('Research');\n    expect(Object.keys(tab(store, secondTabId).tasks)).toEqual([]);\n    expect(tab(store, tabId).tasks['Existing task']).toBeDefined();\n\n    const firstSettings = tab(store, tabId).board.settings;\n    const secondSettings = { ...firstSettings, autoLayout: !firstSettings.autoLayout };\n    committed(expectOk(store.setBoardSettings(secondTabId, secondSettings)));\n\n    expect(tab(store, secondTabId).board.settings).toEqual(secondSettings);\n    expect(tab(store, tabId).board.settings).toEqual(firstSettings);\n  });\n\n  it('rejects duplicate tab IDs and blank names without mutating the workspace', () => {\n    const { workspace, tabId } = fixture([]);\n    const store = new ApplicationStore(workspace);\n    const revision = store.workspace.meta.revision;\n\n    const duplicate = store.createTab(tabId, 'Duplicate');\n    expect(duplicate.ok).toBe(false);\n    if (!duplicate.ok) expect(duplicate.error.code).toBe('tab-id-in-use');\n\n    const blank = store.createTab(unwrapId(parseTabId('blank')), '   ');\n    expect(blank.ok).toBe(false);\n    if (!blank.ok) expect(blank.error.code).toBe('invalid-tab-name');\n\n    expect(store.workspace.meta.revision).toBe(revision);\n    expect(store.workspace.tabOrder).toEqual([tabId]);\n  });\n});\n"""
app_test.write_text(text)

# Browser acceptance: named tabs keep content separate and active tab restores after reload.
e2e = Path('test/e2e/release-critical.spec.ts')
text = e2e.read_text()
anchor = "test('persistent data clearing requires explicit destructive confirmation', async ({ page }) => {"
if anchor not in text:
    raise SystemExit('E2E insertion anchor not found')
new_test = """test('multiple named planning tabs keep independent content and restore the active tab', async ({\n  page,\n}) => {\n  await page.goto('/');\n  await page.getByRole('button', { name: '保存を許可' }).click();\n  await createWorkspace(page, 'Tabbed workspace');\n  await addTask(page, 'Plan only');\n\n  const tabBar = page.getByRole('navigation', { name: '計画タブ' });\n  await expect(tabBar.getByRole('button', { name: 'Plan' })).toHaveAttribute('aria-current', 'page');\n  await tabBar.getByLabel('タブ名').fill('調査');\n  await tabBar.getByRole('button', { name: '新しいタブ' }).click();\n\n  await expect(tabBar.getByRole('button', { name: '調査' })).toHaveAttribute('aria-current', 'page');\n  await expect(page.locator('.cherry-task').filter({ hasText: 'Plan only' })).toHaveCount(0);\n  await addTask(page, 'Research only');\n\n  await tabBar.getByRole('button', { name: 'Plan' }).click();\n  await expect(page.locator('.cherry-task').filter({ hasText: 'Plan only' })).toBeVisible();\n  await expect(page.locator('.cherry-task').filter({ hasText: 'Research only' })).toHaveCount(0);\n\n  await tabBar.getByRole('button', { name: '調査' }).click();\n  await page.reload();\n  await expect(page.getByRole('heading', { name: 'Tabbed workspace' })).toBeVisible();\n  const restoredTabs = page.getByRole('navigation', { name: '計画タブ' });\n  await expect(restoredTabs.getByRole('button', { name: '調査' })).toHaveAttribute(\n    'aria-current',\n    'page',\n  );\n  await expect(page.locator('.cherry-task').filter({ hasText: 'Research only' })).toBeVisible();\n  await expect(page.locator('.cherry-task').filter({ hasText: 'Plan only' })).toHaveCount(0);\n});\n\n"""
text = text.replace(anchor, new_test + anchor, 1)
e2e.write_text(text)
