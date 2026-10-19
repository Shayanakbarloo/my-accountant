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

// ---- the anchor: a published Ontario worked example ----
// $80,000 employment income, single filer, should leave $58,933 take-home.
const on = yearlyDeductions(80000, "ON");

console.log("Ontario, $80,000 a year:");
console.log("  federal    $" + on.federal.toFixed(2));
console.log("  provincial $" + on.provincial.toFixed(2) + "  (incl. health premium)");
console.log("  CPP        $" + on.cpp.toFixed(2));
console.log("  EI         $" + on.ei.toFixed(2));
console.log("  total      $" + on.total.toFixed(2));
console.log("  take home  $" + (80000 - on.total).toFixed(2));
console.log("");

check("Ontario take-home matches published $58,933", 80000 - on.total, 58933);
check("  federal portion", on.federal, 10293);
check("  Ontario tax incl. health", on.provincial, 5205);
check("  health premium", on.health, 750);
check("  CPP including second tier", on.cpp, 4446);
check("  EI", on.ei, 1123);

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
check("no federal tax on $15,000", yearlyDeductions(15000, "ON").federal, 0);
check("zero income gives zero total", yearlyDeductions(0, "ON").total, 0);
check("unknown province falls back to Ontario",
  yearlyDeductions(80000, "ZZ").total, on.total);

console.log(
  failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`
);
process.exit(failed === 0 ? 0 : 1);