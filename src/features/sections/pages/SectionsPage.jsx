import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpAZ,
  ChevronLeft,
  ChevronRight,
  Layers3,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  PageHeader,
  Select,
} from '../../../components/ui'
import { fetchAdminPrograms } from '../../programs/services/programsService'
import { deleteAdminSection, fetchAdminSections } from '../services/sectionsService'
import { getCurrentLanguage, readLocalizedValue } from '../../../utils/localization'

const SECTIONS_TABLE_GRID =
  'grid-cols-[minmax(280px,2.2fr)_minmax(220px,1.8fr)_100px_100px_150px_92px]'

function readLocalized(value) {
  return readLocalizedValue(value)
}

function getSectionTitle(section) {
  return readLocalized(section?.title) || 'Untitled Section'
}

function getSectionDescription(section) {
  return readLocalized(section?.description) || 'No description'
}

function getProgramTitle(program) {
  return readLocalized(program?.title) || program?.slug || `Program ${program?.id ?? ''}`.trim()
}

function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function getSortValue(section, programsById, sortBy) {
  if (sortBy === 'program') return programsById[String(section?.program_id)] || '-'
  if (sortBy === 'sort_order') return Number(section?.sort_order ?? 0)
  if (sortBy === 'lessons_count') return Number(section?.lessons_count ?? 0)
  return getSectionTitle(section)
}

function MetricCard({ label, value, variant = 'neutral' }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <Badge variant={variant}>Live</Badge>
        </div>
        <h3 className="mt-3 text-5xl font-bold text-[var(--color-text)]">{value}</h3>
      </CardContent>
    </Card>
  )
}

function SectionRow({ section, programName, onEdit, onDelete, isDeleting, labels }) {
  const title = getSectionTitle(section)
  const description = getSectionDescription(section)
  const sortOrder = section?.sort_order ?? '-'
  const lessonsCount = section?.lessons_count ?? 0

  return (
    <div
      className={`grid ${SECTIONS_TABLE_GRID} items-center gap-3 border-t border-[var(--color-border)] px-6 py-5`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <Layers3 size={18} />
        </div>
        <div>
          <h4 className="text-xl font-semibold text-[var(--color-text)]">{title}</h4>
          <p className="mt-1 max-w-[320px] truncate text-sm text-[var(--color-text-muted)]">
            {description}
          </p>
        </div>
      </div>

      <div className="truncate text-lg text-[var(--color-text-body,#43474D)]">{programName}</div>

      <div className="text-base font-semibold text-[var(--color-text)]">{sortOrder}</div>
      <div className="text-base text-[var(--color-text-body,#43474D)]">{lessonsCount}</div>

      <div>
        <Badge variant={lessonsCount > 0 ? 'success' : 'neutral'}>
          {lessonsCount > 0 ? labels.populated : labels.empty}
        </Badge>
      </div>

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-black/5"
          onClick={() => onEdit(section)}
        >
          <Pencil size={16} />
        </button>

        <button
          type="button"
          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onDelete(section)}
          disabled={isDeleting}
        >
          <Trash2 size={16} />
        </button>

        <button type="button" className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-black/5">
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  )
}

export default function SectionsPage() {
  const navigate = useNavigate()
  const language = getCurrentLanguage()
  const copy = useMemo(() => {
    if (language === 'ar') {
      return {
        title: 'الأقسام',
        description: 'تنظيم أقسام البرامج وإدارة هيكل تدفق التعلم.',
        newSection: 'قسم جديد',
        totalSections: 'إجمالي الأقسام',
        populated: 'ممتلئ',
        empty: 'فارغ',
        totalLessons: 'إجمالي الدروس',
        searchSections: 'ابحث في الأقسام...',
        allPrograms: 'كل البرامج',
        sortTitle: 'الترتيب: العنوان',
        sortProgram: 'الترتيب: البرنامج',
        sortOrder: 'الترتيب: الترتيب',
        sortLessons: 'الترتيب: الدروس',
        asc: 'تصاعدي',
        desc: 'تنازلي',
        rows5: '5 صفوف',
        rows10: '10 صفوف',
        rows20: '20 صفًا',
        rows50: '50 صفًا',
        section: 'القسم',
        program: 'البرنامج',
        order: 'الترتيب',
        lessons: 'الدروس',
        status: 'الحالة',
        actions: 'الإجراءات',
        loading: 'جاري تحميل الأقسام...',
        noResults: 'لا توجد أقسام.',
        showing: 'عرض',
        of: 'من',
        filtered: 'مفلتر',
        totalLoaded: 'الإجمالي المحمل',
        page: 'الصفحة',
        prev: 'السابق',
        next: 'التالي',
      }
    }
    if (language === 'nl') {
      return {
        title: 'Secties',
        description: 'Organiseer programmasecties en beheer de leerstroomstructuur.',
        newSection: 'Nieuwe sectie',
        totalSections: 'Totaal secties',
        populated: 'Gevuld',
        empty: 'Leeg',
        totalLessons: 'Totaal lessen',
        searchSections: 'Zoek secties...',
        allPrograms: 'Alle programma\'s',
        sortTitle: 'Sorteren: Titel',
        sortProgram: 'Sorteren: Programma',
        sortOrder: 'Sorteren: Volgorde',
        sortLessons: 'Sorteren: Lessen',
        asc: 'Oplopend',
        desc: 'Aflopend',
        rows5: '5 rijen',
        rows10: '10 rijen',
        rows20: '20 rijen',
        rows50: '50 rijen',
        section: 'Sectie',
        program: 'Programma',
        order: 'Volgorde',
        lessons: 'Lessen',
        status: 'Status',
        actions: 'Acties',
        loading: 'Secties laden...',
        noResults: 'Geen secties gevonden.',
        showing: 'Toont',
        of: 'van',
        filtered: 'gefilterd',
        totalLoaded: 'Totaal geladen',
        page: 'Pagina',
        prev: 'Vorige',
        next: 'Volgende',
      }
    }
    return {
      title: 'Sections',
      description: 'Organize program sections and manage learning flow structure.',
      newSection: 'New Section',
      totalSections: 'Total Sections',
      populated: 'Populated',
      empty: 'Empty',
      totalLessons: 'Total Lessons',
      searchSections: 'Search sections...',
      allPrograms: 'All Programs',
      sortTitle: 'Sort: Title',
      sortProgram: 'Sort: Program',
      sortOrder: 'Sort: Order',
      sortLessons: 'Sort: Lessons',
      asc: 'Asc',
      desc: 'Desc',
      rows5: '5 rows',
      rows10: '10 rows',
      rows20: '20 rows',
      rows50: '50 rows',
      section: 'Section',
      program: 'Program',
      order: 'Order',
      lessons: 'Lessons',
      status: 'Status',
      actions: 'Actions',
      loading: 'Loading sections...',
      noResults: 'No sections found.',
      showing: 'Showing',
      of: 'of',
      filtered: 'filtered',
      totalLoaded: 'Total loaded',
      page: 'Page',
      prev: 'Prev',
      next: 'Next',
    }
  }, [language])

  const [sections, setSections] = useState([])
  const [programs, setPrograms] = useState([])
  const [search, setSearch] = useState('')
  const [programFilter, setProgramFilter] = useState('all')
  const [sortBy, setSortBy] = useState('title')
  const [sortDirection, setSortDirection] = useState('asc')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [deletingSectionId, setDeletingSectionId] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [sectionsResult, programsResult] = await Promise.all([
          fetchAdminSections(),
          fetchAdminPrograms(),
        ])

        const rawSections = sectionsResult?.data?.data || sectionsResult?.data || sectionsResult || []
        const rawPrograms = programsResult?.data?.data || programsResult?.data || programsResult || []
        setSections(Array.isArray(rawSections) ? rawSections : [])
        setPrograms(Array.isArray(rawPrograms) ? rawPrograms : [])
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || 'Failed to load sections.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (!statusMessage) return undefined
    const timeoutId = setTimeout(() => setStatusMessage(''), 3000)
    return () => clearTimeout(timeoutId)
  }, [statusMessage])

  const programsById = useMemo(() => {
    return programs.reduce((acc, program) => {
      acc[String(program.id)] = getProgramTitle(program)
      return acc
    }, {})
  }, [programs])

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase()

    const base = sections.filter((section) => {
      if (programFilter !== 'all' && String(section?.program_id) !== programFilter) {
        return false
      }

      if (!query) return true

      const haystack = [
        getSectionTitle(section),
        getSectionDescription(section),
        programsById[String(section?.program_id)] || '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })

    const sorted = [...base].sort((a, b) => {
      const valueA = getSortValue(a, programsById, sortBy)
      const valueB = getSortValue(b, programsById, sortBy)
      const result = compareValues(valueA, valueB)
      return sortDirection === 'asc' ? result : -result
    })

    return sorted
  }, [sections, search, programFilter, sortBy, sortDirection, programsById])

  const totalFiltered = filteredSections.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * rowsPerPage
  const endIndex = Math.min(startIndex + rowsPerPage, totalFiltered)
  const pageSections = filteredSections.slice(startIndex, startIndex + rowsPerPage)

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, programFilter, sortBy, sortDirection, rowsPerPage])

  const metrics = useMemo(() => {
    const total = sections.length
    const populated = sections.filter((s) => Number(s?.lessons_count ?? 0) > 0).length
    const empty = total - populated
    const totalLessons = sections.reduce((sum, item) => sum + Number(item?.lessons_count ?? 0), 0)
    return { total, populated, empty, totalLessons }
  }, [sections])

  const handleDeleteSection = async (section) => {
    if (!section?.id) return
    const shouldDelete = globalThis.confirm(
      `Delete section "${getSectionTitle(section)}"? This action cannot be undone.`
    )
    if (!shouldDelete) return

    setDeletingSectionId(section.id)
    setError('')
    setStatusMessage('')

    try {
      await deleteAdminSection(section.id)
      setSections((prev) => prev.filter((item) => item.id !== section.id))
      setStatusMessage('Section deleted successfully.')
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete section.'
      setError(message)
    } finally {
      setDeletingSectionId(null)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button onClick={() => navigate('/sections/edit')}>
            <Plus size={18} />
            {copy.newSection}
          </Button>
        }
      />

      {statusMessage ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          {statusMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={copy.totalSections} value={String(metrics.total)} variant="info" />
        <MetricCard label={copy.populated} value={String(metrics.populated)} variant="success" />
        <MetricCard label={copy.empty} value={String(metrics.empty)} variant="warning" />
        <MetricCard label={copy.totalLessons} value={String(metrics.totalLessons)} variant="secondary" />
      </section>

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 xl:grid-cols-[2fr_1.2fr_1fr_auto_auto]">
            <Input
              placeholder={copy.searchSections}
              leftIcon={<Search size={18} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
              <option value="all">{copy.allPrograms}</option>
              {programs.map((program) => (
                <option key={program.id} value={String(program.id)}>
                  {getProgramTitle(program)}
                </option>
              ))}
            </Select>

            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="title">{copy.sortTitle}</option>
              <option value="program">{copy.sortProgram}</option>
              <option value="sort_order">{copy.sortOrder}</option>
              <option value="lessons_count">{copy.sortLessons}</option>
            </Select>

            <Button
              variant="outline"
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            >
              <ArrowUpAZ size={18} />
              {sortDirection === 'asc' ? copy.asc : copy.desc}
            </Button>

            <Select
              value={String(rowsPerPage)}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
            >
              <option value="5">{copy.rows5}</option>
              <option value="10">{copy.rows10}</option>
              <option value="20">{copy.rows20}</option>
              <option value="50">{copy.rows50}</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div
          className={`grid ${SECTIONS_TABLE_GRID} gap-3 bg-[var(--color-surface-muted)] px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]`}
        >
          <div>{copy.section}</div>
          <div>{copy.program}</div>
          <div>{copy.order}</div>
          <div>{copy.lessons}</div>
          <div>{copy.status}</div>
          <div className="text-right">{copy.actions}</div>
        </div>

        {isLoading ? (
          <div className="px-6 py-10 text-[var(--color-text-muted)]">{copy.loading}</div>
        ) : totalFiltered === 0 ? (
          <div className="px-6 py-10 text-[var(--color-text-muted)]">{copy.noResults}</div>
        ) : (
          pageSections.map((section) => (
            <SectionRow
              key={section.id}
              section={section}
              labels={copy}
              programName={programsById[String(section?.program_id)] || '-'}
              onEdit={(selectedSection) => navigate(`/sections/edit?id=${selectedSection.id}`)}
              onDelete={handleDeleteSection}
              isDeleting={deletingSectionId === section.id}
            />
          ))
        )}

        <div className="flex flex-col gap-4 border-t border-[var(--color-border)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <span>
              {copy.showing} <b>{totalFiltered === 0 ? 0 : startIndex + 1}</b>-<b>{endIndex}</b> {copy.of}{' '}
              <b>{totalFiltered}</b> {copy.filtered}
            </span>
            <span className="hidden text-[var(--color-border)] lg:inline">|</span>
            <span>
              {copy.totalLoaded}: <b>{sections.length}</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage <= 1}
            >
              <ChevronLeft size={16} />
              {copy.prev}
            </Button>

            <span className="min-w-[88px] text-center text-sm text-[var(--color-text-muted)]">
              {copy.page} <b>{safeCurrentPage}</b> / <b>{totalPages}</b>
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage >= totalPages}
            >
              {copy.next}
              <ChevronLeft size={16} className="rotate-180" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
