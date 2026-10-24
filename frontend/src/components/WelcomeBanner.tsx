// Full-width deep-sage greeting banner, fronted by the Signals buddy who waves
// hello. Playful, rotating microcopy keeps it feeling alive.

import { useMemo } from "react";
import { DemoBadge } from "./DemoBadge";
import { SignalsIcon } from "./SignalsIcon";

interface WelcomeBannerProps {
  firstName?: string | null;
  subtitle?: string | null;
}

const HELLOS = [
  "here's how you're doing today",
  "let's check in on your signals",
  "I've got your latest signals ready",
  "ready when you are",
];

export function WelcomeBanner({ firstName, subtitle }: WelcomeBannerProps) {
  // Pick a line once per mount so it feels fresh but doesn't flicker.
  const line = useMemo(() => HELLOS[Math.floor(Math.random() * HELLOS.length)], []);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-deepsage-500 px-6 py-7 text-white shadow-soft sm:px-10">
      {/* decorative floating accents */}
      <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5 animate-float-soft" />
      <span className="pointer-events-none absolute right-24 bottom-2 h-10 w-10 rounded-full bg-rose-300/20 animate-float-soft" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/12">
            <SignalsIcon className="h-14 w-14" animated />
          </span>
          <div>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
              {firstName ? `Hi ${firstName}! 👋` : "Hi there! 👋"}
            </h1>
            <p className="mt-1 text-sm text-white/85">
              I'm Signals — {line}.
            </p>
            {subtitle && (
              <p className="mt-1 text-xs text-white/70">{subtitle}</p>
            )}
          </div>
        </div>
        <DemoBadge onDark />
      </div>
    </section>
  );
}
