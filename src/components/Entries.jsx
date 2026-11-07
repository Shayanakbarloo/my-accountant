import { money } from "../lib/format.js";
import { entryDate } from "../lib/entries.js";

/*  Everything you've put in, one pill each, with an × to take it back out.

    Newest first, because the entry you want to undo is nearly always the
    one you just typed.

    Used by both Goals and Debts — the only difference between them is the
    word in the tooltip, so that comes in as a prop.                       */

function Entries({ entries, onRemove, label = "Entry" }) {
  if (entries.length === 0) return null;

  return (
    <ul className="entries">
      {[...entries].reverse().map((entry) => (
        <li key={entry.id}>
          <span className="entry-amount">{money(entry.amount)}</span>
          <span className="entry-when">{entryDate(entry.at)}</span>
          <button
            className="entry-x"
            title={`Remove This ${money(entry.amount)} ${label}`}
            aria-label={`Remove ${money(entry.amount)} ${label}`}
            onClick={() => onRemove(entry.id)}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

export default Entries;
