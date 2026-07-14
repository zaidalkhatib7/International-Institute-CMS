import { Card, CardContent } from './Card'
import Badge from './Badge'
import { createElement, isValidElement } from 'react'
export default function StatCard({ title, value, hint, badge, icon }) {
  const iconNode = isValidElement(icon) ? icon : icon ? createElement(icon, { size: 22 }) : null

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">{iconNode}</div>
          {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
        </div>
        <p className="mt-5 text-sm text-[var(--color-text-muted)]">{title}</p>
        <h3 className="mt-2 text-4xl font-bold text-[var(--color-text)]">{value}</h3>
        {hint && <p className="mt-2 text-sm text-[var(--color-text-muted)]">{hint}</p>}
      </CardContent>
    </Card>
  )
}
