// A single sage-tinted metric tile for the dashboard's first row.
// Values and footnotes are passed in already formatted so this stays display-only.

import type { ReactNode } from "react";

export interface HealthMetricCardProps {
  label: string;
  value: string; // already formatted; "No data available" when absent
  unit?: string | null;
  footnote?: ReactNode; // baseline / trend / efficiency line
  trend?: "up" | "down" | "flat" | null;
  hasData?: boolean;
  onClick?: () => void;
}

const TREND_GLYPH: Record<string, string> = {
  up: "↗",
  down: "↘",
  flat: "→",
};

export function HealthMetricCard({
  label,
  value,
  unit,
  footnote,
  trend,
  hasData = true,
  onClick,
}: HealthMetricCardProps) {
  const clickable = !!onClick && hasData;
  const Root: any = clickable ? "button" : "div";
  return (
    <Root
      {...(clickable ? { type: "button", onClick } : {})}
      className={`flex min-h-[9.5rem] flex-col rounded-2xl bg-sage-100 p-4 text-left ring-1 ring-sage-200 transition duration-200 ${
        clickable
          ? "hover:-translate-y-0.5 hover:bg-sage-200 hover:shadow-md hover:ring-sage-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300"
          : ""
      }`}
    >
      <p className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-deepsage-600">
        {label}
        {clickable && (
          <span className="text-[10px] font-normal normal-case text-deepsage-500/70">
            view days ›
          </span>
        )}
      </p>

      <div className="mt-auto">
        {hasData ? (
          <p className="flex items-baseline gap-1 text-charcoal">
            <span className="text-3xl font-bold leading-none">{value}</span>
            {unit && (
              <span className="text-sm font-medium text-deepsage-600">
                {unit}
              </span>
            )}
            {trend && (
              <span className="ml-1 text-lg text-deepsage-500" aria-hidden>
                {TREND_GLYPH[trend]}
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm font-medium text-deepsage-600">
            No data available
          </p>
        )}

        {footnote && hasData && (
          <p className="mt-2 text-xs text-deepsage-600/80">{footnote}</p>
        )}
      </div>
    </Root>
  );
}
