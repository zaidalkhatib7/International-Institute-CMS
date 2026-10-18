import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FilterX, Plus, RefreshCw, Search } from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, CardContent, DataTableShell, Input, PageHeader, Select } from '../../../components/ui'
import { readApiError, readPagination, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { APPLICATION_STATUS, localize } from '../domain/rpl'
import { PRE_FLOW_STATUSES, QUEUE_KEYS, STAGES, queueOf, queuesOfStage, stageLabel, stageOf, statusesOfStage } from '../domain/journey'
import { fetchRplApplications, fetchRplReferenceData } from '../services/rplService'
import RplPageState from '../components/RplPageState'
import RplStatusBadge from '../components/RplStatusBadge'
import { formatLocalizedDateTime, formatLocalizedNumber } from '../../../utils/localization'
import { useAuthorization } from '../../auth/context/useAuthorization'
import useWorkCounts from '../../dashboard/hooks/useWorkCounts'

/*
 * THE PROFESSIONAL PATH'S CASES (owner, 18 Oct 2026; PLATFORM-JOURNEY-SPEC §4.2).
 *
 * One list, filtered by stage and then by work queue: the same queues Today
 * counts, so a tile's number is the list it opens. The URL carries only the
 * stage and the queue; a search (a name or an email) stays in the page and never
 * enters a URL. Stage counts are global, so only unscoped viewers see them;
 * queue counts are scoped by the server, so everyone does.
 */

const copyByLanguage = {
  ar: {
    title: 'طلبات المسار المهني',
    description: 'من استلام الطلب وفرز الوثائق إلى اختبار الدخول وخطة الدورات والاختبار النهائي وشهادة المستوى.',
    newOffice: 'طلب لعميل في المكتب',
    refresh: 'تحديث',
    all: 'الكل',
    stagesLabel: 'المراحل',
    queuesLabel: 'قوائم العمل في هذه المرحلة',
    search: 'بحث: الرقم المرجعي أو اسم العميل أو بريده',
    moreFilters: 'فلاتر أخرى',
    status: 'الحالة',
    allStatuses: 'جميع الحالات',
    preFlowGroup: 'المسار السابق',
    pathway: 'المسار',
    level: 'المستوى',
    allPathways: 'كل المسارات',
    allLevels: 'كل المستويات',
    table: 'الطلبات',
    reference: 'رقم الطلب',
    client: 'العميل',
    pathwayLevel: 'المسار والمستوى',
    stage: 'المرحلة',
    lastChange: 'آخر تغيير',
    open: 'فتح الملف',
    // The count badge by plural form (Intl.PluralRules): «طلب واحد»، «طلبان»، «3 طلبات»، «11 طلبًا»، «100 طلب».
    records: { zero: '{n} طلب', one: 'طلب واحد', two: 'طلبان', few: '{n} طلبات', many: '{n} طلبًا', other: '{n} طلب' },
    page: 'صفحة',
    of: 'من',
    clear: 'مسح الفلاتر',
    emptyFiltered: 'لا توجد طلبات مطابقة للفلاتر الحالية.',
    emptyFilteredHint: 'جرّب إزالة الفلاتر أو البحث باسم العميل أو الرقم المرجعي.',
    emptyNone: 'لا توجد طلبات بعد. تصل الطلبات من الموقع، ويُفتح طلب عميل المكتب من صفحته في «العملاء».',
    loadError: 'تعذّر تحميل الطلبات.',
  },
  en: {
    title: 'Professional cases',
    description: 'From the request and document screening to the entry quiz, the course plan, the final exam and the level certificate.',
    newOffice: 'New office request',
    refresh: 'Refresh',
    all: 'All',
    stagesLabel: 'Stages',
    queuesLabel: 'Work queues in this stage',
    search: 'Search: case reference, client name or email',
    moreFilters: 'More filters',
    status: 'Status',
    allStatuses: 'All statuses',
    preFlowGroup: 'Pre-flow',
    pathway: 'Pathway',
    level: 'Level',
    allPathways: 'All pathways',
    allLevels: 'All levels',
    table: 'Cases',
    reference: 'Reference',
    client: 'Client',
    pathwayLevel: 'Pathway and level',
    stage: 'Stage',
    lastChange: 'Last change',
    open: 'Open case',
    records: { one: '{n} case', other: '{n} cases' },
    page: 'Page',
    of: 'of',
    clear: 'Clear filters',
    emptyFiltered: 'No cases match the current filters.',
    emptyFilteredHint: 'Clear the filters, or search by the client\'s name or the case reference.',
    emptyNone: 'No cases yet. Cases arrive from the website; an office client\'s case is opened from their page in Clients.',
    loadError: 'The cases could not be loaded.',
  },
}

const STAGE_KEYS = STAGES.map((stage) => stage.key)

function clientOf(row) {
  return row.applicant || row.user || row.professional_profile?.user || {}
}

/** The count badge in the right plural form ("1 case", never "1 cases"; Arabic has six forms). */
function casesCountLabel(total, language, forms) {
  const n = Number(total) || 0
  let category = 'other'
  try {
    category = new Intl.PluralRules(language === 'ar' ? 'ar' : 'en').select(n)
  } catch {
    category = n === 1 ? 'one' : 'other'
  }
  const template = forms[category] || forms.other
  return template.replace('{n}', formatLocalizedNumber(n, language))
}

/** "3 days ago", in the interface language; the full date goes in the title. */
function relativeTime(value, language) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  const format = new Intl.RelativeTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', { numeric: 'auto' })
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return format.format(0, 'minute')
}

function chipClass(active) {
  return `inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${active ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm' : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`
}

function ChipCount({ value, active, language }) {
  if (value == null) return null
  return <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/15 text-white' : 'bg-[var(--color-surface-muted)] text-[var(--color-primary)]'}`}>{formatLocalizedNumber(value, language)}</span>
}

export default function RplApplicationsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const language = getAdminLanguage() === 'ar' ? 'ar' : 'en'
  const isArabic = language === 'ar'
  const copy = copyByLanguage[language]
  const { hasPermission } = useAuthorization()
  const counts = useWorkCounts()

  const stage = STAGE_KEYS.includes(searchParams.get('stage')) ? searchParams.get('stage') : ''
  const requestedQueue = searchParams.get('queue')
  const queue = QUEUE_KEYS.includes(requestedQueue) && (!stage || queueOf(requestedQueue).stage === stage) ? requestedQueue : ''
  const effectiveStage = stage || (queue ? queueOf(queue).stage : '')

  // A name or an email never enters a URL: the search lives here, and global search hands it over in the route state.
  const [search, setSearch] = useState(() => (typeof location.state?.q === 'string' ? location.state.q : ''))
  const [filters, setFilters] = useState({ status: '', pathway_id: '', level_id: '', page: 1 })
  // Global search's "All matching cases" while this list is already open: the page is not mounted again, so the hand-over is read on every navigation.
  const handedQuery = typeof location.state?.q === 'string' ? location.state.q : null
  const seenNavigation = useRef(location.key)
  useEffect(() => {
    if (seenNavigation.current === location.key) return
    seenNavigation.current = location.key
    if (handedQuery == null) return
    setSearch(handedQuery)
    setFilters((current) => ({ ...current, page: 1 }))
  }, [location.key, handedQuery])
  const [state, setState] = useState({ loading: true, error: '', rows: [], pagination: {} })
  const [reference, setReference] = useState({ pathways: [] })

  const unscoped = hasPermission('rpl.applications.manage') || hasPermission('rpl.quality.approve') || hasPermission('rpl.committee.decide')
  const canStartOffice = hasPermission('users.view') && hasPermission('rpl.applications.manage')
  const byStatus = counts.dashboard?.applications?.by_status || null

  useEffect(() => {
    let cancelled = false
    fetchRplReferenceData()
      .then((payload) => { if (!cancelled) setReference({ pathways: unwrapCollection(unwrapApiData(payload)?.pathways || []) }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const params = useMemo(() => {
    const next = { per_page: 15, page: filters.page }
    if (search.trim()) next.q = search.trim()
    if (filters.status) next.status = filters.status
    if (filters.pathway_id) next.pathway_id = filters.pathway_id
    if (filters.level_id) next.level_id = filters.level_id
    if (effectiveStage) next.statuses = statusesOfStage(effectiveStage)
    if (queue) {
      next.queue = queue
      next.sort = 'waiting'
    }
    return next
  }, [effectiveStage, filters, queue, search])

  // Only the latest request may fill the table: a slower answer to an earlier filter is dropped.
  const latestRequest = useRef(0)
  const load = useCallback(async () => {
    const request = latestRequest.current + 1
    latestRequest.current = request
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const response = await fetchRplApplications(params)
      if (latestRequest.current !== request) return
      setState({ loading: false, error: '', rows: unwrapCollection(response), pagination: readPagination(response) })
    } catch (error) {
      if (latestRequest.current !== request) return
      setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.loadError, language) }))
    }
  }, [copy.loadError, language, params])

  useEffect(() => {
    const timer = window.setTimeout(load, search ? 250 : 0)
    return () => window.clearTimeout(timer)
  }, [load, search])

  function chooseStage(key) {
    setFilters((current) => ({ ...current, page: 1 }))
    setSearchParams(key ? { stage: key } : {}, { replace: true })
  }

  function chooseQueue(key) {
    setFilters((current) => ({ ...current, page: 1 }))
    setSearchParams(key ? { stage: effectiveStage, queue: key } : { stage: effectiveStage }, { replace: true })
  }

  const hasFilter = Boolean(search.trim() || filters.status || filters.pathway_id || filters.level_id || stage || queue)

  function clearFilters() {
    setSearch('')
    setFilters({ status: '', pathway_id: '', level_id: '', page: 1 })
    setSearchParams({}, { replace: true })
  }

  const stageCount = (key) => (unscoped && byStatus ? statusesOfStage(key).reduce((sum, status) => sum + (Number(byStatus[status]) || 0), 0) : null)
  const allCount = unscoped ? counts.dashboard?.applications?.total ?? null : null
  const backLabel = queue ? localize(queueOf(queue).chip, language) : effectiveStage ? stageLabel(effectiveStage, language) : null
  const from = { pathname: location.pathname, search: location.search, label: backLabel }

  const levels = reference.pathways.flatMap((pathway) => (pathway.levels || []).map((level) => ({ ...level, pathwayName: localize(pathway.name, language), pathwayId: pathway.id })))
  const shownLevels = filters.pathway_id ? levels.filter((level) => String(level.pathwayId) === String(filters.pathway_id)) : levels
  const currentStatuses = Object.keys(APPLICATION_STATUS).filter((status) => !PRE_FLOW_STATUSES.includes(status))

  const columns = [
    {
      key: 'reference',
      label: copy.reference,
      render: (row) => {
        const reference = row.case_reference || row.reference_number || row.case_number || `#${row.id}`
        return <Link to={`/rpl/applications/${row.public_id || row.id}`} state={{ from }} aria-label={`${copy.open} ${reference}`} className="whitespace-nowrap font-bold text-[var(--color-primary)] underline-offset-2 hover:underline"><bdi>{reference}</bdi></Link>
      },
    },
    {
      key: 'client',
      label: copy.client,
      render: (row) => {
        const client = clientOf(row)
        return <div><bdi className="font-semibold">{client.name || row.applicant_name || '—'}</bdi><p className="mt-1 text-xs text-[var(--color-text-muted)]"><bdi>{client.email || row.applicant_email || '—'}</bdi></p></div>
      },
    },
    {
      key: 'pathway',
      label: copy.pathwayLevel,
      render: (row) => <div><span className="font-semibold">{localize(row.pathway?.name || row.standard?.name, language) || '—'}</span><p className="mt-1 text-xs text-[var(--color-text-muted)]">{localize(row.target_level?.name || row.requested_level?.name || row.requestedLevel?.name, language) || '—'}</p></div>,
    },
    { key: 'stage', label: copy.stage, render: (row) => <span className="whitespace-nowrap text-sm font-semibold">{stageLabel(stageOf(row.status), language) || '—'}</span> },
    { key: 'status', label: copy.status, render: (row) => <RplStatusBadge status={row.status} language={language} /> },
    { key: 'updated', label: copy.lastChange, render: (row) => <span title={formatLocalizedDateTime(row.updated_at, language)} className="whitespace-nowrap text-xs text-[var(--color-text-muted)]">{relativeTime(row.updated_at, language)}</span> },
  ]

  const officeButton = canStartOffice ? <Button onClick={() => navigate('/users/onsite')}><Plus size={17} />{copy.newOffice}</Button> : null
  const stageQueues = effectiveStage ? queuesOfStage(effectiveStage) : []

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        meta={<Badge variant={state.loading ? 'warning' : 'info'}>{state.loading ? '…' : casesCountLabel(state.pagination.total ?? state.rows.length, language, copy.records)}</Badge>}
        actions={<>{officeButton}<Button variant="outline" onClick={() => { load(); counts.refresh() }} disabled={state.loading}><RefreshCw size={17} className={state.loading ? 'animate-spin' : ''} />{copy.refresh}</Button></>}
      />

      <nav aria-label={copy.stagesLabel} className="flex flex-wrap gap-2">
        <button type="button" onClick={() => chooseStage('')} aria-pressed={!effectiveStage} className={chipClass(!effectiveStage)}><span>{copy.all}</span><ChipCount value={allCount} active={!effectiveStage} language={language} /></button>
        {STAGES.map((item) => {
          const active = effectiveStage === item.key
          return <button key={item.key} type="button" onClick={() => chooseStage(item.key)} aria-pressed={active} className={chipClass(active)}><span>{stageLabel(item.key, language)}</span><ChipCount value={stageCount(item.key)} active={active} language={language} /></button>
        })}
      </nav>

      {stageQueues.length > 1 || (stageQueues.length === 1 && stageQueues[0].stage !== stageQueues[0].key) ? (
        <nav aria-label={copy.queuesLabel} className="flex flex-wrap gap-2 rounded-2xl border border-[var(--color-border)] bg-white p-3">
          {stageQueues.map((item) => {
            const active = queue === item.key
            const value = counts.queues ? counts.queues[item.key] ?? 0 : null
            return <button key={item.key} type="button" onClick={() => chooseQueue(active ? '' : item.key)} aria-pressed={active} className={chipClass(active)}><span>{localize(item.chip, language)}</span><ChipCount value={value} active={active} language={language} /></button>
          })}
        </nav>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <Input leftIcon={<Search size={18} />} aria-label={copy.search} placeholder={copy.search} value={search} onChange={(event) => { setSearch(event.target.value); setFilters((current) => ({ ...current, page: 1 })) }} />
            {hasFilter ? <Button variant="ghost" size="sm" onClick={clearFilters}><FilterX size={16} />{copy.clear}</Button> : null}
          </div>
          <details className="rounded-xl border border-[var(--color-border)] p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-[var(--color-text)]">{copy.moreFilters}</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Select label={copy.status} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}>
                <option value="">{copy.allStatuses}</option>
                {currentStatuses.map((value) => <option key={value} value={value}>{localize(APPLICATION_STATUS[value].labels, language)}</option>)}
                <optgroup label={copy.preFlowGroup}>
                  {PRE_FLOW_STATUSES.map((value) => <option key={value} value={value}>{localize(APPLICATION_STATUS[value]?.labels, language) || value}</option>)}
                </optgroup>
              </Select>
              <Select label={copy.pathway} value={filters.pathway_id} onChange={(event) => setFilters((current) => ({ ...current, pathway_id: event.target.value, level_id: '', page: 1 }))}>
                <option value="">{copy.allPathways}</option>
                {reference.pathways.map((pathway) => <option key={pathway.id} value={pathway.id}>{localize(pathway.name, language)}</option>)}
              </Select>
              <Select label={copy.level} value={filters.level_id} onChange={(event) => setFilters((current) => ({ ...current, level_id: event.target.value, page: 1 }))}>
                <option value="">{copy.allLevels}</option>
                {shownLevels.map((level) => <option key={level.id} value={level.id}>{localize(level.name, language)} · {level.pathwayName}</option>)}
              </Select>
            </div>
          </details>
        </CardContent>
      </Card>

      <RplPageState loading={state.loading} error={state.error} onRetry={load} language={language}>
        <DataTableShell
          density="compact"
          title={copy.table}
          columns={columns}
          rows={state.rows}
          emptyText={hasFilter ? copy.emptyFiltered : copy.emptyNone}
          emptyDescription={hasFilter ? copy.emptyFilteredHint : undefined}
          emptyAction={hasFilter ? <Button variant="outline" size="sm" onClick={clearFilters}><FilterX size={16} />{copy.clear}</Button> : officeButton}
        />
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
