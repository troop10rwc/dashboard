// Isomorphic DTOs + pure helpers for the dashboard "What's Next" card. Imported
// by BOTH the Worker (which builds the payload) and the client island (which
// renders it), so this file must stay free of Worker/DOM globals.

/** Viewer classification, surfaced from the roster (see worker/viewer.ts). */
export type ViewerKind = "scout" | "adult" | "unknown";

/** A calendar event, normalized for the client: dates are ISO 8601 (the Worker
 *  converts the calendar's ICS `YYYYMMDDTHHMMSSZ` form), not raw ICS. */
export interface WhatsNextEvent {
  uid: string;
  summary: string;
  /** ISO 8601 start, or null if the source date was unparseable. */
  start: string | null;
  /** ISO 8601 end, or null. */
  end: string | null;
  location: string | null;
  /** Calendar event-type code; null when the calendar deploy predates the
   *  `event_type` field (then it can't be role-filtered and is always shown). */
  type: string | null;
}

/** One trip where the troop still owes the signed-in member money. */
export interface OutstandingExpense {
  tripName: string;
  outstanding: number;
  status: string;
}

/** One scout with gear still to pack for their next event. */
export interface GearToPack {
  scoutName: string;
  eventTitle: string;
  remaining: number;
  total: number;
}

/** The full payload returned by `GET /dashboard/api/whats-next`. Any cross-app
 *  section that errored is simply empty/null — the endpoint never fails as a
 *  whole (Promise.allSettled). */
export interface WhatsNextResponse {
  viewer: ViewerKind;
  /** The single next event to feature, or null when there's nothing upcoming. */
  featured: WhatsNextEvent | null;
  /** Remaining upcoming events, offered in the "pick a different event" picker. */
  alternatives: WhatsNextEvent[];
  expenses: OutstandingExpense[];
  gear: GearToPack[];
}

/** Human labels for the calendar's event-type codes. */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  day: "Day event",
  overnight: "Overnight",
  service: "Service",
  parent_meeting: "Parent meeting",
  plc_meeting: "PLC meeting",
};

/** Event types a scout should NOT see on their dashboard (adult-oriented). */
const SCOUT_HIDDEN_TYPES = new Set(["parent_meeting"]);

/**
 * Does this event type belong on the given viewer's "What's Next"? Adults (and
 * unknown viewers) see everything. Scouts see everything except adult-oriented
 * types. An event with no type (`null`) is always shown — we can't filter what
 * we can't classify.
 */
export function eventVisibleTo(viewer: ViewerKind, type: string | null): boolean {
  if (type == null) return true;
  if (viewer === "scout") return !SCOUT_HIDDEN_TYPES.has(type);
  return true;
}
