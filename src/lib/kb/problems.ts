// What #4471 really holds. causes.ts sorts a report by its tenant: who it is and which form it
// came through. That finds two causes, but both describe a date whose day and month swapped.
// Some reports in #4471 describe something else: the date moved by one day. The desk already
// read them that way (desk-notes.json, oneDayMove). A one-day move is not a swap, so neither
// the parser fix nor the hint fix touches it. It is its own problem.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day' | 'unplaced';

export const PROBLEMS: Record<Problem, { title: string; fix: string }> = {
  parser: {
    title: 'Shared parser reads day-first dates month first',
    fix: 'Parse with the tenant locale (dayFirst), not a fixed month-first order.',
  },
  hint: {
    title: 'booking-v3 form hint says MM/DD/YYYY to day-first tenants',
    fix: "Print the hint in the tenant's own order, or read the field the way the hint says.",
  },
  'one-day': {
    title: 'Invite date moves by one day across time zones',
    fix: 'Keep the booking as a date in the tenant time zone; do not shift it through UTC.',
  },
  unplaced: {
    title: 'No tenant on file',
    fix: 'Find the tenant before triage.',
  },
};

export function problemOf(r: Report, t: Tenant | undefined, oneDay: readonly string[]): Problem {
  if (oneDay.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  channels: Record<string, number>;
  // intake's guess for these reports: tag → count
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (xs: string[]) => xs.reduce<Record<string, number>>((n, x) => ({ ...n, [x]: (n[x] ?? 0) + 1 }), {});

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDay: readonly string[],
): { rows: number; unique: number; groups: ProblemGroup[] } {
  const merged = all.filter((r) => r.mergedInto === ticket);
  const unique = uniqueById(merged);
  const by = new Map<Problem, Report[]>();
  for (const r of unique) {
    const p = problemOf(r, tenantOf(r), oneDay);
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  const groups = [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: new Set(rs.map((r) => r.tenant)).size,
        channels: tally(rs.map((r) => r.channel)),
        taggedAs: tally(rs.map((r) => r.meta.intakeTag)),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
  return { rows: merged.length, unique: unique.length, groups };
}

// Reports whose intake tag differs from the cause the tenant gives them.
export function mistagged(g: ProblemGroup): number {
  if (g.problem !== 'parser' && g.problem !== 'hint') return 0;
  return g.reports.filter((r) => r.meta.intakeTag !== g.problem).length;
}
