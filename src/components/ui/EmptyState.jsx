import { Inbox } from 'lucide-react'
import { createElement } from 'react'
import { cn } from '../../utils/cn'

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing to show yet',
  description,
  action,
  className = '',
}) {
  return (
    <div className={cn('flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center', className)}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        {createElement(Icon, { size: 25, strokeWidth: 1.8, 'aria-hidden': true })}
      </span>
      <h3 className="mt-4 text-base font-bold text-[var(--color-text)]">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
