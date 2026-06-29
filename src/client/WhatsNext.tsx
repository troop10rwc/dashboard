// "What's Next" card for the dashboard landing: the signed-in member's next
// troop event (role-filtered server-side) plus cross-app action items — an
// outstanding expense reimbursement and gear still to pack. Data comes from
// GET /dashboard/api/whats-next (see worker/whats-next.ts). When more than one
// event is upcoming, a picker lets the member feature a different one.
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { EmptyState, Field, Icon, SectionLabel, StatusPill } from "@troop10rwc/ui";
import {
  faCalendarDays,
  faClipboardList,
  faLocationDot,
  faReceipt,
} from "@troop10rwc/ui/icons/solid";
import {
  EVENT_TYPE_LABELS,
  type WhatsNextEvent,
  type WhatsNextResponse,
} from "../shared/whats-next.js";

const CALENDAR_HREF = "/manage/calendar";
const EXPENSES_HREF = "/manage/expenses";
const GEARLIST_HREF = "/manage/gearlist";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Format an ISO instant as a Pacific-time date (the troop's timezone). */
function fmtDate(iso: string | null, opts: Intl.DateTimeFormatOptions): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", ...opts });
}

/** "Sat, Jan 18 · 10:00 AM", or a multi-day range "Jan 18 – Jan 19, 2025". */
function formatWhen(ev: WhatsNextEvent): string {
  if (!ev.start) return "Date TBD";
  const day = fmtDate(ev.start, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const startDay = fmtDate(ev.start, { year: "numeric", month: "2-digit", day: "2-digit" });
  const endDay = ev.end ? fmtDate(ev.end, { year: "numeric", month: "2-digit", day: "2-digit" }) : startDay;
  if (endDay && endDay !== startDay) {
    const a = fmtDate(ev.start, { month: "short", day: "numeric" });
    const b = fmtDate(ev.end, { month: "short", day: "numeric", year: "numeric" });
    return `${a} – ${b}`;
  }
  const time = fmtDate(ev.start, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

function typeLabel(type: string | null): string | null {
  if (!type) return null;
  return EVENT_TYPE_LABELS[type] ?? null;
}

/** The featured event, with a type badge, location, and a link into Calendar. */
function FeaturedEvent({ ev }: { ev: WhatsNextEvent }): ReactNode {
  const label = typeLabel(ev.type);
  return (
    <a
      className="t10-card"
      href={CALENDAR_HREF}
      style={{ display: "flex", flexDirection: "column", gap: "var(--t10-s2)", textDecoration: "none", color: "inherit" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--t10-s2)" }}>
        <Icon icon={faCalendarDays} aria-hidden />
        <span style={{ fontFamily: "var(--t10-font-display)", fontWeight: 700, fontSize: "var(--t10-fs-lg)" }}>
          {ev.summary}
        </span>
        {label ? <StatusPill tone="info">{label}</StatusPill> : null}
      </div>
      <span className="t10-num" style={{ color: "var(--t10-ink-soft)" }}>
        {formatWhen(ev)}
      </span>
      {ev.location ? (
        <span className="t10-label" style={{ display: "flex", alignItems: "center", gap: "var(--t10-s1)", color: "var(--t10-ink-soft)" }}>
          <Icon icon={faLocationDot} aria-hidden /> {ev.location}
        </span>
      ) : null}
    </a>
  );
}

/** A compact action-item row: leading icon, text, trailing link. */
function ActionRow({ icon, children, href, cta }: { icon: typeof faReceipt; children: ReactNode; href: string; cta: string }): ReactNode {
  return (
    <div
      className="t10-card"
      style={{ display: "flex", alignItems: "center", gap: "var(--t10-s2)" }}
    >
      <Icon icon={icon} aria-hidden />
      <span style={{ flex: 1 }}>{children}</span>
      <a className="t10-btn" href={href}>{cta}</a>
    </div>
  );
}

export function WhatsNext(): ReactNode {
  const [data, setData] = useState<WhatsNextResponse | null>(null);
  const [error, setError] = useState(false);
  const [pinnedUid, setPinnedUid] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/dashboard/api/whats-next", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? (r.json() as Promise<WhatsNextResponse>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => live && setData(d))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, []);

  // All upcoming events, featured first — the picker's option list.
  const all = useMemo<WhatsNextEvent[]>(
    () => (data?.featured ? [data.featured, ...data.alternatives] : data?.alternatives ?? []),
    [data],
  );
  const current = useMemo<WhatsNextEvent | null>(
    () => (pinnedUid ? all.find((e) => e.uid === pinnedUid) ?? data?.featured ?? null : data?.featured ?? null),
    [pinnedUid, all, data],
  );

  if (error) return null; // Card is supplementary; on failure, fall back to the plain launchpad.

  return (
    <section style={{ marginBottom: "var(--t10-s5)" }}>
      <SectionLabel>What's next</SectionLabel>

      {data == null ? (
        <div className="t10-card" style={{ color: "var(--t10-ink-soft)" }}>Loading…</div>
      ) : current ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--t10-s2)" }}>
          <FeaturedEvent ev={current} />

          {all.length > 1 ? (
            <Field label="Feature a different event">
              <select value={current.uid} onChange={(e) => setPinnedUid(e.target.value)}>
                {all.map((e) => (
                  <option key={e.uid} value={e.uid}>
                    {formatWhen(e)} — {e.summary}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {data.expenses.length > 0 || data.gear.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--t10-s2)", marginTop: "var(--t10-s2)" }}>
              {data.expenses.map((x) => (
                <ActionRow key={`exp-${x.tripName}`} icon={faReceipt} href={EXPENSES_HREF} cta="View">
                  You're owed <span className="t10-num">{dollars.format(x.outstanding)}</span> for{" "}
                  <strong>{x.tripName}</strong>
                </ActionRow>
              ))}
              {data.gear.map((g) => (
                <ActionRow key={`gear-${g.scoutName}-${g.eventTitle}`} icon={faClipboardList} href={GEARLIST_HREF} cta="Pack">
                  <strong>{g.scoutName}</strong>: <span className="t10-num">{g.remaining}</span>/
                  <span className="t10-num">{g.total}</span> items to pack for {g.eventTitle}
                </ActionRow>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState>
          No upcoming events. <a href={CALENDAR_HREF}>Open the calendar</a> to add one.
        </EmptyState>
      )}
    </section>
  );
}
