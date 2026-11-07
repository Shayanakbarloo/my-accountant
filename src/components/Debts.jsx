import { useState } from "react";
import { money } from "../lib/format.js";
import { planForDebt } from "../lib/Debt.js";
import {
  entryList,
  addEntry,
  removeEntry,
  sumEntries,
} from "../lib/entries.js";
import Entries from "./Entries.jsx";

function Debts({ debts, freeMonthly, onAdd, onEdit, onRemove }) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [rate, setRate] = useState("");
  const [date, setDate] = useState("");
  const [editingId, setEditingId] = useState(null);

  // What's typed into each debt's "record a payment" box, keyed by id
  const [payment, setPayment] = useState({});

  /*  Payments are kept as a list of separate entries rather than one running
      total, so a mistyped one can be deleted on its own instead of having to
      be subtracted back out.                                               */
  function paymentsFor(debt) {
    return entryList(debt.payments, debt.paid);
  }

  function addPayment(debt) {
    const amount = Number(payment[debt.id]);
    if (!amount || amount <= 0) return;

    onEdit(debt.id, {
      payments: addEntry(paymentsFor(debt), amount),
      // Anything an older save kept as a single number has been folded into
      // the list above; clearing it stops the two disagreeing.
      paid: 0,
    });
    setPayment({ ...payment, [debt.id]: "" });
  }

  function dropPayment(debt, entryId) {
    onEdit(debt.id, {
      payments: removeEntry(paymentsFor(debt), entryId),
      paid: 0,
    });
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
        const entries = paymentsFor(debt);
        // What the entries actually add up to, before any clamping — so an
        // overpayment can be pointed out rather than silently swallowed.
        const entered = sumEntries(entries);

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
              </div>
              <div className="bar-text">
                {money(plan.paid)} Paid Of {money(plan.original)} ·{" "}
                {Math.round(plan.progress)}%
              </div>

              {entered > plan.original + 0.5 && (
                <div className="row-note">
                  That's {money(entered - plan.original)} More Than You Owed.
                </div>
              )}

              <div className="save-row">
                <input
                  type="number"
                  placeholder="Paid"
                  value={payment[debt.id] || ""}
                  onChange={(e) =>
                    setPayment({ ...payment, [debt.id]: e.target.value })
                  }
                  onKeyDown={(e) => e.key === "Enter" && addPayment(debt)}
                />
                <button onClick={() => addPayment(debt)}>Add</button>
                <span className="muted" style={{ fontSize: 13 }}>
                  {plan.cleared
                    ? "Paid Off"
                    : `${money(plan.balance)} To Go`}
                </span>
              </div>

              {/*  Every payment you've recorded, each with an × — so a wrong
                   one is removed by deleting it, not by subtracting it.    */}
              <Entries
                entries={entries}
                label="Payment"
                onRemove={(entryId) => dropPayment(debt, entryId)}
              />
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