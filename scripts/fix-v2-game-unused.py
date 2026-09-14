from pathlib import Path

p = Path('src/ui/game/index.ts')
text = p.read_text()
text = text.replace(
    "    const renderTaskCard = (workspace: WorkspaceScreenModel, task: TaskCardModel): HTMLElement => {",
    "    const renderTaskCard = (task: TaskCardModel): HTMLElement => {",
)
text = text.replace("        const card = renderTaskCard(workspace, task);", "        const card = renderTaskCard(task);")
text = text.replace("        const row = renderTaskCard(workspace, task);", "        const row = renderTaskCard(task);")
text = text.replace(
    "    const renderTaskActions = (\n      workspace: WorkspaceScreenModel,\n      task: TaskCardModel,\n    ): HTMLElement => {",
    "    const renderTaskActions = (task: TaskCardModel): HTMLElement => {",
)
text = text.replace("if (selected) shell.append(renderTaskActions(workspace, selected));", "if (selected) shell.append(renderTaskActions(selected));")
p.write_text(text)
