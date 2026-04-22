import { useEffect, useMemo, useState } from 'react'
import { Search, TrendingUp, Users, BookOpen, Clock, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardContent, Input } from '../../../components/ui'
import { fetchAdminLessons } from '../../lessons/services/lessonsService'
import { fetchAdminPrograms } from '../../programs/services/programsService'
import { fetchAdminQuizzes } from '../../quizzes/services/quizzesService'
import { fetchAdminSections } from '../../sections/services/sectionsService'
import { fetchUsers } from '../../users/services/usersService'
import { getCurrentLanguage, getLocaleForLanguage, readLocalizedValue } from '../../../utils/localization'

function readLocalized(value, language) {
  return readLocalizedValue(value, language)
}

function getCollection(payload) {
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload)) return payload
  return []
}

function getTotal(payload, fallback = 0) {
  if (typeof payload?.data?.total === 'number') return payload.data.total
  if (typeof payload?.total === 'number') return payload.total
  const items = getCollection(payload)
  return items.length || fallback
}

function getProgramTitle(program, language, copy) {
  return readLocalized(program?.title, language) || copy.untitledProgram
}

function getSectionTitle(section, language, copy) {
  return (
    readLocalized(section?.title, language) ||
    `${copy.sectionLabel} ${section?.id ?? ''}`.trim()
  )
}

function getLessonTitle(lesson, language, copy) {
  return (
    readLocalized(lesson?.title, language) ||
    `${copy.lessonLabel} ${lesson?.id ?? ''}`.trim()
  )
}

function getQuizTitle(quiz, language, copy) {
  return readLocalized(quiz?.title, language) || `${copy.quizLabel} ${quiz?.id ?? ''}`.trim()
}

function getQuizSectionId(quiz) {
  return quiz?.section_id ?? quiz?.course_section_id ?? ''
}

function getCreatedAt(item) {
  return item?.created_at || item?.updated_at || null
}

function toTimestamp(value) {
  if (!value) return 0
  const date = new Date(value)
  const timestamp = date.getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function formatRelativeTime(value, language, copy) {
  const timestamp = toTimestamp(value)
  if (!timestamp) return copy.recently

  const diffSeconds = Math.round((timestamp - Date.now()) / 1000)
  const absSeconds = Math.abs(diffSeconds)

  let unit = 'second'
  let amount = diffSeconds

  if (absSeconds >= 31536000) {
    unit = 'year'
    amount = Math.round(diffSeconds / 31536000)
  } else if (absSeconds >= 2592000) {
    unit = 'month'
    amount = Math.round(diffSeconds / 2592000)
  } else if (absSeconds >= 86400) {
    unit = 'day'
    amount = Math.round(diffSeconds / 86400)
  } else if (absSeconds >= 3600) {
    unit = 'hour'
    amount = Math.round(diffSeconds / 3600)
  } else if (absSeconds >= 60) {
    unit = 'minute'
    amount = Math.round(diffSeconds / 60)
  }

  try {
    return new Intl.RelativeTimeFormat(getLocaleForLanguage(language), { numeric: 'auto' }).format(
      amount,
      unit
    )
  } catch {
    return copy.recently
  }
}

function StatCard({ title, value, change, icon, trend }) {
  const IconComponent = icon

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            {IconComponent ? <IconComponent size={24} /> : null}
          </div>
          <span
            className={`text-sm font-medium ${
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                ? 'text-red-600'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            {change}
          </span>
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-medium text-[var(--color-text-muted)]">{title}</h3>
          <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const language = getCurrentLanguage()
  const copy = useMemo(() => {
    if (language === 'ar') {
      return {
        title: 'لوحة التحكم',
        subtitle: 'مرحبًا بعودتك، المسؤول.',
        createProgram: '+ إنشاء برنامج',
        loadError: 'فشل تحميل بيانات لوحة التحكم من الـ API.',
        totalStudents: 'إجمالي الطلاب',
        activePrograms: 'البرامج النشطة',
        avgCompletion: 'متوسط الإنجاز',
        pendingReview: 'بانتظار المراجعة',
        live: 'مباشر',
        recentActivity: 'النشاط الأخير',
        viewAll: 'عرض الكل',
        loadingActivity: 'جارٍ تحميل النشاط...',
        noRecentActivity: 'لا يوجد نشاط حديث حتى الآن.',
        quickSearch: 'بحث سريع',
        quickSearchPlaceholder: 'ابحث عن المستخدمين أو البرامج أو الأقسام أو الدروس أو الاختبارات...',
        noMatchingRecords: 'لا توجد نتائج مطابقة.',
        users: 'المستخدمون',
        programs: 'البرامج',
        sections: 'الأقسام',
        lessons: 'الدروس',
        quizzes: 'الاختبارات',
        programUpdated: 'تم تحديث البرنامج',
        sectionUpdated: 'تم تحديث القسم',
        lessonUpdated: 'تم تحديث الدرس',
        quizUpdated: 'تم تحديث الاختبار',
        untitledProgram: 'برنامج بدون عنوان',
        sectionLabel: 'قسم',
        lessonLabel: 'درس',
        quizLabel: 'اختبار',
        idPrefix: 'معرّف',
        programPrefix: 'برنامج',
        sectionPrefix: 'قسم',
        recently: 'مؤخرًا',
        typeProgram: 'برنامج',
        typeSection: 'قسم',
        typeLesson: 'درس',
        typeQuiz: 'اختبار',
      }
    }
    if (language === 'nl') {
      return {
        title: 'Dashboard',
        subtitle: 'Welkom terug, administrator.',
        createProgram: '+ Programma maken',
        loadError: 'Dashboardgegevens laden uit de API is mislukt.',
        totalStudents: 'Totaal studenten',
        activePrograms: 'Actieve programma\'s',
        avgCompletion: 'Gem. voltooiing',
        pendingReview: 'Wacht op review',
        live: 'Live',
        recentActivity: 'Recente activiteit',
        viewAll: 'Alles bekijken',
        loadingActivity: 'Activiteit laden...',
        noRecentActivity: 'Nog geen recente activiteit beschikbaar.',
        quickSearch: 'Snel zoeken',
        quickSearchPlaceholder: 'Zoek gebruikers, programma\'s, secties, lessen of vraagbanken...',
        noMatchingRecords: 'Geen overeenkomende resultaten.',
        users: 'Gebruikers',
        programs: 'Programma\'s',
        sections: 'Secties',
        lessons: 'Lessen',
        quizzes: 'Vraagbanken',
        programUpdated: 'Programma bijgewerkt',
        sectionUpdated: 'Sectie bijgewerkt',
        lessonUpdated: 'Les bijgewerkt',
        quizUpdated: 'Vraagbank bijgewerkt',
        untitledProgram: 'Programma zonder titel',
        sectionLabel: 'Sectie',
        lessonLabel: 'Les',
        quizLabel: 'Vraagbank',
        idPrefix: 'ID',
        programPrefix: 'Programma',
        sectionPrefix: 'Sectie',
        recently: 'Recent',
        typeProgram: 'Programma',
        typeSection: 'Sectie',
        typeLesson: 'Les',
        typeQuiz: 'Vraagbank',
      }
    }
    return {
      title: 'Ahlulbayt Dashboard',
      subtitle: 'Welcome back, Administrator.',
      createProgram: '+ Create Program',
      loadError: 'Failed to load dashboard data from API.',
      totalStudents: 'Total Students',
      activePrograms: 'Active Programs',
      avgCompletion: 'Avg. Completion',
      pendingReview: 'Pending Review',
      live: 'Live',
      recentActivity: 'Recent Activity',
      viewAll: 'View All',
      loadingActivity: 'Loading activity...',
      noRecentActivity: 'No recent activity available yet.',
      quickSearch: 'Quick Search',
      quickSearchPlaceholder: 'Search users, programs, sections, lessons or question banks...',
      noMatchingRecords: 'No matching records.',
      users: 'Users',
      programs: 'Programs',
      sections: 'Sections',
      lessons: 'Lessons',
      quizzes: 'Question Banks',
      programUpdated: 'Program updated',
      sectionUpdated: 'Section updated',
      lessonUpdated: 'Lesson updated',
      quizUpdated: 'Question bank updated',
      untitledProgram: 'Untitled Program',
      sectionLabel: 'Section',
      lessonLabel: 'Lesson',
      quizLabel: 'Question Bank',
      idPrefix: 'ID',
      programPrefix: 'Program',
      sectionPrefix: 'Section',
      recently: 'Recently',
      typeProgram: 'Program',
      typeSection: 'Section',
      typeLesson: 'Lesson',
      typeQuiz: 'Question Bank',
    }
  }, [language])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({
    totalStudents: 0,
    activePrograms: 0,
    avgCompletion: 0,
    pendingReview: 0,
  })
  const [activity, setActivity] = useState([])
  const [searchIndex, setSearchIndex] = useState([])

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true)
      setError('')

      const [
        studentUsersResult,
        fallbackUsersResult,
        programsResult,
        sectionsResult,
        lessonsResult,
        quizzesResult,
      ] = await Promise.allSettled([
        fetchUsers({ per_page: 1, role: 'student' }),
        fetchUsers({ per_page: 1 }),
        fetchAdminPrograms(),
        fetchAdminSections(),
        fetchAdminLessons(),
        fetchAdminQuizzes(),
      ])

      const programs =
        programsResult.status === 'fulfilled' ? getCollection(programsResult.value) : []
      const sections =
        sectionsResult.status === 'fulfilled' ? getCollection(sectionsResult.value) : []
      const lessons =
        lessonsResult.status === 'fulfilled' ? getCollection(lessonsResult.value) : []
      const quizzes = quizzesResult.status === 'fulfilled' ? getCollection(quizzesResult.value) : []

      const studentTotal =
        studentUsersResult.status === 'fulfilled'
          ? getTotal(studentUsersResult.value)
          : fallbackUsersResult.status === 'fulfilled'
          ? getTotal(fallbackUsersResult.value)
          : 0

      const activePrograms = programs.filter((program) => program?.is_active).length
      const pendingReview = programs.filter((program) => !program?.is_active).length
      const sectionQuizIds = new Set(
        quizzes
          .map((quiz) => String(getQuizSectionId(quiz) ?? ''))
          .filter(Boolean)
      )
      const readySections = sections.filter(
        (section) =>
          Number(section?.lessons_count ?? 0) > 0 && sectionQuizIds.has(String(section?.id))
      ).length
      const avgCompletion = sections.length
        ? Math.round((readySections / sections.length) * 100)
        : 0

      const activityItems = [
        ...programs
          .map((program) => ({
            id: `program-${program.id}`,
            label: `${copy.programUpdated}: "${getProgramTitle(program, language, copy)}"`,
            timestamp: toTimestamp(getCreatedAt(program)),
            relative: formatRelativeTime(getCreatedAt(program), language, copy),
            onClick: () => navigate(`/programs/edit?id=${program.id}`),
          }))
          .filter((item) => item.timestamp),
        ...sections
          .map((section) => ({
            id: `section-${section.id}`,
            label: `${copy.sectionUpdated}: "${getSectionTitle(section, language, copy)}"`,
            timestamp: toTimestamp(getCreatedAt(section)),
            relative: formatRelativeTime(getCreatedAt(section), language, copy),
            onClick: () => navigate(`/sections/edit?id=${section.id}`),
          }))
          .filter((item) => item.timestamp),
        ...lessons
          .map((lesson) => ({
            id: `lesson-${lesson.id}`,
            label: `${copy.lessonUpdated}: "${getLessonTitle(lesson, language, copy)}"`,
            timestamp: toTimestamp(getCreatedAt(lesson)),
            relative: formatRelativeTime(getCreatedAt(lesson), language, copy),
            onClick: () => navigate(`/lessons/edit?id=${lesson.id}`),
          }))
          .filter((item) => item.timestamp),
        ...quizzes
          .map((quiz) => ({
            id: `quiz-${quiz.id}`,
            label: `${copy.quizUpdated}: "${getQuizTitle(quiz, language, copy)}"`,
            timestamp: toTimestamp(getCreatedAt(quiz)),
            relative: formatRelativeTime(getCreatedAt(quiz), language, copy),
            onClick: () => navigate(`/quizzes/edit?id=${quiz.id}`),
          }))
          .filter((item) => item.timestamp),
      ]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)

      const quickSearchItems = [
        ...programs.map((program) => ({
          id: `program-${program.id}`,
          type: copy.typeProgram,
          title: getProgramTitle(program, language, copy),
          subtitle: `${copy.idPrefix} ${program.id}`,
          onClick: () => navigate(`/programs/edit?id=${program.id}`),
        })),
        ...sections.map((section) => ({
          id: `section-${section.id}`,
          type: copy.typeSection,
          title: getSectionTitle(section, language, copy),
          subtitle: `${copy.programPrefix} ${section?.program_id ?? '-'}`,
          onClick: () => navigate(`/sections/edit?id=${section.id}`),
        })),
        ...lessons.map((lesson) => ({
          id: `lesson-${lesson.id}`,
          type: copy.typeLesson,
          title: getLessonTitle(lesson, language, copy),
          subtitle: `${copy.sectionPrefix} ${lesson?.course_section_id ?? '-'}`,
          onClick: () => navigate(`/lessons/edit?id=${lesson.id}`),
        })),
        ...quizzes.map((quiz) => ({
          id: `quiz-${quiz.id}`,
          type: copy.typeQuiz,
          title: getQuizTitle(quiz, language, copy),
          subtitle: `${copy.sectionPrefix} ${getQuizSectionId(quiz) || '-'}`,
          onClick: () => navigate(`/quizzes/edit?id=${quiz.id}`),
        })),
      ]

      setStats({
        totalStudents: studentTotal,
        activePrograms,
        avgCompletion,
        pendingReview,
      })
      setActivity(activityItems)
      setSearchIndex(quickSearchItems)

      if (
        studentUsersResult.status === 'rejected' &&
        fallbackUsersResult.status === 'rejected' &&
        programsResult.status === 'rejected' &&
        sectionsResult.status === 'rejected' &&
        lessonsResult.status === 'rejected' &&
        quizzesResult.status === 'rejected'
      ) {
        setError(copy.loadError)
      }

      setIsLoading(false)
    }

    loadDashboard()
  }, [navigate, language, copy])

  const filteredSearchItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []

    return searchIndex
      .filter((item) => {
        const haystack = [item.type, item.title, item.subtitle].join(' ').toLowerCase()
        return haystack.includes(query)
      })
      .slice(0, 6)
  }, [searchIndex, searchQuery])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[var(--color-text)]">{copy.title}</h1>
          <p className="mt-1 text-[var(--color-text-muted)]">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            className="!h-14 !rounded-[20px] !px-7 !text-lg"
            onClick={() => navigate('/programs/edit')}
          >
            {copy.createProgram}
          </Button>
          <div className="relative h-14 w-14 overflow-hidden rounded-[20px] border border-[var(--color-border)]">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={copy.totalStudents}
          value={isLoading ? '...' : String(stats.totalStudents)}
          change={copy.live}
          icon={Users}
          trend="neutral"
        />
        <StatCard
          title={copy.activePrograms}
          value={isLoading ? '...' : String(stats.activePrograms)}
          change={copy.live}
          icon={BookOpen}
          trend="up"
        />
        <StatCard
          title={copy.avgCompletion}
          value={isLoading ? '...' : `${stats.avgCompletion}%`}
          change={copy.live}
          icon={TrendingUp}
          trend="up"
        />
        <StatCard
          title={copy.pendingReview}
          value={isLoading ? '...' : String(stats.pendingReview)}
          change={copy.live}
          icon={Clock}
          trend={stats.pendingReview > 0 ? 'down' : 'neutral'}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{copy.recentActivity}</h2>
              <Button variant="ghost" size="sm">{copy.viewAll}</Button>
            </div>
            <div className="mt-6 space-y-6">
              {isLoading ? (
                <p className="text-sm text-[var(--color-text-muted)]">{copy.loadingActivity}</p>
              ) : activity.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">{copy.noRecentActivity}</p>
              ) : (
                activity.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-center gap-4 rounded-xl text-left transition-colors hover:bg-black/5"
                  >
                    <div className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                    <div className="flex-1 py-1">
                      <p className="text-sm font-medium text-[var(--color-text)]">{item.label}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{item.relative}</p>
                    </div>
                    <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold">{copy.quickSearch}</h2>
            <div className="mt-6 space-y-4">
              <Input
                placeholder={copy.quickSearchPlaceholder}
                leftIcon={<Search size={20} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {searchQuery.trim() ? (
                <div className="space-y-2">
                  {filteredSearchItems.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]">{copy.noMatchingRecords}</p>
                  ) : (
                    filteredSearchItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.onClick}
                        className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-left transition-colors hover:bg-[var(--color-surface-muted)]"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            {item.title}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {item.type} - {item.subtitle}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: copy.users, path: '/users' },
                    { label: copy.programs, path: '/programs' },
                    { label: copy.sections, path: '/sections' },
                    { label: copy.lessons, path: '/lessons' },
                    { label: copy.quizzes, path: '/quizzes' },
                  ].map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-white"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
