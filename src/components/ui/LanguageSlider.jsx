import { Globe2 } from 'lucide-react'
import { cn } from '../../utils/cn'

const languageOptions = [
  { code: 'ar', shortLabel: 'AR', label: 'العربية' },
  { code: 'en', shortLabel: 'EN', label: 'English' },
  { code: 'nl', shortLabel: 'NL', label: 'Nederlands' },
]

export default function LanguageSlider({
  value = 'ar',
  onChange,
  compact = false,
  className = '',
  ariaLabel = 'Interface language',
}) {
  const activeIndex = Math.max(
    0,
    languageOptions.findIndex((option) => option.code === value)
  )

  return (
    <div
      dir="ltr"
      className={cn(
        'relative inline-grid grid-cols-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1 shadow-sm',
        compact ? 'h-10 w-[154px]' : 'h-12 w-full max-w-sm',
        className
      )}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      <span
        aria-hidden="true"
        className="absolute bottom-1 left-1 top-1 rounded-full bg-[var(--color-primary)] shadow-[0_8px_18px_rgba(12,61,94,0.18)] transition-transform duration-200 ease-out"
        style={{
          width: 'calc((100% - 0.5rem) / 3)',
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />

      {languageOptions.map((option) => {
        const isActive = option.code === value

        return (
          <button
            key={option.code}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={option.label}
            onClick={() => {
              if (option.code !== value) onChange?.(option.code)
            }}
            className={cn(
              'relative z-10 inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-bold transition-colors',
              isActive ? 'text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
            )}
          >
            {option.code === value ? <Globe2 size={compact ? 13 : 14} aria-hidden="true" /> : null}
            <span>{compact ? option.shortLabel : option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
