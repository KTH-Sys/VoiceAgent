// Shared frosted card for every panel on the demo screen.

export default function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-yellow-400/80">
            {title}
          </h2>
          {hint && <p className="mt-1 text-xs text-white/35">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
