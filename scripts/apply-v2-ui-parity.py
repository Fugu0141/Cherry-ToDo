from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:140]!r}")
    file.write_text(text.replace(old, new, 1))


path = 'src/ui/game/index.ts'
replace_once(
    path,
    "  CherryScheduleModel,\n  CherryTimeGuideMode,\n",
    "  CherryScheduleModel,\n  CherryTaskImportance,\n  CherryTimeGuideMode,\n",
)
replace_once(
    path,
    "    const tr = (ja: string, en: string): string => (context.i18n.locale === 'ja' ? ja : en);\n",
    "    const tr = (ja: string, en: string): string => (context.i18n.locale === 'ja' ? ja : en);\n    const importanceLabel = (value: CherryTaskImportance): string => {\n      const labels: Record<CherryTaskImportance, readonly [string, string]> = {\n        none: ['なし', 'None'],\n        low: ['低', 'Low'],\n        medium: ['中', 'Medium'],\n        high: ['高', 'High'],\n        urgent: ['緊急', 'Urgent'],\n      };\n      const [ja, en] = labels[value];\n      return tr(ja, en);\n    };\n",
)
replace_once(
    path,
    "      if (task.isDerivedGoal || task.isMergeTarget || task.blocked) {\n",
    "      if (task.isDerivedGoal || task.isMergeTarget || task.blocked || task.importance !== 'none') {\n",
)
replace_once(
    path,
    "        if (task.blocked) {\n          const badge = el('span', 'cg-badge cg-warn');\n          badge.textContent = 'LOCKED';\n          badges.append(badge);\n        }\n        card.append(badges);\n",
    "        if (task.blocked) {\n          const badge = el('span', 'cg-badge cg-warn');\n          badge.textContent = 'LOCKED';\n          badges.append(badge);\n        }\n        if (task.importance !== 'none') {\n          const badge = el('span', 'cg-badge cg-importance');\n          badge.textContent = `${tr('重要度', 'Importance')}: ${importanceLabel(task.importance)}`;\n          badges.append(badge);\n        }\n        card.append(badges);\n",
)
replace_once(
    path,
    "      const time = field(tr('時刻', 'Time'), schedule.time);\n      time.input.type = 'time';\n      const danger = btn(\n",
    "      const time = field(tr('時刻', 'Time'), schedule.time);\n      time.input.type = 'time';\n      const importanceWrap = el('label', 'cg-field');\n      const importanceCaption = el('span', 'cg-field-label');\n      importanceCaption.textContent = tr('重要度', 'Importance');\n      const importance = el('select', 'cg-input');\n      importance.setAttribute('aria-label', tr('重要度', 'Importance'));\n      for (const value of ['none', 'low', 'medium', 'high', 'urgent'] as const) {\n        const option = el('option');\n        option.value = value;\n        option.textContent = importanceLabel(value);\n        importance.append(option);\n      }\n      importance.value = task.importance;\n      importanceWrap.append(importanceCaption, importance);\n      const danger = btn(\n",
)
replace_once(
    path,
    "      form.append(heading, title.wrap, notesWrap, scheduleKind, date.wrap, time.wrap, actions);\n",
    "      form.append(\n        heading,\n        title.wrap,\n        notesWrap,\n        scheduleKind,\n        date.wrap,\n        time.wrap,\n        importanceWrap,\n        actions,\n      );\n",
)
replace_once(
    path,
    "              notes: notes.value,\n            }),\n",
    "              notes: notes.value,\n              importance: importance.value as CherryTaskImportance,\n            }),\n",
)
replace_once(
    path,
    "      if (context.capabilities.persistentStorageEnabled) {\n        panel.append(\n          btn(\n            tr('端末保存を停止', 'Stop device storage'),\n            () => {\n              void perform(context.intents.storage.disable(false));\n            },\n            'cg-btn cg-quiet',\n          ),\n        );\n      }\n",
    "      if (context.capabilities.persistentStorageEnabled) {\n        panel.append(\n          btn(\n            tr('端末保存を停止', 'Stop device storage'),\n            () => {\n              void perform(context.intents.storage.disable(false));\n            },\n            'cg-btn cg-quiet',\n          ),\n          btn(\n            tr('保存データを削除して停止', 'Clear saved data & stop storage'),\n            () => {\n              const accepted = window.confirm(\n                tr(\n                  'この端末に保存したCherryデータを削除しますか？',\n                  'Clear saved Cherry data from this device?',\n                ),\n              );\n              if (!accepted) return;\n              void perform(context.intents.storage.disable(true));\n            },\n            'cg-btn cg-danger',\n          ),\n        );\n      }\n",
)

path = 'src/ui/game/styles.css'
text = Path(path).read_text()
marker = ".cg-badge.cg-warn { background: #fff4df; color: #835115; }\n"
if marker not in text:
    raise SystemExit('importance badge style marker not found')
text = text.replace(
    marker,
    marker + ".cg-badge.cg-importance { background: #eef1f5; color: #4f5864; }\n",
    1,
)
Path(path).write_text(text)
