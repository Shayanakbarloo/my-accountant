// Works out what one debt demands each month.
// Lives here rather than in the component so App can use it too.
export function planForDebt(debt, freeMonthly) {
  const monthlyRate = debt.rate / 100 / 12;
  const monthlyInterest = debt.balance * monthlyRate;

  let months;
  if (debt.date) {
    const msLeft = new Date(debt.date) - new Date();
    months = Math.max(1, Math.ceil(msLeft / 2629800000));
  } else {
    const guess = freeMonthly * 0.25;
    if (guess <= monthlyInterest) {
      return { stuck: true, monthlyInterest, payment: 0 };
    }
    months = Math.ceil(debt.balance / (guess - monthlyInterest));
  }

  const payment = monthlyRate === 0
    ? debt.balance / months
    : (debt.balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));

  const totalPaid = payment * months;
  const payoff = new Date();
  payoff.setMonth(payoff.getMonth() + months);

  return {
    stuck: false,
    payment,
    months,
    monthlyInterest,
    interestPaid: totalPaid - debt.balance,
    payoffLabel: payoff.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    share: freeMonthly > 0 ? (payment / freeMonthly) * 100 : 999,
  };
}