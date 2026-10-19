import { useState } from "react";
import { money } from "../lib/format.js";

// subs, onAdd, onEdit and onRemove are props — passed down from App.jsx
function Subscriptions({ subs, onAdd, onEdit, onRemove }) {
  // These only matter inside this component, so they live here
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");

  // null means "adding a new one". An id means "editing that one".
  const [editingId, setEditingId] = useState(null);

  function startEdit(sub) {
    setEditingId(sub.id);
    setName(sub.name);
    setCost(String(sub.cost));
  }

  function cancel() {
    setEditingId(null);
    setName("");
    setCost("");
  }

  function save() {
    if (!name || !cost) return;

    if (editingId === null) {
      onAdd({ name, cost: Number(cost) });
    } else {
      onEdit(editingId, { name, cost: Number(cost) });
    }
    cancel();
  }

  const total = subs.reduce((sum, sub) => sum + sub.cost, 0);

  return (
    <div>
      <h3>Subscriptions</h3>

      {subs.length === 0 && (
        <p className="empty">Nothing added yet.</p>
      )}

      {subs.map((sub) => (
        <div className="row" key={sub.id}>
          <div className="row-main">
            <div className="row-title">{sub.name}</div>
            <div className="row-note">{money(sub.cost)} a month</div>
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
          <strong>{money(total)}</strong> a month in total
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

export default Subscriptions;