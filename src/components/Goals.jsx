import { useState } from "react";
import { money } from "../lib/format.js";
import {
  allocateGoals,
  suggestCuts,
  listNames,
  perDeposit,
} from "../lib/goals.js";
import {
  entryList,
  addEntry,
  removeEntry,
  sumEntries,
  monthName,
  nextMonthName,
} from "../lib/entries.js";
import Entries from "./Entries.jsx";

// How to show the "save this much" figure. A month is four weeks here,
// same as everywhere else in the app.
const VIEWS = {
  week:     { label: "A Week", perMonth: 1 / 4, days: 7, each: "Week" },
  biweekly: { label: "Biweekly", perMonth: 2 / 4, days: 14, each: "Two Weeks" },
  month:    { label: "A Month", perMonth: 1, days: 28, each: "Month" },
};

function Goals({ goals, freeMonthly, subs, onAdd, onEdit, onRemove }) {
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [view, setView] = useState("month");

  // What's typed into each goal's "add to savings" box, keyed by goal id
  const [deposit, setDeposit] = useState({});

  /*  Deposits are kept as a list of separate entries rather than one running
      total, so a mistyped one can be deleted on its own.

      Read off the RAW goal, not the row below: allocateGoals clamps `saved`
      to the goal's price, and reading that would quietly lose an
      overpayment.                                                          */
  function depositsFor(id) {
    const raw = goals.find((g) => g.id === id) || {};
    return entryList(raw.deposits, raw.saved);
  }

  function addDeposit(goal) {
    const amount = Number(deposit[goal.id]);
    if (!amount || amount <= 0) return;

    onEdit(goal.id, {
      deposits: addEntry(depositsFor(goal.id), amount),
      // Anything an older save kept as a single number has been folded into
      // the list above; clearing it stops the two disagreeing.
      saved: 0,
    });
    setDeposit({ ...deposit, [goal.id]: "" });
  }

  function dropDeposit(goal, entryId) {
    onEdit(goal.id, {
      deposits: removeEntry(depositsFor(goal.id), entryId),
      saved: 0,
    });
  }

  const v = VIEWS[view];
  // Turns a monthly figure into whichever period is being shown
  const inView = (perMonth) => perMonth * v.perMonth;

  // The saving month rolls over on the 1st. Nothing is stored for this —
  // each deposit carries its own date, so the figures reset on their own.
  const thisMonthName = monthName();
  const followingMonth = nextMonthName();

  function startEdit(goal) {
    setEditingId(goal.id);
    setTitle(goal.title);
    setCost(String(goal.cost));
    setDate(goal.date);
    setPriority(!!goal.priority);
  }

  function cancel() {
    setEditingId(null);
    setTitle("");
    setCost("");
    setDate("");
    setPriority(false);
  }

  function save() {
    if (!title || !cost || !date) return;
    const data = { title, cost: Number(cost), date, priority };
    if (editingId === null) onAdd(data);
    else onEdit(editingId, data);
    cancel();
  }

  // Priority goals are filled first; the rest live on what's left.
  const rows = allocateGoals(goals, freeMonthly);

  /*  Is anything actually going to miss its date, and could dropping a
      subscription fix it?

      Keyed on `late`, not on `shortfall`: coming in under the ideal pace
      is fine as long as the date still gets met. Telling someone to cancel
      a subscription they can afford is how a budgeting app loses trust. */
  const starved = rows.find((r) => r.late);
  const advice = starved ? suggestCuts(starved.gap, subs) : null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ marginBottom: 12 }}>Saving Goals</h3>

        {goals.length > 0 && (
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            style={{ width: "auto", padding: "7px 10px", fontSize: 14 }}
          >
            <option value="week">Show Per Week</option>
            <option value="biweekly">Show Biweekly</option>
            <option value="month">Show Per Month</option>
          </select>
        )}
      </div>

      {goals.length === 0 && <p className="empty">Nothing Planned Yet.</p>}

      {rows.map((goal) => {
        const entries = depositsFor(goal.id);
        // What the entries actually add up to, before any clamping — so an
        // overpayment can be pointed out rather than silently swallowed.
        const entered = sumEntries(entries);

        return (
          <div className="row" key={goal.id}>
            <div className="row-main">
              <div className="row-title">
                {goal.priority && (
                  <span
                    title="Priority — funded first"
                    style={{ marginRight: 6 }}
                  >
                    ★
                  </span>
                )}
                {goal.title}
              </div>

              <div className="row-note">
                {money(goal.cost)} By {goal.date}
                {goal.priority && " · Priority"}
              </div>

              {goal.overdue ? (
                <div className="row-note warn">
                  That Date Has Passed — Pick A New One.
                </div>
              ) : goal.done ? (
                <div className="row-note good">
                  ★ Fully Saved — You Can Buy It.
                </div>
              ) : (
                <>
                  {/*  This month's share. The target is set from where the
                       goal stood on the 1st and holds all month, so paying
                       into it brings this line down instead of moving it. */}
                  <div className={`row-note${goal.monthDone ? " good" : ""}`}>
                    {goal.putAside > goal.target + 0.5 ? (
                      <>
                        {thisMonthName}: {money(goal.putAside)} Put Aside ✓ —{" "}
                        {money(goal.putAside - goal.target)} More Than Asked
                      </>
                    ) : (
                      <>
                        {thisMonthName}: {money(goal.putAside)} Of{" "}
                        {money(goal.target)} Put Aside
                        {goal.monthDone
                          ? " ✓"
                          : ` · ${money(goal.stillThisMonth)} To Go This Month`}
                      </>
                    )}
                  </div>

                  {/*  Covering the month is not finishing the goal — say so
                       plainly, or one good month reads like the end of it. */}
                  {goal.monthDone && (
                    <div className="row-note">
                      Not Finished Yet — {money(goal.remaining)} Left On The
                      Goal. Starts Again In {followingMonth}.
                    </div>
                  )}

                  {/* The same target, in whichever period you picked */}
                  {view !== "month" && !goal.monthDone && (
                    <div className="row-note">
                      That's {money(inView(goal.target))} Every {v.each} —{" "}
                      {money(inView(goal.stillThisMonth))} Of It Still To Go
                    </div>
                  )}

                  {goal.stalled && (
                    <div className="row-note bad">
                      Nothing Spare To Put Toward This Month.
                    </div>
                  )}

                  {!goal.stalled && goal.late && (
                    <>
                      <div className="row-note warn">
                        Only {money(goal.committed)} Spare For It This Month —{" "}
                        {money(goal.gap)} Short Of Making The Date.
                      </div>
                      <div className="row-note">
                        At This Rate You'd Have It By {goal.realDate}
                      </div>
                    </>
                  )}

                  {/*  Below the ideal pace but still arriving in time. Worth
                       saying out loud, otherwise the gap between what's
                       asked and what's spare looks like a problem.       */}
                  {goal.onTrack && !goal.monthDone && goal.shortfall > 0.5 && (
                    <div className="row-note good">
                      {money(goal.committed)} Spare For It This Month — Under
                      The Full Target, But Still In Time For {goal.date}
                    </div>
                  )}

                  {/*  How much of the run is left, so the month sits in
                       context. Deliberately no dollar figure here: this
                       month's target was set from the 1st, and a second,
                       freshly-recalculated rate alongside it would just
                       look like the app contradicting itself.           */}
                  {goal.onTrack && !goal.monthDone && (
                    <div className="row-note good">
                      {(() => {
                        const d = perDeposit(goal.remaining, goal.daysLeft, 28);
                        return `${d.deposits} ${
                          d.deposits === 1 ? "Month" : "Months"
                        } Of Saving Left`;
                      })()}
                    </div>
                  )}
                </>
              )}

              <div className="bar">
                <div
                  className={`bar-fill${goal.done ? " done" : ""}`}
                  style={{ width: Math.min(100, goal.progress) + "%" }}
                />
              </div>
              <div className="bar-text">
                {money(goal.saved)} Of {money(goal.cost)} ·{" "}
                {Math.round(goal.progress)}%
              </div>

              {entered > goal.cost + 0.5 && (
                <div className="row-note">
                  That's {money(entered - goal.cost)} More Than This Goal
                  Needs.
                </div>
              )}

              <div className="save-row">
                <input
                  type="number"
                  placeholder="Saved"
                  value={deposit[goal.id] || ""}
                  onChange={(e) =>
                    setDeposit({ ...deposit, [goal.id]: e.target.value })
                  }
                  onKeyDown={(e) => e.key === "Enter" && addDeposit(goal)}
                />
                <button onClick={() => addDeposit(goal)}>Add</button>
                <span className="muted" style={{ fontSize: 13 }}>
                  {goal.done ? "Fully Saved" : `${money(goal.remaining)} To Go`}
                </span>
              </div>

              {/*  Every deposit you've recorded, each with an × — so a wrong
                   one is removed by deleting it, not by subtracting it.    */}
              <Entries
                entries={entries}
                label="Deposit"
                onRemove={(entryId) => dropDeposit(goal, entryId)}
              />
            </div>

            <div className="row-actions">
              <button
                className="link-btn"
                title={
                  goal.priority ? "Remove priority" : "Make this a priority"
                }
                onClick={() => onEdit(goal.id, { priority: !goal.priority })}
              >
                {goal.priority ? "Unpin" : "Prioritise"}
              </button>
              <button className="link-btn" onClick={() => startEdit(goal)}>
                Edit
              </button>
              <button
                className="link-btn quiet"
                onClick={() => onRemove(goal.id)}
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}

      {/* What to drop, when something can't be funded */}
      {starved && advice && (
        <div
          style={{
            marginTop: 16,
            padding: "14px 16px",
            background: "var(--gray)",
            borderRadius: 12,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <strong>To Get {starved.title} Back On Track</strong>
          <div style={{ marginTop: 6 }}>
            You're {money(inView(starved.gap))} {v.label} Short Of Its Date.{" "}
            {advice.enough ? (
              <>
                Cancelling <strong>{listNames(advice.cuts)}</strong> Would Free
                Up {money(inView(advice.freed))} {v.label} — Enough To Cover It.
              </>
            ) : (
              <>
                Even Dropping Every Subscription Only Frees{" "}
                {money(inView(advice.freed))} {v.label}, So You'd Also Need To
                Push The Date Back Or Clear Some Debt First.
              </>
            )}
          </div>
        </div>
      )}

      {starved && !advice && (
        <div
          style={{
            marginTop: 16,
            padding: "14px 16px",
            background: "var(--gray)",
            borderRadius: 12,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <strong>
            {starved.title} Is Short {money(inView(starved.gap))} {v.label}
          </strong>
          <div style={{ marginTop: 6 }}>
            There Are No Subscriptions To Cut, So The Options Are A Later Date,
            Fewer Goals, Or More Hours.
          </div>
        </div>
      )}

      <div className={editingId !== null ? "add-row editing" : "add-row"}>
        <input
          placeholder="New Laptop"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="number"
          placeholder="Cost"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
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

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={priority}
          onChange={(e) => setPriority(e.target.checked)}
          style={{ width: "auto", margin: 0 }}
        />
        Make This A Priority — Fund It Before Anything Else
      </label>
    </div>
  );
}

export default Goals;