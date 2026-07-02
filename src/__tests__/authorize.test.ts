import { describe, expect, it } from 'vitest';

import { createAuthorizationRequest } from '../authorize';
import { EkortLoginError } from '../errors';
import { computeCodeChallenge } from '../pkce';
import type { EkortLoginConfig } from '../types';

const baseConfig: EkortLoginConfig = {
  clientId: 'client-123',
  redirectUri: 'https://app.example/callback',
  supabaseUrl: 'https://project.supabase.co',
};

describe('createAuthorizationRequest', () => {
  it('builds the authorize URL with all contract params', async () => {
    const request = await createAuthorizationRequest(baseConfig);
    const url = new URL(request.url);

    expect(url.origin + url.pathname).toBe(
      'https://project.supabase.co/auth/v1/oauth/authorize'
    );
    expect(url.searchParams.get('client_id')).toBe('client-123');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://app.example/callback'
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe(request.state);

    const expectedChallenge = await computeCodeChallenge(request.codeVerifier);
    expect(url.searchParams.get('code_challenge')).toBe(expectedChallenge);
  });

  it('generates a 16-byte base64url state', async () => {
    const request = await createAuthorizationRequest(baseConfig);
    expect(request.state).toMatch(/^[A-Za-z0-9\-_]{22}$/);
  });

  it('respects an explicit authorizeUrl and custom scope', async () => {
    const request = await createAuthorizationRequest({
      ...baseConfig,
      supabaseUrl: undefined,
      authorizeUrl: 'https://auth.example/oauth/authorize',
      tokenUrl: 'https://auth.example/oauth/token',
      scope: 'openid',
    });
    const url = new URL(request.url);
    expect(url.origin + url.pathname).toBe('https://auth.example/oauth/authorize');
    expect(url.searchParams.get('scope')).toBe('openid');
  });

  it('throws a config error when neither authorizeUrl nor supabaseUrl is set', async () => {
    await expect(
      createAuthorizationRequest({
        clientId: 'client-123',
        redirectUri: 'https://app.example/callback',
      })
    ).rejects.toThrow(EkortLoginError);
  });

  it('throws a config error when tokenUrl cannot be derived', async () => {
    await expect(
      createAuthorizationRequest({
        clientId: 'client-123',
        redirectUri: 'https://app.example/callback',
        authorizeUrl: 'https://auth.example/oauth/authorize',
      })
    ).rejects.toThrow(/token endpoint/i);
  });

  it('throws a config error when clientId or redirectUri is missing', async () => {
    await expect(
      createAuthorizationRequest({ ...baseConfig, clientId: '' })
    ).rejects.toThrow(/clientId/);
    await expect(
      createAuthorizationRequest({ ...baseConfig, redirectUri: '' })
    ).rejects.toThrow(/redirectUri/);
  });
});
