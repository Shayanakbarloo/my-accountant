import { yearlyDeductions } from "./tax.js";

const result = yearlyDeductions(80000);

console.log("On $80,000 a year in Ontario:");
console.log("  federal   $" + result.federal.toFixed(2));
console.log("  ontario   $" + result.ontario.toFixed(2));
console.log("  cpp       $" + result.cpp.toFixed(2));
console.log("  ei        $" + result.ei.toFixed(2));
console.log("  total     $" + result.total.toFixed(2));
console.log("  take home $" + (80000 - result.total).toFixed(2));