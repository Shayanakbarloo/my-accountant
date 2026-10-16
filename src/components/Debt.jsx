import { useState } from 'react';
import { money } from '../lib/format.js';

function Debts({ debts, freeMonthly, onAdd, onRemove }) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState('');

  function handleAdd() {
    if (!name || !balance) return;
    onAdd({
      name,
      balance: Number(balance),
      rate: Number(rate) || 0,   // blank rate means 0%
      date: date || null,        // blank date means no deadline
    });
    setName('');
    setBalance('');
    setRate('');
    setDate('');
  }

  function planFor(debt) {
    const monthlyRate = debt.rate / 100 / 12;
    const monthlyInterest = debt.balance * monthlyRate;

    let months;
    if (debt.date) {
      // deadline set: months until it arrives
      const msLeft = new Date(debt.date) - new Date();
      months = Math.max(1, Math.ceil(msLeft / 2629800000)); // ms in a month
    } else {
      // no deadline: assume a quarter of spare money goes to it
      const guess = freeMonthly * 0.25;
      if (guess <= monthlyInterest) {
        // interest outruns the payment — this debt would never clear
        return { stuck: true, monthlyInterest };
      }
      months = Math.ceil(debt.balance / (guess - monthlyInterest));
    }

    // Standard loan payment formula. Each payment covers the interest
    // first, then what's left chips away at the balance.
    const payment = monthlyRate === 0
      ? debt.balance / months
      : (debt.balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));

    const totalPaid = payment * months;
    const interestPaid = totalPaid - debt.balance;

    const payoff = new Date();
    payoff.setMonth(payoff.getMonth() + months);

    return {
      stuck: false,
      payment,
      months,
      interestPaid,
      monthlyInterest,
      payoffLabel: payoff.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      share: freeMonthly > 0 ? (payment / freeMonthly) * 100 : 999,
    };
  }

  const totalOwed = debts.reduce((sum, debt) => sum + debt.balance, 0);

  return (
    <div>
      <h3>What you owe</h3>

      {debts.length === 0 && (
        <p style={{ color: 'var(--sub)' }}>Nothing owed. Good place to be.</p>
      )}

      {debts.map((debt) => {
        const plan = planFor(debt);

        return (
          <div className="sub-row" key={debt.id}>
            <div>
              <strong>{debt.name}</strong>

              <div style={{ fontSize: 13, color: 'var(--sub)' }}>
                {money(debt.balance)}
                {debt.rate > 0 && ` at ${debt.rate}%`}
                {debt.date ? ` by ${debt.date}` : ' — no deadline'}
              </div>

              {plan.stuck ? (
                <div style={{ fontSize: 13, color: 'var(--red)' }}>
                  Interest is {money(plan.monthlyInterest)} a month — more than
                  you have spare. Set a deadline or cut costs.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: 13,
                      color: plan.share > 100 ? 'var(--red)' : 'var(--green)',
                    }}
                  >
                    {money(plan.payment)} a month — clear by {plan.payoffLabel}
                  </div>
                  {plan.interestPaid > 1 && (
                    <div style={{ fontSize: 13, color: 'var(--sub)' }}>
                      {money(plan.interestPaid)} of that is interest
                    </div>
                  )}
                </>
              )}
            </div>

            <button className="remove" onClick={() => onRemove(debt.id)}>
              Remove
            </button>
          </div>
        );
      })}

      {debts.length > 0 && (
        <p style={{ marginTop: 16 }}>
          <strong>{money(totalOwed)}</strong> owed in total
        </p>
      )}

      <div className="add-row">
        <input placeholder="Credit card" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="number" placeholder="Owed" value={balance} onChange={(e) => setBalance(e.target.value)} />
        <input type="number" placeholder="Rate %" value={rate} onChange={(e) => setRate(e.target.value)} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button onClick={handleAdd}>Add</button>
      </div>
    </div>
  );
}

export default Debts;