import { resolveConfig } from './config';
import { computeCodeChallenge, generateCodeVerifier, randomBase64Url } from './pkce';
import type { EkortLoginConfig } from './types';

export interface AuthorizationRequest {
  /** Full authorize URL to redirect the user to (contract §1). */
  url: string;
  /** Random state to verify on the callback. */
  state: string;
  /** PKCE code verifier to send with the token exchange. */
  codeVerifier: string;
}

/**
 * Builds the authorization request: generates a 16-byte base64url state and a
 * PKCE verifier/challenge pair, and assembles the Supabase GoTrue authorize
 * URL with client_id, redirect_uri, response_type=code, scope,
 * code_challenge (S256) and state.
 */
export async function createAuthorizationRequest(
  config: EkortLoginConfig
): Promise<AuthorizationRequest> {
  const resolved = resolveConfig(config);

  const state = randomBase64Url(16);
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await computeCodeChallenge(codeVerifier);

  const url = new URL(resolved.authorizeUrl);
  url.searchParams.set('client_id', resolved.clientId);
  url.searchParams.set('redirect_uri', resolved.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', resolved.scope);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);

  return { url: url.toString(), state, codeVerifier };
}
