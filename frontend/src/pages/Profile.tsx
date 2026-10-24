// Profile: editable identity, connected apps (data sources), data coverage,
// and sign-out. Edits persist to the backend (SQLite) via PATCH /api/user.

import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { ConnectedApps } from "../components/ConnectedApps";
import { Disclaimer } from "../components/Disclaimer";
import { StateBlock } from "../components/StateBlock";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  CONTRACEPTION_CHOICES,
  DIAGNOSIS_CHOICES,
} from "../lib/types";
import type { UserOut, UserUpdate } from "../lib/types";

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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-deepsage-600/70">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-charcoal/90">{value}</dd>
    </div>
  );
}

interface EditForm {
  name: string;
  birthdate: string;
  diagnosis: string;
  contraception_method: string;
}

function toForm(u: UserOut): EditForm {
  return {
    name: u.name ?? "",
    birthdate: u.birthdate ?? "",
    diagnosis: u.diagnosis ?? "none",
    contraception_method: u.contraception_method ?? "none",
  };
}

export function Profile() {
  const { email, signOut } = useAuth();

  // Live profile (editable), connected sources, and data coverage.
  const [user, setUser] = useState<UserOut | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);


  useEffect(() => {
    let active = true;
    api
      .getUser()
      .then((u) => {
        if (!active) return;
        setUser(u);
        setForm(toForm(u));
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setLoadError(e instanceof ApiError ? e.message : "Could not load profile");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setSaveError(null);

    const patch: UserUpdate = {
      name: form.name.trim() || null,
      birthdate: form.birthdate.trim() || null,
      diagnosis: form.diagnosis || "none",
      contraception_method: form.contraception_method || "none",
    };

    api
      .updateUser(patch)
      .then((u) => {
        setUser(u);
        setForm(toForm(u));
        setEditing(false);
      })
      .catch((err: unknown) =>
        setSaveError(err instanceof ApiError ? err.message : "Could not save"),
      )
      .finally(() => setSaving(false));
  }

  function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    api
      .deleteAccount()
      .then(() => {
        // Token is cleared by the API client; clear the session so the app
        // returns to the sign-in screen.
        signOut();
      })
      .catch((err: unknown) => {
        setDeleteError(
          err instanceof ApiError ? err.message : "Could not delete account",
        );
        setDeleting(false);
      });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your profile"
        subtitle="Who you are and the apps you've connected."
        actions={
          <button
            type="button"
            onClick={signOut}
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-deepsage-700 shadow-soft transition hover:bg-sage-50"
          >
            Log out
          </button>
        }
      />

      {loading ? (
        <StateBlock kind="loading" />
      ) : loadError ? (
        <StateBlock kind="error" message={loadError} />
      ) : user && form ? (
        <>
          {/* Identity (editable) */}
          <section className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-deepsage-500 text-2xl font-bold text-white">
                  {(user.name || "?").charAt(0).toUpperCase()}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-deepsage-700">
                    {user.name || "—"}
                  </h2>
                  {user.is_demo && (
                    <p className="text-xs text-rose-400">Demo persona</p>
                  )}
                </div>
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-lg border border-deepsage-200 bg-white px-3 py-1.5 text-xs font-medium text-deepsage-700 transition hover:bg-sage-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300"
                >
                  Edit profile
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-deepsage-600/70">
                    Name
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-deepsage-600/70">
                    Date of birth
                  </span>
                  <input
                    type="date"
                    value={form.birthdate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) =>
                      setForm({ ...form, birthdate: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
                  />
                  <span className="mt-1 block text-[11px] text-charcoal/40">
                    Age is calculated from your date of birth.
                  </span>
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-deepsage-600/70">
                    Diagnosis
                  </span>
                  <select
                    value={form.diagnosis}
                    onChange={(e) =>
                      setForm({ ...form, diagnosis: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
                  >
                    {DIAGNOSIS_CHOICES.map((d) => (
                      <option key={d} value={d}>
                        {DIAGNOSIS_LABELS[d] ?? d}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[11px] text-charcoal/40">
                    Drives how insights and Signals are framed.
                  </span>
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-deepsage-600/70">
                    Contraception method
                  </span>
                  <select
                    value={form.contraception_method}
                    onChange={(e) =>
                      setForm({ ...form, contraception_method: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
                  >
                    {CONTRACEPTION_CHOICES.map((c) => (
                      <option key={c} value={c}>
                        {CONTRACEPTION_LABELS[c] ?? c}
                      </option>
                    ))}
                  </select>
                </label>

                {saveError && (
                  <p className="text-sm text-rose-400 sm:col-span-2" role="alert">
                    {saveError}
                  </p>
                )}

                <div className="flex gap-3 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-deepsage-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-deepsage-600 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setForm(toForm(user));
                      setSaveError(null);
                      setEditing(false);
                    }}
                    className="rounded-full border border-black/10 px-5 py-2 text-sm font-medium text-charcoal/70 transition hover:bg-sage-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Signed in as" value={email ?? "—"} />
                <Field
                  label="Age"
                  value={user.age !== null ? String(user.age) : "—"}
                />
                <Field
                  label="Diagnosis"
                  value={
                    user.diagnosis
                      ? (DIAGNOSIS_LABELS[user.diagnosis] ?? user.diagnosis)
                      : "—"
                  }
                />
                <Field
                  label="Contraception"
                  value={
                    user.contraception_method
                      ? (CONTRACEPTION_LABELS[user.contraception_method] ??
                        user.contraception_method)
                      : "—"
                  }
                />
              </dl>
            )}
          </section>

          {/* Connected apps */}
          <ConnectedApps />


          {/* Transparency note */}
          <section className="card bg-sage-50">
            <p className="text-xs text-charcoal/60">
              All data shown is synthetic and for demonstration only. KindSignals
              is an educational companion. It does not diagnose, predict, or
              treat. A missing response is never read as a normal value — blank days
              simply mean “not reported.”
            </p>
          </section>

          {/* Danger zone: delete account */}
          <section className="card border border-rose-200">
            <h2 className="text-base font-semibold text-rose-400">
              Delete account
            </h2>
            <p className="mt-1 text-sm text-charcoal/60">
              Permanently delete your account and all of your data — profile,
              journal entries, and connected sources. This can't be undone.
            </p>

            {deleteError && (
              <p className="mt-3 text-sm text-rose-400">{deleteError}</p>
            )}

            {confirmingDelete ? (
              <div className="mt-4 rounded-xl bg-rose-100/60 p-4">
                <p className="text-sm font-medium text-charcoal/80">
                  Are you sure? This permanently removes everything.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-full bg-rose-400 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-300 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                  >
                    {deleting ? "Deleting…" : "Yes, delete my account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingDelete(false);
                      setDeleteError(null);
                    }}
                    disabled={deleting}
                    className="rounded-full border border-black/10 px-5 py-2 text-sm font-medium text-charcoal/70 transition hover:bg-sage-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="mt-4 rounded-full border border-rose-300 px-5 py-2 text-sm font-semibold text-rose-400 transition hover:bg-rose-100/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              >
                Delete account
              </button>
            )}
          </section>
        </>
      ) : null}

      <Disclaimer className="pt-2" />
    </div>
  );
}
