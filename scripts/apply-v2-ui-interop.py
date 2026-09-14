from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


# Formal UI contract: expose text import/export without leaking adapters into UI packages.
path = 'src/ui-contract/index.ts'
replace_once(
    path,
    "export type UIActionResult =\n  | { readonly kind: 'ok' }\n  | { readonly kind: 'confirmation-required'; readonly confirmation: ConfirmationDescriptor }\n  | { readonly kind: 'error'; readonly error: PresentationError };\n",
    "export type UIActionResult =\n  | { readonly kind: 'ok' }\n  | { readonly kind: 'confirmation-required'; readonly confirmation: ConfirmationDescriptor }\n  | { readonly kind: 'error'; readonly error: PresentationError };\n\nexport interface ImportExternalTextIntent {\n  readonly source: string;\n  readonly name: string;\n}\n\nexport type UITextExportResult =\n  | {\n      readonly kind: 'ok';\n      readonly fileName: string;\n      readonly mimeType: string;\n      readonly content: string;\n    }\n  | { readonly kind: 'error'; readonly error: PresentationError };\n",
)
replace_once(
    path,
    "  readonly history: {\n    undo(): Promise<UIActionResult>;\n    redo(): Promise<UIActionResult>;\n  };\n",
    "  readonly interop: {\n    exportCsv(): Promise<UITextExportResult>;\n    importCsv(input: ImportExternalTextIntent): Promise<UIActionResult>;\n    importIcs(input: ImportExternalTextIntent): Promise<UIActionResult>;\n  };\n  readonly history: {\n    undo(): Promise<UIActionResult>;\n    redo(): Promise<UIActionResult>;\n  };\n",
)

# Composition owns adapters; the replaceable UI sees only the contract above.
path = 'src/composition/cherry-ui-runtime.ts'
replace_once(
    path,
    "import { annotationBounds } from '../modules/annotation/index';\n",
    "import {\n  commitPreparedExternalImport,\n  exportTabToCsv,\n  importCsvToTab,\n  importIcsToTab,\n  prepareExternalImportAsNewTab,\n  type ExternalTabImport,\n} from '../adapters/interop/index';\nimport { annotationBounds } from '../modules/annotation/index';\n",
)
replace_once(
    path,
    "  type PresentationError,\n  type UIActionResult,\n  type WorkspaceScreenModel,\n",
    "  type PresentationError,\n  type UIActionResult,\n  type UITextExportResult,\n  type WorkspaceScreenModel,\n",
)
replace_once(
    path,
    "      history: {\n        undo: () => this.#history('undo'),\n        redo: () => this.#history('redo'),\n      },\n",
    "      interop: {\n        exportCsv: () => this.#exportCsv(),\n        importCsv: (input) => this.#importExternalText('csv', input.source, input.name),\n        importIcs: (input) => this.#importExternalText('ics', input.source, input.name),\n      },\n      history: {\n        undo: () => this.#history('undo'),\n        redo: () => this.#history('redo'),\n      },\n",
)
replace_once(
    path,
    "  async #history(direction: 'undo' | 'redo'): Promise<UIActionResult> {\n",
    "  async #exportCsv(): Promise<UITextExportResult> {\n    if (this.#store === null || this.#tabId === null) {\n      return { kind: 'error', error: { code: 'not-found', messageKey: 'error.notFound' } };\n    }\n    const tab = this.#store.workspace.tabs[this.#tabId];\n    if (tab === undefined) {\n      return { kind: 'error', error: { code: 'not-found', messageKey: 'error.notFound' } };\n    }\n    const stem = tab.name.trim().replace(/[\\/:*?\"<>|]+/g, '_') || 'cherry-tab';\n    return {\n      kind: 'ok',\n      fileName: `${stem}.csv`,\n      mimeType: 'text/csv;charset=utf-8',\n      content: exportTabToCsv(tab),\n    };\n  }\n\n  async #importExternalText(\n    format: 'csv' | 'ics',\n    source: string,\n    rawName: string,\n  ): Promise<UIActionResult> {\n    if (this.#store === null || this.#tabId === null) {\n      return this.#error('not-found', 'error.notFound');\n    }\n    const name = rawName.trim() || (format === 'csv' ? 'CSV import' : 'Calendar import');\n    const parsed = format === 'csv' ? importCsvToTab(source, name) : importIcsToTab(source, name);\n    if (!parsed.ok) {\n      return {\n        kind: 'error',\n        error: { code: 'validation', messageKey: 'error.validation', detail: parsed.error.message },\n      };\n    }\n    const imported: ExternalTabImport = parsed.value;\n    const previous = this.#store.workspace;\n    const prepared = prepareExternalImportAsNewTab(previous, imported);\n    if (!prepared.ok) {\n      return {\n        kind: 'error',\n        error: { code: 'validation', messageKey: 'error.validation', detail: prepared.error.message },\n      };\n    }\n    const committed = await commitPreparedExternalImport(\n      this.#application.persistence.workspaceRepository,\n      previous,\n      prepared.value,\n    );\n    if (committed.kind !== 'saved') {\n      return this.#error(\n        committed.result.kind === 'revision-conflict' ? 'conflict' : 'persistence',\n        committed.result.kind === 'revision-conflict' ? 'error.conflict' : 'error.persistence',\n      );\n    }\n    this.#store = new ApplicationStore(committed.workspace);\n    this.#tabId = prepared.value.importedTabId;\n    this.#view = 'board';\n    await this.#rememberSession();\n    this.#refreshWorkspace();\n    return OK;\n  }\n\n  async #history(direction: 'undo' | 'redo'): Promise<UIActionResult> {\n",
)

# Game UI entry points: browser file picker and CSV download, still using only CherryUIContext.
path = 'src/ui/game/index.ts'
replace_once(
    path,
    "function scheduleValue(task: TaskCardModel): { kind: string; date: string; time: string } {\n",
    "function downloadTextFile(fileName: string, mimeType: string, content: string): void {\n  const blob = new Blob([content], { type: mimeType });\n  const url = URL.createObjectURL(blob);\n  const anchor = document.createElement('a');\n  anchor.href = url;\n  anchor.download = fileName;\n  anchor.click();\n  URL.revokeObjectURL(url);\n}\n\nfunction scheduleValue(task: TaskCardModel): { kind: string; date: string; time: string } {\n",
)
replace_once(
    path,
    "      panel.append(guide);\n      if (context.capabilities.persistentStorageEnabled) {\n",
    "      panel.append(guide);\n\n      const dataHeading = el('strong', 'cg-settings-section-title');\n      dataHeading.textContent = 'データ';\n      const importFile = (accept: string, kind: 'csv' | 'ics'): void => {\n        const input = el('input');\n        input.type = 'file';\n        input.accept = accept;\n        input.hidden = true;\n        input.addEventListener('change', () => {\n          const file = input.files?.[0];\n          if (!file) return;\n          void file.text().then((source) =>\n            perform(\n              kind === 'csv'\n                ? context.intents.interop.importCsv({ source, name: file.name })\n                : context.intents.interop.importIcs({ source, name: file.name }),\n            ),\n          );\n        });\n        panel.append(input);\n        input.click();\n      };\n      panel.append(\n        dataHeading,\n        btn('CSVを書き出す', () => {\n          void context.intents.interop.exportCsv().then((result) => {\n            if (result.kind === 'error') {\n              window.alert(context.i18n.t(result.error.messageKey));\n              return;\n            }\n            downloadTextFile(result.fileName, result.mimeType, result.content);\n          });\n        }),\n        btn('CSVを取り込む', () => importFile('.csv,text/csv', 'csv')),\n        btn('ICSを取り込む', () => importFile('.ics,text/calendar', 'ics')),\n      );\n\n      if (context.capabilities.persistentStorageEnabled) {\n",
)

# Contract test doubles must implement the new interop port.
for path in ['test/contracts/ui-contract.test.ts', 'test/contracts/ui-replaceability.test.ts']:
    replace_once(
        path,
        "    history: { undo: ok, redo: ok },\n",
        "    interop: {\n      exportCsv: () =>\n        Promise.resolve({ kind: 'ok', fileName: 'plan.csv', mimeType: 'text/csv', content: '' }),\n      importCsv: ok,\n      importIcs: ok,\n    },\n    history: { undo: ok, redo: ok },\n",
    )
