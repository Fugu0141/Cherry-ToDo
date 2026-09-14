import { describe, expect, it } from 'vitest';

import { SnapshotHistory } from '../../src/modules/history/index';

describe('SnapshotHistory', () => {
  it('undoes and redoes exact snapshots', () => {
    const history = new SnapshotHistory<{ readonly value: number }>();
    const first = { value: 1 };
    const second = { value: 2 };

    history.record(first);
    expect(history.state).toEqual({ canUndo: true, canRedo: false, undoDepth: 1, redoDepth: 0 });
    expect(history.undo(second)).toBe(first);
    expect(history.state).toEqual({ canUndo: false, canRedo: true, undoDepth: 0, redoDepth: 1 });
    expect(history.redo(first)).toBe(second);
  });

  it('clears the redo branch when a new forward commit is recorded', () => {
    const history = new SnapshotHistory<number>();
    history.record(1);
    expect(history.undo(2)).toBe(1);
    expect(history.state.canRedo).toBe(true);

    history.record(1);
    expect(history.state.canRedo).toBe(false);
    expect(history.redo(3)).toBeUndefined();
  });
});
