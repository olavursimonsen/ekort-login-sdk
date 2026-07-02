/**
 * Optional sessionStorage helpers for keeping the OAuth state and PKCE
 * verifier across the redirect. Key names match the canonical Next.js
 * reference cookies. In environments without sessionStorage (e.g. Node)
 * these are safe no-ops.
 */

export const STATE_STORAGE_KEY = 'ekort_oauth_state';
export const VERIFIER_STORAGE_KEY = 'ekort_oauth_verifier';

export interface LoginState {
  state: string;
  codeVerifier: string;
}

function getSessionStorage(): Storage | null {
  try {
    const storage = globalThis.sessionStorage;
    return storage ?? null;
  } catch {
    // Accessing sessionStorage can throw (e.g. sandboxed iframes).
    return null;
  }
}

export function saveLoginState(loginState: LoginState): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(STATE_STORAGE_KEY, loginState.state);
    storage.setItem(VERIFIER_STORAGE_KEY, loginState.codeVerifier);
  } catch {
    // Storage may be full or blocked; login can still proceed.
  }
}

export function loadLoginState(): LoginState | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    const state = storage.getItem(STATE_STORAGE_KEY);
    const codeVerifier = storage.getItem(VERIFIER_STORAGE_KEY);
    if (!state || !codeVerifier) return null;
    return { state, codeVerifier };
  } catch {
    return null;
  }
}

export function clearLoginState(): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(STATE_STORAGE_KEY);
    storage.removeItem(VERIFIER_STORAGE_KEY);
  } catch {
    // Ignore storage failures on cleanup.
  }
}
