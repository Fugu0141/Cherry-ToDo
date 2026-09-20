import { describe, expect, it } from 'vitest';

import { buildBoardFlowConnectorGeometry } from '../../src/modules/board/index';

describe('Board Flow connector geometry', () => {
  it('anchors a forward connector at the right and left card edges', () => {
    const geometry = buildBoardFlowConnectorGeometry({ x: 28, y: 80 }, { x: 360, y: 220 });

    expect(geometry.start).toEqual({ x: 268, y: 143 });
    expect(geometry.end).toEqual({ x: 360, y: 283 });
    expect(geometry.path).toBe('M 268 143 C 316 143, 312 283, 360 283');
  });

  it('anchors a mobile connector at the bottom and top card edges', () => {
    const geometry = buildBoardFlowConnectorGeometry(
      { x: 28, y: 80 },
      { x: 300, y: 360 },
      210,
      112,
      'vertical',
    );

    expect(geometry.start).toEqual({ x: 133, y: 192 });
    expect(geometry.end).toEqual({ x: 405, y: 360 });
    expect(geometry.path).toBe('M 133 192 C 133 267.6, 405 284.4, 405 360');
  });

  it('produces a valid reverse curve for manual layouts', () => {
    const geometry = buildBoardFlowConnectorGeometry({ x: 500, y: 40 }, { x: 100, y: 40 });

    expect(geometry.start).toEqual({ x: 740, y: 103 });
    expect(geometry.end).toEqual({ x: 100, y: 103 });
    expect(geometry.path).toContain('C 452 103, 388 103, 100 103');
  });

  it('routes around unrelated Task cards instead of drawing through them', () => {
    const geometry = buildBoardFlowConnectorGeometry(
      { x: 28, y: 80 },
      { x: 700, y: 80 },
      240,
      126,
      'horizontal',
      {
        obstacles: [{ x: 350, y: 50, width: 240, height: 126 }],
      },
    );

    expect(geometry.start).toEqual({ x: 268, y: 143 });
    expect(geometry.end).toEqual({ x: 700, y: 143 });
    expect(geometry.path).toContain('Q');
    expect(geometry.path).not.toContain(' C ');
    expect(geometry.path).not.toBe('M 268 143 L 700 143');
  });
});
