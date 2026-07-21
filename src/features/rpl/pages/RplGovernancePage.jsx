import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Eye, Gavel, LoaderCircle, RefreshCw, Scale, Search, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, CardTitle, DataTableShell, Input, PageHeader, Select, StatCard, Textarea } from '../../../components/ui'
import { readApiError, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { localize } from '../domain/rpl'
import {
  decideRplAppeal,
  fetchRplAppeals,
  fetchRplCommitteeCases,
  fetchRplQualityReviews,
  fetchRplReferenceData,
  submitRplCommitteeDecision,
  submitRplQualityReview,
} from '../services/rplService'
import RplPageState from '../components/RplPageState'
import RplStatusBadge from '../components/RplStatusBadge'
import { useModalDialog } from '../../../hooks/useModalDialog'
import { formatLocalizedDate, formatLocalizedNumber } from '../../../utils/localization'

const copyByLanguage = {
  ar: {
    committee: { title: 'لجنة الاعتماد', description: 'مراجعة تقارير المقيّمين واتخاذ القرار النهائي مع توثيق الأسباب.', queue: 'ملفات بانتظار اللجنة', action: 'إصدار قرار', saved: 'تم تسجيل قرار اللجنة.' },
    quality: { title: 'ضمان الجودة والمراجعة', description: 'مراجعة مستقلة لاكتمال الإجراء والتزامه بالمعايير قبل اعتماد القرار.', queue: 'طابور مراجعة الجودة', action: 'مراجعة الجودة', saved: 'تم تسجيل مراجعة الجودة.' },
    appeals: { title: 'التظلمات وإعادة النظر', description: 'إدارة طلبات التظلم والتجديد والترقية مع الحفاظ على الأثر التدقيقي.', queue: 'طابور التظلمات', action: 'اتخاذ إجراء', saved: 'تم حفظ قرار التظلم.' },
    search: 'بحث بالملف أو المتقدم...', all: 'جميع الحالات', refresh: 'تحديث', total: 'إجمالي الملفات', pending: 'بانتظار الإجراء', overdue: 'متأخرة', decided: 'مكتملة',
    reference: 'الملف', applicant: 'المتقدم', recommendation: 'التوصية', status: 'الحالة', received: 'تاريخ الاستلام', actions: 'الإجراء', reviewCase: 'مراجعة الملف', empty: 'لا توجد ملفات مطابقة.',
    decision: 'القرار', committeeSelect: 'لجنة الاعتماد', actionSelect: 'إجراء اللجنة', outcome: 'نتيجة القرار', level: 'المستوى النهائي', rationale: 'الأسباب والتعليل', notes: 'ملاحظات المراجعة', approve: 'اعتماد', return: 'إعادة للاستكمال', reject: 'رفض', submit: 'حفظ القرار', close: 'إغلاق', viewCase: 'فتح ملف RPL',
    optionLabels: { submitted: 'تم الإرسال', under_review: 'قيد المراجعة', committee_review: 'مراجعة اللجنة', approved: 'معتمد', returned: 'معاد للاستكمال', rejected: 'مرفوض', upheld: 'تأييد القرار', modified: 'تعديل القرار', remanded: 'إعادة للمراجعة' },
  },
  en: {
    committee: { title: 'Accreditation Committee', description: 'Review assessor reports and issue the final documented decision.', queue: 'Cases awaiting committee', action: 'Issue decision', saved: 'Committee decision recorded.' },
    quality: { title: 'Quality Assurance Review', description: 'Independently verify procedural completeness and standards compliance before the decision is confirmed.', queue: 'Quality review queue', action: 'Quality review', saved: 'Quality review recorded.' },
    appeals: { title: 'Appeals & Reconsideration', description: 'Manage appeals, renewals, and progression requests with a complete audit trail.', queue: 'Appeals queue', action: 'Decide appeal', saved: 'Appeal decision saved.' },
    search: 'Search case or applicant...', all: 'All statuses', refresh: 'Refresh', total: 'Total cases', pending: 'Pending action', overdue: 'Overdue', decided: 'Completed',
    reference: 'Case', applicant: 'Applicant', recommendation: 'Recommendation', status: 'Status', received: 'Received', actions: 'Action', reviewCase: 'Review case', empty: 'No cases match the filters.',
    decision: 'Decision', committeeSelect: 'Accreditation committee', actionSelect: 'Committee action', outcome: 'Decision outcome', level: 'Final level', rationale: 'Rationale and reasons', notes: 'Review notes', approve: 'Approve', return: 'Return for completion', reject: 'Reject', submit: 'Save decision', close: 'Close', viewCase: 'Open RPL case',
    optionLabels: { submitted: 'Submitted', under_review: 'Under review', committee_review: 'Committee review', approved: 'Approved', returned: 'Returned for completion', rejected: 'Rejected', upheld: 'Decision upheld', modified: 'Decision modified', remanded: 'Remanded for review' },
  },
  nl: {
    committee: { title: 'Accreditatiecommissie', description: 'Beoordeel rapporten en neem het definitieve, gemotiveerde besluit.', queue: 'Dossiers voor commissie', action: 'Besluit nemen', saved: 'Commissiebesluit vastgelegd.' },
    quality: { title: 'Kwaliteitsbeoordeling', description: 'Controleer onafhankelijk de procedure en normen voordat het besluit wordt bevestigd.', queue: 'Kwaliteitswachtrij', action: 'Kwaliteitsreview', saved: 'Kwaliteitsreview vastgelegd.' },
    appeals: { title: 'Bezwaar & Heroverweging', description: 'Beheer bezwaar, verlenging en doorgroei met volledige auditgeschiedenis.', queue: 'Bezwaarwachtrij', action: 'Bezwaar beslissen', saved: 'Bezwaarbesluit opgeslagen.' },
    search: 'Zoek dossier of aanvrager...', all: 'Alle statussen', refresh: 'Vernieuwen', total: 'Totaal dossiers', pending: 'In afwachting', overdue: 'Te laat', decided: 'Voltooid',
    reference: 'Dossier', applicant: 'Aanvrager', recommendation: 'Aanbeveling', status: 'Status', received: 'Ontvangen', actions: 'Actie', reviewCase: 'Dossier beoordelen', empty: 'Geen dossiers komen overeen.',
    decision: 'Besluit', committeeSelect: 'Accreditatiecommissie', actionSelect: 'Commissieactie', outcome: 'Uitkomst besluit', level: 'Definitief niveau', rationale: 'Motivering', notes: 'Reviewnotities', approve: 'Goedkeuren', return: 'Terug voor aanvulling', reject: 'Afwijzen', submit: 'Besluit opslaan', close: 'Sluiten', viewCase: 'RPL-dossier openen',
    optionLabels: { submitted: 'Ingediend', under_review: 'In beoordeling', committee_review: 'Commissiebeoordeling', approved: 'Goedgekeurd', returned: 'Teruggestuurd voor aanvulling', rejected: 'Afgewezen', upheld: 'Besluit bevestigd', modified: 'Besluit gewijzigd', remanded: 'Terugverwezen voor beoordeling' },
  },
}

const qualityOptions = ['approved', 'returned', 'rejected']
const appealOptions = ['upheld', 'modified', 'remanded']

function applicationOf(row) {
  return row.assessment?.application || row.application || row.rpl_application || row
}

function applicantOf(row) {
  const application = applicationOf(row)
  return application.applicant || application.user || row.applicant || {}
}

export default function RplGovernancePage({ mode = 'committee' }) {
  const navigate = useNavigate()
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const copy = copyByLanguage[language] || copyByLanguage.en
  const page = copy[mode] || copy.committee
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [state, setState] = useState({ loading: true, error: '', rows: [], levels: [], committees: [], actions: [], outcomes: [] })
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ decision: mode === 'quality' ? 'approved' : 'upheld', committee_id: '', action_id: '', outcome_id: '', decided_level_id: '', rationale: '', notes: '' })
  const [action, setAction] = useState({ busy: false, error: '', success: '' })
  const dialogRef = useModalDialog(Boolean(selected), () => setSelected(null))

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const params = { per_page: 100, ...(filters.search ? { q: filters.search } : {}), ...(filters.status ? { status: filters.status } : {}) }
      const [response, referenceResponse] = await Promise.all([
        mode === 'quality' ? fetchRplQualityReviews(params) : mode === 'appeals' ? fetchRplAppeals(params) : fetchRplCommitteeCases(params),
        fetchRplReferenceData(),
      ])
      const payload = unwrapApiData(response)
      const reference = unwrapApiData(referenceResponse) || {}
      let rows = mode === 'quality' ? unwrapCollection(payload?.pending_reports || []) : unwrapCollection(response)
      if (filters.search) {
        const term = filters.search.toLowerCase()
        rows = rows.filter((row) => {
          const application = applicationOf(row)
          const applicant = applicantOf(row)
          return [application.case_reference, applicant.name, applicant.email].some((value) => String(value || '').toLowerCase().includes(term))
        })
      }
      if (filters.status) rows = rows.filter((row) => (row.status || applicationOf(row).status) === filters.status)
      setState({
        loading: false,
        error: '',
        rows,
        levels: unwrapCollection(reference.pathways || []).flatMap((pathway) => pathway.levels || []),
        committees: unwrapCollection(reference.committees || []),
        actions: unwrapCollection(reference.committee_actions || []),
        outcomes: unwrapCollection(reference.outcomes || []),
      })
    } catch (error) { setState((current) => ({ ...current, loading: false, error: readApiError(error) })) }
  }, [filters.search, filters.status, mode])

  useEffect(() => { const timer = window.setTimeout(load, filters.search ? 250 : 0); return () => window.clearTimeout(timer) }, [filters.search, load])

  const metrics = useMemo(() => ({
    total: state.rows.length,
    pending: state.rows.filter((row) => !['approved', 'completed', 'decided', 'dismissed'].includes(row.status)).length,
    overdue: state.rows.filter((row) => row.due_at && new Date(row.due_at) < new Date()).length,
    decided: state.rows.filter((row) => ['approved', 'completed', 'decided', 'dismissed'].includes(row.status)).length,
  }), [state.rows])

  async function submit() {
    if (!selected) return
    const application = applicationOf(selected)
    setAction({ busy: true, error: '', success: '' })
    try {
      if (mode === 'quality') {
        await submitRplQualityReview(application.public_id || application.id, { report_id: selected.id, decision: form.decision, notes: form.notes || null })
      } else if (mode === 'appeals') {
        await decideRplAppeal(selected.public_id || selected.id, {
          decision: form.decision,
          rationale: form.rationale,
          ...(form.decision === 'modified' && form.action_id ? { action_id: Number(form.action_id) } : {}),
          ...(form.outcome_id ? { outcome_id: Number(form.outcome_id) } : {}),
          ...(form.decided_level_id ? { decided_level_id: Number(form.decided_level_id) } : {}),
        })
      } else {
        await submitRplCommitteeDecision(application.public_id || application.id, {
          committee_id: Number(form.committee_id),
          action_id: Number(form.action_id),
          ...(form.outcome_id ? { outcome_id: Number(form.outcome_id) } : {}),
          ...(form.decided_level_id ? { decided_level_id: Number(form.decided_level_id) } : {}),
          rationale: form.rationale,
        })
      }
      setAction({ busy: false, error: '', success: page.saved }); setSelected(null); load()
    } catch (error) { setAction({ busy: false, error: readApiError(error), success: '' }) }
  }

  const columns = [
    { key: 'reference', label: copy.reference, render: (row) => { const application = applicationOf(row); return <div><span className="font-bold text-[var(--color-primary)]">{application.case_reference || `RPL-${application.id}`}</span><p className="mt-1 text-xs text-[var(--color-text-muted)]">#{application.id}</p></div> } },
    { key: 'applicant', label: copy.applicant, render: (row) => { const applicant = applicantOf(row); return <div><span className="font-semibold">{applicant.name || row.applicant_name || '—'}</span><p className="mt-1 text-xs text-[var(--color-text-muted)]">{applicant.email || '—'}</p></div> } },
    { key: 'recommendation', label: copy.recommendation, render: (row) => localize(row.assessor_report?.recommendation || row.recommendation || row.reason, language) || String(row.recommendation || '—').replaceAll('_', ' ') },
    { key: 'status', label: copy.status, render: (row) => <RplStatusBadge status={row.status || applicationOf(row).status} language={language} /> },
    { key: 'received', label: copy.received, render: (row) => formatLocalizedDate(row.submitted_at || row.created_at, language) },
    { key: 'action', label: copy.actions, render: (row) => <Button size="sm" variant="outline" onClick={() => { setSelected(row); setForm({ decision: mode === 'quality' ? 'approved' : 'upheld', committee_id: '', action_id: '', outcome_id: '', decided_level_id: '', rationale: '', notes: '' }); setAction({ busy: false, error: '', success: '' }) }}><Eye size={16} />{copy.reviewCase}</Button> },
  ]

  const options = mode === 'quality' ? qualityOptions : appealOptions
  const statusOptions = mode === 'quality' ? ['submitted'] : mode === 'committee' ? ['committee_review'] : ['submitted', 'under_review', 'upheld', 'modified', 'remanded']
  const icons = mode === 'quality' ? <ShieldCheck size={21} /> : mode === 'appeals' ? <Scale size={21} /> : <Gavel size={21} />
  const submitDisabled = action.busy
    || (mode === 'committee' && (!form.committee_id || !form.action_id || form.rationale.trim().length < 20))
    || (mode === 'quality' && form.decision !== 'approved' && !form.notes.trim())
    || (mode === 'appeals' && (form.rationale.trim().length < 20 || (form.decision === 'modified' && !form.action_id)))

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader title={page.title} description={page.description} actions={<Button variant="outline" onClick={load}><RefreshCw size={17} />{copy.refresh}</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4"><StatCard title={copy.total} value={formatLocalizedNumber(metrics.total, language)} icon={icons} /><StatCard title={copy.pending} value={formatLocalizedNumber(metrics.pending, language)} icon={<RefreshCw size={21} />} /><StatCard title={copy.overdue} value={formatLocalizedNumber(metrics.overdue, language)} icon={<Scale size={21} />} /><StatCard title={copy.decided} value={formatLocalizedNumber(metrics.decided, language)} icon={<BadgeCheck size={21} />} /></div>
      {action.error || action.success ? <div role="alert" className={`rounded-2xl border px-4 py-3 text-sm ${action.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>{action.error || action.success}</div> : null}
      <Card><CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_280px]"><Input leftIcon={<Search size={18} />} placeholder={copy.search} value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} /><Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">{copy.all}</option>{statusOptions.map((status) => <option key={status} value={status}>{copy.optionLabels[status] || status.replaceAll('_', ' ')}</option>)}</Select></CardContent></Card>
      <RplPageState loading={state.loading} error={state.error} onRetry={load} language={language}><DataTableShell title={page.queue} description={page.description} columns={columns} rows={state.rows} emptyText={copy.empty} /></RplPageState>
      {selected ? (
        <div className="fixed inset-0 z-[75] flex items-end justify-center bg-[#031C2C]/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}>
          <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={page.action} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-[var(--radius-lg)] outline-none sm:rounded-[var(--radius-lg)]">
          <Card className="w-full rounded-b-none sm:rounded-[var(--radius-lg)]">
            <CardHeader className="border-b border-[var(--color-border)]"><div className="flex items-center justify-between gap-3"><div><CardTitle>{page.action}</CardTitle><p className="mt-1 text-sm text-[var(--color-text-muted)]">{applicationOf(selected).case_reference || `RPL-${applicationOf(selected).id}`}</p></div><Button size="sm" variant="ghost" onClick={() => setSelected(null)}>{copy.close}</Button></div></CardHeader>
            <CardContent className="space-y-4 pt-6">
              {mode !== 'committee' ? <Select label={copy.decision} value={form.decision} onChange={(event) => setForm((current) => ({ ...current, decision: event.target.value }))}>{options.map((option) => <option key={option} value={option}>{copy.optionLabels[option] || option.replaceAll('_', ' ')}</option>)}</Select> : null}
              {mode === 'committee' ? <Select label={copy.committeeSelect} value={form.committee_id} onChange={(event) => setForm((current) => ({ ...current, committee_id: event.target.value }))}><option value="">—</option>{state.committees.map((committee) => <option key={committee.id} value={committee.id}>{localize(committee.name, language)}</option>)}</Select> : null}
              {mode === 'committee' || (mode === 'appeals' && form.decision === 'modified') ? <Select label={copy.actionSelect} value={form.action_id} onChange={(event) => setForm((current) => ({ ...current, action_id: event.target.value }))}><option value="">—</option>{state.actions.map((item) => <option key={item.id} value={item.id}>{localize(item.name, language)}</option>)}</Select> : null}
              {mode === 'committee' || (mode === 'appeals' && form.decision === 'modified') ? <Select label={copy.level} value={form.decided_level_id} onChange={(event) => setForm((current) => ({ ...current, decided_level_id: event.target.value }))}><option value="">—</option>{state.levels.map((level) => <option key={level.id} value={level.id}>{localize(level.name, language)}</option>)}</Select> : null}
              {mode === 'committee' || (mode === 'appeals' && form.decision === 'modified') ? <Select label={copy.outcome} value={form.outcome_id} onChange={(event) => setForm((current) => ({ ...current, outcome_id: event.target.value }))}><option value="">—</option>{state.outcomes.map((outcome) => <option key={outcome.id} value={outcome.id}>{localize(outcome.name, language)}</option>)}</Select> : null}
              <Textarea label={mode === 'quality' ? copy.notes : copy.rationale} rows={7} value={mode === 'quality' ? form.notes : form.rationale} onChange={(event) => setForm((current) => ({ ...current, [mode === 'quality' ? 'notes' : 'rationale']: event.target.value }))} />
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button variant="outline" onClick={() => navigate(`/rpl/applications/${applicationOf(selected).public_id || applicationOf(selected).id}`)}>{copy.viewCase}</Button><Button onClick={submit} disabled={submitDisabled}>{action.busy ? <LoaderCircle className="animate-spin" size={17} /> : icons}{copy.submit}</Button></div>
            </CardContent>
          </Card>
          </div>
        </div>
      ) : null}
    </section>
  )
}
