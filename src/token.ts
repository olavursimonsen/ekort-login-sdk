import { resolveConfig } from './config';
import { readBody, toOAuthError } from './http';
import type { EkortLoginConfig, TokenResponse } from './types';

export interface TokenExchangeParams {
  /** Authorization code returned to the redirect URI. */
  code: string;
  /** PKCE code verifier generated for the authorization request. */
  codeVerifier: string;
  /** Optional confidential-client secret; sent only in the request body. */
  clientSecret?: string;
}

/**
 * Exchanges an authorization code for tokens (contract §2): POST {tokenUrl}
 * as application/x-www-form-urlencoded. Throws EkortOAuthError on failure,
 * carrying the HTTP status and the OAuth error/error_description.
 */
export async function exchangeCodeForTokens(
  config: EkortLoginConfig,
  params: TokenExchangeParams
): Promise<TokenResponse> {
  const resolved = resolveConfig(config);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: resolved.redirectUri,
    client_id: resolved.clientId,
    code_verifier: params.codeVerifier,
  });
  if (params.clientSecret) {
    body.set('client_secret', params.clientSecret);
  }

  const response = await fetch(resolved.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const parsed = await readBody(response);
  if (!response.ok) {
    throw toOAuthError('Token exchange', response, parsed);
  }

  return (parsed.json ?? {}) as unknown as TokenResponse;
}
