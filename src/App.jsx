import { useState, useEffect } from "react";
import { money } from "./lib/format.js";
import { yearlyDeductions, PROVINCES } from "./lib/tax.js";
import { monthlyCost } from "./lib/Subscriptions.js";
import { planForDebt, planForGoal } from "./lib/Debt.js";
import Subscriptions from "./components/Subscriptions.jsx";
import Debts from "./components/Debts.jsx";
import Goals from "./components/Goals.jsx";
import Breakdown from "./components/Breakdown.jsx";

// Runs once when the file loads. Reads whatever was saved last time.
function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem("my-accountant"));
    if (saved) return saved;
  } catch (e) {
    // Saved data was corrupted somehow — fall through to the defaults
    // rather than crashing the whole app on a blank screen.
  }
  return {
    rate: "",
    hours: "",
    province: "ON",
    subs: [
      { id: 1, name: "Netflix", cost: 17 },
      { id: 2, name: "Spotify", cost: 11 },
    ],
    debts: [],
    goals: [],
  };
}

const saved = loadSaved();

// Older saves stored subscriptions without ids. Give them one on the way in
// so editing and removing work on data from before that change.
function withIds(list) {
  return (list || []).map((item, index) => ({
    id: item.id ?? Date.now() + index,
    ...item,
  }));
}

function App() {
  const [rate, setRate] = useState(saved.rate);
  const [hours, setHours] = useState(saved.hours);
  const [province, setProvince] = useState(saved.province || "ON");
  const [subs, setSubs] = useState(withIds(saved.subs));
  const [debts, setDebts] = useState(withIds(saved.debts));
  const [goals, setGoals] = useState(withIds(saved.goals));

  // Saves to the browser whenever any of these change.
  useEffect(() => {
    localStorage.setItem(
      "my-accountant",
      JSON.stringify({ rate, hours, province, subs, debts, goals })
    );
  }, [rate, hours, province, subs, debts, goals]);

  /* ---------- the money, worked out in order ---------- */

  const weekly = (Number(rate) || 0) * (Number(hours) || 0);
  const monthly = weekly * 4;

  // Tax applies to what you really earn in a year — 52 weeks, not 4-week
  // months. Work out the real rate there, then apply it to the display figures.
  const trueYearly = weekly * 52;
  const deductions = yearlyDeductions(trueYearly, province);
  const taxRate = trueYearly > 0 ? deductions.total / trueYearly : 0;

  const takeHomeMonthly = monthly * (1 - taxRate);
  const taxCost = monthly - takeHomeMonthly;

  const subsTotal = subs.reduce((total, sub) => total + monthlyCost(sub), 0);
  const leftOver = takeHomeMonthly - subsTotal;

  // What every debt costs you each month, added up.
  const debtCost = debts.reduce(
    (total, debt) => total + planForDebt(debt, leftOver).payment,
    0
  );

  // Goals compete with debts for the same money, so they only get what's left.
  const freeForGoals = leftOver - debtCost;

  const goalCost = goals.reduce(
    (total, goal) => total + planForGoal(goal, freeForGoals).perMonth,
    0
  );

  const trulyFree = freeForGoals - goalCost;

  /* ---------- list handlers ---------- */
  // One pattern, used three times: add appends, edit replaces by id,
  // remove filters by id. Each builds a NEW array rather than changing
  // the old one, which is what tells React something changed.

  const add = (setter, list) => (item) =>
    setter([...list, { ...item, id: Date.now() }]);

  const edit = (setter, list) => (id, changes) =>
    setter(list.map((item) => (item.id === id ? { ...item, ...changes } : item)));

  const remove = (setter, list) => (id) =>
    setter(list.filter((item) => item.id !== id));

  return (
    <div className="page">
      <h1>My Accountant</h1>
      <p className="tagline">Know what you keep. Plan what's next.</p>

      <div className="card">
        <label className="field">
          <span>How much do you earn per hour?</span>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="25"
          />
        </label>

        <label className="field">
          <span>How many hours do you work per week?</span>
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="40"
          />
        </label>

        <label className="field" style={{ marginBottom: 0 }}>
          <span>Where do you live?</span>
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
          >
            {/* Sorted by name so the list reads alphabetically */}
            {Object.entries(PROVINCES)
              .sort((a, b) => a[1].name.localeCompare(b[1].name))
              .map(([code, p]) => (
                <option key={code} value={code}>
                  {p.name}
                </option>
              ))}
          </select>
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
          in {deductions.provinceName}
        </p>

        {/* The breakdown, so the percentage above isn't just a mystery number */}
        {monthly > 0 && (
          <div style={{ marginTop: 20 }}>
            {[
              ["Federal tax", deductions.federal],
              [`${deductions.provinceName} tax`, deductions.provincial],
              [deductions.pensionLabel, deductions.cpp],
              ["EI", deductions.ei],
              ["QPIP", deductions.parental],
            ]
              .filter(([, amount]) => amount > 0)
              .map(([label, amount]) => (
                <div className="legend-row" key={label}>
                  <span style={{ flex: 1 }}>{label}</span>
                  <span className="muted">
                    {money(amount / 12)} a month
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="card">
        <Breakdown
          gross={monthly}
          tax={taxCost}
          subs={subsTotal}
          debt={debtCost}
          goals={goalCost}
          free={Math.max(0, trulyFree)}
        />
      </div>

      <div className="card">
        <Subscriptions
          subs={subs}
          onAdd={add(setSubs, subs)}
          onEdit={edit(setSubs, subs)}
          onRemove={remove(setSubs, subs)}
        />
      </div>

      <div className="card">
        <Debts
          debts={debts}
          freeMonthly={leftOver}
          onAdd={add(setDebts, debts)}
          onEdit={edit(setDebts, debts)}
          onRemove={remove(setDebts, debts)}
        />
      </div>

      <div className="card">
        <Goals
          goals={goals}
          freeMonthly={freeForGoals}
          onAdd={add(setGoals, goals)}
          onEdit={edit(setGoals, goals)}
          onRemove={remove(setGoals, goals)}
        />
      </div>

      <div className="card">
        <p className="figure-label">Free to spend</p>
        <p className={`figure ${trulyFree < 0 ? "bad" : ""}`}>
          {money(trulyFree)}
        </p>
        <p className="figure-label">
          {trulyFree < 0
            ? "You're committed to more than you have."
            : "a month, after tax, subscriptions, debts and goals"}
        </p>
      </div>

      <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>
        Estimates only — not tax or financial advice.
        <br />
        Copyright © {new Date().getFullYear()} Shayan Akabrloyshabghai.
      </p>
    </div>
  );
}

export default App;