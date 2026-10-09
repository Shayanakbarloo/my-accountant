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

      {subs.map((sub, index) => (
        <div className="sub-row" key={index}>
          <span>{sub.name}</span>
          <span>
            {money(sub.cost)}
            <button className="remove" onClick={() => onRemove(index)}>Remove</button>
          </span>
        </div>
      ))}

      <div className="add-row">
        <input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input type="number" placeholder="Cost" value={newCost} onChange={(e) => setNewCost(e.target.value)} />
        <button onClick={handleAdd}>Add</button>
      </div>
    </div>
  );
}

export default Subscriptions;