import { cn } from '../../utils/cn'

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={cn('overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return <div className={cn('px-6 py-5 md:px-7 md:py-6', className)}>{children}</div>
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={cn('text-xl font-bold text-[var(--color-text)]', className)}>{children}</h3>
}

export function CardDescription({ children, className = '' }) {
  return <p className={cn('mt-1 text-[var(--color-text-muted)]', className)}>{children}</p>
}

export function CardContent({ children, className = '' }) {
  return <div className={cn('px-6 pb-6 md:px-7 md:pb-7', className)}>{children}</div>
}
