/**
 * Public types for @ekort/login-sdk, matching the eKort OAuth/OIDC contract
 * (Supabase GoTrue behind the bridge at https://ekort.fo).
 */

export interface EkortLoginConfig {
  /** OAuth client id registered with the eKort authorization server. */
  clientId: string;
  /** Redirect URI registered for the client. */
  redirectUri: string;
  /** OAuth scope. Defaults to "openid email profile". */
  scope?: string;
  /** Base URL of the eKort bridge. Defaults to "https://ekort.fo". */
  bridgeBaseUrl?: string;
  /**
   * Full authorize endpoint URL. Defaults to
   * `${supabaseUrl}/auth/v1/oauth/authorize` when `supabaseUrl` is given;
   * otherwise it must be provided explicitly.
   */
  authorizeUrl?: string;
  /**
   * Full token endpoint URL. Defaults to
   * `${supabaseUrl}/auth/v1/oauth/token` when `supabaseUrl` is given;
   * otherwise it must be provided explicitly.
   */
  tokenUrl?: string;
  /** Supabase project URL used to derive `authorizeUrl` / `tokenUrl`. */
  supabaseUrl?: string;
}

/** Successful response from the token endpoint (contract §2). */
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type: string;
}

/** Response from POST {bridgeBaseUrl}/oauth/mobile/start (contract §3). */
export interface MobileStartResponse {
  authorization_id: string;
  /** e.g. "ekort://oauth/mobile?authorization_id=..." */
  deep_link: string;
  universal_link?: string | null;
}

export interface SessionProfileAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
}

/**
 * Response from GET {bridgeBaseUrl}/oidc/session-profile (contract §4).
 * `email` / `real_email` are the display email — never a synthetic
 * `@samleikin.ekort` address — or null.
 */
export interface SessionProfile {
  sub: string;
  id: string;
  email: string | null;
  real_email: string | null;
  name: string | null;
  given_name: string | null;
  family_name: string | null;
  phone: string | null;
  address: SessionProfileAddress | null;
}
