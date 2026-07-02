import { afterEach, describe, expect, it, vi } from 'vitest';

import { EkortOAuthError } from '../errors';
import { fetchSessionProfile } from '../profile';
import type { EkortLoginConfig, SessionProfile } from '../types';

const config: EkortLoginConfig = {
  clientId: 'client-123',
  redirectUri: 'https://app.example/callback',
  supabaseUrl: 'https://project.supabase.co',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchSessionProfile', () => {
  it('GETs the bridge profile endpoint with a bearer token', async () => {
    const profile: SessionProfile = {
      sub: 'user-1',
      id: 'user-1',
      email: 'user@example.fo',
      real_email: 'user@example.fo',
      name: 'Jógvan Jógvansson',
      given_name: 'Jógvan',
      family_name: 'Jógvansson',
      phone: '+298123456',
      address: {
        line1: 'Gøta 1',
        line2: null,
        city: 'Tórshavn',
        state: null,
        postal_code: '100',
        country: 'FO',
        phone: null,
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(profile), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchSessionProfile(config, 'access-token-1');
    expect(result).toEqual(profile);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://ekort.fo/oidc/session-profile');
    expect(init.headers.Authorization).toBe('Bearer access-token-1');
  });

  it('maps a 401 to EkortOAuthError with the bridge error code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'invalid_token' }), {
          status: 401,
        })
      )
    );

    try {
      await fetchSessionProfile(config, 'bad-token');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(EkortOAuthError);
      const oauthError = err as EkortOAuthError;
      expect(oauthError.status).toBe(401);
      expect(oauthError.error).toBe('invalid_token');
    }
  });

  it('maps a 500 to EkortOAuthError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'server_error' }), {
          status: 500,
        })
      )
    );

    await expect(fetchSessionProfile(config, 't')).rejects.toMatchObject({
      status: 500,
      error: 'server_error',
    });
  });
});
