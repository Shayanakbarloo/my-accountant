/*  Money, the way the page shows it.

    Whole amounts stay clean — "$2,315" — but anything with cents keeps
    them: "$1,157.50", "$231.50".

    This used to round everything to the dollar, which made correct
    arithmetic look wrong. A goal asking $1,157.50 twice showed "$1,158"
    twice, and $1,158 × 2 is $2,316 — a dollar more than the $2,315 goal
    it was meant to add up to. Anything you'd check with a calculator now
    multiplies out exactly.                                               */
export function money(amount) {
  const cents = Math.round((Number(amount) || 0) * 100);
  const whole = cents % 100 === 0;

  return (
    "$" +
    (cents / 100).toLocaleString("en-US", {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}