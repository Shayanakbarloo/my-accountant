import { useState, useEffect } from "react";
import { money } from "./lib/format.js";
import { yearlyDeductions } from "./lib/tax.js";
import Subscriptions from "./components/Subscriptions.jsx";
import Goals from "./components/Goals.jsx";

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem("my-accountant"));
    if (saved) return saved;
  } catch (e) {
    // corrupted save — fall back to defaults
  }
  return {
    rate: "",
    hours: "",
    subs: [
      { name: "Netflix", cost: 17 },
      { name: "Spotify", cost: 11 },
    ],
    goals: [],
  };
}

const saved = loadSaved();

function App() {
  const [rate, setRate] = useState(saved.rate);
  const [hours, setHours] = useState(saved.hours);
  const [subs, setSubs] = useState(saved.subs);
  const [goals, setGoals] = useState(saved.goals || []);

  useEffect(() => {
    localStorage.setItem("my-accountant", JSON.stringify({ rate, hours, subs, goals }));
  }, [rate, hours, subs, goals]);

  const weekly = (Number(rate) || 0) * (Number(hours) || 0);
  const monthly = weekly * 4;

  const trueYearly = weekly * 52;
  const deductions = yearlyDeductions(trueYearly);
  const taxRate = trueYearly > 0 ? deductions.total / trueYearly : 0;

  const takeHomeMonthly = monthly * (1 - taxRate);
  const subsTotal = subs.reduce((total, sub) => total + sub.cost, 0);
  const leftOver = takeHomeMonthly - subsTotal;

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

      <div className="card">
        <Goals
          goals={goals}
          freeMonthly={leftOver}
          onAdd={(goal) => setGoals([...goals, { ...goal, id: Date.now() }])}
          onRemove={(id) => setGoals(goals.filter((g) => g.id !== id))}
        />
      </div>
    </div>
  );
}

export default App;