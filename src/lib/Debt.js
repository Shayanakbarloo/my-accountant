// Works out what one debt demands each month.
// Lives here rather than in the component so App can use it too.

export function planForDebt(debt, freeMonthly) {
  const balance = Number(debt.balance) || 0;
  const monthlyRate = (Number(debt.rate) || 0) / 100 / 12;
  const monthlyInterest = balance * monthlyRate;

  if (balance <= 0) {
    return { stuck: false, cleared: true, payment: 0, monthlyInterest: 0 };
  }

  let months;

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
      };
    }
    months = Math.ceil(balance / (guess - monthlyInterest));
  }

  // Standard loan payment formula. Each payment covers the interest
  // first, then what's left chips away at the balance.
  const payment =
    monthlyRate === 0
      ? balance / months
      : (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));

  const totalPaid = payment * months;

  const payoff = new Date();
  payoff.setMonth(payoff.getMonth() + months);

  return {
    stuck: false,
    cleared: false,
    payment,
    months,
    monthlyInterest,
    interestPaid: totalPaid - balance,
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