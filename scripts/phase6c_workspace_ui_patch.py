from pathlib import Path

p = Path('src/ui/default/index.ts')
s = p.read_text()

old = """  collapsedLaneIds: ReadonlySet<string>,
  toggleLane: (laneId: string) => void,
): void {"""
new = """  collapsedLaneIds: ReadonlySet<string>,
  toggleLane: (laneId: string) => void,
  connectionDraft: FlowConnectionDraft | null,
  startConnection: (taskId: string, kind: CherryFlowKind) => void,
  connectTarget: (taskId: string) => void,
  cancelConnection: () => void,
): void {"""
if old not in s:
    raise SystemExit('renderWorkspace signature target not found')
s = s.replace(old, new, 1)

old = """  const content =
    workspace.activeView === 'board'
      ? renderBoard(context, workspace, (id) => selectTask(id), collapsedLaneIds, toggleLane)
      : renderList(context, workspace, (id) => selectTask(id));"""
new = """  const content =
    workspace.activeView === 'board'
      ? renderBoard(
          context,
          workspace,
          (id) => selectTask(id),
          collapsedLaneIds,
          toggleLane,
          connectionDraft,
          startConnection,
          connectTarget,
          cancelConnection,
        )
      : renderList(
          context,
          workspace,
          (id) => selectTask(id),
          connectionDraft,
          startConnection,
          connectTarget,
          cancelConnection,
        );"""
if old not in s:
    raise SystemExit('content target not found')
s = s.replace(old, new, 1)

old = """  mount(root: HTMLElement, context: CherryUIContext): CherryUIHandle {
    let selectedTaskId: string | null = null;
    let lastWorkspaceId: string | null = null;
    const collapsedLaneIds = new Set<string>();"""
new = """  mount(root: HTMLElement, context: CherryUIContext): CherryUIHandle {
    let selectedTaskId: string | null = null;
    let connectionDraft: FlowConnectionDraft | null = null;
    let lastWorkspaceId: string | null = null;
    const collapsedLaneIds = new Set<string>();"""
if old not in s:
    raise SystemExit('mount state target not found')
s = s.replace(old, new, 1)

old = """      if (lastWorkspaceId !== screen.workspace.workspaceId) {
        collapsedLaneIds.clear();
        lastWorkspaceId = screen.workspace.workspaceId;
      }"""
new = """      if (lastWorkspaceId !== screen.workspace.workspaceId) {
        collapsedLaneIds.clear();
        connectionDraft = null;
        lastWorkspaceId = screen.workspace.workspaceId;
      }"""
if old not in s:
    raise SystemExit('workspace reset target not found')
s = s.replace(old, new, 1)

old = """        (laneId) => {
          if (collapsedLaneIds.has(laneId)) collapsedLaneIds.delete(laneId);
          else collapsedLaneIds.add(laneId);
          render();
        },
      );"""
new = """        (laneId) => {
          if (collapsedLaneIds.has(laneId)) collapsedLaneIds.delete(laneId);
          else collapsedLaneIds.add(laneId);
          render();
        },
        connectionDraft,
        (taskId, kind) => {
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
        },
      );"""
if old not in s:
    raise SystemExit('renderWorkspace callback target not found')
s = s.replace(old, new, 1)

p.write_text(s)
