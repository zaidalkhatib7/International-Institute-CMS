import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpAZ,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  FilterX,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  PageHeader,
  Select,
} from '../../../components/ui'
import Money from '../../../components/Money'
import { getCurrentLanguage } from '../../../utils/localization'
import { isMoney } from '../../../utils/money'
import { useAuthorization } from '../../auth/context/useAuthorization'
import { buildUsersCsv, walletBalances, walletCopy, walletMatchesFilter, walletSortValue } from '../domain/wallet'
import { createUser, fetchUsers } from '../services/usersService'

const USERS_TABLE_GRID = 'grid-cols-[minmax(260px,2fr)_minmax(240px,2.2fr)_1fr_1fr_1fr]'

function getRoleKey(role) {
  if (!role) return 'user'

  const normalized = String(role).toLowerCase()

  if (normalized === 'admin') return 'admin'
  if (normalized === 'trainer') return 'trainer'
  if (normalized === 'student') return 'student'
  return 'user'
}

function formatRoleLabel(role, language) {
  const roleKey = getRoleKey(role)

  if (language === 'ar') {
    if (roleKey === 'admin') return 'مدير'
    if (roleKey === 'trainer') return 'مدرب'
    if (roleKey === 'student') return 'متقدم'
    return 'مستخدم'
  }

  if (roleKey === 'admin') return 'Admin'
  if (roleKey === 'trainer') return 'Trainer'
  if (roleKey === 'student') return 'Applicant'
  return 'User'
}

function roleVariant(role) {
  if (role === 'admin') return 'success'
  if (role === 'trainer') return 'info'
  if (role === 'student') return 'warning'
  return 'neutral'
}

function getInitials(name) {
  if (!name) return 'NA'

  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

function formatDate(value, language) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const locale =
    language === 'ar' ? 'ar-EG' : 'en-GB'
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function getSortValue(user, sortBy, language) {
  if (sortBy === 'email') return user.email || ''
  if (sortBy === 'role') return formatRoleLabel(user.role, language)
  if (sortBy === 'created_at') return new Date(user.created_at || 0).getTime()
  // One balance at a time, by its integer of minor units: dollars and pounds are never compared or added.
  if (sortBy === 'wallet_usd' || sortBy === 'wallet_syp') return walletSortValue(user, sortBy)
  return user.name || ''
}

function getUsersPage(result) {
  const pageData = result?.data
  const items = Array.isArray(pageData?.data) ? pageData.data : []
  const lastPage = Math.max(1, Number(pageData?.last_page ?? 1))
  const total = Number(pageData?.total ?? items.length)
  return { items, total, lastPage, pageData }
}

function formatNumber(value, language) {
  const locale =
    language === 'ar' ? 'ar-EG' : 'en-US'
  return Number(value || 0).toLocaleString(locale)
}

function normalizeDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function matchesDateFilter(value, filter) {
  if (filter === 'all') return true
  const date = normalizeDate(value)
  if (!date) return false

  const now = new Date()
  if (filter === 'last30') {
    const minDate = new Date(now)
    minDate.setDate(now.getDate() - 30)
    return date >= minDate
  }

  if (filter === 'thisYear') {
    return date.getFullYear() === now.getFullYear()
  }

  return true
}

function UserRow({ user, language, copy, walletText, onOpenWorkspace, onTopUp, onDeduct }) {
  const roleKey = getRoleKey(user.role)
  const displayRole = formatRoleLabel(roleKey, language)

  return (
    <div className={`grid ${USERS_TABLE_GRID} items-center gap-4 border-t border-[var(--color-border)] px-8 py-6`}>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-lg font-semibold text-[var(--color-text)]">
          {getInitials(user.name)}
        </div>

        <div>
          <button type="button" onClick={() => onOpenWorkspace?.(user)} className="text-start text-xl font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline">{user.name}</button>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{user.office_registration_id || user.username || `ID: ICPC-${user.id}`}</p>
          <button type="button" onClick={() => onOpenWorkspace?.(user)} className="mt-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]">{copy.viewEdit}</button>
        </div>
      </div>

      <div className="truncate text-lg text-[var(--color-text-body,#43474D)]">{user.email || <span className="text-amber-700">{copy.onsiteNoEmail}</span>}</div>

      <div>
        <Badge variant={roleVariant(roleKey)}>{displayRole}</Badge>
      </div>

      <div className="text-base text-[var(--color-text-body,#43474D)]">
        {formatDate(user.created_at, language)}
      </div>

      <div className="text-xl font-semibold text-[var(--color-accent-dark,#765A1F)]">
        {/* Two balances, two lines: never added together (owner, 17 Oct 2026). */}
        <div className="space-y-1 text-base" aria-label={walletText.balances}>
          <div><Money value={walletBalances(user).usd} language={language} /></div>
          <div><Money value={walletBalances(user).syp} language={language} /></div>
        </div>
        {onTopUp || onDeduct ? <div className="mt-3 flex flex-wrap items-center gap-2">
          {onTopUp ? (
          <button
            type="button"
            onClick={() => onTopUp(user)}
            className="inline-flex h-9 min-w-[124px] items-center justify-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-[0_2px_10px_rgba(16,185,129,0.14)] transition-all hover:-translate-y-[1px] hover:bg-emerald-100 hover:shadow-[0_6px_16px_rgba(16,185,129,0.2)]"
          >
            <Plus size={13} strokeWidth={2.4} />
            {walletText.topUp}
          </button>
          ) : null}
          {onDeduct ? (
          <button
            type="button"
            onClick={() => onDeduct(user)}
            className="inline-flex h-9 min-w-[124px] items-center justify-center gap-1 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 shadow-[0_2px_10px_rgba(244,63,94,0.12)] transition-all hover:-translate-y-[1px] hover:bg-rose-100 hover:shadow-[0_6px_16px_rgba(244,63,94,0.18)]"
          >
            <Minus size={13} strokeWidth={2.4} />
            {walletText.deduct}
          </button>
          ) : null}
        </div> : null}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, hint, dark = false }) {
  return (
    <div
      className={`rounded-[28px] border p-8 ${
        dark ? 'bg-[var(--color-primary)] text-white' : 'bg-white'
      }`}
      style={{ borderColor: 'var(--color-border)' }}
    >
      <p
        className={`text-sm font-semibold uppercase tracking-[0.14em] ${
          dark ? 'text-white/70' : 'text-[var(--color-text-muted)]'
        }`}
      >
        {label}
      </p>

      <div className="mt-4 flex items-end gap-3">
        <h3 className={`text-5xl font-bold ${dark ? 'text-white' : 'text-[var(--color-text)]'}`}>
          {value}
        </h3>
        {hint ? (
          <p className={`pb-2 text-sm ${dark ? 'text-white/70' : 'text-[#16A34A]'}`}>{hint}</p>
        ) : null}
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { hasPermission } = useAuthorization()
  const canManageUsers = hasPermission('users.manage')
  const canManageWallet = hasPermission('finance.manage')
  const navigate = useNavigate()
  const location = useLocation()
  const language = getCurrentLanguage()
  const audience = location.pathname === '/users/website' ? 'website' : location.pathname === '/users/onsite' ? 'onsite' : 'administration'
  const audienceMeta = {
    administration: language === 'ar' ? { title: 'الموظفون والصلاحيات', description: 'إدارة الموظفين والمديرين والمقيّمين والمدربين وصلاحياتهم التشغيلية.', add: true } : { title: 'Staff & roles', description: 'Manage staff, administrators, assessors, trainers, and their operational permissions.', add: true },
    website: language === 'ar' ? { title: 'عملاء الموقع', description: 'الحسابات التي سجلت ذاتياً عبر الموقع وتدير خدماتها إلكترونياً.', add: false } : { title: 'Website clients', description: 'Self-service clients who registered online and manage their own website accounts.', add: false },
    onsite: language === 'ar' ? { title: 'عملاء المكتب', description: 'العملاء الذين تم تسجيلهم أو خدمتهم داخل مكتب ICPC.', add: true } : { title: 'On-site clients', description: 'Clients registered and assisted at an ICPC office. Staff manage their service journey here.', add: true },
  }[audience]
  const copy = useMemo(() => {
    if (language === 'ar') {
      return {
        title: 'المستخدمون',
        userAudience: 'نوع المستخدمين',
        description: 'مراجعة الحسابات المؤسسية وأرصدة المحافظ وتعيينات الأدوار.',
        searchPlaceholder: 'ابحث بالاسم أو البريد الإلكتروني أو الهاتف',
        allRoles: 'كل الأدوار',
        sortName: 'الترتيب: الاسم',
        sortEmail: 'الترتيب: البريد',
        sortRole: 'الترتيب: الدور',
        sortDate: 'الترتيب: التاريخ',
        sortWalletUsd: 'الترتيب: رصيد الدولار',
        sortWalletSyp: 'الترتيب: رصيد الليرة',
        asc: 'تصاعدي',
        desc: 'تنازلي',
        addUser: 'إضافة مستخدم',
        createUserTitle: 'إضافة مستخدم جديد',
        userName: 'الاسم',
        email: 'البريد الإلكتروني',
        phoneNumber: 'رقم الهاتف',
        password: 'كلمة المرور',
        roleLabel: 'الدور',
        save: 'حفظ',
        cancel: 'إلغاء',
        creating: 'جارٍ الإنشاء...',
        createdSuccess: 'تم إنشاء المستخدم بنجاح.',
        createFailed: 'فشل إنشاء المستخدم.',
        totalFilteredUsers: 'إجمالي المستخدمين المفلترين',
        adminAccounts: 'حسابات المدير',
        allUsers: 'كل المستخدمين',
        liveData: 'قائمة محدّثة',
        exportCsv: 'تصدير CSV',
        exporting: 'جاري التصدير...',
        filters: 'عوامل التصفية',
        walletFilter: 'فلترة المحفظة',
        walletAll: 'كل الأرصدة',
        walletPositive: 'رصيد أكبر من 0 (بأيٍّ من العملتين)',
        walletZero: 'لا رصيد',
        registrationFilter: 'فلترة التسجيل',
        registrationAll: 'كل التواريخ',
        registrationLast30: 'آخر 30 يوماً',
        registrationThisYear: 'هذا العام',
        clearFilters: 'مسح الفلاتر',
        noCsvData: 'لا توجد بيانات للتصدير.',
        nameIdentity: 'الاسم والهوية',
        institutionalEmail: 'البريد المؤسسي',
        role: 'الدور',
        registrationDate: 'تاريخ التسجيل',
        walletBalance: 'أرصدة المحفظة',
        loadingUsers: 'جاري تحميل المستخدمين...',
        noUsersFound: 'لا يوجد مستخدمون.',
        showing: 'عرض',
        of: 'من',
        total: 'الإجمالي',
        rows: 'صفوف',
        prev: 'السابق',
        next: 'التالي',
        onsiteNoEmail: 'حساب مسجّل في المكتب · دون بريد إلكتروني',
        tabAdministration: 'الموظفون والصلاحيات',
        tabWebsite: 'عملاء الموقع',
        tabOnsite: 'عملاء المكتب',
        registrationChannel: 'قناة التسجيل',
        onlineSelfService: 'تسجيل ذاتي عبر الموقع (البريد مطلوب)',
        onsiteAssisted: 'تسجيل بمساعدة المكتب (البريد اختياري)',
        username: 'اسم المستخدم',
        generatedRegistrationId: 'ينشئ النظام رقم تسجيل عشوائياً وفريداً بصيغة السنة وثلاثة أرقام، مثل 2026-482.',
        page: 'الصفحة',
        loadFailed: 'تعذر تحميل المستخدمين.',
        exportFailed: 'تعذر تصدير ملف CSV.',
        viewEdit: 'عرض / تعديل البيانات',
      }
    }

    return {
      title: 'Users',
      userAudience: 'User audience',
      description: 'Review institutional accounts, wallet balances, and role assignments.',
      searchPlaceholder: 'Search by name, email, or phone',
      allRoles: 'All Roles',
      sortName: 'Sort: Name',
      sortEmail: 'Sort: Email',
      sortRole: 'Sort: Role',
      sortDate: 'Sort: Date',
      sortWalletUsd: 'Sort: USD balance',
      sortWalletSyp: 'Sort: SYP balance',
      asc: 'Asc',
      desc: 'Desc',
      addUser: 'Add User',
      createUserTitle: 'Add New User',
      userName: 'Name',
      email: 'Email',
      phoneNumber: 'Phone Number',
      password: 'Password',
      roleLabel: 'Role',
      save: 'Save',
      cancel: 'Cancel',
      creating: 'Creating...',
      createdSuccess: 'User created successfully.',
      createFailed: 'Failed to create user.',
      totalFilteredUsers: 'Total Filtered Users',
      adminAccounts: 'Admin Accounts',
      allUsers: 'All Users',
      liveData: 'Up-to-date list',
      exportCsv: 'Export CSV',
      exporting: 'Exporting...',
      filters: 'Filters',
      walletFilter: 'Wallet Filter',
      walletAll: 'All balances',
      walletPositive: 'Balance above 0 (either currency)',
      walletZero: 'No balance',
      registrationFilter: 'Registration Filter',
      registrationAll: 'All dates',
      registrationLast30: 'Last 30 days',
      registrationThisYear: 'This year',
      clearFilters: 'Clear Filters',
      noCsvData: 'No data available to export.',
      nameIdentity: 'Name & Identity',
      institutionalEmail: 'Institutional Email',
      role: 'Role',
      registrationDate: 'Registration Date',
      walletBalance: 'Wallet balances',
      loadingUsers: 'Loading users...',
      noUsersFound: 'No users found.',
      showing: 'Showing',
      of: 'of',
      total: 'total',
      rows: 'Rows',
      prev: 'Prev',
      next: 'Next',
      onsiteNoEmail: 'On-site account · no email',
      tabAdministration: 'Staff & roles',
      tabWebsite: 'Website clients',
      tabOnsite: 'On-site clients',
      registrationChannel: 'Registration channel',
      onlineSelfService: 'Online self-service (email required)',
      onsiteAssisted: 'On-site assisted (email optional)',
      username: 'Username',
      generatedRegistrationId: 'The system automatically generates a random, unique registration ID as year plus three digits, for example 2026-482.',
      page: 'Page',
      loadFailed: 'Failed to load users.',
      exportFailed: 'Failed to export CSV.',
      viewEdit: 'View / edit details',
    }
  }, [language])

  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false)
  const [walletFilter, setWalletFilter] = useState('all')
  const [registrationFilter, setRegistrationFilter] = useState('all')
  const [isExporting, setIsExporting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    password: '',
    password_confirmation: '',
    role: 'student',
    registration_channel: 'online',
    username: '',
    office_registration_id: '',
  })
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    from: 0,
    to: 0,
    per_page: 10,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSummaryLoading, setIsSummaryLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState({
    totalUsers: 0,
    adminUsers: 0,
    walletTotals: null,
  })
  const walletText = walletCopy(language)

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true)
      setError('')

      try {
        const result = await fetchUsers({
          per_page: rowsPerPage,
          page: currentPage,
          ...(search ? { search } : {}),
          ...(role !== 'all' ? { role } : {}),
          audience,
        })

        const { items, pageData } = getUsersPage(result)

        setUsers(items)
        setPagination({
          current_page: Number(pageData?.current_page ?? currentPage),
          last_page: Number(pageData?.last_page ?? 1),
          total: Number(pageData?.total ?? items.length),
          from: Number(pageData?.from ?? 0),
          to: Number(pageData?.to ?? items.length),
          per_page: Number(pageData?.per_page ?? rowsPerPage),
        })
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || copy.loadFailed
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [search, role, currentPage, rowsPerPage, refreshKey, audience, copy.loadFailed])

  useEffect(() => {
    let cancelled = false

    const loadSummary = async () => {
      setIsSummaryLoading(true)

      try {
        const query = {
          ...(search ? { search } : {}),
          ...(role !== 'all' ? { role } : {}),
          audience,
        }

        /*
         * Two small reads, never every page of users: the total and the API's
         * wallet_totals (one aggregate per currency over all open wallets,
         * contract S6), and the count of administrators under the same filter.
         * The two currencies stay two figures; nothing adds them.
         */
        const [firstPageResult, adminResult] = await Promise.all([
          fetchUsers({ ...query, per_page: 1, page: 1 }),
          role === 'all' ? fetchUsers({ ...query, role: 'admin', per_page: 1, page: 1 }) : Promise.resolve(null),
        ])

        const firstPage = getUsersPage(firstPageResult)
        const adminUsers = role === 'all' ? getUsersPage(adminResult).total : role === 'admin' ? firstPage.total : 0
        const totals = firstPageResult?.wallet_totals ?? firstPageResult?.data?.wallet_totals ?? null

        if (!cancelled) {
          setSummary({
            totalUsers: firstPage.total,
            adminUsers,
            walletTotals: totals && typeof totals === 'object' ? totals : null,
          })
        }
      } catch {
        if (!cancelled) {
          setSummary((prev) => prev)
        }
      } finally {
        if (!cancelled) {
          setIsSummaryLoading(false)
        }
      }
    }

    loadSummary()

    return () => {
      cancelled = true
    }
  }, [search, role, refreshKey, audience])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, role, rowsPerPage])

  useEffect(() => {
    const walletActionMessage = location.state?.walletActionMessage
    const walletActionError = location.state?.walletActionError
    if (!walletActionMessage && !walletActionError) return

    if (walletActionError) {
      setActionError(walletActionError)
      setActionMessage('')
    } else if (walletActionMessage) {
      setActionMessage(walletActionMessage)
      setActionError('')
      setRefreshKey((prev) => prev + 1)
    }

    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const visibleUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const valueA = getSortValue(a, sortBy, language)
      const valueB = getSortValue(b, sortBy, language)
      const result = compareValues(valueA, valueB)
      return sortDirection === 'asc' ? result : -result
    })
  }, [users, sortBy, sortDirection, language])

  const filteredVisibleUsers = useMemo(() => {
    return visibleUsers.filter((user) => {
      const walletMatches = walletMatchesFilter(user, walletFilter)

      const registrationMatches = matchesDateFilter(user?.created_at, registrationFilter)
      return walletMatches && registrationMatches
    })
  }, [visibleUsers, walletFilter, registrationFilter])

  const hasAdvancedFilters = walletFilter !== 'all' || registrationFilter !== 'all'
  const filteredShowingFrom = hasAdvancedFilters
    ? (filteredVisibleUsers.length ? 1 : 0)
    : Number(pagination.from || 0)
  const filteredShowingTo = hasAdvancedFilters
    ? filteredVisibleUsers.length
    : Number(pagination.to || 0)
  const filteredShowingTotal = hasAdvancedFilters
    ? filteredVisibleUsers.length
    : Number(pagination.total || 0)

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      email: '',
      phone_number: '',
      password: '',
      password_confirmation: '',
      role: 'student',
      registration_channel: 'online',
      username: '',
      office_registration_id: '',
    })
  }

  const handleCreateUser = async () => {
    setIsCreating(true)
    setActionError('')
    setActionMessage('')

    try {
      const payload = {
        ...createForm,
        password_confirmation: createForm.password_confirmation || createForm.password,
      }
      await createUser(payload)
      setActionMessage(copy.createdSuccess)
      setIsCreateOpen(false)
      resetCreateForm()
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || copy.createFailed
      setActionError(message)
    } finally {
      setIsCreating(false)
    }
  }

  // By id only: a client's name never travels in a URL (browser history, server logs).
  const openWalletAction = (user, action) => {
    if (!user?.id) return
    navigate(`/users/${user.id}/wallet?action=${action}`)
  }

  const clearAdvancedFilters = () => {
    setWalletFilter('all')
    setRegistrationFilter('all')
  }

  const fetchAllUsersForExport = async () => {
    const query = {
      ...(search ? { search } : {}),
      ...(role !== 'all' ? { role } : {}),
      audience,
    }

    const firstPageResult = await fetchUsers({
      ...query,
      per_page: 100,
      page: 1,
    })

    const firstPage = getUsersPage(firstPageResult)
    const allUsers = [...firstPage.items]

    if (firstPage.lastPage > 1) {
      const remainingRequests = []
      for (let page = 2; page <= firstPage.lastPage; page += 1) {
        remainingRequests.push(
          fetchUsers({
            ...query,
            per_page: 100,
            page,
          })
        )
      }

      const remainingResults = await Promise.all(remainingRequests)
      remainingResults.forEach((result) => {
        const { items } = getUsersPage(result)
        allUsers.push(...items)
      })
    }

    return allUsers
  }

  const handleExportCsv = async () => {
    setIsExporting(true)
    setActionError('')
    setActionMessage('')

    try {
      const allUsers = await fetchAllUsersForExport()
      const usersForExport = [...allUsers]
        .filter((user) => {
          const walletMatches = walletMatchesFilter(user, walletFilter)
          const registrationMatches = matchesDateFilter(user?.created_at, registrationFilter)
          return walletMatches && registrationMatches
        })
        .sort((a, b) => {
          const valueA = getSortValue(a, sortBy, language)
          const valueB = getSortValue(b, sortBy, language)
          const result = compareValues(valueA, valueB)
          return sortDirection === 'asc' ? result : -result
        })

      if (!usersForExport.length) {
        setActionError(copy.noCsvData)
        return
      }

      const csvContent = buildUsersCsv(usersForExport, language)
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const link = document.createElement('a')
      const blobUrl = URL.createObjectURL(blob)
      link.href = blobUrl
      link.download = `users-${timestamp}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || copy.exportFailed
      setActionError(message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={audienceMeta.title}
        description={audienceMeta.description}
      />
      <nav className="grid gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-3 sm:grid-cols-3" aria-label={copy.userAudience}>
        {[['administration', '/users', copy.tabAdministration], ['website', '/users/website', copy.tabWebsite], ['onsite', '/users/onsite', copy.tabOnsite]].map(([key, href, label]) => <button key={key} type="button" onClick={() => navigate(href)} className={`rounded-xl px-4 py-3 text-sm font-bold ${audience === key ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-slate-100'}`}>{label}</button>)}
      </nav>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          {error}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          {actionError}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          {actionMessage}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 lg:grid-cols-[1.7fr_0.85fr_0.9fr_auto_auto]">
            <Input
              placeholder={copy.searchPlaceholder}
              leftIcon={<Search size={18} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="all">{copy.allRoles}</option>
              <option value="admin">{formatRoleLabel('admin', language)}</option>
              <option value="trainer">{formatRoleLabel('trainer', language)}</option>
              <option value="student">{formatRoleLabel('student', language)}</option>
              <option value="user">{formatRoleLabel('user', language)}</option>
            </Select>

            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">{copy.sortName}</option>
              <option value="email">{copy.sortEmail}</option>
              <option value="role">{copy.sortRole}</option>
              <option value="created_at">{copy.sortDate}</option>
              <option value="wallet_usd">{copy.sortWalletUsd}</option>
              <option value="wallet_syp">{copy.sortWalletSyp}</option>
            </Select>

            <Button
              variant="outline"
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            >
              <ArrowUpAZ size={18} />
              {sortDirection === 'asc' ? copy.asc : copy.desc}
            </Button>

            {canManageUsers && audienceMeta.add ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCreateOpen((prev) => !prev)
                  setCreateForm((current) => ({ ...current, registration_channel: audience === 'onsite' ? 'onsite' : 'online' }))
                  setActionError('')
                  setActionMessage('')
                }}
              >
                <Plus size={18} />
                {copy.addUser}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {canManageUsers && audienceMeta.add && isCreateOpen ? (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-[var(--color-text)]">{copy.createUserTitle}</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Input
                label={copy.userName}
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label={copy.email}
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <Select label={copy.registrationChannel} value={createForm.registration_channel} disabled={audience === 'onsite'} onChange={(e) => setCreateForm((prev) => ({ ...prev, registration_channel: e.target.value }))}>
                <option value="online">{copy.onlineSelfService}</option>
                <option value="onsite">{copy.onsiteAssisted}</option>
              </Select>
              {createForm.registration_channel === 'onsite' ? <>
                <Input label={copy.username} value={createForm.username} onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))} />
                <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-900">{copy.generatedRegistrationId}</p>
              </> : null}
              <Input
                label={copy.phoneNumber}
                value={createForm.phone_number}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, phone_number: e.target.value }))
                }
              />
              <Select
                label={copy.roleLabel}
                value={createForm.role}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}
              >
                <option value="student">{formatRoleLabel('student', language)}</option>
                <option value="trainer">{formatRoleLabel('trainer', language)}</option>
                <option value="admin">{formatRoleLabel('admin', language)}</option>
              </Select>
              <Input
                type="password"
                label={copy.password}
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    password: e.target.value,
                    password_confirmation: e.target.value,
                  }))
                }
              />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button variant="secondary" onClick={handleCreateUser} disabled={isCreating}>
                {isCreating ? copy.creating : copy.save}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false)
                  resetCreateForm()
                }}
                disabled={isCreating}
              >
                {copy.cancel}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label={copy.totalFilteredUsers}
          value={isSummaryLoading ? '...' : formatNumber(summary.totalUsers, language)}
        />
        <SummaryCard
          label={copy.adminAccounts}
          value={isSummaryLoading ? '...' : formatNumber(summary.adminUsers, language)}
        />
        {/* Two cards, one per currency, from the API's wallet_totals: never one summed number. */}
        <SummaryCard
          label={walletText.usdTotals}
          value={isSummaryLoading ? '...' : <Money value={isMoney(summary.walletTotals?.usd) ? summary.walletTotals.usd : null} language={language} className="text-3xl" />}
          dark
        />
        <SummaryCard
          label={walletText.sypTotals}
          value={isSummaryLoading ? '...' : <Money value={isMoney(summary.walletTotals?.syp) ? summary.walletTotals.syp : null} language={language} className="text-3xl" />}
          dark
        />
      </section>

      <Card className="overflow-hidden">
        <div className="flex items-start justify-between px-8 pt-8">
          <div>
            <h2 className="text-4xl font-bold text-[var(--color-text)]">{copy.allUsers}</h2>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              {copy.liveData}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="min-w-[138px] rounded-full border-[1.5px] bg-white shadow-sm"
            >
              <Download size={16} />
              {isExporting ? copy.exporting : copy.exportCsv}
            </Button>
            <button
              type="button"
              onClick={() => setIsAdvancedFiltersOpen((prev) => !prev)}
              className={`rounded-2xl border border-[var(--color-border)] p-3 transition-all ${
                isAdvancedFiltersOpen
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:bg-black/5'
              }`}
            >
              {isAdvancedFiltersOpen ? <Filter size={20} /> : <SlidersHorizontal size={20} />}
            </button>
          </div>
        </div>

        {isAdvancedFiltersOpen ? (
          <div className="mt-6 grid gap-4 border-t border-[var(--color-border)] px-8 py-5 lg:grid-cols-[1fr_1fr_auto]">
            <Select
              label={copy.walletFilter}
              value={walletFilter}
              onChange={(event) => setWalletFilter(event.target.value)}
            >
              <option value="all">{copy.walletAll}</option>
              <option value="positive">{copy.walletPositive}</option>
              <option value="zero">{copy.walletZero}</option>
            </Select>

            <Select
              label={copy.registrationFilter}
              value={registrationFilter}
              onChange={(event) => setRegistrationFilter(event.target.value)}
            >
              <option value="all">{copy.registrationAll}</option>
              <option value="last30">{copy.registrationLast30}</option>
              <option value="thisYear">{copy.registrationThisYear}</option>
            </Select>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearAdvancedFilters} className="w-full lg:w-auto">
                <FilterX size={16} />
                {copy.clearFilters}
              </Button>
            </div>
          </div>
        ) : null}

        <div
          className={`mt-8 grid ${USERS_TABLE_GRID} gap-4 bg-[var(--color-surface-muted)] px-8 py-5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]`}
        >
          <div>{copy.nameIdentity}</div>
          <div>{copy.institutionalEmail}</div>
          <div>{copy.role}</div>
          <div>{copy.registrationDate}</div>
          <div>{copy.walletBalance}</div>
        </div>

        {isLoading ? (
          <div className="px-8 py-10 text-[var(--color-text-muted)]">{copy.loadingUsers}</div>
        ) : filteredVisibleUsers.length === 0 ? (
          <div className="px-8 py-10 text-[var(--color-text-muted)]">{copy.noUsersFound}</div>
        ) : (
          filteredVisibleUsers.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              language={language}
              copy={copy}
              walletText={walletText}
              // A staff member opened from this tab stays under Staff & roles in the sidebar and the top bar.
              onOpenWorkspace={(targetUser) => navigate(`/users/${targetUser.id}`, audience === 'administration' ? { state: { navFrom: '/users' } } : undefined)}
              // Wallets are the clients' (F-21, 18 Oct 2026): the staff tab offers no top-up or deduction.
              onTopUp={canManageWallet && audience !== 'administration' ? (targetUser) => openWalletAction(targetUser, 'top-up') : null}
              onDeduct={canManageWallet && audience !== 'administration' ? (targetUser) => openWalletAction(targetUser, 'deduct') : null}
            />
          ))
        )}

        <div className="flex flex-col gap-4 border-t border-[var(--color-border)] px-8 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <span>
              {copy.showing} <b>{filteredShowingFrom}</b>-<b>{filteredShowingTo}</b> {copy.of}{' '}
              <b>{filteredShowingTotal}</b> {copy.total}
            </span>

            <span className="hidden text-[var(--color-border)] lg:inline">|</span>

            <label className="flex items-center gap-2">
              <span>{copy.rows}:</span>
              <select
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)] outline-none"
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
              disabled={pagination.current_page <= 1}
            >
              <ChevronLeft size={16} />
              {copy.prev}
            </Button>

            <span className="min-w-[90px] text-center text-sm text-[var(--color-text-muted)]">
              {copy.page} <b>{pagination.current_page}</b> / <b>{pagination.last_page}</b>
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(pagination.last_page || 1, prev + 1))
              }
              disabled={pagination.current_page >= (pagination.last_page || 1)}
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
