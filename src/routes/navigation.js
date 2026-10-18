import {
  ArrowLeftRight,
  Award,
  Banknote,
  BellRing,
  BookMarked,
  BookOpenCheck,
  Bot,
  ClipboardCheck,
  ClipboardList,
  Contact,
  FileQuestion,
  Gavel,
  GraduationCap,
  Headphones,
  Inbox,
  Layers3,
  Library,
  LibraryBig,
  Scale,
  School,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  WalletCards,
} from 'lucide-react'
import { getAdminLanguage } from '../services/languageStorage'
import { getRouteAccess } from './routeAccess'

/*
 * THE PLATFORM'S SIDEBAR (owner, 18 Oct 2026: "the side bar have too many
 * things"; PLATFORM-JOURNEY-SPEC §2).
 *
 * Grouped by daily use: the client and the first path (the professional RPL
 * path) on top, the academic path in the same shape under it, then courses,
 * money and certificates, support, setup, and the pre-flow committee chain last.
 * Each group and row has a stable key; the open-group memory stores the key, never
 * the translated label, so a language change keeps it.
 *
 * A row shows only when its route rule lets the viewer open it, and then only
 * when its own navAccess and visibleWhen also hold: a nav rule can only hide,
 * never show what the route refuses. The server stays the authority on every
 * permission.
 */

const SCREENING_DECIDE = Object.freeze({ allPermissions: ['rpl.screening.decide'] })

export const NAV_GROUPS = Object.freeze([
  {
    key: 'pinned',
    label: null,
    items: [
      { key: 'today', label: { ar: 'اليوم', en: 'Today' }, href: '/dashboard', icon: Inbox, badgeKey: 'workTotal', exact: true },
      {
        key: 'clients',
        label: { ar: 'العملاء', en: 'Clients' },
        href: '/users/website',
        icon: Contact,
        activeFor: ['/users/onsite', '/users/:id', '/users/:id/wallet'],
      },
    ],
  },
  {
    key: 'professional',
    label: { ar: 'مسار الاعتراف المهني بالتعلم السابق', en: 'Professional RPL path' },
    items: [
      {
        key: 'pro_cases',
        label: { ar: 'طلبات المسار المهني', en: 'Professional cases' },
        href: '/rpl/applications',
        icon: ClipboardList,
        badgeKey: 'casesForYou',
        activeFor: ['/rpl/applications/:id', '/rpl/evidence'],
      },
      { key: 'payments', label: { ar: 'مدفوعات بانتظار التأكيد', en: 'Payments to confirm' }, href: '/rpl/payments', icon: Banknote, badgeKey: 'paymentsToConfirm' },
      { key: 'exp_certs', label: { ar: 'شهادات تثبيت الخبرة', en: 'Experience certificates' }, href: '/rpl/experience-certificates', icon: Award, badgeKey: 'experienceToApprove' },
      // Only the role that can act on its items browses it: the API list is not visibility-scoped.
      { key: 'attention', label: { ar: 'تحتاج متابعة', en: 'Needs attention' }, href: '/rpl/attention', icon: BellRing, navAccess: { allPermissions: ['rpl.applications.manage'] } },
    ],
  },
  {
    /*
     * The second path has the same shape as the first, with its own levels,
     * courses and certificates (owner, 18 Oct 2026). Its queues join this group as
     * rows, with the same badge pattern, when the path gains them.
     */
    key: 'academic',
    label: { ar: 'المسار الأكاديمي المهني', en: 'Professional academic path' },
    items: [
      {
        key: 'aca_cases',
        label: { ar: 'طلبات المسار الأكاديمي', en: 'Academic cases' },
        href: '/academic-rpl/applications',
        icon: School,
        activeFor: ['/academic-rpl/applications/:id', '/academic-rpl/diagnostics/:id'],
      },
    ],
  },
  {
    key: 'courses',
    label: { ar: 'الدورات والمحتوى', en: 'Courses & content' },
    items: [
      { key: 'programs', label: { ar: 'البرامج والدورات', en: 'Programmes & courses' }, href: '/programs', icon: GraduationCap, activeFor: ['/programs/edit', '/categories'] },
      { key: 'gap_pro', label: { ar: 'مكتبة سد الفجوات: المسار المهني', en: 'Gap library: professional' }, href: '/competency-gap-library', icon: LibraryBig },
      { key: 'gap_aca', label: { ar: 'مكتبة سد الفجوات: المسار الأكاديمي', en: 'Gap library: academic' }, href: '/academic-rpl/library', icon: Library },
      { key: 'content', label: { ar: 'محتوى الدورات', en: 'Course content' }, href: '/content/course', icon: Layers3, activeFor: ['/sections', '/sections/edit', '/lessons', '/lessons/edit'] },
      { key: 'qbanks', label: { ar: 'بنوك الأسئلة', en: 'Question banks' }, href: '/quizzes', icon: FileQuestion, activeFor: ['/quizzes/bank', '/quizzes/units', '/quizzes/edit'] },
      { key: 'ai_gen', label: { ar: 'إعدادات توليد الأسئلة', en: 'Question generation settings' }, href: '/ai-settings', icon: Bot },
    ],
  },
  {
    key: 'finance',
    label: { ar: 'المالية والشهادات', en: 'Finance & certificates' },
    items: [
      { key: 'finance', label: { ar: 'النظام المالي', en: 'Finance' }, href: '/finance', icon: WalletCards, activeFor: ['/finance/exchange-rate'] },
      /*
       * The USD -> SYP rate (owner, 17 Oct 2026): every finance and payment role
       * reads it. A role that can open Finance reads it there (its tab), so the row
       * shows only to a role that cannot.
       */
      {
        key: 'rate',
        label: { ar: 'سعر الصرف', en: 'Exchange rate' },
        href: '/finance/exchange-rate',
        icon: ArrowLeftRight,
        visibleWhen: (ctx) => !ctx.canAccess(getRouteAccess('/finance')),
      },
      { key: 'cert_register', label: { ar: 'سجل الشهادات', en: 'Certificate register' }, href: '/certificates', icon: ScrollText },
    ],
  },
  {
    key: 'support',
    label: { ar: 'الدعم والمكتبة', en: 'Support & library' },
    items: [
      { key: 'support', label: { ar: 'الدعم والاتصالات', en: 'Support & communications' }, href: '/support', icon: Headphones },
      { key: 'library', label: { ar: 'المكتبة الرقمية', en: 'Digital library' }, href: '/library', icon: BookMarked },
    ],
  },
  {
    key: 'setup',
    label: { ar: 'الإعداد', en: 'Setup' },
    items: [
      { key: 'pro_settings', label: { ar: 'إعدادات المسار المهني', en: 'Professional path settings' }, href: '/rpl/configuration', icon: SlidersHorizontal, activeFor: ['/rpl/source-of-truth'] },
      { key: 'aca_framework', label: { ar: 'إطار الكفاءات الأكاديمية', en: 'Academic competency framework' }, href: '/academic-rpl/framework', icon: BookOpenCheck },
      { key: 'staff', label: { ar: 'الموظفون والصلاحيات', en: 'Staff & roles' }, href: '/users', icon: UserCog, exact: true, navAccess: { allPermissions: ['users.manage'] } },
    ],
  },
  {
    /*
     * The committee chain from before the owner's flow of 12 Oct 2026. The API
     * refuses quality review and the committee for every new-flow case, so this is
     * last, and an administrator sees it only while pre-flow work exists (or while
     * on one of its pages, or filtering). For a role without the screening decision
     * it is the only RPL work, so it always shows (rule 6 of §2.2).
     */
    key: 'preflow',
    label: { ar: 'مسار اللجنة السابق', en: 'Pre-flow committee path' },
    items: [
      { key: 'assessments', label: { ar: 'التقييمات', en: 'Assessments' }, href: '/rpl/assessments', icon: ClipboardCheck, activeFor: ['/rpl/assessments/:id', '/assessors'] },
      { key: 'committee', label: { ar: 'قرارات اللجنة', en: 'Committee decisions' }, href: '/rpl/accreditation', icon: Gavel, badgeKey: 'committee_queue' },
      { key: 'quality', label: { ar: 'مراجعة الجودة', en: 'Quality review' }, href: '/quality', icon: ShieldCheck, badgeKey: 'quality_queue' },
      { key: 'appeals', label: { ar: 'التظلمات', en: 'Appeals' }, href: '/rpl/appeals', icon: Scale, badgeKey: 'open_appeals' },
    ],
  },
])

/*
 * Titles for the screens that have no row of their own (§4.7). The top bar uses
 * the active row's name on a row's own page, and these on the pages under it. An
 * entry with `navFrom` applies only when the page was opened from that row (see
 * NAV_FROM below): a staff member's page opened from Staff & roles is not a client.
 */
const ROUTE_TITLES = [
  { pattern: '/rpl/applications/:id', label: { ar: 'ملف طلب', en: 'Case' } },
  { pattern: '/rpl/assessments/:id', label: { ar: 'تقييم', en: 'Assessment' } },
  { pattern: '/rpl/evidence', label: { ar: 'الأدلة عبر الطلبات', en: 'Evidence across cases' } },
  { pattern: '/rpl/source-of-truth', label: { ar: 'مرجع القواعد', en: 'Rules reference' } },
  { pattern: '/assessors', label: { ar: 'المقيّمون', en: 'Assessors' } },
  { pattern: '/users', label: { ar: 'الموظفون', en: 'Staff' } },
  { pattern: '/users/:id/wallet', label: { ar: 'محفظة العميل', en: 'Client wallet' } },
  { pattern: '/users/:id', navFrom: '/users', label: { ar: 'ملف الموظف', en: 'Staff member' }, except: ['website', 'onsite'] },
  { pattern: '/users/:id', label: { ar: 'ملف العميل', en: 'Client' }, except: ['website', 'onsite'] },
  { pattern: '/academic-rpl/applications/:id', label: { ar: 'ملف طلب أكاديمي', en: 'Academic case' } },
  { pattern: '/academic-rpl/diagnostics/:id', label: { ar: 'اختبار تشخيصي', en: 'Diagnostic test' } },
  { pattern: '/programs/edit', label: { ar: 'محرر البرنامج', en: 'Programme editor' } },
  { pattern: '/categories', label: { ar: 'التصنيفات', en: 'Categories' } },
  { pattern: '/sections', label: { ar: 'الوحدات', en: 'Units' } },
  { pattern: '/sections/edit', label: { ar: 'الوحدات', en: 'Units' } },
  { pattern: '/lessons', label: { ar: 'الدروس', en: 'Lessons' } },
  { pattern: '/lessons/edit', label: { ar: 'الدروس', en: 'Lessons' } },
  { pattern: '/quizzes/units', label: { ar: 'سجلات الاختبارات', en: 'Quiz records' } },
  { pattern: '/quizzes/edit', label: { ar: 'سجلات الاختبارات', en: 'Quiz records' } },
  { pattern: '/finance/exchange-rate', label: { ar: 'سعر الصرف', en: 'Exchange rate' } },
  { pattern: '/settings', label: { ar: 'إعداداتي', en: 'My settings' } },
]

export const ROUTE_TITLE_PATTERNS = Object.freeze([...new Set(ROUTE_TITLES.map((entry) => entry.pattern))])

/*
 * WHERE A PAGE WAS OPENED FROM. A link may carry `state.navFrom` (a row's href)
 * when the page it opens belongs, for this visit, to another row than its path
 * says: the full assessment page opened from a case belongs to Professional
 * cases, and a staff member's page opened from Staff & roles to Staff & roles.
 * It only ever picks among the rows the viewer already sees.
 */
export function navFromOf(location) {
  const value = location?.state?.navFrom
  return typeof value === 'string' && value.startsWith('/') ? value : null
}

const FALLBACK_TITLE = { ar: 'اليوم', en: 'Today' }

function pickLabel(label, language) {
  return label?.[language] || label?.en || label?.ar || ''
}

function patternSegments(pattern) {
  return String(pattern).split('/').filter(Boolean)
}

/** Whether `pathname` is exactly `pattern`, where ":id" matches one path segment. */
export function matchesPattern(pathname, pattern) {
  const path = patternSegments(pathname)
  const parts = patternSegments(pattern)
  if (path.length !== parts.length) return false
  return parts.every((part, index) => (part.startsWith(':') ? path[index] !== '' : part === path[index]))
}

/** Whether `pattern` matches the start of `pathname`, ending at a "/" boundary. */
function matchesPrefix(pathname, pattern) {
  const path = patternSegments(pathname)
  const parts = patternSegments(pattern)
  if (parts.length > path.length) return false
  return parts.every((part, index) => (part.startsWith(':') ? path[index] !== '' : part === path[index]))
}

/**
 * The one active row for a pathname (§2.2 rule 2): an exact href match wins;
 * then the row the page was opened from (`navFrom`), when the viewer sees it;
 * otherwise the item with the longest matching activeFor pattern or href prefix,
 * a prefix ending at a "/" boundary; items marked exact match only exactly.
 */
export function findActiveHref(pathname, items = [], navFrom = null) {
  if (!pathname) return null
  const exact = items.find((item) => item.href === pathname)
  if (exact) return exact.href
  if (navFrom && items.some((item) => item.href === navFrom)) return navFrom
  let best = null
  let bestLength = -1
  for (const item of items) {
    if (item.exact) continue
    const candidates = [item.href, ...(item.activeFor || [])]
    for (const pattern of candidates) {
      if (matchesPrefix(pathname, pattern) && pattern.length > bestLength) {
        best = item.href
        bestLength = pattern.length
      }
    }
  }
  return best
}

function routeTitleEntry(pathname, navFrom = null) {
  return ROUTE_TITLES.find((entry) => matchesPattern(pathname, entry.pattern)
    && !(entry.except || []).includes(patternSegments(pathname).at(-1))
    && (!entry.navFrom || entry.navFrom === navFrom))
}

/** The title of a screen without a row of its own, in the language asked; the fallback is Today. */
export function getRouteTitle(pathname, language = getAdminLanguage(), navFrom = null) {
  return pickLabel(routeTitleEntry(pathname, navFrom)?.label || FALLBACK_TITLE, language)
}

/** Whether the pathname has a title of its own in §4.7 (and not only the fallback). */
export function hasRouteTitle(pathname, navFrom = null) {
  return Boolean(routeTitleEntry(pathname, navFrom))
}

function isItemAllowed(item, canAccess, ctx) {
  if (!canAccess(getRouteAccess(item.href))) return false
  if (item.navAccess && !canAccess(item.navAccess)) return false
  if (typeof item.visibleWhen === 'function' && !item.visibleWhen(ctx)) return false
  return true
}

function localizeItem(item, language) {
  return {
    key: item.key,
    name: pickLabel(item.label, language),
    href: item.href,
    icon: item.icon,
    badgeKey: item.badgeKey || null,
    activeFor: item.activeFor || [],
    exact: Boolean(item.exact),
  }
}

/**
 * The sidebar for the viewer: localized groups `{ key, label, items }`, with the
 * rows the viewer cannot open and the empty groups removed.
 *
 * ctx (all optional): `preflowWork` (the pre-flow count, 0 until it arrives),
 * `pathname` (the page shown now), `navFrom` (the row it was opened from),
 * `filtering` (the sidebar filter has text) and `language`. The pre-flow group
 * follows §2.2 rule 6.
 */
export function getSidebarNavigation(canAccess = () => true, ctx = {}) {
  const language = ctx.language || getAdminLanguage()
  const ruleContext = { ...ctx, canAccess }
  const groups = NAV_GROUPS.map((group) => ({
    key: group.key,
    label: group.label ? pickLabel(group.label, language) : '',
    items: group.items.filter((item) => isItemAllowed(item, canAccess, ruleContext)).map((item) => localizeItem(item, language)),
  })).filter((group) => group.items.length > 0)

  const preflow = groups.find((group) => group.key === 'preflow')
  if (!preflow) return groups

  const activeHref = ctx.pathname ? findActiveHref(ctx.pathname, groups.flatMap((group) => group.items), ctx.navFrom || null) : null
  const preflowVisible = !canAccess(SCREENING_DECIDE)
    || Number(ctx.preflowWork) > 0
    || (activeHref != null && preflow.items.some((item) => item.href === activeHref))
    || Boolean(ctx.filtering)

  return preflowVisible ? groups : groups.filter((group) => group.key !== 'preflow')
}

export function getNavigationItems(canAccess, ctx = {}) {
  return getSidebarNavigation(canAccess, ctx).flatMap((group) => group.items)
}

/** Every label the sidebar can show, both languages, for the copy tests. */
export function allNavigationLabels() {
  return NAV_GROUPS.flatMap((group) => [...(group.label ? [group.label] : []), ...group.items.map((item) => item.label)])
}

export function allRouteTitleLabels() {
  return [...ROUTE_TITLES.map((entry) => entry.label), FALLBACK_TITLE]
}
