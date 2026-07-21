import { forwardRef, useId } from 'react'
import { cn } from '../../utils/cn'

const Input = forwardRef(function Input(
  { label, error, hint, leftIcon, rightIcon, className = '', inputClassName = '', id, ...props },
  ref
) {
  const generatedId = useId()
  const controlId = id || generatedId
  const descriptionId = error || hint ? `${controlId}-description` : undefined

  return (
    <div className={cn('w-full', className)}>
      {label && <label htmlFor={controlId} className="mb-2 block text-sm font-medium text-[var(--color-text)]">{label}</label>}
      <div className="relative">
        {leftIcon && <div className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">{leftIcon}</div>}
        <input
          ref={ref}
          id={controlId}
          aria-invalid={error ? true : undefined}
          aria-describedby={props['aria-describedby'] || descriptionId}
          className={cn(
            'w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-3 text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(22,153,214,0.11)]',
            leftIcon && 'ps-11',
            rightIcon && 'pe-11',
            error && 'border-[var(--color-danger)]',
            inputClassName
          )}
          {...props}
        />
        {rightIcon && <div className="absolute end-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">{rightIcon}</div>}
      </div>
      {error ? <p id={descriptionId} className="mt-2 text-sm text-[var(--color-danger)]">{error}</p> : hint ? <p id={descriptionId} className="mt-2 text-sm text-[var(--color-text-muted)]">{hint}</p> : null}
    </div>
  )
})
export default Input
