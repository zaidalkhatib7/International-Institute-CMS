import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowUpAZ,
  BookOpenText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  MoreVertical,
  PauseCircle,
  Pencil,
  Plus,
  Search,
  Star,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  fetchAdminCategories,
  fetchAdminPrograms,
  setAdminProgramFeatured,
  toggleAdminProgramActive,
} from '../services/programsService'
import { getCurrentLanguage, readLocalizedValue } from '../../../utils/localization'

const PROGRAMS_TABLE_GRID =
  'grid-cols-[minmax(280px,2.2fr)_minmax(120px,1fr)_minmax(110px,0.9fr)_minmax(130px,0.95fr)_minmax(120px,0.95fr)_minmax(120px,0.95fr)_72px]'
const VISIBILITY_FILTERS = new Set(['all', 'featured', 'active', 'inactive'])

function readLocalized(value) {
  return readLocalizedValue(value)
}

function normalizeDisplayText(value) {
  return String(value ?? '').replace(/\u200B/g, '').trim()
}

function titleFromSlug(slug) {
  if (!slug) return ''
  return String(slug)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getCategoryLabel(category) {
  const localizedName = readLocalized(category?.name)
  return localizedName || category?.name || titleFromSlug(category?.slug)
}

function getProgramTitle(program) {
  return readLocalized(program?.title) || 'Untitled Program'
}

function getProgramShortDescription(program) {
  return readLocalized(program?.short_description) || 'No short description'
}

function getProgramCategoryName(program) {
  return program?.resolved_category_name || getCategoryLabel(program?.category) || '-'
}

function getProgramDuration(program) {
  const duration = normalizeDisplayText(readLocalized(program?.duration))
  if (!duration) return '-'
  if (!/[A-Za-z0-9\u0600-\u06FF]/.test(duration)) return '-'
  return duration
}

function parseVisibilityFilter(value) {
  const normalized = String(value || 'all').toLowerCase()
  return VISIBILITY_FILTERS.has(normalized) ? normalized : 'all'
}

function normalizeProgramsResponse(result) {
  if (Array.isArray(result?.data?.data)) return result.data.data
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result)) return result
  return []
}

function compareSortValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }

  return String(a).localeCompare(String(b), undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function getSortValue(program, sortBy) {
  switch (sortBy) {
    case 'category':
      return getProgramCategoryName(program)
    case 'duration':
      return getProgramDuration(program)
    case 'price_points':
      return Number(program?.price_points ?? 0)
    case 'is_featured':
      return Number(Boolean(program?.is_featured))
    case 'is_active':
      return Number(Boolean(program?.is_active))
    case 'title':
    default:
      return getProgramTitle(program)
  }
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

function ToggleCell({
  checked,
  onToggle,
  disabled,
  checkedText,
  uncheckedText,
  checkedClassName,
  uncheckedClassName,
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`inline-flex h-7 min-w-[74px] items-center justify-center rounded-full px-2 text-[10px] font-semibold leading-none transition-all duration-200 ${
        checked ? checkedClassName : uncheckedClassName
      } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      {checked ? checkedText : uncheckedText}
    </button>
  )
}

function ProgramRow({
  program,
  onEdit,
  onToggleActive,
  onToggleFeatured,
  isTogglingActive,
  isTogglingFeatured,
  labels,
}) {
  const title = getProgramTitle(program)
  const description = getProgramShortDescription(program)
  const categoryName = getProgramCategoryName(program)
  const duration = getProgramDuration(program)
  const isBusy = isTogglingActive || isTogglingFeatured

  return (
    <div
      className={`grid ${PROGRAMS_TABLE_GRID} items-center gap-3 border-t border-[var(--color-border)] px-6 py-5`}
    >
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-[var(--color-primary)]/10" />
        <div>
          <h4 className="text-[1.75rem] font-semibold leading-tight text-[var(--color-text)]">
            {title}
          </h4>
          <p className="mt-1 max-w-[320px] truncate text-sm text-[var(--color-text-muted)]">
            {description}
          </p>
        </div>
      </div>

      <div className="truncate text-lg text-[var(--color-text-body,#43474D)]">{categoryName}</div>
      <div className="truncate text-lg text-[var(--color-text-body,#43474D)]">{duration}</div>

      <div className="text-lg font-semibold text-[var(--color-text)]">
        {program.price_points ?? 0} II Points
      </div>

      <ToggleCell
        checked={Boolean(program.is_featured)}
        onToggle={() => onToggleFeatured(program)}
        disabled={isBusy}
        checkedText={labels.featured}
        uncheckedText={labels.standard}
        checkedClassName="bg-[var(--color-secondary)] text-[var(--color-accent-dark,#765A1F)] shadow-[0_0_0_1px_rgba(209,162,70,0.35),0_8px_22px_rgba(209,162,70,0.35)]"
        uncheckedClassName="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
      />

      <ToggleCell
        checked={Boolean(program.is_active)}
        onToggle={() => onToggleActive(program)}
        disabled={isBusy}
        checkedText={labels.active}
        uncheckedText={labels.inactive}
        checkedClassName="bg-[#DCFCE7] text-[#166534] shadow-[0_0_0_1px_rgba(34,197,94,0.3),0_8px_22px_rgba(34,197,94,0.28)]"
        uncheckedClassName="bg-[#FEE2E2] text-[#991B1B] shadow-[inset_0_0_0_1px_rgba(248,113,113,0.35)]"
      />

      <div className="flex items-center justify-end gap-1">
        <button
          className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-black/5"
          onClick={() => onEdit(program)}
          type="button"
        >
          <Pencil size={16} />
        </button>

        <button
          className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-black/5"
          type="button"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  )
}

export default function ProgramsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const language = getCurrentLanguage()
  const copy = useMemo(() => {
    if (language === 'ar') {
      return {
        title: 'البرامج',
        description: 'إدارة البرامج الأكاديمية والتسعير والظهور وحالة النشر.',
        viewCategories: 'عرض التصنيفات',
        newProgram: 'برنامج جديد',
        totalPrograms: 'إجمالي البرامج',
        activePrograms: 'البرامج النشطة',
        featuredPrograms: 'البرامج المميزة',
        inactivePrograms: 'البرامج غير النشطة',
        searchPrograms: 'ابحث في البرامج...',
        allCategories: 'كل التصنيفات',
        allPrograms: 'كل البرامج',
        featured: 'مميز',
        active: 'نشط',
        inactive: 'غير نشط',
        standard: 'عادي',
        sortTitle: 'الترتيب: العنوان',
        sortCategory: 'الترتيب: التصنيف',
        sortDuration: 'الترتيب: المدة',
        sortPrice: 'الترتيب: النقاط',
        sortVisibility: 'الترتيب: الظهور',
        sortStatus: 'الترتيب: الحالة',
        asc: 'تصاعدي',
        desc: 'تنازلي',
        program: 'البرنامج',
        category: 'التصنيف',
        duration: 'المدة',
        price: 'السعر',
        visibility: 'الظهور',
        status: 'الحالة',
        actions: 'الإجراءات',
        loadingPrograms: 'جاري تحميل البرامج...',
        noProgramsFound: 'لا توجد برامج.',
        showing: 'عرض',
        of: 'من',
        filtered: 'مفلتر',
        totalLoaded: 'الإجمالي المحمل',
        rows: 'صفوف',
        prev: 'السابق',
        next: 'التالي',
      }
    }
    if (language === 'nl') {
      return {
        title: 'Programma\'s',
        description: 'Beheer academische programma\'s, prijzen, zichtbaarheid en publicatiestatus.',
        viewCategories: 'Categorieen bekijken',
        newProgram: 'Nieuw programma',
        totalPrograms: 'Totaal programma\'s',
        activePrograms: 'Actieve programma\'s',
        featuredPrograms: 'Uitgelichte programma\'s',
        inactivePrograms: 'Inactieve programma\'s',
        searchPrograms: 'Zoek programma\'s...',
        allCategories: 'Alle categorieen',
        allPrograms: 'Alle programma\'s',
        featured: 'Uitgelicht',
        active: 'Actief',
        inactive: 'Inactief',
        standard: 'Standaard',
        sortTitle: 'Sorteren: Titel',
        sortCategory: 'Sorteren: Categorie',
        sortDuration: 'Sorteren: Duur',
        sortPrice: 'Sorteren: Punten',
        sortVisibility: 'Sorteren: Zichtbaarheid',
        sortStatus: 'Sorteren: Status',
        asc: 'Oplopend',
        desc: 'Aflopend',
        program: 'Programma',
        category: 'Categorie',
        duration: 'Duur',
        price: 'Prijs',
        visibility: 'Zichtbaarheid',
        status: 'Status',
        actions: 'Acties',
        loadingPrograms: 'Programma\'s laden...',
        noProgramsFound: 'Geen programma\'s gevonden.',
        showing: 'Toont',
        of: 'van',
        filtered: 'gefilterd',
        totalLoaded: 'Totaal geladen',
        rows: 'Rijen',
        prev: 'Vorige',
        next: 'Volgende',
      }
    }
    return {
      title: 'Programs',
      description: 'Manage academic programs, pricing, visibility, and publication status.',
      viewCategories: 'View Categories',
      newProgram: 'New Program',
      totalPrograms: 'Total Programs',
      activePrograms: 'Active Programs',
      featuredPrograms: 'Featured Programs',
      inactivePrograms: 'Inactive Programs',
      searchPrograms: 'Search programs...',
      allCategories: 'All Categories',
      allPrograms: 'All Programs',
      featured: 'Featured',
      active: 'Active',
      inactive: 'Inactive',
      standard: 'Standard',
      sortTitle: 'Sort: Title',
      sortCategory: 'Sort: Category',
      sortDuration: 'Sort: Duration',
      sortPrice: 'Sort: Price Points',
      sortVisibility: 'Sort: Visibility',
      sortStatus: 'Sort: Status',
      asc: 'Asc',
      desc: 'Desc',
      program: 'Program',
      category: 'Category',
      duration: 'Duration',
      price: 'Price',
      visibility: 'Visibility',
      status: 'Status',
      actions: 'Actions',
      loadingPrograms: 'Loading programs...',
      noProgramsFound: 'No programs found.',
      showing: 'Showing',
      of: 'of',
      filtered: 'filtered',
      totalLoaded: 'Total loaded',
      rows: 'Rows',
      prev: 'Prev',
      next: 'Next',
    }
  }, [language])

  const [allPrograms, setAllPrograms] = useState([])
  const [search, setSearch] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState(() =>
    parseVisibilityFilter(searchParams.get('visibility'))
  )
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('title')
  const [sortDirection, setSortDirection] = useState('asc')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [togglingState, setTogglingState] = useState({
    programId: null,
    type: '',
  })

  const loadPrograms = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }
    setError('')

    try {
      const [programsResult, categoriesResult] = await Promise.all([
        fetchAdminPrograms(),
        fetchAdminCategories(),
      ])
      const normalizedPrograms = normalizeProgramsResponse(programsResult)
      const rawCategories =
        categoriesResult?.data?.data || categoriesResult?.data || categoriesResult || []
      const normalizedCategories = Array.isArray(rawCategories) ? rawCategories : []

      const categoryNameById = normalizedCategories.reduce((acc, category) => {
        const label = getCategoryLabel(category)
        if (category?.id && label) {
          acc[String(category.id)] = label
        }
        return acc
      }, {})

      const enrichedPrograms = normalizedPrograms.map((program) => {
        const categoryId =
          program?.program_category_id ||
          program?.category_id ||
          program?.category?.id ||
          null

        return {
          ...program,
          resolved_category_name:
            getCategoryLabel(program?.category) ||
            (categoryId ? categoryNameById[String(categoryId)] : '') ||
            '-',
        }
      })

      setAllPrograms(enrichedPrograms)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load programs.'
      setError(message)
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    loadPrograms()
  }, [loadPrograms])

  useEffect(() => {
    const visibilityFromQuery = parseVisibilityFilter(searchParams.get('visibility'))
    setVisibilityFilter(visibilityFromQuery)
  }, [searchParams])

  useEffect(() => {
    if (!statusMessage) return undefined

    const timeoutId = setTimeout(() => {
      setStatusMessage('')
    }, 3000)

    return () => clearTimeout(timeoutId)
  }, [statusMessage])

  const availableCategories = useMemo(() => {
    return Array.from(
      new Set(
        allPrograms
          .map((program) => getProgramCategoryName(program))
          .filter((name) => name && name !== '-')
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [allPrograms])

  const filteredPrograms = useMemo(() => {
    const searchQuery = search.trim().toLowerCase()

    const base = allPrograms.filter((program) => {
      if (visibilityFilter === 'featured' && !program.is_featured) return false
      if (visibilityFilter === 'active' && !program.is_active) return false
      if (visibilityFilter === 'inactive' && program.is_active) return false

      if (categoryFilter !== 'all' && getProgramCategoryName(program) !== categoryFilter) {
        return false
      }

      if (!searchQuery) return true

      const haystack = [
        getProgramTitle(program),
        getProgramShortDescription(program),
        getProgramCategoryName(program),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(searchQuery)
    })

    const sorted = [...base].sort((a, b) => {
      const valueA = getSortValue(a, sortBy)
      const valueB = getSortValue(b, sortBy)
      const result = compareSortValues(valueA, valueB)
      return sortDirection === 'asc' ? result : -result
    })

    return sorted
  }, [allPrograms, categoryFilter, search, sortBy, sortDirection, visibilityFilter])

  const totalFiltered = filteredPrograms.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * rowsPerPage
  const endIndex = Math.min(startIndex + rowsPerPage, totalFiltered)
  const pagePrograms = filteredPrograms.slice(startIndex, startIndex + rowsPerPage)

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, visibilityFilter, categoryFilter, sortBy, sortDirection, rowsPerPage])

  const handleToggleActive = async (program) => {
    if (!program?.id || togglingState.programId === program.id) {
      return
    }

    setTogglingState({
      programId: program.id,
      type: 'active',
    })
    setError('')
    setStatusMessage('')

    try {
      await toggleAdminProgramActive(program.id)
      await loadPrograms({ silent: true })
      setStatusMessage('Program active status updated successfully.')
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to update publication status.'
      setError(message)
    } finally {
      setTogglingState({
        programId: null,
        type: '',
      })
    }
  }

  const handleToggleFeatured = async (program) => {
    if (!program?.id || togglingState.programId === program.id) {
      return
    }

    setTogglingState({
      programId: program.id,
      type: 'featured',
    })
    setError('')
    setStatusMessage('')

    try {
      await setAdminProgramFeatured(program.id, !program.is_featured)
      await loadPrograms({ silent: true })
      setStatusMessage('Program visibility updated successfully.')
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to update visibility.'
      setError(message)
    } finally {
      setTogglingState({
        programId: null,
        type: '',
      })
    }
  }

  const metrics = useMemo(() => {
    const total = allPrograms.length
    const active = allPrograms.filter((p) => p.is_active).length
    const featured = allPrograms.filter((p) => p.is_featured).length
    const inactive = allPrograms.filter((p) => !p.is_active).length

    return { total, active, featured, inactive }
  }, [allPrograms])

  return (
    <div className="space-y-8">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/categories')}>
              <FolderTree size={18} />
              {copy.viewCategories}
            </Button>
            <Button onClick={() => navigate('/programs/edit')}>
              <Plus size={18} />
              {copy.newProgram}
            </Button>
          </>
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
        <MetricCard
          icon={<BookOpenText size={22} />}
          title={copy.totalPrograms}
          value={String(metrics.total)}
          badge="Live"
          badgeVariant="info"
        />
        <MetricCard
          icon={<CheckCircle2 size={22} />}
          title={copy.activePrograms}
          value={String(metrics.active)}
          badge="Live"
          badgeVariant="success"
        />
        <MetricCard
          icon={<Star size={22} />}
          title={copy.featuredPrograms}
          value={String(metrics.featured)}
          badge="Live"
          badgeVariant="secondary"
        />
        <MetricCard
          icon={<PauseCircle size={22} />}
          title={copy.inactivePrograms}
          value={String(metrics.inactive)}
          badge="Live"
          badgeVariant="danger"
        />
      </section>

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <Input
              placeholder={copy.searchPrograms}
              leftIcon={<Search size={18} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">{copy.allCategories}</option>
              {availableCategories.map((categoryName) => (
                <option key={categoryName} value={categoryName}>
                  {categoryName}
                </option>
              ))}
            </Select>

            <Select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)}>
              <option value="all">{copy.allPrograms}</option>
              <option value="featured">{copy.featured}</option>
              <option value="active">{copy.active}</option>
              <option value="inactive">{copy.inactive}</option>
            </Select>

            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="title">{copy.sortTitle}</option>
              <option value="category">{copy.sortCategory}</option>
              <option value="duration">{copy.sortDuration}</option>
              <option value="price_points">{copy.sortPrice}</option>
              <option value="is_featured">{copy.sortVisibility}</option>
              <option value="is_active">{copy.sortStatus}</option>
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
          className={`grid ${PROGRAMS_TABLE_GRID} gap-3 bg-[var(--color-surface-muted)] px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]`}
        >
          <div>{copy.program}</div>
          <div>{copy.category}</div>
          <div>{copy.duration}</div>
          <div>{copy.price}</div>
          <div>{copy.visibility}</div>
          <div>{copy.status}</div>
          <div className="text-right">{copy.actions}</div>
        </div>

        {isLoading ? (
          <div className="px-6 py-10 text-[var(--color-text-muted)]">{copy.loadingPrograms}</div>
        ) : totalFiltered === 0 ? (
          <div className="px-6 py-10 text-[var(--color-text-muted)]">{copy.noProgramsFound}</div>
        ) : (
          pagePrograms.map((program) => (
            <ProgramRow
              key={program.id}
              program={program}
              labels={copy}
              onEdit={(selectedProgram) => navigate(`/programs/edit?id=${selectedProgram.id}`)}
              onToggleActive={handleToggleActive}
              onToggleFeatured={handleToggleFeatured}
              isTogglingActive={
                togglingState.programId === program.id && togglingState.type === 'active'
              }
              isTogglingFeatured={
                togglingState.programId === program.id && togglingState.type === 'featured'
              }
            />
          ))
        )}

        <div className="flex flex-col gap-4 border-t border-[var(--color-border)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <span>
              {copy.showing} <b>{totalFiltered === 0 ? 0 : startIndex + 1}</b>-
              <b>{endIndex}</b> {copy.of} <b>{totalFiltered}</b> {copy.filtered}
            </span>
            <span className="hidden text-[var(--color-border)] lg:inline">|</span>
            <span>
              {copy.totalLoaded}: <b>{allPrograms.length}</b>
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
