import { cn } from '../../utils/cn'

export function Card({ children, className = '' }) {
  return (
    <div className={cn('overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return <div className={cn('px-8 py-6', className)}>{children}</div>
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={cn('text-2xl font-bold text-[var(--color-text)]', className)}>{children}</h3>
}

export function CardDescription({ children, className = '' }) {
  return <p className={cn('mt-1 text-[var(--color-text-muted)]', className)}>{children}</p>
}

export function CardContent({ children, className = '' }) {
  return <div className={cn('px-8 pb-8', className)}>{children}</div>
}