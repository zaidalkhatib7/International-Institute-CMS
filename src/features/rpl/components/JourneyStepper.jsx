import { useEffect, useRef } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

/*
 * THE JOURNEY STEPPER (PLATFORM-JOURNEY-SPEC §4.3), shared by both paths: the
 * professional path passes its seven steps, the academic path its own. It only
 * shows where a case stands; it never acts. Below the small breakpoint it scrolls
 * inside its own card, so the page never scrolls sideways: the card is a named,
 * focusable region (keyboard users scroll it with the arrow keys), and the
 * current step is brought into view when the card opens.
 *
 * states: { [stepKey]: 'done' | 'current' | 'upcoming' | 'closed' | 'skipped' }
 */

const ARIA = { ar: 'مراحل الطلب', en: 'Case stages' }
const STATE_TEXT = {
  ar: { done: 'منجزة', current: 'الحالية', upcoming: 'قادمة', closed: 'أُغلق الطلب هنا', skipped: 'لم تُجرَ' },
  en: { done: 'done', current: 'current', upcoming: 'upcoming', closed: 'the case closed here', skipped: 'not taken' },
}

function Marker({ state, number }) {
  if (state === 'done') return <CheckCircle2 size={22} aria-hidden="true" className="text-[var(--color-success)]" />
  if (state === 'closed') return <XCircle size={22} aria-hidden="true" className="text-red-600" />
  if (state === 'current') return <span aria-hidden="true" className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--color-primary)] text-[11px] font-bold text-white">{number}</span>
  if (state === 'skipped') return <span aria-hidden="true" className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-dashed border-slate-400 text-[11px] text-slate-500">{number}</span>
  return <span aria-hidden="true" className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[var(--color-border-strong,#CBD5E1)] text-[11px] font-semibold text-[var(--color-text-muted)]">{number}</span>
}

export default function JourneyStepper({ steps = [], states = {}, marker = null, language = 'en' }) {
  const lang = language === 'ar' ? 'ar' : 'en'
  const scroller = useRef(null)
  const currentKey = steps.find((step) => states[step.key] === 'current' || states[step.key] === 'closed')?.key
  // On a narrow screen, show the current step without the user having to scroll to it.
  useEffect(() => {
    const box = scroller.current
    if (!box || !currentKey || box.scrollWidth <= box.clientWidth) return
    box.querySelector(`[data-step="${currentKey}"]`)?.scrollIntoView?.({ block: 'nearest', inline: 'center' })
  }, [currentKey])
  return (
    <div ref={scroller} role="region" aria-label={ARIA[lang]} tabIndex={0} className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-white p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <ol className="flex min-w-max items-start sm:min-w-0">
        {steps.map((step, index) => {
          const state = states[step.key] || 'upcoming'
          const last = index === steps.length - 1
          const connectorDashed = state === 'skipped' || states[steps[index + 1]?.key] === 'skipped'
          return (
            <li key={step.key} data-step={step.key} data-state={state} aria-current={state === 'current' ? 'step' : undefined} className="relative flex min-w-[84px] flex-1 flex-col items-center gap-1.5 px-1 text-center">
              {/* The line to the next step, from this marker's edge to the next one's (logical sides, so it follows the direction). */}
              {!last ? <span aria-hidden="true" className={`absolute top-[10px] h-0 border-t-2 start-[calc(50%+16px)] end-[calc(-50%+16px)] ${connectorDashed ? 'border-dashed border-slate-400' : state === 'done' ? 'border-[var(--color-success)]' : 'border-[var(--color-border)]'}`} /> : null}
              <Marker state={state} number={index + 1} />
              <span className={`text-xs leading-4 ${state === 'current' ? 'font-bold text-[var(--color-primary)]' : state === 'skipped' ? 'text-slate-500' : state === 'closed' ? 'font-semibold text-red-700' : 'font-semibold text-[var(--color-text)]'}`}>{step.label}</span>
              <span className="sr-only">{STATE_TEXT[lang][state]}</span>
              {marker?.stepKey === step.key ? <span className="rounded-full bg-[var(--color-secondary)] px-2 py-0.5 text-[10px] font-bold leading-4 text-[var(--color-primary)]">{marker.text}</span> : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
