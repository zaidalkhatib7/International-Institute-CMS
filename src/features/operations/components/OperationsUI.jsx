import { createElement, useId } from 'react'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Inbox, X } from 'lucide-react'
import { Badge, Button, Card, CardContent, Skeleton } from '../../../components/ui'
import { getAdminLanguage } from '../../../services/languageStorage'
import { cn } from '../../../utils/cn'
import { useModalDialog } from '../../../hooks/useModalDialog'

const commonCopy = {
  ar: { dismiss: 'إغلاق الرسالة', loading: 'جارٍ التحميل', sections: 'أقسام مساحة العمل', close: 'إغلاق', live: 'مباشر', records: 'سجل' },
  en: { dismiss: 'Dismiss message', loading: 'Loading', sections: 'Workspace sections', close: 'Close', live: 'Live', records: 'records' },
  nl: { dismiss: 'Bericht sluiten', loading: 'Laden', sections: 'Werkruimtesecties', close: 'Sluiten', live: 'Live', records: 'records' },
}

function getCommonCopy() {
  return commonCopy[getAdminLanguage()] || commonCopy.en
}

export function OperationAlert({ tone = 'error', message, onDismiss }) {
  if (!message) return null
  const isSuccess = tone === 'success'
  const copy = getCommonCopy()

  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm',
        isSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
      )}
    >
      {isSuccess ? <CheckCircle2 className="mt-0.5 shrink-0" size={18} /> : <AlertCircle className="mt-0.5 shrink-0" size={18} />}
      <span className="min-w-0 flex-1 leading-6">{message}</span>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="rounded-lg p-1 hover:bg-black/5" aria-label={copy.dismiss}>
          <X size={16} />
        </button>
      ) : null}
    </div>
  )
}

export function OperationsLoader({ cards = 4, rows = 5 }) {
  const copy = getCommonCopy()
  return (
    <div aria-label={copy.loading} role="status" className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <Card key={index}><CardContent className="space-y-4 pt-6"><Skeleton className="h-4 w-28" /><Skeleton className="h-9 w-20" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="space-y-4 pt-6">{Array.from({ length: rows }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</CardContent></Card>
    </div>
  )
}

export function EmptyState({ icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">{createElement(icon, { size: 26 })}</span>
      <h3 className="mt-4 text-lg font-bold text-[var(--color-text)]">{title}</h3>
      {description ? <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--color-text-muted)]">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function OperationsTabs({ items, value, onChange, ariaLabel }) {
  const copy = getCommonCopy()
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-1 rounded-2xl border border-[var(--color-border)] bg-white p-1.5 sm:min-w-0" role="tablist" aria-label={ariaLabel || copy.sections}>
        {items.map((item) => {
          const Icon = item.icon
          const active = item.value === value
          return (
            <button key={item.value} type="button" role="tab" aria-selected={active} onClick={() => onChange(item.value)} className={cn('flex min-w-max items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition', active ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]')}>
              {Icon ? <Icon size={17} /> : null}{item.label}{item.count != null ? <span className={cn('rounded-full px-2 py-0.5 text-[10px]', active ? 'bg-white/15 text-white' : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]')}>{item.count}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function OperationsModal({ open, title, description, onClose, children, footer, size = 'lg' }) {
  const titleId = useId()
  const descriptionId = useId()
  const copy = getCommonCopy()
  const dialogRef = useModalDialog(open, onClose)

  if (!open) return null
  const widths = { md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#031C2C]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={cn('flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--color-border)] bg-white shadow-2xl outline-none sm:rounded-3xl', widths[size] || widths.lg)}>
        <header className="flex items-start gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-7">
          <div className="min-w-0 flex-1"><h2 id={titleId} className="text-xl font-bold text-[var(--color-primary)] sm:text-2xl">{title}</h2>{description ? <p id={descriptionId} className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{description}</p> : null}</div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label={copy.close}><X size={20} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">{children}</div>
        {footer ? <footer className="flex flex-wrap justify-end gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-4 sm:px-7">{footer}</footer> : null}
      </section>
    </div>
  )
}

export function MetricTile({ icon: Icon, label, value, hint, variant = 'info' }) {
  const copy = getCommonCopy()
  return (
    <Card><CardContent className="pt-6"><div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">{Icon ? <Icon size={21} /> : null}</span><Badge variant={variant}>{copy.live}</Badge></div><p className="mt-5 text-sm font-semibold text-[var(--color-text-muted)]">{label}</p><p className="mt-1 text-3xl font-bold text-[var(--color-primary)]">{value ?? '—'}</p>{hint ? <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{hint}</p> : null}</CardContent></Card>
  )
}

export function PaginationControls({ pagination, onPageChange, previousLabel = 'Previous', nextLabel = 'Next' }) {
  if (!pagination || pagination.lastPage <= 1) return null
  const language = getAdminLanguage()
  const copy = commonCopy[language] || commonCopy.en
  const PreviousIcon = language === 'ar' ? ChevronRight : ChevronLeft
  const NextIcon = language === 'ar' ? ChevronLeft : ChevronRight
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--color-text-muted)]">{pagination.total} {copy.records} · {pagination.currentPage}/{pagination.lastPage}</p>
      <div className="flex gap-2"><Button size="sm" variant="outline" disabled={pagination.currentPage <= 1} onClick={() => onPageChange(pagination.currentPage - 1)}><PreviousIcon size={16} />{previousLabel}</Button><Button size="sm" variant="outline" disabled={pagination.currentPage >= pagination.lastPage} onClick={() => onPageChange(pagination.currentPage + 1)}>{nextLabel}<NextIcon size={16} /></Button></div>
    </div>
  )
}

const statusVariants = {
  active: 'success', valid: 'success', paid: 'success', published: 'success', resolved: 'success', completed: 'success',
  pending: 'warning', open: 'warning', in_progress: 'info', waiting_on_user: 'warning', draft: 'neutral',
  revoked: 'danger', cancelled: 'danger', expired: 'danger', failed: 'danger', closed: 'neutral', archived: 'neutral', superseded: 'neutral',
}

export function StatusBadge({ value, labels = {} }) {
  const normalized = String(value || 'unknown').toLowerCase()
  return <Badge variant={statusVariants[normalized] || 'neutral'}>{labels[normalized] || String(value || '—').replaceAll('_', ' ')}</Badge>
}
