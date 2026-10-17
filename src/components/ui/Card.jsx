import { cn } from '../../utils/cn'

/*
 * A card's own surface gives way to the one a caller passes (platform walk,
 * 17 Oct 2026, UI-01). cn() only joins class strings, and when two utilities set
 * the same property Tailwind's generated order decides, not the order written:
 * the case header's "bg-[var(--color-primary)] text-white" lost to the base
 * "bg-white" and its white text was unreadable. So a background, a border width
 * or a border colour given by the caller replaces the base one here.
 */
const BORDER_WIDTHS = /^border(-[0248])?$|^border-\[\d/
const BORDER_COLOUR = /^border-(?!(?:[xytblrse]|[0248])(?:-|$))(?!solid$|dashed$|dotted$|double$|none$|hidden$|collapse$|separate$)/

function cardBaseClasses(className) {
  const given = String(className || '').split(/\s+/).filter(Boolean).map((token) => token.split(':').pop())
  const hasBackground = given.some((token) => token.startsWith('bg-'))
  const hasBorderWidth = given.some((token) => BORDER_WIDTHS.test(token))
  const hasBorderColour = given.some((token) => BORDER_COLOUR.test(token) && !BORDER_WIDTHS.test(token))
  return cn(
    'overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]',
    hasBorderWidth ? '' : 'border',
    hasBorderColour || given.includes('border-0') ? '' : 'border-[var(--color-border)]',
    hasBackground ? '' : 'bg-white',
  )
}

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={cn(cardBaseClasses(className), className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return <div className={cn('px-6 py-5 md:px-7 md:py-6', className)}>{children}</div>
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={cn('text-xl font-bold text-[var(--color-text)]', className)}>{children}</h3>
}

export function CardDescription({ children, className = '' }) {
  return <p className={cn('mt-1 text-[var(--color-text-muted)]', className)}>{children}</p>
}

export function CardContent({ children, className = '' }) {
  return <div className={cn('px-6 pb-6 md:px-7 md:pb-7', className)}>{children}</div>
}
