// Builds the "What's Next" payload by fanning out to the sibling apps' read-only
// RPCs (calendar / expenses / gearlist) and the roster. Every cross-app read is
// isolated with Promise.allSettled so one slow or erroring service degrades to an
// empty section instead of failing the whole card.
import {
  eventVisibleTo,
  type GearToPack,
  type OutstandingExpense,
  type ViewerKind,
  type WhatsNextEvent,
  type WhatsNextResponse,
} from "../shared/whats-next.js";
import type { DashboardEvent, Env } from "./env.js";
import { resolveViewer } from "./viewer.js";

/** How far ahead to pull events for the feature + picker. */
const UPCOMING_DAYS = 45;

/** Convert the calendar's ICS `YYYYMMDDTHHMMSSZ` to an ISO 8601 string, or null
 *  if it isn't in that shape. */
function icsToISO(ics: string | null | undefined): string | null {
  if (!ics || !/^\d{8}T\d{6}Z$/.test(ics)) return null;
  const ms = Date.UTC(
    Number(ics.slice(0, 4)),
    Number(ics.slice(4, 6)) - 1,
    Number(ics.slice(6, 8)),
    Number(ics.slice(9, 11)),
    Number(ics.slice(11, 13)),
    Number(ics.slice(13, 15)),
  );
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

function toEvent(e: DashboardEvent): WhatsNextEvent {
  return {
    uid: e.event_uid,
    summary: e.summary,
    start: icsToISO(e.start_date),
    end: icsToISO(e.end_date),
    location: e.location ?? null,
    type: e.event_type ?? null,
  };
}

/** Settled async helper: resolve to `fallback` on rejection. */
async function settled<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

/** Featured event + picker alternatives, role-filtered and sorted soonest-first. */
async function fetchEvents(
  env: Env,
  viewer: ViewerKind,
): Promise<{ featured: WhatsNextEvent | null; alternatives: WhatsNextEvent[] }> {
  const raw = await settled(env.CALENDAR.getUpcomingEvents(UPCOMING_DAYS), [] as DashboardEvent[]);
  const events = raw
    .map(toEvent)
    .filter((e) => eventVisibleTo(viewer, e.type))
    .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  const [featured, ...alternatives] = events;
  return { featured: featured ?? null, alternatives };
}

/** Assemble the full payload for the signed-in member. */
export async function buildWhatsNext(env: Env, email: string | undefined): Promise<WhatsNextResponse> {
  const viewer = (await resolveViewer(env.ROSTER, email)).kind;

  const [events, expenses, gear] = await Promise.all([
    fetchEvents(env, viewer),
    email
      ? settled(env.EXPENSES.getOutstandingForMember(email), [] as OutstandingExpense[])
      : Promise.resolve([] as OutstandingExpense[]),
    email
      ? settled(env.GEARLIST.getGearToPackForMember(email), [] as GearToPack[])
      : Promise.resolve([] as GearToPack[]),
  ]);

  return {
    viewer,
    featured: events.featured,
    alternatives: events.alternatives,
    expenses,
    gear,
  };
}
