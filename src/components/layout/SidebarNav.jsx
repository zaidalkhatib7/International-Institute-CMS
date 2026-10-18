import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, Search } from 'lucide-react'
import { getAdminLanguage } from '../../services/languageStorage'
import { findActiveHref, getSidebarNavigation, navFromOf } from '../../routes/navigation'
import { formatLocalizedNumber } from '../../utils/localization'

const COPY = {
  ar: { search: 'ابحث عن شاشة…', waiting: '{n} بانتظار الإجراء', filterLabel: 'ابحث عن شاشة' },
  en: { search: 'Find a screen…', waiting: '{n} waiting', filterLabel: 'Find a screen' },
}

/* The open group is remembered by its key (never its translated label), so a language change keeps it. */
export const OPEN_GROUP_KEY = 'cms.sidebar.openGroup.v2'
const DEFAULT_OPEN_GROUP = 'professional'
/* A role with this many rows or fewer sees every group open, with no toggles (§2.2 rule 5). */
export const FLAT_MODE_MAX_ROWS = 8

function readOpenGroup() {
  try {
    return localStorage.getItem(OPEN_GROUP_KEY) || DEFAULT_OPEN_GROUP
  } catch {
    return DEFAULT_OPEN_GROUP
  }
}

function writeOpenGroup(key) {
  try {
    localStorage.setItem(OPEN_GROUP_KEY, key)
  } catch {
    // Storage can refuse writes (private mode, blocked site data); the sidebar still works.
  }
}

function badgeCount(counts, key) {
  if (!key || !counts) return 0
  const value = Number(counts[key])
  return Number.isFinite(value) && value > 0 ? value : 0
}

function CountPill({ value, language, label }) {
  if (!value) return null
  return (
    <span className="ms-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-secondary)] px-1.5 py-0.5 text-[11px] font-bold leading-4 text-[var(--color-primary)]">
      <span aria-hidden="true">{formatLocalizedNumber(value, language)}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}

function SidebarItem({ item, active, badge, language, copy }) {
  const Icon = item.icon
  return (
    <Link
      to={item.href}
      aria-current={active ? 'page' : undefined}
      data-active={active ? 'true' : undefined}
      style={active ? { backgroundColor: '#FFFFFF', color: 'var(--color-primary)' } : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
        active ? 'shadow-[0_8px_18px_rgba(3,28,44,0.18)]' : 'text-[#DDEAF0] hover:translate-x-0.5 hover:bg-white/8 hover:text-white'
      }`}
    >
      {active ? <span aria-hidden="true" className="absolute inset-y-2 w-1 rounded-full bg-[var(--color-secondary)] start-1" /> : null}
      <Icon size={18} strokeWidth={1.9} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 leading-6">{item.name}</span>
      <CountPill value={badge} language={language} label={copy.waiting.replace('{n}', formatLocalizedNumber(badge, language))} />
    </Link>
  )
}

/**
 * The sidebar (PLATFORM-JOURNEY-SPEC §2.2). Exactly one row is active (the
 * longest match, not every prefix). A small role (8 rows or fewer) sees every
 * group open with its caption; a larger one keeps one group open at a time, the
 * active page's group opening by itself. Badges count the work waiting behind a
 * row; a count that failed draws nothing.
 */
export default function SidebarNav({ canAccess = () => true, counts = null }) {
  const location = useLocation()
  const language = getAdminLanguage()
  const copy = COPY[language] || COPY.en
  const [query, setQuery] = useState('')
  // What the viewer chose, and on which page: navigating to a page opens its own group again.
  const [chosen, setChosen] = useState(() => ({ key: readOpenGroup(), forPath: null }))

  const normalizedQuery = query.trim().toLowerCase()
  const isSearching = normalizedQuery.length > 0
  // The row this page was opened from, when the link said so (a case's full assessment page, a staff member).
  const navFrom = navFromOf(location)

  const groups = useMemo(
    () => getSidebarNavigation(canAccess, { language, pathname: location.pathname, navFrom, preflowWork: counts?.preflowWork ?? 0, filtering: isSearching }),
    [canAccess, counts?.preflowWork, isSearching, language, location.pathname, navFrom],
  )
  const allItems = useMemo(() => groups.flatMap((group) => group.items), [groups])
  const activeHref = useMemo(() => findActiveHref(location.pathname, allItems, navFrom), [allItems, location.pathname, navFrom])
  const activeGroupKey = useMemo(() => groups.find((group) => group.items.some((item) => item.href === activeHref))?.key || '', [activeHref, groups])
  const flat = allItems.length <= FLAT_MODE_MAX_ROWS

  // Follow navigation: the group of the page you are on opens by itself (accordion mode), until the viewer toggles one here.
  const followsPage = Boolean(activeGroupKey) && activeGroupKey !== 'pinned' && chosen.forPath !== location.pathname
  const openGroup = followsPage ? activeGroupKey : chosen.key

  useEffect(() => {
    if (!flat && followsPage) writeOpenGroup(activeGroupKey)
  }, [activeGroupKey, flat, followsPage])

  const toggleGroup = (key) => {
    const next = openGroup === key ? '' : key
    setChosen({ key: next, forPath: location.pathname })
    writeOpenGroup(next)
  }

  const visibleGroups = useMemo(() => {
    if (!isSearching) return groups
    return groups
      .map((group) => ({ ...group, items: group.items.filter((item) => item.name.toLowerCase().includes(normalizedQuery)) }))
      .filter((group) => group.items.length > 0)
  }, [groups, isSearching, normalizedQuery])

  const renderItem = (item) => (
    <SidebarItem key={item.key} item={item} active={item.href === activeHref} badge={badgeCount(counts, item.badgeKey)} language={language} copy={copy} />
  )

  return (
    <div className="space-y-3" data-mode={flat ? 'flat' : 'accordion'}>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#8FB0C2] start-3" aria-hidden="true" />
        <input
          type="text"
          value={query}
          aria-label={copy.filterLabel}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.search}
          className="w-full rounded-xl border border-white/10 bg-white/8 py-2 text-sm text-white placeholder-[#8FB0C2] outline-none transition focus:border-[var(--color-secondary)] focus:bg-white/12 ps-9 pe-3"
        />
      </div>

      {visibleGroups.map((group) => {
        // The pinned group (Today, Clients) has no caption and always shows.
        if (!group.label) {
          return <div key={group.key} className="space-y-1">{group.items.map(renderItem)}</div>
        }

        if (flat) {
          return (
            <section key={group.key} aria-label={group.label} className="space-y-1">
              <p className="px-3.5 pt-1 text-[11px] font-semibold text-[#8FB0C2]">{group.label}</p>
              {group.items.map(renderItem)}
            </section>
          )
        }

        const isOpen = isSearching || openGroup === group.key
        const groupBadge = group.items.reduce((sum, item) => sum + badgeCount(counts, item.badgeKey), 0)

        return (
          <section key={group.key} className="rounded-xl bg-white/4">
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              aria-expanded={isOpen}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-start text-[12.5px] font-semibold tracking-wide transition ${
                isOpen ? 'text-white' : 'text-[#8FB0C2] hover:bg-white/8 hover:text-white'
              }`}
            >
              <span className="min-w-0 flex-1">{group.label}</span>
              <span className="flex items-center gap-1.5">
                {!isOpen ? <CountPill value={groupBadge} language={language} label={copy.waiting.replace('{n}', formatLocalizedNumber(groupBadge, language))} /> : null}
                <ChevronDown size={15} aria-hidden="true" className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {isOpen ? <div className="space-y-1 px-1.5 pb-1.5">{group.items.map(renderItem)}</div> : null}
          </section>
        )
      })}
    </div>
  )
}
