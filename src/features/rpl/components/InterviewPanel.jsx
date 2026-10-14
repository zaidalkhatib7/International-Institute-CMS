import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, CalendarPlus, CheckCircle2, ExternalLink, Gavel, LoaderCircle, UserX, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea } from '../../../components/ui'
import { readApiError, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { formatLocalizedDateTime } from '../../../utils/localization'
import { DECLINE_CATEGORIES, localize } from '../domain/rpl'
import { labelFor, safeExternalUrl } from '../domain/documentScreening'
import {
  CASE_DECISION_LIMITS,
  DECISION_VARIANT,
  INTERVIEW_DECISIONS,
  INTERVIEW_MODES,
  INTERVIEW_STATUS_VARIANT,
  LEGACY_INTERVIEW_RESULTS,
  applicantLanguage,
  canRecordLegacyOutcome,
  caseDecisionCopy,
  currentInterview,
  fromDateTimeLocalValue,
  interviewCopy,
  interviewStatus,
  isActiveInterview,
  isCancelReasonValid,
  isFutureDateTimeLocal,
  isHttpsUrl,
  isLegacyInterview,
  isRationaleValid,
  officeAddressIn,
  toDateTimeLocalValue,
} from '../domain/caseDecision'
import {
  cancelRplInterview,
  completeRplInterview,
  decideRplInterview,
  fetchRplInterviews,
  fetchRplSettings,
  markRplInterviewNoShow,
  offerRplInterview,
  scheduleRplCaseInterview,
  updateRplInterview,
} from '../services/rplService'
import { ApplicantCategoryPreview } from './ScreeningDecisionCard'

/*
 * THE INTERVIEW, AT CASE LEVEL (owner flow of 12 Oct 2026, steps 4.4-4.8, P3).
 *
 * Staff offer online, at the office, or both; the applicant chooses on the
 * website, or tells staff, who record the choice for them (marked as such).
 * Staff then set the time and the meeting link, or the office address, which
 * is prefilled from the office address setting in the applicant's language.
 * After the interview staff record it as held or as a no-show, and decide: pass
 * to quiz or decline. A no-show can only be declined. There are no time slots
 * and the interview never replaces verified documents (D9(a)).
 *
 * An offer past its answer date shows as expired and offers nothing: the server
 * would refuse to schedule it. Rows from the assessment-scoped route predate
 * this panel; they are listed as history, and the outcome of one still open is
 * recorded through the route that created it, offered only where that route
 * would take it from this viewer (canRecordLegacyOutcome).
 */

function personName(person, copy) {
  return person?.name || copy.someone
}

function Detail({ label, children }) {
  if (children == null || children === '' || children === false) return null
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[var(--color-text)]">{children}</dd></div>
}

function LocationValue({ value }) {
  const href = safeExternalUrl(value)
  if (!href) return <span dir="auto" className="whitespace-pre-wrap">{value}</span>
  return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-[var(--color-primary)] underline underline-offset-2"><bdi>{value}</bdi><ExternalLink size={13} aria-hidden="true" /></a>
}

export function InterviewStatusBadge({ interview, language = 'en' }) {
  const copy = interviewCopy(language === 'ar' ? 'ar' : 'en')
  const status = interviewStatus(interview)
  return <Badge variant={INTERVIEW_STATUS_VARIANT[status] || 'neutral'}>{labelFor(copy.status, status)}</Badge>
}

function modeText(interview, copy) {
  const mode = interview?.chosen_mode || (isLegacyInterview(interview) ? interview?.mode : null)
  if (!mode) return null
  const label = labelFor(copy.modeLabels, mode)
  if (interview.chosen_by_applicant === true) return `${label} · ${copy.chosenByApplicant}`
  if (interview.chosen_by_applicant === false) return `${label} · ${copy.chosenByStaff}`
  return label
}

/** Everything recorded on one interview row, staff-only fields included: this panel is for staff. */
function InterviewDetails({ interview, copy, language }) {
  const offeredModes = (Array.isArray(interview.offered_modes) ? interview.offered_modes : []).map((mode) => labelFor(copy.modeLabels, mode)).join(' · ')
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Detail label={copy.offeredModes}>{offeredModes}</Detail>
      <Detail label={copy.offeredBy}>{interview.offered_by ? personName(interview.offered_by, copy) : null}</Detail>
      <Detail label={copy.offeredAt}>{interview.offered_at ? formatLocalizedDateTime(interview.offered_at, language) : null}</Detail>
      <Detail label={copy.responseDue}>{interview.response_due_at ? formatLocalizedDateTime(interview.response_due_at, language) : null}</Detail>
      <Detail label={copy.chosenMode}>{modeText(interview, copy)}</Detail>
      <Detail label={copy.chosenAt}>{interview.chosen_at ? formatLocalizedDateTime(interview.chosen_at, language) : null}</Detail>
      <Detail label={copy.scheduledAt}>{interview.scheduled_at ? formatLocalizedDateTime(interview.scheduled_at, language) : null}</Detail>
      <Detail label={copy.location}>{interview.location_or_url ? <LocationValue value={interview.location_or_url} /> : null}</Detail>
      <Detail label={copy.officeAddressSnapshot}>{interview.office_address_snapshot ? <span dir="auto" className="whitespace-pre-wrap">{interview.office_address_snapshot}</span> : null}</Detail>
      <Detail label={copy.minutes}>{interview.minutes_media_id != null ? <bdi>#{interview.minutes_media_id}</bdi> : null}</Detail>
      <Detail label={copy.decision}>{interview.decision ? <Badge variant={DECISION_VARIANT[interview.decision] || 'neutral'}>{labelFor(copy.decisions, interview.decision)}</Badge> : null}</Detail>
      <Detail label={copy.decidedBy}>{interview.decided_by ? `${personName(interview.decided_by, copy)}${interview.decided_at ? ` · ${formatLocalizedDateTime(interview.decided_at, language)}` : ''}` : null}</Detail>
      {interview.offer_message ? <div className="sm:col-span-2 lg:col-span-3"><Detail label={copy.offerMessage}><span dir="auto" className="whitespace-pre-wrap font-normal">{interview.offer_message}</span></Detail></div> : null}
      {interview.notes ? <div className="sm:col-span-2 lg:col-span-3"><Detail label={copy.notes}><span dir="auto" className="whitespace-pre-wrap font-normal">{interview.notes}</span></Detail></div> : null}
      {interview.decision_rationale ? <div className="sm:col-span-2 lg:col-span-3"><Detail label={copy.decisionRationale}><span dir="auto" className="whitespace-pre-wrap font-normal">{interview.decision_rationale}</span></Detail></div> : null}
      {interview.cancelled_reason ? <div className="sm:col-span-2 lg:col-span-3"><Detail label={copy.cancelledReason}><span dir="auto" className="whitespace-pre-wrap font-normal">{interview.cancelled_reason}</span></Detail></div> : null}
      {interview.outcome ? <div className="sm:col-span-2 lg:col-span-3"><Detail label={copy.legacyOutcome}><span dir="auto" className="whitespace-pre-wrap font-normal">{interview.outcome}</span></Detail></div> : null}
    </dl>
  )
}

/** The one-line state of an interview, for the case overview. */
export function InterviewSummary({ interview, language = 'en' }) {
  const lang = language === 'ar' ? 'ar' : 'en'
  const copy = interviewCopy(lang)
  if (!interview) return null
  const mode = modeText(interview, copy)
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <InterviewStatusBadge interview={interview} language={lang} />
      {mode ? <span className="text-[var(--color-text-muted)]">{mode}</span> : null}
      {interview.scheduled_at ? <span className="font-semibold">{formatLocalizedDateTime(interview.scheduled_at, lang)}</span> : null}
    </div>
  )
}

function ModeChoices({ copy, selected, onToggle, legend }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-3">
        {INTERVIEW_MODES.map((mode) => <label key={mode} className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"><input type="checkbox" checked={selected.includes(mode)} onChange={() => onToggle(mode)} />{copy.modeLabels[mode]}</label>)}
      </div>
    </fieldset>
  )
}

function OfferForm({ copy, busy, onSubmit }) {
  const [modes, setModes] = useState([])
  const [message, setMessage] = useState('')
  const tooLong = message.trim().length > CASE_DECISION_LIMITS.offerMessageMax
  const ready = modes.length > 0 && !tooLong

  async function submit() {
    const trimmed = message.trim()
    const done = await onSubmit({ offered_modes: INTERVIEW_MODES.filter((mode) => modes.includes(mode)), ...(trimmed ? { offer_message: trimmed } : {}) })
    if (done) { setModes([]); setMessage('') }
  }

  return (
    <section aria-label={copy.offerTitle} className="space-y-4 rounded-2xl border border-[var(--color-border)] p-5">
      <div><h4 className="font-bold">{copy.offerTitle}</h4><p className="mt-1 text-sm text-[var(--color-text-muted)]">{copy.offerHint}</p></div>
      <ModeChoices copy={copy} legend={copy.modes} selected={modes} onToggle={(mode) => setModes((current) => (current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode]))} />
      {!modes.length ? <p className="text-sm text-[var(--color-text-muted)]">{copy.modesRequired}</p> : null}
      <Textarea rows={3} label={copy.offerMessageLabel} hint={copy.offerMessageHint} error={tooLong ? copy.offerMessageTooLong : undefined} value={message} onChange={(event) => setMessage(event.target.value)} />
      <div className="flex justify-end"><Button onClick={submit} disabled={busy || !ready}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : <CalendarPlus size={17} />}{copy.offerSubmit}</Button></div>
    </section>
  )
}

function ScheduleForm({ interview, copy, officeAddress, addressLanguage, busy, onSubmit, onBack }) {
  const status = interviewStatus(interview)
  // Still offered: the applicant has not chosen, so staff record the mode they asked for.
  const recordsMode = status === 'offered'
  const offered = (Array.isArray(interview.offered_modes) ? interview.offered_modes : []).filter((mode) => INTERVIEW_MODES.includes(mode))
  const [mode, setMode] = useState(recordsMode ? (offered.length === 1 ? offered[0] : '') : interview.chosen_mode || '')
  const [when, setWhen] = useState(toDateTimeLocalValue(interview.scheduled_at))
  // null until staff type: the office address setting then stands in for an interview at the office.
  const [location, setLocation] = useState(interview.location_or_url || null)
  const shownLocation = location ?? (mode === 'in_person' ? officeAddressIn(officeAddress, addressLanguage) : '')
  const whenProblem = when !== '' && !isFutureDateTimeLocal(when)
  const linkProblem = mode === 'online' && shownLocation.trim() !== '' && !isHttpsUrl(shownLocation)
  const ready = INTERVIEW_MODES.includes(mode) && isFutureDateTimeLocal(when) && (mode !== 'online' || isHttpsUrl(shownLocation)) && shownLocation.trim().length <= 2048

  function submit() {
    const where = shownLocation.trim()
    onSubmit({ scheduled_at: fromDateTimeLocalValue(when), ...(where ? { location_or_url: where } : {}), ...(recordsMode ? { mode } : {}) })
  }

  return (
    <section aria-label={status === 'scheduled' ? copy.rescheduleTitle : copy.scheduleTitle} className="space-y-4 rounded-2xl border border-[var(--color-border)] p-5">
      <h4 className="font-bold">{status === 'scheduled' ? copy.rescheduleTitle : copy.scheduleTitle}</h4>
      {recordsMode ? (
        <Select label={copy.recordMode} hint={copy.recordModeHint} value={mode} onChange={(event) => { setMode(event.target.value); setLocation(null) }}>
          <option value="">—</option>
          {offered.map((value) => <option key={value} value={value}>{copy.modeLabels[value]}</option>)}
        </Select>
      ) : <p className="text-sm"><span className="font-semibold text-[var(--color-text-muted)]">{copy.chosenMode}: </span>{modeText(interview, copy)}</p>}
      <Input type="datetime-local" label={copy.scheduledAtLabel} value={when} error={whenProblem ? copy.scheduledAtFuture : undefined} onChange={(event) => setWhen(event.target.value)} />
      {mode === 'online' ? <Input type="url" dir="ltr" label={copy.link} hint={copy.linkHint} error={linkProblem ? copy.linkInvalid : undefined} value={shownLocation} placeholder="https://" onChange={(event) => setLocation(event.target.value)} /> : null}
      {mode === 'in_person' ? <Textarea rows={3} dir="auto" label={copy.address} hint={copy.addressHint} value={shownLocation} onChange={(event) => setLocation(event.target.value)} /> : null}
      <div className="flex flex-wrap justify-end gap-2">
        {onBack ? <Button variant="outline" onClick={onBack} disabled={busy}>{copy.back}</Button> : null}
        <Button onClick={submit} disabled={busy || !ready}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : <CalendarClock size={17} />}{copy.scheduleSubmit}</Button>
      </div>
    </section>
  )
}

function CompleteForm({ copy, busy, onSubmit, onBack }) {
  const [notes, setNotes] = useState('')
  const [minutes, setMinutes] = useState('')
  const notesTooLong = notes.trim().length > CASE_DECISION_LIMITS.notesMax
  const minutesInvalid = minutes.trim() !== '' && !/^[1-9]\d*$/.test(minutes.trim())

  function submit() {
    const text = notes.trim()
    onSubmit({ ...(text ? { notes: text } : {}), ...(minutes.trim() ? { minutes_media_id: Number(minutes.trim()) } : {}) })
  }

  return (
    <section aria-label={copy.completeTitle} className="space-y-4 rounded-2xl border border-[var(--color-border)] p-5">
      <h4 className="font-bold">{copy.completeTitle}</h4>
      <Textarea rows={4} label={copy.completeNotes} error={notesTooLong ? copy.notesTooLong : undefined} value={notes} onChange={(event) => setNotes(event.target.value)} />
      <Input inputMode="numeric" label={copy.minutesId} hint={copy.minutesHint} error={minutesInvalid ? copy.minutesInvalid : undefined} value={minutes} onChange={(event) => setMinutes(event.target.value)} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onBack} disabled={busy}>{copy.back}</Button>
        <Button onClick={submit} disabled={busy || notesTooLong || minutesInvalid}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}{copy.completeSubmit}</Button>
      </div>
    </section>
  )
}

function CancelForm({ copy, busy, onSubmit, onBack }) {
  const [reason, setReason] = useState('')
  const typed = reason.trim().length > 0
  return (
    <section aria-label={copy.cancel} className="space-y-4 rounded-2xl border border-red-200 p-5">
      <h4 className="font-bold">{copy.cancel}</h4>
      <Textarea rows={3} label={copy.cancelReason} hint={copy.cancelReasonHint} error={typed && !isCancelReasonValid(reason) ? copy.cancelReasonInvalid : undefined} value={reason} onChange={(event) => setReason(event.target.value)} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onBack} disabled={busy}>{copy.back}</Button>
        <Button variant="danger" onClick={() => onSubmit({ reason: reason.trim() })} disabled={busy || !isCancelReasonValid(reason)}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : <XCircle size={17} />}{copy.cancelSubmit}</Button>
      </div>
    </section>
  )
}

function DecideForm({ interview, copy, decisionText, categories, language, busy, onSubmit }) {
  const noShow = interview.status === 'no_show'
  const options = noShow ? ['decline'] : INTERVIEW_DECISIONS
  const [decision, setDecision] = useState(noShow ? 'decline' : '')
  // A no-show starts on the category that says so; staff may still choose another.
  const [category, setCategory] = useState(noShow && categories.some((item) => item.code === 'interview_not_attended') ? 'interview_not_attended' : '')
  const [rationale, setRationale] = useState('')
  const [confirming, setConfirming] = useState(false)
  const declining = decision === 'decline'
  const ready = options.includes(decision) && isRationaleValid(rationale) && (!declining || Boolean(category))

  function submit() {
    onSubmit({ decision, rationale: rationale.trim(), ...(declining ? { decline_category: category } : {}) })
  }

  return (
    <section aria-label={copy.decideTitle} className="space-y-4 rounded-2xl border border-sky-200 p-5">
      <h4 className="flex items-center gap-2 font-bold"><Gavel size={17} aria-hidden="true" />{copy.decideTitle}</h4>
      {noShow ? <p className="text-sm text-[var(--color-text-muted)]">{copy.decideNoShowHint}</p> : null}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{copy.decision}</legend>
        <div className="flex flex-wrap gap-3">
          {options.map((value) => <label key={value} className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"><input type="radio" name={`rpl-interview-decision-${interview.id}`} value={value} checked={decision === value} onChange={() => { setDecision(value); setConfirming(false) }} />{copy.decisions[value]}</label>)}
        </div>
      </fieldset>
      {declining ? (
        <div className="space-y-3">
          <Select label={decisionText.category} hint={decisionText.categoryHint} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">—</option>
            {categories.map((item) => <option key={item.code} value={item.code}>{localize(item.label, language) || item.code}</option>)}
          </Select>
          <ApplicantCategoryPreview code={category} categories={categories} copy={decisionText} />
        </div>
      ) : null}
      <Textarea rows={4} label={decisionText.rationale} hint={decisionText.rationaleHint} error={rationale.trim() && !isRationaleValid(rationale) ? decisionText.rationaleInvalid : undefined} value={rationale} onChange={(event) => setRationale(event.target.value)} />
      {declining && confirming ? (
        <div className="space-y-3 rounded-2xl border border-red-300 bg-red-50 p-4">
          <p className="text-sm leading-6 text-red-800">{decisionText.confirmDeclineHint}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>{copy.back}</Button>
            <Button variant="danger" onClick={submit} disabled={busy || !ready}>{decisionText.confirmDecline}</Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          {declining
            ? <Button variant="danger" onClick={() => setConfirming(true)} disabled={busy || !ready}>{decisionText.submitDecline}</Button>
            : <Button onClick={submit} disabled={busy || !ready}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Gavel size={17} />}{copy.decideSubmit}</Button>}
        </div>
      )}
    </section>
  )
}

function LegacyOutcomeForm({ copy, busy, onSubmit, onBack }) {
  const [result, setResult] = useState('')
  const [outcome, setOutcome] = useState('')
  const tooLong = outcome.trim().length > CASE_DECISION_LIMITS.legacyOutcomeMax
  return (
    <section aria-label={copy.legacyTitle} className="space-y-3 rounded-2xl border border-[var(--color-border)] p-4">
      <p className="text-sm text-[var(--color-text-muted)]">{copy.legacyHint}</p>
      <Select label={copy.legacyResult} value={result} onChange={(event) => setResult(event.target.value)}>
        <option value="">—</option>
        {LEGACY_INTERVIEW_RESULTS.map((value) => <option key={value} value={value}>{copy.legacyResults[value]}</option>)}
      </Select>
      <Textarea rows={3} label={copy.legacyOutcomeLabel} error={tooLong ? copy.notesTooLong : undefined} value={outcome} onChange={(event) => setOutcome(event.target.value)} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onBack} disabled={busy}>{copy.back}</Button>
        <Button size="sm" onClick={() => onSubmit({ status: result, ...(outcome.trim() ? { outcome: outcome.trim() } : {}) })} disabled={busy || !result || tooLong}>{copy.legacySubmit}</Button>
      </div>
    </section>
  )
}

/** The interview staff act on now, with the actions its status allows. Keyed by id and status, so every form starts fresh after a move. */
function CurrentInterview({ interview, applicationStatus, copy, decisionText, categories, officeAddress, addressLanguage, language, busy, act }) {
  const status = interviewStatus(interview)
  const [open, setOpen] = useState(['offered', 'mode_chosen'].includes(status) ? 'schedule' : null)
  const canDecide = applicationStatus === 'interview_required' && !interview.decision && ['completed', 'no_show'].includes(status)
  // Back returns to the default view: the schedule form while the interview still needs a time.
  const back = () => setOpen(status === 'scheduled' ? null : 'schedule')

  return (
    <article className="space-y-5 rounded-2xl border border-[var(--color-border)] p-5" data-interview-status={status}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold">{copy.current}</h4>
        <InterviewStatusBadge interview={interview} language={language} />
      </div>
      {status === 'offered' ? <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">{copy.awaitingChoice}</p> : null}
      {status === 'expired' ? <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{copy.expiredHint}</p> : null}
      <InterviewDetails interview={interview} copy={copy} language={language} />

      {open === 'schedule' && ['offered', 'mode_chosen', 'scheduled'].includes(status) ? <ScheduleForm interview={interview} copy={copy} officeAddress={officeAddress} addressLanguage={addressLanguage} busy={busy} onBack={status === 'scheduled' ? back : null} onSubmit={(payload) => act(() => scheduleRplCaseInterview(interview.id, payload), copy.scheduledDone)} /> : null}
      {open === 'complete' && status === 'scheduled' ? <CompleteForm copy={copy} busy={busy} onBack={back} onSubmit={(payload) => act(() => completeRplInterview(interview.id, payload), copy.completedDone)} /> : null}
      {open === 'noShow' && status === 'scheduled' ? (
        <section aria-label={copy.noShow} className="space-y-3 rounded-2xl border border-red-200 p-5">
          <p className="text-sm leading-6">{copy.noShowConfirm}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={back} disabled={busy}>{copy.back}</Button>
            <Button variant="danger" onClick={() => act(() => markRplInterviewNoShow(interview.id), copy.noShowDone)} disabled={busy}><UserX size={17} />{copy.noShowSubmit}</Button>
          </div>
        </section>
      ) : null}
      {open === 'cancel' && ['offered', 'mode_chosen', 'scheduled'].includes(status) ? <CancelForm copy={copy} busy={busy} onBack={back} onSubmit={(payload) => act(() => cancelRplInterview(interview.id, payload), copy.cancelledDone)} /> : null}

      {['offered', 'mode_chosen', 'scheduled'].includes(status) && (open === null || (open === 'schedule' && status !== 'scheduled')) ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] pt-4">
          {status === 'scheduled' ? (
            <>
              <Button size="sm" onClick={() => setOpen('complete')} disabled={busy}><CheckCircle2 size={16} />{copy.completeSubmit}</Button>
              <Button size="sm" variant="outline" onClick={() => setOpen('noShow')} disabled={busy}><UserX size={16} />{copy.noShow}</Button>
              <Button size="sm" variant="outline" onClick={() => setOpen('schedule')} disabled={busy}><CalendarClock size={16} />{copy.reschedule}</Button>
            </>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => setOpen('cancel')} disabled={busy}><XCircle size={16} />{copy.cancel}</Button>
        </div>
      ) : null}

      {canDecide ? <DecideForm interview={interview} copy={copy} decisionText={decisionText} categories={categories} language={language} busy={busy} onSubmit={(payload) => act(() => decideRplInterview(interview.id, payload), copy.decidedDone[payload.decision])} /> : null}
    </article>
  )
}

function HistoryRow({ interview, copy, language, canRecordLegacy, busy, act }) {
  const [open, setOpen] = useState(false)
  const legacy = isLegacyInterview(interview)
  return (
    <article className="space-y-4 rounded-2xl border border-[var(--color-border)] p-4" data-interview-kind={legacy ? 'legacy_assessment' : 'case'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <InterviewStatusBadge interview={interview} language={language} />
          {legacy ? <Badge variant="neutral">{copy.legacy}</Badge> : null}
          <span className="text-xs text-[var(--color-text-muted)]">{formatLocalizedDateTime(interview.scheduled_at || interview.offered_at || interview.created_at, language)}</span>
        </div>
        {legacy && interview.rpl_assessment_id ? <Link to={`/rpl/assessments/${interview.rpl_assessment_id}`} className="text-sm font-semibold text-[var(--color-primary)] underline underline-offset-2">{copy.openAssessment}</Link> : null}
      </div>
      <InterviewDetails interview={interview} copy={copy} language={language} />
      {legacy && interview.status === 'scheduled' && canRecordLegacy ? (
        open
          ? <LegacyOutcomeForm copy={copy} busy={busy} onBack={() => setOpen(false)} onSubmit={async (payload) => { if (await act(() => updateRplInterview(interview.id, payload), copy.legacyDone)) setOpen(false) }} />
          : <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={busy}>{copy.legacyTitle}</Button></div>
      ) : null}
    </article>
  )
}

export default function InterviewPanel({
  applicationId,
  application,
  canManage = false,
  canRecordLegacy = false,
  canReadSettings = false,
  viewer = null,
  declineCategories = DECLINE_CATEGORIES,
  language = 'en',
  refreshKey = 0,
  onChanged,
}) {
  const lang = language === 'ar' ? 'ar' : 'en'
  const copy = interviewCopy(lang)
  const decisionText = caseDecisionCopy(lang)
  const [state, setState] = useState({ loading: false, error: '', forbidden: false, items: [] })
  const [request, setRequest] = useState({ busy: false, error: '' })
  const [officeAddress, setOfficeAddress] = useState(null)

  const load = useCallback(async () => {
    if (!canManage) return
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const response = await fetchRplInterviews(applicationId)
      setState({ loading: false, error: '', forbidden: false, items: unwrapCollection(response) })
    } catch (error) {
      if (Number(error?.response?.status) === 403) setState({ loading: false, error: '', forbidden: true, items: [] })
      else setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.loadError, lang) }))
    }
  }, [applicationId, canManage, copy.loadError, lang])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load, refreshKey])

  /*
   * The office address prefills an interview at the office. It lives in the RPL
   * settings, which only rpl.settings.manage may read; without it the field
   * starts empty and the server fills in the same setting when it is left so.
   */
  useEffect(() => {
    if (!canManage || !canReadSettings) return undefined
    let live = true
    fetchRplSettings()
      .then((response) => {
        const address = unwrapApiData(response)?.rpl_interview_office_address
        if (live && address && typeof address === 'object') setOfficeAddress(address)
      })
      .catch(() => {})
    return () => { live = false }
  }, [canManage, canReadSettings])

  if (!canManage || state.forbidden) return null

  const categories = Array.isArray(declineCategories) && declineCategories.length ? declineCategories : DECLINE_CATEGORIES
  const items = state.items
  const current = currentInterview(items)
  const history = items.filter((item) => item !== current)
  const canOffer = application?.status === 'interview_required' && !(current && isActiveInterview(current))

  async function act(call, message) {
    setRequest({ busy: true, error: '' })
    try {
      const result = unwrapApiData(await call())
      setRequest({ busy: false, error: '' })
      await load()
      onChanged?.({ message, result })
      return true
    } catch (error) {
      setRequest({ busy: false, error: readApiError(error, copy.failed, lang) })
      return false
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle className="flex items-center gap-2"><CalendarClock size={19} aria-hidden="true" />{copy.title}</CardTitle>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.hint}</p>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {request.error ? <div role="alert" className="whitespace-pre-line [unicode-bidi:plaintext] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{request.error}</div> : null}
        {state.loading && !items.length ? <p className="text-sm text-[var(--color-text-muted)]">{copy.loading}</p> : null}
        {state.error ? <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{state.error}</span><Button size="sm" variant="outline" onClick={load}>{copy.retry}</Button></div> : null}
        {!state.loading && !state.error && !items.length ? <p className="text-sm text-[var(--color-text-muted)]">{copy.empty}</p> : null}

        {current ? <CurrentInterview key={`${current.id}-${interviewStatus(current)}`} interview={current} applicationStatus={application?.status} copy={copy} decisionText={decisionText} categories={categories} officeAddress={officeAddress} addressLanguage={applicantLanguage(application)} language={lang} busy={request.busy} act={act} /> : null}
        {canOffer ? <OfferForm copy={copy} busy={request.busy} onSubmit={(payload) => act(() => offerRplInterview(applicationId, payload), copy.offeredDone)} /> : null}

        {history.length ? (
          <section aria-label={copy.history} className="space-y-3">
            <h4 className="font-bold">{copy.history}</h4>
            {history.map((item, index) => <HistoryRow key={item.id || index} interview={item} copy={copy} language={lang} canRecordLegacy={canRecordLegacy && canRecordLegacyOutcome(item, application, viewer)} busy={request.busy} act={act} />)}
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}
