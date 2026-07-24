import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Search } from 'lucide-react'
import { getAdminLanguage } from '../../services/languageStorage'

const SEARCH_PLACEHOLDER = {
  ar: 'ابحث عن شاشة…',
  en: 'Find a screen…',
  nl: 'Zoek een scherm…',
}

const OPEN_GROUP_KEY = 'cms.sidebar.openGroup'

function SidebarItem({ item }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.href}
      style={({ isActive }) =>
        isActive
          ? { backgroundColor: '#FFFFFF', color: 'var(--color-primary)' }
          : undefined
      }
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'shadow-[0_8px_18px_rgba(3,28,44,0.18)]'
            : 'text-[#DDEAF0] hover:translate-x-0.5 hover:bg-white/8 hover:text-white'
        }`
      }
    >
      {({ isActive }) => <>
        {isActive ? <span aria-hidden="true" className="absolute inset-y-2 w-1 rounded-full bg-[var(--color-secondary)] start-1" /> : null}
        <Icon size={18} strokeWidth={1.9} className="shrink-0" />
        <span className="min-w-0 flex-1 leading-6">{item.name}</span>
      </>}
    </NavLink>
  )
}

/**
 * Focused sidebar: one open group at a time (the active route's group opens
 * automatically), everything else collapses to a single header line, and a
 * quick filter finds any screen without scanning 30 items.
 */
export default function SidebarNav({ groups = [] }) {
  const location = useLocation()
  const language = getAdminLanguage()
  const [query, setQuery] = useState('')
  const [openGroup, setOpenGroup] = useState(() => localStorage.getItem(OPEN_GROUP_KEY) || '')

  const activeGroupLabel = useMemo(() => {
    const match = groups.find((group) =>
      group.items.some((item) => item.href !== '/dashboard' && location.pathname.startsWith(item.href)),
    )
    return match?.label || ''
  }, [groups, location.pathname])

  // Follow navigation: the group of the page you are on opens by itself.
  useEffect(() => {
    if (activeGroupLabel) {
      setOpenGroup(activeGroupLabel)
      localStorage.setItem(OPEN_GROUP_KEY, activeGroupLabel)
    }
  }, [activeGroupLabel])

  const toggleGroup = (label) => {
    const next = openGroup === label ? '' : label
    setOpenGroup(next)
    localStorage.setItem(OPEN_GROUP_KEY, next)
  }

  const normalizedQuery = query.trim().toLowerCase()
  const isSearching = normalizedQuery.length > 0

  const visibleGroups = useMemo(() => {
    if (!isSearching) return groups
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.name.toLowerCase().includes(normalizedQuery)),
      }))
      .filter((group) => group.items.length > 0)
  }, [groups, isSearching, normalizedQuery])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#8FB0C2] start-3" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={SEARCH_PLACEHOLDER[language] || SEARCH_PLACEHOLDER.en}
          className="w-full rounded-xl border border-white/10 bg-white/8 py-2 text-sm text-white placeholder-[#8FB0C2] outline-none transition focus:border-[var(--color-secondary)] focus:bg-white/12 ps-9 pe-3"
        />
      </div>

      {visibleGroups.map((group, groupIndex) => {
        // The pinned top group (Overview) has no label and always shows.
        if (!group.label) {
          return (
            <div key={`group-${groupIndex}`} className="space-y-1">
              {group.items.map((item) => (
                <SidebarItem key={item.href} item={item} />
              ))}
            </div>
          )
        }

        const isOpen = isSearching || openGroup === group.label

        return (
          <section key={group.label} className="rounded-xl bg-white/4">
            <button
              type="button"
              onClick={() => toggleGroup(group.label)}
              aria-expanded={isOpen}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-start text-[12.5px] font-semibold tracking-wide transition ${
                isOpen ? 'text-white' : 'text-[#8FB0C2] hover:bg-white/8 hover:text-white'
              }`}
            >
              <span className="min-w-0 flex-1">{group.label}</span>
              <span className="flex items-center gap-1.5">
                {!isOpen ? (
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#8FB0C2]">
                    {group.items.length}
                  </span>
                ) : null}
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>
            {isOpen ? (
              <div className="space-y-1 px-1.5 pb-1.5">
                {group.items.map((item) => (
                  <SidebarItem key={item.href} item={item} />
                ))}
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
