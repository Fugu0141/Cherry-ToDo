from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} target not found')
    return text.replace(old, new, 1)


# UI contract
p = Path('src/ui-contract/index.ts')
s = p.read_text()
s = replace_once(
    s,
    """  readonly connections: readonly FlowConnectionModel[];
  readonly canUndo: boolean;""",
    """  readonly connections: readonly FlowConnectionModel[];
  readonly linearFlowOrder: readonly string[] | null;
  readonly canUndo: boolean;""",
    'workspace linear order',
)
s = replace_once(
    s,
    """    setSchedule(taskId: string, schedule: CherryScheduleModel): Promise<UIActionResult>;
  };""",
    """    setSchedule(taskId: string, schedule: CherryScheduleModel): Promise<UIActionResult>;
    deleteOnly(taskId: string): Promise<UIActionResult>;
    deleteDownstream(taskId: string): Promise<UIActionResult>;
  };""",
    'task destructive intents',
)
s = replace_once(
    s,
    """  readonly flow: {
    connect(input: ConnectTasksIntent): Promise<UIActionResult>;
  };""",
    """  readonly flow: {
    connect(input: ConnectTasksIntent): Promise<UIActionResult>;
    disconnect(edgeId: string): Promise<UIActionResult>;
    reorder(orderedTaskIds: readonly string[]): Promise<UIActionResult>;
  };""",
    'flow maintenance intents',
)
s = replace_once(
    s,
    """  | 'task.merge'
  | 'task.blockedByMerge'""",
    """  | 'task.merge'
  | 'task.deleteOnly'
  | 'task.deleteDownstream'
  | 'task.deleteConfirm'
  | 'task.blockedByMerge'""",
    'task message keys',
)
s = replace_once(
    s,
    """  | 'flow.cancelConnect'
  | 'common.save'""",
    """  | 'flow.cancelConnect'
  | 'flow.disconnect'
  | 'flow.reorder'
  | 'flow.moveEarlier'
  | 'flow.moveLater'
  | 'history.undo'
  | 'history.redo'
  | 'common.save'""",
    'flow/history message keys',
)
p.write_text(s)


# i18n
p = Path('src/ui-contract/i18n.ts')
s = p.read_text()
s = replace_once(
    s,
    """    'task.merge': '合流',
    'task.blockedByMerge':""",
    """    'task.merge': '合流',
    'task.deleteOnly': 'このタスクだけ削除',
    'task.deleteDownstream': 'このタスクから後を削除',
    'task.deleteConfirm': '削除した内容はUndoで戻せます。削除しますか？',
    'task.blockedByMerge':""",
    'ja task delete messages',
)
s = replace_once(
    s,
    """    'flow.cancelConnect': '接続をやめる',
    'common.save':""",
    """    'flow.cancelConnect': '接続をやめる',
    'flow.disconnect': '接続を削除',
    'flow.reorder': 'Flowの順序',
    'flow.moveEarlier': '前へ',
    'flow.moveLater': '後へ',
    'history.undo': '元に戻す',
    'history.redo': 'やり直す',
    'common.save':""",
    'ja flow messages',
)
s = replace_once(
    s,
    """    'task.merge': 'Merge',
    'task.blockedByMerge':""",
    """    'task.merge': 'Merge',
    'task.deleteOnly': 'Delete this task only',
    'task.deleteDownstream': 'Delete this task and following chain',
    'task.deleteConfirm': 'Deleted content can be restored with Undo. Delete it?',
    'task.blockedByMerge':""",
    'en task delete messages',
)
s = replace_once(
    s,
    """    'flow.cancelConnect': 'Cancel connection',
    'common.save':""",
    """    'flow.cancelConnect': 'Cancel connection',
    'flow.disconnect': 'Remove connection',
    'flow.reorder': 'Flow order',
    'flow.moveEarlier': 'Move earlier',
    'flow.moveLater': 'Move later',
    'history.undo': 'Undo',
    'history.redo': 'Redo',
    'common.save':""",
    'en flow messages',
)
p.write_text(s)


# Runtime helpers, intents and read model.
p = Path('src/composition/cherry-ui-runtime.ts')
s = p.read_text()
marker = """function createWorkspaceDocument(name: string): { document: WorkspaceDocument; tabId: TabId } {"""
helper = """function deriveLinearFlowOrder(
  taskIds: readonly string[],
  edges: readonly { readonly fromTaskId: string; readonly toTaskId: string }[],
): readonly string[] | null {
  if (taskIds.length < 2 || edges.length !== taskIds.length - 1) return null;
  const incoming = new Map<string, string>();
  const outgoing = new Map<string, string>();
  for (const edge of edges) {
    if (incoming.has(edge.toTaskId) || outgoing.has(edge.fromTaskId)) return null;
    incoming.set(edge.toTaskId, edge.fromTaskId);
    outgoing.set(edge.fromTaskId, edge.toTaskId);
  }
  const roots = taskIds.filter((taskId) => !incoming.has(taskId));
  if (roots.length !== 1) return null;
  const ordered: string[] = [];
  const visited = new Set<string>();
  let cursor: string | undefined = roots[0];
  while (cursor !== undefined && !visited.has(cursor)) {
    ordered.push(cursor);
    visited.add(cursor);
    cursor = outgoing.get(cursor);
  }
  return ordered.length === taskIds.length ? ordered : null;
}

"""
if marker not in s:
    raise SystemExit('runtime helper marker not found')
s = s.replace(marker, helper + marker, 1)

s = replace_once(
    s,
    """        setSchedule: (taskId, schedule) => this.#setSchedule(taskId, schedule),
      },""",
    """        setSchedule: (taskId, schedule) => this.#setSchedule(taskId, schedule),
        deleteOnly: (taskId) =>
          this.#withTaskId(taskId, (parsed) =>
            this.#runMutation((store, tabId) => store.deleteTaskOnly(tabId, parsed)),
          ),
        deleteDownstream: (taskId) =>
          this.#withTaskId(taskId, (parsed) =>
            this.#runMutation((store, tabId) => store.deleteDownstreamFlow(tabId, parsed)),
          ),
      },""",
    'runtime task intents',
)
s = replace_once(
    s,
    """      flow: {
        connect: (input) => this.#connect(input.fromTaskId, input.toTaskId, input.kind),
      },""",
    """      flow: {
        connect: (input) => this.#connect(input.fromTaskId, input.toTaskId, input.kind),
        disconnect: (edgeId) => this.#disconnect(edgeId),
        reorder: (orderedTaskIds) => this.#reorder(orderedTaskIds),
      },""",
    'runtime flow intents',
)
marker = """  async #withTaskId(
    rawId: string,"""
methods = """  async #disconnect(rawEdgeId: string): Promise<UIActionResult> {
    const edgeId = parseFlowEdgeId(rawEdgeId);
    if (!edgeId.ok) return this.#error('validation', 'error.validation');
    return this.#runMutation((store, tabId) => store.disconnectFlow(tabId, edgeId.value));
  }

  async #reorder(rawTaskIds: readonly string[]): Promise<UIActionResult> {
    const parsed = rawTaskIds.map((taskId) => parseTaskId(taskId));
    if (parsed.some((result) => !result.ok)) {
      return this.#error('validation', 'error.validation');
    }
    const taskIds = parsed.flatMap((result) => (result.ok ? [result.value] : []));
    return this.#runMutation((store, tabId) => store.reorderLinearFlow(tabId, taskIds));
  }

"""
if marker not in s:
    raise SystemExit('runtime maintenance method marker not found')
s = s.replace(marker, methods + marker, 1)

s = replace_once(
    s,
    """      connections: Object.values(tab.flowEdges).map((edge) => {""",
    """      linearFlowOrder: deriveLinearFlowOrder(
        Object.values(tab.tasks).map((task) => task.id),
        structuralEdges.map((edge) => ({
          fromTaskId: edge.fromTaskId,
          toTaskId: edge.toTaskId,
        })),
      ),
      connections: Object.values(tab.flowEdges).map((edge) => {""",
    'runtime linear order model',
)
p.write_text(s)


# Contract harness stubs.
p = Path('test/contracts/ui-contract.test.ts')
s = p.read_text()
s = replace_once(
    s,
    """      setSchedule: ok,
    },
    flow: { connect: ok },""",
    """      setSchedule: ok,
      deleteOnly: ok,
      deleteDownstream: ok,
    },
    flow: { connect: ok, disconnect: ok, reorder: ok },""",
    'contract intent stubs',
)
s = replace_once(
    s,
    """    expect(CHERRY_SEMANTIC_TOKENS.states).toContain('derived-goal');""",
    """    expect(CHERRY_SEMANTIC_TOKENS.states).toContain('derived-goal');
    expect(CHERRY_SEMANTIC_TOKENS.states).toContain('merge-target');""",
    'contract semantic assertion',
)
p.write_text(s)
