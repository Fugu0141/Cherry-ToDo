from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


# Bootstrap the selected locale before the runtime/UI mount and expose a settings control.
path = 'src/main.ts'
replace_once(
    path,
    "import { installCherryOnboarding } from './ui/game/onboarding';\n",
    "import { installCherryOnboarding } from './ui/game/onboarding';\nimport {\n  applyCherryLocale,\n  installCherryLocaleControls,\n  readCherryLocalePreference,\n} from './ui/game/locale';\n",
)
replace_once(
    path,
    "applyCherryTheme(readCherryThemePreference());\n\nvoid bootstrapCherry(root, { ui: new CherryGameUI(), locale: 'ja' }).then(() => {\n  installCherryOnboarding(root);\n  installCherryThemeControls(root);\n});\n",
    "const locale = readCherryLocalePreference();\napplyCherryLocale(locale);\napplyCherryTheme(readCherryThemePreference());\n\nvoid bootstrapCherry(root, { ui: new CherryGameUI(), locale }).then(() => {\n  installCherryOnboarding(root, locale);\n  installCherryThemeControls(root, locale);\n  installCherryLocaleControls(root, locale);\n});\n",
)

# Localize the settings-side theme selector too.
path = 'src/ui/game/theme.ts'
replace_once(
    path,
    "export function installCherryThemeControls(root: HTMLElement): () => void {\n",
    "export function installCherryThemeControls(\n  root: HTMLElement,\n  locale: 'ja' | 'en' = 'ja',\n): () => void {\n",
)
replace_once(path, "    label.textContent = 'テーマ';\n", "    label.textContent = locale === 'ja' ? 'テーマ' : 'Theme';\n")
replace_once(
    path,
    "    select.setAttribute('aria-label', 'テーマ');\n",
    "    select.setAttribute('aria-label', locale === 'ja' ? 'テーマ' : 'Theme');\n",
)
replace_once(
    path,
    "      ['system', 'システム'],\n      ['light', 'ライト'],\n      ['dark', 'ダーク'],\n",
    "      ['system', locale === 'ja' ? 'システム' : 'System'],\n      ['light', locale === 'ja' ? 'ライト' : 'Light'],\n      ['dark', locale === 'ja' ? 'ダーク' : 'Dark'],\n",
)

# Onboarding follows the selected product language.
path = 'src/ui/game/onboarding.ts'
replace_once(
    path,
    "];\n\nexport function shouldAutoOpenCherryOnboarding(state: CherryOnboardingState): boolean {\n",
    "];\n\nexport const CHERRY_ONBOARDING_STEPS_EN: readonly CherryOnboardingStep[] = [\n  {\n    selector: '.cg-fab',\n    eyebrow: 'STEP 1 / 4',\n    title: 'Place your first task',\n    body: 'Use the + button at the lower right to create your first task. In Cherry, the board itself is the main planning surface.',\n  },\n  {\n    selector: '.cg-board-scroll',\n    eyebrow: 'STEP 2 / 4',\n    title: 'Move tasks directly',\n    body: 'Select a task with a click or tap and drag it to move it. The action dock lets you complete, edit, or continue from the selected task.',\n  },\n  {\n    selector: '.cg-tabs',\n    eyebrow: 'STEP 3 / 4',\n    title: 'Grow the Flow',\n    body: 'Use the + handle, Next, or Branch to extend a Flow. Existing lets you connect to a task that is already on the board.',\n  },\n  {\n    selector: '.cg-topbar-actions',\n    eyebrow: 'STEP 4 / 4',\n    title: 'Bring in tools only when needed',\n    body: 'Board/List, Undo/Redo, and display settings live at the upper right. You can reopen this guide any time from the ? button.',\n  },\n];\n\nexport function shouldAutoOpenCherryOnboarding(state: CherryOnboardingState): boolean {\n",
)
replace_once(
    path,
    "export function installCherryOnboarding(root: HTMLElement): () => void {\n",
    "export function installCherryOnboarding(\n  root: HTMLElement,\n  locale: 'ja' | 'en' = 'ja',\n): () => void {\n",
)
replace_once(
    path,
    "  let card: HTMLDivElement | null = null;\n\n  const helpButton",
    "  let card: HTMLDivElement | null = null;\n  const steps = locale === 'en' ? CHERRY_ONBOARDING_STEPS_EN : CHERRY_ONBOARDING_STEPS;\n\n  const helpButton",
)
replace_once(
    path,
    "  helpButton.setAttribute('aria-label', 'Cherryの使い方を開く');\n",
    "  helpButton.setAttribute(\n    'aria-label',\n    locale === 'ja' ? 'Cherryの使い方を開く' : 'Open Cherry guide',\n  );\n",
)
replace_once(
    path,
    "    CHERRY_ONBOARDING_STEPS[currentStep] ?? CHERRY_ONBOARDING_STEPS[0]!;\n",
    "    steps[currentStep] ?? steps[0]!;\n",
)
replace_once(
    path,
    "    const skip = makeButton('あとで', 'cg-onboarding-button quiet');\n",
    "    const skip = makeButton(locale === 'ja' ? 'あとで' : 'Later', 'cg-onboarding-button quiet');\n",
)
replace_once(
    path,
    "      const back = makeButton('戻る', 'cg-onboarding-button quiet');\n",
    "      const back = makeButton(locale === 'ja' ? '戻る' : 'Back', 'cg-onboarding-button quiet');\n",
)
replace_once(
    path,
    "      currentStep === CHERRY_ONBOARDING_STEPS.length - 1 ? '使ってみる' : '次へ',\n",
    "      currentStep === steps.length - 1\n        ? locale === 'ja'\n          ? '使ってみる'\n          : 'Start planning'\n        : locale === 'ja'\n          ? '次へ'\n          : 'Next',\n",
)
replace_once(
    path,
    "      if (currentStep === CHERRY_ONBOARDING_STEPS.length - 1) {\n",
    "      if (currentStep === steps.length - 1) {\n",
)
replace_once(
    path,
    "    overlay.setAttribute('aria-label', 'Cherryの使い方');\n",
    "    overlay.setAttribute('aria-label', locale === 'ja' ? 'Cherryの使い方' : 'How to use Cherry');\n",
)

# Main Game UI strings use the runtime locale. Changing locale reloads the app, so handlers and prompts agree too.
path = 'src/ui/game/index.ts'
replace_once(
    path,
    "    const perform = (promise: Promise<UIActionResult>) => run(context, promise);\n",
    "    const perform = (promise: Promise<UIActionResult>) => run(context, promise);\n    const tr = (ja: string, en: string): string => (context.i18n.locale === 'ja' ? ja : en);\n",
)

translations = {
    '流れを置いて、つないで、進める。': 'Place it. Connect it. Move forward.',
    'タスクをリストに入力するのではなく、ボードを直接触って計画します。': 'Plan by working directly on the board instead of filling out a task form.',
    '＋ 新しいワークスペース': '＋ New workspace',
    'ワークスペース名': 'Workspace name',
    'つづきから': 'Continue',
    '未完了に戻す': 'Reopen',
    '完了': 'Complete',
    '無題のタスク': 'Untitled task',
    '次のタスクをつなぐ': 'Connect next task',
    '日付なし': 'No date',
    '今やること': 'Now',
    '選択中のタスク操作': 'Selected task actions',
    '↺ 戻す': '↺ Reopen',
    '✓ 完了': '✓ Complete',
    '＋ 次へ': '＋ Next',
    '↗ 分岐': '↗ Branch',
    '🔗 既存へ': '🔗 Existing',
    '✎ 編集': '✎ Edit',
    '次にやることは？': "What's next?",
    '何をやる？': 'What do you want to do?',
    'タスク名を入力…': 'Enter a task name…',
    '→ 続き': '→ Continue',
    '↝ 参照': '↝ Reference',
    'キャンセル': 'Cancel',
    '作成': 'Create',
    'タスクを編集': 'Edit task',
    'タスク名': 'Task name',
    'メモ': 'Notes',
    '日付': 'Date',
    '日時': 'Date & time',
    '時刻': 'Time',
    '削除': 'Delete',
    'このタスクを削除しますか？': 'Delete this task?',
    '保存': 'Save',
    '表示と操作': 'Display & controls',
    '日付レーン': 'Date lanes',
    '自動整列': 'Auto layout',
    '時間ガイド: 自動': 'Time guide: Auto',
    '時間ガイド: 表示': 'Time guide: Shown',
    '時間ガイド: 非表示': 'Time guide: Hidden',
    'データ': 'Data',
    'CSVを書き出す': 'Export CSV',
    'CSVを取り込む': 'Import CSV',
    'ICSを取り込む': 'Import ICS',
    '端末保存を停止': 'Stop device storage',
    '名前を変更': 'Rename',
    'タブ名': 'Tab name',
    '複製': 'Duplicate',
    '新しいタブ': 'New tab',
    'ボード': 'Board',
    'リスト': 'List',
    'タスクを追加': 'Add task',
    '接続先のタスクを選んでください  ·  Escでキャンセル': 'Choose a task to connect  ·  Esc to cancel',
    'この端末に作業を保存しますか？': 'Save your work on this device?',
    '許可すると、閉じても続きから再開できます。あとから変更できます。': 'Allow storage to resume where you left off after closing Cherry. You can change this later.',
    '今回は保存しない': 'Not now',
    '保存する': 'Save on this device',
    'Cherryを開けませんでした': 'Cherry could not be opened',
}
text = Path(path).read_text()
for ja, en in translations.items():
    old = repr(ja)
    new = f"tr({ja!r}, {en!r})"
    text = text.replace(old, new)
old = "window.confirm(`「${tab.name}」を削除しますか？`)"
new = "window.confirm(tr(`「${tab.name}」を削除しますか？`, `Delete \\\"${tab.name}\\\"?`))"
if old not in text:
    raise SystemExit('tab delete confirmation pattern not found')
text = text.replace(old, new, 1)
Path(path).write_text(text)
