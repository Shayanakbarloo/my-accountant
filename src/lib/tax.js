// 2026 Canadian tax rates.
// Each pair is [income ceiling for this band, rate applied inside it].
const FEDERAL = [
  [58523, 0.14],
  [117045, 0.205],
  [181440, 0.26],
  [258482, 0.29],
  [Infinity, 0.33],
];

const ONTARIO = [
  [53891, 0.0505],
  [107785, 0.0915],
  [150000, 0.1116],
  [220000, 0.1216],
  [Infinity, 0.1316],
];

// Income everyone gets tax-free before anything is charged
const FEDERAL_PERSONAL = 16452;
const ONTARIO_PERSONAL = 12989;

// Payroll deductions — not income tax, but they leave your paycheque too
const CPP = { rate: 0.0595, exempt: 3500, ceiling: 74600, extraCeiling: 85000, extraRate: 0.04 };
const EI = { rate: 0.0163, ceiling: 68900 };

// The heart of it: tax each slice of income at its own rate.
// Someone on $80k does NOT pay 20.5% on all of it — only on the part
// above $58,523. This is the bit most people misunderstand about brackets.
function applyBrackets(income, brackets) {
  let tax = 0;
  let previousCeiling = 0;

  for (const [ceiling, rate] of brackets) {
    if (income <= previousCeiling) break;

    const sliceOfIncome = Math.min(income, ceiling) - previousCeiling;
    tax = tax + sliceOfIncome * rate;
    previousCeiling = ceiling;
  }

  return tax;
}

// Give it a yearly income, get back every deduction, itemised.
export function yearlyDeductions(yearlyIncome) {
  const federal = Math.max(
    0,
    applyBrackets(yearlyIncome, FEDERAL) - FEDERAL_PERSONAL * 0.14
  );

  const ontario = Math.max(
    0,
    applyBrackets(yearlyIncome, ONTARIO) - ONTARIO_PERSONAL * 0.0505
  );

  const cpp =
    Math.max(0, Math.min(yearlyIncome, CPP.ceiling) - CPP.exempt) * CPP.rate +
    Math.max(0, Math.min(yearlyIncome, CPP.extraCeiling) - CPP.ceiling) * CPP.extraRate;

  const ei = Math.min(yearlyIncome, EI.ceiling) * EI.rate;

  return {
    federal,
    ontario,
    cpp,
    ei,
    total: federal + ontario + cpp + ei,
  };
}