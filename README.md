# My Accountant

**[my-accountant-gamma.vercel.app](https://my-accountant-gamma.vercel.app)**

Most budgeting tools ask what you earn and take the number at face value. This
one starts from your hourly wage and works out what actually reaches your bank
account — after federal tax, provincial tax, CPP and EI — then shows where the
rest goes before you've spent any of it.

Built with React and Vite. No account needed; everything stays in your browser.

---

## What it does

**Works out your real take-home.** Enter your hourly rate, your hours, and your
province. It applies the 2026 tax brackets properly — each slice of income at
its own rate, not a flat percentage — including the personal amounts, Ontario's
surtax and health premium, CPP's second tier, and Quebec's separate QPP, QPIP
and federal abatement. All 13 provinces and territories.

**Tracks what leaves.** Subscriptions can be weekly or monthly and charged more
than once a period, so a $6 coffee three mornings a week is counted as the $72
a month it really is.

**Plans debts with interest.** Give it a balance, a rate and an optional
deadline and it uses the standard amortisation formula to work out the payment
and how much of it is interest. Without a deadline it assumes a quarter of your
spare money and tells you when you'd be clear. If the interest outruns what you
can pay, it says so rather than printing a payoff date in the next century.

**Judges goals against what's actually left.** Debts have first claim on your
money, so goals are measured against what survives them. Two things competing
for the same dollar can't both report that they fit.

**Shows where it all goes.** A donut chart breaks your gross pay into tax,
subscriptions, debt, goals and what's free. Click any slice to open it up and
see which subscription or debt is taking the biggest share.

---

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # checks the tax maths
npm run build    # production build
```

---

## How it's organised

```
src/
├── App.jsx              the page, and the order money flows through it
├── index.css            all styling, design tokens at the top
├── lib/                 calculations — no React in here
│   ├── tax.js           2026 federal, provincial, CPP/QPP, EI, QPIP
│   ├── tax.test.js      run with: npm test
│   ├── Debt.js          amortisation and goal planning
│   ├── subscriptions.js weekly/monthly normalisation
│   └── format.js        currency formatting
└── components/
    ├── Subscriptions.jsx
    ├── Debts.jsx
    ├── Goals.jsx
    └── Breakdown.jsx    the donut chart
```

The rule throughout: **`lib/` works things out, `components/` display them.**
Nothing in `lib/` imports React, which means all of it can be tested from a
terminal in under a second without a browser. When a component starts filling
up with formulas, that's the signal to move them out.

---

## The money, in order

Each figure feeds the next:

```
gross       hourly rate × hours
  ↓ tax     brackets applied to true annual income
take home
  ↓ subs    subscriptions, normalised to monthly
left over   ← debts are judged against this
  ↓ debts   each debt's required payment, interest included
free        ← goals are judged against this
  ↓ goals   each goal's required monthly saving
truly free
```

A month is treated as four weeks throughout, so every figure on the page agrees
with every other. Tax is the one exception: the *rate* is calculated on a real
52-week year, because brackets apply to what you actually earn, and that rate is
then applied to the displayed figures.

---

## Testing the tax engine

`npm test` checks against a published worked example — **$80,000 in Ontario
should leave $58,933 take-home** — and verifies each component separately:
federal, provincial, health premium, CPP including the second tier, and EI.

It then runs all 13 jurisdictions and asserts each lands in a believable range,
which catches a mistyped bracket that would otherwise look plausible:

```
AB  Alberta                    $59,183  (26.0%)
BC  British Columbia           $59,976  (25.0%)
NS  Nova Scotia                $54,826  (31.5%)
NU  Nunavut                    $60,998  (23.8%)
ON  Ontario                    $58,933  (26.3%)
QC  Quebec                     $55,641  (30.4%)
...
```

Having this made adding twelve provinces to a working Ontario calculator a
safe change rather than a nervous one.

---

## Some decisions worth explaining

**The chart's colours aren't arbitrary.** They were checked against a
colourblind-contrast validator, and the slice order is part of that: red beside
green is nearly indistinguishable under deuteranopia, so they're kept apart in
the ring. Every slice is also named and valued in the legend, so the chart never
relies on colour alone. Drilling into a category uses tints of that category's
hue — lightness differences survive every type of colour vision deficiency,
which makes a light-to-dark ramp the safest way to separate items within one
colour.

**The legend is hoverable and clickable, not just decoration.** Hover doesn't
exist on a phone, so without it the chart's detail would be unreachable on
mobile.

**Debt without a deadline can be unpayable, and the app says so.** Owing
$100,000 at 22% with $150 spare means the balance grows. Printing a payoff date
would be worse than useless.

---

## Scope and limits

Canadian tax only, 2026 rates, single filer, employment income, no RRSP
contributions or credits. It's a solid budgeting estimate, not a tax return —
which is what the disclaimer on the page says.

Data lives in the browser via `localStorage`, so it's per-device and private to
you, but it won't follow you between your laptop and your phone. A Supabase
schema with Row Level Security is written and ready in `supabase/` for when
accounts get added.

---

## Built with

React 18 · Vite · Recharts · deployed on Vercel

---

Copyright © 2026 Shayan Akabrloyshabghai. All rights reserved.
