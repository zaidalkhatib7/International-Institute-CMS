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
import { getCurrentLanguage } from '../../../utils/localization'
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
    if (roleKey === 'student') return 'طالب'
    return 'مستخدم'
  }

  if (language === 'nl') {
    if (roleKey === 'admin') return 'Beheerder'
    if (roleKey === 'trainer') return 'Trainer'
    if (roleKey === 'student') return 'Student'
    return 'Gebruiker'
  }

  if (roleKey === 'admin') return 'Admin'
  if (roleKey === 'trainer') return 'Trainer'
  if (roleKey === 'student') return 'Student'
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

function formatWallet(wallet) {
  if (!wallet) return '0'
  const balance = wallet.balance ?? 0
  const currency = wallet.currency ?? ''
  return `${balance} ${currency}`.trim()
}

function formatDate(value, language) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const locale =
    language === 'ar' ? 'ar-EG' : language === 'nl' ? 'nl-NL' : 'en-GB'
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
  if (sortBy === 'wallet') return Number(user?.wallet?.balance ?? 0)
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
    language === 'ar' ? 'ar-EG' : language === 'nl' ? 'nl-NL' : 'en-US'
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

function escapeCsvValue(value) {
  const input = value == null ? '' : String(value)
  const escaped = input.replace(/"/g, '""')
  return `"${escaped}"`
}

function buildUsersCsv(users, language) {
  const headers =
    language === 'ar'
      ? ['المعرف', 'الاسم', 'البريد الإلكتروني', 'الدور', 'تاريخ التسجيل', 'رصيد المحفظة']
      : language === 'nl'
        ? ['ID', 'Naam', 'E-mail', 'Rol', 'Registratiedatum', 'Wallet-saldo']
        : ['ID', 'Name', 'Email', 'Role', 'Registration Date', 'Wallet Balance']

  const rows = users.map((user) => [
    `IIS-${user.id}`,
    user.name || '',
    user.email || '',
    user.role || '',
    user.created_at || '',
    Number(user?.wallet?.balance ?? 0),
  ])

  const lines = [headers, ...rows]
  return lines.map((line) => line.map(escapeCsvValue).join(',')).join('\n')
}

function UserRow({ user, language, copy, onAddPoints, onDecreasePoints }) {
  const roleKey = getRoleKey(user.role)
  const displayRole = formatRoleLabel(roleKey, language)

  return (
    <div className={`grid ${USERS_TABLE_GRID} items-center gap-4 border-t border-[var(--color-border)] px-8 py-6`}>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-lg font-semibold text-[var(--color-text)]">
          {getInitials(user.name)}
        </div>

        <div>
          <h4 className="text-xl font-semibold text-[var(--color-text)]">{user.name}</h4>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">ID: IIS-{user.id}</p>
        </div>
      </div>

      <div className="truncate text-lg text-[var(--color-text-body,#43474D)]">{user.email}</div>

      <div>
        <Badge variant={roleVariant(roleKey)}>{displayRole}</Badge>
      </div>

      <div className="text-base text-[var(--color-text-body,#43474D)]">
        {formatDate(user.created_at, language)}
      </div>

      <div className="text-xl font-semibold text-[var(--color-accent-dark,#765A1F)]">
        <div>{formatWallet(user.wallet)}</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAddPoints(user)}
            className="inline-flex h-9 min-w-[124px] items-center justify-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-[0_2px_10px_rgba(16,185,129,0.14)] transition-all hover:-translate-y-[1px] hover:bg-emerald-100 hover:shadow-[0_6px_16px_rgba(16,185,129,0.2)]"
          >
            <Plus size={13} strokeWidth={2.4} />
            {copy.addPoints}
          </button>
          <button
            type="button"
            onClick={() => onDecreasePoints(user)}
            className="inline-flex h-9 min-w-[124px] items-center justify-center gap-1 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 shadow-[0_2px_10px_rgba(244,63,94,0.12)] transition-all hover:-translate-y-[1px] hover:bg-rose-100 hover:shadow-[0_6px_16px_rgba(244,63,94,0.18)]"
          >
            <Minus size={13} strokeWidth={2.4} />
            {copy.decreasePoints}
          </button>
        </div>
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
  const navigate = useNavigate()
  const location = useLocation()
  const language = getCurrentLanguage()
  const copy = useMemo(() => {
    if (language === 'ar') {
      return {
        title: 'المستخدمون',
        description: 'مراجعة الحسابات المؤسسية وأرصدة المحافظ وتعيينات الأدوار.',
        searchPlaceholder: 'ابحث بالاسم أو البريد الإلكتروني أو الهاتف',
        allRoles: 'كل الأدوار',
        sortName: 'الترتيب: الاسم',
        sortEmail: 'الترتيب: البريد',
        sortRole: 'الترتيب: الدور',
        sortDate: 'الترتيب: التاريخ',
        sortWallet: 'الترتيب: المحفظة',
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
        walletTopupTitle: 'إضافة نقاط للمحفظة',
        amount: 'المبلغ',
        descriptionLabel: 'الوصف',
        descriptionPlaceholder: 'سبب الإضافة (اختياري)',
        addPoints: 'إضافة نقاط',
        decreasePoints: 'خصم نقاط',
        crediting: 'جارٍ الإضافة...',
        creditedSuccess: 'تمت إضافة النقاط بنجاح.',
        creditFailed: 'فشل إضافة النقاط.',
        invalidAmount: 'أدخل مبلغًا أكبر من 0.',
        totalFilteredUsers: 'إجمالي المستخدمين المفلترين',
        adminAccounts: 'حسابات المدير',
        totalWalletBalance: 'إجمالي رصيد المحفظة',
        points: 'نقاط II',
        allUsers: 'كل المستخدمين',
        liveData: 'بيانات حية مقسمة من واجهة الإدارة',
        exportCsv: 'تصدير CSV',
        exporting: 'جاري التصدير...',
        filters: 'عوامل التصفية',
        walletFilter: 'فلترة المحفظة',
        walletAll: 'كل الأرصدة',
        walletPositive: 'رصيد أكبر من 0',
        walletZero: 'رصيد 0',
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
        walletBalance: 'رصيد المحفظة',
        loadingUsers: 'جاري تحميل المستخدمين...',
        noUsersFound: 'لا يوجد مستخدمون.',
        showing: 'عرض',
        of: 'من',
        total: 'الإجمالي',
        rows: 'صفوف',
        prev: 'السابق',
        next: 'التالي',
      }
    }

    if (language === 'nl') {
      return {
        title: 'Gebruikers',
        description: 'Bekijk institutionele accounts, wallet-saldi en roltoewijzingen.',
        searchPlaceholder: 'Zoek op naam, e-mail of telefoon',
        allRoles: 'Alle rollen',
        sortName: 'Sorteren: Naam',
        sortEmail: 'Sorteren: E-mail',
        sortRole: 'Sorteren: Rol',
        sortDate: 'Sorteren: Datum',
        sortWallet: 'Sorteren: Wallet',
        asc: 'Oplopend',
        desc: 'Aflopend',
        addUser: 'Gebruiker toevoegen',
        createUserTitle: 'Nieuwe gebruiker toevoegen',
        userName: 'Naam',
        email: 'E-mail',
        phoneNumber: 'Telefoonnummer',
        password: 'Wachtwoord',
        roleLabel: 'Rol',
        save: 'Opslaan',
        cancel: 'Annuleren',
        creating: 'Aanmaken...',
        createdSuccess: 'Gebruiker succesvol aangemaakt.',
        createFailed: 'Gebruiker aanmaken mislukt.',
        walletTopupTitle: 'Wallet-punten toevoegen',
        amount: 'Bedrag',
        descriptionLabel: 'Beschrijving',
        descriptionPlaceholder: 'Reden voor bijschrijving (optioneel)',
        addPoints: 'Punten toevoegen',
        decreasePoints: 'Punten verlagen',
        crediting: 'Bijschrijven...',
        creditedSuccess: 'Punten succesvol toegevoegd.',
        creditFailed: 'Punten toevoegen mislukt.',
        invalidAmount: 'Voer een bedrag groter dan 0 in.',
        totalFilteredUsers: 'Totaal gefilterde gebruikers',
        adminAccounts: 'Beheerdersaccounts',
        totalWalletBalance: 'Totaal wallet-saldo',
        points: 'II Punten',
        allUsers: 'Alle gebruikers',
        liveData: 'Live gepagineerde data van de admin API',
        exportCsv: 'CSV exporteren',
        exporting: 'Exporteren...',
        filters: 'Filters',
        walletFilter: 'Walletfilter',
        walletAll: 'Alle saldi',
        walletPositive: 'Saldo groter dan 0',
        walletZero: 'Saldo 0',
        registrationFilter: 'Registratiefilter',
        registrationAll: 'Alle datums',
        registrationLast30: 'Laatste 30 dagen',
        registrationThisYear: 'Dit jaar',
        clearFilters: 'Filters wissen',
        noCsvData: 'Geen gegevens om te exporteren.',
        nameIdentity: 'Naam en identiteit',
        institutionalEmail: 'Institutionele e-mail',
        role: 'Rol',
        registrationDate: 'Registratiedatum',
        walletBalance: 'Wallet-saldo',
        loadingUsers: 'Gebruikers laden...',
        noUsersFound: 'Geen gebruikers gevonden.',
        showing: 'Toont',
        of: 'van',
        total: 'totaal',
        rows: 'Rijen',
        prev: 'Vorige',
        next: 'Volgende',
      }
    }

    return {
      title: 'Users',
      description: 'Review institutional accounts, wallet balances, and role assignments.',
      searchPlaceholder: 'Search by name, email, or phone',
      allRoles: 'All Roles',
      sortName: 'Sort: Name',
      sortEmail: 'Sort: Email',
      sortRole: 'Sort: Role',
      sortDate: 'Sort: Date',
      sortWallet: 'Sort: Wallet',
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
      walletTopupTitle: 'Add Wallet Points',
      amount: 'Amount',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'Reason for credit (optional)',
      addPoints: 'Add Points',
      decreasePoints: 'Decrease Points',
      crediting: 'Crediting...',
      creditedSuccess: 'Points credited successfully.',
      creditFailed: 'Failed to credit points.',
      invalidAmount: 'Enter an amount greater than 0.',
      totalFilteredUsers: 'Total Filtered Users',
      adminAccounts: 'Admin Accounts',
      totalWalletBalance: 'Total Wallet Balance',
      points: 'II Points',
      allUsers: 'All Users',
      liveData: 'Live paginated data from admin API',
      exportCsv: 'Export CSV',
      exporting: 'Exporting...',
      filters: 'Filters',
      walletFilter: 'Wallet Filter',
      walletAll: 'All balances',
      walletPositive: 'Balance greater than 0',
      walletZero: 'Balance 0',
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
      walletBalance: 'Wallet Balance',
      loadingUsers: 'Loading users...',
      noUsersFound: 'No users found.',
      showing: 'Showing',
      of: 'of',
      total: 'total',
      rows: 'Rows',
      prev: 'Prev',
      next: 'Next',
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
    role: 'user',
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
    walletBalance: 0,
  })

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
        const message = err?.response?.data?.message || err?.message || 'Failed to load users.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [search, role, currentPage, rowsPerPage, refreshKey])

  useEffect(() => {
    let cancelled = false

    const loadSummary = async () => {
      setIsSummaryLoading(true)

      try {
        const query = {
          ...(search ? { search } : {}),
          ...(role !== 'all' ? { role } : {}),
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

        const adminUsers = allUsers.filter(
          (user) => String(user?.role).toLowerCase() === 'admin'
        ).length
        const walletBalance = allUsers.reduce((sum, user) => {
          return sum + Number(user?.wallet?.balance ?? 0)
        }, 0)

        if (!cancelled) {
          setSummary({
            totalUsers: firstPage.total,
            adminUsers,
            walletBalance,
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
  }, [search, role, refreshKey])

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
      const walletBalance = Number(user?.wallet?.balance ?? 0)
      const walletMatches =
        walletFilter === 'all' ||
        (walletFilter === 'positive' && walletBalance > 0) ||
        (walletFilter === 'zero' && walletBalance === 0)

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
      role: 'user',
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

  const openWalletAction = (user, action) => {
    if (!user?.id) return
    const params = new URLSearchParams()
    params.set('userId', String(user.id))
    params.set('action', action)
    if (user.name) params.set('name', user.name)
    navigate(`/users/wallet?${params.toString()}`)
  }

  const clearAdvancedFilters = () => {
    setWalletFilter('all')
    setRegistrationFilter('all')
  }

  const fetchAllUsersForExport = async () => {
    const query = {
      ...(search ? { search } : {}),
      ...(role !== 'all' ? { role } : {}),
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
          const walletBalance = Number(user?.wallet?.balance ?? 0)
          const walletMatches =
            walletFilter === 'all' ||
            (walletFilter === 'positive' && walletBalance > 0) ||
            (walletFilter === 'zero' && walletBalance === 0)
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
      const message = err?.response?.data?.message || err?.message || 'Failed to export CSV.'
      setActionError(message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={copy.title}
        description={copy.description}
      />

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
              <option value="wallet">{copy.sortWallet}</option>
            </Select>

            <Button
              variant="outline"
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            >
              <ArrowUpAZ size={18} />
              {sortDirection === 'asc' ? copy.asc : copy.desc}
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateOpen((prev) => !prev)
                setActionError('')
                setActionMessage('')
              }}
            >
              <Plus size={18} />
              {copy.addUser}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isCreateOpen ? (
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
                <option value="user">{formatRoleLabel('user', language)}</option>
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

      <section className="grid gap-6 xl:grid-cols-3">
        <SummaryCard
          label={copy.totalFilteredUsers}
          value={isSummaryLoading ? '...' : formatNumber(summary.totalUsers, language)}
        />
        <SummaryCard
          label={copy.adminAccounts}
          value={isSummaryLoading ? '...' : formatNumber(summary.adminUsers, language)}
        />
        <SummaryCard
          label={copy.totalWalletBalance}
          value={isSummaryLoading ? '...' : formatNumber(summary.walletBalance, language)}
          hint={copy.points}
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
              onAddPoints={(targetUser) => openWalletAction(targetUser, 'credit')}
              onDecreasePoints={(targetUser) => openWalletAction(targetUser, 'debit')}
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
              Page <b>{pagination.current_page}</b> / <b>{pagination.last_page}</b>
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
