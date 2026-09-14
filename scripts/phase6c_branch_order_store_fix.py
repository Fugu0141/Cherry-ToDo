from pathlib import Path

runtime = Path('src/composition/cherry-ui-runtime.ts')
s = runtime.read_text()
old = """  async #connect(fromRaw: string, toRaw: string, kind: CherryFlowKind): Promise<UIActionResult> {
    const from = parseTaskId(fromRaw);
    const to = parseTaskId(toRaw);
    if (!from.ok || !to.ok) return this.#error('validation', 'error.validation');
    return this.#runMutation((store, tabId) => {
      const tab = store.workspace.tabs[tabId];
      if (tab === undefined) {
        return { ok: false, error: { code: 'tab-not-found', tabId } } as const;
      }
      const branchOrders = Object.values(tab.flowEdges)
        .filter((edge) => edge.kind === 'branch' && edge.fromTaskId === from.value)
        .map((edge) => edge.order);
      const order =
        kind === 'branch' ? (branchOrders.length === 0 ? 0 : Math.max(...branchOrders) + 1) : 0;
      return store.connectFlow({
        tabId,
        edgeId: unwrapId(parseFlowEdgeId(randomId('edge'))),
        kind,
        fromTaskId: from.value,
        toTaskId: to.value,
        ...(kind === 'reference' ? {} : { order }),
      });
    });
  }"""
new = """  async #connect(fromRaw: string, toRaw: string, kind: CherryFlowKind): Promise<UIActionResult> {
    const from = parseTaskId(fromRaw);
    const to = parseTaskId(toRaw);
    if (!from.ok || !to.ok) return this.#error('validation', 'error.validation');
    return this.#runMutation((store, tabId) =>
      store.connectFlow({
        tabId,
        edgeId: unwrapId(parseFlowEdgeId(randomId('edge'))),
        kind,
        fromTaskId: from.value,
        toTaskId: to.value,
      }),
    );
  }"""
if old not in s:
    raise SystemExit('runtime connect target not found')
runtime.write_text(s.replace(old, new, 1))

store = Path('src/modules/workspace/application/application-store.ts')
s = store.read_text()
old = """    const now = this.#now();
    const meta: RevisionMeta = { createdAt: now, updatedAt: now, revision: 0 };
    const edge: FlowEdge ="""
new = """    const now = this.#now();
    const meta: RevisionMeta = { createdAt: now, updatedAt: now, revision: 0 };
    const existingBranchOrders = Object.values(tab.flowEdges)
      .filter(
        (edge): edge is StructuralFlowEdge =>
          edge.kind === 'branch' && edge.fromTaskId === input.fromTaskId,
      )
      .map((edge) => edge.order);
    const structuralOrder =
      input.order ??
      (input.kind === 'branch' && existingBranchOrders.length > 0
        ? Math.max(...existingBranchOrders) + 1
        : 0);
    const edge: FlowEdge ="""
if old not in s:
    raise SystemExit('store connect prelude target not found')
s = s.replace(old, new, 1)
old = """            order: input.order ?? 0,
            meta,"""
new = """            order: structuralOrder,
            meta,"""
if old not in s:
    raise SystemExit('store order target not found')
store.write_text(s.replace(old, new, 1))
