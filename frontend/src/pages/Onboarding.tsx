// Post-signup onboarding. Collects first/last name, birthday, diagnosis, and
// contraception method, then offers to connect WHOOP and/or a health app.
// Nothing is pre-selected: if the user connects neither, they start with no
// wearable data (and the dashboard shows empty states). A "Connecting…" screen
// is shown while the request completes.

import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Logo } from "../components/Logo";
import { CONTRACEPTION_CHOICES, DIAGNOSIS_CHOICES } from "../lib/types";

const DIAGNOSIS_LABELS: Record<string, string> = {
  none: "No diagnosis",
  pcos_pmos: "PCOS / PMOS",
};
const CONTRACEPTION_LABELS: Record<string, string> = {
  none: "None",
  pill: "Birth control pill",
  iud: "IUD",
  implant: "Implant",
  ring: "Vaginal ring",
  patch: "Patch",
  injection: "Injection",
  other: "Other",
};

export function Onboarding() {
  const { refreshUser } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [diagnosis, setDiagnosis] = useState("none");
  const [contraception, setContraception] = useState("none");
  const [connectWhoop, setConnectWhoop] = useState(false); // not pre-selected
  const [connectHealth, setConnectHealth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.completeOnboarding({
        name: `${firstName.trim()} ${lastName.trim()}`,
        birthdate: birthdate || null,
        diagnosis,
        contraception_method: contraception,
        connect_whoop: connectWhoop,
        connect_health: connectHealth,
      });
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
      setBusy(false);
    }
    // On success we intentionally stay in the busy state; refreshUser swaps the
    // screen to the dashboard. Leaving `busy` true keeps the connecting screen up.
  }

  // Connecting / loading screen.
  if (busy) {
    const targets = [
      connectWhoop && "WHOOP",
      connectHealth && "your health app",
    ].filter(Boolean);
    const msg =
      targets.length > 0
        ? `Connecting to ${targets.join(" and ")}…`
        : "Setting up your profile…";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-sage-100 to-ivory px-4 text-center">
        <div className="relative mb-6 h-14 w-14">
          <span className="absolute inset-0 animate-ping rounded-full bg-deepsage-300/50" />
          <span className="relative flex h-14 w-14 items-center justify-center">
            <Logo className="h-12 w-12" />
          </span>
        </div>
        <p className="text-base font-semibold text-deepsage-700">{msg}</p>
        <p className="mt-1 text-sm text-charcoal/50">
          Bringing your signals together.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sage-100 to-ivory px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="h-12 w-12" />
          <h1 className="mt-3 text-xl font-bold text-deepsage-700">
            Let's set up your profile
          </h1>
          <p className="text-sm text-charcoal/60">
            A few quick details so your insights are relevant. You can change any
            of these later in your profile.
          </p>
        </div>

        <form onSubmit={submit} className="card space-y-5">
          {/* Name first */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm font-medium text-charcoal/80">
                First name
              </span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-charcoal/80">
                Last name
              </span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal/80">
              Date of birth
            </label>
            <input
              type="date"
              value={birthdate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirthdate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
            />
            <span className="mt-1 block text-[11px] text-charcoal/40">
              Your age is calculated from this.
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal/80">
              Diagnosis
            </label>
            <select
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
            >
              {DIAGNOSIS_CHOICES.map((d) => (
                <option key={d} value={d}>
                  {DIAGNOSIS_LABELS[d] ?? d}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-charcoal/40">
              Used to frame your insights and Signals — never to diagnose.
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal/80">
              Contraception method
            </label>
            <select
              value={contraception}
              onChange={(e) => setContraception(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
            >
              {CONTRACEPTION_CHOICES.map((c) => (
                <option key={c} value={c}>
                  {CONTRACEPTION_LABELS[c] ?? c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 border-t border-sage-200 pt-4">
            <p className="text-sm font-medium text-charcoal/80">
              Connect your data{" "}
              <span className="font-normal text-charcoal/40">(optional)</span>
            </p>
            <label className="flex items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-black/10">
              <input
                type="checkbox"
                checked={connectWhoop}
                onChange={(e) => setConnectWhoop(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-deepsage-500"
              />
              <span>
                <span className="text-sm font-medium text-charcoal">WHOOP</span>
                <span className="block text-xs text-charcoal/60">
                  Recovery, HRV, resting heart rate, sleep, and strain. Demo uses
                  synthetic data.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-black/10">
              <input
                type="checkbox"
                checked={connectHealth}
                onChange={(e) => setConnectHealth(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-deepsage-500"
              />
              <span>
                <span className="text-sm font-medium text-charcoal">
                  Apple Health / Samsung Health
                </span>
                <span className="block text-xs text-charcoal/60">
                  Ask to connect a health app. Real sync is coming soon.
                </span>
              </span>
            </label>
            <p className="text-[11px] text-charcoal/40">
              If you connect neither, you'll start with no wearable data — you
              can connect a source anytime from your profile.
            </p>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-full bg-deepsage-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-deepsage-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300"
          >
            Continue to dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
