import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './Card'
import EmptyState from './EmptyState'

/*
 * density "compact" narrows the cell padding and drops the fixed 780px minimum,
 * for a wide list that must fit a laptop beside the sidebar (platform walk, 17 Oct 2026, UI-18).
 */
export default function DataTableShell({ title, description, actions, columns = [], rows = [], emptyText = 'No data available.', emptyDescription, emptyAction, caption, density = 'regular' }) {
  const compact = density === 'compact'
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b border-[var(--color-border)] md:flex-row md:items-center md:justify-between">
        <div><CardTitle>{title}</CardTitle>{description ? <CardDescription>{description}</CardDescription> : null}</div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative overflow-x-auto" tabIndex="0">
          <table className={`w-full border-collapse ${compact ? 'min-w-[640px]' : 'min-w-[780px]'}`} aria-label={title}>
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                {columns.map((column) => (
                  <th key={column.key} className={`${compact ? 'px-4' : 'px-6'} py-4 text-start text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]`}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, rowIndex) => (
                  <tr key={row.id ?? rowIndex} className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-subtle)]">
                    {columns.map((column) => (
                      <td key={column.key} className={`${compact ? 'px-4 py-4' : 'px-6 py-5'} text-[var(--color-text)]`}>{column.render ? column.render(row) : row[column.key]}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={columns.length || 1}><EmptyState title={emptyText} description={emptyDescription} action={emptyAction} /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
