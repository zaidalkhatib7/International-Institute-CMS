import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, RefreshCw, Search, ShieldAlert } from 'lucide-react'
import {
  Badge, Button, Card, CardContent, DataTableShell, Input, PageHeader, Select,
} from '../../../components/ui'
import { readApiError, unwrapCollection } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { localize } from '../../rpl/domain/rpl'
import { fetchAcademicApplications, fetchAcademicReferenceData } from '../services/academicRplService'
import { formatLocalizedDate } from '../../../utils/localization'

/*
 * The case list for the Professional Academic RPL pathway.
 *
 * Separate from the RPL applications list on purpose. They look similar, but a
 * single combined list would need a track column that meant "practitioner
 * level" in one row and "doctorate" in the next — two different vocabularies
 * pretending to be one, which is exactly how two governed processes get
 * confused for each other.
 */

const COPY = {
  ar: {
    title: 'المسار الأكاديمي المهني',
    subtitle: 'طلبات الدبلوم والماجستير والدكتوراه المهنية. مؤهلات مهنية، وليست درجات جامعية حكومية.',
    search: 'ابحث برقم الحالة أو الاسم أو البريد',
    allTracks: 'كل المسارات',
    allStatuses: 'كل الحالات',
    refresh: 'تحديث',
    case: 'الحالة',
    applicant: 'المتقدم',
    track: 'المسار المطلوب',
    status: 'الحالة',
    submitted: 'تاريخ الإرسال',
    empty: 'لا توجد طلبات في هذا المسار بعد.',
    open: 'فتح',
    frameworkBlocked: 'إطار الكفاءات غير معتمد: لا تُحتسب أي جاهزية ولا يمكن توليد اختبار تشخيصي.',
    frameworkLink: 'اذهب إلى إطار الكفاءات',
    notSet: 'لم يُحدَّد',
  },
  en: {
    title: 'Professional Academic RPL',
    subtitle: 'Applications for the Professional Diploma, Master and Doctorate. Professional qualifications, not government academic degrees.',
    search: 'Search by case reference, name or email',
    allTracks: 'All tracks',
    allStatuses: 'All statuses',
    refresh: 'Refresh',
    case: 'Case',
    applicant: 'Applicant',
    track: 'Requested track',
    status: 'Status',
    submitted: 'Submitted',
    empty: 'No applications on this pathway yet.',
    open: 'Open',
    frameworkBlocked: 'The competency framework is not approved: no readiness is scored and no diagnostic can be generated.',
    frameworkLink: 'Go to the competency framework',
    notSet: 'Not set',
  },
  nl: {
    title: 'Professioneel Academisch RPL',
    subtitle: 'Aanvragen voor diploma, master en doctoraat. Professionele kwalificaties, geen academische graden.',
    search: 'Zoek op dossier, naam of e-mail',
    allTracks: 'Alle trajecten',
    allStatuses: 'Alle statussen',
    refresh: 'Vernieuwen',
    case: 'Dossier',
    applicant: 'Aanvrager',
    track: 'Gevraagd traject',
    status: 'Status',
    submitted: 'Ingediend',
    empty: 'Nog geen aanvragen op dit traject.',
    open: 'Openen',
    frameworkBlocked: 'Het competentiekader is niet goedgekeurd: er wordt geen gereedheid berekend.',
    frameworkLink: 'Naar het competentiekader',
    notSet: 'Niet ingesteld',
  },
}

const STATUSES = ['draft', 'submitted', 'under_analysis', 'diagnostic_issued', 'recommended', 'closed']

export default function AcademicApplicationsPage() {
  const navigate = useNavigate()
  const language = getAdminLanguage()
  const copy = COPY[language] || COPY.en

  const [filters, setFilters] = useState({ q: '', track: '', status: '' })
  const [state, setState] = useState({ loading: true, error: '', rows: [], reference: null })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const [applications, reference] = await Promise.all([
        fetchAcademicApplications({
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.track ? { track: filters.track } : {}),
          ...(filters.status ? { status: filters.status } : {}),
        }),
        fetchAcademicReferenceData(),
      ])
      setState({
        loading: false,
        error: '',
        rows: unwrapCollection(applications),
        reference: reference?.data || null,
      })
    } catch (error) {
      setState({ loading: false, error: readApiError(error), rows: [], reference: null })
    }
  }, [filters.q, filters.status, filters.track])

  useEffect(() => {
    // Debounced only while typing; filter changes apply immediately.
    const timer = window.setTimeout(load, filters.q ? 250 : 0)
    return () => window.clearTimeout(timer)
  }, [filters.q, load])

  const framework = state.reference?.framework
  const tracks = state.reference?.tracks || []

  return (
    <div className="space-y-6">
      <PageHeader title={copy.title} description={copy.subtitle} />

      {/* Surfaced on the list, not only inside a case: while the framework is
          unapproved every case in this table scores nothing, and finding that
          out one case at a time wastes the assessor's time. */}
      {framework && !framework.ready ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-sm text-amber-900">
              <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              {copy.frameworkBlocked} ({framework.approved}/{framework.total})
            </p>
            <Button variant="outline" onClick={() => navigate('/academic-rpl/framework')}>
              {copy.frameworkLink}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[240px] flex-1">
            <Input
              value={filters.q}
              placeholder={copy.search}
              icon={Search}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            />
          </div>
          <Select
            value={filters.track}
            onChange={(event) => setFilters((current) => ({ ...current, track: event.target.value }))}
          >
            <option value="">{copy.allTracks}</option>
            {tracks.map((track) => (
              <option key={track.code} value={track.code}>
                {localize(track.name, language)}
              </option>
            ))}
          </Select>
          <Select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">{copy.allStatuses}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
          <Button variant="outline" onClick={load}>
            <RefreshCw size={16} /> {copy.refresh}
          </Button>
        </CardContent>
      </Card>

      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      ) : null}

      <DataTableShell
        loading={state.loading}
        empty={!state.loading && state.rows.length === 0}
        emptyState={{ icon: GraduationCap, title: copy.empty }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-xs uppercase text-[var(--color-text-muted)]">
              <th className="p-3 text-start">{copy.case}</th>
              <th className="p-3 text-start">{copy.applicant}</th>
              <th className="p-3 text-start">{copy.track}</th>
              <th className="p-3 text-start">{copy.status}</th>
              <th className="p-3 text-start">{copy.submitted}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {state.rows.map((row) => (
              <tr key={row.public_id} className="border-t border-[var(--color-border)]">
                <td className="p-3 font-mono text-xs"><bdi>{row.case_reference}</bdi></td>
                <td className="p-3">
                  <p className="font-semibold">{row.user?.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]"><bdi>{row.user?.email}</bdi></p>
                </td>
                <td className="p-3">
                  {row.requested_track
                    ? localize(row.requested_track.name, language)
                    : <span className="text-[var(--color-text-muted)]">{copy.notSet}</span>}
                </td>
                <td className="p-3"><Badge variant="neutral">{row.status}</Badge></td>
                <td className="p-3 text-xs text-[var(--color-text-muted)]">
                  {row.submitted_at ? formatLocalizedDate(row.submitted_at, language) : '—'}
                </td>
                <td className="p-3 text-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/academic-rpl/applications/${row.public_id}`)}
                  >
                    {copy.open}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  )
}
