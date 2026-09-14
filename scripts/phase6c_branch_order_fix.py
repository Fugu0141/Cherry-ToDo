from pathlib import Path

p = Path('src/composition/cherry-ui-runtime.ts')
s = p.read_text()
old = """  async #connect(fromRaw: string, toRaw: string, kind: CherryFlowKind): Promise<UIActionResult> {
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
new = """  async #connect(fromRaw: string, toRaw: string, kind: CherryFlowKind): Promise<UIActionResult> {
    const from = parseTaskId(fromRaw);
    const to = parseTaskId(toRaw);
    if (!from.ok || !to.ok) return this.#error('validation', 'error.validation');
    return this.#runMutation((store, tabId) => {
      const tab = store.workspace.tabs[tabId];
      if (tab === undefined) {
        return { ok: false, error: { code: 'tab-not-found', tabId } } as const;
      }
      const branchOrders = Object.values(tab.flowEdges)
        .filter(
          (edge) => edge.kind === 'branch' && edge.fromTaskId === from.value,
        )
        .map((edge) => edge.order);
      const order = kind === 'branch' ? (branchOrders.length === 0 ? 0 : Math.max(...branchOrders) + 1) : 0;
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
if old not in s:
    raise SystemExit('connect target not found')
p.write_text(s.replace(old, new, 1))
