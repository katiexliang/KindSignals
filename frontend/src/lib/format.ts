// Small display helpers. Missing values render as an em dash, never as 0.

export const EMPTY = "—";

export function fmtNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined) return EMPTY;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function fmtMinutesAsHours(min: number | null | undefined): string {
  if (min === null || min === undefined) return EMPTY;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
