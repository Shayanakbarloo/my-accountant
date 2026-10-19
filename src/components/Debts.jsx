import { useState } from "react";
import { money } from "../lib/format.js";
import { planForDebt } from "../lib/Debt.js";

function Debts({ debts, freeMonthly, onAdd, onEdit, onRemove }) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [rate, setRate] = useState("");
  const [date, setDate] = useState("");
  const [editingId, setEditingId] = useState(null);

  function startEdit(debt) {
    setEditingId(debt.id);
    setName(debt.name);
    setBalance(String(debt.balance));
    setRate(debt.rate ? String(debt.rate) : "");
    setDate(debt.date || "");
  }

  function cancel() {
    setEditingId(null);
    setName("");
    setBalance("");
    setRate("");
    setDate("");
  }

  function save() {
    if (!name || !balance) return;

    const data = {
      name,
      balance: Number(balance),
      rate: Number(rate) || 0,   // blank rate means 0%
      date: date || null,        // blank date means no deadline
    };

    if (editingId === null) {
      onAdd(data);
    } else {
      onEdit(editingId, data);
    }
    cancel();
  }

  const totalOwed = debts.reduce((sum, debt) => sum + debt.balance, 0);

  return (
    <div>
      <h3>What you owe</h3>

      {debts.length === 0 && (
        <p className="empty">Nothing owed. Good place to be.</p>
      )}

      {debts.map((debt) => {
        const plan = planForDebt(debt, freeMonthly);

        return (
          <div className="row" key={debt.id}>
            <div className="row-main">
              <div className="row-title">{debt.name}</div>

              <div className="row-note">
                {money(debt.balance)}
                {debt.rate > 0 && ` at ${debt.rate}%`}
                {debt.date ? ` · due ${debt.date}` : " · no deadline"}
              </div>

              {plan.stuck ? (
                <div className="row-note bad">
                  Interest alone is {money(plan.monthlyInterest)} a month — more
                  than you have spare. Set a deadline or cut costs.
                </div>
              ) : (
                <>
                  <div
                    className={`row-note ${plan.share > 100 ? "bad" : "good"}`}
                  >
                    {money(plan.payment)} a month — clear by {plan.payoffLabel}
                  </div>
                  {plan.interestPaid > 1 && (
                    <div className="row-note">
                      {money(plan.interestPaid)} of that is interest
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="row-actions">
              <button className="link-btn" onClick={() => startEdit(debt)}>
                Edit
              </button>
              <button
                className="link-btn quiet"
                onClick={() => onRemove(debt.id)}
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}

      {debts.length > 0 && (
        <p className="total-line">
          <strong>{money(totalOwed)}</strong> owed in total
        </p>
      )}

      <div className={editingId !== null ? "add-row editing" : "add-row"}>
        <input
          placeholder="Credit card"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Owed"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
        <input
          type="number"
          placeholder="Rate %"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button onClick={save}>{editingId === null ? "Add" : "Save"}</button>
        {editingId !== null && (
          <button className="link-btn quiet" onClick={cancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default Debts;