import { forwardRef, useId } from 'react'
import { cn } from '../../utils/cn'
import { normalizeDigits, parseMoneyInput } from '../../utils/money'

/*
 * A money field (owner decisions of 17 Oct 2026). Text, never type="number":
 * a number field accepts 1e5, changes on a scroll, and with step="1" refuses
 * cents. The field and its adornment always read left to right, so the "$"
 * stays before the amount and "SYP" / "ل.س" after it on an Arabic page too; the
 * label and the hint keep the page's direction. On blur the text is normalised:
 * Arabic-Indic digits become Latin (an Arabic keyboard's ٤٩٫٩٩ becomes 49.99)
 * and a valid amount takes its fixed scale ("49.9" becomes "49.90"). The value
 * stays text; the caller turns it into minor units with toMinor.
 */
const MoneyInput = forwardRef(function MoneyInput(
  { label, error, hint, currency, language, value, onChange, className = '', inputClassName = '', id, onBlur, ...props },
  ref
) {
  const generatedId = useId()
  const controlId = id || generatedId
  const descriptionId = error || hint ? `${controlId}-description` : undefined
  const code = String(currency ?? '').toUpperCase()
  const prefix = code === 'USD' ? '$' : null
  const suffix = code === 'SYP' ? (language === 'ar' ? 'ل.س' : 'SYP') : null

  function handleBlur(event) {
    const text = String(value ?? '')
    if (text !== '') {
      const normalized = parseMoneyInput(text, code) ?? normalizeDigits(text)
      if (normalized !== text) onChange?.(normalized)
    }
    onBlur?.(event)
  }

  return (
    <div className={cn('w-full', className)}>
      {label && <label htmlFor={controlId} className="mb-2 block text-sm font-medium text-[var(--color-text)]">{label}</label>}
      <div dir="ltr" className="relative">
        {prefix ? <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-[var(--color-text-muted)]">{prefix}</span> : null}
        <input
          ref={ref}
          id={controlId}
          type="text"
          dir="ltr"
          inputMode={code === 'SYP' ? 'numeric' : 'decimal'}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={props['aria-describedby'] || descriptionId}
          value={value ?? ''}
          onChange={(event) => onChange?.(event.target.value)}
          onBlur={handleBlur}
          className={cn(
            'w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-3 text-left text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(22,153,214,0.11)] disabled:cursor-not-allowed disabled:opacity-60',
            prefix && 'pl-9',
            suffix && 'pr-16',
            error && 'border-[var(--color-danger)]',
            inputClassName
          )}
          {...props}
        />
        {suffix ? <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-[var(--color-text-muted)]">{suffix}</span> : null}
      </div>
      {error ? <p id={descriptionId} className="mt-2 text-sm text-[var(--color-danger)]">{error}</p> : hint ? <p id={descriptionId} className="mt-2 text-sm text-[var(--color-text-muted)]">{hint}</p> : null}
    </div>
  )
})

export default MoneyInput
