export default function PageHeader({ title, description, actions, eyebrow, meta, className = '' }) {
  return (
    <header className={`flex flex-col gap-4 md:flex-row md:items-start md:justify-between ${className}`}>
      <div className="min-w-0">
        <div className="mb-3 h-1 w-10 rounded-full bg-[var(--color-secondary)]" />
        {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">{eyebrow}</p> : null}
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)] md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-base text-[var(--color-text-muted)] md:text-lg">{description}</p>}
        {meta ? <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3 md:justify-end">{actions}</div> : null}
    </header>
  )
}
