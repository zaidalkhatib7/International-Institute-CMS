import { CircleCheckBig } from 'lucide-react'

const copy = {
  ar: { title: 'اكتمال الملف', complete: 'مكتمل' },
  en: { title: 'Portfolio completeness', complete: 'complete' },
  nl: { title: 'Dossiercompleetheid', complete: 'voltooid' },
}

export default function CompletenessMeter({ value = 0, language = 'en', compact = false }) {
  const text = copy[language] || copy.en
  const percentage = Math.max(0, Math.min(100, Math.round(Number(value) || 0)))

  return (
    <div className={compact ? 'min-w-40' : 'rounded-2xl border border-[var(--color-border)] bg-white p-5'}>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold">
        <span className="flex items-center gap-2 text-[var(--color-text)]">
          <CircleCheckBig size={17} className="text-[var(--color-accent)]" />
          {text.title}
        </span>
        <span className="text-[var(--color-primary)]">{percentage}% {text.complete}</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={percentage}
        aria-label={`${text.title}: ${percentage}%`}
      >
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
