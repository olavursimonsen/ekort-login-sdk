/**
 * PKCE (RFC 7636) helpers built on the Web Crypto API. Works in browsers and
 * Node 22 via `globalThis.crypto`.
 */

import { EkortLoginError } from './errors';

function getCrypto(): Crypto {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new EkortLoginError(
      'Web Crypto API is not available in this environment.'
    );
  }
  return cryptoApi;
}

/** Encodes bytes as base64url without padding. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  // btoa exists in browsers and Node >= 16.
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/** Generates cryptographically random bytes encoded as base64url. */
export function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  getCrypto().getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/**
 * Generates a PKCE code verifier: 43 base64url characters from 32 random
 * bytes, matching the canonical Next.js reference implementation.
 */
export function generateCodeVerifier(): string {
  return randomBase64Url(32);
}

/** Computes the S256 code challenge (base64url SHA-256) for a verifier. */
export async function computeCodeChallenge(verifier: string): Promise<string> {
  const cryptoApi = getCrypto();
  if (!cryptoApi.subtle) {
    throw new EkortLoginError(
      'Web Crypto SubtleCrypto is not available in this environment.'
    );
  }
  const data = new TextEncoder().encode(verifier);
  const digest = await cryptoApi.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}
