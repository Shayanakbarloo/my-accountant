import { useState } from "react";
import { money } from "./lib/format.js";
import Subscriptions from "./components/Subscriptions.jsx";

function App() {
  const [rate, setRate] = useState("");
  const [hours, setHours] = useState("");
  const [subs, setSubs] = useState([
    { name: "Netflix", cost: 17 },
    { name: "Spotify", cost: 11 },
  ]);

  const weekly = (Number(rate) || 0) * (Number(hours) || 0);
  const monthly = weekly * 4;
  const subsTotal = subs.reduce((total, sub) => total + sub.cost, 0);
  const leftOver = monthly - subsTotal;

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