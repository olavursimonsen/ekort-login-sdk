import { afterEach, describe, expect, it, vi } from 'vitest';

import { EkortOAuthError } from '../errors';
import { startLogin } from '../login';
import { isMobileUserAgent, startMobileAuthorization } from '../mobile';
import type { EkortLoginConfig } from '../types';

const config: EkortLoginConfig = {
  clientId: 'client-123',
  redirectUri: 'https://app.example/callback',
  supabaseUrl: 'https://project.supabase.co',
};

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isMobileUserAgent', () => {
  it('matches iPhone, iPad, iPod and Android', () => {
    expect(isMobileUserAgent(IPHONE_UA)).toBe(true);
    expect(isMobileUserAgent('Mozilla/5.0 (iPad; CPU OS 16_0)')).toBe(true);
    expect(isMobileUserAgent('something iPod something')).toBe(true);
    expect(isMobileUserAgent('Mozilla/5.0 (Linux; Android 14)')).toBe(true);
    expect(isMobileUserAgent(DESKTOP_UA)).toBe(false);
    expect(isMobileUserAgent('')).toBe(false);
  });
});

describe('startMobileAuthorization', () => {
  it('POSTs the contract body to the bridge and prefers universal_link', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          authorization_id: 'auth-1',
          deep_link: 'ekort://oauth/mobile?authorization_id=auth-1',
          universal_link: 'https://ekort.fo/oauth/mobile?authorization_id=auth-1',
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await startMobileAuthorization(config, {
      state: 'state-1',
      codeChallenge: 'challenge-1',
    });

    expect(result.authorizationId).toBe('auth-1');
    expect(result.deepLink).toBe('ekort://oauth/mobile?authorization_id=auth-1');
    expect(result.universalLink).toBe(
      'https://ekort.fo/oauth/mobile?authorization_id=auth-1'
    );
    expect(result.link).toBe(result.universalLink);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://ekort.fo/oauth/mobile/start');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({
      client_id: 'client-123',
      redirect_uri: 'https://app.example/callback',
      scope: 'openid email profile',
      state: 'state-1',
      code_challenge: 'challenge-1',
      code_challenge_method: 'S256',
    });
  });

  it('falls back to deep_link when universal_link is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            authorization_id: 'auth-2',
            deep_link: 'ekort://oauth/mobile?authorization_id=auth-2',
          }),
          { status: 200 }
        )
      )
    );

    const result = await startMobileAuthorization(config, {
      state: 's',
      codeChallenge: 'c',
    });
    expect(result.universalLink).toBeNull();
    expect(result.link).toBe('ekort://oauth/mobile?authorization_id=auth-2');
  });

  it('throws EkortOAuthError on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'server_error' }), { status: 500 })
      )
    );

    await expect(
      startMobileAuthorization(config, { state: 's', codeChallenge: 'c' })
    ).rejects.toBeInstanceOf(EkortOAuthError);
  });

  it('respects a custom bridgeBaseUrl', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ authorization_id: 'a', deep_link: 'ekort://x' }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await startMobileAuthorization(
      { ...config, bridgeBaseUrl: 'https://staging.ekort.fo/' },
      { state: 's', codeChallenge: 'c' }
    );
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://staging.ekort.fo/oauth/mobile/start'
    );
  });
});

describe('startLogin', () => {
  it('returns a redirect start on desktop without calling the bridge', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const start = await startLogin(config, { userAgent: DESKTOP_UA });
    expect(start.mode).toBe('redirect');
    if (start.mode === 'redirect') {
      expect(start.url).toContain('/auth/v1/oauth/authorize');
      expect(start.state).toBeTruthy();
      expect(start.codeVerifier).toBeTruthy();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a mobile start on a mobile user agent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            authorization_id: 'auth-3',
            deep_link: 'ekort://oauth/mobile?authorization_id=auth-3',
            universal_link:
              'https://ekort.fo/oauth/mobile?authorization_id=auth-3',
          }),
          { status: 200 }
        )
      )
    );

    const start = await startLogin(config, { userAgent: IPHONE_UA });
    expect(start.mode).toBe('mobile');
    if (start.mode === 'mobile') {
      expect(start.link).toBe(
        'https://ekort.fo/oauth/mobile?authorization_id=auth-3'
      );
      expect(start.authorizationId).toBe('auth-3');
      expect(start.state).toBeTruthy();
      expect(start.codeVerifier).toBeTruthy();
    }
  });

  it('falls back to redirect when the mobile handoff fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('network down'))
    );

    const start = await startLogin(config, { userAgent: IPHONE_UA });
    expect(start.mode).toBe('redirect');
    if (start.mode === 'redirect') {
      expect(start.url).toContain('/auth/v1/oauth/authorize');
    }
  });
});
