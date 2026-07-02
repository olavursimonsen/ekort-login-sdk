import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  STATE_STORAGE_KEY,
  VERIFIER_STORAGE_KEY,
  clearLoginState,
  loadLoginState,
  saveLoginState,
} from '../storage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('storage', () => {
  it('is a safe no-op without sessionStorage (Node)', () => {
    expect(typeof globalThis.sessionStorage).toBe('undefined');
    expect(() =>
      saveLoginState({ state: 's', codeVerifier: 'v' })
    ).not.toThrow();
    expect(loadLoginState()).toBeNull();
    expect(() => clearLoginState()).not.toThrow();
  });

  it('saves, loads and clears via sessionStorage when available', () => {
    const store = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    vi.stubGlobal('sessionStorage', fakeStorage);

    saveLoginState({ state: 'state-1', codeVerifier: 'verifier-1' });
    expect(store.get(STATE_STORAGE_KEY)).toBe('state-1');
    expect(store.get(VERIFIER_STORAGE_KEY)).toBe('verifier-1');

    expect(loadLoginState()).toEqual({
      state: 'state-1',
      codeVerifier: 'verifier-1',
    });

    clearLoginState();
    expect(store.size).toBe(0);
    expect(loadLoginState()).toBeNull();
  });

  it('returns null when only one of the two keys is present', () => {
    const store = new Map<string, string>([[STATE_STORAGE_KEY, 'orphan']]);
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });

    expect(loadLoginState()).toBeNull();
  });
});
