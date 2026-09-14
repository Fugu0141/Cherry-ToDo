from pathlib import Path

p = Path('src/composition/cherry-ui-runtime.ts')
s = p.read_text()

old = """import {
  createEmptyBoardDocumentState,
  layoutBoard,
  resolveDropIntent,
} from '../modules/board/index';"""
new = """import {
  buildBoardFlowConnectorGeometry,
  createEmptyBoardDocumentState,
  layoutBoard,
  resolveDropIntent,
} from '../modules/board/index';"""
if old not in s:
    raise SystemExit('Board import target not found')
s = s.replace(old, new, 1)

old = """    const structuralEdges = Object.values(tab.flowEdges).filter(
      (edge) => edge.kind !== 'reference',
    );
    const layout = layoutBoard("""
new = """    const structuralEdges = Object.values(tab.flowEdges).filter(
      (edge) => edge.kind !== 'reference',
    );
    const incomingStructuralCounts = new Map<string, number>();
    for (const edge of structuralEdges) {
      incomingStructuralCounts.set(
        edge.toTaskId,
        (incomingStructuralCounts.get(edge.toTaskId) ?? 0) + 1,
      );
    }
    const layout = layoutBoard("""
if old not in s:
    raise SystemExit('structural edge target not found')
s = s.replace(old, new, 1)

old = """          isDerivedGoal: state?.isDerivedBranchingGoal ?? false,
          canManuallyComplete: manual?.kind === 'available',"""
new = """          isDerivedGoal: state?.isDerivedBranchingGoal ?? false,
          isMergeTarget: (incomingStructuralCounts.get(task.id) ?? 0) >= 2,
          canManuallyComplete: manual?.kind === 'available',"""
if old not in s:
    raise SystemExit('task model target not found')
s = s.replace(old, new, 1)

old = """      connections: Object.values(tab.flowEdges).map((edge) => ({
        id: edge.id,
        kind: edge.kind,
        fromTaskId: edge.fromTaskId,
        toTaskId: edge.toTaskId,
      })),"""
new = """      connections: Object.values(tab.flowEdges).map((edge) => {
        const from = layout.tasks[edge.fromTaskId]?.point;
        const to = layout.tasks[edge.toTaskId]?.point;
        return {
          id: edge.id,
          kind: edge.kind,
          fromTaskId: edge.fromTaskId,
          toTaskId: edge.toTaskId,
          path:
            from === undefined || to === undefined
              ? null
              : buildBoardFlowConnectorGeometry(from, to).path,
        };
      }),"""
if old not in s:
    raise SystemExit('connection model target not found')
s = s.replace(old, new, 1)

p.write_text(s)
