import { useState } from "react";
import { money } from "../lib/format.js";
import { planForGoal } from "../lib/Debt.js";

function Goals({ goals, freeMonthly, onAdd, onEdit, onRemove }) {
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState("");
  const [editingId, setEditingId] = useState(null);

  function startEdit(goal) {
    setEditingId(goal.id);
    setTitle(goal.title);
    setCost(String(goal.cost));
    setDate(goal.date);
  }

  function cancel() {
    setEditingId(null);
    setTitle("");
    setCost("");
    setDate("");
  }

  function save() {
    if (!title || !cost || !date) return;

    const data = { title, cost: Number(cost), date };

    if (editingId === null) {
      onAdd(data);
    } else {
      onEdit(editingId, data);
    }
    cancel();
  }

  return (
    <div>
      <h3>Saving Goals</h3>

      {goals.length === 0 && (
        <p className="empty">Nothing Planned Yet.</p>
      )}

      {goals.map((goal) => {
        const plan = planForGoal(goal, freeMonthly);

        return (
          <div className="row" key={goal.id}>
            <div className="row-main">
              <div className="row-title">{goal.title}</div>

              <div className="row-note">
                {money(goal.cost)} By {goal.date}
              </div>

              {plan.overdue ? (
                <div className="row-note warn">
                  That Date Has Passed — Pick A New One.
                </div>
              ) : (
                <div className={`row-note ${plan.share > 100 ? "bad" : "good"}`}>
                  {money(plan.perMonth)} A Month — {Math.round(plan.share)}% Of
                  What's Spare
                </div>
              )}
            </div>

            <div className="row-actions">
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
    </div>
  );
}

export default Goals;