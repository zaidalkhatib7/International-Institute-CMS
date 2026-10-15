import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, CardContent, DataTableShell, PageHeader, Select } from '../../../components/ui'
import { readApiError, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { formatLocalizedDateTime } from '../../../utils/localization'
import { fill } from '../domain/documentScreening'
import { formatQuizPercent } from '../domain/entryQuiz'
import { coursePlanCopy } from '../domain/coursePlan'
import {
  CHARGE_STATUSES,
  CHARGE_TYPES,
  EXPERIENCE_CERTIFICATE_STATUSES,
  afterQuizCopy,
  chargeStatusLabel,
  chargeTitle,
  formatChargeAmount,
  programTitle,
} from '../domain/afterQuiz'
import { fetchRplAfterQuizAttention, fetchRplChargeQueue, fetchRplExperienceCertificateQueue } from '../services/rplService'
import RplPageState from '../components/RplPageState'
import RplStatusBadge from '../components/RplStatusBadge'

/*
 * THE STAFF QUEUES AFTER THE ENTRY QUIZ (owner model of 15 Oct 2026, P6). One
 * page with a mode, the RplGovernancePage pattern:
 *
 *   payments                 S1, rpl.payments.reconcile: outside payments to confirm
 *   experience_certificates  S7, rpl.experience_certificates.approve: paid
 *                            certificates waiting for one approval
 *   attention                S17, rpl.applications.view: blocked final exams,
 *                            held level certificates, passes waiting for an
 *                            unusable certification fee to be corrected (O2),
 *                            paid charges on closed cases
 *
 * Every act happens on the case (its panels), so each row links to it. The
 * route access in routeAccess.js keeps each queue to its permission, and the
 * server refuses anyone else anyway.
 */

const CHARGE_STATUS_VARIANT = { pending: 'warning', paid: 'success', cancelled: 'neutral', refunded: 'neutral' }

function CaseLink({ application }) {
  const id = application?.public_id
  const label = application?.case_reference || id || '—'
  if (!id) return <span>{label}</span>
  return <Link to={`/rpl/applications/${id}`} className="font-bold text-[var(--color-primary)] underline-offset-2 hover:underline"><bdi>{label}</bdi></Link>
}

export default function RplAfterQuizQueuePage({ mode = 'payments' }) {
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const screenLanguage = isArabic ? 'ar' : 'en'
  const copy = afterQuizCopy(screenLanguage)
  const queue = copy.queue
  const page = queue[mode] || queue.payments
  const [filters, setFilters] = useState(() => (mode === 'payments' ? { status: 'pending', type: '' } : { status: '' }))
  const [state, setState] = useState({ loading: true, error: '', rows: [], attention: null })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      if (mode === 'attention') {
        const data = unwrapApiData(await fetchRplAfterQuizAttention()) || {}
        setState({ loading: false, error: '', rows: [], attention: data })
        return
      }
      const response = mode === 'experience_certificates'
        ? await fetchRplExperienceCertificateQueue(filters.status ? { status: filters.status } : {})
        : await fetchRplChargeQueue({ ...(filters.status ? { status: filters.status } : {}), ...(filters.type ? { type: filters.type } : {}) })
      setState({ loading: false, error: '', rows: unwrapCollection(response), attention: null })
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.common.loadError, screenLanguage) }))
    }
  }, [copy.common.loadError, filters.status, filters.type, mode, screenLanguage])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const at = (value) => (value ? formatLocalizedDateTime(value, screenLanguage) : '—')

  const chargeColumns = [
    { key: 'case', label: queue.case, render: (row) => <CaseLink application={row.application} /> },
    { key: 'client', label: queue.client, render: (row) => row.client?.name || '—' },
    { key: 'type', label: queue.type, render: (row) => chargeTitle(row, screenLanguage) },
    { key: 'amount', label: queue.amount, render: (row) => <bdi>{formatChargeAmount(row.amount, row.currency, screenLanguage)}</bdi> },
    { key: 'route', label: queue.route, render: (row) => copy.routes[row.route] || row.route || '—' },
    { key: 'status', label: queue.status, render: (row) => <Badge variant={CHARGE_STATUS_VARIANT[row.status] || 'neutral'}>{chargeStatusLabel(row.status, screenLanguage)}</Badge> },
    { key: 'requested', label: queue.requested, render: (row) => <span className="text-sm text-[var(--color-text-muted)]">{at(row.requested_at)}{row.payer_reference ? <span className="block"><bdi>{fill(copy.charges.payerReference, { reference: row.payer_reference })}</bdi></span> : null}</span> },
  ]

  const certificateColumns = [
    { key: 'case', label: queue.case, render: (row) => <div><CaseLink application={row.application} />{row.application?.status ? <div className="mt-1"><RplStatusBadge status={row.application.status} language={screenLanguage} /></div> : null}</div> },
    { key: 'client', label: queue.client, render: (row) => row.client?.name || '—' },
    { key: 'status', label: queue.status, render: (row) => copy.experience.statuses[row.status] || row.status || '—' },
    { key: 'choice', label: queue.choice, render: (row) => copy.experience.choices[row.client_choice] || row.client_choice || '—' },
    { key: 'quiz', label: queue.entryQuiz, render: (row) => (row.entry_quiz ? fill(copy.experience.entryQuiz, { percent: formatQuizPercent(row.entry_quiz.percent) ?? '—', mark: row.entry_quiz.pass_mark_applied ?? '—' }) : '—') },
    { key: 'charge', label: queue.charge, render: (row) => (row.charge ? <bdi>{`${formatChargeAmount(row.charge.amount, row.charge.currency, screenLanguage)} · ${chargeStatusLabel(row.charge.status, screenLanguage)}`}</bdi> : '—') },
    { key: 'created', label: queue.requested, render: (row) => <span className="text-sm text-[var(--color-text-muted)]">{at(row.created_at)}</span> },
  ]

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
        </CardContent>
      </Card>
    )
  }

  function renderAttention() {
    const attention = state.attention || {}
    const planText = coursePlanCopy(screenLanguage)
    const blocked = Array.isArray(attention.final_exam_blocked) ? attention.final_exam_blocked : []
    const held = Array.isArray(attention.level_certificates_held) ? attention.level_certificates_held : []
    const feeUnusable = Array.isArray(attention.level_certificates_fee_unusable) ? attention.level_certificates_fee_unusable : []
    const paid = Array.isArray(attention.paid_charges_on_closed_cases) ? attention.paid_charges_on_closed_cases : []
    const blockedColumns = [
      { key: 'case', label: queue.case, render: (row) => <CaseLink application={row.application} /> },
      { key: 'program', label: queue.program, render: (row) => (row.program ? programTitle(row.program, screenLanguage) : '—') },
      { key: 'reason', label: queue.reason, render: (row) => fill(copy.finalExam.blocked[row.blocked_reason] || row.blocked_reason || '—', { course: row.program?.official_code || programTitle(row.program, screenLanguage) }) },
    ]
    const heldColumns = [
      { key: 'case', label: queue.case, render: (row) => <CaseLink application={row.application} /> },
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
    // O2: the pass waits in the final exam until the Fees tab's fee is in whole II Points (or 0).
    const feeUnusableColumns = [
      { key: 'case', label: queue.case, render: (row) => <CaseLink application={row.application} /> },
      { key: 'reason', label: queue.reason, render: () => <span className="text-sm leading-6">{copy.finalExam.level.feeUnusable}</span> },
    ]
    return (
      <div className="space-y-6">
        <DataTableShell title={queue.attention.blocked} columns={blockedColumns} rows={blocked} emptyText={queue.attention.empty} />
        <DataTableShell title={queue.attention.held} columns={heldColumns} rows={held} emptyText={queue.attention.empty} />
        <DataTableShell title={queue.attention.feeUnusable} columns={feeUnusableColumns} rows={feeUnusable} emptyText={queue.attention.empty} />
        <DataTableShell title={queue.attention.paidClosed} columns={chargeColumns} rows={paid} emptyText={queue.attention.empty} />
      </div>
    )
  }

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader eyebrow="RPL" title={page.title} description={page.description} actions={<Button variant="outline" onClick={load} disabled={state.loading}><RefreshCw size={17} className={state.loading ? 'animate-spin' : ''} />{queue.refresh}</Button>} />
      {renderFilters()}
      <RplPageState loading={state.loading} error={state.error} onRetry={load} language={screenLanguage}>
        {mode === 'attention'
          ? renderAttention()
          : <DataTableShell title={page.title} description={page.description} columns={mode === 'experience_certificates' ? certificateColumns : chargeColumns} rows={state.rows} emptyText={page.empty} />}
      </RplPageState>
    </section>
  )
}
