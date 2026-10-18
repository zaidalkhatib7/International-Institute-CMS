import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getNavigationItems, getRouteTitle, hasRouteTitle, findActiveHref, navFromOf } from '../../routes/navigation'
import { clearAdminToken } from '../../services/tokenStorage'
import { getAdminLanguage, setAdminLanguage } from '../../services/languageStorage'
import { logoutAdmin } from '../../features/auth/services/authService'
import { useAuthorization } from '../../features/auth/context/useAuthorization'
import { roleLabel } from '../../features/auth/roleLabels'
import LanguageSlider from '../ui/LanguageSlider'
import GlobalSearch from './GlobalSearch'
import useWorkCounts, { resetWorkCounts } from '../../features/dashboard/hooks/useWorkCounts'
import { formatLocalizedNumber } from '../../utils/localization'

const copyByLanguage = {
  ar: {
    area: 'منصة الاعتماد المهني',
    search: 'ابحث عن طلب أو عميل أو شاشة…',
    work: 'أعمال بانتظارك',
    admin: 'مدير النظام',
    role: 'الإدارة المركزية',
    settings: 'إعداداتي',
    logout: 'تسجيل الخروج',
    openMenu: 'فتح القائمة',
    closeSearch: 'إغلاق البحث',
    interfaceLanguage: 'لغة الواجهة',
  },
  en: {
    area: 'Professional Accreditation Platform',
    search: 'Find a case, client or screen…',
    work: 'Work waiting for you',
    admin: 'System administrator',
    role: 'Central administration',
    settings: 'My settings',
    logout: 'Sign out',
    openMenu: 'Open menu',
    closeSearch: 'Close search',
    interfaceLanguage: 'Interface language',
  },
}

export default function AppTopbar({ onMenuToggle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const menuRef = useRef(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const { user: currentUser, canAccess } = useAuthorization()
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const copy = copyByLanguage[language] || copyByLanguage.ar
  // The bell counts the work waiting for the viewer and opens Today (D-17); it shares the sidebar's read.
  const counts = useWorkCounts()
  const workTotal = Number(counts.workTotal) > 0 ? Number(counts.workTotal) : 0

  /*
   * The title (PLATFORM-JOURNEY-SPEC §4.7): a row's own page shows the row's
   * name; a page under a row (a case, a client, an editor) shows its own title;
   * any other page the active row's name, and Today as the fallback.
   */
  const navFrom = navFromOf(location)
  const pageTitle = useMemo(() => {
    const items = getNavigationItems(canAccess, { language, pathname: location.pathname, navFrom, preflowWork: counts.preflowWork ?? 0 })
    const exact = items.find((item) => item.href === location.pathname)
    if (exact) return exact.name
    if (hasRouteTitle(location.pathname, navFrom)) return getRouteTitle(location.pathname, language, navFrom)
    const activeHref = findActiveHref(location.pathname, items, navFrom)
    return items.find((item) => item.href === activeHref)?.name || getRouteTitle(location.pathname, language, navFrom)
  }, [canAccess, counts.preflowWork, language, location.pathname, navFrom])

  useEffect(() => {
    const closeMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

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
    resetWorkCounts()
    navigate('/login')
  }

  const displayName = currentUser?.name || currentUser?.email || copy.admin
  const firstRole = currentUser?.roles?.[0]
  // A role is an object with a name (or only a slug), or a plain slug; never render the object itself.
  // A known role reads in the interface language (the API names roles in English only).
  const displayRole = roleLabel(firstRole, language) || copy.role
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
          {pageTitle}
        </p>
      </div>

      <div className="min-w-0 flex-1 md:hidden">
        <p className="truncate text-xs font-medium text-[var(--color-text-muted)]">{copy.area}</p>
        <p className="truncate text-sm font-bold text-[var(--color-primary)]">{pageTitle}</p>
      </div>

      <GlobalSearch className="mx-auto hidden w-full max-w-xl md:block" />

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => setIsMobileSearchOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)] md:hidden"
          aria-label={copy.search}
        >
          <Search size={19} />
        </button>

        <LanguageSlider
          value={language}
          onChange={handleLanguageChange}
          compact
          ariaLabel={copy.interfaceLanguage}
          className="hidden sm:grid"
        />

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
          title={copy.work}
          aria-label={workTotal ? `${copy.work}: ${formatLocalizedNumber(workTotal, language)}` : copy.work}
        >
          <Bell size={19} aria-hidden="true" />
          {workTotal ? (
            <span data-testid="work-badge" aria-hidden="true" className="absolute -top-0.5 end-0 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-secondary)] px-1 text-[11px] font-bold leading-5 text-[var(--color-primary)]">
              {formatLocalizedNumber(workTotal, language)}
            </span>
          ) : null}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen((value) => !value)}
            className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-[var(--color-surface-muted)]"
            aria-expanded={isProfileOpen}
            aria-label={displayName}
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

      {isMobileSearchOpen ? (
        <div className="absolute inset-x-3 top-3 z-50 flex h-14 items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white p-1.5 shadow-[var(--shadow-floating)] md:hidden">
          <GlobalSearch autoFocus className="min-w-0 flex-1" onDone={() => setIsMobileSearchOpen(false)} />
          <button type="button" onClick={() => setIsMobileSearchOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label={copy.closeSearch}><X size={18} /></button>
        </div>
      ) : null}
    </header>
  )
}
