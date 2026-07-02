/**
 * Error types for @ekort/login-sdk.
 */

/**
 * Configuration or flow error raised by the SDK itself (before or outside of
 * an HTTP exchange), e.g. missing `authorizeUrl`/`supabaseUrl`.
 */
export class EkortLoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EkortLoginError';
  }
}

export interface EkortOAuthErrorOptions {
  status: number;
  /** OAuth `error` code from the response body, when present. */
  error?: string;
  /** OAuth `error_description` from the response body, when present. */
  errorDescription?: string;
  /** Raw (possibly truncated) response body for debugging. */
  body?: string;
}

/**
 * HTTP failure from the authorization server or the eKort bridge. Carries the
 * HTTP status plus the parsed OAuth `error` / `error_description` fields when
 * the response body contained them.
 */
export class EkortOAuthError extends Error {
  readonly status: number;
  readonly error?: string;
  readonly errorDescription?: string;
  readonly body?: string;

  constructor(message: string, options: EkortOAuthErrorOptions) {
    super(message);
    this.name = 'EkortOAuthError';
    this.status = options.status;
    this.error = options.error;
    this.errorDescription = options.errorDescription;
    this.body = options.body;
  }
}
