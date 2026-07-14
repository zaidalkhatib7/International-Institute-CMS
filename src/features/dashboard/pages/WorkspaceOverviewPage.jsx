import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Award,
  BookOpen,
  ChevronLeft,
  ClipboardCheck,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  Route,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, StatCard } from '../../../components/ui'
import { getPlatformArchitecture } from '../../../config/platformArchitecture'
import { getAdminLanguage } from '../../../services/languageStorage'
import { getLocaleForLanguage } from '../../../utils/localization'
import { readApiError, readPagination, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { fetchCurrentUser } from '../../auth/services/authService'
import {
  fetchAdminApplications,
  fetchAdminCpd,
  fetchAdminExperts,
  fetchLearnerDashboard,
  fetchNotifications,
} from '../../platform/services/platformApi'

const iconMap = {
  applicant: UserRound,
  assessor: ClipboardCheck,
  trainer: GraduationCap,
  committee: Scale,
  quality: ShieldCheck,
  finance: Wallet,
  administration: Settings,
  workspaces: LayoutDashboard,
  levels: Award,
  stages: Route,
  programs: BookOpen,
  users: Users,
  assessments: FileQuestion,
  settings: Settings,
}

const copyByLanguage = {
  ar: {
    badge: 'لوحة قيادة المنصة',
    subtitle: 'ICPC · منظومة الاعتراف بالتعلم والخبرة السابقة',
    title: 'مركز إدارة مسارات الاعتماد المهني',
    description: 'نظرة موحدة على الربط الحي مع API، وبنية مساحات العمل، ورحلة RPL، والوحدات الإدارية.',
    managePrograms: 'إدارة البرامج والحقائب',
    manageUsers: 'فتح المستخدمين والصلاحيات',
    apiTitle: 'حالة الربط مع API',
    apiDescription: 'قراءة مباشرة من واجهات /api/v1 حسب ملف التسليم.',
    loading: 'جار التحميل',
    authenticated: 'جلسة موثقة',
    limited: 'بيانات محدودة',
    currentAccount: 'الحساب الحالي',
    apiConnected: 'API متصل',
    apiFailed: 'تعذر الاتصال',
    apiTotal: 'إجمالي السجلات المتاحة من واجهة البيانات.',
    architecture: 'مؤشرات البنية',
    architectureHint: 'ملخص عددي ثابت لمعمارية المنصة.',
    structural: 'هيكلي',
    rplTitle: 'مسار الاعتراف بالخبرة (RPL)',
    rplHint: 'من الطلب إلى القرار وإصدار الاعتماد.',
    quickActions: 'وصول سريع',
    workspaces: 'مساحات العمل',
    modules: 'وحدات',
    optional: 'اختياري',
    planned: 'مخطط',
  },
  en: {
    badge: 'Platform Command Center',
    subtitle: 'ICPC · Recognition of Prior Learning and Experience',
    title: 'Professional Accreditation Operations Hub',
    description: 'A unified view of live API connectivity, workspaces, the RPL journey, and administration modules.',
    managePrograms: 'Manage programs & packages',
    manageUsers: 'Open users & permissions',
    apiTitle: 'API Connectivity',
    apiDescription: 'Live reads from /api/v1 according to the handoff file.',
    loading: 'Loading',
    authenticated: 'Authenticated session',
    limited: 'Limited data',
    currentAccount: 'Current account',
    apiConnected: 'API connected',
    apiFailed: 'Connection failed',
    apiTotal: 'Total records available from the data endpoint.',
    architecture: 'Architecture Metrics',
    architectureHint: 'Static structural summary of the platform architecture.',
    structural: 'Structural',
    rplTitle: 'RPL Recognition Pathway',
    rplHint: 'From application to decision and accreditation.',
    quickActions: 'Quick Access',
    workspaces: 'Workspaces',
    modules: 'modules',
    optional: 'Optional',
    planned: 'Planned',
  },
  nl: {
    badge: 'Platform Commandocentrum',
    subtitle: 'ICPC · Erkenning van eerder leren en ervaring',
    title: 'Hub voor professionele accreditatie',
    description: 'Een overzicht van live API-koppelingen, werkruimtes, de RPL-route en beheermodules.',
    managePrograms: 'Programma’s & pakketten beheren',
    manageUsers: 'Gebruikers & rechten openen',
    apiTitle: 'API-connectiviteit',
    apiDescription: 'Live reads uit /api/v1 volgens het overdrachtsbestand.',
    loading: 'Laden',
    authenticated: 'Geauthenticeerde sessie',
    limited: 'Beperkte gegevens',
    currentAccount: 'Huidig account',
    apiConnected: 'API verbonden',
    apiFailed: 'Verbinding mislukt',
    apiTotal: 'Totaal aantal records beschikbaar via het endpoint.',
    architecture: 'Architectuurmetrics',
    architectureHint: 'Statische structurele samenvatting van de platformarchitectuur.',
    structural: 'Structureel',
    rplTitle: 'RPL-erkenningsroute',
    rplHint: 'Van aanvraag tot besluit en accreditatie.',
    quickActions: 'Snelle Toegang',
    workspaces: 'Werkruimtes',
    modules: 'modules',
    optional: 'Optioneel',
    planned: 'Gepland',
  },
}

async function settleApi(label, request) {
  try {
    const payload = await request()
    return { label, ok: true, payload }
  } catch (error) {
    return { label, ok: false, error: readApiError(error) }
  }
}

function ApiStatusCard({ item, copy, formatNumber }) {
  const count = item.ok ? readPagination(item.payload).total : 0

  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-[var(--color-text)]">{item.label}</p>
          <Badge variant={item.ok ? 'success' : 'danger'}>{item.ok ? copy.apiConnected : copy.apiFailed}</Badge>
        </div>
        <p className="mt-4 text-3xl font-bold text-[var(--color-primary)]">
          {item.ok ? formatNumber(count) : '—'}
        </p>
        <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
          {item.ok ? copy.apiTotal : item.error}
        </p>
      </CardContent>
    </Card>
  )
}

function WorkspaceCard({ workspace, copy, formatNumber }) {
  const Icon = iconMap[workspace.icon] || LayoutDashboard
  const visibleModules = workspace.modules.slice(0, 4)

  return (
    <Card className="h-full transition-transform duration-200 hover:-translate-y-1">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
            <Icon size={23} />
          </div>
          <div>
            <CardTitle className="text-xl">{workspace.title}</CardTitle>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{workspace.description}</p>
          </div>
        </div>
        <Badge variant={workspace.optional ? 'warning' : 'neutral'} className="shrink-0">
          {workspace.optional ? copy.optional : copy.planned}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="border-t border-[var(--color-border)] pt-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">{copy.modules}</p>
            <span className="text-xs font-semibold text-[var(--color-primary)]">
              {formatNumber(workspace.modules.length)} {copy.modules}
            </span>
          </div>
          <ul className="space-y-3">
            {visibleModules.map((module) => (
              <li key={module.title} className="flex items-start gap-3 text-sm text-[var(--color-text)]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-secondary)]" />
                <span className="leading-6">{module.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default function WorkspaceOverviewPage() {
  const navigate = useNavigate()
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const copy = copyByLanguage[language] || copyByLanguage.ar
  const architecture = useMemo(() => getPlatformArchitecture(language), [language])
  const formatNumber = (value) => new Intl.NumberFormat(getLocaleForLanguage(language)).format(value)
  const [apiState, setApiState] = useState({
    isLoading: true,
    currentUser: null,
    learnerDashboard: null,
    summaries: [],
  })

  useEffect(() => {
    let isMounted = true

    async function loadDashboardApis() {
      const labels = {
        ar: ['التنبيهات', 'طلبات البرامج', 'الخبراء', 'سجل CPD'],
        en: ['Notifications', 'Program applications', 'Experts', 'CPD records'],
        nl: ['Meldingen', 'Programma-aanvragen', 'Experts', 'CPD-records'],
      }[language] || ['Notifications', 'Program applications', 'Experts', 'CPD records']

      const [userResult, dashboardResult, ...summaryResults] = await Promise.all([
        settleApi(copy.currentAccount, fetchCurrentUser),
        settleApi('Dashboard', fetchLearnerDashboard),
        settleApi(labels[0], () => fetchNotifications({ per_page: 10 })),
        settleApi(labels[1], () => fetchAdminApplications({ per_page: 10 })),
        settleApi(labels[2], () => fetchAdminExperts({ per_page: 10 })),
        settleApi(labels[3], () => fetchAdminCpd({ per_page: 10 })),
      ])

      if (!isMounted) return

      setApiState({
        isLoading: false,
        currentUser: userResult.ok ? unwrapApiData(userResult.payload)?.user || unwrapApiData(userResult.payload) : null,
        learnerDashboard: dashboardResult.ok ? unwrapApiData(dashboardResult.payload) : null,
        summaries: summaryResults,
      })
    }

    loadDashboardApis()

    return () => {
      isMounted = false
    }
  }, [copy.currentAccount, language])

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className={`space-y-8 ${isArabic ? 'text-right' : 'text-left'}`}>
      <Card className="relative overflow-hidden border-0 text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
        <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-[var(--color-secondary)] opacity-15" />
        <CardContent className="relative p-8 md:p-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <Badge variant="secondary" className="mb-5 gap-2">
                <Sparkles size={14} />
                {copy.badge}
              </Badge>
              <p className="text-sm font-semibold text-white/65">{copy.subtitle}</p>
              <h1 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">{copy.title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/75 md:text-lg">{copy.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => navigate('/programs')}>
                {copy.managePrograms}
                <ChevronLeft size={18} />
              </Button>
              <Button variant="outline" className="!border-white/25 !text-white hover:!bg-white/10" onClick={() => navigate('/users')}>
                {copy.manageUsers}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="api-live-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="api-live-title" className="text-2xl font-bold text-[var(--color-text)]">{copy.apiTitle}</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{copy.apiDescription}</p>
          </div>
          <Badge variant={apiState.currentUser ? 'success' : apiState.isLoading ? 'neutral' : 'warning'}>
            {apiState.isLoading ? copy.loading : apiState.currentUser ? copy.authenticated : copy.limited}
          </Badge>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_2fr]">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-bold text-[var(--color-text-muted)]">{copy.currentAccount}</p>
              <h3 className="mt-2 text-2xl font-bold text-[var(--color-primary)]">
                {apiState.currentUser?.name || apiState.currentUser?.email || (apiState.isLoading ? '...' : '—')}
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{apiState.currentUser?.email || '/user'}</p>
              {unwrapCollection(apiState.learnerDashboard?.notifications).length ? (
                <Badge variant="secondary" className="mt-4">
                  {formatNumber(unwrapCollection(apiState.learnerDashboard.notifications).length)}
                </Badge>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {apiState.summaries.map((item) => (
              <ApiStatusCard key={item.label} item={item} copy={copy} formatNumber={formatNumber} />
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="structural-stats-title">
        <div className="mb-4">
          <h2 id="structural-stats-title" className="text-2xl font-bold text-[var(--color-text)]">{copy.architecture}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{copy.architectureHint}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-4">
          {architecture.platformStructuralStats.map((stat) => {
            const Icon = iconMap[stat.icon] || LayoutDashboard
            return (
              <StatCard
                key={stat.id}
                title={stat.label}
                value={formatNumber(stat.value)}
                hint={stat.hint}
                badge={{ variant: 'neutral', label: copy.structural }}
                icon={<Icon size={22} />}
              />
            )
          })}
        </div>
      </section>

      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <CardTitle>{copy.rplTitle}</CardTitle>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.rplHint}</p>
        </CardHeader>
        <CardContent className="pt-7">
          <ol className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
            {architecture.rplWorkflowStages.map((stage, index) => (
              <li key={stage.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-sm font-bold text-white">
                  {formatNumber(index + 1)}
                </span>
                <h3 className="mt-5 font-bold text-[var(--color-text)]">{stage.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{stage.description}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <section aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="mb-4 text-2xl font-bold text-[var(--color-text)]">{copy.quickActions}</h2>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {architecture.dashboardQuickActions.map((action) => {
            const Icon = iconMap[action.icon] || LayoutDashboard
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => navigate(action.href)}
                className="group flex items-center gap-4 rounded-[24px] border border-[var(--color-border)] bg-white p-5 text-start shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-muted)] text-[var(--color-primary)] transition-colors group-hover:bg-[var(--color-primary)] group-hover:text-white">
                  <Icon size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-[var(--color-text)]">{action.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--color-text-muted)]">{action.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="workspaces-title">
        <h2 id="workspaces-title" className="mb-5 text-2xl font-bold text-[var(--color-text)]">{copy.workspaces}</h2>
        <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-3">
          {architecture.workspaceDefinitions.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} copy={copy} formatNumber={formatNumber} />
          ))}
        </div>
      </section>
    </div>
  )
}
