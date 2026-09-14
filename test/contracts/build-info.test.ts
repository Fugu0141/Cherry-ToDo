import { describe, expect, it } from 'vitest';

import { buildInfo } from '../../src/shared/build-info/index';

describe('Phase 1 build information', () => {
  it('exposes the V2 foundation identity from a real source module', () => {
    expect(buildInfo).toEqual({
      appName: 'Cherry V2.0',
      phase: 1,
    });
  });
});
