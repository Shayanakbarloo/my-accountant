/*  The list of what you've actually put in.

    Goals and debts used to keep one running total: `saved: 700`. That works
    right up until you mistype. You knew you'd put in $470, $200 and $30, but
    all the app kept was 700 — so fixing a wrong entry meant doing the
    arithmetic yourself and subtracting the difference, which is exactly the
    sort of thing this app is supposed to do for you.

    Keeping each deposit as its own entry means a wrong one can just be
    deleted. Pure functions only, same as the rest of lib/: they take a list
    and hand back a new one, so React sees a change and nothing is edited in
    place.                                                                  */

// Ids only have to be unique within one session, but Date.now() on its own
// can repeat if two entries land in the same millisecond, so a counter goes
// on the end of it.
let seq = 0;

function nextId() {
  seq += 1;
  return `e${Date.now()}-${seq}`;
}

// Marks an amount carried over from an older save, where all the app kept
// was a single number. It gets a × like anything else, so it can be removed.
export const EARLIER = "earlier";

/** One entry, dated today. */
export function newEntry(amount) {
  return {
    id: nextId(),
    amount: Number(amount),
    // YYYY-MM-DD: sorts correctly as text and survives JSON intact.
    at: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Reads an entry list, folding in anything an older version saved as a plain
 * number so it isn't lost — and so it can be taken back out too.
 */
export function entryList(list, legacyTotal) {
  if (Array.isArray(list)) return list;
  const carried = Number(legacyTotal) || 0;
  return carried > 0 ? [{ id: EARLIER, amount: carried, at: null }] : [];
}

export function addEntry(list, amount) {
  return [...list, newEntry(amount)];
}

export function removeEntry(list, id) {
  return list.filter((entry) => entry.id !== id);
}

export function sumEntries(list) {
  return list.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
}

/*  ---- Which month an entry belongs to ----

    Saving is a monthly habit, not a one-off. Putting $800 aside in November
    shouldn't make December look handled, so these pick out the entries that
    belong to the month you're actually in. Nothing is stored and nothing has
    to be reset: the month rolls over on its own because these read the date
    on each entry against today.                                           */

/** The first day of the month `today` falls in. */
export function monthStart(today = new Date()) {
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

/** "November" — the month the current figures belong to. */
export function monthName(today = new Date()) {
  return today.toLocaleDateString("en-US", { month: "long" });
}

/** "December" — the month the figures start over in. */
export function nextMonthName(today = new Date()) {
  return new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    1
  ).toLocaleDateString("en-US", { month: "long" });
}

/**
 * Only the entries dated in the month `today` falls in.
 *
 * Amounts carried over from an older save have no date, so they count
 * toward the total but not toward this month — which is right, since
 * there's no telling when they were put in.
 */
export function thisMonth(entries, today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();

  return entries.filter((entry) => {
    if (!entry.at) return false;
    const [y, m] = entry.at.split("-").map(Number);
    return y === year && m - 1 === month;
  });
}

/** "Nov 7" — or "Earlier", for amounts from before entries were kept. */
export function entryDate(at) {
  if (!at) return "Earlier";

  // Split into parts rather than handing the string to new Date(). An
  // ISO date on its own is read as UTC, which in Toronto shows as the
  // day before.
  const [year, month, day] = at.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}