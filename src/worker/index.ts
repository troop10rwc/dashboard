import {
  d1SessionLookup,
  requireSession,
  SESSION_COOKIE_NAME,
  type SessionVariables,
} from "@troop10rwc/worker-kit";
import { Hono, type Context, type Handler, type MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { Env } from "./env.js";
import { buildWhatsNext } from "./whats-next.js";

/**
 * Troop 10 RWC back-office **dashboard** — the apex-domain launchpad at
 * `troop10rwc.org/dashboard`.
 *
 * Per the kit's STACK (≥ 0.8.0) the back office is split across three roles on
 * the `troop10rwc.org` zone: the dashboard (this Worker), the individual app
 * Workers (`troop10rwc.org/manage/*`), and the member hub (`id.troop10rwc.org`,
 * account only). The T10 brand logo in every app's `BackOfficeTopNav` points
 * here. "Home" (dashboard) stays distinct from "my account" (id).
 *
 * It binds the shared D1 read-only to validate the session and redirects
 * unauthenticated requests to the member hub's /login. It renders the SAME
 * `@troop10rwc/ui` `AppShell` as every other back-office page, via an SSR mount
 * shell + a React island. Because this Worker only owns `/dashboard*`, the
 * island's JS/CSS/fonts are served from the assets binding under
 * `/dashboard/assets/*` (built by `vite.config.ts`); the shell links them.
 */

type App = { Bindings: Env } & SessionVariables;

const app = new Hono<App>();

// Auth is split by host, mirroring the member hub (troop10-id). On
// troop10rwc.org the session cookie is in-zone, so `requireSession` validates it
// and bounces to id.troop10rwc.org/login when it's missing. The *.workers.dev
// preview surface can't see that cookie (it's `Domain=troop10rwc.org`), so there
// the dashboard consumes the *preview* session instead: the id service signs
// users in via Cloudflare Access at PREVIEW_AUTH_ORIGIN and mints the SAME
// `__Secure-troop_session` cookie scoped to the workers.dev apex
// (tactical.workers.dev), so it reaches every preview Worker under it. The
// dashboard is a pure consumer here — it validates that cookie against the shared
// D1 and bounces unauthenticated previews to the one Access-gated host. The
// Access verification + cookie issuance all live in the id service, not here.
const onWorkersDev = (c: Context<App>): boolean =>
  new URL(c.req.url).hostname.endsWith(".workers.dev");

/** Auth for the *.workers.dev preview surface. Validates the apex-scoped session
 *  cookie the id service minted (via Access); with no session, API callers get
 *  401 and page loads bounce to the Access-gated PREVIEW_AUTH_ORIGIN to sign in
 *  and pick up the cookie. */
const workersDevAuth =
  (fail: "html" | "json"): MiddlewareHandler<App> =>
  async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE_NAME);
    if (token) {
      const session = await d1SessionLookup(c.env.DB)(token);
      if (session) {
        c.set("session", session);
        return next();
      }
    }
    if (fail === "json") return c.json({ error: "unauthorized" }, 401);
    const authOrigin = c.env.PREVIEW_AUTH_ORIGIN;
    if (!authOrigin) return c.text("Forbidden", 403);
    return c.redirect(`${authOrigin}/preview/login?redirect=${encodeURIComponent(c.req.url)}`, 302);
  };

// requireSession needs per-request env (db, authOrigin), so build it per call.
const pageAuth: MiddlewareHandler<App> = (c, next) =>
  onWorkersDev(c)
    ? workersDevAuth("html")(c, next)
    : requireSession({ authOrigin: c.env.AUTH_ORIGIN, db: c.env.DB })(c, next);
const apiAuth: MiddlewareHandler<App> = (c, next) =>
  onWorkersDev(c)
    ? workersDevAuth("json")(c, next)
    : requireSession({ authOrigin: c.env.AUTH_ORIGIN, db: c.env.DB, onUnauthenticated: "json" })(c, next);

/** SSR mount shell for the React dashboard island. Ships no markup beyond the
 *  mount point — the kit owns the chrome. The signed-in identity rides along as a
 *  JSON island so the client labels the top bar without a fetch. */
function renderDashboard(name: string, logoutUrl: string): string {
  const identity = JSON.stringify({ name, logoutUrl })
    // Defuse a "</script>" sequence inside the JSON island.
    .replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard · Troop 10 RWC</title>
<link rel="stylesheet" href="/dashboard/assets/dashboard.css">
</head>
<body>
<div id="root"></div>
<script id="t10-identity" type="application/json">${identity}</script>
<script type="module" src="/dashboard/assets/dashboard.js"></script>
</body>
</html>`;
}

const home: Handler<App> = (c) => {
  const s = c.var.session;
  const name = s.name ?? s.email ?? "Member";
  return c.html(renderDashboard(name, `${c.env.AUTH_ORIGIN}/logout`));
};

app.get("/dashboard", pageAuth, home);
app.get("/dashboard/", pageAuth, home);

/** "What's Next" data island: the signed-in member's next event (role-filtered)
 *  plus cross-app action items. The React island fetches this on mount. */
app.get("/dashboard/api/whats-next", apiAuth, async (c) =>
  c.json(await buildWhatsNext(c.env, c.var.session.email)),
);

export default app;
