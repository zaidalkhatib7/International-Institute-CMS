export default function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-5xl font-bold text-[var(--color-text)]">{title}</h1>
        {description && <p className="mt-2 text-xl text-[var(--color-text-muted)]">{description}</p>}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}