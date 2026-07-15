import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BadgeCheck, BriefcaseBusiness, Search, ShieldCheck, UserRoundCheck, UsersRound } from 'lucide-react'
import { Badge, Card, CardContent, DataTableShell, Input, PageHeader, Select, StatCard } from '../../../components/ui'
import { readApiError, unwrapCollection } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { fetchRplAssessors, fetchRplAssignments } from '../services/rplService'
import RplPageState from '../components/RplPageState'

const copyByLanguage = {
  ar: {
    title: 'المقيّمون والمدربون', description: 'دليل مهني للمقيّمين المؤهلين مع التحقق من الحالة والتوفر وعبء العمل وتعارض المصالح.',
    total: 'إجمالي المقيّمين', available: 'متاحون', assigned: 'إسنادات نشطة', conflicts: 'تعارضات مفتوحة', search: 'ابحث بالاسم أو مجال الخبرة...', allAvailability: 'كل حالات التوفر', availableOnly: 'المتاحون فقط', unavailable: 'غير المتاحين',
    assessor: 'المقيّم', expertise: 'مجال الخبرة', languages: 'اللغات', verification: 'التحقق', availability: 'التوفر', workload: 'عبء العمل', empty: 'لا يوجد مقيّمون مطابقون.', verified: 'تم التحقق', pending: 'قيد التحقق', activeCases: 'ملفات نشطة',
    warning: 'يجب التحقق من تعارض المصالح قبل كل إسناد. المقيّم يرفع توصية فقط ولا يصدر قرار الاعتماد أو الشهادة.',
  },
  en: {
    title: 'Assessors & Trainers', description: 'A professional directory of eligible assessors with verification, availability, workload, and conflict oversight.',
    total: 'Total assessors', available: 'Available', assigned: 'Active assignments', conflicts: 'Open conflicts', search: 'Search name or expertise...', allAvailability: 'All availability', availableOnly: 'Available only', unavailable: 'Unavailable',
    assessor: 'Assessor', expertise: 'Expertise', languages: 'Languages', verification: 'Verification', availability: 'Availability', workload: 'Workload', empty: 'No assessors match the filters.', verified: 'Verified', pending: 'Pending verification', activeCases: 'active cases',
    warning: 'Conflict of interest must be checked before every assignment. Assessors only submit recommendations and cannot issue an accreditation decision or certificate.',
  },
  nl: {
    title: 'Beoordelaars & Trainers', description: 'Professionele lijst van bevoegde beoordelaars met verificatie, beschikbaarheid, werklast en conflictcontrole.',
    total: 'Totaal beoordelaars', available: 'Beschikbaar', assigned: 'Actieve toewijzingen', conflicts: 'Open conflicten', search: 'Zoek naam of expertise...', allAvailability: 'Alle beschikbaarheid', availableOnly: 'Alleen beschikbaar', unavailable: 'Niet beschikbaar',
    assessor: 'Beoordelaar', expertise: 'Expertise', languages: 'Talen', verification: 'Verificatie', availability: 'Beschikbaarheid', workload: 'Werklast', empty: 'Geen beoordelaars komen overeen.', verified: 'Geverifieerd', pending: 'Verificatie in behandeling', activeCases: 'actieve dossiers',
    warning: 'Belangenconflict moet vóór elke toewijzing worden gecontroleerd. Beoordelaars geven alleen aanbevelingen en kunnen geen besluit of certificaat uitgeven.',
  },
}

export default function RplAssessorsPage() {
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const copy = copyByLanguage[language] || copyByLanguage.en
  const [filters, setFilters] = useState({ search: '', availability: '' })
  const [state, setState] = useState({ loading: true, error: '', rows: [], assignments: [] })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const [assessors, assignments] = await Promise.all([
        fetchRplAssessors({ per_page: 100, ...(filters.search ? { q: filters.search } : {}) }),
        fetchRplAssignments({ per_page: 100 }),
      ])
      const rows = unwrapCollection(assessors).filter((row) => !filters.availability || (filters.availability === 'available' ? row.availability_status === 'available' : row.availability_status !== 'available'))
      setState({ loading: false, error: '', rows, assignments: unwrapCollection(assignments) })
    } catch (error) { setState((current) => ({ ...current, loading: false, error: readApiError(error) })) }
  }, [filters.availability, filters.search])

  useEffect(() => { const timer = window.setTimeout(load, filters.search ? 250 : 0); return () => window.clearTimeout(timer) }, [filters.search, load])

  const summary = useMemo(() => ({
    total: state.rows.length,
    available: state.rows.filter((row) => row.availability_status === 'available').length,
    assigned: state.assignments.filter((row) => row.status === 'accepted').length,
    conflicts: state.assignments.filter((row) => row.status === 'recused' || row.conflict_declaration?.has_conflict).length,
  }), [state.assignments, state.rows])

  const columns = [
    { key: 'assessor', label: copy.assessor, render: (row) => <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] font-bold text-white">{(row.user?.name || row.name || 'A').slice(0, 1).toUpperCase()}</span><div><span className="font-bold">{row.user?.name || row.name || '—'}</span><p className="mt-1 text-xs text-[var(--color-text-muted)]">{row.user?.email || row.email || '—'}</p></div></div> },
    { key: 'expertise', label: copy.expertise, render: (row) => (row.expertise || row.expertise_categories || []).map((item) => item.name?.[language] || item.name || item.title).filter(Boolean).join(', ') || row.professional_field || '—' },
    { key: 'languages', label: copy.languages, render: (row) => (row.languages || []).map((item) => item.name?.[language] || item.name || item).join(', ') || '—' },
    { key: 'verification', label: copy.verification, render: (row) => <Badge variant={['verified', 'approved'].includes(row.verification_status) ? 'success' : 'warning'}>{['verified', 'approved'].includes(row.verification_status) ? copy.verified : copy.pending}</Badge> },
    { key: 'availability', label: copy.availability, render: (row) => <Badge variant={row.availability_status === 'available' ? 'success' : 'neutral'}>{row.availability_status === 'available' ? copy.available : copy.unavailable}</Badge> },
    { key: 'workload', label: copy.workload, render: (row) => <span className="font-semibold">{row.active_rpl_assignments_count ?? row.active_assignments_count ?? 0} {copy.activeCases}</span> },
  ]

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader title={copy.title} description={copy.description} />
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><AlertTriangle size={20} className="mt-0.5 shrink-0" /><p>{copy.warning}</p></div>
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4"><StatCard title={copy.total} value={summary.total} icon={<UsersRound size={21} />} /><StatCard title={copy.available} value={summary.available} icon={<UserRoundCheck size={21} />} /><StatCard title={copy.assigned} value={summary.assigned} icon={<BriefcaseBusiness size={21} />} /><StatCard title={copy.conflicts} value={summary.conflicts} icon={<ShieldCheck size={21} />} /></div>
      <Card><CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_280px]"><Input leftIcon={<Search size={18} />} placeholder={copy.search} value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} /><Select value={filters.availability} onChange={(event) => setFilters((current) => ({ ...current, availability: event.target.value }))}><option value="">{copy.allAvailability}</option><option value="available">{copy.availableOnly}</option><option value="unavailable">{copy.unavailable}</option></Select></CardContent></Card>
      <RplPageState loading={state.loading} error={state.error} onRetry={load} language={language}><DataTableShell title={copy.title} description={copy.description} columns={columns} rows={state.rows} emptyText={copy.empty} /></RplPageState>
    </section>
  )
}
