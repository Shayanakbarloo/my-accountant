import { useState } from "react";
import { money } from "./lib/format.js";
import Subscriptions from "./components/Subscriptions.jsx";
import {useEffect} from "react";
import { yearlyDeductions } from "./lib/tax.js";
function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem("my-accountant"));
    if (saved) return saved;
  } catch (e) {
   
  }
  return {
    rate: "",
    hours: "",
    subs: [
      { name: "Netflix", cost: 17 },
      { name: "Spotify", cost: 11 },
    ],
  };
}
function App() {
  const [rate, setRate] = useState(loadSaved().rate);
  const [hours, setHours] = useState(loadSaved().hours);
  const [subs, setSubs] = useState(loadSaved().subs);

  useEffect(() => {
    localStorage.setItem("my-accountant", JSON.stringify({ rate, hours, subs }));
  }, [rate, hours, subs]);

  const weekly = (Number(rate) || 0) * (Number(hours) || 0);
  const monthly = weekly * 4;

  // Tax is based on what you ACTUALLY earn in a year — 52 weeks, not your
  // 4-week months. Work out the real rate, then apply it to the display figures.
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

export default App;