import { useState } from "react";
import { money } from "../lib/format.js";

// The three things in braces are props — values App handed down.
function Subscriptions({ subs, onAdd, onRemove }) {
  // These two only matter inside this box, so they live here, not in App.
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState("");

  function handleAdd() {
    if (!newName || !newCost) return;
    onAdd({ name: newName, cost: Number(newCost) }); // hand it back up to App
    setNewName("");
    setNewCost("");
  }

  return (
    <div>
      <h3>Subscriptions</h3>
      <ul>
        {subs.map((sub, index) => (
          <li key={index}>
            {sub.name} — {money(sub.cost)}
            <button onClick={() => onRemove(index)}>Remove</button>
          </li>
        ))}
      </ul>

      <input
        placeholder="Name"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
      />
      <input
        type="number"
        placeholder="Cost"
        value={newCost}
        onChange={(e) => setNewCost(e.target.value)}
      />
      <button onClick={handleAdd}>Add subscription</button>
    </div>
  );
}

export default Subscriptions;