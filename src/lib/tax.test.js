// Plain Node test — no framework needed.
// Run from the project root with:  node src/lib/tax.test.js
import { yearlyDeductions } from "./tax.js";

let failed = 0;

function check(label, actual, expected, tolerance = 1) {
  const ok = Math.abs(actual - expected) <= tolerance;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    console.log(`        expected ~${expected}, got ${actual.toFixed(2)}`);
    failed++;
  }
}

// Published worked example: Ontario, $80,000 employment income, single filer.
// If you ever change the tax tables, this is your safety net.
const r = yearlyDeductions(80000);

console.log("On $80,000 a year in Ontario:");
console.log("  federal   $" + r.federal.toFixed(2));
console.log("  ontario   $" + r.ontario.toFixed(2));
console.log("  health    $" + r.health.toFixed(2));
console.log("  cpp       $" + r.cpp.toFixed(2));
console.log("  ei        $" + r.ei.toFixed(2));
console.log("  total     $" + r.total.toFixed(2));
console.log("  take home $" + (80000 - r.total).toFixed(2));
console.log("");

check("take-home matches the published $58,933", 80000 - r.total, 58933);
check("federal portion", r.federal, 10293);
check("ontario portion", r.ontario, 4455);
check("health premium", r.health, 750);
check("cpp including second tier", r.cpp, 4446);
check("ei", r.ei, 1123);

// Low income should owe no federal tax — the personal amount covers it
check("no federal tax on $15,000", yearlyDeductions(15000).federal, 0);

// Zero income must not produce NaN
const zero = yearlyDeductions(0);
check("zero income gives zero total", zero.total, 0);

console.log(
  failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`
);
process.exit(failed === 0 ? 0 : 1);