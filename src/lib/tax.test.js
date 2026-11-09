// Plain Node test — no framework needed.
// Run from the project root with:  npm test
import { yearlyDeductions, PROVINCES } from "./tax.js";

let failed = 0;

function check(label, actual, expected, tolerance = 1) {
  const ok = Math.abs(actual - expected) <= tolerance;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    console.log(`        expected ~${expected}, got ${actual.toFixed(2)}`);
    failed++;
  }
}

/*  ---- the anchor: the CRA's own worked example ----

    From the CRA's 2026 Ontario payroll guide (T4032-ON, "Step-by-step
    calculation of tax deductions", example 1): $1,300 a week, with $80 a
    week going into an RRSP through payroll.

    This replaced an earlier anchor — "$80,000 takes home $58,933" — taken
    from a simplified example that only applied the basic personal amount.
    It skipped the CPP, EI and Canada employment credits that come off every
    real paycheque, and the app matched it to the cent, so the test passed
    while the app overstated everyone's tax by $600–$1,800 a year.

    The tolerance is a dollar: the CRA rounds its bracket constant to the
    dollar ($2,210 rather than $2,209.53), and works per paycheque rather
    than per year, which moves the last few cents.                       */
const cra = yearlyDeductions(1300 * 52, "ON", { rrsp: 80 * 52 });

console.log("CRA T4032-ON 2026, example 1 — $1,300/week, $80/week RRSP:");
console.log("  taxable    $" + cra.taxable.toFixed(2) + "   (CRA $62,798.84)");
console.log("  federal    $" + cra.federal.toFixed(2) + "   (CRA $5,957.85)");
console.log("  provincial $" + cra.provincial.toFixed(2) + "   (CRA $3,264.26)");
console.log("  combined   $" + (cra.federal + cra.provincial).toFixed(2) + "   (CRA $9,222.11)");
console.log("");

check("taxable income matches the CRA", cra.taxable, 62798.84);
check("federal tax matches the CRA", cra.federal, 5957.85);
check("Ontario tax matches the CRA", cra.provincial, 3264.26);
check("  health premium matches the CRA", cra.health, 600, 0.001);
check("combined income tax matches the CRA", cra.federal + cra.provincial, 9222.11);
check("CPP matches the CRA ($73.35 a week)", cra.cpp, 73.35 * 52);
check("EI matches the CRA ($21.19 a week)", cra.ei, 21.19 * 52);

/*  ---- the CRA's maximum credits (example 2) ----
    Above the CPP and EI ceilings, the credit base is fixed:
    $16,452 + $3,519.45 base CPP + $1,123.07 EI + $1,501 employment
    = $22,595.52, worth $3,163.37 federally. Check it by difference: tax on
    $90,000 minus tax on the same taxable income with no credits at all.  */
{
  const top = yearlyDeductions(90000, "ON");
  // 90,000 less the enhanced CPP: 1% of 71,100 plus 4% of 10,400
  const taxable = 90000 - 711 - 416;
  check("enhanced CPP comes off taxable income", top.taxable, taxable, 0.01);
  const brackets = 58523 * 0.14 + (taxable - 58523) * 0.205;
  check("federal credits at the maximum are $3,163.37",
    brackets - top.federal, 3163.37);
}

// ---- $80,000 in Ontario, for reference ----
const on = yearlyDeductions(80000, "ON");
console.log("\nOntario, $80,000 a year:");
console.log("  federal    $" + on.federal.toFixed(2));
console.log("  provincial $" + on.provincial.toFixed(2) + "  (incl. health premium)");
console.log("  CPP        $" + on.cpp.toFixed(2));
console.log("  EI         $" + on.ei.toFixed(2));
console.log("  take home  $" + (80000 - on.total).toFixed(2));
console.log("");

check("$80,000 takes home $60,302.63", 80000 - on.total, 60302.63);
check("  CPP including CPP2", on.cpp, 4230.45 + 216);
check("  EI at the maximum", on.ei, 1123.07);

// ---- low incomes, where the reductions matter ----
check("no federal tax on $15,000", yearlyDeductions(15000, "ON").federal, 0);

// Ontario's reduction: twice $300 less the tax owed. At $20,000 the basic
// tax is about $288, so the reduction wipes it out entirely.
check("Ontario reduction clears tax at $20,000",
  yearlyDeductions(20000, "ON").provincial, 0, 0.01);

// British Columbia's: $575, phasing out from $25,570 at 3.56%
{
  const bc = yearlyDeductions(30000, "BC");
  const raw = bc.taxable * 0.0506 - 0.0506 * (13216 + (30000 - 3500) * 0.0495 + 30000 * 0.0163);
  const cut = 575 - (bc.taxable - 25570) * 0.0356;
  check("BC reduction applied at $30,000", bc.provincial, Math.max(0, raw - cut));
}

// ---- Ontario surtax: both bands measured on the ORIGINAL tax ----
// The old code measured the 36% band after adding the 20% surtax, which
// overcharged anyone with roughly $109,000+ of income.
{
  const high = yearlyDeductions(150000, "ON");
  const t = high.taxable;
  const basic =
    53891 * 0.0505 + (107785 - 53891) * 0.0915 + (Math.min(t, 150000) - 107785) * 0.1116 -
    0.0505 * (12989 + 3519.45 + 1123.07);
  const surtax = 0.2 * (basic - 5818) + 0.36 * (basic - 7446);
  check("surtax uses the original tax for both bands",
    high.provincial - high.health, basic + surtax);
}

// ---- 2026 changes the old tables missed ----
check("Newfoundland's 2026 personal amount is $13,094", PROVINCES.NL.bpa, 13094, 0);
check("Alberta's lowest rate is 8%", PROVINCES.AB.brackets[0][1], 0.08, 0);
{
  // Yukon credits the employment amount at its own lowest rate, 6.4%.
  // Work out Yukon tax WITHOUT that credit; the app's figure should be
  // lower by exactly 6.4% of $1,501.
  const yt = yearlyDeductions(50000, "YT");
  const withoutIt =
    yt.taxable * 0.064 - 0.064 * (16452 + (50000 - 3500) * 0.0495 + 50000 * 0.0163);
  check("Yukon includes the employment credit",
    withoutIt - yt.provincial, 0.064 * 1501);
}

// ---- every province should produce a sane number ----
console.log("\nTake-home on $80,000 by province:");
const results = [];
for (const [code, p] of Object.entries(PROVINCES)) {
  const r = yearlyDeductions(80000, code);
  const takeHome = 80000 - r.total;
  const rate = (r.total / 80000) * 100;
  results.push({ code, name: p.name, takeHome, rate });
  console.log(
    `  ${code}  ${p.name.padEnd(26)} $${takeHome.toFixed(0).padStart(6)}  (${rate.toFixed(1)}%)`
  );
}

// Nobody should lose less than 15% or more than 45% at this income.
for (const r of results) {
  const sane = r.rate > 15 && r.rate < 45;
  if (!sane) {
    console.log(`FAIL  ${r.name} deduction rate looks wrong: ${r.rate.toFixed(1)}%`);
    failed++;
  }
}
console.log(
  results.every((r) => r.rate > 15 && r.rate < 45)
    ? "PASS  every province lands in a believable range"
    : ""
);

// Alberta's big personal amount should beat Quebec's higher rates
const ab = 80000 - yearlyDeductions(80000, "AB").total;
const qc = 80000 - yearlyDeductions(80000, "QC").total;
check("Alberta keeps more than Quebec", ab > qc ? 1 : 0, 1, 0);

// Quebec must include QPIP, which nowhere else has
const qcFull = yearlyDeductions(80000, "QC");
check("Quebec includes QPIP", qcFull.parental > 0 ? 1 : 0, 1, 0);
check("Ontario has no QPIP", yearlyDeductions(80000, "ON").parental, 0);

// ---- guards ----
check("zero income gives zero total", yearlyDeductions(0, "ON").total, 0);
check("unknown province falls back to Ontario",
  yearlyDeductions(80000, "ZZ").total, on.total);

console.log(
  failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`
);
process.exit(failed === 0 ? 0 : 1);