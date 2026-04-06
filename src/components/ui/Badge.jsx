import { cn } from '../../utils/cn'
const variants = { neutral: 'bg-[#ECE8DF] text-[var(--color-text-muted)]', primary: 'bg-[var(--color-primary)] text-white', secondary: 'bg-[var(--color-secondary)] text-[var(--color-text)]', success: 'bg-[#DCFCE7] text-[#15803D]', warning: 'bg-[#FEF3C7] text-[#B45309]', danger: 'bg-[#FEE2E2] text-[#B91C1C]', info: 'bg-[#DBEAFE] text-[#1D4ED8]' }
export default function Badge({ children, variant = 'neutral', className = '' }) {
  return <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', variants[variant], className)}>{children}</span>
}