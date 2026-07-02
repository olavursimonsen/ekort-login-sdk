/**
 * @ekort/login-sdk — core entry point.
 *
 * "Rita inn við eKort": login against the eKort OAuth/OIDC server
 * (Supabase GoTrue behind the bridge at https://ekort.fo), mirroring the
 * canonical flow in apps/nextjs-boilerplate/app/oauth/{start,callback}.
 */

export const SDK_VERSION = '0.1.0';

export type {
  EkortLoginConfig,
  TokenResponse,
  MobileStartResponse,
  SessionProfile,
  SessionProfileAddress,
} from './types';

export { EkortLoginError, EkortOAuthError } from './errors';
export type { EkortOAuthErrorOptions } from './errors';

export { DEFAULT_BRIDGE_BASE_URL, DEFAULT_SCOPE, resolveConfig } from './config';
export type { ResolvedEkortLoginConfig } from './config';

export {
  base64UrlEncode,
  computeCodeChallenge,
  generateCodeVerifier,
  randomBase64Url,
} from './pkce';

export { createAuthorizationRequest } from './authorize';
export type { AuthorizationRequest } from './authorize';

export { isMobileUserAgent, startMobileAuthorization } from './mobile';
export type {
  MobileAuthorization,
  MobileAuthorizationParams,
} from './mobile';

export { exchangeCodeForTokens } from './token';
export type { TokenExchangeParams } from './token';

export { fetchSessionProfile } from './profile';

export {
  STATE_STORAGE_KEY,
  VERIFIER_STORAGE_KEY,
  clearLoginState,
  loadLoginState,
  saveLoginState,
} from './storage';
export type { LoginState } from './storage';

export { startLogin } from './login';
export type {
  LoginStart,
  MobileLoginStart,
  RedirectLoginStart,
  StartLoginOptions,
} from './login';

export {
  EKORT_BUTTON_BASE_STYLE,
  EKORT_BUTTON_ICON_SVG,
  EKORT_BUTTON_LABEL,
  renderEkortLoginButton,
} from './button';
export type { RenderEkortLoginButtonOptions } from './button';
