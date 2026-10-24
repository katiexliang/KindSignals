// Sign in or create an account. Each email is a distinct account; signup
// provisions a new user with their own synthetic WHOOP data.
//
// SECURITY (demo scope): the password is sent once over the API to be verified
// against a bcrypt hash; it is never stored client-side and is cleared from
// memory after submit. The session uses a signed token (user id only). This is
// not production-hardened (no HTTPS enforcement, email verification, or refresh
// tokens).

import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { Logo } from "../components/Logo";

type Mode = "login" | "signup";

export function SignIn() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [offerSignup, setOfferSignup] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!emailOk) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password.length === 0) {
      setError("Enter your password.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(trimmedEmail, password);
      } else {
        await signIn(trimmedEmail, password);
      }
      setPassword(""); // never retain the password
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong.";
      setError(msg);
      // If login failed on credentials, offer to create an account.
      if (mode === "login") setOfferSignup(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sage-100 to-ivory px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="h-14 w-14" />
          <h1 className="mt-3 text-xl font-bold text-deepsage-700">KindSignals</h1>
          <p className="text-sm text-charcoal/60">
            Understand your signals. Navigate your health.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mb-4 flex rounded-full bg-white p-1 ring-1 ring-black/5">
          {(["login", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setOfferSignup(false);
              }}
              className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                mode === m
                  ? "bg-deepsage-500 text-white"
                  : "text-charcoal/60 hover:bg-sage-50"
              }`}
            >
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-charcoal/80">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-charcoal/80">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
            />
            {mode === "signup" && (
              <span className="mt-1 block text-[11px] text-charcoal/40">
                At least 6 characters.
              </span>
            )}
          </div>

          {error && (
            <p className="text-sm text-rose-400" role="alert">
              {error}
            </p>
          )}

          {offerSignup && mode === "login" && (
            <div className="rounded-lg bg-sage-50 p-3 text-sm text-charcoal/70 ring-1 ring-sage-200">
              No account with this email yet?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setOfferSignup(false);
                }}
                className="font-semibold text-deepsage-600 underline underline-offset-2"
              >
                Create one
              </button>
              .
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-deepsage-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-deepsage-600 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300"
          >
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : "Log in"}
          </button>

          <p className="text-center text-xs text-charcoal/40">
            {mode === "signup"
              ? "New accounts start with synthetic demo data you can explore."
              : "Demo login: livie@demo.kindsignals / demo1234"}
          </p>
        </form>
      </div>
    </div>
  );
}
