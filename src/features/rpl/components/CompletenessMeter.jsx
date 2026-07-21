import { CheckCircle2, CircleAlert, CircleCheckBig, Sparkles } from 'lucide-react'
import { formatLocalizedNumber } from '../../../utils/localization'

const copy = {
  ar: {
    title: '\u0627\u0643\u062a\u0645\u0627\u0644 \u0627\u0644\u0645\u0644\u0641', complete: '\u0645\u0643\u062a\u0645\u0644', remaining: '\u0645\u0627 \u064a\u062a\u0628\u0642\u0649 \u0644\u0644\u0627\u0643\u062a\u0645\u0627\u0644', declaration: '\u0627\u0644\u0625\u0642\u0631\u0627\u0631 \u0627\u0644\u0646\u0647\u0627\u0626\u064a', acceptDeclaration: '\u064a\u0644\u0632\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u0625\u0642\u0631\u0627\u0631', addFiles: '\u0623\u0636\u0641 {count} \u0645\u0644\u0641(\u0627\u064b) \u0623\u062e\u0631', completeMessage: '\u0627\u0644\u0645\u0644\u0641 \u0645\u0643\u062a\u0645 \u0648\u062c\u0627\u0647\u0632 \u0644\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u062a\u0627\u0644\u064a\u0629.',
    next: 'الخطوة التالية الموصى بها', defaultRequirement: 'متطلب دليل',
  },
  en: { title: 'Portfolio completeness', complete: 'complete', remaining: 'Still required for 100%', declaration: 'Final declaration', acceptDeclaration: 'Accept the declaration', addFiles: 'Add {count} more file(s)', completeMessage: 'The portfolio is complete and ready for the next step.', next: 'Recommended next step', defaultRequirement: 'Evidence requirement' },
  nl: { title: 'Dossiercompleetheid', complete: 'voltooid', remaining: 'Nog nodig voor 100%', declaration: 'Definitieve verklaring', acceptDeclaration: 'Accepteer de verklaring', addFiles: 'Voeg nog {count} bestand(en) toe', completeMessage: 'Het dossier is volledig en klaar voor de volgende stap.', next: 'Aanbevolen volgende stap', defaultRequirement: 'Bewijsvereiste' },
}

function localize(value, language) {
  if (!value || typeof value !== 'object') return value
  return value[language] || value.en || value.ar || value.nl || ''
}

function readableCode(code, fallback) {
  return String(code || fallback).replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function CompletenessMeter({ value = 0, categories = [], language = 'en', compact = false }) {
  const text = copy[language] || copy.en
  const details = value && typeof value === 'object' ? value : {}
  const percentage = Math.max(0, Math.min(100, Math.round(Number(details.percentage ?? value) || 0)))
  const categoryById = new Map(categories.map((category) => [String(category.id), category]))
  const categoryByCode = new Map(categories.map((category) => [category.code, category]))
  const missing = (details.categories || []).filter((category) => !category.complete).map((category) => {
    const definition = categoryById.get(String(category.category_id)) || categoryByCode.get(category.code)
    const label = localize(definition?.labels || definition?.name, language) || readableCode(category.code, text.defaultRequirement)
    return { ...category, label, remaining: Math.max(0, Number(category.required || 0) - Number(category.provided || 0)) }
  })
  const declarationMissing = details.declaration && !details.declaration.accepted

  const nextItem = missing[0] || (declarationMissing ? { label: text.declaration, remaining: null, declaration: true } : null)
  const percentageLabel = formatLocalizedNumber(percentage, language)

  return (
    <div className={compact ? 'min-w-40 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5' : 'rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]'}>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold">
        <span className="flex items-center gap-2 text-[var(--color-text)]"><CircleCheckBig size={17} className="text-[var(--color-accent)]" />{compact ? `${percentageLabel}%` : text.title}</span>
        {!compact ? <span className="text-[var(--color-primary)]">{percentageLabel}% {text.complete}</span> : null}
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentage} aria-label={`${text.title}: ${percentageLabel}%`}><div className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[#39B8E9] transition-[width] duration-500" style={{ width: `${percentage}%` }} /></div>
      {!compact && nextItem ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-800"><Sparkles size={14} />{text.next || text.remaining}</p><p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{nextItem.label}</p><p className="mt-1 text-xs text-amber-800">{nextItem.declaration ? text.acceptDeclaration : text.addFiles.replace('{count}', formatLocalizedNumber(nextItem.remaining, language))}</p></div> : null}
      {!compact && (missing.length || declarationMissing) ? <div className="mt-4 border-t border-[var(--color-border)] pt-4"><p className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]"><CircleAlert size={16} className="text-amber-500" />{text.remaining}</p><ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">{missing.map((item) => <li key={item.category_id || item.code} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2"><span className="font-medium text-[var(--color-text)]">{item.label}</span><span>{text.addFiles.replace('{count}', formatLocalizedNumber(item.remaining, language))}</span></li>)}{declarationMissing ? <li className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2"><span className="font-medium text-[var(--color-text)]">{text.declaration}</span><span>{text.acceptDeclaration}</span></li> : null}</ul></div> : null}
      {!compact && percentage === 100 ? <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 size={17} />{text.completeMessage}</p> : null}
    </div>
  )
}
