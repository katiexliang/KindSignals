// Shared educational disclaimer shown on every page. KindSignals never
// diagnoses, predicts, or treats, and all demo data is synthetic.

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-center text-xs leading-relaxed text-charcoal/50 ${className}`}
    >
      KindSignals is an educational companion — it does not diagnose, predict, or
      treat, and is not a substitute for professional medical advice. All demo
      data is synthetic.
    </p>
  );
}
