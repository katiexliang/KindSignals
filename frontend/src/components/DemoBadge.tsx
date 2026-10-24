// Persistent indicator that the app is running on synthetic demo data.
// `onDark` renders a high-contrast version for use on the deep-sage banner.

export function DemoBadge({ onDark = false }: { onDark?: boolean }) {
  const cls = onDark
    ? "bg-white/15 text-white ring-1 ring-white/25"
    : "bg-lavender-100 text-lavender-600";
  const dot = onDark ? "bg-white/80" : "bg-lavender-500";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cls}`}
      title="All data shown is synthetic and for demonstration only."
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      Synthetic demo data
    </span>
  );
}
