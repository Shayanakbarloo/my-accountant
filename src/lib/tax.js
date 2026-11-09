// 2026 Canadian tax rates — federal, every province and territory.
// Each bracket pair is [income ceiling for this band, rate applied inside it].
//
// Sources: KPMG 2026 federal and provincial rate tables, TaxTips 2026 basic
// personal amounts, CRA CPP/EI figures. Checked against a published Ontario
// worked example — see tax.test.js.

const FEDERAL = [
  [58523, 0.14],
  [117045, 0.205],
  [181440, 0.26],
  [258482, 0.29],
  [Infinity, 0.33],
];
const FEDERAL_PERSONAL = 16452;

// Every employee gets this federal credit for work expenses (CRA T4032,
// 2026). Yukon mirrors it at its own lowest rate.
const CANADA_EMPLOYMENT_AMOUNT = 1501;

/*  Payroll deductions — not income tax, but they leave your paycheque too.

    CPP is two contributions sharing one rate. The BASE 4.95% earns a tax
    credit like any other. The newer "enhanced" part — the extra 1%, plus
    all of CPP2 — is instead deducted from income before tax is worked
    out. The app used to do neither, which overstated tax for everyone.  */
const CPP = {
  rate: 0.0595,
  baseRate: 0.0495,
  exempt: 3500,
  ceiling: 74600,
  extraCeiling: 85000,
  extraRate: 0.04,
};
const EI = { rate: 0.0163, ceiling: 68900 };

// Quebec runs its own pension plan and parental insurance, pays a lower EI
// rate, and its residents get 16.5% knocked off their federal tax.
const QPP = {
  rate: 0.063,
  baseRate: 0.053,
  exempt: 3500,
  ceiling: 74600,
  extraCeiling: 85000,
  extraRate: 0.04,
};
const QPIP = { rate: 0.0043, ceiling: 103000 };
const QC_EI = { rate: 0.013, ceiling: 68900 };
const QC_ABATEMENT = 0.165;

export const PROVINCES = {
  AB: {
    name: "Alberta",
    bpa: 22769,
    brackets: [
      [61200, 0.08], [154259, 0.10], [185111, 0.12],
      [246813, 0.13], [370220, 0.14], [Infinity, 0.15],
    ],
  },
  BC: {
    name: "British Columbia",
    bpa: 13216,
    brackets: [
      [50363, 0.0506], [100728, 0.077], [115648, 0.105], [140430, 0.1229],
      [190405, 0.147], [265545, 0.168], [Infinity, 0.205],
    ],
    // Low-income tax reduction: up to $575, shrinking by 3.56% of income
    // over $25,570 until it's gone at $41,722 (CRA T4127, 2026).
    reduction: { amount: 575, from: 25570, rate: 0.0356 },
  },
  MB: {
    name: "Manitoba",
    bpa: 15780,
    brackets: [[47000, 0.108], [100000, 0.1275], [Infinity, 0.174]],
  },
  NB: {
    name: "New Brunswick",
    bpa: 13664,
    brackets: [[52333, 0.094], [104666, 0.14], [193861, 0.16], [Infinity, 0.195]],
  },
  NL: {
    name: "Newfoundland and Labrador",
    // Raised from $11,188 to $15,000 on 1 July 2026 by the spring budget.
    // Half a year at each gives the 2026 figure: $13,094.
    bpa: 13094,
    brackets: [
      [44678, 0.087], [89354, 0.145], [159528, 0.158], [223340, 0.178],
      [285319, 0.198], [570638, 0.208], [1141275, 0.213], [Infinity, 0.218],
    ],
  },
  NS: {
    name: "Nova Scotia",
    bpa: 11932,
    brackets: [
      [30995, 0.0879], [61991, 0.1495], [97417, 0.1667],
      [157124, 0.175], [Infinity, 0.21],
    ],
  },
  NT: {
    name: "Northwest Territories",
    bpa: 18198,
    brackets: [[53003, 0.059], [106009, 0.086], [172346, 0.122], [Infinity, 0.1405]],
  },
  NU: {
    name: "Nunavut",
    bpa: 19659,
    brackets: [[55801, 0.04], [111602, 0.07], [181439, 0.09], [Infinity, 0.115]],
  },
  ON: {
    name: "Ontario",
    bpa: 12989,
    brackets: [
      [53891, 0.0505], [107785, 0.0915], [150000, 0.1116],
      [220000, 0.1216], [Infinity, 0.1316],
    ],
    // Ontario charges a surtax on the tax itself, not on income,
    // plus an income-tested health premium.
    surtax: [[5818, 0.20], [7446, 0.36]],
    health: true,
    // Low-income tax reduction: twice $300, less the tax owed, if positive.
    ontarioReduction: 300,
  },
  PE: {
    name: "Prince Edward Island",
    bpa: 15000,
    brackets: [
      [33928, 0.095], [65820, 0.1347], [106890, 0.166],
      [142250, 0.1762], [Infinity, 0.19],
    ],
  },
  QC: {
    name: "Quebec",
    bpa: 18952,
    brackets: [[54345, 0.14], [108680, 0.19], [132245, 0.24], [Infinity, 0.2575]],
    quebec: true,
  },
  SK: {
    name: "Saskatchewan",
    bpa: 20381,
    brackets: [[54532, 0.105], [155805, 0.125], [Infinity, 0.145]],
  },
  YT: {
    name: "Yukon",
    bpa: 16452,
    brackets: [
      [58523, 0.064], [117045, 0.09], [181440, 0.109],
      [500000, 0.128], [Infinity, 0.15],
    ],
    // The only territory that mirrors the federal employment amount
    employmentAmount: true,
  },
};

// The heart of it: tax each slice of income at its own rate.
// Someone on $80k does NOT pay 20.5% on all of it — only on the part
// above $58,523. This is the bit most people misunderstand about brackets.
function applyBrackets(income, brackets) {
  let tax = 0;
  let previousCeiling = 0;

  for (const [ceiling, rate] of brackets) {
    if (income <= previousCeiling) break;
    tax = tax + (Math.min(income, ceiling) - previousCeiling) * rate;
    previousCeiling = ceiling;
  }

  return tax;
}

// Ontario Health Premium — income-tested, flat within each band, caps at $900.
function healthPremium(income) {
  if (income <= 20000) return 0;
  if (income <= 25000) return Math.min(300, (income - 20000) * 0.06);
  if (income <= 36000) return 300;
  if (income <= 38500) return Math.min(450, 300 + (income - 36000) * 0.06);
  if (income <= 48000) return 450;
  if (income <= 48600) return Math.min(600, 450 + (income - 48000) * 0.25);
  if (income <= 72000) return 600;
  if (income <= 72600) return Math.min(750, 600 + (income - 72000) * 0.25);
  if (income <= 200000) return 750;
  if (income <= 200600) return Math.min(900, 750 + (income - 200000) * 0.25);
  return 900;
}

/**
 * Give it a yearly income and a province code, get back every deduction.
 * Defaults to Ontario so old saves keep working.
 *
 * Follows the CRA's payroll formulas (T4127, 2026) — the same arithmetic
 * an employer uses to work out what comes off each paycheque. tax.test.js
 * checks it against the CRA's own worked Ontario example.
 *
 * `rrsp` is a yearly RRSP contribution made through payroll. The app
 * doesn't ask for one; it's here so the test can reproduce the CRA
 * example exactly, which includes one.
 */
export function yearlyDeductions(yearlyIncome, provinceCode = "ON", { rrsp = 0 } = {}) {
  const province = PROVINCES[provinceCode] || PROVINCES.ON;
  const income = Math.max(0, Number(yearlyIncome) || 0);

  // --- payroll: pension, EI, parental insurance ---
  const pension = province.quebec ? QPP : CPP;
  const pensionable = Math.max(
    0,
    Math.min(income, pension.ceiling) - pension.exempt
  );
  const pensionBase = pensionable * pension.baseRate;
  const pensionEnhanced =
    pensionable * (pension.rate - pension.baseRate) +
    Math.max(0, Math.min(income, pension.extraCeiling) - pension.ceiling) *
      pension.extraRate;
  const pensionAmount = pensionBase + pensionEnhanced;

  const eiPlan = province.quebec ? QC_EI : EI;
  const ei = Math.min(income, eiPlan.ceiling) * eiPlan.rate;

  const parental = province.quebec
    ? Math.min(income, QPIP.ceiling) * QPIP.rate
    : 0;

  /*  Taxable income. The enhanced pension contributions come off before
      tax is worked out — they're treated like an RRSP deduction, not a
      credit. So does anything put into an RRSP through payroll.        */
  const taxable = Math.max(0, income - pensionEnhanced - rrsp);

  // Canada employment amount, capped at what you actually earned
  const employment = Math.min(CANADA_EMPLOYMENT_AMOUNT, taxable);

  // --- federal ---
  /*  Every credit is worth the lowest federal rate, 14%. Before, only the
      basic personal amount was applied — the CPP, EI and employment
      credits were missing, which overstated tax by about $1,200 a year
      at $67,600.                                                        */
  const federalCredits =
    0.14 * (FEDERAL_PERSONAL + pensionBase + ei + parental + employment);
  let federal = Math.max(0, applyBrackets(taxable, FEDERAL) - federalCredits);

  // Quebec residents pay 16.5% less federal tax, because Quebec runs
  // programs Ottawa runs everywhere else.
  if (province.quebec) federal = federal * (1 - QC_ABATEMENT);

  // --- provincial ---
  const lowestRate = province.brackets[0][1];

  // Provinces credit the same CPP and EI contributions at their own lowest
  // rate. Quebec handles these differently on its own return, so it only
  // gets the basic personal amount here.
  let provincialCredits =
    lowestRate * (province.bpa + (province.quebec ? 0 : pensionBase + ei));
  if (province.employmentAmount) provincialCredits += lowestRate * employment;

  let provincial = Math.max(
    0,
    applyBrackets(taxable, province.brackets) - provincialCredits
  );

  // Ontario's surtax is charged on the tax owing, not on income — and on
  // the ORIGINAL tax figure for both bands, so they're measured together.
  if (province.surtax) {
    const basic = provincial;
    for (const [threshold, rate] of province.surtax) {
      if (basic > threshold) provincial += (basic - threshold) * rate;
    }
  }

  // Ontario: twice $300, less the tax owed, comes off — if that's positive.
  if (province.ontarioReduction) {
    const cut = 2 * province.ontarioReduction - provincial;
    if (cut > 0) provincial -= Math.min(provincial, cut);
  }

  // British Columbia: up to $575 off, phasing out as income rises.
  if (province.reduction) {
    const r = province.reduction;
    const cut = r.amount - Math.max(0, taxable - r.from) * r.rate;
    if (cut > 0) provincial -= Math.min(provincial, cut);
  }

  const health = province.health ? healthPremium(taxable) : 0;

  return {
    federal,
    provincial: provincial + health,
    health,
    cpp: pensionAmount,
    ei,
    parental,
    taxable,
    provinceName: province.name,
    pensionLabel: province.quebec ? "QPP" : "CPP",
    total: federal + provincial + health + pensionAmount + ei + parental,
  };
}