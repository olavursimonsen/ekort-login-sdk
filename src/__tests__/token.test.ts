import { afterEach, describe, expect, it, vi } from 'vitest';

import { EkortOAuthError } from '../errors';
import { exchangeCodeForTokens } from '../token';
import type { EkortLoginConfig } from '../types';

const config: EkortLoginConfig = {
  clientId: 'client-123',
  redirectUri: 'https://app.example/callback',
  supabaseUrl: 'https://project.supabase.co',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('exchangeCodeForTokens', () => {
  it('POSTs form-encoded params and returns the token payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'at-1',
          refresh_token: 'rt-1',
          id_token: 'idt-1',
          expires_in: 3600,
          token_type: 'bearer',
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const tokens = await exchangeCodeForTokens(config, {
      code: 'auth-code',
      codeVerifier: 'verifier-abc',
    });

    expect(tokens.access_token).toBe('at-1');
    expect(tokens.refresh_token).toBe('rt-1');
    expect(tokens.token_type).toBe('bearer');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://project.supabase.co/auth/v1/oauth/token');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded'
    );
    const body = new URLSearchParams(init.body as string);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('auth-code');
    expect(body.get('redirect_uri')).toBe('https://app.example/callback');
    expect(body.get('client_id')).toBe('client-123');
    expect(body.get('code_verifier')).toBe('verifier-abc');
    expect(body.has('client_secret')).toBe(false);
  });

  it('includes client_secret when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: 'at', token_type: 'bearer' }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await exchangeCodeForTokens(config, {
      code: 'c',
      codeVerifier: 'v',
      clientSecret: 'shh',
    });

    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
    expect(body.get('client_secret')).toBe('shh');
  });

  it('throws EkortOAuthError with status and error details on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: 'invalid_grant',
              error_description: 'Code expired',
            }),
            { status: 400 }
          )
        )
      )
    );

    try {
      await exchangeCodeForTokens(config, { code: 'stale', codeVerifier: 'v' });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(EkortOAuthError);
      const oauthError = err as EkortOAuthError;
      expect(oauthError.status).toBe(400);
      expect(oauthError.error).toBe('invalid_grant');
      expect(oauthError.errorDescription).toBe('Code expired');
      expect(oauthError.message).toContain('400');
      expect(oauthError.message).toContain('Code expired');
    }
  });
});
