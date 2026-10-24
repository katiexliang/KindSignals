// Lightweight placeholder used by pages whose features arrive in later tasks.

interface PagePlaceholderProps {
  title: string;
  description: string;
  step: string;
}

export function PagePlaceholder({ title, description, step }: PagePlaceholderProps) {
  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
        {step}
      </p>
      <h2 className="mt-1 text-xl font-semibold text-slate-800">{title}</h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-600">
        {description}
      </p>
      <p className="mt-4 inline-flex rounded-lg bg-sand-100 px-3 py-1.5 text-xs text-slate-500">
        Coming in a later build step.
      </p>
    </div>
  );
}
