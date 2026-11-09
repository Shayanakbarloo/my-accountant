// Run with: node src/lib/goals.test.js
import { allocateGoals, suggestCuts, listNames, perDeposit } from "./goals.js";
import { monthStart } from "./entries.js";

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
/*  What a goal asks for this month is its share of the run: the days of
    this month that fall inside the run, over all the days left in it,
    counted from the 1st.

    Two things are deliberate here. Counting from the 1st, not from today,
    keeps the figure still all month — a rate recalculated from today
    shrinks every time you pay into it, so saving made the app hand money
    back as "free to spend". And splitting by actual days rather than whole
    28-day blocks keeps it from over-asking: whole blocks ignored the
    leftover days, demanded far more each month than the date needed, and
    swallowed every spare dollar.                                        */
{
  const first = monthStart();
  const afterThis = new Date(first.getFullYear(), first.getMonth() + 1, 1);
  const runDays = Math.ceil((new Date(inMonths(3)) - first) / 86400000);
  const monthDays = Math.min(
    runDays,
    Math.round((afterThis - first) / 86400000)
  );
  check("priority gets exactly its share of the run",
    Math.abs(rows[0].gets - 2300 * (monthDays / runDays)) < 0.01);
  check("the share is never more than the whole goal",
    rows[0].target <= 2300 + 0.01);
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
/*  ---- the month convention must match the rest of the app ----

    A month is four weeks everywhere, so two weeks is exactly half a month
    and one week exactly a quarter. If these drift, the Goals view
    disagrees with every other figure on the page.

    Checked over 56 days — a whole number of all three periods — so the
    rounding to whole deposits can't blur what's being asserted.        */
const m = perDeposit(8000, 56, 28);
const f = perDeposit(8000, 56, 14);
const w = perDeposit(8000, 56, 7);
console.log(`\n$8,000 over 56 days:`);
console.log(`  ${m.deposits} monthly  x $${m.amount.toFixed(2)}`);
console.log(`  ${f.deposits} biweekly x $${f.amount.toFixed(2)}`);
console.log(`  ${w.deposits} weekly   x $${w.amount.toFixed(2)}`);
check("56 days is 2 months", m.deposits === 2);
check("a month is 4 weeks, so two weeks is half of one",
  f.deposits === 2 * m.deposits && Math.abs(f.amount * 2 - m.amount) < 0.01);
check("and one week is a quarter of one",
  w.deposits === 4 * m.deposits && Math.abs(w.amount * 4 - m.amount) < 0.01);

// Every period must still deliver the whole goal, however it's sliced
for (const [name, p] of [["monthly", m], ["biweekly", f], ["weekly", w]]) {
  check(`${name} deposits add up to the goal`,
    Math.abs(p.deposits * p.amount - 8000) < 0.01);
}

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

// ---- tracking what you've already saved ----
{
  const g = { id: 50, title: "Phone", cost: 2350, date: inMonths(3) };
  const at = (saved) => allocateGoals([{ ...g, saved }], 99999)[0];

  console.log("\nprogress on a $2,350 goal:");
  for (const s of [0, 900, 2350]) {
    const r = at(s);
    console.log(`  saved $${String(s).padEnd(5)} ${r.progress.toFixed(0).padStart(3)}%  ` +
      `remaining $${r.remaining}  needs $${r.needed.toFixed(2)}/mo` + (r.done ? "  DONE" : ""));
  }

  check("progress is saved over cost", Math.abs(at(900).progress - 900/2350*100) < 0.01);
  check("remaining is cost minus saved", at(900).remaining === 1450);
  check("saving reduces what's needed", at(900).needed < at(0).needed);
  check("a finished goal is marked done", at(2350).done);
  check("a finished goal needs nothing more", at(2350).needed === 0);
  check("a finished goal takes no money from the pot", at(2350).gets === 0);
  check("overpaying is capped at the cost", at(9999).saved === 2350);
  check("negative saved is treated as zero", at(-50).saved === 0);
  check("missing saved field behaves as zero", allocateGoals([g], 99999)[0].saved === 0);

  // a done goal must free its money up for the others
  const two = allocateGoals(
    [{ ...g, id: 1, saved: 2350 }, { id: 2, title: "Korea", cost: 8000, date: inMonths(12) }],
    700
  );
  const korea = two.find((r) => r.title === "Korea");
  // The finished goal takes nothing, so Korea is funded to whatever it
  // needs — not capped by the other goal still holding a share.
  check("a finished goal frees its share for others",
    Math.abs(korea.gets - korea.needed) < 0.01 && korea.gets > 0);
}

check("listNames reads naturally", listNames([{name:"A"},{name:"B"},{name:"C"}]) === "A, B And C");

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} failed.`);
process.exit(failed ? 1 : 0);