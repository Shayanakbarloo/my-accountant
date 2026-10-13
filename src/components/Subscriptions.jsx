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
    <div className="page">
      <h1>My Accountant</h1>
      <p className="tagline">Know what you keep. Plan what's next.</p>

      <div className="card">
        <label className="field">
          <span>How much do you earn per hour?</span>
          <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
        </label>

        <label className="field">
          <span>How many hours do you work per week?</span>
          <input type="number" value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
      </div>

      <div className="card">
        <p className="figure-label">You earn</p>
        <p className="figure">{money(monthly)}</p>
        <p className="figure-label">a month, before anything comes out</p>
      </div>

      
      <div className="card">
        <p className="figure-label">After tax</p>
        <p className="figure">{money(takeHomeMonthly)}</p>
        <p className="figure-label">
          {(taxRate * 100).toFixed(1)}% of your pay goes to tax and deductions
        </p>
      </div>
      

      <div className="card">
        <Subscriptions
          subs={subs}
          onAdd={(sub) => setSubs([...subs, sub])}
          onRemove={(index) => setSubs(subs.filter((s, i) => i !== index))}
        />
      </div>

      <div className="card">
        <p className="figure-label">After subscriptions</p>
        <p className="figure">{money(leftOver)}</p>
        <p className="figure-label">{money(subsTotal)} a month on subscriptions</p>
      </div>
    </div>
  
  );
}

export default Subscriptions;