import { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { Logo } from "./components/Logo";
import { BackendStatus } from "./components/BackendStatus";
import { Tour, type TourStep } from "./components/Tour";
import { SignalsHelper } from "./components/SignalsHelper";
import { Dashboard } from "./pages/Dashboard";
import { Journal } from "./pages/Journal";
import { Signals } from "./pages/Signals";
import { Summary } from "./pages/Summary";
import { Profile } from "./pages/Profile";
import { SignIn } from "./pages/SignIn";
import { Onboarding } from "./pages/Onboarding";
import { useAuth } from "./lib/auth";

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="welcome"]',
    title: "Hi, I'm Signals",
    body: "I'll show you around. This is your dashboard — a daily snapshot of how you're doing.",
  },
  {
    target: '[data-tour="metrics"]',
    title: "Your signals",
    body: "These five cards summarize your WHOOP-style metrics: recovery, HRV, resting heart rate, sleep, and strain.",
  },
  {
    target: '[data-tour="insights"]',
    title: "Daily insights",
    body: "I surface descriptive patterns in your data here — observations only, never a diagnosis.",
  },
  {
    target: '[data-tour="journal"]',
    title: "Your journal",
    body: "Log how you feel each day. It's all voluntary, and blank days are never counted as 'no symptom'.",
  },
  {
    target: '[data-tour="signals-helper"]',
    title: "Ask me anything",
    body: "Tap me down here anytime to chat about your signals. I answer from your own data and flag what it can't tell us.",
  },
];

const tourSeenKey = (userId: number | undefined) =>
  `kindsignals.tourSeen.${userId ?? "unknown"}`;

export default function App() {
  const { isAuthenticated, initializing, user } = useAuth();
  const navigate = useNavigate();
  const [showTour, setShowTour] = useState(false);

  // Start the tour once per account, after onboarding completes. The
  // seen-flag is keyed by user id, so every new account gets its own tour
  // even on a shared browser.
  useEffect(() => {
    if (!user?.onboarding_complete) return;
    let seen = false;
    try {
      seen = localStorage.getItem(tourSeenKey(user.id)) === "1";
    } catch {
      /* ignore */
    }
    if (!seen) {
      navigate("/");
      setShowTour(true);
    }
  }, [user?.onboarding_complete, user?.id, navigate]);

  function finishTour() {
    setShowTour(false);
    try {
      localStorage.setItem(tourSeenKey(user?.id), "1");
    } catch {
      /* ignore */
    }
  }

  function startTour() {
    navigate("/");
    setShowTour(true);
  }

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory text-sm text-charcoal/50">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  // Authenticated but hasn't finished onboarding -> collect details first.
  if (user && !user.onboarding_complete) {
    return <Onboarding />;
  }

  return (
    <div className="min-h-full">
      {/* Full-width top navigation */}
      <header className="sticky top-0 z-10 border-b border-black/5 bg-ivory/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo className="h-9 w-9" />
            <p className="text-lg font-bold text-deepsage-700">KindSignals</p>
          </div>

          <div className="flex items-center gap-3">
            <NavBar />
            <div className="hidden sm:block">
              <BackendStatus />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>

      <SignalsHelper onStartTour={startTour} />

      {showTour && <Tour steps={TOUR_STEPS} onFinish={finishTour} />}
    </div>
  );
}
