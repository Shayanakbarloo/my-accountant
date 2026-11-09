// Works out what one debt demands each month.
// Lives here rather than in the component so App can use it too.

import { entryList, sumEntries, thisMonth, monthStart } from "./entries.js";

/**
 * What's been paid toward this debt in the month we're currently in.
 *
 * Payments carried over from an older save have no date on them, so they
 * count toward the total but not toward this month.
 */
export function paidThisMonth(debt, today = new Date()) {
  return sumEntries(thisMonth(entryList(debt.payments, debt.paid), today));
}

/**
 * What's been paid off so far.
 *
 * Payments are kept as a list rather than a running total, so any single
 * one can be taken back out if it was typed wrong. Debts saved before
 * that change stored a plain number, so fall back to it.
 */
export function totalPaid(debt) {
  if (Array.isArray(debt.payments)) {
    return debt.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }
  return Number(debt.paid) || 0;
}

export function planForDebt(
  debt,
  freeMonthly,
  today = new Date(),
  // For a debt with no deadline: the monthly payment to plan around.
  // planDebts() below works this out so several debts share one budget.
  { suggested } = {}
) {
  const original = Number(debt.balance) || 0;

  // What you've already paid off. Interest is charged on what's LEFT,
  // so every payment you record makes the next one cheaper.
  const paid = Math.min(original, Math.max(0, totalPaid(debt)));
  const balance = original - paid;

  // Of that, what you've paid in the month we're in now
  const paidNow = Math.min(original, paidThisMonth(debt, today));

  /*  Where the debt stood on the 1st. The month's payment is worked out
      from this rather than from today's balance — otherwise paying into
      the debt would lower the very payment it was meant to be paying,
      and the app would tell you that you had more money to spend for
      having paid your credit card.                                      */
  const atMonthStart = Math.min(original, balance + paidNow);

  const monthlyRate = (Number(debt.rate) || 0) / 100 / 12;
  const monthlyInterest = balance * monthlyRate;

  const progress = original > 0 ? (paid / original) * 100 : 0;

  if (balance <= 0) {
    return {
      stuck: false,
      cleared: true,
      payment: 0,
      monthlyInterest: 0,
      original,
      paid,
      balance: 0,
      progress: 100,
      paidNow,
      stillThisMonth: 0,
      // Money really did leave your pocket this month, even on a debt
      // that's now clear.
      committed: paidNow,
      monthDone: true,
    };
  }

  let months;
  let fixedPayment = null; // set only when there's no deadline

  if (debt.date) {
    // Deadline set: work backwards from it — from the start of this month,
    // so the figure holds steady all month.
    /*  One payment in each calendar month, from this one up to the due
        date — counting the due month itself only if the date falls after
        its 1st, since a payment due on the 1st has to be made the month
        before.

        This used to divide by 30.44 days and round UP. Due 1 February,
        that counted four payments — November, December, January and a
        February one that's already too late — so the payment came out
        too small and the plan finished in March.                        */
    const [dueYear, dueMonth, dueDay] = String(debt.date).split("-").map(Number);
    months = Math.max(
      1,
      (dueYear - today.getFullYear()) * 12 +
        (dueMonth - 1 - today.getMonth()) +
        (dueDay > 1 ? 1 : 0)
    );
  } else {
    // No deadline: a share of spare money goes toward it — a quarter of it,
    // unless planDebts() has split that quarter between several debts.
    const guess = suggested ?? Math.max(0, freeMonthly) * 0.25;

    // If interest outruns the payment, the balance would grow forever.
    if (guess <= monthlyInterest) {
      return {
        stuck: true,
        cleared: false,
        payment: 0,
        monthlyInterest,
        original,
        paid,
        balance,
        progress,
        paidNow,
        stillThisMonth: 0,
        committed: paidNow,
        monthDone: false,
      };
    }
    // With no deadline the payment is the thing you choose, so hold it
    // steady and let the finish date move. Deriving a payment from a
    // rounded term instead made it jump around as the balance fell —
    // paying extra could make next month's figure larger, which is daft.
    fixedPayment = guess;
    months =
      monthlyRate === 0
        ? balance / guess
        : -Math.log(1 - (monthlyRate * balance) / guess) /
          Math.log(1 + monthlyRate);
  }

  /*  With a deadline, the payment comes from the standard loan formula:
      each payment covers the interest first, then chips at the balance.
      Worked out on the balance as it stood on the 1st, so recording a
      payment pays this month's figure down rather than shrinking it.    */
  const payment =
    fixedPayment !== null
      ? fixedPayment
      : monthlyRate === 0
      ? atMonthStart / months
      : (atMonthStart * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -months));

  // What the whole term costs at that payment. Named for the term, not
  // "totalPaid" — that's the helper up top, and a local of the same name
  // would shadow it everywhere in this function.
  const paidOverTerm = payment * months;

  // What's still to pay this month, and everything this debt takes out of
  // this month's money in total. Pay more than the figure asks and
  // `committed` is simply what you paid — so the extra shows up as less
  // left to spend, which is what actually happened.
  const stillThisMonth = Math.max(0, payment - paidNow);
  const committed = paidNow + stillThisMonth;

  /*  When the last payment lands. With a deadline, that's the month of the
      final scheduled payment — this month counts as the first. Without
      one, months can be fractional, so step forward in average months.  */
  const payoff = debt.date
    ? new Date(today.getFullYear(), today.getMonth() + months - 1, 1)
    : new Date(today.getTime() + Math.ceil(months * 30.44) * 86400000);

  return {
    stuck: false,
    cleared: false,
    original,
    paid,
    balance,
    progress,
    payment,
    months,
    monthlyInterest,
    interestPaid: paidOverTerm - balance,
    payoffLabel: payoff.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),

    // ---- this month, which starts over on the 1st ----
    paidNow,
    stillThisMonth,
    committed,
    monthDone: stillThisMonth < 0.5,

    share: freeMonthly > 0 ? (committed / freeMonthly) * 100 : 999,
  };
}

/**
 * Plans every debt together, so they can't promise away more than you have.
 *
 * A debt with a deadline is fixed by it. The ones without a deadline used to
 * each take a quarter of your spare money on their own — two took half,
 * four took all of it, five took 125%. Now they SHARE one quarter of what's
 * spare after the deadline debts, split by how much each one owes, so
 * bigger balances get more and they tend to clear around the same time.
 *
 * Returns plans in the same order as `debts`.
 */
export function planDebts(debts, freeMonthly, today = new Date()) {
  // Deadline debts first — their payments are set by their dates
  const fixed = new Map();
  for (const debt of debts) {
    if (debt.date) fixed.set(debt.id, planForDebt(debt, freeMonthly, today));
  }
  const fixedCost = [...fixed.values()].reduce((t, p) => t + p.committed, 0);

  // One budget for everything without a deadline
  const open = debts.filter((d) => !d.date);
  const budget = Math.max(0, freeMonthly - fixedCost) * 0.25;

  // Split by balance as it stood on the 1st, so paying one debt this month
  // doesn't shift the others' shares around mid-month.
  const owedAtStart = (debt) => {
    const original = Number(debt.balance) || 0;
    const paid = Math.min(original, totalPaid(debt));
    return Math.max(0, original - paid + Math.min(original, paidThisMonth(debt, today)));
  };
  const openTotal = open.reduce((t, d) => t + owedAtStart(d), 0);

  return debts.map((debt) => {
    if (debt.date) return fixed.get(debt.id);
    const share = openTotal > 0 ? owedAtStart(debt) / openTotal : 0;
    return planForDebt(debt, freeMonthly, today, { suggested: budget * share });
  });
}