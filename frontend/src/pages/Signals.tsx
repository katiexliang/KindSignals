// Signals — a personal, research-backed PCOS companion. The chat is the primary
// feature. Each reply is grounded in the user's own data + journal and the
// curated research library, and clearly separates: what the data show, what
// research suggests, what's uncertain, and what to consider next. Safety
// checks surface urgent/clinical guidance. Nothing clinical is fabricated.

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { SignalsIcon } from "../components/SignalsIcon";
import { Disclaimer } from "../components/Disclaimer";
import type { BuddyResponse } from "../lib/types";

interface ChatMessage {
  id: string;
  role: "user" | "signals";
  text?: string;
  answer?: BuddyResponse;
}

let counter = 0;
const nextId = () => `m${counter++}`;

const PROMPTS = [
  { label: "Understand my symptoms", q: "What patterns have you noticed in my symptoms?" },
  { label: "Explore my health patterns", q: "What changed in my health over the last month?" },
  { label: "Learn about PCOS", q: "What does research say about managing PCOS?" },
  { label: "Prepare for my appointment", q: "What should I ask my doctor?" },
];

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-deepsage-500 px-4 py-2.5 text-sm text-white">
        {text}
      </div>
    </div>
  );
}

function SignalsText({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sage-100">
        <SignalsIcon className="h-5 w-5" />
      </span>
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-sm text-charcoal/80 ring-1 ring-black/5">
        {text}
      </div>
    </div>
  );
}

function Block({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "sage" | "rose" | "plain";
  children: React.ReactNode;
}) {
  const cls = {
    sage: "bg-sage-50",
    rose: "bg-rose-100/50",
    plain: "",
  }[tone];
  return (
    <div className={`rounded-lg px-3 py-2 ${cls}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-deepsage-600">
        {title}
      </p>
      <div className="mt-1 space-y-1 text-sm text-charcoal/80">{children}</div>
    </div>
  );
}

function AnswerBubble({ answer }: { answer: BuddyResponse }) {
  const [showSources, setShowSources] = useState(false);
  const urgent = answer.safety_level !== "ok";

  return (
    <div className="flex items-end gap-2">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sage-100">
        <SignalsIcon className="h-5 w-5" />
      </span>
      <div className="max-w-[88%] space-y-3 rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm leading-relaxed text-charcoal/80 ring-1 ring-black/5">
        {/* Safety banner first when relevant */}
        {urgent && answer.safety_message && (
          <div className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-500 ring-1 ring-rose-200">
            {answer.safety_message}
          </div>
        )}

        {answer.greeting && (
          <p className="text-charcoal/70">{answer.greeting}</p>
        )}

        {answer.personal_observations.length > 0 && (
          <Block title="What your data show" tone="sage">
            {answer.personal_observations.map((o, i) => (
              <p key={i}>{o}</p>
            ))}
          </Block>
        )}

        {answer.scientific_evidence.length > 0 && (
          <Block title="What research suggests" tone="plain">
            {answer.scientific_evidence.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </Block>
        )}

        {answer.uncertainty.length > 0 && (
          <Block title="What's uncertain" tone="rose">
            {answer.uncertainty.map((u, i) => (
              <p key={i} className="text-xs text-charcoal/70">
                {u}
              </p>
            ))}
          </Block>
        )}

        {answer.consider_next.length > 0 && (
          <Block title="What you could consider" tone="plain">
            <ul className="list-disc space-y-1 pl-5">
              {answer.consider_next.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </Block>
        )}

        {answer.clinician_questions.length > 0 && (
          <Block title="Questions for your clinician" tone="plain">
            <ul className="list-disc space-y-1 pl-5">
              {answer.clinician_questions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </Block>
        )}

        {answer.citations.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowSources((v) => !v)}
              className="text-xs font-medium text-deepsage-600 hover:underline"
            >
              {showSources ? "Hide sources" : `Sources (${answer.citations.length})`}
            </button>
            {showSources && (
              <ul className="mt-2 space-y-1">
                {answer.citations.map((c) => (
                  <li key={c.id} className="text-[11px] text-charcoal/50">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-deepsage-600 hover:underline"
                    >
                      {c.title}
                    </a>{" "}
                    — {c.authors} ({c.year})
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-end gap-2">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sage-100">
        <SignalsIcon className="h-5 w-5" />
      </span>
      <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 ring-1 ring-black/5">
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-deepsage-300 [animation-delay:-0.2s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-deepsage-300 [animation-delay:-0.1s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-deepsage-300" />
        </span>
      </div>
    </div>
  );
}

export function Signals() {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(" ")[0] : null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    // Build recent conversation history for multi-turn context (last 8 turns).
    const history = messages
      .slice(-8)
      .map((m) => ({
        role: m.role,
        text: m.answer
          ? [...m.answer.personal_observations, ...m.answer.scientific_evidence].join(" ")
          : m.text ?? "",
      }))
      .filter((t) => t.text);

    setMessages((m) => [...m, { id: nextId(), role: "user", text: q }]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const resp = await api.askBuddy(q, history);
      setMessages((m) => [...m, { id: nextId(), role: "signals", answer: resp }]);
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "I couldn't reach your data just now.";
      setError(msg);
      setMessages((m) => [
        ...m,
        { id: nextId(), role: "signals", text: `Sorry — ${msg} Please try again.` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="space-y-6">
      {/* Welcome area */}
      <section className="rounded-3xl bg-deepsage-500 px-6 py-6 text-white shadow-soft sm:px-8">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <SignalsIcon className="h-12 w-12" animated />
          </span>
          <div>
            <h1 className="text-2xl font-bold leading-tight">
              {firstName ? `Hi ${firstName}, I'm Signals` : "Hi, I'm Signals"}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Your PCOS companion. Ask me about your symptoms, patterns, or what
              research says — I answer from your own data and trusted sources,
              and I'll never diagnose or prescribe.
            </p>
          </div>
        </div>
      </section>

      {/* Conversation */}
      <section className="card flex h-[34rem] flex-col p-0">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <SignalsIcon className="h-20 w-20" animated />
              <p className="mt-3 text-sm font-medium text-charcoal/70">
                What's on your mind today? 🌿
              </p>
              <p className="mt-1 max-w-sm text-xs text-charcoal/50">
                Pick a starting point below, or just type — I'm all ears.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="animate-pop-in">
                {m.role === "user" ? (
                  <UserBubble text={m.text ?? ""} />
                ) : m.answer ? (
                  <AnswerBubble answer={m.answer} />
                ) : (
                  <SignalsText text={m.text ?? ""} />
                )}
              </div>
            ))
          )}
          {loading && <Typing />}
          <div ref={endRef} />
        </div>

        {/* Suggested prompts (shown until the conversation starts) */}
        {empty && (
          <div className="grid grid-cols-2 gap-2 border-t border-black/5 p-3">
            {PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => send(p.q)}
                className="rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-left text-xs font-medium text-deepsage-700 transition hover:bg-sage-100"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-black/5 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Signals about your health…"
            className="flex-1 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-deepsage-500 text-white transition hover:bg-deepsage-600 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M3 11l18-8-8 18-2-7-8-3z" />
            </svg>
          </button>
        </form>
      </section>

      {error && !messages.length && (
        <p className="px-1 text-sm text-rose-400">{error}</p>
      )}

      <Disclaimer className="pt-2" />
    </div>
  );
}
