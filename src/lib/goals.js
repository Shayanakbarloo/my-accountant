import { monthlyCost } from "./subscriptions.js";
import { entryList, sumEntries, thisMonth, monthStart } from "./entries.js";

/*  Working out what each goal really gets.

    Goals all want money from the same pot. Marking one as a priority means
    it gets filled first and the others live on what's left — which usually
    means they take longer, so this works out their honest finish date
    rather than pretending nothing changed.                               */


/**
 * What's been put aside so far.
 *
 * Deposits are kept as a list rather than a running total, so any single
 * one can be taken back out if it was typed wrong. Goals saved before
 * that change stored a plain number, so fall back to it.
 */
export function totalSaved(goal) {
  if (Array.isArray(goal.deposits)) {
    return goal.deposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }
  return Number(goal.saved) || 0;
}

/**
 * What's been put aside toward this goal in the month we're currently in.
 *
 * Deposits carried over from an older save have no date on them, so they
 * count toward the total but not toward this month.
 */
export function savedThisMonth(goal, today = new Date()) {
  return sumEntries(thisMonth(entryList(goal.deposits, goal.saved), today));
}

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

function dateAfterMonths(months, today = new Date()) {
  // Months here are four-week blocks, so step in days rather than
  // calendar months — otherwise the finish date drifts.
  const d = new Date(today);
  d.setDate(d.getDate() + Math.ceil(months * DAYS_PER_MONTH));
  return d;
}

/*  "Jan 24, 2027" — with the day, not just the month.

    Month precision isn't enough when the point is whether a date gets
    missed: a goal due 21 Jan that really lands on the 24th would read
    "January 2027", which looks like it arrived on time.               */
function monthYear(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Shares out `available` each month across the goals.
 * Priority goals are filled to what they need before anyone else gets a cent.
 *
 * Returns one row per goal, in the order they should be shown:
 * priorities first, then the rest.
 *
 * `today` is injectable so the month-rollover behaviour can be tested
 * without waiting for December.
 */
export function allocateGoals(goals, available, today = new Date()) {
  const pot = Math.max(0, available);

  const ordered = [
    ...goals.filter((g) => g.priority),
    ...goals.filter((g) => !g.priority),
  ];

  /*  Money already moved into savings this month has left your spending
      money for good. Take it off the top before sharing out the rest, or
      the same dollar gets handed out twice — once as savings, once as
      money you're free to spend.                                        */
  const alreadyPutAside = ordered.reduce(
    (sum, goal) => sum + savedThisMonth(goal, today),
    0
  );

  let left = Math.max(0, pot - alreadyPutAside);

  const start = monthStart(today);

  return ordered.map((goal) => {
    const cost = Number(goal.cost) || 0;
    const saved = Math.min(cost, Math.max(0, totalSaved(goal)));
    const remaining = cost - saved;
    const done = remaining <= 0;

    const putAside = Math.min(cost, savedThisMonth(goal, today));

    const daysLeft = Math.ceil((new Date(goal.date) - today) / MS_PER_DAY);
    const months = daysLeft / DAYS_PER_MONTH;
    const overdue = !done && months <= 0;

    /*  This month's target is worked out from where the goal stood on the
        1st — not from where it stands right now.

        That distinction is the whole point. Recalculated after every
        deposit, paying into a goal would shrink the very target it was
        paying into: put $470 away and the app would quietly decide the goal
        needed $178 less per month, then hand you that $178 back as money to
        spend. Pinned to the 1st, the target holds all month, so a deposit
        pays the target down instead of moving it.                        */
    const atMonthStart = Math.min(cost, remaining + putAside);
    const daysInRun = Math.ceil((new Date(goal.date) - start) / MS_PER_DAY);

    // Whole deposits, same rule as everywhere else — see perDeposit().
    const target =
      done || overdue
        ? 0
        : perDeposit(atMonthStart, daysInRun, DAYS_PER_MONTH).amount;

    // What's still to go this month, and what the pot can actually cover
    const stillThisMonth = Math.max(0, target - putAside);
    const gets = Math.min(stillThisMonth, left);
    left = Math.max(0, left - gets);

    /*  Everything this goal takes out of this month's money: what you've
        already put in, plus whatever still has to come. Overshoot the
        target and this is simply what you put in — so saving extra shows
        up as less to spend, which is what actually happened.            */
    const committed = putAside + gets;

    // How far this month came up short of the ideal pace
    const shortfall = Math.max(0, stillThisMonth - gets);

    /*  The least you can average each month and still arrive by the date.

        `target` above is the IDEAL pace: whole months only, so it finishes
        early and leaves a buffer. Falling below it is not the same thing as
        missing the deadline, and the two were being treated as one. On a
        $2,315 goal due 21 Jan, the ideal pace asks $1,158 a month while
        $888 would do — so someone with $1,086 spare was told they were $72
        short and should cancel a subscription, while the app's own
        projection had them arriving two weeks early.                     */
    const minimum = done || overdue ? 0 : remaining / Math.max(months, 0.1);
    const gap = Math.max(0, minimum - committed);
    const late = !done && !overdue && gap > 0.5;

    const onTrack = !overdue && !late;

    // This month's share is covered — but the goal itself isn't finished
    // until the total is reached, which is what `done` tracks.
    const monthDone = !done && !overdue && stillThisMonth < 0.5;

    // At the rate it's actually getting, when would it finish?
    let realDate = null;
    let realMonths = null;
    if (!overdue && !done && committed > 0) {
      realMonths = remaining / committed;
      realDate = monthYear(dateAfterMonths(realMonths, today));
    }

    return {
      ...goal,
      saved,
      remaining,
      done,
      progress: cost > 0 ? (saved / cost) * 100 : 0,
      overdue,
      daysLeft,

      // ---- this month, which starts over on the 1st ----
      putAside,
      target,
      stillThisMonth,
      monthDone,

      // Kept under its old name too: this month's target is what the
      // "needs" wording has always meant.
      needed: target,

      gets,
      committed,

      // Short of the ideal pace this month…
      shortfall,
      // …versus short of what the deadline actually demands
      minimum,
      gap,
      late,

      onTrack: done || onTrack,
      stalled: !overdue && !done && !monthDone && committed <= 0,
      realDate,
      // How much later than asked, in months — only meaningful when behind
      monthsLate: realMonths && months > 0 ? Math.max(0, realMonths - months) : 0,
      share: pot > 0 ? (committed / pot) * 100 : 0,
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