import { CheckCircle2, CircleAlert, CircleCheckBig, Sparkles } from 'lucide-react'
import { formatLocalizedNumber } from '../../../utils/localization'

const copy = {
  ar: {
    title: '\u0627\u0643\u062a\u0645\u0627\u0644 \u0627\u0644\u0645\u0644\u0641', complete: '\u0645\u0643\u062a\u0645\u0644', remaining: '\u0645\u0627 \u064a\u062a\u0628\u0642\u0649 \u0644\u0644\u0627\u0643\u062a\u0645\u0627\u0644', declaration: '\u0627\u0644\u0625\u0642\u0631\u0627\u0631 \u0627\u0644\u0646\u0647\u0627\u0626\u064a', acceptDeclaration: '\u064a\u0644\u0632\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u0625\u0642\u0631\u0627\u0631', addFiles: '\u0623\u0636\u0641 {count} \u0645\u0644\u0641(\u0627\u064b) \u0623\u062e\u0631', completeMessage: '\u0627\u0644\u0645\u0644\u0641 \u0645\u0643\u062a\u0645\u0644 \u0648\u062c\u0627\u0647\u0632 \u0644\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u062a\u0627\u0644\u064a\u0629.',
    next: 'الخطوة التالية الموصى بها', defaultRequirement: 'متطلب دليل', workExperience: 'الخبرة العملية', addExperience: 'أضف خبرة عملية واحدة على الأقل إلى الملف الشخصي', or: ' أو ', addOneOf: 'أضف ملفاً واحداً إلى أيٍّ منهما',
    addToEither: 'أضف {count} ملف(اً) أخر إلى أيٍّ منهما', addToMember: '{label}: أضف {count} ملف(اً) أخر',
  },
  en: { title: 'Portfolio completeness', complete: 'complete', remaining: 'Still required for 100%', declaration: 'Final declaration', acceptDeclaration: 'Accept the declaration', addFiles: 'Add {count} more file(s)', completeMessage: 'The portfolio is complete and ready for the next step.', next: 'Recommended next step', defaultRequirement: 'Evidence requirement', workExperience: 'Work experience', addExperience: 'Add at least one work experience to the profile', or: ' or ', addOneOf: 'Add one file to either', addToEither: 'Add {count} more file(s) to either', addToMember: '{label}: add {count} more file(s)' },
}

function localize(value, language) {
  if (!value || typeof value !== 'object') return value
  return value[language] || value.en || value.ar || ''
}

function readableCode(code, fallback) {
  return String(code || fallback).replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

/*
 * `categories` are the case's live standard categories; `referenceCategories` the
 * full reference list (inactive ones too), which names a category the standard no
 * longer lists but the case still counts (a frozen requirement, a frozen group
 * member), so an Arabic screen never falls back to an English code (review round
 * 2, 17 Oct 2026).
 */
export default function CompletenessMeter({ value = 0, categories = [], referenceCategories = [], language = 'en', compact = false }) {
  const text = copy[language] || copy.en
  const details = value && typeof value === 'object' ? value : {}
  const percentage = Math.max(0, Math.min(100, Math.round(Number(details.percentage ?? value) || 0)))
  const categoryById = new Map(categories.map((category) => [String(category.id), category]))
  const categoryByCode = new Map(categories.map((category) => [category.code, category]))
  const referenceById = new Map((Array.isArray(referenceCategories) ? referenceCategories : []).map((category) => [String(category.id), category]))
  const referenceByCode = new Map((Array.isArray(referenceCategories) ? referenceCategories : []).map((category) => [category.code, category]))
  const labelOf = (categoryId, code) => {
    const definition = categoryById.get(String(categoryId)) || categoryByCode.get(code) || referenceById.get(String(categoryId)) || referenceByCode.get(code)
    return localize(definition?.labels || definition?.name, language) || readableCode(code, text.defaultRequirement)
  }
  const count = (value) => formatLocalizedNumber(value, language)
  const missing = (details.categories || []).filter((category) => !category.complete).map((category) => (
    { ...category, label: labelOf(category.category_id, category.code), remaining: Math.max(0, Number(category.required || 0) - Number(category.provided || 0)) }
  ))
  // Alternatives the API counts as ONE item, met by any one of them (owner, 17 Oct 2026:
  // an identity document and either a CV or an experience letter), named together.
  // A member is met at its OWN minimum (any_of[].required, which staff may raise), so
  // the action says how many files each still needs: one to either, N to either, or
  // each member's own count when they differ (review round 2, 17 Oct 2026).
  const missingGroups = (details.evidence_groups || []).filter((group) => !group.complete).map((group) => {
    const members = (group.any_of || []).map((member) => ({
      label: labelOf(member.category_id, member.code),
      remaining: Math.max(1, Number(member.required || 0) - Number(member.provided || 0)),
    }))
    const counts = new Set(members.map((member) => member.remaining))
    const action = counts.size > 1
      ? members.map((member) => text.addToMember.replace('{label}', member.label).replace('{count}', count(member.remaining))).join(text.or)
      : (members[0]?.remaining ?? 1) > 1 ? text.addToEither.replace('{count}', count(members[0].remaining)) : text.addOneOf
    return { code: group.code, label: members.map((member) => member.label).join(text.or), group: true, action }
  })
  // At least one work experience is its own completeness item (owner flow of 12 Oct 2026),
  // counted in the percentage beside the categories, so it is named here too.
  const experienceMissing = details.work_experience?.complete === false
  const declarationMissing = details.declaration && !details.declaration.accepted

  const nextItem = missing[0] || missingGroups[0] || (experienceMissing ? { label: text.workExperience, remaining: null, experience: true } : null) || (declarationMissing ? { label: text.declaration, remaining: null, declaration: true } : null)
  const percentageLabel = formatLocalizedNumber(percentage, language)

  return (
    <div className={compact ? 'min-w-40 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5' : 'rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]'}>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold">
        <span className="flex items-center gap-2 text-[var(--color-text)]"><CircleCheckBig size={17} className="text-[var(--color-accent)]" />{compact ? `${percentageLabel}%` : text.title}</span>
        {!compact ? <span className="text-[var(--color-primary)]">{percentageLabel}% {text.complete}</span> : null}
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentage} aria-label={`${text.title}: ${percentageLabel}%`}><div className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[#39B8E9] transition-[width] duration-500" style={{ width: `${percentage}%` }} /></div>
      {!compact && nextItem ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-800"><Sparkles size={14} />{text.next || text.remaining}</p><p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{nextItem.label}</p><p className="mt-1 text-xs text-amber-800">{nextItem.declaration ? text.acceptDeclaration : nextItem.experience ? text.addExperience : nextItem.group ? nextItem.action : text.addFiles.replace('{count}', formatLocalizedNumber(nextItem.remaining, language))}</p></div> : null}
      {!compact && (missing.length || missingGroups.length || experienceMissing || declarationMissing) ? <div className="mt-4 border-t border-[var(--color-border)] pt-4"><p className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]"><CircleAlert size={16} className="text-amber-500" />{text.remaining}</p><ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">{missing.map((item) => <li key={item.category_id || item.code} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2"><span className="font-medium text-[var(--color-text)]">{item.label}</span><span>{text.addFiles.replace('{count}', formatLocalizedNumber(item.remaining, language))}</span></li>)}{missingGroups.map((item) => <li key={`group-${item.code}`} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2"><span className="font-medium text-[var(--color-text)]">{item.label}</span><span>{item.action}</span></li>)}{experienceMissing ? <li className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2"><span className="font-medium text-[var(--color-text)]">{text.workExperience}</span><span>{text.addExperience}</span></li> : null}{declarationMissing ? <li className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2"><span className="font-medium text-[var(--color-text)]">{text.declaration}</span><span>{text.acceptDeclaration}</span></li> : null}</ul></div> : null}
      {!compact && percentage === 100 ? <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 size={17} />{text.completeMessage}</p> : null}
    </div>
  )
}
