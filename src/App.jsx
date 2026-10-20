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
    payPeriod: "biweekly",
    subs: [
      { id: 1, name: "Netflix", cost: 17 },
      { id: 2, name: "Spotify", cost: 11 },
    ],
    debts: [],
    goals: [],
  };
}

const saved = loadSaved();

// How often the money actually lands, and how many times a year that is.
// These are real counts: 26 fortnights, 24 half-months, 12 months.
const PAY_PERIODS = {
  weekly:      { name: "Every Week",        perYear: 52 },
  biweekly:    { name: "Every Two Weeks",   perYear: 26 },
  semimonthly: { name: "Twice A Month",     perYear: 24 },
  monthly:     { name: "Once A Month",      perYear: 12 },
};

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
  const [payPeriod, setPayPeriod] = useState(saved.payPeriod || "biweekly");
  const [subs, setSubs] = useState(withIds(saved.subs));
  const [debts, setDebts] = useState(withIds(saved.debts));
  const [goals, setGoals] = useState(withIds(saved.goals));

  // Saves to the browser whenever any of these change.
  useEffect(() => {
    localStorage.setItem(
      "my-accountant",
      JSON.stringify({ rate, hours, province, payPeriod, subs, debts, goals })
    );
  }, [rate, hours, province, payPeriod, subs, debts, goals]);

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

  /* ---------- what actually lands in your account ----------
     A paycheque is a real amount, so it comes off the real 52-week year
     rather than the 4-week months the cards above use. For weekly and
     fortnightly pay those agree exactly; for monthly pay a real cheque
     covers 4.33 weeks, so it is a little larger than the "month" above. */
  const period = PAY_PERIODS[payPeriod] || PAY_PERIODS.biweekly;
  const grossPerCheque = trueYearly / period.perYear;
  const netPerCheque = grossPerCheque * (1 - taxRate);

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

  /* ---------- what the donut shows ----------
     Each slice carries the items inside it, so clicking one can open it up
     and show which subscription, debt or goal is taking the biggest share. */
  const chartSlices = [
    {
      name: "Tax And Deductions",
      value: taxCost,
      parts: [
        { name: "Federal Tax", value: deductions.federal / 12 },
        { name: deductions.provinceName + " Tax", value: deductions.provincial / 12 },
        { name: deductions.pensionLabel, value: deductions.cpp / 12 },
        { name: "EI", value: deductions.ei / 12 },
        { name: "QPIP", value: deductions.parental / 12 },
      ].filter((part) => part.value > 0),
    },
    {
      name: "Subscriptions",
      value: subsTotal,
      parts: subs.map((sub) => ({ name: sub.name, value: monthlyCost(sub) })),
    },
    {
      name: "Debt Payments",
      value: debtCost,
      parts: debts.map((debt) => ({
        name: debt.name,
        value: planForDebt(debt, leftOver).payment,
      })),
    },
    {
      name: "Saving Goals",
      value: goalCost,
      parts: goals.map((goal) => ({
        name: goal.title,
        value: planForGoal(goal, freeForGoals).perMonth,
      })),
    },
    // Nothing to break this one into — it's whatever is left.
    { name: "Free To Spend", value: Math.max(0, trulyFree), parts: [] },
  ];

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
      <p className="tagline">Know What You Keep. Plan What's Next.</p>

      <div className="card">
        <label className="field">
          <span>How Much Do You Earn Per Hour?</span>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="25"
          />
        </label>

        <label className="field">
          <span>How Many Hours Do You Work Per Week?</span>
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="40"
          />
        </label>

        <label className="field">
          <span>How Often Are You Paid?</span>
          <select
            value={payPeriod}
            onChange={(e) => setPayPeriod(e.target.value)}
          >
            {Object.entries(PAY_PERIODS).map(([key, p]) => (
              <option key={key} value={key}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field" style={{ marginBottom: 0 }}>
          <span>Where Do You Live?</span>
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
        <p className="figure-label">You Earn</p>
        <p className="figure">{money(monthly)}</p>
        <p className="figure-label">A Month, Before Anything Comes Out</p>
      </div>

      <div className="card">
        <p className="figure-label">Each Paycheque</p>
        <p className="figure">{money(netPerCheque)}</p>
        <p className="figure-label">
          {period.name}, After Tax · {period.perYear} Cheques A Year
        </p>

        {grossPerCheque > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="legend-row">
              <span style={{ flex: 1 }}>Gross Per Cheque</span>
              <span className="muted">{money(grossPerCheque)}</span>
            </div>
            <div className="legend-row">
              <span style={{ flex: 1 }}>Taken Off</span>
              <span className="muted">
                −{money(grossPerCheque - netPerCheque)}
              </span>
            </div>
          </div>
        )}

        {/* Only worth explaining where the two figures genuinely differ */}
        {grossPerCheque > 0 && period.perYear < 26 && (
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            A Real {period.name === "Once A Month" ? "Month" : "Half-Month"} Is
            Slightly Longer Than The 4-Week Months Used Above, So This Is A
            Little Larger Than The Monthly Figures On This Page.
          </p>
        )}
      </div>

      <div className="card">
        <p className="figure-label">After Tax</p>
        <p className="figure">{money(takeHomeMonthly)}</p>
        <p className="figure-label">
          {(taxRate * 100).toFixed(1)}% Of Your Pay Goes To Tax And Deductions
          In {deductions.provinceName}
        </p>

        {/* The breakdown, so the percentage above isn't just a mystery number */}
        {monthly > 0 && (
          <div style={{ marginTop: 20 }}>
            {[
              ["Federal Tax", deductions.federal],
              [`${deductions.provinceName} Tax`, deductions.provincial],
              [deductions.pensionLabel, deductions.cpp],
              ["EI", deductions.ei],
              ["QPIP", deductions.parental],
            ]
              .filter(([, amount]) => amount > 0)
              .map(([label, amount]) => (
                <div className="legend-row" key={label}>
                  <span style={{ flex: 1 }}>{label}</span>
                  <span className="muted">
                    {money(amount / 12)} A Month
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="card">
        <Breakdown gross={monthly} slices={chartSlices} />
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
        <p className="figure-label">Free To Spend</p>
        <p className={`figure ${trulyFree < 0 ? "bad" : ""}`}>
          {money(trulyFree)}
        </p>
        <p className="figure-label">
          {trulyFree < 0
            ? "You're Committed To More Than You Have."
            : "A Month, After Tax, Subscriptions, Debts And Goals"}
        </p>
      </div>

      <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>
        Estimates Only — Not Tax Or Financial Advice.
        <br />
        Copyright © {new Date().getFullYear()} Shayan Akabrloyshabghai.
      </p>
    </div>
  );
}

export default App;