import { describe, expect, it } from 'vitest';

import { buildBoardFlowConnectorGeometry } from '../../src/modules/board/index';

describe('Board Flow connector geometry', () => {
  it('anchors a forward connector at the right and left card edges', () => {
    const geometry = buildBoardFlowConnectorGeometry({ x: 28, y: 80 }, { x: 360, y: 220 });

    expect(geometry.start).toEqual({ x: 268, y: 143 });
    expect(geometry.end).toEqual({ x: 360, y: 283 });
    expect(geometry.path).toBe('M 268 143 C 316 143, 312 283, 360 283');
  });

  it('produces a valid reverse curve for manual layouts', () => {
    const geometry = buildBoardFlowConnectorGeometry({ x: 500, y: 40 }, { x: 100, y: 40 });

    expect(geometry.start).toEqual({ x: 740, y: 103 });
    expect(geometry.end).toEqual({ x: 100, y: 103 });
    expect(geometry.path).toContain('C 452 103, 388 103, 100 103');
  });
});
