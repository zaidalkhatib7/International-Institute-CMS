import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { Button, Card, CardContent, PageHeader } from '../../../components/ui'
import { getAdminLanguage } from '../../../services/languageStorage'
import { getPlatformArchitecture } from '../../../config/platformArchitecture'
import { getNavigationItems } from '../../../routes/navigation'
import { getRouteAccess } from '../../../routes/routeAccess'
import { formatLocalizedDate, formatLocalizedNumber } from '../../../utils/localization'
import { useAuthorization } from '../../auth/context/useAuthorization'
import { CLIENT_CHIP_QUEUE_KEYS, STAFF_TILE_QUEUE_KEYS, STEP_KEYS, queueHref, queueOf, stageLabel, statusesOfStage } from '../../rpl/domain/journey'
import useWorkCounts from '../hooks/useWorkCounts'

/*
 * TODAY (owner, 18 Oct 2026; PLATFORM-JOURNEY-SPEC §4.1, D-01).
 *
 * The first screen after sign-in: the work waiting for this member of staff,
 * each tile opening exactly the list it counts; what waits on the client; the
 * professional path at a glance; the academic path's new requests; the pre-flow
 * committee work when there is any; and the role's other screens. Every block
 * shows only for the permissions that can act on it. A count still on its first
 * read shows a quiet placeholder; a count that could not be read shows "—" with
 * one quiet line, never an error; a count being read again keeps its number.
 */

const TODAY_COPY = {
  ar: {
    title: 'اليوم',
    hello: 'مرحبًا، {name}. هذا ما ينتظرك.',
    helloAnonymous: 'مرحبًا. هذا ما ينتظرك.',
    refresh: 'تحديث',
    refreshedAt: 'آخر تحديث {time}',
    loadingCount: 'جارٍ التحميل',
    waitingForYou: 'عليك الآن',
    nothingWaiting: 'لا شيء ينتظرك الآن.',
    partial: 'تعذّر تحديث بعض الأرقام.',
    upcomingInterviews: 'مقابلات مجدولة قادمة {n}',
    waitingForClient: 'بانتظار العميل',
    atAGlance: 'المسار المهني بنظرة واحدة',
    closed: 'مغلقة',
    preFlow: 'سابق',
    academic: 'المسار الأكاديمي المهني',
    academicNew: 'طلبات جديدة',
    openCases: 'فتح الطلبات',
    preflowTitle: 'مسار اللجنة السابق',
    yourScreens: 'شاشاتك',
    howItRuns: 'كيف يسير المسار',
    tiles: {
      payments: 'مدفوعات بانتظار التأكيد',
      experience: 'شهادات تثبيت خبرة للاعتماد',
      attention: 'تحتاج متابعة',
      assigned: 'ملفات مسندة إليك',
      committee: 'قرارات لجنة مستحقة',
      quality: 'مراجعات جودة مستحقة',
      appeals: 'تظلمات مفتوحة',
    },
  },
  en: {
    title: 'Today',
    hello: 'Hello, {name}. Here is what is waiting for you.',
    helloAnonymous: 'Hello. Here is what is waiting for you.',
    refresh: 'Refresh',
    refreshedAt: 'Last refreshed {time}',
    loadingCount: 'loading',
    waitingForYou: 'Waiting for you',
    nothingWaiting: 'Nothing is waiting for you right now.',
    partial: 'Some counts could not be refreshed.',
    upcomingInterviews: 'Upcoming interviews {n}',
    waitingForClient: 'Waiting for the client',
    atAGlance: 'The professional path at a glance',
    closed: 'Closed',
    preFlow: 'Pre-flow',
    academic: 'Professional academic path',
    academicNew: 'New requests',
    openCases: 'Open the cases',
    preflowTitle: 'Pre-flow committee path',
    yourScreens: 'Your screens',
    howItRuns: 'How the path runs',
    tiles: {
      payments: 'Payments to confirm',
      experience: 'Experience certificates to approve',
      attention: 'Needs attention',
      assigned: 'Cases assigned to you',
      committee: 'Committee decisions due',
      quality: 'Quality reviews due',
      appeals: 'Open appeals',
    },
  },
}

const fill = (template, values) => String(template).replace(/\{(\w+)\}/g, (_, key) => (values[key] == null ? '' : String(values[key])))

/** A count's text: the number, a placeholder while its source has nothing yet, or "—" when it failed. */
function CountText({ count, pending, language, className = '' }) {
  if (count != null) return <span className={className}>{formatLocalizedNumber(count, language)}</span>
  if (pending) return <span aria-hidden="true" data-pending="true" className={`inline-block h-[0.9em] w-[1.6em] animate-pulse rounded-md bg-[var(--color-border)] align-middle ${className}`} />
  return <span className={className}>—</span>
}

function Tile({ label, count, pending = false, href, language, onOpen, loadingText }) {
  const Arrow = language === 'ar' ? ArrowLeft : ArrowRight
  const known = count != null
  const zero = known && Number(count) === 0
  const spoken = known ? formatLocalizedNumber(count, language) : pending ? loadingText : '—'
  return (
    <button
      type="button"
      onClick={() => onOpen(href)}
      aria-label={`${label}: ${spoken}`}
      aria-busy={!known && pending ? 'true' : undefined}
      data-href={href}
      data-zero={zero ? 'true' : undefined}
      className={`flex min-h-24 w-full flex-col justify-between gap-3 rounded-2xl border p-4 text-start transition hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-card)] ${zero ? 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-body)]' : 'border-[var(--color-border)] bg-white text-[var(--color-text)]'}`}
    >
      <CountText count={count} pending={pending} language={language} className={`text-3xl font-bold ${zero ? '' : 'text-[var(--color-primary)]'}`} />
      <span className="flex items-center justify-between gap-2 text-sm font-semibold leading-5">
        <span>{label}</span>
        <Arrow size={16} aria-hidden="true" className="shrink-0" />
      </span>
    </button>
  )
}

function Section({ title, children, id }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-base font-bold text-[var(--color-text)]">{title}</h2>
      {children}
    </section>
  )
}

function sortTiles(tiles) {
  const rank = (tile) => (tile.count == null ? 1 : Number(tile.count) > 0 ? 0 : 2)
  return [...tiles].sort((a, b) => rank(a) - rank(b))
}

export default function TodayPage() {
  const navigate = useNavigate()
  const { user, canAccess, hasPermission } = useAuthorization()
  const language = getAdminLanguage() === 'ar' ? 'ar' : 'en'
  const isArabic = language === 'ar'
  const copy = TODAY_COPY[language]
  const counts = useWorkCounts({ includeTodayOnly: true })
  const may = hasPermission
  const canOpen = (href) => canAccess(getRouteAccess(href.split('?')[0]))
  const pending = (source) => counts.pendingSources.includes(source)
  const paymentsSource = counts.sources.includes('dashboard') ? 'dashboard' : 'charges'

  const tiles = (() => {
    const list = []
    const queueTile = (key) => {
      const queue = queueOf(key)
      if (!may(queue.permission) || !canOpen('/rpl/applications')) return null
      return { key, label: queue.tile[language], count: counts.queues ? counts.queues[key] ?? 0 : null, pending: pending('dashboard'), href: queueHref(key) }
    }
    // Each queue tile opens exactly the list it counts (the overdue information
    // requests included: the information_overdue queue, not a count of requests).
    for (const key of STAFF_TILE_QUEUE_KEYS) {
      const tile = queueTile(key)
      if (tile) list.push(tile)
    }
    if (may('rpl.payments.reconcile') && canOpen('/rpl/payments')) list.push({ key: 'payments', label: copy.tiles.payments, count: counts.paymentsToConfirm, pending: pending(paymentsSource), href: '/rpl/payments' })
    if (may('rpl.experience_certificates.approve') && canOpen('/rpl/experience-certificates')) list.push({ key: 'experience', label: copy.tiles.experience, count: counts.experienceToApprove, pending: pending('dashboard'), href: '/rpl/experience-certificates' })
    if (may('rpl.applications.manage') && canOpen('/rpl/attention')) list.push({ key: 'attention', label: copy.tiles.attention, count: counts.attentionTotal, pending: pending('attention'), href: '/rpl/attention' })
    if (counts.sources.includes('assigned')) list.push({ key: 'assigned', label: copy.tiles.assigned, count: counts.assignedTotal, pending: pending('assigned'), href: '/rpl/applications' })
    return sortTiles(list)
  })()

  const showClientChips = may('rpl.applications.manage') && canOpen('/rpl/applications')
  const showGlance = showClientChips
  const showAcademic = may('rpl.applications.view') && canOpen('/academic-rpl/applications')

  const preflowTiles = [
    { key: 'committee', permission: 'rpl.committee.decide', label: copy.tiles.committee, count: counts.committee_queue, pending: pending('dashboard'), href: '/rpl/accreditation' },
    { key: 'quality', permission: 'rpl.quality.approve', label: copy.tiles.quality, count: counts.quality_queue, pending: pending('dashboard'), href: '/quality' },
    { key: 'appeals', permission: 'rpl.appeals.review', label: copy.tiles.appeals, count: counts.open_appeals, pending: pending('dashboard'), href: '/rpl/appeals' },
  ].filter((tile) => may(tile.permission) && canOpen(tile.href))
  const preflowRole = !may('rpl.screening.decide')
  const showPreflow = preflowTiles.length > 0 && (preflowRole || preflowTiles.some((tile) => Number(tile.count) > 0))

  // The role's other screens: its sidebar rows that no block above already opens.
  const screens = (() => {
    const covered = new Set(['/dashboard'])
    if (tiles.some((tile) => tile.href.startsWith('/rpl/applications'))) covered.add('/rpl/applications')
    for (const tile of tiles) covered.add(tile.href.split('?')[0])
    if (showAcademic) covered.add('/academic-rpl/applications')
    if (showPreflow) preflowTiles.forEach((tile) => covered.add(tile.href))
    return getNavigationItems(canAccess, { language, preflowWork: counts.preflowWork ?? 0 }).filter((item) => !covered.has(item.href))
  })()

  const stageCount = (key) => {
    const byStatus = counts.dashboard?.applications?.by_status
    if (!byStatus) return null
    return statusesOfStage(key).reduce((sum, status) => sum + (Number(byStatus[status]) || 0), 0)
  }

  const name = user?.name || user?.email
  const stages = getPlatformArchitecture(language).rplWorkflowStages
  const waitingTiles = tiles
  const allZero = waitingTiles.length > 0 && waitingTiles.every((tile) => tile.count != null && Number(tile.count) === 0)
  const refreshedTime = counts.refreshedAt ? formatLocalizedDate(counts.refreshedAt, language, { timeStyle: 'short' }) : null
  const decisionTileShown = waitingTiles.some((tile) => ['interview_schedule', 'interview_record', 'interview_decide', 'interview_lapsed', 'screening_decision'].includes(tile.key))
  const upcoming = counts.queues ? Number(counts.queues.interview_upcoming) || 0 : null

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-8">
      <PageHeader
        title={copy.title}
        description={name ? fill(copy.hello, { name }) : copy.helloAnonymous}
        meta={refreshedTime ? <span className="text-xs text-[var(--color-text-muted)]">{fill(copy.refreshedAt, { time: refreshedTime })}</span> : null}
        actions={counts.sources.length ? <Button variant="outline" onClick={() => counts.refresh()} disabled={counts.refreshing} aria-busy={counts.refreshing ? 'true' : undefined}><RefreshCw size={17} className={counts.refreshing ? 'animate-spin' : ''} />{copy.refresh}</Button> : null}
      />

      {counts.partial ? <p role="status" className="text-sm text-[var(--color-text-muted)]">{copy.partial}</p> : null}

      {waitingTiles.length ? (
        <Section title={copy.waitingForYou} id="today-waiting">
          {allZero ? <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">{copy.nothingWaiting}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {waitingTiles.map((tile) => <Tile key={tile.key} label={tile.label} count={tile.count} pending={tile.pending} href={tile.href} language={language} onOpen={navigate} loadingText={copy.loadingCount} />)}
          </div>
          {decisionTileShown && may('rpl.interviews.manage') && upcoming != null ? (
            <p className="text-sm text-[var(--color-text-muted)]"><Link to={queueHref('interview_upcoming')} className="underline-offset-2 hover:underline">{fill(copy.upcomingInterviews, { n: formatLocalizedNumber(upcoming, language) })}</Link></p>
          ) : null}
        </Section>
      ) : null}

      {showClientChips ? (
        <Section title={copy.waitingForClient} id="today-client">
          <div className="flex flex-wrap gap-2">
            {CLIENT_CHIP_QUEUE_KEYS.map((key) => {
              const queue = queueOf(key)
              const count = counts.queues ? counts.queues[key] ?? 0 : null
              return (
                <Link key={key} to={queueHref(key)} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3.5 py-1.5 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)]">
                  <span>{queue.clientChip[language]}</span>
                  <span className="rounded-full bg-[var(--color-surface-muted)] px-2 text-xs text-[var(--color-primary)]"><CountText count={count} pending={pending('dashboard')} language={language} /></span>
                </Link>
              )
            })}
          </div>
        </Section>
      ) : null}

      {showGlance ? (
        <Section title={copy.atAGlance} id="today-glance">
          <Card>
            <CardContent className="pt-5">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-3 text-sm">
                {STEP_KEYS.map((key, index) => {
                  const count = stageCount(key)
                  return (
                    <li key={key} className="flex items-center gap-2">
                      <Link to={`/rpl/applications?stage=${key}`} className="inline-flex items-center gap-2 rounded-xl px-2 py-1 font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]">
                        <span>{stageLabel(key, language)}</span>
                        <span className="rounded-full bg-[var(--color-primary-soft)] px-2 text-xs text-[var(--color-primary)]"><CountText count={count} pending={pending('dashboard')} language={language} /></span>
                      </Link>
                      {/* Forward is to the left in Arabic and to the right in English. */}
                      {index < STEP_KEYS.length - 1 ? (isArabic ? <ChevronLeft size={14} aria-hidden="true" className="text-[var(--color-text-muted)]" /> : <ChevronRight size={14} aria-hidden="true" className="text-[var(--color-text-muted)]" />) : null}
                    </li>
                  )
                })}
                {['closed', 'pre_flow'].map((key) => {
                  const count = stageCount(key)
                  return (
                    <li key={key} className="text-xs text-[var(--color-text-muted)] ms-auto first-of-type:ms-0">
                      <Link to={`/rpl/applications?stage=${key}`} className="hover:underline">{key === 'closed' ? copy.closed : copy.preFlow} <CountText count={count} pending={pending('dashboard')} language={language} /></Link>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        </Section>
      ) : null}

      {showAcademic ? (
        <Section title={copy.academic} id="today-academic">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <p className="text-sm font-semibold">{copy.academicNew} <CountText count={counts.academicSubmitted} pending={pending('academic')} language={language} className="text-[var(--color-primary)]" /></p>
              <Link to="/academic-rpl/applications" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline">{copy.openCases}{isArabic ? <ArrowLeft size={15} aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}</Link>
            </CardContent>
          </Card>
        </Section>
      ) : null}

      {showPreflow ? (
        <Section title={copy.preflowTitle} id="today-preflow">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortTiles(preflowTiles).map((tile) => <Tile key={tile.key} label={tile.label} count={tile.count} pending={tile.pending} href={tile.href} language={language} onOpen={navigate} loadingText={copy.loadingCount} />)}
          </div>
        </Section>
      ) : null}

      {screens.length ? (
        <Section title={copy.yourScreens} id="today-screens">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {screens.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.key} to={item.href} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Icon size={18} aria-hidden="true" /></span>
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </Section>
      ) : null}

      {may('rpl.applications.view') ? (
        <details className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-[var(--color-text)]">{copy.howItRuns}</summary>
          <ol className="mt-4 space-y-3">
            {stages.map((stage, index) => (
              <li key={stage.id} className="flex gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">{formatLocalizedNumber(index + 1, language)}</span>
                <div><p className="font-semibold text-[var(--color-text)]">{stage.title}</p><p className="mt-1 leading-6 text-[var(--color-text-muted)]">{stage.description}</p></div>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  )
}
