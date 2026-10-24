// Shared loading / error / empty display used by data-driven pages.

interface StateBlockProps {
  kind: "loading" | "error" | "empty";
  message?: string;
}

export function StateBlock({ kind, message }: StateBlockProps) {
  const text =
    message ??
    (kind === "loading"
      ? "Loading…"
      : kind === "error"
        ? "Could not load data. Is the backend running and seeded?"
        : "No data yet.");

  const tone =
    kind === "error" ? "text-amber-700 bg-amber-50" : "text-slate-500 bg-sand-50";

  return (
    <div className={`card flex items-center justify-center ${tone}`}>
      <p className="py-6 text-sm">{text}</p>
    </div>
  );
}
