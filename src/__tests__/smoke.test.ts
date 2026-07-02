import { describe, expect, it } from 'vitest';

import { SDK_VERSION } from '../index';

describe('smoke', () => {
  it('exposes the SDK version', () => {
    expect(SDK_VERSION).toBe('0.1.0');
  });
});
