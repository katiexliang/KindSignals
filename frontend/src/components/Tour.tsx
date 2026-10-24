// A lightweight guided tour narrated by Signals. Steps anchor to elements
// tagged with a `data-tour` attribute; the spotlight highlights the target and
// a Signals-branded card explains it. No external dependencies.

import { useEffect, useLayoutEffect, useState } from "react";
import { SignalsIcon } from "./SignalsIcon";

export interface TourStep {
  target: string; // CSS selector (e.g. [data-tour="dashboard"])
  title: string;
  body: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function readRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function Tour({
  steps,
  onFinish,
}: {
  steps: TourStep[];
  onFinish: () => void;
}) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[i];
  const isLast = i === steps.length - 1;

  // Measure the current target (and re-measure on resize/scroll).
  useLayoutEffect(() => {
    function measure() {
      setRect(step ? readRect(step.target) : null);
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step]);

  // Scroll the target into view when the step changes.
  useEffect(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [step]);

  if (!step) return null;

  const pad = 8;
  const spotlight = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // Place the card below the target (or centered if no target found).
  const cardTop = spotlight
    ? Math.min(spotlight.top + spotlight.height + 12, window.innerHeight - 220)
    : window.innerHeight / 2 - 110;
  const cardLeft = spotlight
    ? Math.max(12, Math.min(spotlight.left, window.innerWidth - 332))
    : window.innerWidth / 2 - 160;

  return (
    <div className="fixed inset-0 z-50">
      {/* Dim overlay with a transparent spotlight hole via box-shadow. */}
      {spotlight ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-deepsage-300 transition-all"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: "0 0 0 9999px rgba(41, 59, 55, 0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-charcoal/55" />
      )}

      {/* Guide card */}
      <div
        className="absolute w-80 max-w-[calc(100vw-24px)] rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5"
        style={{ top: cardTop, left: cardLeft }}
        role="dialog"
        aria-label="Signals tour"
      >
        <div className="flex items-center gap-2">
          <SignalsIcon className="h-7 w-7" />
          <span className="text-xs font-semibold uppercase tracking-wide text-deepsage-600">
            Signals · your guide
          </span>
        </div>
        <h3 className="mt-2 text-base font-semibold text-charcoal">
          {step.title}
        </h3>
        <p className="mt-1 text-sm text-charcoal/70">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 w-1.5 rounded-full ${
                  idx === i ? "bg-deepsage-500" : "bg-sage-200"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onFinish}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-charcoal/50 hover:text-charcoal/80"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => (isLast ? onFinish() : setI((n) => n + 1))}
              className="rounded-full bg-deepsage-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-deepsage-600"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
