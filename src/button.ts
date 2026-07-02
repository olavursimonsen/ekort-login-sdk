/**
 * Framework-agnostic drop-in "Rita inn við eKort" button.
 *
 * The user-visible label MUST default to the Faroese product string
 * {@link EKORT_BUTTON_LABEL}; everything else in this SDK is English.
 */

import { EkortLoginError } from './errors';
import { startLogin } from './login';
import { saveLoginState } from './storage';
import type { EkortLoginConfig } from './types';

/** Exact Faroese label shown on the button (product name, do not translate). */
export const EKORT_BUTTON_LABEL = 'Rita inn við eKort';

/**
 * Tiny hand-written card mark rendered next to the label. Kept as an inline
 * SVG string so the SDK ships no binary assets.
 */
export const EKORT_BUTTON_ICON_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">' +
  '<rect x="1.5" y="4.5" width="21" height="15" rx="3" fill="#ffffff"/>' +
  '<rect x="1.5" y="8.5" width="21" height="3" fill="#c8102e"/>' +
  '</svg>';

/**
 * Self-contained default styling (dark background, white text, rounded
 * corners). Property names are valid for both CSSStyleDeclaration and
 * React.CSSProperties so the React wrapper can reuse it.
 */
export const EKORT_BUTTON_BASE_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  padding: '10px 20px',
  border: '0',
  borderRadius: '8px',
  backgroundColor: '#0f172a',
  color: '#ffffff',
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '1.2',
  cursor: 'pointer',
  textDecoration: 'none',
} as const;

export interface RenderEkortLoginButtonOptions {
  /** Button text. Defaults to the Faroese {@link EKORT_BUTTON_LABEL}. */
  label?: string;
  /**
   * Called when starting the login fails. When omitted, the error is logged
   * with console.error (rethrowing inside a click handler would be lost).
   */
  onError?: (err: unknown) => void;
}

/**
 * Renders a ready-made "Rita inn við eKort" button into `container`.
 *
 * On click the button disables itself, runs {@link startLogin} (desktop
 * redirect or mobile app handoff), persists the OAuth state and PKCE
 * verifier via {@link saveLoginState}, and navigates to the resulting URL.
 *
 * @returns a cleanup function that removes the button and its listener.
 * @throws EkortLoginError when called without a DOM (e.g. during SSR).
 */
export function renderEkortLoginButton(
  container: HTMLElement,
  config: EkortLoginConfig,
  options?: RenderEkortLoginButtonOptions
): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new EkortLoginError(
      'renderEkortLoginButton requires a browser DOM. Call it client-side only ' +
        '(e.g. after mount), not during server-side rendering.'
    );
  }

  const label = options?.label ?? EKORT_BUTTON_LABEL;

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', label);
  Object.assign(button.style, EKORT_BUTTON_BASE_STYLE);

  const icon = document.createElement('span');
  icon.style.display = 'inline-flex';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = EKORT_BUTTON_ICON_SVG;
  button.appendChild(icon);
  button.appendChild(document.createTextNode(label));

  let busy = false;

  const setBusy = (value: boolean): void => {
    busy = value;
    button.disabled = value;
    button.style.opacity = value ? '0.6' : '';
    button.style.cursor = value ? 'wait' : EKORT_BUTTON_BASE_STYLE.cursor;
  };

  const handleClick = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await startLogin(config, {
        userAgent: navigator.userAgent,
      });
      saveLoginState({
        state: result.state,
        codeVerifier: result.codeVerifier,
      });
      window.location.assign(result.mode === 'redirect' ? result.url : result.link);
    } catch (err) {
      setBusy(false);
      if (options?.onError) {
        options.onError(err);
      } else {
        console.error('[@ekort/login-sdk] Failed to start eKort login:', err);
      }
    }
  };

  button.addEventListener('click', handleClick);
  container.appendChild(button);

  return () => {
    button.removeEventListener('click', handleClick);
    button.remove();
  };
}
