from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:80]!r}")
    file.write_text(text.replace(old, new, 1))


# ApplicationStore: restore V1-style tab lifecycle as canonical commands.
path = "src/modules/workspace/application/application-store.ts"
marker = "\n  undo(): Result<WorkspaceDocument, ApplicationError> {"
methods = r'''

  renameTab(tabId: TabId, rawName: string): Result<MutationOutcome, ApplicationError> {
    const tab = this.#workspace.tabs[tabId];
    if (tab === undefined) return err({ code: 'tab-not-found', tabId });
    const name = rawName.trim();
    if (name.length === 0) return err({ code: 'invalid-tab-name' });
    if (name === tab.name) return ok({ kind: 'committed', workspace: this.#workspace });

    const now = this.#now();
    const candidate = bumpWorkspaceRevision(
      {
        ...this.#workspace,
        tabs: {
          ...this.#workspace.tabs,
          [tabId]: { ...tab, name, meta: bumpMeta(tab.meta, now) },
        },
      },
      now,
    );
    const validation = validateWorkspaceDocument(candidate);
    if (!validation.ok) return err({ code: 'workspace-invalid', causes: validation.error });
    this.#commitCanonical(validation.value);
    return ok({ kind: 'committed', workspace: this.#workspace });
  }

  duplicateTab(
    sourceTabId: TabId,
    newTabId: TabId,
    rawName?: string,
  ): Result<MutationOutcome, ApplicationError> {
    const source = this.#workspace.tabs[sourceTabId];
    if (source === undefined) return err({ code: 'tab-not-found', tabId: sourceTabId });
    if (this.#workspace.tabs[newTabId] !== undefined) {
      return err({ code: 'tab-id-in-use', tabId: newTabId });
    }
    const name = (rawName ?? `${source.name} copy`).trim();
    if (name.length === 0) return err({ code: 'invalid-tab-name' });

    const now = this.#now();
    const duplicate: TabDocument = {
      ...source,
      id: newTabId,
      name,
      tasks: { ...source.tasks },
      flowEdges: { ...source.flowEdges },
      annotations: { ...source.annotations },
      board: {
        ...source.board,
        positions: { ...source.board.positions },
        settings: { ...source.board.settings },
      },
      meta: { createdAt: now, updatedAt: now, revision: 0 },
    };
    const sourceIndex = this.#workspace.tabOrder.indexOf(sourceTabId);
    const tabOrder = [...this.#workspace.tabOrder];
    tabOrder.splice(sourceIndex < 0 ? tabOrder.length : sourceIndex + 1, 0, newTabId);
    const candidate = bumpWorkspaceRevision(
      {
        ...this.#workspace,
        tabs: { ...this.#workspace.tabs, [newTabId]: duplicate },
        tabOrder,
      },
      now,
    );
    const validation = validateWorkspaceDocument(candidate);
    if (!validation.ok) return err({ code: 'workspace-invalid', causes: validation.error });
    this.#commitCanonical(validation.value);
    return ok({ kind: 'committed', workspace: this.#workspace });
  }

  deleteTab(tabId: TabId): Result<MutationOutcome, ApplicationError> {
    if (this.#workspace.tabs[tabId] === undefined) return err({ code: 'tab-not-found', tabId });
    const now = this.#now();
    const candidate = bumpWorkspaceRevision(
      {
        ...this.#workspace,
        tabs: withoutKey(this.#workspace.tabs, tabId),
        tabOrder: this.#workspace.tabOrder.filter((candidateId) => candidateId !== tabId),
      },
      now,
    );
    const validation = validateWorkspaceDocument(candidate);
    if (!validation.ok) return err({ code: 'workspace-invalid', causes: validation.error });
    this.#commitCanonical(validation.value);
    return ok({ kind: 'committed', workspace: this.#workspace });
  }
'''
replace_once(path, marker, methods + marker)

# UI contract intents.
path = "src/ui-contract/index.ts"
replace_once(
    path,
    "export interface CreateTabIntent {\n  readonly name: string;\n}\n",
    "export interface CreateTabIntent {\n  readonly name: string;\n}\n\nexport interface RenameTabIntent {\n  readonly tabId: string;\n  readonly name: string;\n}\n",
)
replace_once(
    path,
    "    createTab(input: CreateTabIntent): Promise<UIActionResult>;\n    openTab(tabId: string): Promise<UIActionResult>;",
    "    createTab(input: CreateTabIntent): Promise<UIActionResult>;\n    renameTab(input: RenameTabIntent): Promise<UIActionResult>;\n    duplicateTab(tabId: string): Promise<UIActionResult>;\n    deleteTab(tabId: string): Promise<UIActionResult>;\n    openTab(tabId: string): Promise<UIActionResult>;",
)

# Runtime wiring.
path = "src/composition/cherry-ui-runtime.ts"
replace_once(
    path,
    "        createTab: (input) => this.#createTab(input.name),\n        openTab: (tabId) => this.#openTab(tabId),",
    "        createTab: (input) => this.#createTab(input.name),\n        renameTab: (input) => this.#renameTab(input.tabId, input.name),\n        duplicateTab: (tabId) => this.#duplicateTab(tabId),\n        deleteTab: (tabId) => this.#deleteTab(tabId),\n        openTab: (tabId) => this.#openTab(tabId),",
)
marker = "\n  async #openTab(rawId: string): Promise<UIActionResult> {"
runtime_methods = r'''

  async #renameTab(rawId: string, rawName: string): Promise<UIActionResult> {
    if (this.#store === null) return this.#error('not-found', 'error.notFound');
    const parsed = parseTabId(rawId);
    if (!parsed.ok) return this.#error('validation', 'error.validation');
    const previous = this.#store.workspace;
    const result = this.#store.renameTab(parsed.value, rawName);
    if (!result.ok) return { kind: 'error', error: presentationError(result.error) };
    const saved = await this.#application.persistence.workspaceRepository.save(
      this.#store.workspace,
      previous.meta.revision,
    );
    if (saved.kind !== 'saved') {
      this.#store = new ApplicationStore(previous);
      this.#refreshWorkspace();
      return this.#error(
        saved.kind === 'revision-conflict' ? 'conflict' : 'persistence',
        saved.kind === 'revision-conflict' ? 'error.conflict' : 'error.persistence',
      );
    }
    this.#refreshWorkspace();
    return OK;
  }

  async #duplicateTab(rawId: string): Promise<UIActionResult> {
    if (this.#store === null) return this.#error('not-found', 'error.notFound');
    const parsed = parseTabId(rawId);
    if (!parsed.ok) return this.#error('validation', 'error.validation');
    const previous = this.#store.workspace;
    const tabId = unwrapId(parseTabId(randomId('tab')));
    const result = this.#store.duplicateTab(parsed.value, tabId);
    if (!result.ok) return { kind: 'error', error: presentationError(result.error) };
    const saved = await this.#application.persistence.workspaceRepository.save(
      this.#store.workspace,
      previous.meta.revision,
    );
    if (saved.kind !== 'saved') {
      this.#store = new ApplicationStore(previous);
      this.#refreshWorkspace();
      return this.#error(
        saved.kind === 'revision-conflict' ? 'conflict' : 'persistence',
        saved.kind === 'revision-conflict' ? 'error.conflict' : 'error.persistence',
      );
    }
    this.#tabId = tabId;
    await this.#rememberSession();
    this.#refreshWorkspace();
    return OK;
  }

  async #deleteTab(rawId: string): Promise<UIActionResult> {
    if (this.#store === null) return this.#error('not-found', 'error.notFound');
    const parsed = parseTabId(rawId);
    if (!parsed.ok) return this.#error('validation', 'error.validation');
    const previous = this.#store.workspace;
    const result = this.#store.deleteTab(parsed.value);
    if (!result.ok) return { kind: 'error', error: presentationError(result.error) };

    if (this.#store.workspace.tabOrder.length === 0) {
      await this.#application.persistence.workspaceRepository.delete(this.#store.workspace.id);
      this.#store = null;
      this.#tabId = null;
      return this.#showStart();
    }

    const saved = await this.#application.persistence.workspaceRepository.save(
      this.#store.workspace,
      previous.meta.revision,
    );
    if (saved.kind !== 'saved') {
      this.#store = new ApplicationStore(previous);
      this.#refreshWorkspace();
      return this.#error(
        saved.kind === 'revision-conflict' ? 'conflict' : 'persistence',
        saved.kind === 'revision-conflict' ? 'error.conflict' : 'error.persistence',
      );
    }
    if (this.#tabId === parsed.value) {
      const fallback = this.#store.workspace.tabOrder[0];
      if (fallback === undefined) return this.#error('not-found', 'error.notFound');
      this.#tabId = fallback;
      await this.#rememberSession();
    }
    this.#refreshWorkspace();
    return OK;
  }
'''
replace_once(path, marker, runtime_methods + marker)

# Game UI tab lifecycle menu.
path = "src/ui/game/index.ts"
replace_once(path, "    let settingsOpen = false;\n", "    let settingsOpen = false;\n    let tabMenuId: string | null = null;\n")
replace_once(
    path,
    "      settingsOpen = false;\n      coordinator.cancel();",
    "      settingsOpen = false;\n      tabMenuId = null;\n      coordinator.cancel();",
)
old_tabs = r'''      const center = el('nav', 'cg-tabs');
      for (const tab of workspace.tabs) {
        const tabButton = btn(
          tab.name,
          () => {
            if (tab.id !== workspace.tabId) void perform(context.intents.workspace.openTab(tab.id));
          },
          tab.id === workspace.tabId ? 'cg-tab active' : 'cg-tab',
        );
        center.append(tabButton);
      }
'''
new_tabs = r'''      const center = el('nav', 'cg-tabs');
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
'''
replace_once(path, old_tabs, new_tabs)

# Tab menu styles.
path = "src/ui/game/styles.css"
marker = ".cg-tab-add { width: 34px; padding: 0; font-size: 18px; }\n"
styles = r'''.cg-tab-item { position: relative; display: inline-flex; align-items: center; flex: 0 0 auto; }
.cg-tab-item .cg-tab.active { padding-right: 30px; }
.cg-tab-more { position: absolute; right: 3px; width: 27px; height: 27px; min-height: 0; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--cg-muted); font-weight: 800; }
.cg-tab-more:hover { background: rgba(216,51,82,.08); color: var(--cg-accent); }
.cg-tab-menu { position: absolute; top: calc(100% + 7px); right: 0; z-index: 75; min-width: 154px; padding: 6px; border: 1px solid var(--cg-border); border-radius: 13px; background: rgba(255,255,255,.98); box-shadow: var(--cg-shadow); }
.cg-tab-menu-action { display: block; width: 100%; min-height: 36px; padding: 7px 10px; border: 0; border-radius: 9px; background: transparent; text-align: left; white-space: nowrap; }
.cg-tab-menu-action:hover { background: var(--cg-surface-2); }
.cg-tab-menu-action.danger { color: var(--cg-danger); }
'''
replace_once(path, marker, marker + styles)

# Add stubs to any test fixture that explicitly builds CherryUIIntents.
for path in Path("test").rglob("*.ts"):
    text = path.read_text()
    if "createTab:" not in text or "openTab:" not in text or "renameTab:" in text:
        continue
    text = text.replace(
        "        openTab:",
        "        renameTab: async () => ({ kind: 'ok' }),\n        duplicateTab: async () => ({ kind: 'ok' }),\n        deleteTab: async () => ({ kind: 'ok' }),\n        openTab:",
    )
    path.write_text(text)
