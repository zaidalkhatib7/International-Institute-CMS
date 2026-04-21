import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpAZ,
  BookOpen,
  ChevronLeft,
  ChevronRight,
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
import {
  deleteAdminLesson,
  fetchAdminLessons,
  fetchAdminSections,
} from '../services/lessonsService'
import { getCurrentLanguage, readLocalizedValue } from '../../../utils/localization'

const LESSONS_TABLE_GRID =
  'grid-cols-[minmax(280px,2.2fr)_minmax(220px,1.8fr)_110px_110px_120px_92px]'

function readLocalized(value) {
  return readLocalizedValue(value)
}

function getSectionTitle(section) {
  return readLocalized(section?.title) || `Section ${section?.id ?? ''}`.trim()
}

function getLessonTitle(lesson) {
  return readLocalized(lesson?.title) || 'Untitled Lesson'
}

function getLessonTextPreview(lesson) {
  return readLocalized(lesson?.text_content) || 'No content preview'
}

function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function getSortValue(lesson, sectionsById, sortBy) {
  if (sortBy === 'section') {
    return sectionsById[String(lesson?.course_section_id)] || '-'
  }
  if (sortBy === 'type') return lesson?.type || ''
  if (sortBy === 'sort_order') return Number(lesson?.sort_order ?? 0)
  if (sortBy === 'duration') return Number(lesson?.video_duration_minutes ?? 0)
  return getLessonTitle(lesson)
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

function LessonRow({ lesson, sectionName, onEdit, onDelete, isDeleting, labels }) {
  const title = getLessonTitle(lesson)
  const preview = getLessonTextPreview(lesson)
  const type = lesson?.type || 'text'
  const duration = lesson?.video_duration_minutes ?? '-'
  const sortOrder = lesson?.sort_order ?? '-'

  return (
    <div
      className={`grid ${LESSONS_TABLE_GRID} items-center gap-3 border-t border-[var(--color-border)] px-6 py-5`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <BookOpen size={18} />
        </div>
        <div>
          <h4 className="text-xl font-semibold text-[var(--color-text)]">{title}</h4>
          <p className="mt-1 max-w-[320px] truncate text-sm text-[var(--color-text-muted)]">
            {preview}
          </p>
        </div>
      </div>

      <div className="truncate text-lg text-[var(--color-text-body,#43474D)]">{sectionName}</div>

      <div>
        <Badge variant={type === 'video' ? 'info' : type === 'both' ? 'secondary' : 'neutral'}>
          {labels.typeLabels[type] || type}
        </Badge>
      </div>

      <div className="text-base text-[var(--color-text-body,#43474D)]">{duration}</div>
      <div className="text-base font-semibold text-[var(--color-text)]">{sortOrder}</div>

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-black/5"
          onClick={() => onEdit(lesson)}
        >
          <Pencil size={16} />
        </button>

        <button
          type="button"
          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onDelete(lesson)}
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

export default function LessonsPage() {
  const navigate = useNavigate()
  const language = getCurrentLanguage()
  const copy = useMemo(() => {
    if (language === 'ar') {
      return {
        title: 'الدروس',
        description: 'إنشاء وتنظيم وإدارة محتوى الدروس عبر جميع الأقسام.',
        newLesson: 'درس جديد',
        totalLessons: 'إجمالي الدروس',
        textLessons: 'الدروس النصية',
        videoLessons: 'دروس الفيديو',
        hybridLessons: 'الدروس المختلطة',
        searchLessons: 'ابحث في الدروس...',
        allSections: 'كل الأقسام',
        allTypes: 'كل الأنواع',
        typeText: 'نصي',
        typeVideo: 'فيديو',
        typeBoth: 'كلاهما',
        sortTitle: 'الترتيب: العنوان',
        sortSection: 'الترتيب: القسم',
        sortType: 'الترتيب: النوع',
        sortOrder: 'الترتيب: الترتيب',
        sortDuration: 'الترتيب: المدة',
        asc: 'تصاعدي',
        desc: 'تنازلي',
        lesson: 'الدرس',
        section: 'القسم',
        type: 'النوع',
        duration: 'المدة',
        order: 'الترتيب',
        actions: 'الإجراءات',
        loading: 'جاري تحميل الدروس...',
        noResults: 'لا توجد دروس.',
        showing: 'عرض',
        of: 'من',
        filtered: 'مفلتر',
        totalLoaded: 'الإجمالي المحمل',
        rows: 'صفوف',
        page: 'الصفحة',
        prev: 'السابق',
        next: 'التالي',
        typeLabels: { text: 'نصي', video: 'فيديو', both: 'مختلط' },
      }
    }
    if (language === 'nl') {
      return {
        title: 'Lessen',
        description: 'Maak, organiseer en beheer lesinhoud over alle secties.',
        newLesson: 'Nieuwe les',
        totalLessons: 'Totaal lessen',
        textLessons: 'Tekstlessen',
        videoLessons: 'Videolessen',
        hybridLessons: 'Hybride lessen',
        searchLessons: 'Zoek lessen...',
        allSections: 'Alle secties',
        allTypes: 'Alle types',
        typeText: 'Tekst',
        typeVideo: 'Video',
        typeBoth: 'Beide',
        sortTitle: 'Sorteren: Titel',
        sortSection: 'Sorteren: Sectie',
        sortType: 'Sorteren: Type',
        sortOrder: 'Sorteren: Volgorde',
        sortDuration: 'Sorteren: Duur',
        asc: 'Oplopend',
        desc: 'Aflopend',
        lesson: 'Les',
        section: 'Sectie',
        type: 'Type',
        duration: 'Duur',
        order: 'Volgorde',
        actions: 'Acties',
        loading: 'Lessen laden...',
        noResults: 'Geen lessen gevonden.',
        showing: 'Toont',
        of: 'van',
        filtered: 'gefilterd',
        totalLoaded: 'Totaal geladen',
        rows: 'Rijen',
        page: 'Pagina',
        prev: 'Vorige',
        next: 'Volgende',
        typeLabels: { text: 'Tekst', video: 'Video', both: 'Hybride' },
      }
    }
    return {
      title: 'Lessons',
      description: 'Create, organize, and manage lesson content across all sections.',
      newLesson: 'New Lesson',
      totalLessons: 'Total Lessons',
      textLessons: 'Text Lessons',
      videoLessons: 'Video Lessons',
      hybridLessons: 'Hybrid Lessons',
      searchLessons: 'Search lessons...',
      allSections: 'All Sections',
      allTypes: 'All Types',
      typeText: 'Text',
      typeVideo: 'Video',
      typeBoth: 'Both',
      sortTitle: 'Sort: Title',
      sortSection: 'Sort: Section',
      sortType: 'Sort: Type',
      sortOrder: 'Sort: Order',
      sortDuration: 'Sort: Duration',
      asc: 'Asc',
      desc: 'Desc',
      lesson: 'Lesson',
      section: 'Section',
      type: 'Type',
      duration: 'Duration',
      order: 'Order',
      actions: 'Actions',
      loading: 'Loading lessons...',
      noResults: 'No lessons found.',
      showing: 'Showing',
      of: 'of',
      filtered: 'filtered',
      totalLoaded: 'Total loaded',
      rows: 'Rows',
      page: 'Page',
      prev: 'Prev',
      next: 'Next',
      typeLabels: { text: 'text', video: 'video', both: 'both' },
    }
  }, [language])

  const [lessons, setLessons] = useState([])
  const [sections, setSections] = useState([])
  const [search, setSearch] = useState('')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('title')
  const [sortDirection, setSortDirection] = useState('asc')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [deletingLessonId, setDeletingLessonId] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [lessonsResult, sectionsResult] = await Promise.all([
          fetchAdminLessons(),
          fetchAdminSections(),
        ])

        const rawLessons = lessonsResult?.data?.data || lessonsResult?.data || lessonsResult || []
        const rawSections = sectionsResult?.data?.data || sectionsResult?.data || sectionsResult || []

        setLessons(Array.isArray(rawLessons) ? rawLessons : [])
        setSections(Array.isArray(rawSections) ? rawSections : [])
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || 'Failed to load lessons.'
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

  const sectionsById = useMemo(() => {
    return sections.reduce((acc, section) => {
      acc[String(section.id)] = getSectionTitle(section)
      return acc
    }, {})
  }, [sections])

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLowerCase()

    const base = lessons.filter((lesson) => {
      if (sectionFilter !== 'all' && String(lesson?.course_section_id) !== sectionFilter) {
        return false
      }
      if (typeFilter !== 'all' && lesson?.type !== typeFilter) {
        return false
      }

      if (!query) return true

      const haystack = [
        getLessonTitle(lesson),
        getLessonTextPreview(lesson),
        sectionsById[String(lesson?.course_section_id)] || '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })

    const sorted = [...base].sort((a, b) => {
      const valueA = getSortValue(a, sectionsById, sortBy)
      const valueB = getSortValue(b, sectionsById, sortBy)
      const result = compareValues(valueA, valueB)
      return sortDirection === 'asc' ? result : -result
    })

    return sorted
  }, [lessons, search, sectionFilter, typeFilter, sortBy, sortDirection, sectionsById])

  const totalFiltered = filteredLessons.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * rowsPerPage
  const endIndex = Math.min(startIndex + rowsPerPage, totalFiltered)
  const pageLessons = filteredLessons.slice(startIndex, startIndex + rowsPerPage)

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, sectionFilter, typeFilter, sortBy, sortDirection, rowsPerPage])

  const metrics = useMemo(() => {
    const total = lessons.length
    const text = lessons.filter((l) => l.type === 'text').length
    const video = lessons.filter((l) => l.type === 'video').length
    const both = lessons.filter((l) => l.type === 'both').length
    return { total, text, video, both }
  }, [lessons])

  const handleDeleteLesson = async (lesson) => {
    if (!lesson?.id) return
    const shouldDelete = globalThis.confirm(
      `Delete lesson "${getLessonTitle(lesson)}"? This action cannot be undone.`
    )
    if (!shouldDelete) return

    setDeletingLessonId(lesson.id)
    setError('')
    setStatusMessage('')

    try {
      await deleteAdminLesson(lesson.id)
      setLessons((prev) => prev.filter((item) => item.id !== lesson.id))
      setStatusMessage('Lesson deleted successfully.')
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete lesson.'
      setError(message)
    } finally {
      setDeletingLessonId(null)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button onClick={() => navigate('/lessons/edit')}>
            <Plus size={18} />
            {copy.newLesson}
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
        <MetricCard label={copy.totalLessons} value={String(metrics.total)} variant="info" />
        <MetricCard label={copy.textLessons} value={String(metrics.text)} variant="neutral" />
        <MetricCard label={copy.videoLessons} value={String(metrics.video)} variant="success" />
        <MetricCard label={copy.hybridLessons} value={String(metrics.both)} variant="secondary" />
      </section>

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 xl:grid-cols-[2fr_1.2fr_1fr_1fr_auto]">
            <Input
              placeholder={copy.searchLessons}
              leftIcon={<Search size={18} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
              <option value="all">{copy.allSections}</option>
              {sections.map((section) => (
                <option key={section.id} value={String(section.id)}>
                  {getSectionTitle(section)}
                </option>
              ))}
            </Select>

            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">{copy.allTypes}</option>
              <option value="text">{copy.typeText}</option>
              <option value="video">{copy.typeVideo}</option>
              <option value="both">{copy.typeBoth}</option>
            </Select>

            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="title">{copy.sortTitle}</option>
              <option value="section">{copy.sortSection}</option>
              <option value="type">{copy.sortType}</option>
              <option value="sort_order">{copy.sortOrder}</option>
              <option value="duration">{copy.sortDuration}</option>
            </Select>

            <Button
              variant="outline"
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            >
              <ArrowUpAZ size={18} />
              {sortDirection === 'asc' ? copy.asc : copy.desc}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div
          className={`grid ${LESSONS_TABLE_GRID} gap-3 bg-[var(--color-surface-muted)] px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]`}
        >
          <div>{copy.lesson}</div>
          <div>{copy.section}</div>
          <div>{copy.type}</div>
          <div>{copy.duration}</div>
          <div>{copy.order}</div>
          <div className="text-right">{copy.actions}</div>
        </div>

        {isLoading ? (
          <div className="px-6 py-10 text-[var(--color-text-muted)]">{copy.loading}</div>
        ) : totalFiltered === 0 ? (
          <div className="px-6 py-10 text-[var(--color-text-muted)]">{copy.noResults}</div>
        ) : (
          pageLessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              labels={copy}
              sectionName={sectionsById[String(lesson?.course_section_id)] || '-'}
              onEdit={(selectedLesson) => navigate(`/lessons/edit?id=${selectedLesson.id}`)}
              onDelete={handleDeleteLesson}
              isDeleting={deletingLessonId === lesson.id}
            />
          ))
        )}

        <div className="flex flex-col gap-4 border-t border-[var(--color-border)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <span>
              {copy.showing} <b>{totalFiltered === 0 ? 0 : startIndex + 1}</b>-<b>{endIndex}</b>{' '}
              {copy.of} <b>{totalFiltered}</b> {copy.filtered}
            </span>
            <span className="hidden text-[var(--color-border)] lg:inline">|</span>
            <span>
              {copy.totalLoaded}: <b>{lessons.length}</b>
            </span>
            <span className="hidden text-[var(--color-border)] lg:inline">|</span>
            <label className="flex items-center gap-2">
              <span>{copy.rows}:</span>
              <select
                className="rounded-xl border border-[var(--color-border)] bg-white px-2 py-1 text-sm text-[var(--color-text)] outline-none"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
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
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
