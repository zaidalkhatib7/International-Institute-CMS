import { Bot, PenLine } from 'lucide-react'
import { getCurrentLanguage } from '../../../utils/localization'
import { provenanceText, readProvenance } from './aiState'

/*
 * WHO MADE THIS AI RESULT (AI-RESILIENCE-SPEC §7.3).
 *
 * Every AI result says which model made it, and a result made by a fallback
 * model says so plainly, with its step in the chain and why the first model was
 * passed over. A fallback answer is a legitimate answer from a recorded model
 * (D22): the note informs, it never blocks. It keeps the amber style so a
 * reviewer sees it.
 *
 * `provenance` is the result's `ai_provenance` (§7.1). Rows made before it pass
 * their older columns as `legacy` ({ model, responding_model, requested_model,
 * ai_model, used_fallback_model }); a result written by hand reads "Written by
 * hand". Nothing is drawn when nothing names a model.
 */
export default function AiProvenanceNote({ provenance = null, legacy = {}, language, compact = false, className = '' }) {
  const lang = (language || getCurrentLanguage()) === 'ar' ? 'ar' : 'en'
  const read = readProvenance(provenance, legacy || {})
  if (!read) return null
  const text = provenanceText(read, lang)
  const Icon = read.manual ? PenLine : Bot
  const tone = read.fallback
    ? 'rounded-xl border border-amber-300 bg-amber-50 text-amber-950'
    : 'text-[var(--color-text-muted)]'
  const padding = read.fallback ? (compact ? 'px-2 py-1' : 'px-3 py-2') : ''

  return (
    <p data-ai-provenance={read.manual ? 'manual' : read.fallback ? 'fallback' : 'primary'} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`flex items-start gap-2 text-xs leading-5 ${tone} ${padding} ${className}`}>
      <Icon size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </p>
  )
}
