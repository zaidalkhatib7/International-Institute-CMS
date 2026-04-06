import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './Card'
export default function DataTableShell({ title, description, actions, columns = [], rows = [], emptyText = 'No data available.' }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b border-[var(--color-border)] md:flex-row md:items-center md:justify-between">
        <div><CardTitle>{title}</CardTitle>{description ? <CardDescription>{description}</CardDescription> : null}</div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                {columns.map((column) => (
                  <th key={column.key} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, rowIndex) => (
                  <tr key={row.id ?? rowIndex} className="border-b border-[var(--color-border)] last:border-b-0">
                    {columns.map((column) => (
                      <td key={column.key} className="px-6 py-5 text-[var(--color-text)]">{column.render ? column.render(row) : row[column.key]}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={columns.length || 1} className="px-6 py-10 text-center text-[var(--color-text-muted)]">{emptyText}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}