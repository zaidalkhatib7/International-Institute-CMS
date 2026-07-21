import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Clock3, FileCheck2, FilterX, FolderSearch, RefreshCw, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, CardContent, DataTableShell, Input, PageHeader, Select, StatCard } from '../../../components/ui'
import { readApiError, readPagination, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { APPLICATION_STATUS, localize } from '../domain/rpl'
import { fetchRplApplications, fetchRplDashboard } from '../services/rplService'
import CompletenessMeter from '../components/CompletenessMeter'
import RplPageState from '../components/RplPageState'
import RplStatusBadge from '../components/RplStatusBadge'
import { formatLocalizedDate, formatLocalizedNumber } from '../../../utils/localization'

const copyByLanguage = {
  ar: {
    title: 'طلبات الاعتراف بالتعلم والخبرة السابقة', description: 'إدارة رحلة RPL من الاستلام والمراجعة الإدارية حتى التقييم والقرار.',
    search: 'ابحث بالرقم المرجعي أو اسم المتقدم أو البريد...', allStatuses: 'جميع الحالات', refresh: 'تحديث',
    total: 'إجمالي الطلبات', waiting: 'بانتظار المراجعة', verification: 'قيد التحقق', assessment: 'قيد التقييم',
    queue: 'طابور عمليات RPL', queueDescription: 'طلبات حقيقية من محرك RPL مع حالة الملف ونسبة اكتماله.',
    reference: 'رقم الطلب', applicant: 'المتقدم', pathway: 'المسار والمستوى', status: 'الحالة', completeness: 'الاكتمال', updated: 'آخر تحديث', actions: 'الإجراء', open: 'فتح الملف',
    empty: 'لا توجد طلبات مطابقة للفلاتر الحالية.', emptyHint: 'جرّب إزالة الفلاتر أو البحث باسم المتقدم أو الرقم المرجعي.', records: 'طلب', page: 'صفحة', of: 'من', clear: 'مسح الفلاتر', priorities: 'انتقل إلى طابور الأولوية', all: 'كل الطلبات', loadError: 'تعذر تحميل طلبات RPL.',
  },
  en: {
    title: 'Recognition of Prior Learning Applications', description: 'Operate the RPL journey from intake and administrative review through assessment and decision.',
    search: 'Search reference, applicant, or email...', allStatuses: 'All statuses', refresh: 'Refresh',
    total: 'Total applications', waiting: 'Awaiting review', verification: 'Verification', assessment: 'Assessment',
    queue: 'RPL Operations Queue', queueDescription: 'Live RPL cases with portfolio status and completeness.',
    reference: 'Reference', applicant: 'Applicant', pathway: 'Pathway and level', status: 'Status', completeness: 'Completeness', updated: 'Last update', actions: 'Action', open: 'Open case',
    empty: 'No applications match the current filters.', emptyHint: 'Clear filters or search by applicant name, email, or case reference.', records: 'applications', page: 'Page', of: 'of', clear: 'Clear filters', priorities: 'Jump to a priority queue', all: 'All applications', loadError: 'Unable to load RPL applications.',
  },
  nl: {
    title: 'RPL-aanvragen', description: 'Beheer het RPL-traject van intake en administratieve controle tot beoordeling en besluit.',
    search: 'Zoek op referentie, aanvrager of e-mail...', allStatuses: 'Alle statussen', refresh: 'Vernieuwen',
    total: 'Totaal aanvragen', waiting: 'Wacht op beoordeling', verification: 'Verificatie', assessment: 'Beoordeling',
    queue: 'RPL-werklijst', queueDescription: 'Actuele RPL-dossiers met status en compleetheid.',
    reference: 'Referentie', applicant: 'Aanvrager', pathway: 'Traject en niveau', status: 'Status', completeness: 'Compleetheid', updated: 'Laatst bijgewerkt', actions: 'Actie', open: 'Dossier openen',
    empty: 'Geen aanvragen komen overeen met de filters.', emptyHint: 'Wis de filters of zoek op naam, e-mail of dossierreferentie.', records: 'aanvragen', page: 'Pagina', of: 'van', clear: 'Filters wissen', priorities: 'Ga naar een prioriteitslijst', all: 'Alle aanvragen', loadError: 'De RPL-aanvragen konden niet worden geladen.',
  },
}

function applicantOf(row) {
  return row.applicant || row.user || row.professional_profile?.user || {}
}

export default function RplApplicationsPage() {
  const navigate = useNavigate()
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const copy = copyByLanguage[language] || copyByLanguage.en
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 })
  const [state, setState] = useState({ loading: true, error: '', rows: [], pagination: {}, summary: {} })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const [applicationsResponse, dashboardResponse] = await Promise.all([
        fetchRplApplications({ per_page: 15, page: filters.page, ...(filters.search ? { q: filters.search } : {}), ...(filters.status ? { status: filters.status } : {}) }),
        fetchRplDashboard(),
      ])
      setState({
        loading: false,
        error: '',
        rows: unwrapCollection(applicationsResponse),
        pagination: readPagination(applicationsResponse),
        summary: unwrapApiData(dashboardResponse)?.summary || unwrapApiData(dashboardResponse) || {},
      })
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.loadError) }))
    }
  }, [copy.loadError, filters.page, filters.search, filters.status])

  useEffect(() => {
    const timer = window.setTimeout(load, filters.search ? 250 : 0)
    return () => window.clearTimeout(timer)
  }, [load, filters.search])

  const summaryCards = useMemo(() => [
    { key: 'total', title: copy.total, value: formatLocalizedNumber(state.summary.applications?.total ?? state.summary.total ?? state.pagination.total ?? state.rows.length, language), icon: <FolderSearch size={21} /> },
    { key: 'waiting', title: copy.waiting, value: formatLocalizedNumber(state.summary.applications?.by_status?.submitted ?? state.summary.awaiting_review ?? state.summary.submitted ?? 0, language), icon: <Clock3 size={21} /> },
    { key: 'verification', title: copy.verification, value: formatLocalizedNumber(state.summary.applications?.by_status?.evidence_verification ?? state.summary.evidence_verification ?? 0, language), icon: <FileCheck2 size={21} /> },
    { key: 'assessment', title: copy.assessment, value: formatLocalizedNumber(state.summary.applications?.by_status?.assessment_in_progress ?? state.summary.assessment_in_progress ?? 0, language), icon: <ClipboardCheck size={21} /> },
  ], [copy, language, state.pagination.total, state.rows.length, state.summary])

  const priorityFilters = useMemo(() => [
    { label: copy.all, value: '', count: state.summary.applications?.total ?? state.pagination.total ?? state.rows.length },
    { label: copy.waiting, value: 'submitted', count: state.summary.applications?.by_status?.submitted ?? state.summary.awaiting_review ?? state.summary.submitted ?? 0 },
    { label: copy.verification, value: 'evidence_verification', count: state.summary.applications?.by_status?.evidence_verification ?? state.summary.evidence_verification ?? 0 },
    { label: copy.assessment, value: 'assessment_in_progress', count: state.summary.applications?.by_status?.assessment_in_progress ?? state.summary.assessment_in_progress ?? 0 },
  ], [copy, state.pagination.total, state.rows.length, state.summary])

  const clearFilters = () => setFilters({ search: '', status: '', page: 1 })

  const columns = [
    {
      key: 'reference', label: copy.reference, render: (row) => (
        <div><span className="font-bold text-[var(--color-primary)]">{row.case_reference || row.reference_number || row.case_number || `RPL-${row.id}`}</span><p className="mt-1 text-xs text-[var(--color-text-muted)]">#{row.id}</p></div>
      ),
    },
    {
      key: 'applicant', label: copy.applicant, render: (row) => {
        const applicant = applicantOf(row)
        return <div><span className="font-semibold">{applicant.name || row.applicant_name || '—'}</span><p className="mt-1 text-xs text-[var(--color-text-muted)]">{applicant.email || row.applicant_email || '—'}</p></div>
      },
    },
    {
      key: 'pathway', label: copy.pathway, render: (row) => (
        <div><span className="font-semibold">{localize(row.pathway?.name || row.standard?.name, language) || '—'}</span><p className="mt-1 text-xs text-[var(--color-text-muted)]">{localize(row.target_level?.name || row.requested_level?.name || row.requestedLevel?.name, language) || row.target_level || '—'}</p></div>
      ),
    },
    { key: 'status', label: copy.status, render: (row) => <RplStatusBadge status={row.status} language={language} /> },
    { key: 'completeness', label: copy.completeness, render: (row) => <CompletenessMeter compact value={row.completeness?.percentage ?? row.completeness_percentage ?? 0} language={language} /> },
    { key: 'updated', label: copy.updated, render: (row) => <span className="text-sm text-[var(--color-text-muted)]">{formatLocalizedDate(row.updated_at, language)}</span> },
    { key: 'actions', label: copy.actions, render: (row) => <Button size="sm" variant="outline" onClick={() => navigate(`/rpl/applications/${row.public_id || row.id}`)}>{copy.open}</Button> },
  ]

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader
        eyebrow="RPL"
        title={copy.title}
        description={copy.description}
        meta={<Badge variant={state.loading ? 'warning' : 'info'}>{state.loading ? '…' : `${state.pagination.total ?? state.rows.length} ${copy.records}`}</Badge>}
        actions={<Button variant="outline" onClick={load} disabled={state.loading}><RefreshCw size={17} className={state.loading ? 'animate-spin' : ''} />{copy.refresh}</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {summaryCards.map((card) => <StatCard key={card.key} title={card.title} value={state.loading ? '…' : card.value} icon={card.icon} />)}
      </div>

      <section aria-label={copy.priorities} className="rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="px-2 text-sm font-bold text-[var(--color-text)]">{copy.priorities}</p>
          <div className="flex flex-wrap gap-2">
            {priorityFilters.map((filter) => {
              const active = filters.status === filter.value
              return <button key={filter.value || 'all'} type="button" onClick={() => setFilters((current) => ({ ...current, status: filter.value, page: 1 }))} className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${active ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm' : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}><span>{filter.label}</span><span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/15 text-white' : 'bg-[var(--color-surface-muted)] text-[var(--color-primary)]'}`}>{formatLocalizedNumber(filter.count, language)}</span></button>
            })}
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_280px_auto]">
          <Input leftIcon={<Search size={18} />} placeholder={copy.search} value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} />
          <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}>
            <option value="">{copy.allStatuses}</option>
            {Object.entries(APPLICATION_STATUS).map(([value, definition]) => <option key={value} value={value}>{localize(definition.labels, language)}</option>)}
          </Select>
          {filters.search || filters.status ? <Button variant="ghost" size="sm" onClick={clearFilters}><FilterX size={16} />{copy.clear}</Button> : <Badge variant="info" className="self-center justify-center px-4 py-3">{state.pagination.total ?? 0} {copy.records}</Badge>}
        </CardContent>
      </Card>

      <RplPageState loading={state.loading} error={state.error} onRetry={load} language={language}>
        <DataTableShell title={copy.queue} description={copy.queueDescription} columns={columns} rows={state.rows} emptyText={copy.empty} emptyDescription={copy.emptyHint} emptyAction={filters.search || filters.status ? <Button variant="outline" size="sm" onClick={clearFilters}><FilterX size={16} />{copy.clear}</Button> : null} />
      </RplPageState>

      {state.pagination.lastPage > 1 ? (
        <nav className="flex items-center justify-center gap-3" aria-label={`${copy.page} ${state.pagination.currentPage}`}>
          <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>‹</Button>
          <span className="text-sm text-[var(--color-text-muted)]">{copy.page} {state.pagination.currentPage} {copy.of} {state.pagination.lastPage}</span>
          <Button variant="outline" size="sm" disabled={filters.page >= state.pagination.lastPage} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>›</Button>
        </nav>
      ) : null}
    </section>
  )
}
