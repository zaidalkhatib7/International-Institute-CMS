import { cn } from '../../utils/cn'

export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-[var(--color-border)]/50', className)}
      {...props}
    />
  )
}
