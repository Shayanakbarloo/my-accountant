import { yearlyDeductions, PROVINCES } from "./src/lib/tax.js";
import { monthlyCost, describe } from "./src/lib/subscriptions.js";
import { planForDebt } from "./src/lib/Debt.js";
import { allocateGoals, perDeposit } from "./src/lib/goals.js";

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
eq("needed per 28-day month", g.needed, 2350/(days/28));
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
console.log(bad === 0 ? "EVERY CHECK PASSED" : `${bad} PROBLEM(S) FOUND`);
process.exit(bad ? 1 : 0);
