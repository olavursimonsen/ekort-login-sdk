# @ekort/login-sdk — Rita inn við eKort

TypeScript SDK for integrating "Rita inn við eKort" login into third-party
websites and apps. It will provide a framework-agnostic core client for the
eKort OAuth/OIDC server (authorization code flow with PKCE) plus a React
wrapper exposing a ready-made "Rita inn við eKort" button. This repository
currently contains only the package scaffold; the implementation follows in
later changes.

## Release

Publishing to npm is a **manual** step and requires npm credentials with
access to the `@ekort` scope. It is intentionally not automated (no
`prepublishOnly` hook, no CI publish job):

```bash
npm run build
npm publish --access public
```
