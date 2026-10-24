// Lower-right dashboard card: compact entry point to Signals. Intentionally
// simple since it is narrower than the other two sections.

import { Link } from "react-router-dom";
import { SignalsIcon } from "./SignalsIcon";

export function PMOSBuddyCard() {
  return (
    <div className="card card-hover flex h-full flex-col items-start">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-100"><SignalsIcon className="h-10 w-10" animated /></span>

      <h2 className="mt-3 text-base font-semibold text-charcoal">Signals</h2>
      <p className="mt-2 flex-1 text-sm text-charcoal/70">
        Your supportive companion. Ask about what your signals mean, with cited
        research and clear limits — never a diagnosis.
      </p>

      <Link
        to="/signals"
        className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-full bg-deepsage-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-deepsage-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300"
      >
        Ask Signals
      </Link>
    </div>
  );
}
