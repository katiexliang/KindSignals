// Shared deep-sage page banner, matching the dashboard's welcome hero so every
// page has a consistent identity. Optional actions render on the right.

import type { ReactNode } from "react";
import { DemoBadge } from "./DemoBadge";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  showDemoBadge?: boolean;
  icon?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  showDemoBadge = true,
  icon,
}: PageHeaderProps) {
  return (
    <section className="rounded-3xl bg-deepsage-500 px-8 py-8 text-white shadow-soft sm:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm text-white/80">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {showDemoBadge && <DemoBadge onDark />}
          {actions}
        </div>
      </div>
    </section>
  );
}
