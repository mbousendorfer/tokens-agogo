export function PageHeader({
  title,
  blurb,
  eyebrow,
  actions,
}: {
  title: string;
  blurb: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-6">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-muted-foreground mb-1.5 font-mono text-[11px] tracking-[0.08em] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[26px] leading-none font-semibold tracking-[-0.03em]">
          {title}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-[13px] leading-relaxed">{blurb}</p>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

/** Marque une vue prévue mais pas encore construite, en disant à quelle étape elle arrive. */
export function ComingAtStep({ step, children }: { step: string; children: React.ReactNode }) {
  return (
    <div className="border-hairline rounded-lg border border-dashed px-6 py-10">
      <p className="text-muted-foreground font-mono text-[11px] tracking-[0.08em] uppercase">
        Étape {step}
      </p>
      <div className="text-muted-foreground mt-2 max-w-2xl text-[13px] leading-relaxed [&_p+p]:mt-3">
        {children}
      </div>
    </div>
  );
}

/** Un chiffre qu'on lit d'un coup d'œil, avec sa légende. */
export function Stat({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'neutral' | 'signal' | 'caution';
}) {
  return (
    <div className="border-hairline bg-surface rounded-lg border p-4">
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.04em] uppercase">
        {label}
      </p>
      <p
        className={
          'font-display mt-2 text-[30px] leading-none font-semibold tracking-[-0.03em] tabular-nums ' +
          (tone === 'signal' ? 'text-signal' : tone === 'caution' ? 'text-caution' : '')
        }
      >
        {value}
      </p>
      {detail && <p className="text-muted-foreground mt-1.5 text-[12px] leading-snug">{detail}</p>}
    </div>
  );
}
