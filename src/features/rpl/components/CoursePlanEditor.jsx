import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Ban, FilePenLine, History, ListChecks, LoaderCircle, PenLine, Plus, RefreshCw, Sparkles, Trash2, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, CoursePicker, Textarea } from '../../../components/ui'
import { readApiError, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { formatLocalizedDateTime } from '../../../utils/localization'
import { localize } from '../domain/rpl'
import { fill, humanizeCode } from '../domain/documentScreening'
import { formatQuizPercent } from '../domain/entryQuiz'
import {
  COURSE_PLAN_LIMITS,
  activePlanItems,
  applyCoursePlanWrite,
  coursePlanCopy,
  coursePlanLocale,
  heldPlanItems,
  isCoursePlanReadOnly,
  isCoursePlanReasonValid,
  isCoursePlanStateRefusal,
  isItemRemovable,
  isMinimumSettingMissing,
  isPlanClosedWithExperienceCertificate,
  isPlanLearningComplete,
  isStaleConflict,
  itemHolds,
  minimumsText,
  professionalLevelName,
  removedPlanItems,
  topUpsBeyondMinimum,
  topUpsWithoutMinimum,
} from '../domain/coursePlan'
import {
  addRplCoursePlanItem,
  amendRplCoursePlan,
  approveRplCoursePlan,
  composeRplCoursePlan,
  discardRplCoursePlan,
  fetchRplCoursePlan,
  fetchRplCoursePlanCatalogue,
  fetchRplCoursePlanVersion,
  generateRplCoursePlan,
  regenerateRplCoursePlan,
  removeRplCoursePlanItem,
} from '../services/rplService'
import { RecommendationGrounds } from './AdvisoryProvenance'
import AiProvenanceNote from '../../shared/ai/AiProvenanceNote'
import AiRunNotice from '../../shared/ai/AiRunNotice'
import AiServiceBanner from '../../shared/ai/AiServiceBanner'
import { aiCopy } from '../../shared/ai/aiCopy'
import { isAiRunInFlight, isCapacityFailure, isWaitingRetry, retryTargetOf, runError } from '../../shared/ai/aiState'
import { retryAiGenerationNow } from '../../shared/ai/aiServiceApi'
import useAiRunPoll from '../../shared/ai/useAiRunPoll'

/*
 * THE COURSE PLAN EDITOR (owner flow of 12 Oct 2026, plan 4.7 and 5.4-5.6, P5).
 *
 * Gemini proposes the client's courses from the evaluation of the entry quiz;
 * staff add and remove courses, each with a written reason, and approve the plan
 * (D13(b): at least the governed minimum for the level after a passed quiz, or
 * fewer with a written reason; after a failed quiz the gap-closing courses first,
 * then top-ups to the failed-client minimum, owner 15 Oct 2026, "hybrid").
 *
 * P6 (owner model of 15 Oct 2026): the client buys the approved courses; each
 * item shows its purchase, enrolment, lessons and course quiz, and a governance
 * hold on its programme. When every course is completed the plan closes and the
 * final exam opens; a closed plan is read-only.
 *
 * The component loads its own data, so the case workspace never has to. What may
 * be done comes from the server's `can` flags, and every write sends the plan's
 * lock_version: a 409 means someone else changed the plan first, and the editor
 * says so, keeps the reason that was typed and reloads. A 403 on the read tells
 * the page to hide the tab. Copy is Arabic and English only.
 */

const PLAN_STATUS_VARIANT = { draft: 'warning', approved: 'success', superseded: 'neutral', discarded: 'neutral', closed: 'success' }
const ITEM_STATUS_VARIANT = { proposed: 'info', approved: 'success', removed: 'neutral', purchased: 'primary', completed: 'success', refunded: 'neutral' }
const PURPOSE_VARIANT = { gap_closure: 'info', minimum_completion: 'warning', staff_added: 'neutral' }

const EMPTY_FORMS = { regenerate: null, amend: null, discard: null, add: null, remove: null, compose: null, belowMinimumReason: '' }

function personName(person, copy) {
  return person?.name || copy.someone
}

function planCounts(plan) {
  const active = activePlanItems(plan)
  return {
    active: plan?.counts?.active ?? active.length,
    completed: active.filter((item) => item?.status === 'completed').length,
    buyable: plan?.counts?.buyable ?? active.filter((item) => item?.program?.buyable === true).length,
    removed: plan?.counts?.removed ?? removedPlanItems(plan).length,
  }
}

function ReasonField({ id, copy, label, hint, value, onChange, disabled }) {
  const typed = String(value ?? '').trim() !== ''
  const invalid = typed && !isCoursePlanReasonValid(value)
  return <Textarea id={id} rows={3} label={label || copy.reason} value={value} maxLength={COURSE_PLAN_LIMITS.reasonMax} hint={hint || copy.reasonHint} error={invalid ? copy.reasonInvalid : undefined} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
}

function InlineForm({ title, text, children, submitLabel, submitVariant = 'primary', canSubmit, busy, onSubmit, onCancel, copy }) {
  return (
    <section aria-label={title} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
      <strong className="block">{title}</strong>
      {text ? <p className="leading-6 text-[var(--color-text-muted)]">{text}</p> : null}
      {children}
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>{copy.cancel}</Button>
        <Button size="sm" variant={submitVariant} onClick={onSubmit} disabled={busy || !canSubmit}>{busy ? <LoaderCircle className="animate-spin" size={15} /> : null}{submitLabel}</Button>
      </div>
    </section>
  )
}

function ItemBadges({ item, copy }) {
  const program = item?.program || {}
  return (
    <div className="flex flex-wrap items-center gap-2">
      {item?.purpose ? <Badge variant={PURPOSE_VARIANT[item.purpose] || 'neutral'}>{copy.purpose[item.purpose] || humanizeCode(item.purpose)}</Badge> : null}
      {/* A staff-added course already says so through its purpose. */}
      {item?.origin && !(item.origin === 'staff' && item.purpose === 'staff_added') ? <Badge variant="neutral">{copy.origin[item.origin] || humanizeCode(item.origin)}</Badge> : null}
      {item?.status ? <Badge variant={ITEM_STATUS_VARIANT[item.status] || 'neutral'}>{copy.itemStatus[item.status] || humanizeCode(item.status)}</Badge> : null}
      {/* A course the client already holds is not offered for sale, so "buyable" says nothing about it. */}
      {['purchased', 'completed'].includes(item?.status) ? null : program.buyable === true ? <Badge variant="success">{copy.buyable}</Badge> : <Badge variant="warning">{copy.notBuyable}</Badge>}
      {itemHolds(item).length ? <Badge variant="danger">{copy.onHold}</Badge> : null}
    </div>
  )
}

/*
 * What the client has done with an approved course (P6): bought on, the
 * enrolment and its package version, lessons completed, the course quiz, and
 * completed on. Staff-only facts; the client sees its own progress elsewhere.
 */
function ItemProgress({ item, copy, language }) {
  const enrollment = item?.enrollment && typeof item.enrollment === 'object' ? item.enrollment : null
  const progress = enrollment?.progress || item?.progress || null
  const lines = []
  if (item?.purchased_at) lines.push(fill(copy.purchasedOn, { at: formatLocalizedDateTime(item.purchased_at, language) }))
  if (enrollment?.id != null) lines.push(fill(copy.enrolment, { id: enrollment.id, version: enrollment.package_version || '—' }))
  if (progress && progress.lessons_total != null) lines.push(fill(copy.lessonsProgress, { done: progress.lessons_completed ?? 0, total: progress.lessons_total }))
  if (progress && typeof progress.course_quiz_passed === 'boolean') lines.push(progress.course_quiz_passed ? copy.courseQuizPassed : copy.courseQuizNotPassed)
  if (item?.completed_at) lines.push(fill(copy.completedOn, { at: formatLocalizedDateTime(item.completed_at, language) }))
  if (!lines.length) return null
  return <p className="text-xs leading-5 text-[var(--color-text-muted)]">{lines.map((line, index) => <span key={line}>{index ? ' · ' : ''}<bdi>{line}</bdi></span>)}</p>
}

function ItemCard({ item, copy, language, evidenceTitles, competencyNames, removable, removeForm, busy, onOpenRemove, onRemoveChange, onRemoveCancel, onRemoveSubmit }) {
  const program = item?.program || {}
  const title = localize(program.title, language) || program.official_code || `#${program.id ?? item?.id}`
  const competencies = Array.isArray(item?.competency_codes) ? item.competency_codes : []
  const evidenceIds = Array.isArray(item?.evidence_ids_considered) ? item.evidence_ids_considered : []
  const formOpen = removeForm && removeForm.itemId === item.id

  return (
    <article aria-label={title} className="space-y-3 rounded-2xl border border-[var(--color-border)] p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 dir="auto" className="font-bold text-[var(--color-text)]">{item?.position != null ? <bdi className="me-2 text-[var(--color-text-muted)]">{item.position}.</bdi> : null}{title}</h4>
          {program.official_code ? <p className="mt-1 font-mono text-xs text-[var(--color-text-muted)]"><bdi>{program.official_code}</bdi></p> : null}
        </div>
        <ItemBadges item={item} copy={copy} />
      </div>
      {item?.purpose_inferred ? <p className="text-xs leading-5 text-amber-800">{copy.purposeInferred}</p> : null}
      {item?.gemini_reason ? <p className="leading-6"><strong>{copy.geminiReason}:</strong> <span dir="auto">{item.gemini_reason}</span></p> : null}
      {item?.origin === 'staff' && item?.added_reason ? (
        <p className="leading-6"><strong>{copy.staffReason}:</strong> <span dir="auto">{item.added_reason}</span>{item.added_by ? <span className="block text-xs text-[var(--color-text-muted)]">{fill(copy.addedBy, { name: personName(item.added_by, copy) })}</span> : null}</p>
      ) : null}
      {competencies.length ? (
        <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-[var(--color-text-muted)]">{copy.competencies}:</span>{competencies.map((code) => <Badge key={code} variant="neutral"><bdi title={code}>{localize(competencyNames?.[code], language) || code}</bdi></Badge>)}</div>
      ) : null}
      {evidenceIds.length ? (
        <p className="text-xs leading-5 text-[var(--color-text-muted)]"><strong>{copy.evidenceConsidered}:</strong> {evidenceIds.map((id, index) => <span key={id}>{index ? ' · ' : ''}<bdi>{evidenceTitles.get(String(id)) || `#${id}`}</bdi></span>)}</p>
      ) : null}
      <RecommendationGrounds course={item} copy={copy} />
      <ItemProgress item={item} copy={copy} language={language} />
      {itemHolds(item).length ? <p role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{copy.itemOnHold} {fill(copy.holdBlocks, { blocks: itemHolds(item).map((hold) => copy.holdLabels[hold] || humanizeCode(hold)).join(' · ') })}</p> : null}
      {item?.status === 'purchased' ? <p className="text-xs text-[var(--color-text-muted)]">{copy.lockedPurchased}</p> : null}
      {item?.status === 'completed' ? <p className="text-xs text-[var(--color-text-muted)]">{copy.lockedCompleted}</p> : null}
      {removable && !formOpen ? <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => onOpenRemove(item.id)} disabled={Boolean(busy)}><Trash2 size={15} />{copy.remove}</Button></div> : null}
      {removable && formOpen ? (
        <InlineForm title={copy.removeSubmit} copy={copy} submitLabel={copy.removeSubmit} submitVariant="danger" busy={busy === 'remove'} canSubmit={isCoursePlanReasonValid(removeForm.reason)} onSubmit={onRemoveSubmit} onCancel={onRemoveCancel}>
          <ReasonField id={`course-plan-remove-${item.id}`} copy={copy} value={removeForm.reason} onChange={onRemoveChange} disabled={busy === 'remove'} />
        </InlineForm>
      ) : null}
    </article>
  )
}

/** A version's courses, read-only: the plan in force beside an amendment, or a past version. */
function ReadOnlyItems({ plan, copy, language }) {
  const items = activePlanItems(plan)
  if (!items.length) return <p className="text-sm text-[var(--color-text-muted)]">{copy.emptyPlan}</p>
  return (
    <ol className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] p-3">
          <span className="min-w-0"><span dir="auto" className="font-semibold">{localize(item?.program?.title, language) || item?.program?.official_code}</span>{item?.program?.official_code ? <span className="ms-2 font-mono text-xs text-[var(--color-text-muted)]"><bdi>{item.program.official_code}</bdi></span> : null}</span>
          <ItemBadges item={item} copy={copy} />
        </li>
      ))}
    </ol>
  )
}

export default function CoursePlanEditor({ applicationId, application, evidence = [], competencyNames = {}, canManage = true, language, onCaseChanged, onForbidden }) {
  const copy = coursePlanCopy(language)
  const [state, setState] = useState({ loading: true, error: '', overview: null })
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState({ error: '', success: '' })
  const [forms, setForms] = useState(EMPTY_FORMS)
  const [catalogue, setCatalogue] = useState({ status: 'idle', rows: [], error: '' })
  const [versionView, setVersionView] = useState({ publicId: null, loading: false, plan: null, error: '' })
  // The page's callbacks, read at call time so a new function from the parent never reloads the plan.
  const callbacks = useRef({ onCaseChanged, onForbidden })
  useEffect(() => {
    callbacks.current = { onCaseChanged, onForbidden }
  }, [onCaseChanged, onForbidden])

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!applicationId) return
    if (!silent) setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const overview = unwrapApiData(await fetchRplCoursePlan(applicationId))
      setState({ loading: false, error: '', overview: overview && typeof overview === 'object' ? overview : null })
    } catch (error) {
      // The server is the authority on who may read a plan: a 403 removes the tab instead of showing an error.
      if (Number(error?.response?.status) === 403) {
        setState({ loading: false, error: '', overview: null })
        callbacks.current.onForbidden?.()
        return
      }
      setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.loadError, language) }))
    }
  }, [applicationId, copy.loadError, language])

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const pollRun = state.overview?.generation?.run
  const silentReload = useCallback(() => load({ silent: true }), [load])
  useAiRunPoll(pollRun, silentReload, state.overview)

  const evidenceTitles = useMemo(() => new Map((Array.isArray(evidence) ? evidence : []).map((row) => [String(row?.id), localize(row?.title, language) || row?.media?.original_name || row?.external_url || ''])), [evidence, language])

  const overview = state.overview
  const caseStatus = overview?.application?.status || application?.status || ''
  const draft = overview?.draft || null
  const approved = overview?.approved || null
  const plan = draft || approved
  const amendment = Boolean(draft && (draft.is_amendment || approved))
  const can = (flag) => canManage !== false && overview?.can?.[flag] === true
  const editable = Boolean(draft) && can('edit')
  const versions = Array.isArray(overview?.versions) ? overview.versions : []
  const readOnly = isCoursePlanReadOnly(caseStatus) && Boolean(plan || versions.length)
  const generation = overview?.generation || {}
  /*
   * AI RESILIENCE (Release G, AI-RESILIENCE-SPEC §5.2-5.3). The queued run of the
   * proposal (generation.run, G4): read again until it has finished, said when
   * it waits to retry (with Retry now), and named when it failed. Composing the
   * plan by hand is always offered beside Generate, and first while the AI
   * service is busy, so an outage never blocks a case.
   */
  const run = generation.run && typeof generation.run === 'object' ? generation.run : null
  const runInFlight = isAiRunInFlight(run)
  const runCapacityFailed = (run?.status === 'failed' || run?.status === 'abandoned') && isCapacityFailure(runError(run).code, runError(run).errorClass)
  const runCopy = aiCopy(language).run
  const composeAllowed = overview?.can?.compose !== undefined
    ? canManage !== false && overview.can.compose === true
    : canManage !== false && !plan && (can('generate') || ((isWaitingRetry(run) || runCapacityFailed) && caseStatus === 'assessment_in_progress'))
  const composeFirst = composeAllowed && (isWaitingRetry(run) || runCapacityFailed)

  function setForm(key, value) {
    setForms((current) => ({ ...current, [key]: value }))
  }

  async function act(key, request, successText, reset) {
    setBusy(key)
    setNotice({ error: '', success: '' })
    const before = caseStatus
    try {
      const data = unwrapApiData(await request()) || {}
      const nextStatus = data.application_status || null
      const message = successText(data.plan || {})
      setState((current) => ({ ...current, overview: applyCoursePlanWrite(current.overview, data.plan, nextStatus) }))
      reset?.()
      setNotice({ error: '', success: message })
      setCatalogue((current) => (current.status === 'ready' ? { ...current, status: 'stale' } : current))
      // The case moved (generate, first approval, discard of a first draft): the page reloads the case.
      if (nextStatus && before && nextStatus !== before) callbacks.current.onCaseChanged?.({ message })
      load({ silent: true })
      return true
    } catch (error) {
      if (isStaleConflict(error)) {
        // Never readApiError's generic line: say what happened, keep what was typed, reload.
        setNotice({ error: copy.conflict, success: '' })
        load({ silent: true })
      } else if (isMinimumSettingMissing(error)) {
        // A setting to fix (R15), not an outage: say which one.
        setNotice({ error: copy.blocked.minimum_setting_missing, success: '' })
        load({ silent: true })
      } else if (isCoursePlanStateRefusal(error)) {
        // The case or the plan moved on (or the minimum changed while Gemini
        // answered): show the server's sentence and reload, so the screen stops
        // offering acts that can no longer succeed. What was typed is kept.
        setNotice({ error: readApiError(error, copy.failed, language), success: '' })
        load({ silent: true })
      } else {
        setNotice({ error: readApiError(error, copy.failed, language), success: '' })
      }
      return false
    } finally {
      setBusy('')
    }
  }

  async function loadCatalogue() {
    setCatalogue((current) => ({ ...current, status: 'loading', error: '' }))
    try {
      const rows = unwrapCollection(await fetchRplCoursePlanCatalogue(applicationId))
      setCatalogue({ status: 'ready', rows, error: '' })
    } catch (error) {
      setCatalogue({ status: 'error', rows: [], error: readApiError(error, copy.catalogueError, language) })
    }
  }

  function openAdd() {
    setForm('add', { programId: '', reason: '' })
    if (catalogue.status !== 'ready' && catalogue.status !== 'loading') loadCatalogue()
  }

  function generate() {
    // From the G4 move the server queues the proposal (202, no plan yet): the tab then says so and follows the run.
    return act('generate', () => generateRplCoursePlan(applicationId, { locale: coursePlanLocale(language) }), (created) => (created.version != null ? fill(copy.generated, { version: created.version }) : copy.generationQueued))
  }

  /* Retry now (§5.2): the server's own route for the waiting run, never Generate (refused while it waits). */
  async function retryNow() {
    await retryAiGenerationNow(run)
    await load({ silent: true })
  }

  function compose() {
    const reason = forms.compose?.reason ?? ''
    return act('compose', () => composeRplCoursePlan(applicationId, { reason: reason.trim(), locale: coursePlanLocale(language) }), (created) => fill(copy.composed, { version: created.version ?? 1 }), () => setForm('compose', null))
  }

  function regenerate() {
    const reason = forms.regenerate?.reason ?? ''
    return act('regenerate', () => regenerateRplCoursePlan(draft.public_id, { lock_version: draft.lock_version, reason: reason.trim(), locale: coursePlanLocale(language) }), (created) => fill(copy.regenerated, { version: created.version ?? '' }), () => setForm('regenerate', null))
  }

  function amend() {
    const reason = forms.amend?.reason ?? ''
    return act('amend', () => amendRplCoursePlan(approved.public_id, { lock_version: approved.lock_version, reason: reason.trim() }), (created) => fill(copy.amended, { version: created.version ?? '' }), () => setForm('amend', null))
  }

  function discard() {
    const reason = forms.discard?.reason ?? ''
    return act('discard', () => discardRplCoursePlan(draft.public_id, { lock_version: draft.lock_version, reason: reason.trim() }), () => copy.discarded, () => setForm('discard', null))
  }

  function addItem() {
    const { programId, reason } = forms.add || {}
    return act('add', () => addRplCoursePlanItem(draft.public_id, { lock_version: draft.lock_version, program_id: Number(programId), reason: String(reason ?? '').trim() }), () => copy.added, () => setForm('add', null))
  }

  function removeItem() {
    const { itemId, reason } = forms.remove || {}
    return act('remove', () => removeRplCoursePlanItem(draft.public_id, itemId, { lock_version: draft.lock_version, reason: String(reason ?? '').trim() }), () => copy.removed, () => setForm('remove', null))
  }

  function approve() {
    const payload = { lock_version: draft.lock_version }
    if (draft.below_minimum) payload.below_minimum_reason = forms.belowMinimumReason.trim()
    return act('approve', () => approveRplCoursePlan(draft.public_id, payload), (done) => fill(copy.approved, { version: done.version ?? draft.version }), () => setForm('belowMinimumReason', ''))
  }

  async function viewVersion(publicId) {
    if (versionView.publicId === publicId) {
      setVersionView({ publicId: null, loading: false, plan: null, error: '' })
      return
    }
    setVersionView({ publicId, loading: true, plan: null, error: '' })
    try {
      const loaded = unwrapApiData(await fetchRplCoursePlanVersion(publicId))
      setVersionView({ publicId, loading: false, plan: loaded, error: '' })
    } catch (error) {
      setVersionView({ publicId, loading: false, plan: null, error: readApiError(error, copy.loadError, language) })
    }
  }

  /*
   * The entry quiz result, read from the quiz itself (P6: leads_to_certificate_review
   * is gone from the staff overview, since both results now lead to the final exam
   * and the level certificate).
   */
  function renderQuizBanner() {
    const quiz = overview?.entry_quiz
    const level = generation.target_level || plan?.target_level || null
    const values = { percent: formatQuizPercent(quiz?.percent) ?? '—', mark: quiz?.pass_mark_applied ?? '—', level: localize(level?.name, language) || level?.code || '—' }
    if (quiz?.result === 'passed') return <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm leading-6 text-green-900">{fill(copy.quizPassed, values)}</p>
    if (quiz?.result === 'failed') return <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">{fill(copy.quizFailed, values)}</p>
    return null
  }

  function renderActions() {
    const actions = []
    const composeButton = composeAllowed && !forms.compose ? <Button key="compose" variant={composeFirst ? 'primary' : 'outline'} onClick={() => setForm('compose', { reason: '' })} disabled={Boolean(busy)}><PenLine size={17} />{copy.compose}</Button> : null
    if (composeFirst && composeButton) actions.push(composeButton)
    if (can('generate')) actions.push(<Button key="generate" variant={composeFirst ? 'outline' : 'primary'} onClick={generate} disabled={Boolean(busy) || runInFlight}>{busy === 'generate' ? <LoaderCircle className="animate-spin" size={17} /> : <Sparkles size={17} />}{copy.generate}</Button>)
    if (!composeFirst && composeButton) actions.push(composeButton)
    if (can('regenerate') && draft && !forms.regenerate) actions.push(<Button key="regenerate" variant="outline" onClick={() => setForm('regenerate', { reason: '' })} disabled={Boolean(busy)}><RefreshCw size={17} />{copy.regenerate}</Button>)
    if (can('amend') && approved && !forms.amend) actions.push(<Button key="amend" variant="outline" onClick={() => setForm('amend', { reason: '' })} disabled={Boolean(busy)}><FilePenLine size={17} />{copy.amend}</Button>)
    if (can('discard') && draft && !forms.discard) actions.push(<Button key="discard" variant="ghost" onClick={() => setForm('discard', { reason: '' })} disabled={Boolean(busy)}><Ban size={17} />{copy.discard}</Button>)

    return (
      <div className="space-y-3">
        {actions.length ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        {can('generate') ? <p className="text-xs leading-5 text-[var(--color-text-muted)]">{copy.generateHint}</p> : null}
        {forms.compose ? (
          <InlineForm title={copy.composeTitle} text={copy.composeHint} copy={copy} submitLabel={copy.composeSubmit} busy={busy === 'compose'} canSubmit={isCoursePlanReasonValid(forms.compose.reason)} onSubmit={compose} onCancel={() => setForm('compose', null)}>
            <ReasonField id="course-plan-compose-reason" copy={copy} value={forms.compose.reason} onChange={(reason) => setForm('compose', { reason })} disabled={busy === 'compose'} />
          </InlineForm>
        ) : composeAllowed ? <p className="text-xs leading-5 text-[var(--color-text-muted)]">{copy.composeHint}</p> : null}
        {busy === 'generate' || busy === 'regenerate' ? <p role="status" className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={16} />{copy.generating}</p> : null}
        {forms.regenerate && draft ? (
          <InlineForm title={copy.regenerate} text={fill(copy.regenerateConfirm, { next: Number(draft.version) + 1, version: draft.version })} copy={copy} submitLabel={copy.regenerateSubmit} busy={busy === 'regenerate'} canSubmit={isCoursePlanReasonValid(forms.regenerate.reason)} onSubmit={regenerate} onCancel={() => setForm('regenerate', null)}>
            <ReasonField id="course-plan-regenerate-reason" copy={copy} value={forms.regenerate.reason} onChange={(reason) => setForm('regenerate', { reason })} disabled={busy === 'regenerate'} />
          </InlineForm>
        ) : null}
        {forms.amend && approved ? (
          <InlineForm title={copy.amend} text={fill(copy.amendHint, { next: Number(approved.version) + 1, version: approved.version })} copy={copy} submitLabel={copy.amendSubmit} busy={busy === 'amend'} canSubmit={isCoursePlanReasonValid(forms.amend.reason)} onSubmit={amend} onCancel={() => setForm('amend', null)}>
            <ReasonField id="course-plan-amend-reason" copy={copy} value={forms.amend.reason} onChange={(reason) => setForm('amend', { reason })} disabled={busy === 'amend'} />
          </InlineForm>
        ) : null}
        {forms.discard && draft ? (
          <InlineForm title={copy.discard} text={amendment ? fill(copy.discardAmendmentHint, { version: approved?.version ?? '' }) : copy.discardHint} copy={copy} submitLabel={copy.discardSubmit} submitVariant="danger" busy={busy === 'discard'} canSubmit={isCoursePlanReasonValid(forms.discard.reason)} onSubmit={discard} onCancel={() => setForm('discard', null)}>
            <ReasonField id="course-plan-discard-reason" copy={copy} value={forms.discard.reason} onChange={(reason) => setForm('discard', { reason })} disabled={busy === 'discard'} />
          </InlineForm>
        ) : null}
      </div>
    )
  }

  function renderCounter(current) {
    const counts = planCounts(current)
    const levelName = professionalLevelName(current?.target_level, language) || '—'
    const showChanged = current === draft && !amendment && current?.entry_quiz_result === 'passed' && generation.live_minimum != null && Number(generation.live_minimum) !== Number(current?.minimum_required)
    const topUps = topUpsWithoutMinimum(current)
    const extraTopUps = topUpsBeyondMinimum(current)
    // No minimum: a plan made under P5's F1, or one whose frozen minimum is 0 (gaps only).
    const noMinimum = current?.minimum_applies === false || (current?.minimum_required != null && Number(current.minimum_required) === 0)
    // The "hybrid" rule after a failed quiz (owner, 15 Oct 2026): gaps first, then top-ups to this minimum.
    const failedHybrid = !noMinimum && current?.entry_quiz_result === 'failed' && current?.minimum_required != null
    // A closed plan offers nothing for sale (UI-17): it counts the courses completed instead.
    const saleCount = current?.status === 'closed' ? fill(copy.completedCount, { count: counts.completed }) : fill(copy.buyableCount, { count: counts.buyable })
    return (
      <div className="space-y-3">
        <p className="rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm font-semibold">
          {noMinimum
            ? <>{copy.noMinimum}{' · '}{saleCount}</>
            : <>{fill(copy.counter, { count: counts.active, minimum: current?.minimum_required ?? '—', level: levelName })}{' · '}{saleCount}</>}
        </p>
        {failedHybrid ? <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-900">{fill(copy.failedMinimum, { minimum: current.minimum_required })}</p> : null}
        {current?.below_minimum ? (
          <div role="note" className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            <p className="flex items-center gap-2 font-semibold"><TriangleAlert size={16} aria-hidden="true" />{fill(copy.belowMinimum, { count: counts.active, minimum: current.minimum_required })}</p>
            {current.below_minimum_cause ? <p>{copy.below[current.below_minimum_cause] || humanizeCode(current.below_minimum_cause)}</p> : null}
            {current.model_shortfall?.reason ? <p dir="auto">{fill(copy.shortfallReason, { reason: current.model_shortfall.reason })}</p> : null}
            {current === draft ? <p>{copy.shortfallNeverBlocks}</p> : null}
          </div>
        ) : null}
        {showChanged ? <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-900">{fill(copy.minimumChanged, { minimum: current.minimum_required, current: generation.live_minimum })}</p> : null}
        {/* F1 and a ZERO minimum: a top-up has no place on a gap-closing plan; staff decide, the screen says so. */}
        {topUps ? <p role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">{fill(copy.topUpWithoutMinimum, { count: topUps })}</p> : null}
        {/* The hybrid rule: a top-up the plan does not need to reach its minimum has no place on it; staff decide. */}
        {!topUps && extraTopUps ? <p role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">{fill(copy.topUpBeyondMinimum, { count: extraTopUps, minimum: current.minimum_required })}</p> : null}
      </div>
    )
  }

  function renderAdd() {
    if (!editable) return null
    if (!forms.add) return <div><Button variant="outline" onClick={openAdd} disabled={Boolean(busy)}><Plus size={17} />{copy.add}</Button></div>
    const activeIds = new Set(activePlanItems(draft).map((item) => Number(item?.program?.id)))
    const rows = catalogue.rows.filter((row) => row && row.in_plan !== true && !activeIds.has(Number(row.program_id)))
    const programs = rows.map((row) => ({ id: row.program_id, official_code: row.official_code, title: row.title }))
    const chosen = rows.find((row) => String(row.program_id) === String(forms.add.programId))
    const extra = chosen ? <Badge variant={chosen.buyable ? 'success' : 'warning'}>{chosen.buyable ? copy.buyable : copy.notBuyable}</Badge> : null

    return (
      <InlineForm title={copy.addTitle} text={copy.addHint} copy={copy} submitLabel={copy.addSubmit} busy={busy === 'add'} canSubmit={Boolean(forms.add.programId) && isCoursePlanReasonValid(forms.add.reason)} onSubmit={addItem} onCancel={() => setForm('add', null)}>
        {catalogue.status === 'loading' ? <p className="flex items-center gap-2 text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={15} />{copy.catalogueLoading}</p> : null}
        {catalogue.status === 'error' ? <div className="space-y-2"><p className="whitespace-pre-line text-[var(--color-danger)]">{catalogue.error}</p><Button size="sm" variant="outline" onClick={loadCatalogue}>{copy.retry}</Button></div> : null}
        {catalogue.status === 'ready' || catalogue.status === 'stale' ? (programs.length || forms.add.programId ? <CoursePicker programs={programs} value={forms.add.programId} onChange={(programId) => setForm('add', { ...forms.add, programId })} extra={extra} /> : <p className="text-[var(--color-text-muted)]">{copy.catalogueEmpty}</p>) : null}
        <ReasonField id="course-plan-add-reason" copy={copy} value={forms.add.reason} onChange={(reason) => setForm('add', { ...forms.add, reason })} disabled={busy === 'add'} />
      </InlineForm>
    )
  }

  function renderApprove() {
    if (!draft || !can('approve')) return null
    const counts = planCounts(draft)
    const notBuyable = activePlanItems(draft).filter((item) => item?.program?.buyable !== true && !['purchased', 'completed'].includes(item?.status)).length
    // A governance hold is a warning here, never a block (P6): the plan may still be approved.
    const held = heldPlanItems(draft)
    const empty = counts.active === 0
    const needsReason = Boolean(draft.below_minimum)
    const levelName = professionalLevelName(draft.target_level, language) || '—'
    const ready = !empty && (!needsReason || isCoursePlanReasonValid(forms.belowMinimumReason))

    return (
      <section aria-label={fill(copy.approveTitle, { version: draft.version })} className="space-y-3 rounded-2xl border border-green-200 bg-green-50/60 p-4 text-sm">
        <strong className="block">{fill(copy.approveTitle, { version: draft.version })}</strong>
        {empty ? <p className="text-amber-900">{copy.emptyPlan}</p> : <p className="leading-6">{fill(copy.approveSummary, { count: counts.active, buyable: counts.buyable })}</p>}
        {!empty && notBuyable ? <p className="leading-6 text-amber-900">{fill(copy.approveNotBuyable, { count: notBuyable })}</p> : null}
        {!empty && held.length ? <p role="note" className="leading-6 text-amber-900">{fill(copy.approveHeld, { count: held.length, codes: held.map((item) => item?.program?.official_code || item?.program?.id).join(' · ') })}</p> : null}
        {needsReason && !empty ? (
          <>
            <p className="leading-6 text-amber-900">{fill(copy.approveBelow, { count: counts.active, level: levelName, minimum: draft.minimum_required })}</p>
            <ReasonField id="course-plan-below-minimum-reason" copy={copy} label={copy.belowMinimumReason} hint={copy.belowMinimumReasonHint} value={forms.belowMinimumReason} onChange={(value) => setForm('belowMinimumReason', value)} disabled={busy === 'approve'} />
          </>
        ) : null}
        <div className="flex justify-end"><Button onClick={approve} disabled={Boolean(busy) || !ready}>{busy === 'approve' ? <LoaderCircle className="animate-spin" size={17} /> : <ListChecks size={17} />}{copy.approveSubmit}</Button></div>
      </section>
    )
  }

  function renderProvenance(current) {
    const snapshot = current?.minimums_setting_snapshot
    const by = current?.model ? fill(copy.generatedBy, { model: current.model, at: formatLocalizedDateTime(current.created_at, language) }) : fill(copy.createdBy, { name: personName(current?.created_by, copy), at: formatLocalizedDateTime(current?.created_at, language) })
    const report = current?.generation_report && typeof current.generation_report === 'object' ? current.generation_report : {}
    const manual = current?.source === 'manual'
    const aiProvenance = report.ai_provenance || current?.ai_provenance || null
    return (
      <section aria-label={copy.provenance} className="space-y-1 border-t border-[var(--color-border)] pt-3 text-xs leading-5 text-[var(--color-text-muted)]">
        <p>{by}</p>
        {manual ? <p data-composed-by-hand="true" dir="auto">{fill(copy.composedBy, { name: personName(current.created_by, copy), reason: report.reason || current.creation_reason || '—' })}</p> : null}
        {!manual && current?.model && aiProvenance ? <AiProvenanceNote provenance={aiProvenance} language={language} /> : null}
        {current?.model && current?.created_by ? <p>{fill(copy.createdBy, { name: personName(current.created_by, copy), at: formatLocalizedDateTime(current.created_at, language) })}</p> : null}
        {current?.approved_at ? <p>{fill(copy.approvedBy, { name: personName(current.approved_by, copy), at: formatLocalizedDateTime(current.approved_at, language) })}</p> : null}
        {current?.source !== 'amendment' && current?.minimum_required != null ? <p>{fill(copy.minimumSent, { minimum: current.minimum_required })}</p> : null}
        {snapshot?.value ? <p>{fill(copy.settingsSnapshot, { value: minimumsText(snapshot.value, language) })}</p> : null}
      </section>
    )
  }

  function renderPlan(current) {
    const items = activePlanItems(current)
    const removed = removedPlanItems(current)
    const isDraft = current === draft
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold">{fill(copy.version, { version: current.version })}</h3>
          <Badge variant={PLAN_STATUS_VARIANT[current.status] || 'neutral'}>{copy.planStatus[current.status] || humanizeCode(current.status)}</Badge>
          {current.source ? <span className="text-xs text-[var(--color-text-muted)]">{copy.planSource[current.source] || humanizeCode(current.source)}</span> : null}
        </div>
        {current.creation_reason ? <p className="text-sm leading-6 text-[var(--color-text-muted)]" dir="auto">{fill(copy.creationReason, { reason: current.creation_reason })}</p> : null}
        {/* The final exam is open only while the case is in it: once the case is completed it is over (UI-17). */}
        {isPlanLearningComplete(current) ? <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold leading-6 text-green-900">{caseStatus === 'completed' ? copy.learningCompleteClosedCase : copy.learningComplete}</p> : null}
        {/* J09-F1: closed by the Experience Confirmation Certificate ("stop"): its courses not bought are no longer sold, and no final exam follows. */}
        {isPlanClosedWithExperienceCertificate(current) ? <p role="status" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm font-semibold leading-6">{copy.closedWithExperienceCertificate}</p> : null}
        {renderCounter(current)}
        {items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                copy={copy}
                language={language}
                competencyNames={competencyNames}
                evidenceTitles={evidenceTitles}
                removable={isDraft && isItemRemovable(item, editable)}
                removeForm={forms.remove}
                busy={busy}
                onOpenRemove={(itemId) => setForm('remove', { itemId, reason: '' })}
                onRemoveChange={(reason) => setForm('remove', { ...forms.remove, reason })}
                onRemoveCancel={() => setForm('remove', null)}
                onRemoveSubmit={removeItem}
              />
            ))}
          </div>
        ) : <p className="text-sm text-amber-900">{copy.emptyPlan}</p>}
        {isDraft ? renderAdd() : null}
        {isDraft ? renderApprove() : null}
        {!isDraft && current.below_minimum_reason ? <p className="text-sm leading-6" dir="auto">{fill(copy.belowMinimumReasonRecorded, { reason: current.below_minimum_reason })}</p> : null}
        {removed.length ? (
          <details className="rounded-2xl border border-[var(--color-border)] p-4 text-sm">
            <summary className="cursor-pointer font-semibold">{copy.removedList} ({removed.length})</summary>
            <ul className="mt-3 space-y-2">
              {removed.map((item) => (
                <li key={item.id} className="rounded-xl bg-[var(--color-surface-muted)] p-3">
                  <span dir="auto" className="font-semibold">{localize(item?.program?.title, language) || item?.program?.official_code}</span>
                  {item?.program?.official_code ? <span className="ms-2 font-mono text-xs text-[var(--color-text-muted)]"><bdi>{item.program.official_code}</bdi></span> : null}
                  <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{fill(copy.removedBy, { name: personName(item.removed_by, copy), at: formatLocalizedDateTime(item.removed_at, language), reason: item.removed_reason || '—' })}</p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {renderProvenance(current)}
      </div>
    )
  }

  function renderHistory() {
    return (
      <details className="rounded-2xl border border-[var(--color-border)] p-4 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold"><History size={16} aria-hidden="true" />{copy.history}</summary>
        {versions.length ? (
          <ul className="mt-3 space-y-2">
            {versions.map((row) => (
              <li key={row.public_id} className="space-y-2 rounded-xl border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{fill(copy.version, { version: row.version })}</strong>
                    <Badge variant={PLAN_STATUS_VARIANT[row.status] || 'neutral'}>{copy.planStatus[row.status] || humanizeCode(row.status)}</Badge>
                    {row.source ? <span className="text-xs text-[var(--color-text-muted)]">{copy.planSource[row.source] || humanizeCode(row.source)}</span> : null}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => viewVersion(row.public_id)}>{versionView.publicId === row.public_id ? copy.hide : copy.view}</Button>
                </div>
                <p className="text-xs leading-5 text-[var(--color-text-muted)]">
                  {fill(copy.createdBy, { name: row.created_by_name || copy.someone, at: formatLocalizedDateTime(row.created_at, language) })}
                  {' · '}{fill(copy.versionCourses, { count: row.active_count ?? 0 })}
                  {/* An amendment copies the frozen minimum and asks Gemini nothing. */}
                  {row.source !== 'amendment' && row.minimum_required != null ? <>{' · '}{fill(copy.minimumSent, { minimum: row.minimum_required })}</> : null}
                  {row.below_minimum ? <>{' · '}{fill(copy.belowMinimum, { count: row.active_count ?? 0, minimum: row.minimum_required ?? '—' })}</> : null}
                </p>
                {versionView.publicId === row.public_id ? (
                  versionView.loading ? <p className="flex items-center gap-2 text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={15} />{copy.versionLoading}</p>
                    : versionView.error ? <p className="whitespace-pre-line text-[var(--color-danger)]">{versionView.error}</p>
                      : versionView.plan ? <ReadOnlyItems plan={versionView.plan} copy={copy} language={language} /> : null
                ) : null}
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-[var(--color-text-muted)]">{copy.historyEmpty}</p>}
      </details>
    )
  }

  function renderBody() {
    if (state.loading) return <p role="status" className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={16} />{copy.loading}</p>
    if (state.error) return <div className="space-y-3"><p className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p><Button variant="outline" size="sm" onClick={() => load()}>{copy.retry}</Button></div>
    if (!overview) return null
    const refusal = generation.refusal
    return (
      <div className="space-y-5">
        {notice.error ? <p role="alert" className="whitespace-pre-line [unicode-bidi:plaintext] rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{notice.error}</p> : null}
        {notice.success ? <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice.success}</p> : null}
        {readOnly ? <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm leading-6">{copy.readOnly}</p> : null}
        {renderQuizBanner()}
        {run?.status === 'queued' || run?.status === 'running' ? <p role="status" data-course-plan-run={run.status} className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950"><LoaderCircle className="animate-spin" size={16} />{run.status === 'queued' ? runCopy.queued : runCopy.running}</p> : null}
        {/* A first proposal or a regeneration: Retry now names the case's waiting run, whichever it is. */}
        <AiRunNotice run={run} language={language} onRetryNow={canManage !== false && retryTargetOf(run) ? retryNow : null} />
        {!plan && refusal && !can('generate') && !(refusal === 'generation_in_progress' && runInFlight) ? <p className="text-sm leading-6 text-[var(--color-text-muted)]">{copy.blocked[refusal] || humanizeCode(refusal)}</p> : null}
        {renderActions()}
        {!plan ? <p className="text-sm text-[var(--color-text-muted)]">{copy.none}</p> : null}
        {amendment ? <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-900">{fill(copy.amendmentHeader, { next: draft.version, version: approved.version })}</p> : null}
        {plan ? renderPlan(plan) : null}
        {amendment ? (
          <details className="rounded-2xl border border-[var(--color-border)] p-4 text-sm">
            <summary className="cursor-pointer font-semibold">{fill(copy.inForceTitle, { version: approved.version })}</summary>
            <div className="mt-3"><ReadOnlyItems plan={approved} copy={copy} language={language} /></div>
          </details>
        ) : null}
        {renderHistory()}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle className="flex items-center gap-2"><ListChecks size={20} aria-hidden="true" />{copy.title}</CardTitle>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.hint}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <AiServiceBanner families={['case_analysis']} language={language} />
        {renderBody()}
      </CardContent>
    </Card>
  )
}
