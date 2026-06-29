import type {
  CalendarDatabaseClient,
  CalendarEvent,
} from "@troop10rwc/calendar-client";

/** Event-type codes the calendar classifies events into. `event_type` is added to
 *  `getUpcomingEvents` by a companion calendar change (see the plan, repo 2);
 *  older deploys omit it, so it's optional and the dashboard degrades gracefully
 *  (an event with no type is never filtered out). */
export type EventType =
  | "day"
  | "overnight"
  | "service"
  | "parent_meeting"
  | "plc_meeting"
  | (string & {});

/** A calendar event as the dashboard consumes it: the published `CalendarEvent`
 *  plus the (optional, until the calendar is bumped) `event_type` used for
 *  role-aware filtering. */
export type DashboardEvent = CalendarEvent & { event_type?: EventType };

/** The `troop-calendar` service binding (read-only RPC). Same surface as the
 *  published `CalendarDatabaseClient`, but `getUpcomingEvents` carries
 *  `event_type` so the dashboard can filter by viewer role. */
export interface CalendarBinding
  extends Omit<CalendarDatabaseClient, "getUpcomingEvents"> {
  getUpcomingEvents(daysAhead?: number): Promise<DashboardEvent[]>;
}

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
}
