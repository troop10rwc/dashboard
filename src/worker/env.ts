export interface Env {
  /** Shared D1 (read-only here) — session validation via worker-kit. Bound to the
   *  same database the member hub (troop10-id) writes to. */
  DB: D1Database;
  /** Member-hub origin to bounce unauthenticated users to, e.g.
   *  https://id.troop10rwc.org. Also where "Sign out" goes. */
  AUTH_ORIGIN: string;
}
