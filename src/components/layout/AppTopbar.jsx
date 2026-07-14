import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, ChevronDown, LogOut, Menu, Search, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getNavigationItems } from '../../routes/navigation'
import { clearAdminToken } from '../../services/tokenStorage'
import { getAdminLanguage, setAdminLanguage } from '../../services/languageStorage'
import { fetchCurrentUser, logoutAdmin } from '../../features/auth/services/authService'
import { unwrapApiData } from '../../services/apiResponse'
import LanguageSlider from '../ui/LanguageSlider'

const copyByLanguage = {
  ar: {
    area: 'لوحة إدارة الاعتماد المهني',
    search: 'ابحث في الوحدات والطلبات والسجلات...',
    notifications: 'الرسائل والتنبيهات',
    admin: 'مدير النظام',
    role: 'الإدارة المركزية',
    settings: 'إعدادات النظام',
    logout: 'تسجيل الخروج',
    openMenu: 'فتح القائمة',
    overview: 'نظرة عامة',
  },
  en: {
    area: 'Professional Accreditation CMS',
    search: 'Search modules, applications, and records...',
    notifications: 'Messages & notifications',
    admin: 'System administrator',
    role: 'Central administration',
    settings: 'System settings',
    logout: 'Sign out',
    openMenu: 'Open menu',
    overview: 'Overview',
  },
  nl: {
    area: 'CMS voor professionele accreditatie',
    search: 'Zoek modules, aanvragen en dossiers...',
    notifications: 'Berichten & meldingen',
    admin: 'Systeembeheerder',
    role: 'Centraal beheer',
    settings: 'Systeeminstellingen',
    logout: 'Uitloggen',
    openMenu: 'Menu openen',
    overview: 'Overzicht',
  },
}

export default function AppTopbar({ onMenuToggle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const menuRef = useRef(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const copy = copyByLanguage[language] || copyByLanguage.ar

  const navigationItems = useMemo(() => getNavigationItems(), [])
  const activeItem = useMemo(
    () =>
      navigationItems.find(
        (item) =>
          location.pathname === item.href ||
          (item.href !== '/dashboard' && location.pathname.startsWith(`${item.href}/`))
      ),
    [location.pathname, navigationItems]
  )

  useEffect(() => {
    const closeMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadCurrentUser() {
      try {
        const payload = await fetchCurrentUser()
        const user = unwrapApiData(payload)?.user || unwrapApiData(payload)
        if (isMounted) setCurrentUser(user)
      } catch {
        if (isMounted) setCurrentUser(null)
      }
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSearch = (event) => {
    event.preventDefault()
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return

    const matchingItem = navigationItems.find((item) =>
      item.name.toLocaleLowerCase().includes(normalizedQuery)
    )
    navigate(matchingItem?.href || `/rpl/applications?search=${encodeURIComponent(query.trim())}`)
    setQuery('')
  }

  const handleLanguageChange = (nextLanguage) => {
    setAdminLanguage(nextLanguage)
    window.location.reload()
  }

  const handleLogout = async () => {
    try {
      await logoutAdmin()
    } catch {
      // Token cleanup is still required if the server rejects logout.
    }

    clearAdminToken()
    navigate('/login')
  }

  const displayName = currentUser?.name || currentUser?.email || copy.admin
  const displayRole = currentUser?.roles?.[0]?.name || currentUser?.roles?.[0] || copy.role
  const initials = String(displayName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="sticky top-0 z-30 flex h-[var(--layout-topbar-height)] items-center gap-4 border-b border-[var(--color-border)] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuToggle}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] lg:hidden"
        aria-label={copy.openMenu}
      >
        <Menu size={21} />
      </button>

      <div className="hidden min-w-0 shrink-0 xl:block">
        <p className="truncate text-xs font-medium text-[var(--color-text-muted)]">{copy.area}</p>
        <p className="truncate text-base font-bold text-[var(--color-primary)]">
          {activeItem?.name || copy.overview}
        </p>
      </div>

      <form onSubmit={handleSearch} className="mx-auto hidden w-full max-w-xl md:block">
        <div className="relative">
          <Search
            size={18}
            className={`absolute top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] ${
              isArabic ? 'right-4' : 'left-4'
            }`}
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className={`h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:bg-white ${
              isArabic ? 'pr-11 pl-4' : 'pl-11 pr-4'
            }`}
          />
        </div>
      </form>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <LanguageSlider
          value={language}
          onChange={handleLanguageChange}
          compact
          ariaLabel={copy.area}
          className="hidden sm:grid"
        />

        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
          title={copy.notifications}
        >
          <Bell size={19} />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen((value) => !value)}
            className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-[var(--color-surface-muted)]"
            aria-expanded={isProfileOpen}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-xs font-bold text-white">
              {initials || 'IC'}
            </span>
            <span className="hidden text-start lg:block">
              <span className="block max-w-40 truncate text-xs font-bold text-[var(--color-primary)]">{displayName}</span>
              <span className="block max-w-40 truncate text-[10px] text-[var(--color-text-muted)]">{displayRole}</span>
            </span>
            <ChevronDown size={15} className="hidden text-[var(--color-text-muted)] lg:block" />
          </button>

          {isProfileOpen ? (
            <div
              className={`absolute top-[calc(100%+10px)] w-56 rounded-xl border border-[var(--color-border)] bg-white p-2 shadow-[var(--shadow-floating)] ${
                isArabic ? 'left-0' : 'right-0'
              }`}
            >
              <div className="border-b border-[var(--color-border)] px-3 py-2">
                <p className="truncate text-sm font-bold text-[var(--color-primary)]">{displayName}</p>
                <p className="truncate text-xs text-[var(--color-text-muted)]">{displayRole}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text-body)] hover:bg-[var(--color-surface-muted)]"
              >
                <Settings size={17} />
                {copy.settings}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-red-50"
              >
                <LogOut size={17} />
                {copy.logout}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
