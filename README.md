# troop10rwc/dashboard — back-office launchpad

The Troop 10 RWC **dashboard**: the apex-domain landing app at
`troop10rwc.org/dashboard`. It's the "home" every back-office app's brand logo
points at — a launchpad of links into Calendar, Gearlist, Expenses, and Roster.

Part of the [`@troop10rwc/kit`](https://github.com/troop10rwc/kit) stack
(Vite + React 19 + Hono on Workers + D1). See the kit's `STACK.md` for the
domains/navigation split: the dashboard, the `*.troop10rwc.org/manage/*` app
Workers, and the member hub (`id.troop10rwc.org`, account only) are distinct
apps sharing one session cookie (`Domain=troop10rwc.org`).

## Auth

Protected by `requireSession` from `@troop10rwc/worker-kit`: it validates the
`__Secure-` session cookie against the shared `troop10-id` D1 (bound read-only),
and redirects unauthenticated visitors to `https://id.troop10rwc.org/login`
(`AUTH_ORIGIN`). No Slack/passkey logic lives here — that's the member hub.

## Architecture

Server-rendered Hono Worker + one Vite-built React island built on the kit's
`@troop10rwc/ui` `AppShell` (same chrome as every other back-office page).
Because the Worker only owns the `/dashboard*` route, the island bundle is served
under `/dashboard/assets/*`:

```
src/worker/index.ts   route wiring + SSR mount shell + requireSession
src/worker/env.ts     Env bindings (DB, AUTH_ORIGIN)
src/client/dashboard.tsx   the React launchpad island
```

## Setup

Consumes `@troop10rwc/{ui,shared,worker-kit}` from GitHub Packages — see
`.npmrc` and export `NPM_TOKEN` locally (any classic PAT; CI uses the built-in
`GITHUB_TOKEN`).

```bash
pnpm install
pnpm dev        # vite build + wrangler dev
pnpm typecheck
pnpm build
```

## Deploy

Deployed by Cloudflare **Workers Builds** (Git integration) on push to `main`;
binds the shared `troop10-id` D1 and claims the `troop10rwc.org/dashboard*`
route. Manual: `pnpm deploy`.
