import { createAuthorizationRequest } from './authorize';
import { isMobileUserAgent, startMobileAuthorization } from './mobile';
import { computeCodeChallenge } from './pkce';
import type { EkortLoginConfig } from './types';

export interface StartLoginOptions {
  /**
   * User agent to inspect for mobile detection. Defaults to
   * `navigator.userAgent` when available.
   */
  userAgent?: string;
}

export interface RedirectLoginStart {
  mode: 'redirect';
  /** Authorize URL to redirect the browser to. */
  url: string;
  state: string;
  codeVerifier: string;
}

export interface MobileLoginStart {
  mode: 'mobile';
  /** Universal link (preferred) or deep link to open the eKort app. */
  link: string;
  authorizationId: string;
  state: string;
  codeVerifier: string;
}

export type LoginStart = RedirectLoginStart | MobileLoginStart;

/**
 * High-level "Rita inn við eKort" entry point mirroring the canonical
 * Next.js /oauth/start route: on desktop it returns a redirect to the
 * authorize URL; on a mobile user agent it first tries the bridge mobile
 * handoff and falls back to the standard redirect if that fails.
 */
export async function startLogin(
  config: EkortLoginConfig,
  opts?: StartLoginOptions
): Promise<LoginStart> {
  const request = await createAuthorizationRequest(config);
  const redirectStart: RedirectLoginStart = {
    mode: 'redirect',
    url: request.url,
    state: request.state,
    codeVerifier: request.codeVerifier,
  };

  if (!isMobileUserAgent(opts?.userAgent)) {
    return redirectStart;
  }

  try {
    const codeChallenge = await computeCodeChallenge(request.codeVerifier);
    const mobile = await startMobileAuthorization(config, {
      state: request.state,
      codeChallenge,
    });
    return {
      mode: 'mobile',
      link: mobile.link,
      authorizationId: mobile.authorizationId,
      state: request.state,
      codeVerifier: request.codeVerifier,
    };
  } catch {
    // Mirror the reference behavior: fall back to the standard redirect.
    return redirectStart;
  }
}
