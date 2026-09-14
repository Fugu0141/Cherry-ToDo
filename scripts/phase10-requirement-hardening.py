from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f'anchor not found in {path}: {old[:80]!r}')
    file.write_text(text.replace(old, new, count))


# UI contract: persistence settings + goal importance labels.
replace(
    'src/ui-contract/index.ts',
    "export type CherryTimeGuideMode = 'auto' | 'shown' | 'hidden';\n",
    "export type CherryTimeGuideMode = 'auto' | 'shown' | 'hidden';\nexport type CherryPersistenceMode = 'memory' | 'persistent';\n",
)
replace(
    'src/ui-contract/index.ts',
    """  readonly storage: {\n    allow(): Promise<UIActionResult>;\n    notNow(): Promise<UIActionResult>;\n  };\n""",
    """  readonly storage: {\n    allow(): Promise<UIActionResult>;\n    notNow(): Promise<UIActionResult>;\n    disable(clearPersistentData: boolean): Promise<UIActionResult>;\n  };\n""",
)
replace(
    'src/ui-contract/index.ts',
    """export interface CherryUICapabilities {\n  readonly persistentStorageAvailable: boolean;\n""",
    """export interface CherryUICapabilities {\n  readonly persistentStorageAvailable: boolean;\n  readonly persistentStorageEnabled: boolean;\n""",
)
replace(
    'src/ui-contract/index.ts',
    """  | 'storage.allow'\n  | 'storage.notNow'\n""",
    """  | 'storage.allow'\n  | 'storage.notNow'\n  | 'storage.settings'\n  | 'storage.disable'\n  | 'storage.disableAndClear'\n  | 'storage.clearConfirm'\n""",
)
replace(
    'src/ui-contract/index.ts',
    """  | 'task.notes'\n  | 'task.schedule'\n""",
    """  | 'task.notes'\n  | 'task.importance'\n  | 'task.importanceNone'\n  | 'task.importanceLow'\n  | 'task.importanceMedium'\n  | 'task.importanceHigh'\n  | 'task.importanceUrgent'\n  | 'task.schedule'\n""",
)

# i18n dictionaries.
replace(
    'src/ui-contract/i18n.ts',
    """    'storage.allow': '保存を許可',\n    'storage.notNow': '今はしない',\n""",
    """    'storage.allow': '保存を許可',\n    'storage.notNow': '今はしない',\n    'storage.settings': '端末保存',\n    'storage.disable': 'この端末への保存を停止',\n    'storage.disableAndClear': '保存データを削除して停止',\n    'storage.clearConfirm':\n      'このブラウザに保存したCherryのデータを削除し、端末保存を停止します。現在のセッションはメモリ上で続行できます。削除しますか？',\n""",
)
replace(
    'src/ui-contract/i18n.ts',
    """    'task.notes': 'メモ',\n    'task.schedule': 'スケジュール',\n""",
    """    'task.notes': 'メモ',\n    'task.importance': '重要度',\n    'task.importanceNone': 'なし',\n    'task.importanceLow': '低',\n    'task.importanceMedium': '中',\n    'task.importanceHigh': '高',\n    'task.importanceUrgent': '最重要',\n    'task.schedule': 'スケジュール',\n""",
)
replace(
    'src/ui-contract/i18n.ts',
    """    'storage.allow': 'Allow saving',\n    'storage.notNow': 'Not now',\n""",
    """    'storage.allow': 'Allow saving',\n    'storage.notNow': 'Not now',\n    'storage.settings': 'Device storage',\n    'storage.disable': 'Stop saving on this device',\n    'storage.disableAndClear': 'Delete saved data and stop saving',\n    'storage.clearConfirm':\n      'Delete Cherry data saved in this browser and stop persistent saving? The current session can continue in memory.',\n""",
)
replace(
    'src/ui-contract/i18n.ts',
    """    'task.notes': 'Notes',\n    'task.schedule': 'Schedule',\n""",
    """    'task.notes': 'Notes',\n    'task.importance': 'Importance',\n    'task.importanceNone': 'None',\n    'task.importanceLow': 'Low',\n    'task.importanceMedium': 'Medium',\n    'task.importanceHigh': 'High',\n    'task.importanceUrgent': 'Urgent',\n    'task.schedule': 'Schedule',\n""",
)

# Runtime: expose live persistence state and policy-safe disable/clear intent.
replace(
    'src/composition/cherry-ui-runtime.ts',
    """  readonly capabilities = {\n    persistentStorageAvailable: true,\n    boardView: true,\n    listView: true,\n    taskEditing: true,\n    structuralConnections: true,\n    annotations: true,\n  } as const;\n""",
    """  get capabilities() {\n    return {\n      persistentStorageAvailable: true,\n      persistentStorageEnabled: this.#application.persistence.mode === 'persistent',\n      boardView: true,\n      listView: true,\n      taskEditing: true,\n      structuralConnections: true,\n      annotations: true,\n    } as const;\n  }\n""",
)
replace(
    'src/composition/cherry-ui-runtime.ts',
    """      storage: {\n        allow: () => this.#resolveStartup(this.#application.startup.chooseAllow()),\n        notNow: () => this.#resolveStartup(this.#application.startup.chooseNotNow()),\n      },\n""",
    """      storage: {\n        allow: () => this.#resolveStartup(this.#application.startup.chooseAllow()),\n        notNow: () => this.#resolveStartup(this.#application.startup.chooseNotNow()),\n        disable: (clearPersistentData) => this.#disablePersistence(clearPersistentData),\n      },\n""",
)
replace(
    'src/composition/cherry-ui-runtime.ts',
    """  async #resolveStartup(statePromise: Promise<StartupState>): Promise<UIActionResult> {\n""",
    """  async #disablePersistence(clearPersistentData: boolean): Promise<UIActionResult> {\n    const result = await this.#application.persistence.disablePersistence({\n      clearPersistentData,\n      confirmed: true,\n    });\n    if (result.kind === 'failed') return this.#error('persistence', 'error.persistence');\n\n    if (this.#store === null) await this.#showStart();\n    else this.#refreshWorkspace();\n    return OK;\n  }\n\n  async #resolveStartup(statePromise: Promise<StartupState>): Promise<UIActionResult> {\n""",
)

# Default UI: storage settings and derived-goal importance editing/presentation.
replace(
    'src/ui/default/index.ts',
    """  CherryFlowKind,\n  CherryScheduleModel,\n""",
    """  CherryFlowKind,\n  CherryScheduleModel,\n  CherryTaskImportance,\n""",
)
replace(
    'src/ui/default/index.ts',
    """interface FlowConnectionDraft {\n""",
    """function renderStorageControls(context: CherryUIContext): HTMLElement | null {\n  if (!context.capabilities.persistentStorageEnabled) return null;\n\n  const controls = element('section', 'cherry-storage-actions');\n  controls.setAttribute('aria-label', context.i18n.t('storage.settings'));\n  controls.append(\n    button(context.i18n.t('storage.disable'), () => {\n      void perform(context, context.intents.storage.disable(false));\n    }),\n    button(\n      context.i18n.t('storage.disableAndClear'),\n      () => {\n        if (!window.confirm(context.i18n.t('storage.clearConfirm'))) return;\n        void perform(context, context.intents.storage.disable(true));\n      },\n      'cherry-button danger ghost',\n    ),\n  );\n  return controls;\n}\n\ninterface FlowConnectionDraft {\n""",
)
replace(
    'src/ui/default/index.ts',
    """    if (task.isMergeTarget) {\n      const merge = element('span', 'cherry-task-badge merge');\n      merge.textContent = context.i18n.t('task.merge');\n      badges.append(merge);\n    }\n    card.append(badges);\n""",
    """    if (task.isMergeTarget) {\n      const merge = element('span', 'cherry-task-badge merge');\n      merge.textContent = context.i18n.t('task.merge');\n      badges.append(merge);\n    }\n    if (task.isDerivedGoal && task.importance !== 'none') {\n      const importance = element('span', 'cherry-task-badge importance');\n      const label =\n        task.importance === 'low'\n          ? context.i18n.t('task.importanceLow')\n          : task.importance === 'medium'\n            ? context.i18n.t('task.importanceMedium')\n            : task.importance === 'high'\n              ? context.i18n.t('task.importanceHigh')\n              : context.i18n.t('task.importanceUrgent');\n      importance.textContent = `${context.i18n.t('task.importance')}: ${label}`;\n      importance.dataset.importance = task.importance;\n      badges.append(importance);\n    }\n    card.append(badges);\n""",
)
replace(
    'src/ui/default/index.ts',
    """  toolbar.append(taskForm);\n\n  if (workspace.tasks.length === 0) {\n""",
    """  toolbar.append(taskForm);\n  const storageControls = renderStorageControls(context);\n  if (storageControls !== null) toolbar.append(storageControls);\n\n  if (workspace.tasks.length === 0) {\n""",
)
replace(
    'src/ui/default/index.ts',
    """      const notes = element('textarea', 'cherry-textarea');\n      notes.value = task.notes;\n      notesLabel.append(notesText, notes);\n\n      const scheduleKind = labeledSelect(context.i18n.t('task.schedule'));\n""",
    """      const notes = element('textarea', 'cherry-textarea');\n      notes.value = task.notes;\n      notesLabel.append(notesText, notes);\n\n      const importanceField = task.isDerivedGoal\n        ? labeledSelect(context.i18n.t('task.importance'))\n        : null;\n      if (importanceField !== null) {\n        const options: readonly [CherryTaskImportance, string][] = [\n          ['none', context.i18n.t('task.importanceNone')],\n          ['low', context.i18n.t('task.importanceLow')],\n          ['medium', context.i18n.t('task.importanceMedium')],\n          ['high', context.i18n.t('task.importanceHigh')],\n          ['urgent', context.i18n.t('task.importanceUrgent')],\n        ];\n        for (const [value, label] of options) {\n          const option = element('option');\n          option.value = value;\n          option.textContent = label;\n          importanceField.select.append(option);\n        }\n        importanceField.select.value = task.importance;\n      }\n\n      const scheduleKind = labeledSelect(context.i18n.t('task.schedule'));\n""",
)
replace(
    'src/ui/default/index.ts',
    """      panel.append(\n        heading,\n        titleField.wrap,\n        notesLabel,\n        scheduleKind.wrap,\n        scheduleFields,\n        actions,\n        danger,\n      );\n""",
    """      panel.append(heading, titleField.wrap, notesLabel);\n      if (importanceField !== null) panel.append(importanceField.wrap);\n      panel.append(scheduleKind.wrap, scheduleFields, actions, danger);\n""",
)
replace(
    'src/ui/default/index.ts',
    """              title: titleField.input.value,\n              notes: notes.value,\n            }),\n""",
    """              title: titleField.input.value,\n              notes: notes.value,\n              ...(importanceField === null\n                ? {}\n                : { importance: importanceField.select.value as CherryTaskImportance }),\n            }),\n""",
)
replace(
    'src/ui/default/index.ts',
    """        main.append(heading, form, list);\n        root.replaceChildren(main);\n""",
    """        main.append(heading, form, list);\n        const storageControls = renderStorageControls(context);\n        if (storageControls !== null) main.append(storageControls);\n        root.replaceChildren(main);\n""",
)

# Contract tests must implement the expanded contract.
for path in ['test/contracts/ui-contract.test.ts', 'test/contracts/ui-replaceability.test.ts']:
    replace(path, "storage: { allow: ok, notNow: ok },", "storage: { allow: ok, notNow: ok, disable: ok },")
    replace(
        path,
        """      persistentStorageAvailable: true,\n      boardView: true,\n""",
        """      persistentStorageAvailable: true,\n      persistentStorageEnabled: false,\n      boardView: true,\n""",
    )

# Basic presentation for the new controls/marker.
styles = Path('src/ui/default/styles.css')
text = styles.read_text()
text += """\n\n/* Phase 10: storage settings and derived-goal importance */\n.cherry-storage-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; align-items: center; }\n.cherry-start > .cherry-storage-actions { margin: 20px 0 0; }\n.cherry-task-badge.importance { color: #40546b; background: #edf3fa; }\n"""
styles.write_text(text)

theme = Path('src/ui/default/theme.css')
text = theme.read_text()
text += """\n\n:root[data-cherry-theme='dark'] .cherry-task-badge.importance {\n  color: #c9dcf2;\n  background: #243448;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root:not([data-cherry-theme='light']) .cherry-task-badge.importance {\n    color: #c9dcf2;\n    background: #243448;\n  }\n}\n"""
theme.write_text(text)
