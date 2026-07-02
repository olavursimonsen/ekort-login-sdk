/**
 * @ekort/login-sdk/react — thin React wrapper around the core SDK.
 *
 * Renders the "Rita inn við eKort" button (label stays Faroese by default)
 * without any context or providers.
 */

import { useCallback, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';

import {
  EKORT_BUTTON_BASE_STYLE,
  EKORT_BUTTON_ICON_SVG,
  EKORT_BUTTON_LABEL,
} from '../button';
import { startLogin } from '../login';
import { saveLoginState } from '../storage';
import type { EkortLoginConfig } from '../types';

export { SDK_VERSION } from '../index';
export { EKORT_BUTTON_LABEL };

export interface EkortLoginButtonProps {
  config: EkortLoginConfig;
  /** Button text. Defaults to the Faroese {@link EKORT_BUTTON_LABEL}. */
  label?: string;
  className?: string;
  /** Merged over the built-in styling; use it (or className) to restyle. */
  style?: CSSProperties;
  /** Called when starting the login fails; defaults to console.error. */
  onError?: (err: unknown) => void;
}

/**
 * Drop-in "Rita inn við eKort" button. On click it disables itself, runs
 * startLogin (desktop redirect or mobile app handoff), saves the OAuth
 * state + PKCE verifier to sessionStorage, and navigates to the result.
 */
export function EkortLoginButton({
  config,
  label = EKORT_BUTTON_LABEL,
  className,
  style,
  onError,
}: EkortLoginButtonProps): ReactElement {
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(async () => {
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
      if (onError) {
        onError(err);
      } else {
        console.error('[@ekort/login-sdk] Failed to start eKort login:', err);
      }
    }
  }, [busy, config, onError]);

  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      disabled={busy}
      onClick={handleClick}
      style={{
        ...EKORT_BUTTON_BASE_STYLE,
        ...(busy ? { opacity: 0.6, cursor: 'wait' } : null),
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{ display: 'inline-flex' }}
        dangerouslySetInnerHTML={{ __html: EKORT_BUTTON_ICON_SVG }}
      />
      {label}
    </button>
  );
}
