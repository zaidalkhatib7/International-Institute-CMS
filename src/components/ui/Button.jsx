import { cn } from '../../utils/cn'

const variants = {
  primary: 'bg-[var(--color-primary)] text-white hover:opacity-95',
  secondary: 'bg-[var(--color-secondary)] text-[var(--color-text)] hover:opacity-95',
  outline:
    'border border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-white/60',
  ghost: 'bg-transparent text-[var(--color-text)] hover:bg-black/5',
  danger: 'bg-[var(--color-danger)] text-white hover:opacity-95',
}

const sizes = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-base',
  lg: 'h-14 px-6 text-base',
  icon: 'h-12 w-12 p-0',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  fullWidth = false,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}