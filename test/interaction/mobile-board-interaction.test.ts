import { describe, expect, it } from 'vitest';

import { resolveMobileInteractionStart } from '../../src/ui/default/interaction/mobile-board-interaction';

describe('mobile Board interaction ownership policy', () => {
  it('assigns a Task surface to task drag', () => {
    expect(
      resolveMobileInteractionStart({ overTask: true, overInteractiveControl: false }),
    ).toBe('dragging-task');
  });

  it('assigns Board background to pan', () => {
    expect(
      resolveMobileInteractionStart({ overTask: false, overInteractiveControl: false }),
    ).toBe('panning');
  });

  it('leaves buttons and form controls to their own touch action', () => {
    expect(
      resolveMobileInteractionStart({ overTask: true, overInteractiveControl: true }),
    ).toBe('none');
    expect(
      resolveMobileInteractionStart({ overTask: false, overInteractiveControl: true }),
    ).toBe('none');
  });
});
