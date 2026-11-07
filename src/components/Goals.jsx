import { useState } from "react";
import { money } from "../lib/format.js";
import { allocateGoals, suggestCuts, listNames } from "../lib/goals.js";

// How to show the "save this much" figure. A month is four weeks here,
// same as everywhere else in the app.
const VIEWS = {
  week:     { label: "A Week", perMonth: 1 / 4 },
  biweekly: { label: "Every Two Weeks", perMonth: 2 / 4 },
  month:    { label: "A Month", perMonth: 1 },
};

function Goals({ goals, freeMonthly, subs, onAdd, onEdit, onRemove }) {
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [view, setView] = useState("month");

  const v = VIEWS[view];
  // Turns a monthly figure into whichever period is being shown
  const inView = (perMonth) => perMonth * v.perMonth;

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

  // Is anything being starved, and could dropping a subscription fix it?
  const starved = rows.find((r) => !r.overdue && r.shortfall > 0.5);
  const advice = starved ? suggestCuts(starved.shortfall, subs) : null;

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
            <option value="biweekly">Show Per Two Weeks</option>
            <option value="month">Show Per Month</option>
          </select>
        )}
      </div>

      {goals.length === 0 && <p className="empty">Nothing Planned Yet.</p>}

      {rows.map((goal) => (
        <div className="row" key={goal.id}>
          <div className="row-main">
            <div className="row-title">
              {goal.priority && (
                <span title="Priority — funded first" style={{ marginRight: 6 }}>
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
            ) : goal.stalled ? (
              <div className="row-note bad">
                Nothing Left To Put Toward This. It Needs{" "}
                {money(inView(goal.needed))} {v.label}.
              </div>
            ) : goal.onTrack ? (
              <div className="row-note good">
                Save {money(inView(goal.gets))} {v.label} — On Track
              </div>
            ) : (
              <>
                <div className="row-note warn">
                  Getting {money(inView(goal.gets))} {v.label}, Needs{" "}
                  {money(inView(goal.needed))}
                </div>
                <div className="row-note">
                  At This Rate You'd Have It By {goal.realDate}
                </div>
              </>
            )}
          </div>

          <div className="row-actions">
            <button
              className="link-btn"
              title={goal.priority ? "Remove priority" : "Make this a priority"}
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
      ))}

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
            You're {money(inView(starved.shortfall))} {v.label} Short.{" "}
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
          <strong>{starved.title} Is Short {money(inView(starved.shortfall))}{" "}
          {v.label}</strong>
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