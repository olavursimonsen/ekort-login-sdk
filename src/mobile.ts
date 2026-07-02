import { resolveConfig } from './config';
import { EkortOAuthError } from './errors';
import { readBody, toOAuthError } from './http';
import type { EkortLoginConfig, MobileStartResponse } from './types';

/**
 * Detects mobile user agents with the same regex as the canonical Next.js
 * reference. When `ua` is omitted, `navigator.userAgent` is used if available.
 */
export function isMobileUserAgent(ua?: string): boolean {
  const userAgent =
    ua ??
    (typeof navigator !== 'undefined' ? navigator.userAgent : '') ??
    '';
  return /iphone|ipad|ipod|android/i.test(userAgent);
}

export interface MobileAuthorizationParams {
  state: string;
  codeChallenge: string;
}

export interface MobileAuthorization {
  authorizationId: string;
  deepLink: string;
  universalLink: string | null;
  /** Preferred link to open: universal_link when set, otherwise deep_link. */
  link: string;
}

/**
 * Starts the mobile handoff via POST {bridgeBaseUrl}/oauth/mobile/start
 * (contract §3). Throws EkortOAuthError on non-2xx responses or when the
 * bridge returns no usable link.
 */
export async function startMobileAuthorization(
  config: EkortLoginConfig,
  params: MobileAuthorizationParams
): Promise<MobileAuthorization> {
  const resolved = resolveConfig(config);
  const startUrl = `${resolved.bridgeBaseUrl}/oauth/mobile/start`;

  const response = await fetch(startUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: resolved.clientId,
      redirect_uri: resolved.redirectUri,
      scope: resolved.scope,
      state: params.state,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
    }),
  });

  const body = await readBody(response);
  if (!response.ok) {
    throw toOAuthError('Mobile authorization start', response, body);
  }

  const payload = (body.json ?? {}) as Partial<MobileStartResponse>;
  const universalLink =
    typeof payload.universal_link === 'string' && payload.universal_link
      ? payload.universal_link
      : null;
  const deepLink = typeof payload.deep_link === 'string' ? payload.deep_link : '';
  const link = universalLink || deepLink;

  if (!payload.authorization_id || !link) {
    throw new EkortOAuthError(
      'Mobile authorization start returned an incomplete response.',
      { status: response.status, body: body.raw.slice(0, 1000) }
    );
  }

  return {
    authorizationId: payload.authorization_id,
    deepLink,
    universalLink,
    link,
  };
}
