import { yearlyDeductions, PROVINCES } from "./src/lib/tax.js";
import { monthlyCost, describe } from "./src/lib/subscriptions.js";
import { planForDebt } from "./src/lib/Debt.js";
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
console.log("2. TAX  (Ontario, $52,000)");
console.log("=".repeat(62));
const d = yearlyDeductions(52000, "ON");
// independently: federal 14% on 52000 less BPA credit
const fedExpected = 52000 * 0.14 - 16452 * 0.14;
eq("federal (all in first bracket)", d.federal, fedExpected);
const onBase = 52000 * 0.0505 - 12989 * 0.0505;
eq("ontario base (no surtax at this level)", d.provincial - d.health, onBase);
eq("health premium at $52k", d.health, 600);
const cppExp = (Math.min(52000, 74600) - 3500) * 0.0595;
eq("CPP", d.cpp, cppExp);
eq("EI", d.ei, Math.min(52000, 68900) * 0.0163);
eq("total is the sum", d.total, d.federal + d.provincial + d.cpp + d.ei + d.parental);

console.log("\n  anchor: $80,000 Ontario must leave $58,933");
eq("  take-home", 80000 - yearlyDeductions(80000, "ON").total, 58933, 1);

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

// This month's target is set from where the goal stood on the 1st, over the
// whole 28-day periods left from then — not from today, and not as a
// fraction of a period. Pinning it to the 1st is what stops a deposit
// shrinking the target it is paying into.
const fromFirst = Math.ceil((new Date("2027-01-21") - monthStart()) / 864e5);
eq("this month's target", g.target, perDeposit(2350, fromFirst, 28).amount);
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
const one = freeWith([dep(470, "2026-11-08")], NOV);
const two = freeWith([dep(470, "2026-11-08"), dep(470, "2026-11-12")], NOV);

eq("free to spend, nothing saved", none.free, 1940.30);
eq("free to spend after $470 put aside", one.free, none.free);
eq("free to spend after $940 put aside", two.free, none.free);
eq("  this month's target held still", two.row.target, none.row.target);
eq("  and the deposits count toward it", two.row.putAside, 940);

// Going past the month's target really does leave less to spend
const over = [dep(470,"2026-11-08"), dep(470,"2026-11-12"),
              dep(470,"2026-11-15"), dep(470,"2026-11-20")];
const big = freeWith(over, NOV);
eq("overshooting leaves less to spend", big.free, none.free - (1880 - 1175));
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


// ---- a shortfall against the ideal pace is not a missed deadline ----
// The ideal pace uses whole months only, so it finishes early on purpose.
// Coming in under it while still arriving in time must NOT raise a warning
// or tell you to cancel a subscription you can afford.
{
  const when = new Date(2026, 10, 9);
  const ask = (spare) => allocateGoals(
    [{ id: 7, title: "Iphone", cost: 2315, date: "2027-01-21" }], spare, when
  )[0];

  const need = 2315 / (Math.ceil((new Date("2027-01-21") - when) / 864e5) / 28);
  const easy = ask(1086);
  eq("ideal pace asks more than the deadline needs", easy.target > need ? 1 : 0, 1);
  eq("  below the ideal pace", easy.shortfall > 0.5 ? 1 : 0, 1);
  eq("  but NOT late", easy.late ? 1 : 0, 0);
  eq("  so it counts as on track", easy.onTrack ? 1 : 0, 1);
  eq("  and no cut is suggested", suggestCuts(easy.gap, [{id:1,name:"Guitar",cost:176,every:"month",times:1}]) === null ? 1 : 0, 1);

  eq("the real minimum to make the date", easy.minimum, need);
  eq("exactly the minimum is on time", ask(need + 0.01).late ? 1 : 0, 0);
  eq("under the minimum is late", ask(need - 20).late ? 1 : 0, 1);
  eq("  and the gap is what's missing", ask(need - 20).gap, 20, 0.5);
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
console.log(bad === 0 ? "EVERY CHECK PASSED" : `${bad} PROBLEM(S) FOUND`);
process.exit(bad ? 1 : 0);
