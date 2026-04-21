import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpAZ,
  BookOpenText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  MoreVertical,
  Search,
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
import { fetchAdminCategories, fetchAdminPrograms } from '../../programs/services/programsService'
import { readLocalizedValue } from '../../../utils/localization'
import { getCurrentLanguage, getLocaleForLanguage, pickText } from '../../../utils/localization'

const CATEGORIES_TABLE_GRID =
  'grid-cols-[minmax(260px,2fr)_minmax(200px,1.4fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(150px,1fr)_72px]'

function readLocalized(value) {
  return readLocalizedValue(value)
}

function titleFromSlug(slug) {
  if (!slug) return 'Untitled Category'
  return String(slug)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getCategoryName(category) {
  const localized = readLocalized(category?.name)
  if (localized) return localized
  if (typeof category?.name === 'string' && category.name.trim()) return category.name
  return titleFromSlug(category?.slug)
}

function getCategoryDescription(category) {
  const localized = readLocalized(category?.description)
  if (localized) return localized
  return 'No description provided.'
}

function formatDate(value, language) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString(getLocaleForLanguage(language), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function compareSortValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function MetricCard({ icon, title, value, badge, badgeVariant = 'neutral' }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
            {icon}
          </div>
          {badge ? <Badge variant={badgeVariant}>{badge}</Badge> : null}
        </div>
        <p className="mt-5 text-sm font-medium text-[var(--color-text-muted)]">{title}</p>
        <h3 className="mt-2 text-5xl font-bold text-[var(--color-text)]">{value}</h3>
      </CardContent>
    </Card>
  )
}

function CategoryRow({ category, labels, language }) {
  const statusText = category.is_active ? labels.activeStatus : labels.inactiveStatus
  const programsText = `${category.programs_count ?? 0} ${labels.programsUnit}`

  return (
    <div
      className={`grid ${CATEGORIES_TABLE_GRID} items-center gap-3 border-t border-[var(--color-border)] px-6 py-5`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <Grid3X3 size={18} />
        </div>
        <div>
          <h4 className="text-xl font-semibold text-[var(--color-text)]">{getCategoryName(category)}</h4>
          <p className="mt-1 max-w-[320px] truncate text-sm text-[var(--color-text-muted)]">
            {getCategoryDescription(category)}
          </p>
        </div>
      </div>

      <div className="truncate text-lg text-[var(--color-text-body,#43474D)]">
        {category.slug || '-'}
      </div>

      <div className="text-base font-semibold text-[var(--color-text)]">{programsText}</div>

      <div>
        <Badge variant={category.is_active ? 'success' : 'danger'}>{statusText}</Badge>
      </div>

      <div className="text-base text-[var(--color-text-body,#43474D)]">
        {formatDate(category.created_at, language)}
      </div>

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-black/5"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  )
}

export default function CategoriesPage() {
  const navigate = useNavigate()
  const language = getCurrentLanguage()
  const copy = useMemo(() => {
    if (language === 'ar') {
      return {
        title: 'التصنيفات',
        description: 'إدارة هيكل تصنيف البرامج ومتابعة توزيع البرامج.',
        backToPrograms: 'العودة إلى البرامج',
        totalCategories: 'إجمالي التصنيفات',
        activeCategories: 'التصنيفات النشطة',
        mappedPrograms: 'البرامج المرتبطة',
        inactiveCategories: 'التصنيفات غير النشطة',
        searchCategories: 'ابحث في التصنيفات...',
        allStatus: 'كل الحالات',
        activeStatus: 'نشط',
        inactiveStatus: 'غير نشط',
        sortName: 'الترتيب: الاسم',
        sortSlug: 'الترتيب: الرابط',
        sortProgramCount: 'الترتيب: عدد البرامج',
        sortStatus: 'الترتيب: الحالة',
        sortCreated: 'الترتيب: تاريخ الإنشاء',
        asc: 'تصاعدي',
        desc: 'تنازلي',
        category: 'التصنيف',
        slug: 'الرابط',
        programs: 'البرامج',
        status: 'الحالة',
        created: 'تاريخ الإنشاء',
        actions: 'الإجراءات',
        loading: 'جاري تحميل التصنيفات...',
        noResults: 'لا توجد تصنيفات.',
        showing: 'عرض',
        of: 'من',
        filtered: 'مفلتر',
        totalLoaded: 'الإجمالي المحمل',
        prev: 'السابق',
        next: 'التالي',
        programsUnit: 'برنامج',
      }
    }

    if (language === 'nl') {
      return {
        title: 'Categorieen',
        description: 'Beheer de catalogusstructuur van categorieen en monitor programmaverdeling.',
        backToPrograms: 'Terug naar programma\'s',
        totalCategories: 'Totaal categorieen',
        activeCategories: 'Actieve categorieen',
        mappedPrograms: 'Gekoppelde programma\'s',
        inactiveCategories: 'Inactieve categorieen',
        searchCategories: 'Zoek categorieen...',
        allStatus: 'Alle statussen',
        activeStatus: 'Actief',
        inactiveStatus: 'Inactief',
        sortName: 'Sorteren: Naam',
        sortSlug: 'Sorteren: Slug',
        sortProgramCount: 'Sorteren: Aantal programma\'s',
        sortStatus: 'Sorteren: Status',
        sortCreated: 'Sorteren: Aanmaakdatum',
        asc: 'Oplopend',
        desc: 'Aflopend',
        category: 'Categorie',
        slug: 'Slug',
        programs: 'Programma\'s',
        status: 'Status',
        created: 'Aangemaakt',
        actions: 'Acties',
        loading: 'Categorieen laden...',
        noResults: 'Geen categorieen gevonden.',
        showing: 'Toont',
        of: 'van',
        filtered: 'gefilterd',
        totalLoaded: 'Totaal geladen',
        prev: 'Vorige',
        next: 'Volgende',
        programsUnit: 'programma(s)',
      }
    }

    return {
      title: 'Categories',
      description: 'Manage category catalog structure and monitor program distribution.',
      backToPrograms: 'Back to Programs',
      totalCategories: 'Total Categories',
      activeCategories: 'Active Categories',
      mappedPrograms: 'Mapped Programs',
      inactiveCategories: 'Inactive Categories',
      searchCategories: 'Search categories...',
      allStatus: 'All Status',
      activeStatus: 'Active',
      inactiveStatus: 'Inactive',
      sortName: 'Sort: Name',
      sortSlug: 'Sort: Slug',
      sortProgramCount: 'Sort: Program Count',
      sortStatus: 'Sort: Status',
      sortCreated: 'Sort: Created Date',
      asc: 'Asc',
      desc: 'Desc',
      category: 'Category',
      slug: 'Slug',
      programs: 'Programs',
      status: 'Status',
      created: 'Created',
      actions: 'Actions',
      loading: 'Loading categories...',
      noResults: 'No categories found.',
      showing: 'Showing',
      of: 'of',
      filtered: 'filtered',
      totalLoaded: 'Total loaded',
      prev: 'Prev',
      next: 'Next',
      programsUnit: 'program(s)',
    }
  }, [language])

  const [categories, setCategories] = useState([])
  const [programs, setPrograms] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [categoriesResult, programsResult] = await Promise.all([
          fetchAdminCategories(),
          fetchAdminPrograms(),
        ])

        const rawCategories =
          categoriesResult?.data?.data || categoriesResult?.data || categoriesResult || []
        const rawPrograms =
          programsResult?.data?.data || programsResult?.data || programsResult || []

        setCategories(Array.isArray(rawCategories) ? rawCategories : [])
        setPrograms(Array.isArray(rawPrograms) ? rawPrograms : [])
      } catch (err) {
        const message =
          err?.response?.data?.message || err?.message || 'Failed to load categories.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const categoriesWithCounts = useMemo(() => {
    const counts = new Map()

    programs.forEach((program) => {
      const categoryId = Number(program?.program_category_id ?? program?.category?.id ?? 0)
      if (!categoryId) return
      counts.set(categoryId, (counts.get(categoryId) || 0) + 1)
    })

    return categories.map((category) => ({
      ...category,
      programs_count: counts.get(Number(category?.id)) || 0,
    }))
  }, [categories, programs])

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase()

    const base = categoriesWithCounts.filter((category) => {
      if (statusFilter === 'active' && !category.is_active) return false
      if (statusFilter === 'inactive' && category.is_active) return false

      if (!query) return true

      const haystack = [
        getCategoryName(category),
        getCategoryDescription(category),
        category.slug || '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })

    const sorted = [...base].sort((a, b) => {
      let valueA
      let valueB

      if (sortBy === 'slug') {
        valueA = a.slug || ''
        valueB = b.slug || ''
      } else if (sortBy === 'programs_count') {
        valueA = Number(a.programs_count || 0)
        valueB = Number(b.programs_count || 0)
      } else if (sortBy === 'status') {
        valueA = Number(Boolean(a.is_active))
        valueB = Number(Boolean(b.is_active))
      } else if (sortBy === 'created_at') {
        valueA = new Date(a.created_at || 0).getTime()
        valueB = new Date(b.created_at || 0).getTime()
      } else {
        valueA = getCategoryName(a)
        valueB = getCategoryName(b)
      }

      const result = compareSortValues(valueA, valueB)
      return sortDirection === 'asc' ? result : -result
    })

    return sorted
  }, [categoriesWithCounts, search, sortBy, sortDirection, statusFilter])

  const totalFiltered = filteredCategories.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * rowsPerPage
  const endIndex = Math.min(startIndex + rowsPerPage, totalFiltered)
  const pageCategories = filteredCategories.slice(startIndex, startIndex + rowsPerPage)

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, sortBy, sortDirection, rowsPerPage])

  const metrics = useMemo(() => {
    const total = categoriesWithCounts.length
    const active = categoriesWithCounts.filter((item) => item.is_active).length
    const inactive = categoriesWithCounts.filter((item) => !item.is_active).length
    const mappedPrograms = categoriesWithCounts.reduce(
      (sum, item) => sum + Number(item.programs_count || 0),
      0
    )

    return { total, active, inactive, mappedPrograms }
  }, [categoriesWithCounts])

  return (
    <div className="space-y-8">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button variant="outline" onClick={() => navigate('/programs')}>
            <BookOpenText size={18} />
            {copy.backToPrograms}
          </Button>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Grid3X3 size={22} />}
          title={copy.totalCategories}
          value={String(metrics.total)}
          badge="Live"
          badgeVariant="info"
        />
        <MetricCard
          icon={<CheckCircle2 size={22} />}
          title={copy.activeCategories}
          value={String(metrics.active)}
          badge="Live"
          badgeVariant="success"
        />
        <MetricCard
          icon={<BookOpenText size={22} />}
          title={copy.mappedPrograms}
          value={String(metrics.mappedPrograms)}
          badge="Live"
          badgeVariant="secondary"
        />
        <MetricCard
          icon={<ArrowUpAZ size={22} />}
          title={copy.inactiveCategories}
          value={String(metrics.inactive)}
          badge="Live"
          badgeVariant="danger"
        />
      </section>

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <Input
              placeholder={copy.searchCategories}
              leftIcon={<Search size={18} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">{copy.allStatus}</option>
              <option value="active">{copy.activeStatus}</option>
              <option value="inactive">{copy.inactiveStatus}</option>
            </Select>

            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">{copy.sortName}</option>
              <option value="slug">{copy.sortSlug}</option>
              <option value="programs_count">{copy.sortProgramCount}</option>
              <option value="status">{copy.sortStatus}</option>
              <option value="created_at">{copy.sortCreated}</option>
            </Select>

            <Select value={String(rowsPerPage)} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
              <option value="5">5 rows</option>
              <option value="10">10 rows</option>
              <option value="20">20 rows</option>
              <option value="50">50 rows</option>
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
          className={`grid ${CATEGORIES_TABLE_GRID} gap-3 bg-[var(--color-surface-muted)] px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]`}
        >
          <div>{copy.category}</div>
          <div>{copy.slug}</div>
          <div>{copy.programs}</div>
          <div>{copy.status}</div>
          <div>{copy.created}</div>
          <div className="text-right">{copy.actions}</div>
        </div>

        {isLoading ? (
          <div className="px-6 py-10 text-[var(--color-text-muted)]">{copy.loading}</div>
        ) : totalFiltered === 0 ? (
          <div className="px-6 py-10 text-[var(--color-text-muted)]">{copy.noResults}</div>
        ) : (
          pageCategories.map((category) => (
            <CategoryRow key={category.id} category={category} labels={copy} language={language} />
          ))
        )}

        <div className="flex flex-col gap-4 border-t border-[var(--color-border)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-[var(--color-text-muted)]">
            {copy.showing} <b>{totalFiltered === 0 ? 0 : startIndex + 1}</b>-<b>{endIndex}</b>{' '}
            {copy.of} <b>{totalFiltered}</b> {copy.filtered}
            <span className="mx-2 text-[var(--color-border)]">|</span>
            {copy.totalLoaded}: <b>{categoriesWithCounts.length}</b>
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
              Page <b>{safeCurrentPage}</b> / <b>{totalPages}</b>
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
