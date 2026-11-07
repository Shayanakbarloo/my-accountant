import { monthlyCost } from "./subscriptions.js";

/*  Working out what each goal really gets.

    Goals all want money from the same pot. Marking one as a priority means
    it gets filled first and the others live on what's left — which usually
    means they take longer, so this works out their honest finish date
    rather than pretending nothing changed.                               */

const MS_PER_DAY = 86400000;

// The whole app treats a month as four weeks — monthly income is weekly × 4 —
// so goals have to use the same month, or a goal's "per month" would mean
// something different from every other figure on the page. It also makes
// two weeks exactly half a month, which a 30.44-day month is not.
const DAYS_PER_MONTH = 28;

function monthsUntil(dateString) {
  const days = Math.ceil((new Date(dateString) - new Date()) / MS_PER_DAY);
  return days / DAYS_PER_MONTH;
}

function dateAfterMonths(months) {
  // Months here are four-week blocks, so step in days rather than
  // calendar months — otherwise the finish date drifts.
  const d = new Date();
  d.setDate(d.getDate() + Math.ceil(months * DAYS_PER_MONTH));
  return d;
}

function monthYear(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Shares out `available` each month across the goals.
 * Priority goals are filled to what they need before anyone else gets a cent.
 *
 * Returns one row per goal, in the order they should be shown:
 * priorities first, then the rest.
 */
export function allocateGoals(goals, available) {
  const pot = Math.max(0, available);

  const ordered = [
    ...goals.filter((g) => g.priority),
    ...goals.filter((g) => !g.priority),
  ];

  let left = pot;

  return ordered.map((goal) => {
    const cost = Number(goal.cost) || 0;
    const saved = Math.min(cost, Math.max(0, Number(goal.saved) || 0));
    const remaining = cost - saved;
    const done = remaining <= 0;

    const daysLeft = Math.ceil((new Date(goal.date) - new Date()) / MS_PER_DAY);
    const months = daysLeft / DAYS_PER_MONTH;
    const overdue = !done && months <= 0;

    // Based on what's LEFT, not the original price — so every deposit
    // you record makes the next one smaller.
    const needed = overdue || done ? 0 : remaining / Math.max(months, 0.1);

    // What it actually gets, after anything above it has taken its share
    const gets = Math.min(needed, left);
    left = Math.max(0, left - gets);

    const shortfall = Math.max(0, needed - gets);
    const onTrack = !overdue && shortfall < 0.5;

    // At the rate it's actually getting, when would it finish?
    let realDate = null;
    let realMonths = null;
    if (!overdue && !done && gets > 0) {
      realMonths = remaining / gets;
      realDate = monthYear(dateAfterMonths(realMonths));
    }

    return {
      ...goal,
      saved,
      remaining,
      done,
      progress: cost > 0 ? (saved / cost) * 100 : 0,
      overdue,
      daysLeft,
      needed,
      gets,
      shortfall,
      onTrack: done || onTrack,
      stalled: !overdue && !done && gets <= 0,
      realDate,
      // How much later than asked, in months — only meaningful when behind
      monthsLate: realMonths && months > 0 ? Math.max(0, realMonths - months) : 0,
      share: pot > 0 ? (gets / pot) * 100 : 0,
    };
  });
}

/**
 * Which subscriptions would you have to drop to cover a shortfall?
 *
 * Prefers the smallest single subscription that covers it — no point
 * suggesting someone cancel a $72 coffee habit when dropping $17 of
 * streaming would do. Falls back to combining the largest ones.
 */
export function suggestCuts(shortfallMonthly, subs) {
  if (shortfallMonthly <= 0 || !subs || subs.length === 0) return null;

  const priced = subs
    .map((s) => ({ name: s.name, cost: monthlyCost(s) }))
    .filter((s) => s.cost > 0);

  if (priced.length === 0) return null;

  // Cheapest single subscription that covers the whole gap
  const single = priced
    .filter((s) => s.cost >= shortfallMonthly)
    .sort((a, b) => a.cost - b.cost)[0];

  if (single) {
    return { cuts: [single], freed: single.cost, enough: true };
  }

  // Otherwise take the biggest ones until the gap is covered
  const sorted = [...priced].sort((a, b) => b.cost - a.cost);
  const cuts = [];
  let freed = 0;

  for (const sub of sorted) {
    cuts.push(sub);
    freed += sub.cost;
    if (freed >= shortfallMonthly) break;
  }

  return { cuts, freed, enough: freed >= shortfallMonthly };
}

/** "Netflix" · "Netflix and Spotify" · "Netflix, Spotify and Gym" */
export function listNames(items) {
  const names = items.map((i) => i.name);
  if (names.length === 1) return names[0];
  if (names.length === 2) return names[0] + " And " + names[1];
  return names.slice(0, -1).join(", ") + " And " + names[names.length - 1];
}
/**
 * How much to put aside on each actual payday.
 *
 * The subtlety: money arrives in lumps, not as a smooth rate. With 75 days
 * until a deadline there are 5.36 fortnights — but you cannot save on a
 * fraction of a payday. Dividing by 5.36 gives a figure that only works if
 * a deposit happens today; miss that and you arrive short. Rounding the
 * number of deposits DOWN is the only version that can't fail.
 */
export function perDeposit(cost, daysLeft, periodDays) {
  const deposits = Math.max(1, Math.floor(daysLeft / periodDays));
  return { deposits, amount: cost / deposits };
}