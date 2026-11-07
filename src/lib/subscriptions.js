// A subscription can be billed weekly or monthly, and you might pay it
// more than once in that period — a $6 coffee three mornings a week, say.
//
// Everything else in the app works in months, so this turns any
// subscription into one monthly figure.

// The app treats a month as 4 weeks, so weekly costs multiply by 4.
const WEEKS_PER_MONTH = 4;

export function monthlyCost(sub) {
  const cost = Number(sub.cost) || 0;
  const times = Number(sub.times) || 1;

  // Older saved subscriptions have no `every` field — they were all monthly.
  return sub.every === "week"
    ? cost * times * WEEKS_PER_MONTH
    : cost * times;
}

// "$17 a month" / "$6 × 3 a week" — what the row says underneath the name.
export function describe(sub) {
  const times = Number(sub.times) || 1;
  const per = sub.every === "week" ? "A Week" : "A Month";
  return times > 1
    ? `× ${times} ${per}`
    : per;
}