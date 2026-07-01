import type {
  CalendarDatabaseClient,
  CalendarEvent,
} from "@troop10rwc/calendar-client";

/** A calendar event as the dashboard consumes it. `CalendarEvent` carries
 *  `event_type` (calendar-client ≥ 1.2.0), which drives role-aware filtering. */
export type DashboardEvent = CalendarEvent;

/** The `troop-calendar` service binding (read-only RPC). */
export type CalendarBinding = CalendarDatabaseClient;

/** One trip where the troop still owes the signed-in member money. Mirrors the
 *  read-only RPC added to `patrol-expense` (see the plan, repo 3). */
export interface OutstandingExpense {
  tripName: string;
  /** Dollars still owed to the member (positive). */
  outstanding: number;
  /** Settlement progress: "none" | "requested" | "received" | "paid". */
  status: string;
}

/** The `patrol-expense` service binding (read-only RPC). */
export interface ExpensesBinding {
  getOutstandingForMember(email: string): Promise<OutstandingExpense[]>;
}

/** One scout with gear still to pack for their next event. Mirrors the read-only
 *  RPC added to `scoutpack`/gearlist (see the plan, repo 4). */
export interface GearToPack {
  scoutName: string;
  eventTitle: string;
  /** Unchecked items remaining on the packing list. */
  remaining: number;
  /** Total items on the packing list. */
  total: number;
}

/** The `scoutpack` (gearlist) service binding (read-only RPC). */
export interface GearlistBinding {
  getGearToPackForMember(email: string): Promise<GearToPack[]>;
}

export interface Env {
  /** Shared D1 (read-only here) — session validation via worker-kit. Bound to the
   *  same database the member hub (troop10-id) writes to. */
  DB: D1Database;
  /** Externally-managed roster D1 (read-only). Used to classify the signed-in
   *  member as a scout (youth) or adult: `adult_members.email` vs
   *  `youth_members.emails`. Same DB patrol-expense/scoutpack bind as ROSTER. */
  ROSTER: D1Database;
  /** Calendar Worker service binding (`troop-calendar`) — read-only RPC for the
   *  next upcoming events. */
  CALENDAR: CalendarBinding;
  /** Expenses Worker service binding (`patrol-expense`) — read-only RPC for a
   *  member's outstanding reimbursements. */
  EXPENSES: ExpensesBinding;
  /** Gearlist Worker service binding (`scoutpack`) — read-only RPC for a member's
   *  scouts' gear still to pack. */
  GEARLIST: GearlistBinding;
  /** Member-hub origin to bounce unauthenticated users to, e.g.
   *  https://id.troop10rwc.org. Also where "Sign out" goes. */
  AUTH_ORIGIN: string;
  /** The stable, Cloudflare Access-restricted *.workers.dev host that signs
   *  preview visitors in and issues the workers.dev-apex-scoped session cookie —
   *  the workers.dev analog of AUTH_ORIGIN, owned by the id service
   *  (e.g. https://profile.tactical.workers.dev). Unset on a plain prod request
   *  → the dashboard just uses requireSession. Only consulted on `*.workers.dev`. */
  PREVIEW_AUTH_ORIGIN?: string;
}
