import { resolveConfig } from './config';
import { readBody, toOAuthError } from './http';
import type { EkortLoginConfig, SessionProfile } from './types';

/**
 * Fetches the session profile from GET {bridgeBaseUrl}/oidc/session-profile
 * (contract §4). The bridge guarantees `email` / `real_email` are display
 * emails (never synthetic @samleikin.ekort addresses) or null. Throws
 * EkortOAuthError on 401 (missing_token/invalid_token) and other failures.
 */
export async function fetchSessionProfile(
  config: EkortLoginConfig,
  accessToken: string
): Promise<SessionProfile> {
  const resolved = resolveConfig(config);

  const response = await fetch(`${resolved.bridgeBaseUrl}/oidc/session-profile`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const parsed = await readBody(response);
  if (!response.ok) {
    throw toOAuthError('Session profile fetch', response, parsed);
  }

  return (parsed.json ?? {}) as unknown as SessionProfile;
}
