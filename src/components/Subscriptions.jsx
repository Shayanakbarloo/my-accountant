import { useState } from "react";
import { money } from "../lib/format.js";
import { monthlyCost, describe } from "../lib/Subscriptions.js";

// subs, onAdd, onEdit and onRemove are props — passed down from App.jsx
function Subscriptions({ subs, onAdd, onEdit, onRemove }) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [every, setEvery] = useState("month"); // "month" or "week"
  const [times, setTimes] = useState("1");     // how many times per period

  // null means "adding a new one". An id means "editing that one".
  const [editingId, setEditingId] = useState(null);

  function startEdit(sub) {
    setEditingId(sub.id);
    setName(sub.name);
    setCost(String(sub.cost));
    setEvery(sub.every || "month");
    setTimes(String(sub.times || 1));
  }

  function cancel() {
    setEditingId(null);
    setName("");
    setCost("");
    setEvery("month");
    setTimes("1");
  }

  function save() {
    if (!name || !cost) return;

    const data = {
      name,
      cost: Number(cost),
      every,
      times: Math.max(1, Number(times) || 1),
    };

    if (editingId === null) {
      onAdd(data);
    } else {
      onEdit(editingId, data);
    }
    cancel();
  }

  const total = subs.reduce((sum, sub) => sum + monthlyCost(sub), 0);

  return (
    <div>
      <h3>Subscriptions</h3>

      {subs.length === 0 && <p className="empty">Nothing Added Yet.</p>}

      {subs.map((sub) => (
        <div className="row" key={sub.id}>
          <div className="row-main">
            <div className="row-title">{sub.name}</div>
            <div className="row-note">
              {money(sub.cost)} {describe(sub)}
              {/* Only worth restating the monthly figure when it differs */}
              {monthlyCost(sub) !== Number(sub.cost) &&
                ` · ${money(monthlyCost(sub))} A Month`}
            </div>
          </div>
          <div className="row-actions">
            <button className="link-btn" onClick={() => startEdit(sub)}>
              Edit
            </button>
            <button className="link-btn quiet" onClick={() => onRemove(sub.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}

      {subs.length > 0 && (
        <p className="total-line">
          <strong>{money(total)}</strong> A Month In Total
        </p>
      )}

      <div className={editingId !== null ? "add-row editing" : "add-row"}>
        <input
          placeholder="Netflix"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <input
          type="number"
          placeholder="Cost"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <select value={every} onChange={(e) => setEvery(e.target.value)}>
          <option value="month">A Month</option>
          <option value="week">A Week</option>
        </select>
        <input
          type="number"
          min="1"
          title="How many times per period"
          placeholder="× 1"
          value={times}
          onChange={(e) => setTimes(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button onClick={save}>{editingId === null ? "Add" : "Save"}</button>
        {editingId !== null && (
          <button className="link-btn quiet" onClick={cancel}>
            Cancel
          </button>
        )}
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        The Last Box Is How Many Times You Pay In That Period — A $6 Coffee
        Three Mornings A Week Is 6, A Week, × 3.
      </p>
    </div>
  );
}

export default Subscriptions;