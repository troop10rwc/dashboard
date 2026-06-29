# troop10rwc/dashboard

The apex-domain back-office **dashboard** / launchpad (`troop10rwc.org/dashboard`)
for Troop 10 RWC. Single Cloudflare Worker: SSR Hono + a Vite-built React island
on `@troop10rwc/ui`'s `AppShell`.

## Stack & conventions

This is a consumer of [`@troop10rwc/kit`](https://github.com/troop10rwc/kit).
Don't redefine shared types, re-style the components, or re-implement
session/auth middleware — use `@troop10rwc/{shared,ui,worker-kit}`. The canonical
guide is the kit's `STACK.md`; the design contract is `@troop10rwc/ui`'s
`STYLE.md` (read it before building back-office pages).

- **Auth:** `requireSession` (worker-kit) → redirects to `https://id.troop10rwc.org/login`.
  No Slack/passkey here — that's the member hub (`troop10rwc/id`).
- **Assets:** the Worker only owns `/dashboard*`, so the island is served under
  `/dashboard/assets/*` (`vite.config.ts` `base`). `/dashboard` falls through to SSR.
- **Deploy:** Cloudflare Workers Builds on push to `main`.

The kit ships Claude Code skills (setup + design contract) via its plugin
marketplace. Register once: `/plugin marketplace add troop10rwc/kit` then
`/plugin install troop10-kit@troop10rwc`.
