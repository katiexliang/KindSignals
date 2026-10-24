// Floating Signals helper: a persistent mascot in the corner. Tapping it opens
// a small panel with a contextual nudge (e.g. "log today's journal") and quick
// links — including opening the full Signals companion page and the tour. The
// primary chat lives on the Signals page, so this stays lightweight.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignalsIcon } from "./SignalsIcon";
import { api } from "../lib/api";
import type { JournalEntry } from "../lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Nudge {
  text: string;
  cta?: { label: string; to: string };
}

export function SignalsHelper({ onStartTour }: { onStartTour: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState<Nudge>({
    text: "Hi! I'm Signals. Ask me anything about your health anytime.",
  });
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .getJournal()
      .then((entries: JournalEntry[]) => {
        if (!active) return;
        const doneToday = entries.some((e) => e.date === todayIso());
        if (!doneToday) {
          setNudge({
            text: "Have you logged today's journal yet? It helps me give better insights.",
            cta: { label: "Log today", to: "/journal" },
          });
          setPulse(true);
        }
      })
      .catch(() => {
        /* keep default greeting */
      });
    return () => {
      active = false;
    };
  }, []);

  // Let other parts of the app open this helper.
  useEffect(() => {
    const openHelper = () => {
      setOpen(true);
      setPulse(false);
    };
    window.addEventListener("signals:open", openHelper);
    return () => window.removeEventListener("signals:open", openHelper);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="w-64 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <SignalsIcon className="h-7 w-7" animated />
            <span className="text-sm font-semibold text-deepsage-700">Signals</span>
          </div>
          <p className="mt-2 text-sm text-charcoal/80">{nudge.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                navigate("/signals");
                setOpen(false);
              }}
              className="rounded-full bg-deepsage-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-deepsage-600"
            >
              Chat with Signals
            </button>
            {nudge.cta && (
              <button
                type="button"
                onClick={() => {
                  navigate(nudge.cta!.to);
                  setOpen(false);
                }}
                className="rounded-full border border-sage-200 px-3 py-1.5 text-xs font-medium text-deepsage-600 transition hover:bg-sage-50"
              >
                {nudge.cta.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onStartTour();
                setOpen(false);
              }}
              className="rounded-full px-2 py-1.5 text-xs font-medium text-charcoal/50 hover:text-charcoal/80"
            >
              Tour
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label="Open Signals helper"
        data-tour="signals-helper"
        onClick={() => {
          setOpen((o) => !o);
          setPulse(false);
        }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-soft ring-1 ring-sage-200 transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300"
      >
        {pulse && (
          <span className="absolute inset-0 animate-ping rounded-full bg-deepsage-200/60" />
        )}
        <SignalsIcon className="relative h-11 w-11" />
      </button>
    </div>
  );
}
