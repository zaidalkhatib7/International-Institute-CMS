import { useCallback, useEffect, useState } from 'react'
import { ClipboardCheck, Gavel, LoaderCircle, ScanSearch, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Textarea } from '../../../components/ui'
import { readApiError, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { formatLocalizedDateTime } from '../../../utils/localization'
import { DECLINE_CATEGORIES, localize } from '../domain/rpl'
import { caseFigureText, fill, isPartialScreen, labelFor, screeningCopy, statusExplanation } from '../domain/documentScreening'
import {
  DECISION_VARIANT,
  INTERVIEW_MODES,
  SCREENING_DECISIONS,
  caseDecisionCopy,
  overrideReasonRequest,
  screeningDecisionPayload,
  screeningDecisionProblems,
  snapshotFigureText,
} from '../domain/caseDecision'
import { fetchRplScreeningDecisions, recordRplScreeningDecision, startAdminRplAssessment } from '../services/rplService'

/*
 * THE SCREENING DECISION (owner flow of 12 Oct 2026, steps 4.3-4.5, P3).
 *
 * Once the evidence is under verification, one staff member decides: Pass to
 * quiz, Interview, or Decline, always with a written rationale (D6(a)). The
 * latest screen is shown beside the choice, never in place of it: the figure is
 * advice, and the server freezes what staff saw into the decision so an
 * accreditor can later see it too.
 *
 * The server alone knows whether screening is switched on, so the override
 * reason appears when the server asks for it (a 422 naming override_reason),
 * not on a guess. The rationale is staff-only; a decline tells the applicant one
 * sentence from the fixed category list, and the form shows that sentence.
 */

const emptyForm = { decision: '', rationale: '', override_reason: '', offered_modes: [], offer_message: '', decline_category: '' }

function personName(person, copy) {
  return person?.name || copy.someone
}

/**
 * The latest screen as staff need it at the moment of deciding: figure, coverage, staleness, or why there is none.
 * Until the screens have loaded it says so: "no screening has run" is a statement about the case, never a guess
 * made while the list is still on its way (platform walk, 17 Oct 2026, UI-07).
 */
function ScreeningGlance({ screenings, loading = false, error = '', copy, screeningText }) {
  const list = Array.isArray(screenings) ? screenings : []
  if (!list.length && (loading || error)) {
    return (
      <section aria-label={copy.latestScreening} aria-busy={loading || undefined} className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"><ScanSearch size={15} aria-hidden="true" />{copy.latestScreening}</p>
        {loading ? <p role="status" className="flex items-center gap-2 text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={15} aria-hidden="true" />{copy.screeningLoading}</p> : <p className="whitespace-pre-line text-[var(--color-danger)]">{error}</p>}
      </section>
    )
  }
  const latest = list[0] || null
  const completed = list.find((item) => item?.status === 'completed') || null
  const figure = completed ? caseFigureText(completed, screeningText) : null
  const current = Boolean(completed) && !completed.is_stale
  const pending = latest && latest !== completed ? statusExplanation(latest, screeningText) : null

  return (
    <section aria-label={copy.latestScreening} className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"><ScanSearch size={15} aria-hidden="true" />{copy.latestScreening}</p>
      {!latest ? <p className="text-[var(--color-text-muted)]">{copy.noScreening}</p> : null}
      {completed ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-bold text-[var(--color-text)]">{figure || screeningText.completedNoFigure}</p>
          {isPartialScreen(completed) ? <Badge variant="warning">{screeningText.partial}</Badge> : null}
        </div>
      ) : null}
      {completed?.coverage?.documents_total != null ? <p className="text-[var(--color-text-muted)]">{fill(copy.coverage, { read: completed.coverage.read ?? 0, total: completed.coverage.documents_total })}</p> : null}
      {completed?.is_stale ? <p className="flex items-center gap-2 font-semibold text-amber-800" data-stale="true"><TriangleAlert size={15} aria-hidden="true" />{copy.staleScreening}</p> : null}
      {pending ? <p className="text-[var(--color-text-muted)]">{pending}</p> : null}
      {latest && !current ? <p className="leading-6 text-amber-900">{copy.noCurrentScreening}</p> : null}
    </section>
  )
}

/** The fixed sentence a declined applicant reads, in both languages, so staff see exactly what goes out. */
export function ApplicantCategoryPreview({ code, categories, copy }) {
  const category = (Array.isArray(categories) ? categories : DECLINE_CATEGORIES).find((item) => item.code === code)
  if (!category) return null
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      <p className="text-xs font-semibold uppercase tracking-wide">{copy.applicantReads}</p>
      <p dir="ltr" lang="en" className="mt-1">{localize(category.label, 'en')}</p>
      <p dir="rtl" lang="ar" className="mt-1">{localize(category.label, 'ar')}</p>
    </div>
  )
}

/** One recorded decision: what was decided, by whom, why, and (for those allowed) the screen as it stood then. */
export function ScreeningDecisionEntry({ decision, language = 'en', showSnapshot = false }) {
  const lang = language === 'ar' ? 'ar' : 'en'
  const copy = caseDecisionCopy(lang)
  const screeningText = screeningCopy(lang)
  if (!decision) return null
  const snapshot = showSnapshot && decision.screening_snapshot && typeof decision.screening_snapshot === 'object' ? decision.screening_snapshot : null
  const figure = snapshot ? snapshotFigureText(snapshot, screeningText) : null
  const employers = snapshot?.employer_summary && typeof snapshot.employer_summary === 'object' ? snapshot.employer_summary : null

  return (
    <article className="space-y-3 rounded-2xl border border-[var(--color-border)] p-4" data-decision={decision.decision}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={DECISION_VARIANT[decision.decision] || 'neutral'}>{labelFor(copy.decisions, decision.decision)}</Badge>
        <p className="text-xs text-[var(--color-text-muted)]">{fill(copy.decidedBy, { name: personName(decision.decided_by, copy), at: formatLocalizedDateTime(decision.decided_at, lang) })}</p>
      </div>
      {decision.rationale ? <p dir="auto" className="whitespace-pre-wrap text-sm leading-6 text-[var(--color-text)]">{decision.rationale}</p> : null}
      {decision.override_reason ? <p className="text-sm leading-6"><span className="font-semibold text-[var(--color-text-muted)]">{copy.overrideRecorded}: </span><span dir="auto" className="whitespace-pre-wrap">{decision.override_reason}</span></p> : null}
      {snapshot ? (
        <div className="rounded-xl bg-[var(--color-surface-muted)] px-3 py-2 text-xs leading-5 text-[var(--color-text-muted)]">
          <p className="font-semibold">{copy.seenAtDecision}: {labelFor(copy.snapshotState, snapshot.state)}{snapshot.is_stale && snapshot.state !== 'stale' ? ` · ${copy.snapshotState.stale}` : ''}</p>
          {figure ? <p className="mt-1 text-sm font-bold text-[var(--color-text)]">{figure}</p> : null}
          {snapshot.coverage?.documents_total != null ? <p className="mt-1">{fill(copy.coverage, { read: snapshot.coverage.read ?? 0, total: snapshot.coverage.documents_total })}</p> : null}
          {employers ? <p className="mt-1">{fill(copy.employerSummary, { found_consistent: employers.found_consistent ?? 0, found_inconsistent: employers.found_inconsistent ?? 0, not_found_online: employers.not_found_online ?? 0, ambiguous: employers.ambiguous ?? 0, not_checked: employers.not_checked ?? 0 })}</p> : null}
        </div>
      ) : null}
    </article>
  )
}

/*
 * The decisions recorded on the case, newest first. They carry the screening
 * snapshot, so they are read with rpl.screening.view only; a 403 from the server
 * removes the list rather than showing an error.
 */
export function ScreeningDecisionHistory({ applicationId, canView = false, refreshKey = 0, language = 'en' }) {
  const lang = language === 'ar' ? 'ar' : 'en'
  const copy = caseDecisionCopy(lang)
  const [state, setState] = useState({ loading: false, error: '', forbidden: false, items: [] })

  const load = useCallback(async () => {
    if (!canView) return
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const response = await fetchRplScreeningDecisions(applicationId)
      setState({ loading: false, error: '', forbidden: false, items: unwrapCollection(response) })
    } catch (error) {
      if (Number(error?.response?.status) === 403) setState({ loading: false, error: '', forbidden: true, items: [] })
      else setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.historyLoadError, lang) }))
    }
  }, [applicationId, canView, copy.historyLoadError, lang])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load, refreshKey])

  if (!canView || state.forbidden) return null

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.history}</CardTitle></CardHeader>
      <CardContent className="space-y-3 pt-6">
        {state.loading && !state.items.length ? <p className="text-sm text-[var(--color-text-muted)]">{copy.historyLoading}</p> : null}
        {state.error ? <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{state.error}</span><Button size="sm" variant="outline" onClick={load}>{copy.retry}</Button></div> : null}
        {!state.loading && !state.error && !state.items.length ? <p className="text-sm text-[var(--color-text-muted)]">{copy.historyEmpty}</p> : null}
        {state.items.map((item, index) => <ScreeningDecisionEntry key={item.id || index} decision={item} language={lang} showSnapshot />)}
      </CardContent>
    </Card>
  )
}

export default function ScreeningDecisionCard({
  applicationId,
  status,
  canDecide = false,
  canViewScreening = false,
  canStartAssessment = false,
  screenings = [],
  screeningsLoading = false,
  screeningsError = '',
  declineCategories = DECLINE_CATEGORIES,
  language = 'en',
  onDecided,
}) {
  const lang = language === 'ar' ? 'ar' : 'en'
  const copy = caseDecisionCopy(lang)
  const screeningText = screeningCopy(lang)
  const [form, setForm] = useState(emptyForm)
  // The server's own words when it asks for an override reason; '' until it does.
  const [overrideAsked, setOverrideAsked] = useState('')
  const [confirmingDecline, setConfirmingDecline] = useState(false)
  const [request, setRequest] = useState({ busy: false, error: '' })

  if (!canDecide || status !== 'evidence_verification') return null

  const categories = Array.isArray(declineCategories) && declineCategories.length ? declineCategories : DECLINE_CATEGORIES
  const overrideRequested = Boolean(overrideAsked)
  const problems = screeningDecisionProblems(form, { overrideRequested })
  const ready = Object.keys(problems).length === 0
  const rationaleTyped = form.rationale.trim().length > 0

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    if (field === 'decision') setConfirmingDecline(false)
  }

  function toggleMode(mode) {
    setForm((current) => ({ ...current, offered_modes: current.offered_modes.includes(mode) ? current.offered_modes.filter((item) => item !== mode) : [...current.offered_modes, mode] }))
  }

  async function submit({ startAssessment = false } = {}) {
    if (!ready) return
    setRequest({ busy: true, error: '' })
    const decision = form.decision
    try {
      const result = unwrapApiData(await recordRplScreeningDecision(applicationId, screeningDecisionPayload(form, { overrideRequested })))
      let assessment = null
      let startError = ''
      if (startAssessment && decision === 'pass_to_quiz') {
        try {
          assessment = unwrapApiData(await startAdminRplAssessment(applicationId))
        } catch (error) {
          startError = `${copy.startFailed}\n\n${readApiError(error, '', lang)}`.trim()
        }
      }
      setRequest({ busy: false, error: '' })
      setForm(emptyForm)
      setOverrideAsked('')
      setConfirmingDecline(false)
      onDecided?.({ decision, result, assessment, message: startError || copy.recorded[decision], failed: Boolean(startError) })
    } catch (error) {
      const asked = overrideReasonRequest(error)
      setConfirmingDecline(false)
      if (asked) {
        setOverrideAsked(asked)
        setRequest({ busy: false, error: '' })
      } else {
        setRequest({ busy: false, error: readApiError(error, copy.failed, lang) })
      }
    }
  }

  const name = `rpl-screening-decision-${applicationId}`

  return (
    <Card className="border-sky-200">
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle className="flex items-center gap-2"><Gavel size={19} aria-hidden="true" />{copy.title}</CardTitle>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.hint}</p>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {canViewScreening ? <ScreeningGlance screenings={screenings} loading={screeningsLoading} error={screeningsError} copy={copy} screeningText={screeningText} /> : null}

        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-[var(--color-text)]">{copy.decision}</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {SCREENING_DECISIONS.map((value) => (
              <label key={value} className={`flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 text-sm ${form.decision === value ? 'border-[var(--color-primary)] bg-sky-50' : 'border-[var(--color-border)]'}`}>
                <span className="flex items-center gap-2 font-semibold"><input type="radio" name={name} value={value} checked={form.decision === value} onChange={() => update('decision', value)} />{copy.decisions[value]}</span>
                <span className="leading-5 text-[var(--color-text-muted)]">{copy.decisionHints[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {form.decision === 'interview_required' ? (
          <div className="space-y-4 rounded-2xl border border-[var(--color-border)] p-4">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{copy.modes}</legend>
              <div className="flex flex-wrap gap-3">
                {INTERVIEW_MODES.map((mode) => <label key={mode} className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"><input type="checkbox" checked={form.offered_modes.includes(mode)} onChange={() => toggleMode(mode)} />{copy.modeLabels[mode]}</label>)}
              </div>
              {problems.offered_modes ? <p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.modesRequired}</p> : null}
            </fieldset>
            <Textarea rows={3} label={copy.offerMessage} hint={copy.offerMessageHint} error={problems.offer_message ? copy.offerMessageTooLong : undefined} value={form.offer_message} onChange={(event) => update('offer_message', event.target.value)} />
          </div>
        ) : null}

        {form.decision === 'decline' ? (
          <div className="space-y-3 rounded-2xl border border-red-200 p-4">
            <Select label={copy.category} hint={copy.categoryHint} value={form.decline_category} onChange={(event) => update('decline_category', event.target.value)}>
              <option value="">—</option>
              {categories.map((category) => <option key={category.code} value={category.code}>{localize(category.label, lang) || category.code}</option>)}
            </Select>
            <ApplicantCategoryPreview code={form.decline_category} categories={categories} copy={copy} />
          </div>
        ) : null}

        {form.decision ? <Textarea rows={4} label={copy.rationale} hint={copy.rationaleHint} error={rationaleTyped && problems.rationale ? copy.rationaleInvalid : undefined} value={form.rationale} onChange={(event) => update('rationale', event.target.value)} /> : null}

        {overrideRequested && form.decision ? (
          <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p role="status" className="whitespace-pre-line text-sm leading-6 text-amber-900">{overrideAsked.trim() || copy.overrideRequired}</p>
            <Textarea rows={3} label={copy.overrideReason} hint={copy.overrideHint} value={form.override_reason} onChange={(event) => update('override_reason', event.target.value)} />
          </div>
        ) : null}

        {request.error ? <div role="alert" className="whitespace-pre-line [unicode-bidi:plaintext] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{request.error}</div> : null}

        {form.decision === 'decline' && confirmingDecline ? (
          <div className="space-y-3 rounded-2xl border border-red-300 bg-red-50 p-4">
            <p className="text-sm leading-6 text-red-800">{copy.confirmDeclineHint}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmingDecline(false)} disabled={request.busy}>{copy.back}</Button>
              <Button variant="danger" onClick={() => submit()} disabled={request.busy || !ready}>{request.busy ? <LoaderCircle className="animate-spin" size={17} /> : null}{copy.confirmDecline}</Button>
            </div>
          </div>
        ) : form.decision ? (
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {form.decision === 'pass_to_quiz' && canStartAssessment ? <Button variant="outline" onClick={() => submit({ startAssessment: true })} disabled={request.busy || !ready} title={copy.passAndStartHint}><ClipboardCheck size={17} />{copy.passAndStart}</Button> : null}
            {form.decision === 'decline'
              ? <Button variant="danger" onClick={() => setConfirmingDecline(true)} disabled={request.busy || !ready}>{copy.submitDecline}</Button>
              : <Button onClick={() => submit()} disabled={request.busy || !ready}>{request.busy ? <LoaderCircle className="animate-spin" size={17} /> : <Gavel size={17} />}{copy.submit}</Button>}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
