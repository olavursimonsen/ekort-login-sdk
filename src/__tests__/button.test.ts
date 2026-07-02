// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EKORT_BUTTON_LABEL,
  renderEkortLoginButton,
} from '../button';
import { EkortLoginError } from '../errors';
import { startLogin } from '../login';
import type { LoginStart } from '../login';
import { STATE_STORAGE_KEY, VERIFIER_STORAGE_KEY } from '../storage';
import type { EkortLoginConfig } from '../types';

vi.mock('../login', () => ({
  startLogin: vi.fn(),
}));

const startLoginMock = vi.mocked(startLogin);

const config: EkortLoginConfig = {
  clientId: 'client-123',
  redirectUri: 'https://app.example/oauth/callback',
  supabaseUrl: 'https://project.supabase.co',
};

const redirectStart: LoginStart = {
  mode: 'redirect',
  url: 'https://project.supabase.co/auth/v1/oauth/authorize?client_id=client-123',
  state: 'state-1',
  codeVerifier: 'verifier-1',
};

let container: HTMLElement;
let assignSpy: ReturnType<typeof vi.fn<(url: string | URL) => void>>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  assignSpy = vi.fn<(url: string | URL) => void>();
  vi.spyOn(window.location, 'assign').mockImplementation(assignSpy);
});

afterEach(() => {
  container.remove();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  startLoginMock.mockReset();
});

function getButton(): HTMLButtonElement {
  const button = container.querySelector('button');
  expect(button).not.toBeNull();
  return button as HTMLButtonElement;
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('renderEkortLoginButton', () => {
  it('renders a button with the Faroese default label and aria-label', () => {
    renderEkortLoginButton(container, config);
    const button = getButton();
    expect(button.type).toBe('button');
    expect(button.textContent).toContain('Rita inn við eKort');
    expect(button.textContent).toContain(EKORT_BUTTON_LABEL);
    expect(button.getAttribute('aria-label')).toBe(EKORT_BUTTON_LABEL);
  });

  it('supports a custom label', () => {
    renderEkortLoginButton(container, config, { label: 'Innrita' });
    const button = getButton();
    expect(button.textContent).toContain('Innrita');
    expect(button.getAttribute('aria-label')).toBe('Innrita');
  });

  it('click starts login, saves state and navigates to the authorize URL', async () => {
    startLoginMock.mockResolvedValue(redirectStart);
    renderEkortLoginButton(container, config);

    getButton().click();
    await flush();

    expect(startLoginMock).toHaveBeenCalledWith(config, {
      userAgent: navigator.userAgent,
    });
    expect(sessionStorage.getItem(STATE_STORAGE_KEY)).toBe('state-1');
    expect(sessionStorage.getItem(VERIFIER_STORAGE_KEY)).toBe('verifier-1');
    expect(assignSpy).toHaveBeenCalledWith(redirectStart.url);
  });

  it('navigates to the app link for a mobile login start', async () => {
    startLoginMock.mockResolvedValue({
      mode: 'mobile',
      link: 'https://ekort.fo/oauth/mobile/open?authorization_id=auth-1',
      authorizationId: 'auth-1',
      state: 'state-m',
      codeVerifier: 'verifier-m',
    });
    renderEkortLoginButton(container, config);

    getButton().click();
    await flush();

    expect(assignSpy).toHaveBeenCalledWith(
      'https://ekort.fo/oauth/mobile/open?authorization_id=auth-1'
    );
  });

  it('disables the button while the login start is in flight', async () => {
    let resolveStart: (value: LoginStart) => void;
    startLoginMock.mockReturnValue(
      new Promise<LoginStart>((resolve) => {
        resolveStart = resolve;
      })
    );
    renderEkortLoginButton(container, config);
    const button = getButton();

    button.click();
    await flush();
    expect(button.disabled).toBe(true);

    // A second click while busy must not start another login.
    button.click();
    await flush();
    expect(startLoginMock).toHaveBeenCalledTimes(1);

    resolveStart!(redirectStart);
    await flush();
    expect(assignSpy).toHaveBeenCalledWith(redirectStart.url);
  });

  it('re-enables the button and calls onError on failure', async () => {
    const failure = new Error('network down');
    startLoginMock.mockRejectedValue(failure);
    const onError = vi.fn();
    renderEkortLoginButton(container, config, { onError });
    const button = getButton();

    button.click();
    await flush();

    expect(onError).toHaveBeenCalledWith(failure);
    expect(button.disabled).toBe(false);
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('logs with console.error on failure when no onError is given', async () => {
    startLoginMock.mockRejectedValue(new Error('boom'));
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    renderEkortLoginButton(container, config);

    getButton().click();
    await flush();

    expect(consoleSpy).toHaveBeenCalled();
    expect(getButton().disabled).toBe(false);
  });

  it('cleanup removes the button from the container', () => {
    const cleanup = renderEkortLoginButton(container, config);
    expect(container.querySelector('button')).not.toBeNull();
    cleanup();
    expect(container.querySelector('button')).toBeNull();
  });

  it('throws EkortLoginError without a DOM (SSR)', () => {
    vi.stubGlobal('document', undefined);
    expect(() => renderEkortLoginButton(container, config)).toThrow(
      EkortLoginError
    );
  });
});
