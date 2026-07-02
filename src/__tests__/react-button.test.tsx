// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startLogin } from '../login';
import type { LoginStart } from '../login';
import { EKORT_BUTTON_LABEL, EkortLoginButton } from '../react/index';
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
  state: 'state-r',
  codeVerifier: 'verifier-r',
};

let container: HTMLElement;
let root: Root;
let assignSpy: ReturnType<typeof vi.fn<(url: string | URL) => void>>;

beforeEach(() => {
  // Required by React so act() knows it is running in a test environment.
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  assignSpy = vi.fn<(url: string | URL) => void>();
  vi.spyOn(window.location, 'assign').mockImplementation(assignSpy);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  sessionStorage.clear();
  vi.restoreAllMocks();
  startLoginMock.mockReset();
});

function getButton(): HTMLButtonElement {
  const button = container.querySelector('button');
  expect(button).not.toBeNull();
  return button as HTMLButtonElement;
}

describe('EkortLoginButton (React)', () => {
  it('renders with the Faroese default label', () => {
    act(() => {
      root.render(<EkortLoginButton config={config} />);
    });
    const button = getButton();
    expect(button.type).toBe('button');
    expect(button.textContent).toContain('Rita inn við eKort');
    expect(button.textContent).toContain(EKORT_BUTTON_LABEL);
    expect(button.getAttribute('aria-label')).toBe(EKORT_BUTTON_LABEL);
  });

  it('applies a custom label, className and style', () => {
    act(() => {
      root.render(
        <EkortLoginButton
          config={config}
          label="Innrita"
          className="my-btn"
          style={{ backgroundColor: 'rgb(1, 2, 3)' }}
        />
      );
    });
    const button = getButton();
    expect(button.textContent).toContain('Innrita');
    expect(button.className).toBe('my-btn');
    expect(button.style.backgroundColor).toBe('rgb(1, 2, 3)');
  });

  it('click starts login, saves state and navigates', async () => {
    startLoginMock.mockResolvedValue(redirectStart);
    act(() => {
      root.render(<EkortLoginButton config={config} />);
    });

    await act(async () => {
      getButton().click();
    });

    expect(startLoginMock).toHaveBeenCalledWith(config, {
      userAgent: navigator.userAgent,
    });
    expect(sessionStorage.getItem(STATE_STORAGE_KEY)).toBe('state-r');
    expect(sessionStorage.getItem(VERIFIER_STORAGE_KEY)).toBe('verifier-r');
    expect(assignSpy).toHaveBeenCalledWith(redirectStart.url);
  });

  it('disables the button while the login start is in flight', async () => {
    let resolveStart: (value: LoginStart) => void;
    startLoginMock.mockReturnValue(
      new Promise<LoginStart>((resolve) => {
        resolveStart = resolve;
      })
    );
    act(() => {
      root.render(<EkortLoginButton config={config} />);
    });

    await act(async () => {
      getButton().click();
    });
    expect(getButton().disabled).toBe(true);

    await act(async () => {
      resolveStart!(redirectStart);
    });
    expect(assignSpy).toHaveBeenCalledWith(redirectStart.url);
  });

  it('re-enables the button and calls onError on failure', async () => {
    const failure = new Error('network down');
    startLoginMock.mockRejectedValue(failure);
    const onError = vi.fn();
    act(() => {
      root.render(<EkortLoginButton config={config} onError={onError} />);
    });

    await act(async () => {
      getButton().click();
    });

    expect(onError).toHaveBeenCalledWith(failure);
    expect(getButton().disabled).toBe(false);
    expect(assignSpy).not.toHaveBeenCalled();
  });
});
