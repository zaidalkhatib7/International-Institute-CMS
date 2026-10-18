import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, LoaderCircle, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button } from '../../../components/ui'
import { cn } from '../../../utils/cn'
import { NEXT_STEP_COPY } from '../domain/journey'

/*
 * THE NEXT STEP (PLATFORM-JOURNEY-SPEC §4.3): one sentence saying what moves the
 * case on and who acts, with the button that opens where it is done. The card
 * never acts by itself; the one exception is submitting an office draft, which
 * asks first and uses the same move the status form would.
 *
 * step: the result of caseNextStep(). onOpenTab(tab, anchor) opens a tab of the
 * case; onSubmitRequest(transition) makes the one move the card offers (submit an
 * office draft, or move a case whose client replied back to review).
 */

/*
 * The actor chip, in darker tones than the shared badge so its small text keeps
 * at least 4.5:1 on its tint (WCAG AA): warning #8A4F06, info #0B6A99, success
 * #157A45, neutral the body text.
 */
const ACTOR_CLASS = {
  you: 'bg-[#FFF4DF] text-[#8A4F06]',
  other: 'bg-[var(--color-surface-muted)] text-[var(--color-text-body)]',
  client: 'bg-[#E7F5FB] text-[#0B6A99]',
  automatic: 'bg-[#EDF9F1] text-[#157A45]',
  scheduled: 'bg-[#E7F5FB] text-[#0B6A99]',
}
const CONFIRM_COPY = {
  ar: { confirm: 'تأكيد الإرسال', cancel: 'رجوع' },
  en: { confirm: 'Confirm and submit', cancel: 'Back' },
}

export default function NextStepCard({ step, language = 'en', onOpenTab, onSubmitRequest, busy = false, visibleTabs = null }) {
  const lang = language === 'ar' ? 'ar' : 'en'
  const [confirming, setConfirming] = useState(false)
  const confirmRef = useRef(null)
  const submitRef = useRef(null)
  const reopenFocus = useRef(false)
  const confirmTextId = useId()
  // Opening the confirmation moves focus to its confirm button; closing it returns focus to Submit.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
    else if (reopenFocus.current) {
      reopenFocus.current = false
      submitRef.current?.focus()
    }
  }, [confirming])
  if (!step?.sentence) return null
  const Arrow = lang === 'ar' ? ArrowLeft : ArrowRight
  const text = (value) => value?.[lang] || ''
  // A button only for a tab this viewer has: a tab the role cannot open is never offered.
  const canOpen = (tab) => !visibleTabs || visibleTabs.includes(tab)
  const action = step.action?.tab && !canOpen(step.action.tab) ? null : step.action
  const also = (step.also || []).filter((line) => canOpen(line.tab))

  function openAction(action) {
    if (action?.tab) onOpenTab?.(action.tab, action.anchor)
  }

  function closeConfirm() {
    reopenFocus.current = true
    setConfirming(false)
  }

  return (
    <section aria-label={text(NEXT_STEP_COPY.title)} className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[var(--color-text-muted)]">{text(NEXT_STEP_COPY.title)}</h2>
        {step.actor ? <span data-actor={step.actor} className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', ACTOR_CLASS[step.actor] || ACTOR_CLASS.other)}>{text(NEXT_STEP_COPY.actors[step.actor])}</span> : null}
      </div>
      <p className="mt-3 text-base font-semibold leading-7 text-[var(--color-text)]">
        {text(step.sentence)}
        {step.overdue ? <Badge variant="danger" className="ms-2 align-middle">{text(NEXT_STEP_COPY.overdue)}</Badge> : null}
      </p>
      {action || step.secondary || step.links?.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {action?.tab ? <Button size="sm" onClick={() => openAction(action)}>{text(action.label)}<Arrow size={15} aria-hidden="true" /></Button> : null}
          {action?.href ? <Link to={action.href} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-white">{text(action.label)}<Arrow size={15} aria-hidden="true" /></Link> : null}
          {step.links?.map((link) => <Link key={link.href} to={link.href} className="text-sm font-semibold text-[var(--color-primary)] underline underline-offset-2">{text(link.label)}</Link>)}
          {/* Kept mounted (hidden) while confirming, so focus can return to it. */}
          {step.secondary ? <Button ref={submitRef} size="sm" variant="outline" onClick={() => setConfirming(true)} disabled={busy} hidden={confirming} aria-expanded={confirming}><Send size={15} aria-hidden="true" />{text(step.secondary.label)}</Button> : null}
        </div>
      ) : null}
      {step.secondary && confirming ? (
        <div role="alertdialog" aria-label={text(step.secondary.label)} aria-describedby={confirmTextId} className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" onKeyDown={(event) => { if (event.key === 'Escape' && !busy) closeConfirm() }}>
          <p id={confirmTextId}>{text(step.secondary.confirm)}</p>
          <div className="flex flex-wrap gap-2">
            <Button ref={confirmRef} size="sm" onClick={async () => { await onSubmitRequest?.(step.secondary.transition); closeConfirm() }} disabled={busy}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} aria-hidden="true" />}{step.secondary.confirmLabel ? text(step.secondary.confirmLabel) : CONFIRM_COPY[lang].confirm}</Button>
            <Button size="sm" variant="outline" onClick={closeConfirm} disabled={busy}>{CONFIRM_COPY[lang].cancel}</Button>
          </div>
        </div>
      ) : null}
      {also.length ? (
        <div className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-3">
          {also.map((line, index) => (
            <div key={index} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p><span className="font-semibold text-[var(--color-text-muted)]">{text(NEXT_STEP_COPY.also)}: </span>{text(line.text)}</p>
              <Button size="sm" variant="outline" onClick={() => onOpenTab?.(line.tab)}>{text(line.label)}</Button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
