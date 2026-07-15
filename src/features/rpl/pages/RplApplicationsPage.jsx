import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Clock3, FileCheck2, FolderSearch, RefreshCw, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, CardContent, DataTableShell, Input, PageHeader, Select, StatCard } from '../../../components/ui'
import { readApiError, readPagination, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { APPLICATION_STATUS, localize } from '../domain/rpl'
import { fetchRplApplications, fetchRplDashboard } from '../services/rplService'
import CompletenessMeter from '../components/CompletenessMeter'
import RplPageState from '../components/RplPageState'
import RplStatusBadge from '../components/RplStatusBadge'

const copyByLanguage = {
  ar: {
    title: 'طلبات الاعتراف بالتعلم والخبرة السابقة', description: 'إدارة رحلة RPL من الاستلام والمراجعة الإدارية حتى التقييم والقرار.',
    search: 'ابحث بالرقم المرجعي أو اسم المتقدم أو البريد...', allStatuses: 'جميع الحالات', refresh: 'تحديث',
    total: 'إجمالي الطلبات', waiting: 'بانتظار المراجعة', verification: 'قيد التحقق', assessment: 'قيد التقييم',
    queue: 'طابور عمليات RPL', queueDescription: 'طلبات حقيقية من محرك RPL مع حالة الملف ونسبة اكتماله.',
    reference: 'رقم الطلب', applicant: 'المتقدم', pathway: 'المسار والمستوى', status: 'الحالة', completeness: 'الاكتمال', updated: 'آخر تحديث', actions: 'الإجراء', open: 'فتح الملف',
    empty: 'لا توجد طلبات مطابقة للفلاتر الحالية.', records: 'طلب', page: 'صفحة', of: 'من',
  },
  en: {
    title: 'Recognition of Prior Learning Applications', description: 'Operate the RPL journey from intake and administrative review through assessment and decision.',
    search: 'Search reference, applicant, or email...', allStatuses: 'All statuses', refresh: 'Refresh',
    total: 'Total applications', waiting: 'Awaiting review', verification: 'Verification', assessment: 'Assessment',
    queue: 'RPL Operations Queue', queueDescription: 'Live RPL cases with portfolio status and completeness.',
    reference: 'Reference', applicant: 'Applicant', pathway: 'Pathway and level', status: 'Status', completeness: 'Completeness', updated: 'Last update', actions: 'Action', open: 'Open case',
    empty: 'No applications match the current filters.', records: 'applications', page: 'Page', of: 'of',
  },
  nl: {
    title: 'RPL-aanvragen', description: 'Beheer het RPL-traject van intake en administratieve controle tot beoordeling en besluit.',
    search: 'Zoek op referentie, aanvrager of e-mail...', allStatuses: 'Alle statussen', refresh: 'Vernieuwen',
    total: 'Totaal aanvragen', waiting: 'Wacht op beoordeling', verification: 'Verificatie', assessment: 'Beoordeling',
    queue: 'RPL-werklijst', queueDescription: 'Actuele RPL-dossiers met status en compleetheid.',
    reference: 'Referentie', applicant: 'Aanvrager', pathway: 'Traject en niveau', status: 'Status', completeness: 'Compleetheid', updated: 'Laatst bijgewerkt', actions: 'Actie', open: 'Dossier openen',
    empty: 'Geen aanvragen komen overeen met de filters.', records: 'aanvragen', page: 'Pagina', of: 'van',
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
      setState((current) => ({ ...current, loading: false, error: readApiError(error, 'Unable to load RPL applications.') }))
    }
  }, [filters.page, filters.search, filters.status])

  useEffect(() => {
    const timer = window.setTimeout(load, filters.search ? 250 : 0)
    return () => window.clearTimeout(timer)
  }, [load, filters.search])

  const summaryCards = useMemo(() => [
    { key: 'total', title: copy.total, value: state.summary.applications?.total ?? state.summary.total ?? state.pagination.total ?? state.rows.length, icon: <FolderSearch size={21} /> },
    { key: 'waiting', title: copy.waiting, value: state.summary.applications?.by_status?.submitted ?? state.summary.awaiting_review ?? state.summary.submitted ?? 0, icon: <Clock3 size={21} /> },
    { key: 'verification', title: copy.verification, value: state.summary.applications?.by_status?.evidence_verification ?? state.summary.evidence_verification ?? 0, icon: <FileCheck2 size={21} /> },
    { key: 'assessment', title: copy.assessment, value: state.summary.applications?.by_status?.assessment_in_progress ?? state.summary.assessment_in_progress ?? 0, icon: <ClipboardCheck size={21} /> },
  ], [copy, state.pagination.total, state.rows.length, state.summary])

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
    { key: 'updated', label: copy.updated, render: (row) => <span className="text-sm text-[var(--color-text-muted)]">{row.updated_at ? new Date(row.updated_at).toLocaleDateString(language === 'ar' ? 'ar' : language) : '—'}</span> },
    { key: 'actions', label: copy.actions, render: (row) => <Button size="sm" variant="outline" onClick={() => navigate(`/rpl/applications/${row.public_id || row.id}`)}>{copy.open}</Button> },
  ]

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader title={copy.title} description={copy.description} actions={<Button variant="outline" onClick={load}><RefreshCw size={17} />{copy.refresh}</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {summaryCards.map((card) => <StatCard key={card.key} title={card.title} value={state.loading ? '…' : card.value} icon={card.icon} />)}
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_280px_auto]">
          <Input leftIcon={<Search size={18} />} placeholder={copy.search} value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} />
          <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}>
            <option value="">{copy.allStatuses}</option>
            {Object.entries(APPLICATION_STATUS).map(([value, definition]) => <option key={value} value={value}>{localize(definition.labels, language)}</option>)}
          </Select>
          <Badge variant="info" className="self-center justify-center px-4 py-3">{state.pagination.total ?? 0} {copy.records}</Badge>
        </CardContent>
      </Card>

      <RplPageState loading={state.loading} error={state.error} onRetry={load} language={language}>
        <DataTableShell title={copy.queue} description={copy.queueDescription} columns={columns} rows={state.rows} emptyText={copy.empty} />
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
