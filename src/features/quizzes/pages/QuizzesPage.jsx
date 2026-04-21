import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpAZ,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
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
import { fetchAdminSections } from '../../sections/services/sectionsService'
import {
  deleteAdminQuiz,
  fetchAdminQuizById,
  fetchAdminQuizzes,
} from '../services/quizzesService'
import { getCurrentLanguage, readLocalizedValue } from '../../../utils/localization'

const QUIZZES_TABLE_GRID =
  'grid-cols-[minmax(280px,2.2fr)_minmax(220px,1.8fr)_120px_130px_130px_92px]'

function readLocalized(value) {
  return readLocalizedValue(value)
}

function getQuizTitle(quiz) {
  return readLocalized(quiz?.title) || 'Untitled Quiz'
}

function getSectionTitle(section) {
  return readLocalized(section?.title) || `Section ${section?.id ?? ''}`.trim()
}

function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function getSortValue(quiz, sectionsById, sortBy) {
  if (sortBy === 'section') return sectionsById[String(quiz?.course_section_id)] || '-'
  if (sortBy === 'pass_percentage') return Number(quiz?.pass_percentage ?? 0)
  if (sortBy === 'questions_count') return Number(quiz?.questions_count ?? 0)
  return getQuizTitle(quiz)
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

function QuizRow({ quiz, sectionName, onEdit, onDelete, isDeleting, labels }) {
  const title = getQuizTitle(quiz)
  const passPercentage = Number(quiz?.pass_percentage ?? 0)
  const questionsCount = quiz?.questions_count ?? '-'

  return (
    <div
      className={`grid ${QUIZZES_TABLE_GRID} items-center gap-3 border-t border-[var(--color-border)] px-6 py-5`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <FileQuestion size={18} />
        </div>
        <div>
          <h4 className="text-xl font-semibold text-[var(--color-text)]">{title}</h4>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Quiz ID: {quiz.id}</p>
        </div>
      </div>

      <div className="truncate text-lg text-[var(--color-text-body,#43474D)]">{sectionName}</div>
      <div className="text-base font-semibold text-[var(--color-text)]">{passPercentage}%</div>
      <div className="text-base text-[var(--color-text-body,#43474D)]">{questionsCount}</div>

      <div>
        <Badge variant={passPercentage >= 70 ? 'success' : 'warning'}>
          {passPercentage >= 70 ? labels.standardThreshold : labels.lowThreshold}
        </Badge>
      </div>

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-black/5"
          onClick={() => onEdit(quiz)}
        >
          <Pencil size={16} />
        </button>

        <button
          type="button"
          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onDelete(quiz)}
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

export default function QuizzesPage() {
  const navigate = useNavigate()
  const language = getCurrentLanguage()
  const copy = useMemo(() => {
    if (language === 'ar') {
      return {
        title: 'الاختبارات',
        description: 'إدارة اختبارات الأقسام ونسب النجاح ومجموعات الأسئلة.',
        newQuiz: 'اختبار جديد',
        totalQuizzes: 'إجمالي الاختبارات',
        standardThreshold: 'الحد القياسي',
        lowThreshold: 'حد منخفض',
        avgPass: 'متوسط النجاح %',
        searchQuizzes: 'ابحث في الاختبارات...',
        allSections: 'كل الأقسام',
        sortTitle: 'الترتيب: العنوان',
        sortSection: 'الترتيب: القسم',
        sortPass: 'الترتيب: نسبة النجاح',
        sortQuestions: 'الترتيب: الأسئلة',
        asc: 'تصاعدي',
        desc: 'تنازلي',
        rows5: '5 صفوف',
        rows10: '10 صفوف',
        rows20: '20 صفًا',
        rows50: '50 صفًا',
        quiz: 'الاختبار',
        section: 'القسم',
        pass: 'النجاح %',
        questions: 'الأسئلة',
        threshold: 'الحد',
        actions: 'الإجراءات',
        loading: 'جاري تحميل الاختبارات...',
        noResults: 'لا توجد اختبارات.',
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
        title: 'Quizzen',
        description: 'Beheer sectiequizzen, slagingsdrempels en vraagsets.',
        newQuiz: 'Nieuwe quiz',
        totalQuizzes: 'Totaal quizzen',
        standardThreshold: 'Standaarddrempel',
        lowThreshold: 'Lage drempel',
        avgPass: 'Gem. slagings% ',
        searchQuizzes: 'Zoek quizzen...',
        allSections: 'Alle secties',
        sortTitle: 'Sorteren: Titel',
        sortSection: 'Sorteren: Sectie',
        sortPass: 'Sorteren: Slagings%',
        sortQuestions: 'Sorteren: Vragen',
        asc: 'Oplopend',
        desc: 'Aflopend',
        rows5: '5 rijen',
        rows10: '10 rijen',
        rows20: '20 rijen',
        rows50: '50 rijen',
        quiz: 'Quiz',
        section: 'Sectie',
        pass: 'Slagings%',
        questions: 'Vragen',
        threshold: 'Drempel',
        actions: 'Acties',
        loading: 'Quizzen laden...',
        noResults: 'Geen quizzen gevonden.',
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
      title: 'Quizzes',
      description: 'Manage section quizzes, pass thresholds, and question sets.',
      newQuiz: 'New Quiz',
      totalQuizzes: 'Total Quizzes',
      standardThreshold: 'Standard Threshold',
      lowThreshold: 'Low Threshold',
      avgPass: 'Avg Pass %',
      searchQuizzes: 'Search quizzes...',
      allSections: 'All Sections',
      sortTitle: 'Sort: Title',
      sortSection: 'Sort: Section',
      sortPass: 'Sort: Pass %',
      sortQuestions: 'Sort: Questions',
      asc: 'Asc',
      desc: 'Desc',
      rows5: '5 rows',
      rows10: '10 rows',
      rows20: '20 rows',
      rows50: '50 rows',
      quiz: 'Quiz',
      section: 'Section',
      pass: 'Pass %',
      questions: 'Questions',
      threshold: 'Threshold',
      actions: 'Actions',
      loading: 'Loading quizzes...',
      noResults: 'No quizzes found.',
      showing: 'Showing',
      of: 'of',
      filtered: 'filtered',
      totalLoaded: 'Total loaded',
      page: 'Page',
      prev: 'Prev',
      next: 'Next',
    }
  }, [language])

  const [quizzes, setQuizzes] = useState([])
  const [sections, setSections] = useState([])
  const [search, setSearch] = useState('')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [sortBy, setSortBy] = useState('title')
  const [sortDirection, setSortDirection] = useState('asc')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [deletingQuizId, setDeletingQuizId] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [quizzesResult, sectionsResult] = await Promise.all([
          fetchAdminQuizzes(),
          fetchAdminSections(),
        ])
        const rawQuizzes = quizzesResult?.data?.data || quizzesResult?.data || quizzesResult || []
        const rawSections = sectionsResult?.data?.data || sectionsResult?.data || sectionsResult || []
        const normalizedQuizzes = Array.isArray(rawQuizzes) ? rawQuizzes : []
        setSections(Array.isArray(rawSections) ? rawSections : [])

        const quizzesWithQuestionCounts = await Promise.all(
          normalizedQuizzes.map(async (quiz) => {
            try {
              const quizDetailResult = await fetchAdminQuizById(quiz.id)
              const detail = quizDetailResult?.data?.data || quizDetailResult?.data || quizDetailResult
              const questionsCount = Array.isArray(detail?.questions)
                ? detail.questions.length
                : Number(quiz?.questions_count ?? 0)

              return {
                ...quiz,
                questions_count: questionsCount,
              }
            } catch {
              return {
                ...quiz,
                questions_count: Number(quiz?.questions_count ?? 0),
              }
            }
          })
        )

        setQuizzes(quizzesWithQuestionCounts)
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || 'Failed to load quizzes.'
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

  const filteredQuizzes = useMemo(() => {
    const query = search.trim().toLowerCase()

    const base = quizzes.filter((quiz) => {
      if (sectionFilter !== 'all' && String(quiz?.course_section_id) !== sectionFilter) {
        return false
      }

      if (!query) return true

      const haystack = [
        getQuizTitle(quiz),
        sectionsById[String(quiz?.course_section_id)] || '',
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
  }, [quizzes, search, sectionFilter, sortBy, sortDirection, sectionsById])

  const totalFiltered = filteredQuizzes.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * rowsPerPage
  const endIndex = Math.min(startIndex + rowsPerPage, totalFiltered)
  const pageQuizzes = filteredQuizzes.slice(startIndex, startIndex + rowsPerPage)

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, sectionFilter, sortBy, sortDirection, rowsPerPage])

  const metrics = useMemo(() => {
    const total = quizzes.length
    const standard = quizzes.filter((q) => Number(q?.pass_percentage ?? 0) >= 70).length
    const lowThreshold = total - standard
    const avgPassPercentage = total
      ? Math.round(
          quizzes.reduce((sum, item) => sum + Number(item?.pass_percentage ?? 0), 0) / total
        )
      : 0
    return { total, standard, lowThreshold, avgPassPercentage }
  }, [quizzes])

  const handleDeleteQuiz = async (quiz) => {
    if (!quiz?.id) return
    const shouldDelete = globalThis.confirm(
      `Delete quiz "${getQuizTitle(quiz)}"? This action cannot be undone.`
    )
    if (!shouldDelete) return

    setDeletingQuizId(quiz.id)
    setError('')
    setStatusMessage('')

    try {
      await deleteAdminQuiz(quiz.id)
      setQuizzes((prev) => prev.filter((item) => item.id !== quiz.id))
      setStatusMessage('Quiz deleted successfully.')
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete quiz.'
      setError(message)
    } finally {
      setDeletingQuizId(null)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button onClick={() => navigate('/quizzes/edit')}>
            <Plus size={18} />
            {copy.newQuiz}
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
        <MetricCard label={copy.totalQuizzes} value={String(metrics.total)} variant="info" />
        <MetricCard label={copy.standardThreshold} value={String(metrics.standard)} variant="success" />
        <MetricCard label={copy.lowThreshold} value={String(metrics.lowThreshold)} variant="warning" />
        <MetricCard label={copy.avgPass} value={`${metrics.avgPassPercentage}%`} variant="secondary" />
      </section>

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 xl:grid-cols-[2fr_1.2fr_1fr_auto_auto]">
            <Input
              placeholder={copy.searchQuizzes}
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

            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="title">{copy.sortTitle}</option>
              <option value="section">{copy.sortSection}</option>
              <option value="pass_percentage">{copy.sortPass}</option>
              <option value="questions_count">{copy.sortQuestions}</option>
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
          className={`grid ${QUIZZES_TABLE_GRID} gap-3 bg-[var(--color-surface-muted)] px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]`}
        >
          <div>{copy.quiz}</div>
          <div>{copy.section}</div>
          <div>{copy.pass}</div>
          <div>{copy.questions}</div>
          <div>{copy.threshold}</div>
          <div className="text-right">{copy.actions}</div>
        </div>

        {isLoading ? (
          <div className="px-6 py-10 text-[var(--color-text-muted)]">{copy.loading}</div>
        ) : totalFiltered === 0 ? (
          <div className="px-6 py-10 text-[var(--color-text-muted)]">{copy.noResults}</div>
        ) : (
          pageQuizzes.map((quiz) => (
            <QuizRow
              key={quiz.id}
              quiz={quiz}
              labels={copy}
              sectionName={sectionsById[String(quiz?.course_section_id)] || '-'}
              onEdit={(selectedQuiz) => navigate(`/quizzes/edit?id=${selectedQuiz.id}`)}
              onDelete={handleDeleteQuiz}
              isDeleting={deletingQuizId === quiz.id}
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
              {copy.totalLoaded}: <b>{quizzes.length}</b>
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
