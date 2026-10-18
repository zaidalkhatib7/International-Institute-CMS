import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, BadgeCheck, ChevronUp, FilterX, RefreshCw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Badge, Button, Card, CardContent, DataTableShell, PageHeader, Select } from '../../../components/ui'
import { readApiError, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { formatLocalizedDateTime } from '../../../utils/localization'
import { getRouteAccess } from '../../../routes/routeAccess'
import { fill } from '../domain/documentScreening'
import { formatQuizPercent } from '../domain/entryQuiz'
import { coursePlanCopy } from '../domain/coursePlan'
import {
  AFTER_QUIZ_PERMISSIONS,
  CHARGE_STATUSES,
  CHARGE_TYPES,
  EXPERIENCE_CERTIFICATE_STATUSES,
  afterQuizCopy,
  chargePaidInLabel,
  chargePriceLine,
  chargeRouteLabel,
  chargeStatusLabel,
  chargeTitle,
  experienceRequestStatus,
  experienceRequestStatusLabel,
  experienceRequestStatusVariant,
  programTitle,
} from '../domain/afterQuiz'
import { fetchRplAfterQuizAttention, fetchRplChargeQueue, fetchRplExperienceCertificateQueue } from '../services/rplService'
import ChargesPanel from '../components/ChargesPanel'
import ExperienceCertificatePanel from '../components/ExperienceCertificatePanel'
import RplPageState from '../components/RplPageState'
import RplStatusBadge from '../components/RplStatusBadge'
import { useAuthorization } from '../../auth/context/useAuthorization'
import useWorkCounts from '../../dashboard/hooks/useWorkCounts'

/*
 * THE STAFF QUEUES AFTER THE ENTRY QUIZ (owner model of 15 Oct 2026, P6; acted on
 * in the row since 18 Oct 2026, PLATFORM-JOURNEY-SPEC §4.5). One page with a mode:
 *
 *   payments                 S1, rpl.payments.reconcile: outside payments to
 *                            confirm, each confirmed or cancelled on its card here
 *                            with the case's own form, payload and stale handling
 *   experience_certificates  S7, rpl.experience_certificates.approve: paid
 *                            certificates, each approved or refused in its row
 *   attention                S17, rpl.applications.view: blocked final exams, held
 *                            level certificates, fees to correct, approved
 *                            experience certificates not issued, paid charges on
 *                            closed cases
 *
 * A case reference links to its case only for a viewer who can open cases (the
 * finance operator cannot, and meets plain text, never Access denied). After an
 * act the shared work counts are read again, so the sidebar badge drops.
 */

const CHARGE_STATUS_VARIANT = { pending: 'warning', paid: 'success', cancelled: 'neutral', refunded: 'neutral' }
const RATE_PERMISSIONS = getRouteAccess('/finance/exchange-rate')

/** A case reference: a link to the case (and the tab of its work) for a viewer who can open cases, plain text otherwise. */
function CaseLink({ application, tab, canOpen, from }) {
  const id = application?.public_id
  const label = application?.case_reference || id || '—'
  if (!id || !canOpen) return <bdi className="font-bold">{label}</bdi>
  return <Link to={`/rpl/applications/${id}${tab ? `?tab=${tab}` : ''}`} state={{ from }} className="font-bold text-[var(--color-primary)] underline-offset-2 hover:underline"><bdi>{label}</bdi></Link>
}

/** The client's name: a link to the client's page with users.view. */
function ClientName({ client, canOpen }) {
  if (!client?.name) return '—'
  if (client.id != null && canOpen) return <Link to={`/users/${client.id}`} className="text-[var(--color-primary)] underline-offset-2 hover:underline"><bdi>{client.name}</bdi></Link>
  return <bdi>{client.name}</bdi>
}

export default function RplAfterQuizQueuePage({ mode = 'payments' }) {
  const location = useLocation()
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const screenLanguage = isArabic ? 'ar' : 'en'
  const copy = afterQuizCopy(screenLanguage)
  const queue = copy.queue
  const page = queue[mode] || queue.payments
  const { canAccess, hasPermission } = useAuthorization()
  const counts = useWorkCounts()
  const defaultFilters = mode === 'payments' ? { status: 'pending', type: '' } : { status: '' }
  const [filters, setFilters] = useState(() => defaultFilters)
  // The waiting-specific empty sentence holds only for the default filter (waiting to confirm, awaiting approval).
  const filtered = mode !== 'attention' && Object.keys(defaultFilters).some((key) => (filters[key] || '') !== defaultFilters[key])
  const clearFilters = () => { setDone(null); setFilters(defaultFilters) }
  const reviewRef = useRef(null)
  const [state, setState] = useState({ loading: mode !== 'payments', error: '', rows: [], attention: null })
  const [expanded, setExpanded] = useState(null)
  const [paymentsVersion, setPaymentsVersion] = useState(0)
  /*
   * The sentence of the last act in a row (walk of 18 Oct 2026): approving or
   * refusing takes the row off the default list, which unmounts its panel and
   * the panel's own sentence, so the page keeps it above the table.
   */
  const [done, setDone] = useState(null)

  const canOpenCases = canAccess(getRouteAccess('/rpl/applications'))
  const canOpenClients = hasPermission('users.view')
  const from = { pathname: location.pathname, search: location.search, label: page.title }

  const load = useCallback(async () => {
    if (mode === 'payments') {
      setPaymentsVersion((current) => current + 1)
      return
    }
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      if (mode === 'attention') {
        const data = unwrapApiData(await fetchRplAfterQuizAttention()) || {}
        setState({ loading: false, error: '', rows: [], attention: data })
        return
      }
      const response = await fetchRplExperienceCertificateQueue(filters.status ? { status: filters.status } : {})
      setState({ loading: false, error: '', rows: unwrapCollection(response), attention: null })
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.common.loadError, screenLanguage) }))
    }
  }, [copy.common.loadError, filters.status, mode, screenLanguage])

  useEffect(() => {
    if (mode === 'payments') return undefined
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load, mode])

  const chargeLoader = useMemo(() => () => fetchRplChargeQueue({ ...(filters.status ? { status: filters.status } : {}), ...(filters.type ? { type: filters.type } : {}) }), [filters.status, filters.type])

  const at = (value) => (value ? formatLocalizedDateTime(value, screenLanguage) : '—')
  const refreshCounts = () => counts.refresh()

  // Opening a review brings it into view and moves focus to it, so the act is found next to where it was asked for.
  useEffect(() => {
    if (!expanded) return
    const panel = reviewRef.current
    panel?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
    panel?.focus?.({ preventScroll: true })
  }, [expanded])

  const chargeColumns = [
    { key: 'case', label: queue.case, render: (row) => <CaseLink application={row.application} tab="payments" canOpen={canOpenCases} from={from} /> },
    { key: 'client', label: queue.client, render: (row) => <ClientName client={row.client} canOpen={canOpenClients} /> },
    { key: 'type', label: queue.type, render: (row) => chargeTitle(row, screenLanguage) },
    { key: 'amount', label: queue.amount, render: (row) => <bdi>{chargePriceLine(row, screenLanguage)}</bdi> },
    { key: 'paidIn', label: queue.paidIn, render: (row) => chargePaidInLabel(row, screenLanguage) },
    { key: 'route', label: queue.route, render: (row) => chargeRouteLabel(row, screenLanguage) },
    { key: 'status', label: queue.status, render: (row) => <Badge variant={CHARGE_STATUS_VARIANT[row.status] || 'neutral'}>{chargeStatusLabel(row.status, screenLanguage)}</Badge> },
  ]

  const canApprove = hasPermission(AFTER_QUIZ_PERMISSIONS.approve)
  const certificateColumns = [
    { key: 'case', label: queue.case, render: (row) => <div><CaseLink application={row.application} tab="payments" canOpen={canOpenCases} from={from} />{row.application?.status ? <div className="mt-1"><RplStatusBadge status={row.application.status} language={screenLanguage} /></div> : null}</div> },
    { key: 'client', label: queue.client, render: (row) => <ClientName client={row.client} canOpen={canOpenClients} /> },
    // A revoked certificate stays an "issued" request: the certificate's own status decides, so it never lists as Issued (review of the fixes, 17 Oct 2026).
    { key: 'status', label: queue.status, render: (row) => (experienceRequestStatus(row) ? <Badge variant={experienceRequestStatusVariant(row)}>{experienceRequestStatusLabel(row, screenLanguage)}</Badge> : '—') },
    { key: 'choice', label: queue.choice, render: (row) => copy.experience.choices[row.client_choice] || row.client_choice || '—' },
    { key: 'quiz', label: queue.entryQuiz, render: (row) => (row.entry_quiz ? fill(copy.experience.entryQuiz, { percent: formatQuizPercent(row.entry_quiz.percent) ?? '—', mark: row.entry_quiz.pass_mark_applied ?? '—' }) : '—') },
    { key: 'charge', label: queue.charge, render: (row) => (row.charge ? <bdi>{`${chargePriceLine(row.charge, screenLanguage)} · ${chargeStatusLabel(row.charge.status, screenLanguage)}`}</bdi> : '—') },
    {
      key: 'action',
      label: queue.action,
      render: (row) => (canApprove && row.status === 'requested' && row.application?.public_id
        ? <Button size="sm" variant={expanded === row.public_id ? 'outline' : 'primary'} aria-expanded={expanded === row.public_id} aria-controls={`review-${row.public_id}`} onClick={() => setExpanded((current) => (current === row.public_id ? null : row.public_id))}>{expanded === row.public_id ? <><ChevronUp size={15} aria-hidden="true" />{queue.hideReview}</> : <><BadgeCheck size={15} aria-hidden="true" />{queue.reviewApprove}</>}</Button>
        : <span className="text-sm text-[var(--color-text-muted)]">{at(row.created_at)}</span>),
    },
  ]

  function rateLink() {
    if (!canAccess(RATE_PERMISSIONS)) return null
    const href = canAccess(getRouteAccess('/finance')) ? '/finance?tab=exchange_rate' : '/finance/exchange-rate'
    return <Link to={href} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"><ArrowLeftRight size={16} aria-hidden="true" />{queue.exchangeRate}</Link>
  }

  function renderFilters() {
    if (mode === 'attention') return null
    return (
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <Select label={queue.status} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            {mode === 'payments' ? (
              <>
                <option value="">{queue.all}</option>
                {CHARGE_STATUSES.map((status) => <option key={status} value={status}>{chargeStatusLabel(status, screenLanguage)}</option>)}
              </>
            ) : (
              <>
                <option value="">{queue.awaitingApproval}</option>
                {EXPERIENCE_CERTIFICATE_STATUSES.map((status) => <option key={status} value={status}>{copy.experience.statuses[status]}</option>)}
              </>
            )}
          </Select>
          {mode === 'payments' ? (
            <Select label={queue.type} value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="">{queue.all}</option>
              {CHARGE_TYPES.map((type) => <option key={type} value={type}>{copy.chargeTypes[type]}</option>)}
            </Select>
          ) : null}
          {filtered ? <div className="sm:col-span-2"><Button size="sm" variant="outline" onClick={clearFilters}><FilterX size={15} aria-hidden="true" />{queue.clearFilter}</Button></div> : null}
        </CardContent>
      </Card>
    )
  }

  function renderPayments() {
    return (
      <ChargesPanel
        key={`${filters.status}|${filters.type}|${paymentsVersion}`}
        loader={chargeLoader}
        showCase
        renderCase={(charge) => <><CaseLink application={charge.application} tab="payments" canOpen={canOpenCases} from={from} /><span aria-hidden="true">·</span><ClientName client={charge.client} canOpen={canOpenClients} /></>}
        title={filters.status ? chargeStatusLabel(filters.status, screenLanguage) : queue.all}
        hint={null}
        emptyText={filtered ? queue.emptyFiltered : page.empty}
        language={screenLanguage}
        canReconcile={hasPermission(AFTER_QUIZ_PERMISSIONS.reconcile)}
        canRefund={hasPermission(AFTER_QUIZ_PERMISSIONS.refund)}
        onChanged={refreshCounts}
      />
    )
  }

  /** After an approval or a refusal in a row: the page keeps the sentence, closes the review and reads the list and the counts again. */
  function certificateChanged(row, change) {
    const message = change?.message
    setDone(message ? { reference: row.application?.case_reference || row.public_id, message } : null)
    setExpanded(null)
    load()
    refreshCounts()
  }

  function renderCertificates() {
    // A filter that finds nothing says so; "Clear filter" sits with the filters.
    const emptyText = filtered ? queue.emptyFiltered : page.empty
    // The page header already carries the description; the table does not repeat it.
    const title = filters.status ? copy.experience.statuses[filters.status] || page.title : queue.awaitingApproval
    // The reference is isolated so a Latin reference never turns the Arabic sentence around it.
    const doneNotice = done ? <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700"><bdi className="font-semibold">{done.reference}</bdi>{queue.doneSeparator}{done.message}</p> : null
    if (!state.rows.length) return <div className="space-y-4">{doneNotice}<DataTableShell title={title} columns={certificateColumns} rows={[]} emptyText={emptyText} /></div>
    return (
      <div className="space-y-4">
        {doneNotice}
        <DataTableShell title={title} columns={certificateColumns} rows={state.rows} emptyText={emptyText} />
        {state.rows.filter((row) => row.public_id === expanded).map((row) => (
          <section key={row.public_id} id={`review-${row.public_id}`} ref={reviewRef} tabIndex={-1} aria-label={fill(queue.reviewOf, { reference: row.application?.case_reference || row.public_id })} className="scroll-mt-24 space-y-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
            <p className="text-sm font-semibold"><CaseLink application={row.application} tab="payments" canOpen={canOpenCases} from={from} /> · <ClientName client={row.client} canOpen={canOpenClients} /></p>
            <ExperienceCertificatePanel applicationId={row.application.public_id} language={screenLanguage} canApprove={canApprove} onChanged={(change) => certificateChanged(row, change)} />
          </section>
        ))}
      </div>
    )
  }

  function renderAttention() {
    const attention = state.attention || {}
    const planText = coursePlanCopy(screenLanguage)
    const list = (key) => (Array.isArray(attention[key]) ? attention[key] : [])
    const blocked = list('final_exam_blocked')
    const held = list('level_certificates_held')
    const feeUnusable = list('level_certificates_fee_unusable')
    const notIssued = list('experience_certificates_not_issued')
    const paid = list('paid_charges_on_closed_cases')
    const canEditPrograms = hasPermission('programs.manage')
    const canEditFees = hasPermission('rpl.settings.manage')
    const blockedColumns = [
      { key: 'case', label: queue.case, render: (row) => <CaseLink application={row.application} tab="final_exam" canOpen={canOpenCases} from={from} /> },
      {
        key: 'program',
        label: queue.program,
        render: (row) => {
          if (!row.program) return '—'
          const title = programTitle(row.program, screenLanguage)
          if (!canEditPrograms) return title
          return <Link to={row.program.id != null ? `/programs/edit?id=${row.program.id}` : '/programs'} className="text-[var(--color-primary)] underline-offset-2 hover:underline">{title}</Link>
        },
      },
      { key: 'reason', label: queue.reason, render: (row) => fill(copy.finalExam.blocked[row.blocked_reason] || row.blocked_reason || '—', { course: row.program?.official_code || programTitle(row.program, screenLanguage) }) },
    ]
    const heldColumns = [
      { key: 'case', label: queue.case, render: (row) => <CaseLink application={row.application} tab="final_exam" canOpen={canOpenCases} from={from} /> },
      {
        key: 'holds',
        label: queue.holds,
        render: (row) => {
          const holds = Array.isArray(row.holds) ? row.holds : []
          if (!holds.length) return '—'
          return <ul className="space-y-1 text-sm">{holds.map((hold, index) => <li key={hold?.hold_id ?? index}><bdi>{typeof hold === 'object' ? fill(copy.finalExam.level.hold, { id: hold.hold_id ?? '—', program: hold.program_code || '—', version: hold.package_version || '—' }) : planText.holdLabels[hold] || String(hold)}</bdi></li>)}</ul>
        },
      },
    ]
    // The pass waits in the final exam until the Fees tab's fee is in US dollars (or 0); a fee in another currency is never converted.
    const feeUnusableColumns = [
      { key: 'case', label: queue.case, render: (row) => <CaseLink application={row.application} tab="final_exam" canOpen={canOpenCases} from={from} /> },
      { key: 'reason', label: queue.reason, render: () => <span className="text-sm leading-6">{copy.finalExam.level.feeUnusable}{canEditFees ? <> <Link to="/rpl/configuration?tab=fees" className="font-semibold text-[var(--color-primary)] underline underline-offset-2">{queue.feeSettings}</Link></> : null}</span> },
    ]
    const notIssuedColumns = [
      { key: 'case', label: queue.case, render: (row) => <CaseLink application={row.application} tab="payments" canOpen={canOpenCases} from={from} /> },
      { key: 'approved', label: queue.attention.approvedAt, render: (row) => <span className="text-sm text-[var(--color-text-muted)]">{at(row.approved_at)}</span> },
    ]
    const paidColumns = chargeColumns.map((column) => (column.key === 'case' ? { ...column, render: (row) => <CaseLink application={row.application} tab="payments" canOpen={canOpenCases} from={from} /> } : column))
    /*
     * Only the lists that hold something are drawn (owner, 18 Oct 2026: less
     * clutter); the empty ones are named on one quiet line, and a page with
     * nothing at all says so once.
     */
    const lists = [
      { key: 'blocked', title: queue.attention.blocked, columns: blockedColumns, rows: blocked },
      { key: 'held', title: queue.attention.held, columns: heldColumns, rows: held },
      { key: 'feeUnusable', title: queue.attention.feeUnusable, columns: feeUnusableColumns, rows: feeUnusable },
      { key: 'notIssued', title: queue.attention.notIssued, description: queue.attention.notIssuedHint, columns: notIssuedColumns, rows: notIssued.map((row) => ({ ...row, id: row.certificate_public_id })) },
      { key: 'paidClosed', title: queue.attention.paidClosed, columns: paidColumns, rows: paid },
    ]
    const filled = lists.filter((entry) => entry.rows.length)
    const empty = lists.filter((entry) => !entry.rows.length)
    if (!filled.length) return <p role="status" className="rounded-2xl border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">{queue.attention.allEmpty}</p>
    return (
      <div className="space-y-6">
        {filled.map((entry) => <DataTableShell key={entry.key} title={entry.title} description={entry.description} columns={entry.columns} rows={entry.rows} emptyText={queue.attention.empty} />)}
        {empty.length ? <p className="text-sm text-[var(--color-text-muted)]">{fill(queue.attention.noneIn, { lists: empty.map((entry) => entry.title).join(isArabic ? '، ' : ', ') })}</p> : null}
      </div>
    )
  }

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader
        eyebrow={queue.eyebrow}
        title={page.title}
        description={page.description}
        actions={<>{mode === 'payments' ? rateLink() : null}<Button variant="outline" onClick={() => { load(); refreshCounts() }} disabled={state.loading}><RefreshCw size={17} className={state.loading ? 'animate-spin' : ''} />{queue.refresh}</Button></>}
      />
      {renderFilters()}
      {mode === 'payments' ? renderPayments() : (
        <RplPageState loading={state.loading} error={state.error} onRetry={load} language={screenLanguage}>
          {mode === 'attention' ? renderAttention() : renderCertificates()}
        </RplPageState>
      )}
    </section>
  )
}
