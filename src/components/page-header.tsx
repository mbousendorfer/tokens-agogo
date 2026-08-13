export function PageHeader({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{blurb}</p>
    </div>
  );
}

/** Marque une vue prévue mais pas encore construite, en disant à quelle étape elle arrive. */
export function ComingAtStep({ step, children }: { step: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-10">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Étape {step}
      </p>
      <div className="text-muted-foreground mt-2 max-w-2xl text-sm [&_p+p]:mt-3">{children}</div>
    </div>
  );
}
