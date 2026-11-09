import { useState } from "react";
import { money } from "../lib/format.js";
import { planDebts } from "../lib/Debt.js";
import {
  entryList,
  addEntry,
  removeEntry,
  sumEntries,
  monthName,
  nextMonthName,
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

  // Every debt planned together — the same plan App uses for the totals,
  // so a row never disagrees with the chart or Free To Spend.
  const plans = planDebts(debts, freeMonthly);

  const totalOwed = plans.reduce((sum, plan) => sum + plan.balance, 0);

  // The paying month rolls over on the 1st. Nothing is stored for this —
  // each payment carries its own date, so the figures reset on their own.
  const thisMonthName = monthName();
  const followingMonth = nextMonthName();

  return (
    <div>
      <h3>What You Owe</h3>

      {debts.length === 0 && (
        <p className="empty">Nothing Owed. Good Place To Be.</p>
      )}

      {debts.map((debt, i) => {
        const plan = plans[i];
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
                  {/*  This month's share. Worked out from the balance as it
                       stood on the 1st, so a payment brings this line down
                       rather than quietly lowering the figure itself.     */}
                  <div className={`row-note${plan.monthDone ? " good" : ""}`}>
                    {plan.paidNow > plan.payment + 0.5 ? (
                      <>
                        {thisMonthName}: {money(plan.paidNow)} Paid ✓ —{" "}
                        {money(plan.paidNow - plan.payment)} More Than Asked
                      </>
                    ) : (
                      <>
                        {thisMonthName}: {money(plan.paidNow)} Of{" "}
                        {money(plan.payment)} Paid
                        {plan.monthDone
                          ? " ✓"
                          : ` · ${money(plan.stillThisMonth)} To Go This Month`}
                      </>
                    )}
                  </div>

                  {plan.monthDone && (
                    <div className="row-note">
                      Still {money(plan.balance)} Owed. Starts Again In{" "}
                      {followingMonth}.
                    </div>
                  )}

                  <div
                    className={`row-note ${plan.share > 100 ? "bad" : "good"}`}
                  >
                    Keep That Up And It's Clear By {plan.payoffLabel}
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