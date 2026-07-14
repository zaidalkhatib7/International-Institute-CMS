export default function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="mb-3 h-1 w-10 rounded-full bg-[var(--color-secondary)]" />
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)] md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-base text-[var(--color-text-muted)] md:text-lg">{description}</p>}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}
