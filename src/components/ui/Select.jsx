import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'
const Select = forwardRef(function Select({ label, error, hint, className = '', inputClassName = '', children, ...props }, ref) {
  return (
    <div className={cn('w-full', className)}>
      {label && <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{label}</label>}
      <div className="relative">
        <select ref={ref} className={cn('w-full appearance-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-3 text-[var(--color-text)] outline-none transition-all focus:border-[var(--color-primary)]', error && 'border-[var(--color-danger)]', inputClassName)} {...props}>{children}</select>
        <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
      </div>
      {error ? <p className="mt-2 text-sm text-[var(--color-danger)]">{error}</p> : hint ? <p className="mt-2 text-sm text-[var(--color-text-muted)]">{hint}</p> : null}
    </div>
  )
})
export default Select