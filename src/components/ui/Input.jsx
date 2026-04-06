import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

const Input = forwardRef(function Input(
  { label, error, hint, leftIcon, rightIcon, className = '', inputClassName = '', ...props },
  ref
) {
  return (
    <div className={cn('w-full', className)}>
      {label && <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{label}</label>}
      <div className="relative">
        {leftIcon && <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">{leftIcon}</div>}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-3 text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]',
            leftIcon && 'pl-11',
            rightIcon && 'pr-11',
            error && 'border-[var(--color-danger)]',
            inputClassName
          )}
          {...props}
        />
        {rightIcon && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">{rightIcon}</div>}
      </div>
      {error ? <p className="mt-2 text-sm text-[var(--color-danger)]">{error}</p> : hint ? <p className="mt-2 text-sm text-[var(--color-text-muted)]">{hint}</p> : null}
    </div>
  )
})
export default Input