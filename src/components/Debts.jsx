import { useState } from "react";
import { money } from "../lib/format.js";
import { planForDebt } from "../lib/Debt.js";

function Debts({ debts, freeMonthly, onAdd, onEdit, onRemove }) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [rate, setRate] = useState("");
  const [date, setDate] = useState("");
  const [editingId, setEditingId] = useState(null);

  // What's typed into each debt's "record a payment" box, keyed by id
  const [payment, setPayment] = useState({});

  // sign is +1 to record a payment, -1 to take back a mistyped one
  function recordPayment(debt, sign = 1) {
    const amount = Number(payment[debt.id]);
    if (!amount || amount <= 0) return;
    const current = Number(debt.paid) || 0;
    // Stays between nothing and the original balance
    const next = Math.max(0, Math.min(debt.balance, current + sign * amount));
    onEdit(debt.id, { paid: next });
    setPayment({ ...payment, [debt.id]: "" });
  }

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

  const totalOwed = debts.reduce(
    (sum, debt) => sum + planForDebt(debt, freeMonthly).balance,
    0
  );

  return (
    <div>
      <h3>What You Owe</h3>

      {debts.length === 0 && (
        <p className="empty">Nothing Owed. Good Place To Be.</p>
      )}

      {debts.map((debt) => {
        const plan = planForDebt(debt, freeMonthly);

        return (
          <div className="row" key={debt.id}>
            <div className="row-main">
              <div className="row-title">{debt.name}</div>

              <div className="row-note">
                {money(plan.balance)} Left Of {money(plan.original)}
                {debt.rate > 0 && ` At ${debt.rate}%`}
                {debt.date ? ` · Due ${debt.date}` : " · No Deadline"}
              </div>

              {plan.cleared ? (
                <div className="row-note good">★ Paid Off — Nothing Left.</div>
              ) : plan.stuck ? (
                <div className="row-note bad">
                  Interest Alone Is {money(plan.monthlyInterest)} A Month — More
                  Than You Have Spare. Set A Deadline Or Cut Costs.
                </div>
              ) : (
                <>
                  <div
                    className={`row-note ${plan.share > 100 ? "bad" : "good"}`}
                  >
                    {money(plan.payment)} A Month — Clear By {plan.payoffLabel}
                  </div>
                  {plan.interestPaid > 1 && (
                    <div className="row-note">
                      {money(plan.interestPaid)} Of That Is Interest
                    </div>
                  )}
                </>
              )}

              <div className="bar">
                <div
                  className="bar-fill"
                  style={{ width: Math.min(100, plan.progress) + "%" }}
                />
                <span className="bar-text">
                  {money(plan.paid)} Paid Of {money(plan.original)} ·{" "}
                  {Math.round(plan.progress)}%
                </span>
              </div>

              {!plan.cleared && (
                <div className="save-row">
                  <input
                    type="number"
                    placeholder="Paid"
                    value={payment[debt.id] || ""}
                    onChange={(e) =>
                      setPayment({ ...payment, [debt.id]: e.target.value })
                    }
                    onKeyDown={(e) => e.key === "Enter" && recordPayment(debt)}
                  />
                  <button onClick={() => recordPayment(debt, 1)}>Add</button>
                  {plan.paid > 0 && (
                    <button
                      className="undo"
                      title="Take this amount back off"
                      onClick={() => recordPayment(debt, -1)}
                    >
                      −
                    </button>
                  )}
                  <span className="muted" style={{ fontSize: 13 }}>
                    {money(plan.balance)} To Go
                  </span>
                </div>
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
          <strong>{money(totalOwed)}</strong> Owed In Total
        </p>
      )}

      <div className={editingId !== null ? "add-row editing" : "add-row"}>
        <input
          placeholder="Credit Card"
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