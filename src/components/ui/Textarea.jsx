import { forwardRef, useId } from 'react'
import { cn } from '../../utils/cn'
const Textarea = forwardRef(function Textarea({ label, error, hint, className = '', inputClassName = '', rows = 5, id, ...props }, ref) {
  const generatedId = useId()
  const controlId = id || generatedId
  const descriptionId = error || hint ? `${controlId}-description` : undefined

  return (
    <div className={cn('w-full', className)}>
      {label && <label htmlFor={controlId} className="mb-2 block text-sm font-medium text-[var(--color-text)]">{label}</label>}
      <textarea ref={ref} id={controlId} rows={rows} aria-invalid={error ? true : undefined} aria-describedby={props['aria-describedby'] || descriptionId} className={cn('w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-3 text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]', error && 'border-[var(--color-danger)]', inputClassName)} {...props} />
      {error ? <p id={descriptionId} className="mt-2 text-sm text-[var(--color-danger)]">{error}</p> : hint ? <p id={descriptionId} className="mt-2 text-sm text-[var(--color-text-muted)]">{hint}</p> : null}
    </div>
  )
})
export default Textarea
