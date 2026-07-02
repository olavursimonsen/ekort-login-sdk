# @ekort/login-sdk — Rita inn við eKort

TypeScript SDK for adding **"Rita inn við eKort"** login to third-party
websites and web apps. It talks to the eKort OAuth/OIDC server (Supabase
GoTrue behind the bridge at `https://ekort.fo`) using the **authorization
code flow with PKCE**, and ships:

- a **framework-agnostic core**: `startLogin`, `exchangeCodeForTokens`,
  `fetchSessionProfile`, state/verifier storage helpers, and a drop-in
  `renderEkortLoginButton` for plain HTML/JS sites;
- a **React wrapper** (`@ekort/login-sdk/react`) exposing a ready-made
  `<EkortLoginButton />` component.

No runtime dependencies. React is an optional peer dependency used only by
the `/react` entry point.

> **Label rule:** the button's user-visible label defaults to the Faroese
> product string **"Rita inn við eKort"** and must stay Faroese — it is the
> product name. Everything else (docs, code, errors) is English.

## Install

```bash
npm i @ekort/login-sdk
```

> Not yet published to npm. Until it is, install from a git checkout or a
> local `npm pack` tarball.

## Quick start (vanilla JS)

### 1. Register an OAuth client

Register your site as an OAuth client with the eKort bridge:

- Developer portal: <https://ekort.fo/dev>
- API: `POST https://ekort.fo/oidc/clients` with your redirect URI(s)

You get back a `client_id` (and, for confidential server-side clients, a
`client_secret` — see [Security notes](#security-notes)). The redirect URI
you register must exactly match the `redirectUri` you configure below, e.g.
`https://yoursite.example/oauth/callback`.

### 2. Render the button

```html
<div id="ekort-login"></div>
<script type="module">
  import { renderEkortLoginButton } from '@ekort/login-sdk';

  const unmount = renderEkortLoginButton(
    document.getElementById('ekort-login'),
    {
      clientId: 'your-client-id',
      redirectUri: 'https://yoursite.example/oauth/callback',
    },
    {
      // label: 'Rita inn við eKort'  (default — keep it Faroese)
      onError: (err) => console.error('eKort login failed', err),
    }
  );
  // Call unmount() to remove the button and its listener.
</script>
```

On click the button disables itself, builds the PKCE authorization request,
saves the OAuth `state` and code verifier to `sessionStorage`
(`saveLoginState`), and navigates the browser to the authorize URL — or, on
mobile, hands off to the eKort app (see [Mobile behavior](#mobile-behavior)).
`renderEkortLoginButton` needs a DOM; calling it during server-side
rendering throws an `EkortLoginError`, so call it client-side only.

### 3. Handle the redirect at `/oauth/callback`

After the user approves, the browser returns to your `redirectUri` with
`?code=...&state=...`. Verify the state, then exchange the code using the
verifier saved before the redirect:

```ts
import {
  clearLoginState,
  exchangeCodeForTokens,
  loadLoginState,
} from '@ekort/login-sdk';

const config = {
  clientId: 'your-client-id',
  redirectUri: 'https://yoursite.example/oauth/callback',
};

const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const state = params.get('state');

const saved = loadLoginState(); // { state, codeVerifier } from sessionStorage
if (!code || !saved || saved.state !== state) {
  throw new Error('OAuth state mismatch or missing code — restart login.');
}

const tokens = await exchangeCodeForTokens(config, {
  code,
  codeVerifier: saved.codeVerifier,
});
clearLoginState();

// tokens: { access_token, refresh_token?, id_token?, expires_in?, token_type }
```

### 4. Fetch the user's profile

```ts
import { fetchSessionProfile } from '@ekort/login-sdk';

const profile = await fetchSessionProfile(config, tokens.access_token);
// { sub, id, email, real_email, name, given_name, family_name, phone, address }
```

`email` / `real_email` are the user's **real** email address — the bridge
guarantees you never see a synthetic `@samleikin.ekort` address — but either
may be `null` when the user has no real address on file. Handle `null`.

## React usage

```tsx
import { EkortLoginButton } from '@ekort/login-sdk/react';

export function LoginPage() {
  return (
    <EkortLoginButton
      config={{
        clientId: 'your-client-id',
        redirectUri: 'https://yoursite.example/oauth/callback',
      }}
      // label defaults to "Rita inn við eKort" — keep it Faroese
      onError={(err) => console.error('eKort login failed', err)}
    />
  );
}
```

Props: `config` (required), `label?`, `className?`, `style?` (both merge
over the built-in styling), `onError?`. The component is a thin wrapper —
no context or providers — and does the same
`startLogin → saveLoginState → location.assign` sequence with a
busy/disabled state while the request is in flight. Handle the callback
route exactly as in the vanilla guide (step 3).

## Mobile behavior

On a mobile user agent (iPhone/iPad/Android), `startLogin` automatically
tries the app handoff before falling back to the browser redirect:

1. It calls the bridge `POST https://ekort.fo/oauth/mobile/start` with your
   client id, redirect URI, scope, state, and PKCE code challenge.
2. The bridge returns an `authorization_id` plus a universal link
   (preferred) or an `ekort://` deep link; the button navigates there, which
   opens the **eKort app** for the user to approve.
3. After approval, the flow returns to your `redirectUri` with a `code`, and
   the token exchange works exactly as on desktop (same code verifier).

If the handoff call fails, the SDK silently falls back to the standard
authorize redirect, so you don't need any mobile-specific code.

## Configuration reference (`EkortLoginConfig`)

| Field | Required | Default | Description |
|---|---|---|---|
| `clientId` | yes | — | OAuth client id registered with the eKort authorization server. |
| `redirectUri` | yes | — | Redirect URI registered for the client; must match exactly. |
| `scope` | no | `"openid email profile"` | OAuth scope string. |
| `bridgeBaseUrl` | no | `"https://ekort.fo"` | Base URL of the eKort bridge (mobile handoff, session profile). |
| `supabaseUrl` | no | — | Supabase project URL used to derive `authorizeUrl` / `tokenUrl`. |
| `authorizeUrl` | no | `{supabaseUrl}/auth/v1/oauth/authorize` | Full authorize endpoint. Required if `supabaseUrl` is not set. |
| `tokenUrl` | no | `{supabaseUrl}/auth/v1/oauth/token` | Full token endpoint. Required if `supabaseUrl` is not set. |

Either `supabaseUrl` or both `authorizeUrl` and `tokenUrl` must be provided;
otherwise `resolveConfig` throws an `EkortLoginError`.

## Security notes

- **PKCE always.** Every authorization request uses a fresh S256 code
  challenge; the token exchange requires the matching verifier. There is no
  non-PKCE mode.
- **`client_secret` only server-side.** Never ship a client secret to the
  browser. If your client is confidential, run the code-for-token exchange
  on your server (`exchangeCodeForTokens` accepts an optional
  `clientSecret`) and keep the secret in server env vars.
- **Prefer server-side token handling.** Mirroring the canonical Next.js
  reference (`/oauth/start` + `/oauth/callback` route handlers): do the
  exchange in a server route and store `access_token` / `refresh_token` in
  **httpOnly, Secure, SameSite cookies** rather than exposing them to
  client-side JavaScript. Pure-SPA setups can use the browser exchange shown
  above, accepting that tokens live in JS-accessible memory/storage.
- **Verify `state`.** Always compare the callback `state` with the value
  saved before the redirect (as in step 3) to block CSRF/login-injection.
- Errors surface as `EkortLoginError` (config/flow problems) or
  `EkortOAuthError` (HTTP failures, carrying `status`, `error`,
  `error_description`).

## Release

Publishing to npm is a **manual** step and requires npm credentials with
access to the `@ekort` scope. It is intentionally not automated (no
`prepublishOnly` hook, no CI publish job):

```bash
npm run build
npm publish --access public
```
