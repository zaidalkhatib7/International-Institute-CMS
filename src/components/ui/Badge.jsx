import { cn } from '../../utils/cn'
const variants = {
  neutral: 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]',
  primary: 'bg-[var(--color-primary)] text-white',
  secondary: 'bg-[var(--color-secondary)] text-[var(--color-primary)]',
  success: 'bg-[#EDF9F1] text-[#1E9E5A]',
  warning: 'bg-[#FFF4DF] text-[#A96208]',
  danger: 'bg-[#FDECEC] text-[#B83636]',
  info: 'bg-[#E7F5FB] text-[#117CB0]',
}
export default function Badge({ children, variant = 'neutral', className = '' }) {
  return <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', variants[variant], className)}>{children}</span>
}
