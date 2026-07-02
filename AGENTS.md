# AGENTS.md

## Cursor Cloud specific instructions

### Current repository state
This repository (`ekort-login-sdk`) is currently an **empty scaffold**. The only
tracked files are `README.md` and `.gitignore`. There is **no `package.json`, no
source code, no tests, no lint/build config, and no runnable service yet**.

As a result there is currently **nothing to build, lint, test, or run**. Do not
fabricate a product to "demonstrate" the environment — there isn't one yet.

### Intended stack
The `.gitignore` and project name indicate the intended stack is a
**Node.js / TypeScript SDK** (a client library, not a standalone service). The VM
ships with Node 22.x plus npm, pnpm, yarn, and corepack, so no toolchain install
is needed.

### Dependency install (update script behavior)
The startup update script is intentionally **guarded**: it installs dependencies
only once a `package.json` exists, auto-detecting the package manager from the
lockfile (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `package-lock.json` → npm,
otherwise `npm install`). Until a manifest is added it is a safe no-op, so the
script keeps working even before any project files land.

### Once real project files are added
When a `package.json` (and source) is committed, use the package manager that
matches the committed lockfile, and rely on that manifest's `scripts` block for
the canonical build / lint / test / dev commands rather than duplicating them
here.
