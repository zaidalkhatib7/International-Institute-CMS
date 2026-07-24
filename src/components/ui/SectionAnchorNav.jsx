import { useState } from 'react'
import { cn } from '../../utils/cn'

/**
 * Sticky in-page navigator for long operational screens: one chip per major
 * section, smooth-scrolls to its anchor. Turns a 1500-line scroll into a
 * navigable workspace without restructuring the page.
 */
export default function SectionAnchorNav({ sections = [], className = '' }) {
  const [active, setActive] = useState('')

  const jump = (id) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!sections.length) return null

  return (
    <nav
      className={cn(
        'sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white/95 p-2 shadow-[var(--shadow-card)] backdrop-blur',
        className,
      )}
    >
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => jump(section.id)}
          className={cn(
            'rounded-xl px-3.5 py-1.5 text-[13px] font-semibold transition',
            active === section.id
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]',
          )}
        >
          {section.label}
        </button>
      ))}
    </nav>
  )
}
