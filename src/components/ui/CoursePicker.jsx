import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { readLocalized } from '../../services/apiResponse'
import { getCurrentLanguage } from '../../utils/localization'

/*
 * A HUNDRED COURSES IS NOT A DROPDOWN.
 *
 * A native <select> over the whole catalogue means scrolling a list the height
 * of the screen to find one course you already know the name of. You cannot
 * type "digital" and see the eight that match, and once chosen the box tells you
 * nothing but the title.
 *
 * So: type to narrow, by code or by title, in any of the three languages the
 * titles are stored in. The match is shown, the count of matches is shown, and
 * the chosen course stays visible as a card you can change in one click rather
 * than a collapsed line of text.
 *
 * Filters are pills rather than another select, because with four or five
 * families the whole point is seeing what is available without opening anything.
 */

const COPY = {
  ar: {
    search: 'ابحث عن دورة بالاسم أو الرمز',
    placeholder: 'مثال: الأمن السيبراني أو DGT-007',
    results: 'نتيجة',
    none: 'لا توجد دورة مطابقة.',
    change: 'تغيير الدورة',
    all: 'الكل',
    selected: 'الدورة المختارة',
  },
  en: {
    search: 'Search a course by name or code',
    placeholder: 'e.g. cybersecurity, or DGT-007',
    results: 'matching',
    none: 'No course matches that.',
    change: 'Change course',
    all: 'All',
    selected: 'Selected course',
  },
  nl: {
    search: 'Zoek een cursus op naam of code',
    placeholder: 'bijv. cyberbeveiliging of DGT-007',
    results: 'resultaten',
    none: 'Geen cursus komt overeen.',
    change: 'Andere cursus',
    all: 'Alle',
    selected: 'Gekozen cursus',
  },
}

/** The family prefix out of an official code: CGP-DGT-007 -> DGT. */
function familyOf(program) {
  const match = String(program?.official_code || '').match(/^[A-Z]+-([A-Z]+)-/)

  return match ? match[1] : null
}

/** Searchable across every stored language, not just the one on screen. */
function haystack(program) {
  const t = program?.title
  const titles = t && typeof t === 'object' ? Object.values(t) : [t]

  return [program?.official_code, ...titles].filter(Boolean).join(' ').toLowerCase()
}

export default function CoursePicker({ programs, value, onChange, extra }) {
  const language = getCurrentLanguage()
  const copy = COPY[language] || COPY.en

  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('')
  const inputRef = useRef(null)

  const selected = useMemo(
    () => programs.find((p) => String(p.id) === String(value)) || null,
    [programs, value],
  )

  // Focus the field when nothing is chosen yet: the first thing anyone does on
  // this screen is look for a course.
  useEffect(() => {
    if (!selected) inputRef.current?.focus()
  }, [selected])

  const families = useMemo(() => {
    const counts = {}
    programs.forEach((p) => {
      const f = familyOf(p)
      if (f) counts[f] = (counts[f] || 0) + 1
    })

    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]))
  }, [programs])

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return programs.filter((p) => {
      if (family && familyOf(p) !== family) return false
      if (!needle) return true

      return haystack(p).includes(needle)
    })
  }, [programs, query, family])

  if (selected) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[rgba(22,153,214,0.06)] p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{copy.selected}</p>
          <p className="truncate text-lg font-semibold text-[var(--color-text)]">
            {readLocalized(selected.title, language)}
          </p>
          {selected.official_code ? (
            <p className="font-mono text-xs text-[var(--color-text-muted)]">{selected.official_code}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {extra}
          <button
            type="button"
            onClick={() => { onChange(''); setQuery('') }}
            className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] transition hover:border-[var(--color-border-strong)]"
          >
            <X className="h-4 w-4" aria-hidden="true" /> {copy.change}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="course-search" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
          {copy.search}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" aria-hidden="true" />
          <input
            id="course-search"
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter picks the only match — the common case after typing a code.
              if (e.key === 'Enter' && matches.length === 1) onChange(String(matches[0].id))
              if (e.key === 'Escape') setQuery('')
            }}
            placeholder={copy.placeholder}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-3 ps-11 text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(22,153,214,0.11)]"
          />
        </div>
      </div>

      {families.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFamily('')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              family === ''
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]'
            }`}
          >
            {copy.all} ({programs.length})
          </button>
          {families.map(([f, n]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFamily(family === f ? '' : f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                family === f
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]'
              }`}
            >
              {f} ({n})
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-[var(--color-text-muted)]">{matches.length} {copy.results}</p>

      <div className="max-h-80 space-y-1 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] p-1">
        {matches.length === 0 ? (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">{copy.none}</p>
        ) : null}
        {matches.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(String(p.id))}
            className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] px-3 py-2 text-start transition hover:bg-[rgba(22,153,214,0.08)]"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-[var(--color-text)]">
                {readLocalized(p.title, language)}
              </span>
              {p.official_code ? (
                <span className="block font-mono text-xs text-[var(--color-text-muted)]">{p.official_code}</span>
              ) : null}
            </span>
            <Check className="h-4 w-4 shrink-0 opacity-0" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}
