import { yearlyDeductions, PROVINCES } from "./src/lib/tax.js";
import { monthlyCost, describe } from "./src/lib/subscriptions.js";
import { planForDebt, planDebts } from "./src/lib/Debt.js";
import { money } from "./src/lib/format.js";
import { allocateGoals, perDeposit, totalSaved, suggestCuts } from "./src/lib/goals.js";
import { totalPaid } from "./src/lib/Debt.js";
import { entryList, addEntry, removeEntry, sumEntries, monthStart } from "./src/lib/entries.js";

let bad = 0;
const eq = (label, got, want, tol = 0.01) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) { console.log(`  FAIL ${label}\n       got ${got}  want ${want}`); bad++; }
  else console.log(`  ok   ${label}  = ${typeof got === "number" ? got.toFixed(2) : got}`);
};

console.log("=".repeat(62));
console.log("1. INCOME  ($25/hr x 40hrs)");
console.log("=".repeat(62));
const rate = 25, hours = 40;
const weekly = rate * hours;
eq("weekly", weekly, 1000);
eq("month = 4 weeks", weekly * 4, 4000);
eq("biweekly = 2 weeks", weekly * 2, 2000);
eq("true annual = 52 weeks", weekly * 52, 52000);

console.log("\n" + "=".repeat(62));
console.log("2. TAX  (Ontario, $52,000) — the CRA's method, worked by hand");
console.log("=".repeat(62));
// This section used to recompute tax applying ONLY the basic personal
// amount — the same gap the app had — so it agreed with the app while both
// overstated tax by about $900 at this income. Written out the CRA's way:
const d = yearlyDeductions(52000, "ON");
const pensionable = 52000 - 3500;          // CPP starts after $3,500
const cppBase = pensionable * 0.0495;      // base CPP  → earns a credit
const cppEnhanced = pensionable * 0.01;    // the extra 1% → comes off income
const eiPaid = 52000 * 0.0163;
const taxable = 52000 - cppEnhanced;
eq("taxable income (enhanced CPP deducted)", d.taxable, taxable);
// Federal: all of it in the 14% band, less 14% of every credit
const fedExpected = taxable * 0.14 - 0.14 * (16452 + cppBase + eiPaid + 1501);
eq("federal (BPA, CPP, EI, employment credits)", d.federal, fedExpected);
// Ontario: all in the 5.05% band, less 5.05% of its credits
const onBase = taxable * 0.0505 - 0.0505 * (12989 + cppBase + eiPaid);
eq("ontario (BPA, CPP, EI credits; no surtax)", d.provincial - d.health, onBase);
eq("health premium at $52k", d.health, 600);
eq("CPP", d.cpp, pensionable * 0.0595);
eq("EI", d.ei, eiPaid);
eq("total is the sum", d.total, d.federal + d.provincial + d.cpp + d.ei + d.parental);

console.log("\n  anchor: the CRA's own worked example (T4032-ON 2026, example 1)");
const craEx = yearlyDeductions(1300 * 52, "ON", { rrsp: 80 * 52 });
eq("  federal tax for the year", craEx.federal, 5957.85, 1);
eq("  Ontario tax for the year", craEx.provincial, 3264.26, 1);
eq("  combined", craEx.federal + craEx.provincial, 9222.11, 1);

console.log("\n" + "=".repeat(62));
console.log("3. SUBSCRIPTIONS");
console.log("=".repeat(62));
eq("$17/month", monthlyCost({cost:17, every:"month", times:1}), 17);
eq("$6 x3 a week -> month", monthlyCost({cost:6, every:"week", times:3}), 72);
eq("$12/week -> month", monthlyCost({cost:12, every:"week", times:1}), 48);
eq("legacy row (no 'every')", monthlyCost({cost:11}), 11);
eq("missing times defaults to 1", monthlyCost({cost:20, every:"week"}), 80);

console.log("\n" + "=".repeat(62));
console.log("4. DEBT  ($2,400 at 19.99%)");
console.log("=".repeat(62));
const in8mo = new Date(Date.now() + 243*864e5).toISOString().slice(0,10);
const dp = planForDebt({balance:2400, rate:19.99, date:in8mo}, 2000);
// standard amortisation, computed independently
const r = 19.99/100/12;
const n = dp.months;
const expPay = (2400 * r) / (1 - Math.pow(1+r, -n));
eq(`payment over ${n} months`, dp.payment, expPay);
eq("interest = total paid - balance", dp.interestPaid, dp.payment * n - 2400);
eq("0% loan is just balance/months", planForDebt({balance:1200, rate:0, date:in8mo}, 2000).payment, 1200/planForDebt({balance:1200,rate:0,date:in8mo},2000).months);
const stuck = planForDebt({balance:100000, rate:25, date:null}, 500);
eq("unpayable debt flagged (no fake date)", stuck.stuck ? 1 : 0, 1);
eq("cleared debt pays nothing", planForDebt({balance:0, rate:5, date:null}, 2000).payment, 0);

console.log("\n  tracking payments made:");
const p0 = planForDebt({balance:2400, rate:19.99, date:null}, 2000);
const p1 = planForDebt({balance:2400, rate:19.99, date:null, paid:600}, 2000);
const p2 = planForDebt({balance:2400, rate:19.99, date:null, paid:2400}, 2000);
eq("  paid reduces what's owed", p1.balance, 1800);
eq("  progress is paid over original", p1.progress, 600/2400*100);
eq("  interest falls with the balance", p1.monthlyInterest, 1800 * (19.99/100/12));
eq("  fully paid is cleared", p2.cleared ? 1 : 0, 1);
eq("  overpaying caps at the balance", planForDebt({balance:2400, rate:5, date:null, paid:9999}, 2000).paid, 2400);
eq("  negative paid treated as zero", planForDebt({balance:2400, rate:5, date:null, paid:-50}, 2000).paid, 0);
// Paying extra must never make the monthly payment larger
eq("  payment does not jump when you pay extra", p1.payment <= p0.payment + 0.01 ? 1 : 0, 1);

console.log("\n" + "=".repeat(62));
console.log("5. GOALS  ($2,350 by 2027-01-21)");
console.log("=".repeat(62));
const days = Math.ceil((new Date("2027-01-21") - new Date())/864e5);
console.log(`  (${days} days away)`);
const g = allocateGoals([{id:1,title:"iPhone",cost:2350,date:"2027-01-21"}], 99999)[0];
eq("daysLeft", g.daysLeft, days, 1);

// This month's target is the days of this month that fall inside the run,
// over all the days left in the run, counted from the 1st. Pinning it to the
// 1st is what stops a deposit shrinking the target it is paying into.
// The plan: whole paycheques (biweekly) counted from the 1st, and this
// month's target is the two paycheques a four-week month holds.
const first = monthStart();
const runDays = Math.round(
  (Date.UTC(2027, 0, 21) - Date.UTC(first.getFullYear(), first.getMonth(), 1)) / 864e5
);
const plan = perDeposit(2350, runDays, 14);
eq("per paycheque", g.perPaycheque, plan.amount);
eq("  whole paycheques cover the goal", g.perPaycheque * g.paycheques >= 2350 ? 1 : 0, 1);
eq("this month's target = two paycheques", g.target, Math.min(2350, plan.amount * 2));
eq("  nothing put aside yet", g.putAside, 0);
eq("  so it's all still to go", g.stillThisMonth, g.target);
eq("  and the month isn't covered", g.monthDone ? 1 : 0, 0);
for (const [name, pd] of [["weekly",7],["biweekly",14],["monthly",28]]) {
  const p = perDeposit(2350, days, pd);
  eq(`${name}: ${p.deposits} x amount = goal`, p.deposits * p.amount, 2350);
}

console.log("\n" + "=".repeat(62));
console.log("6. THE FULL CHAIN");
console.log("=".repeat(62));
const taxRate = d.total/52000;
const takeHomeMo = 4000 * (1-taxRate);
const taxCost = 4000 - takeHomeMo;
const subs = [{cost:17,every:"month",times:1},{cost:6,every:"week",times:3}];
const subsTotal = subs.reduce((s,x)=>s+monthlyCost(x),0);
const leftOver = takeHomeMo - subsTotal;
const debts = [{balance:2400,rate:19.99,date:null}];
const debtCost = debts.reduce((s,x)=>s+planForDebt(x,leftOver).payment,0);
const freeForGoals = leftOver - debtCost;
const rows = allocateGoals([{id:1,title:"iPhone",cost:2350,date:"2027-01-21"}], freeForGoals);
const goalCost = rows.reduce((s,x)=>s+x.gets,0);
const trulyFree = freeForGoals - goalCost;
console.log(`  gross      $${(4000).toFixed(2)}`);
console.log(`  -tax       $${taxCost.toFixed(2)}`);
console.log(`  -subs      $${subsTotal.toFixed(2)}`);
console.log(`  -debt      $${debtCost.toFixed(2)}`);
console.log(`  -goals     $${goalCost.toFixed(2)}`);
console.log(`  = free     $${trulyFree.toFixed(2)}`);
eq("chart slices sum to gross", taxCost+subsTotal+debtCost+goalCost+trulyFree, 4000);
eq("allocation never exceeds the pot", goalCost <= freeForGoals + 0.01 ? 1 : 0, 1);

console.log("\n" + "=".repeat(62));
console.log("7. RECORDED ENTRIES  (adding and removing deposits/payments)");
console.log("=".repeat(62));

// Each deposit is its own entry, so a mistyped one can be deleted rather
// than subtracted. These checks are what stops that quietly breaking.
let goalEntries = [];
goalEntries = addEntry(goalEntries, 470);
goalEntries = addEntry(goalEntries, 470);
goalEntries = addEntry(goalEntries, 235);          // the typo
eq("three deposits add up", sumEntries(goalEntries), 1175);

const typo = goalEntries.find((e) => e.amount === 235);
goalEntries = removeEntry(goalEntries, typo.id);
eq("removing only the $235 leaves", sumEntries(goalEntries), 940);
eq("  and leaves two entries", goalEntries.length, 2);

// Two entries of the same amount must not take each other out
goalEntries = removeEntry(goalEntries, goalEntries[0].id);
eq("removing one of two $470s leaves", sumEntries(goalEntries), 470);

eq("ids are unique in a burst",
   new Set(Array.from({length: 300}).reduce((l) => addEntry(l, 10), []).map((e) => e.id)).size,
   300);

// Saves made before entries existed kept a single number
eq("an older save still reads", totalSaved({ saved: 700 }), 700);
eq("  shown as one removable entry", entryList(undefined, 700).length, 1);
eq("  removing it clears it", sumEntries(removeEntry(entryList(undefined, 700), "earlier")), 0);
eq("nothing recorded yet", totalSaved({}), 0);

// The progress bar has to follow the list, not a stale number
const tracked = allocateGoals(
  [{ id: 1, title: "iPhone", cost: 2350, date: "2027-01-21",
     deposits: [{ id: "a", amount: 470 }, { id: "b", amount: 470 }] }],
  1000
)[0];
eq("bar: saved", tracked.saved, 940);
eq("bar: remaining", tracked.remaining, 1410);
eq("bar: progress %", Math.round(tracked.progress), 40);

// Debts, the same way
const tracked2 = planForDebt(
  { balance: 2400, rate: 19.99, date: null,
    payments: [{ id: "a", amount: 600 }, { id: "b", amount: 150 }] },
  2000
);
eq("debt: paid", totalPaid({ payments: [{ amount: 600 }, { amount: 150 }] }), 750);
eq("debt: balance left", tracked2.balance, 1650);
eq("debt: older save reads", totalPaid({ paid: 600 }), 600);

// Paying extra must not raise the monthly figure on a no-deadline debt
const before = planForDebt({ balance: 2400, rate: 19.99, date: null }, 2000).payment;
const after = planForDebt({ balance: 2400, rate: 19.99, date: null,
  payments: [{ id: "a", amount: 600 }] }, 2000).payment;
eq("paying extra holds the payment steady", after, before);

console.log("\n" + "=".repeat(62));
console.log("8. THE MONTHLY CYCLE  (saving must not make you look richer)");
console.log("=".repeat(62));

// The bug this guards against: a deposit shrank what the goal needed per
// month, and the money actually moved was never taken out of that month's
// budget — so putting $470 aside handed back $178 to spend.
const NOV = new Date(2026, 10, 8);
const DEC = new Date(2026, 11, 3);
const pot = 3115.30;
const dep = (amount, at) => ({ id: at + amount, amount, at });

const freeWith = (deposits, when) => {
  const rows = allocateGoals(
    [{ id: 1, title: "iPhone", cost: 2350, date: "2027-01-21", deposits }],
    pot, when
  );
  return { free: pot - rows.reduce((t, r) => t + r.committed, 0), row: rows[0] };
};

const none = freeWith([], NOV);
const one = freeWith([dep(400, "2026-11-08")], NOV);
const two = freeWith([dep(400, "2026-11-08"), dep(400, "2026-11-12")], NOV);

eq("free to spend, nothing saved", none.free, pot - none.row.target);
eq("free to spend after $400 put aside", one.free, none.free);
eq("free to spend after $800 put aside", two.free, none.free);
eq("  this month's target held still", two.row.target, none.row.target);
eq("  and the deposits count toward it", two.row.putAside, 800);

// Going past the month's target really does leave less to spend
const over = [dep(470,"2026-11-08"), dep(470,"2026-11-12"),
              dep(470,"2026-11-15"), dep(470,"2026-11-20")];
const big = freeWith(over, NOV);
eq("overshooting leaves less to spend", big.free, pot - 1880);
eq("  month shows as covered", big.row.monthDone ? 1 : 0, 1);
eq("  but the goal is NOT done", big.row.done ? 1 : 0, 0);

// December starts over on its own — no stored state, no reset to run
const dec = freeWith(over, DEC);
eq("December: nothing put aside yet", dec.row.putAside, 0);
eq("  a fresh target appears", dec.row.target > 0 ? 1 : 0, 1);
eq("  month no longer counted as covered", dec.row.monthDone ? 1 : 0, 0);
eq("  total saved carries over", dec.row.saved, 1880);
eq("  still not done", dec.row.done ? 1 : 0, 0);

// Done means the whole goal, never one good month
const finished = freeWith([...over, dep(470, "2026-12-01")], DEC);
eq("done only when the total is reached", finished.row.done ? 1 : 0, 1);

// Undated money from an older save counts to the total, not to this month
const carried = freeWith([{ id: "earlier", amount: 700, at: null }], NOV);
eq("older save counts to the total", carried.row.saved, 700);
eq("  but not to this month", carried.row.putAside, 0);


// ---- the plan is whole paycheques, and every figure can be followed ----
// $2,315 due 21 Jan, counted from 1 Nov, is 81 days: 5 biweekly paycheques,
// so $463 from each. An earlier version split the run by calendar days —
// November $857 — which implied "$429 every two weeks", and five of those
// fall $170 short. The figure you act on has to be one that works.
{
  const when = new Date(2026, 10, 9);
  const ask = (spare, today = when) => allocateGoals(
    [{ id: 7, title: "Iphone", cost: 2315, date: "2027-01-21" }], spare, today, 14
  )[0];

  const nov = ask(1086);
  eq("$463 from every paycheque", nov.perPaycheque, 463);
  eq("  five of them", nov.paycheques, 5);
  eq("  5 x $463 = $2,315 exactly", nov.perPaycheque * nov.paycheques, 2315);
  eq("November's target = two paycheques", nov.target, 926);
  eq("  it takes only that", nov.committed, 926);
  eq("  leaving the rest to spend", 1086 - nov.committed, 160);
  eq("  not flagged late", nov.late ? 1 : 0, 0);
  eq("  and no cut suggested",
     suggestCuts(nov.shortfall, [{id:1,name:"Guitar",cost:176,every:"month",times:1}]) === null ? 1 : 0, 1);

  // Follow the plan paycheque by paycheque: it must hold steady and finish
  // on or before the date.
  let paid = [];
  let when2 = new Date(2026, 10, 13);
  let amounts = new Set();
  let finished = null;
  for (let i = 0; i < 10; i++) {
    const row = allocateGoals(
      [{ id: 7, title: "Iphone", cost: 2315, date: "2027-01-21", deposits: paid }],
      99999, when2, 14
    )[0];
    if (row.done) { finished = when2; break; }
    amounts.add(row.perPaycheque);
    const iso = `${when2.getFullYear()}-${String(when2.getMonth()+1).padStart(2,"0")}-${String(when2.getDate()).padStart(2,"0")}`;
    paid = [...paid, { id: iso, amount: Math.min(row.perPaycheque, row.remaining), at: iso }];
    when2 = new Date(when2.getFullYear(), when2.getMonth(), when2.getDate() + 14);
  }
  eq("following it, the figure never moves", amounts.size, 1);
  eq("  and the 5th deposit lands before Jan 21", paid.length, 5);
  eq("  on Jan 8", paid[4].at === "2027-01-08" ? 1 : 0, 1);

  // A goal that really is unaffordable must still raise the alarm
  const broke = ask(200);
  eq("an unaffordable plan is late", broke.late ? 1 : 0, 1);
  eq("  short by what's missing", broke.shortfall, 926 - 200);
  eq("nothing spare stalls", ask(0).stalled ? 1 : 0, 1);
}

// Debts, the same way
const payDebt = (payments, when) =>
  planForDebt({ balance: 2400, rate: 19.99, date: "2027-06-01", payments }, 3000, when);
const dNone = payDebt([], NOV);
const dPaid = payDebt([dep(200, "2026-11-08")], NOV);
eq("debt: monthly figure holds still", dPaid.payment, dNone.payment);
eq("debt: committed unchanged by paying", dPaid.committed, dNone.committed);
eq("debt: payment counts toward the month", dPaid.paidNow, 200);
eq("debt: December starts over", payDebt([dep(200, "2026-11-08")], DEC).paidNow, 0);

console.log("\n" + "=".repeat(62));
console.log("9. DISPLAY, CHART AND DEBT PLANNING");
console.log("=".repeat(62));

// Money shows cents when there are any, so every figure multiplies out.
// Rounding to the dollar turned $1,157.50 into "$1,158", and $1,158 × 2 is
// a dollar more than the $2,315 goal it was meant to add up to.
const shows = (got, want) => eq(`money shows ${want}`, got === want ? 1 : 0, 1);
shows(money(1157.5), "$1,157.50");
shows(money(2315), "$2,315");
shows(money(463), "$463");
shows(money(231.5), "$231.50");
shows(money(0.05), "$0.05");
shows(money(0), "$0");

// Deposit amounts round UP to the cent, so they always reach the goal
const seven = perDeposit(2315, 100, 14);
eq("7 deposits round up, never short", seven.amount * seven.deposits >= 2315 ? 1 : 0, 1);
eq("  by no more than a few cents", seven.amount * seven.deposits - 2315 < 0.07 ? 1 : 0, 1);

// The chart's tax slice is a four-week month: yearly × 4/52. Its parts were
// divided by 12 calendar months, so they added up to MORE than the slice.
{
  const yr = yearlyDeductions(52000, "ON");
  const slice = 4000 * (yr.total / 52000);
  const parts = [yr.federal, yr.provincial, yr.cpp, yr.ei, yr.parental]
    .reduce((t, x) => t + (x / 52) * 4, 0);
  eq("tax parts add up to the tax slice", parts, slice);
}

// Debts without a deadline SHARE one quarter of what's spare. Each used to
// take a quarter on its own — five of them claimed 125%.
{
  const cards = (n) => Array.from({ length: n }, (_, i) =>
    ({ id: i, name: "Card " + i, balance: 1500, rate: 19.99, date: null }));
  for (const n of [1, 2, 5]) {
    const total = planDebts(cards(n), 2000).reduce((t, p) => t + p.committed, 0);
    eq(`${n} open debt(s) share one quarter`, total, 500);
  }
  // Split by balance: owing three times as much gets three times the share
  const split = planDebts([
    { id: 1, name: "Big", balance: 3000, rate: 0, date: null },
    { id: 2, name: "Small", balance: 1000, rate: 0, date: null },
  ], 2000);
  eq("  shared by balance", split[0].payment / split[1].payment, 3);
}

// A deadline counts one payment per calendar month up to the due date.
// Dividing by 30.44 days and rounding up counted a payment that would land
// AFTER a 1 February deadline, so the plan finished in March.
{
  const NOV9 = new Date(2026, 10, 9);
  const due = (date) => planForDebt({ balance: 3000, rate: 0, date }, 2000, NOV9);
  eq("due Feb 1: Nov, Dec, Jan", due("2027-02-01").months, 3);
  eq("  clears in January", due("2027-02-01").payoffLabel === "January 2027" ? 1 : 0, 1);
  eq("due Feb 15: Feb counts too", due("2027-02-15").months, 4);
  const visa = planForDebt({ balance: 2400, rate: 19.99, date: "2027-06-01" }, 3000, NOV9);
  let owed = 2400;
  for (let k = 0; k < visa.months; k++) owed = owed * (1 + 0.1999 / 12) - visa.payment;
  eq("with interest, the payments clear it exactly", owed, 0);
}

// Day counts are whole numbers, whatever the time of day or the clocks
{
  const at = (h) => allocateGoals(
    [{ id: 1, title: "x", cost: 1000, date: "2027-01-21" }], 99999,
    new Date(2026, 10, 9, h), 14)[0].daysLeft;
  eq("73 days at midnight", at(0), 73);
  eq("73 days at 11pm", at(23), 73);
}

console.log("\n" + "=".repeat(62));
console.log(bad === 0 ? "EVERY CHECK PASSED" : `${bad} PROBLEM(S) FOUND`);
process.exit(bad ? 1 : 0);
