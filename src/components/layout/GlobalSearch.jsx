import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Contact, LayoutGrid, LoaderCircle, Search } from 'lucide-react'
import { unwrapCollection } from '../../services/apiResponse'
import { getAdminLanguage } from '../../services/languageStorage'
import { getNavigationItems, getRouteTitle } from '../../routes/navigation'
import { getRouteAccess } from '../../routes/routeAccess'
import { useAuthorization } from '../../features/auth/context/useAuthorization'
import { fetchRplApplications } from '../../features/rpl/services/rplService'
import { fetchUsers } from '../../features/users/services/usersService'
import { STANDALONE_EXCHANGE_RATE_HREF, exchangeRateHref } from '../../features/finance/domain/exchangeRate'

/*
 * ONE SEARCH FOR THE PLATFORM (PLATFORM-JOURNEY-SPEC §4.7, D-26).
 *
 * Finds cases (by reference, client name or email), clients and screens, each
 * section only for a viewer who may open it. It waits for two characters and a
 * 300 ms pause, never navigates while typing, and the query never enters a URL:
 * a result opens the case or client by id. A source that fails shows nothing.
 */

const SEARCH_COPY = {
  ar: {
    placeholder: 'ابحث عن طلب أو عميل أو شاشة…',
    label: 'البحث في المنصة',
    cases: 'الطلبات',
    clients: 'العملاء',
    screens: 'الشاشات',
    noResults: 'لا نتائج.',
    searching: 'جارٍ البحث…',
    allCases: 'كل الطلبات المطابقة',
  },
  en: {
    placeholder: 'Find a case, client or screen…',
    label: 'Search the platform',
    cases: 'Cases',
    clients: 'Clients',
    screens: 'Screens',
    noResults: 'No results.',
    searching: 'Searching…',
    allCases: 'All matching cases',
  },
}

const MIN_LENGTH = 2
const DEBOUNCE_MS = 300
// Screens without a sidebar row that a search should still find.
const EXTRA_SCREENS = ['/rpl/evidence', '/rpl/source-of-truth', '/assessors', '/categories', '/sections', '/lessons', '/quizzes/units', '/finance/exchange-rate', '/settings']

function caseLabel(row) {
  return row.case_reference || row.reference_number || `#${row.id}`
}

function caseClient(row) {
  const person = row.applicant || row.user || row.professional_profile?.user || {}
  return person.name || row.applicant_name || ''
}

export default function GlobalSearch({ autoFocus = false, onDone, className = '' }) {
  const navigate = useNavigate()
  const { canAccess, hasPermission } = useAuthorization()
  const language = getAdminLanguage()
  const copy = SEARCH_COPY[language] || SEARCH_COPY.en
  const isArabic = language === 'ar'
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [remote, setRemote] = useState({ query: '', loading: false, cases: null, clients: null })
  const requestRef = useRef(0)

  const trimmed = query.trim()
  const ready = trimmed.length >= MIN_LENGTH
  const canSearchCases = hasPermission('rpl.applications.view')
  const canSearchClients = hasPermission('users.view')

  const screens = useMemo(() => {
    const items = getNavigationItems(canAccess, { language, filtering: true }).map((item) => ({ name: item.name, href: item.href }))
    const seen = new Set(items.map((item) => item.href))
    for (const href of EXTRA_SCREENS) {
      if (!seen.has(href) && canAccess(getRouteAccess(href))) {
        // The rate opens where the viewer reads it: Finance's tab when Finance is open to them.
        items.push({ name: getRouteTitle(href, language), href: href === STANDALONE_EXCHANGE_RATE_HREF ? exchangeRateHref(canAccess) : href })
        seen.add(href)
      }
    }
    return items
  }, [canAccess, language])

  useEffect(() => {
    if (!ready || (!canSearchCases && !canSearchClients)) return undefined
    const ticket = requestRef.current + 1
    requestRef.current = ticket
    const timer = window.setTimeout(async () => {
      setRemote({ query: trimmed, loading: true, cases: null, clients: null })
      const [cases, website, onsite] = await Promise.allSettled([
        canSearchCases ? fetchRplApplications({ q: trimmed, per_page: 5 }) : Promise.reject(new Error('skip')),
        canSearchClients ? fetchUsers({ search: trimmed, per_page: 5, audience: 'website' }) : Promise.reject(new Error('skip')),
        canSearchClients ? fetchUsers({ search: trimmed, per_page: 5, audience: 'onsite' }) : Promise.reject(new Error('skip')),
      ])
      if (requestRef.current !== ticket) return
      const clientRows = [website, onsite].filter((result) => result.status === 'fulfilled').flatMap((result) => unwrapCollection(result.value))
      const uniqueClients = [...new Map(clientRows.filter((row) => row?.id != null).map((row) => [row.id, row])).values()].slice(0, 5)
      setRemote({
        query: trimmed,
        loading: false,
        cases: cases.status === 'fulfilled' ? unwrapCollection(cases.value).slice(0, 5) : null,
        clients: website.status === 'fulfilled' || onsite.status === 'fulfilled' ? uniqueClients : null,
      })
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [canSearchCases, canSearchClients, ready, trimmed])

  const sections = useMemo(() => {
    if (!ready) return []
    const lower = trimmed.toLowerCase()
    const result = []
    const current = remote.query === trimmed
    if (canSearchCases && current && remote.cases?.length) {
      result.push({
        key: 'cases',
        title: copy.cases,
        icon: ClipboardList,
        items: [
          ...remote.cases.map((row) => ({ key: `case-${row.public_id || row.id}`, label: caseLabel(row), detail: caseClient(row), href: `/rpl/applications/${row.public_id || row.id}` })),
          { key: 'cases-all', label: copy.allCases, detail: '', href: '/rpl/applications', state: { q: trimmed } },
        ],
      })
    }
    if (canSearchClients && current && remote.clients?.length) {
      result.push({
        key: 'clients',
        title: copy.clients,
        icon: Contact,
        items: remote.clients.map((row) => ({ key: `client-${row.id}`, label: row.name || row.email || `#${row.id}`, detail: row.email || '', href: `/users/${row.id}` })),
      })
    }
    const matchingScreens = screens.filter((screen) => screen.name.toLowerCase().includes(lower)).slice(0, 6)
    if (matchingScreens.length) {
      result.push({ key: 'screens', title: copy.screens, icon: LayoutGrid, items: matchingScreens.map((screen) => ({ key: `screen-${screen.href}`, label: screen.name, detail: '', href: screen.href })) })
    }
    return result
  }, [canSearchCases, canSearchClients, copy, ready, remote, screens, trimmed])

  const flatItems = useMemo(() => sections.flatMap((section) => section.items), [sections])
  const activeIndex = flatItems.length ? Math.min(highlight, flatItems.length - 1) : -1
  const loading = ready && (canSearchCases || canSearchClients) && (remote.loading || remote.query !== trimmed)
  const showPopover = open && ready

  function close() {
    setOpen(false)
    setHighlight(0)
  }

  function choose(item) {
    if (!item) return
    navigate(item.href, item.state ? { state: item.state } : undefined)
    setQuery('')
    close()
    onDone?.()
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setHighlight((current) => (flatItems.length ? (Math.min(current, flatItems.length - 1) + 1) % flatItems.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((current) => (flatItems.length ? (Math.min(current, flatItems.length - 1) - 1 + flatItems.length) % flatItems.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (activeIndex >= 0) choose(flatItems[activeIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
      onDone?.()
    }
  }

  const optionId = (index) => `${listId}-option-${index}`
  let index = -1

  return (
    <div className={`relative ${className}`}>
      <Search size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] start-4" />
      <input
        type="search"
        role="combobox"
        aria-label={copy.label}
        aria-expanded={showPopover}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showPopover && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        autoFocus={autoFocus}
        value={query}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setHighlight(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder={copy.placeholder}
        className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:bg-white ps-11 pe-4"
      />
      {showPopover ? (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white p-2 shadow-[var(--shadow-floating)]">
          <ul id={listId} role="listbox" aria-label={copy.label} className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <li key={section.key} role="presentation">
                  <p className="flex items-center gap-2 px-2 py-1 text-[11px] font-bold text-[var(--color-text-muted)]"><Icon size={14} aria-hidden="true" />{section.title}</p>
                  <ul role="group" aria-label={section.title}>
                    {section.items.map((item) => {
                      index += 1
                      const current = index
                      const active = current === activeIndex
                      return (
                        <li
                          key={item.key}
                          id={optionId(current)}
                          role="option"
                          aria-selected={active}
                          onMouseDown={(event) => { event.preventDefault(); choose(item) }}
                          onMouseEnter={() => setHighlight(current)}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${active ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]'}`}
                        >
                          <bdi className="min-w-0 truncate font-semibold">{item.label}</bdi>
                          {item.detail ? <bdi className={`min-w-0 truncate text-xs ${active ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>{item.detail}</bdi> : null}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}
          </ul>
          {loading ? <p role="status" className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-muted)]"><LoaderCircle size={14} className="animate-spin" aria-hidden="true" />{copy.searching}</p> : null}
          {!loading && !flatItems.length ? <p role="status" className="px-3 py-2 text-sm text-[var(--color-text-muted)]">{copy.noResults}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
