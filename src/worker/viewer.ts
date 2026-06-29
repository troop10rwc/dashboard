// Classify the signed-in member as a scout (youth) or an adult by matching their
// session email against the roster. Adults carry a single `adult_members.email`;
// youth carry a JSON array `youth_members.emails` (guardians + the scout). This
// mirrors the query shape in the roster repo's `getRosterPositions`
// (src/worker/backoffice/roster-roles.ts) — email is the reliable roster key.

/** What the dashboard needs to know about the viewer to tailor "What's Next". */
export interface Viewer {
  /** "scout" → youth member; "adult" → registered adult; "unknown" → not on the
   *  roster (treated like an adult: sees every event type). */
  kind: "scout" | "adult" | "unknown";
}

function normalizeEmail(email: string | undefined | null): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Resolve the viewer kind from the roster. Adult membership wins over youth (a
 * registered adult who also appears as a guardian on a youth record is an adult).
 * Fails open to "unknown" on any error so the card still renders.
 */
export async function resolveViewer(roster: D1Database, email: string | undefined | null): Promise<Viewer> {
  const e = normalizeEmail(email);
  if (!e) return { kind: "unknown" };

  try {
    const [adult, scout] = await Promise.all([
      roster.prepare(`SELECT 1 FROM adult_members WHERE lower(email) = ? LIMIT 1`).bind(e).first(),
      roster
        .prepare(
          `SELECT 1 FROM youth_members ym, json_each(ym.emails) je
            WHERE lower(je.value) = ? LIMIT 1`,
        )
        .bind(e)
        .first(),
    ]);
    if (adult) return { kind: "adult" };
    if (scout) return { kind: "scout" };
    return { kind: "unknown" };
  } catch {
    return { kind: "unknown" };
  }
}
