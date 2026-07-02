import { EkortLoginError } from './errors';
import type { EkortLoginConfig } from './types';

export const DEFAULT_SCOPE = 'openid email profile';
export const DEFAULT_BRIDGE_BASE_URL = 'https://ekort.fo';

export interface ResolvedEkortLoginConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  bridgeBaseUrl: string;
  authorizeUrl: string;
  tokenUrl: string;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Validates the config and applies defaults. `authorizeUrl` / `tokenUrl`
 * default to the Supabase GoTrue endpoints when `supabaseUrl` is given;
 * otherwise they must be provided explicitly.
 */
export function resolveConfig(config: EkortLoginConfig): ResolvedEkortLoginConfig {
  if (!config.clientId) {
    throw new EkortLoginError('EkortLoginConfig.clientId is required.');
  }
  if (!config.redirectUri) {
    throw new EkortLoginError('EkortLoginConfig.redirectUri is required.');
  }

  const supabaseBase = config.supabaseUrl
    ? trimTrailingSlash(config.supabaseUrl)
    : undefined;

  const authorizeUrl =
    config.authorizeUrl ??
    (supabaseBase ? `${supabaseBase}/auth/v1/oauth/authorize` : undefined);
  if (!authorizeUrl) {
    throw new EkortLoginError(
      'Missing authorize endpoint: provide EkortLoginConfig.authorizeUrl or supabaseUrl.'
    );
  }

  const tokenUrl =
    config.tokenUrl ??
    (supabaseBase ? `${supabaseBase}/auth/v1/oauth/token` : undefined);
  if (!tokenUrl) {
    throw new EkortLoginError(
      'Missing token endpoint: provide EkortLoginConfig.tokenUrl or supabaseUrl.'
    );
  }

  return {
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    scope: config.scope ?? DEFAULT_SCOPE,
    bridgeBaseUrl: trimTrailingSlash(config.bridgeBaseUrl ?? DEFAULT_BRIDGE_BASE_URL),
    authorizeUrl,
    tokenUrl,
  };
}
