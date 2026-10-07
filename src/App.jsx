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
    <div>
      <h1>My Accountant</h1>

      <label>
        How much do you earn per hour?
        <input
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
      </label>

      <label>
        How many hours do you work per week?
        <input
          type="number"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
      </label>

      <h2>{money(monthly)} per month</h2>

      <Subscriptions
        subs={subs}
        onAdd={(sub) => setSubs([...subs, sub])}
        onRemove={(index) => setSubs(subs.filter((s, i) => i !== index))}
      />

      <h2>{money(subsTotal)} a month on subscriptions</h2>
      <h2>{money(leftOver)} left over</h2>
    </div>
  );
}

export default App;