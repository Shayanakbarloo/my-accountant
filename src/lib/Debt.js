// Works out what one debt demands each month.
// Lives here rather than in the component so App can use it too.

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

export function planForDebt(debt, freeMonthly) {
  const original = Number(debt.balance) || 0;

  // What you've already paid off. Interest is charged on what's LEFT,
  // so every payment you record makes the next one cheaper.
  const paid = Math.min(original, Math.max(0, totalPaid(debt)));
  const balance = original - paid;

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
    };
  }

  let months;
  let fixedPayment = null; // set only when there's no deadline

  if (debt.date) {
    // Deadline set: work backwards from it.
    const msLeft = new Date(debt.date) - new Date();
    months = Math.max(1, Math.ceil(msLeft / 2629800000)); // ms in a month
  } else {
    // No deadline: assume a quarter of spare money goes toward it.
    const guess = Math.max(0, freeMonthly) * 0.25;

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

  // With a deadline, the payment comes from the standard loan formula:
  // each payment covers the interest first, then chips at the balance.
  const payment =
    fixedPayment !== null
      ? fixedPayment
      : monthlyRate === 0
      ? balance / months
      : (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));

  // What the whole term costs at that payment. Named for the term, not
  // "totalPaid" — that's the helper up top, and a local of the same name
  // would shadow it everywhere in this function.
  const paidOverTerm = payment * months;

  const payoff = new Date();
  payoff.setDate(payoff.getDate() + Math.ceil(months * 30.44));

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
    share: freeMonthly > 0 ? (payment / freeMonthly) * 100 : 999,
  };
}

// What one saving goal needs each month.
export function planForGoal(goal, freeMonthly) {
  const daysLeft = Math.ceil((new Date(goal.date) - new Date()) / 86400000);

  if (daysLeft <= 0) {
    return { overdue: true, perMonth: 0, share: 0 };
  }

  const perMonth = Number(goal.cost) / (daysLeft / 30.44);

  return {
    overdue: false,
    daysLeft,
    perMonth,
    share: freeMonthly > 0 ? (perMonth / freeMonthly) * 100 : 999,
  };
}