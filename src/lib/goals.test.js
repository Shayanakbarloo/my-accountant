// Run with: node src/lib/goals.test.js
import { allocateGoals, suggestCuts, listNames } from "./goals.js";

let failed = 0;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed++;
};
const inMonths = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};

// Stephen's example: Korea $8,000, phone $2,300 and urgent.
const goals = [
  { id: 1, title: "Korea Trip", cost: 8000, date: inMonths(12), priority: false },
  { id: 2, title: "New Phone", cost: 2300, date: inMonths(3), priority: true },
];
const available = 900;

console.log("$900/mo spare · Korea $8,000 in 12mo · Phone $2,300 in 3mo (PRIORITY)\n");
const rows = allocateGoals(goals, available);
for (const r of rows) {
  console.log(`  ${r.title}`);
  console.log(`    needs  $${r.needed.toFixed(2)}/mo`);
  console.log(`    gets   $${r.gets.toFixed(2)}/mo`);
  console.log(`    short  $${r.shortfall.toFixed(2)}/mo`);
  console.log(`    ${r.onTrack ? "on track" : "behind — really lands " + r.realDate}`);
}

check("priority goal is listed first", rows[0].title === "New Phone");
check("priority is fully funded", rows[0].onTrack);
// A month here is four weeks, so ~92 days is 3.29 months, not 3.
// $2,300 / 3.29 = about $700. Checked against the same arithmetic
// rather than a hardcoded number, so it survives the date moving.
{
  const d = Math.ceil((new Date(inMonths(3)) - new Date()) / 86400000);
  check("priority gets exactly what it needs",
    Math.abs(rows[0].gets - 2300 / (d / 28)) < 0.01);
}
check("other goal gets the remainder", Math.abs(rows[1].gets - (900 - rows[0].gets)) < 1);
check("other goal is now behind", !rows[1].onTrack);
check("other goal still has a real date", !!rows[1].realDate);
check("allocation never exceeds the pot",
  rows.reduce((s, r) => s + r.gets, 0) <= available + 0.01);

// Not enough money at all
console.log("\nSame goals, only $400/mo spare:");
const tight = allocateGoals(goals, 400);
tight.forEach(r => console.log(`  ${r.title}: gets $${r.gets.toFixed(0)}, short $${r.shortfall.toFixed(0)}` +
  (r.stalled ? "  (STALLED)" : "")));
check("priority takes everything when money is tight", tight[0].gets === 400);
check("second goal stalls rather than showing a fake date", tight[1].stalled);

// Nothing spare
const none = allocateGoals(goals, 0);
check("zero available stalls everything", none.every(r => r.stalled));
check("no NaN with zero available", none.every(r => !isNaN(r.gets) && !isNaN(r.needed)));

// Overdue goal
const past = allocateGoals([{ id:3, title:"Expired", cost:500, date:"2020-01-01" }], 900);
check("overdue goal flagged", past[0].overdue);
check("overdue goal takes no money", past[0].gets === 0);

// ---- suggestions ----
console.log("\nSUGGESTIONS");
const subs = [
  { name: "Netflix", cost: 17, every: "month", times: 1 },
  { name: "Spotify", cost: 11, every: "month", times: 1 },
  { name: "Coffee",  cost: 6,  every: "week",  times: 3 },  // $72/mo
  { name: "Gym",     cost: 40, every: "month", times: 1 },
];
const small = suggestCuts(15, subs);
console.log("  short $15 ->", listNames(small.cuts), `frees $${small.freed}`);
check("small gap suggests the cheapest that covers it (Netflix $17)",
  small.cuts.length === 1 && small.cuts[0].name === "Netflix");

const mid = suggestCuts(60, subs);
console.log("  short $60 ->", listNames(mid.cuts), `frees $${mid.freed}`);
check("mid gap picks the single $72 coffee", mid.cuts.length === 1 && mid.cuts[0].name === "Coffee");

const big = suggestCuts(120, subs);
console.log("  short $120 ->", listNames(big.cuts), `frees $${big.freed}`);
check("big gap combines several", big.cuts.length > 1 && big.enough);

const huge = suggestCuts(5000, subs);
console.log("  short $5000 ->", listNames(huge.cuts), `frees $${huge.freed}, enough: ${huge.enough}`);
check("impossible gap admits it isn't enough", huge.enough === false);

check("no subs -> no suggestion", suggestCuts(50, []) === null);
check("no shortfall -> no suggestion", suggestCuts(0, subs) === null);
// ---- the month convention must match the rest of the app ----
// A month is four weeks everywhere, so two weeks is exactly half a month
// and one week is exactly a quarter. If these drift, the Goals view
// disagrees with every other figure on the page.
const yr = allocateGoals(
  [{ id: 99, title: "Year Goal", cost: 8000, date: inMonths(12) }],
  99999
)[0];
const perMonth = yr.needed;
const days = Math.ceil((new Date(inMonths(12)) - new Date()) / 86400000);
console.log(`\n$8,000 over ${days} days:`);
console.log(`  per month (4 weeks): $${perMonth.toFixed(2)}`);
console.log(`  half of that:        $${(perMonth / 2).toFixed(2)}`);
console.log(`  true 14-day figure:  $${(8000 / (days / 14)).toFixed(2)}`);
check("a month is 4 weeks, so halving it gives the true 14-day figure",
  Math.abs(perMonth / 2 - 8000 / (days / 14)) < 0.01);
check("a quarter of it gives the true 7-day figure",
  Math.abs(perMonth / 4 - 8000 / (days / 7)) < 0.01);

// ---- whole deposits, not a fractional rate ----
// $2,350 by 21 Jan 2027 from 7 Nov 2026 is 75 days — 5.36 fortnights.
// Dividing by 5.36 gives $438.67, which only reaches the target if a
// deposit lands today. Dividing by 5 whole deposits always gets there.
{
  const { perDeposit } = await import("./goals.js");
  const r = perDeposit(2350, 75, 14);
  console.log(`\n$2,350 over 75 days, biweekly: ${r.deposits} x $${r.amount.toFixed(2)}`);
  check("rounds down to whole deposits", r.deposits === 5);
  check("the deposits add up to the goal", Math.abs(r.deposits * r.amount - 2350) < 0.01);
  check("never fewer than one deposit", perDeposit(500, 3, 14).deposits === 1);

  // The safety property: saving this much always reaches the target,
  // whether the first deposit is today or a full period from now.
  for (const start of [0, 14]) {
    let have = 0;
    for (let d = start; d <= 75; d += 14) have += r.amount;
    check(`reaches the target with the first deposit on day ${start}`, have >= 2350 - 0.01);
  }
}

check("listNames reads naturally", listNames([{name:"A"},{name:"B"},{name:"C"}]) === "A, B And C");

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} failed.`);
process.exit(failed ? 1 : 0);