import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Activity,
  Bell,
  BookOpen,
  FileText,
  Network,
  Users,
  WalletCards,
} from 'lucide-react'
import { Badge, Card, CardContent, CardHeader, CardTitle, DataTableShell } from '../../../components/ui'
import { getAdminLanguage } from '../../../services/languageStorage'
import { readApiError, readLocalized, readPagination, unwrapCollection } from '../../../services/apiResponse'
import {
  fetchAdminApplications,
  fetchAdminConsultations,
  fetchAdminCpd,
  fetchAdminEnrollments,
  fetchAdminExperts,
  fetchAdminExpertiseCategories,
  fetchAdminMenus,
  fetchAdminPages,
  fetchAuditLogs,
  fetchNotifications,
} from '../services/platformApi'
import { formatLocalizedDateTime, formatLocalizedNumber } from '../../../utils/localization'

const moduleConfig = {
  '/content/pages': {
    title: 'صفحات الموقع العام',
    eyebrow: 'إدارة المحتوى',
    icon: FileText,
    description: 'صفحات CMS والقوائم العامة من واجهات الإدارة.',
    endpoints: [
      { label: 'الصفحات', request: () => fetchAdminPages({ per_page: 10 }) },
      { label: 'القوائم', request: () => fetchAdminMenus({ per_page: 10 }) },
    ],
  },
  '/content/news': {
    title: 'الأخبار والمنشورات',
    eyebrow: 'إدارة المحتوى',
    icon: BookOpen,
    description: 'لا يوجد مسار أخبار مستقل في ملف التسليم؛ يتم عرض صفحات CMS القابلة للاستخدام للنشر.',
    endpoints: [{ label: 'صفحات CMS', request: () => fetchAdminPages({ per_page: 10 }) }],
  },
  '/content/experts': {
    title: 'شبكة الخبراء',
    eyebrow: 'الدليل المهني',
    icon: Network,
    description: 'الخبراء، تصنيفات الخبرة، وطلبات الاستشارة.',
    endpoints: [
      { label: 'الخبراء', request: () => fetchAdminExperts({ per_page: 10 }) },
      { label: 'تصنيفات الخبرة', request: () => fetchAdminExpertiseCategories({ per_page: 10 }) },
      { label: 'الاستشارات', request: () => fetchAdminConsultations({ per_page: 10 }) },
    ],
  },
  '/finance': {
    title: 'المالية والاشتراكات',
    eyebrow: 'النظام المالي',
    icon: WalletCards,
    description: 'الواجهات المتاحة حاليًا للإدارة المالية هي enrollments وعمليات wallet من صفحة المستخدمين.',
    endpoints: [{ label: 'الالتحاقات', request: () => fetchAdminEnrollments({ per_page: 10 }) }],
  },
  '/ai-settings': {
    title: 'مساعد الذكاء الاصطناعي',
    eyebrow: 'إعدادات النظام',
    icon: Activity,
    description: 'لا يوجد endpoint إعدادات AI في التسليم الحالي؛ يتم عرض سجل التدقيق كمؤشر رقابي.',
    endpoints: [{ label: 'سجل التدقيق', request: () => fetchAuditLogs({ per_page: 10 }) }],
  },
  '/reports': {
    title: 'التقارير ومؤشرات الأداء',
    eyebrow: 'القياس والتحليل',
    icon: Activity,
    description: 'ملخصات مباشرة من أكثر من مصدر متاح في API.',
    endpoints: [
      { label: 'طلبات البرامج', request: () => fetchAdminApplications({ per_page: 10 }) },
      { label: 'الخبراء', request: () => fetchAdminExperts({ per_page: 10 }) },
      { label: 'سجل CPD', request: () => fetchAdminCpd({ per_page: 10 }) },
      { label: 'سجل التدقيق', request: () => fetchAuditLogs({ per_page: 10 }) },
    ],
  },
  '/notifications': {
    title: 'الرسائل والتنبيهات',
    eyebrow: 'التواصل التشغيلي',
    icon: Bell,
    description: 'تنبيهات المستخدم الحالي من endpoint الإشعارات.',
    endpoints: [{ label: 'التنبيهات', request: () => fetchNotifications({ per_page: 10 }) }],
  },
}

const fallbackConfig = {
  title: 'وحدة النظام',
  eyebrow: 'ICPC',
  icon: Activity,
  description: 'مساحة API عامة.',
  endpoints: [],
}

const endpointLabels = {
  en: {
    '/content/pages': ['Pages', 'Menus'],
    '/content/news': ['CMS pages'],
    '/content/experts': ['Experts', 'Expertise categories', 'Consultations'],
    '/finance': ['Enrollments'],
    '/ai-settings': ['Audit log'],
    '/reports': ['Programme applications', 'Experts', 'CPD records', 'Audit log'],
    '/notifications': ['Notifications'],
  },
  nl: {
    '/content/pages': ['Pagina’s', 'Menu’s'],
    '/content/news': ['CMS-pagina’s'],
    '/content/experts': ['Experts', 'Expertisecategorieën', 'Consultaties'],
    '/finance': ['Inschrijvingen'],
    '/ai-settings': ['Auditlog'],
    '/reports': ['Programma-aanvragen', 'Experts', 'CPD-records', 'Auditlog'],
    '/notifications': ['Meldingen'],
  },
}

const pageCopy = {
  ar: {
    connected: 'متصل',
    error: 'خطأ',
    loading: 'جار الاتصال',
    apiRatio: (ok, total) => `${ok}/${total} API`,
    recordsFromApi: 'سجلات من API.',
    latestRecords: 'آخر السجلات',
    latestDescription: 'قراءة مباشرة من المصادر المرتبطة بهذه الوحدة.',
    empty: 'لا توجد سجلات متاحة من الواجهات المرتبطة.',
    loadingRows: 'جار تحميل البيانات...',
    source: 'المصدر',
    record: 'السجل',
    status: 'الحالة',
    updatedAt: 'آخر تحديث',
    contracts: 'عقود API المرتبطة',
  },
  en: {
    connected: 'Connected',
    error: 'Error',
    loading: 'Connecting',
    apiRatio: (ok, total) => `${ok}/${total} APIs`,
    recordsFromApi: 'Records from the API.',
    latestRecords: 'Latest Records',
    latestDescription: 'Live data from the sources connected to this workspace.',
    empty: 'No records are available from the connected endpoints.',
    loadingRows: 'Loading data...',
    source: 'Source',
    record: 'Record',
    status: 'Status',
    updatedAt: 'Last update',
    contracts: 'Connected API Contracts',
  },
  nl: {
    connected: 'Verbonden',
    error: 'Fout',
    loading: 'Verbinden',
    apiRatio: (ok, total) => `${ok}/${total} APIs`,
    recordsFromApi: 'Records uit de API.',
    latestRecords: 'Laatste Records',
    latestDescription: 'Live gegevens uit de bronnen die aan deze werkruimte zijn gekoppeld.',
    empty: 'Er zijn geen records beschikbaar via de gekoppelde endpoints.',
    loadingRows: 'Gegevens laden...',
    source: 'Bron',
    record: 'Record',
    status: 'Status',
    updatedAt: 'Laatste update',
    contracts: 'Gekoppelde API-contracten',
  },
}

const moduleText = {
  en: {
    '/content/pages': {
      title: 'Public Website Pages',
      eyebrow: 'Content Management',
      description: 'CMS pages and public navigation menus from the administration API.',
    },
    '/content/news': {
      title: 'News & Publications',
      eyebrow: 'Content Management',
      description: 'The handoff has no dedicated news endpoint yet, so CMS pages are shown as the publishing source.',
    },
    '/content/experts': {
      title: 'Expert Network',
      eyebrow: 'Professional Directory',
      description: 'Experts, expertise categories, and consultation requests.',
    },
    '/rpl/applications': {
      title: 'RPL Applications',
      eyebrow: 'RPL',
      description: 'Program applications are the currently available operational source for pathway requests.',
    },
    '/rpl/evidence': {
      title: 'Professional Evidence',
      eyebrow: 'RPL',
      description: 'No dedicated evidence endpoint exists in the handoff yet; related program applications are shown.',
    },
    '/rpl/assessments': {
      title: 'Professional Assessment',
      eyebrow: 'RPL',
      description: 'No dedicated RPL assessment endpoint exists yet; related applications and CPD records are shown.',
    },
    '/rpl/accreditation': {
      title: 'Accreditation & Certificates',
      eyebrow: 'RPL',
      description: 'Applications and experts are shown until dedicated RPL certificate contracts are available.',
    },
    '/rpl/appeals': {
      title: 'Appeals',
      eyebrow: 'Governance',
      description: 'No dedicated appeals endpoint exists yet; audit logs are shown as the governance reference.',
    },
    '/standards': {
      title: 'Competency Standards',
      eyebrow: 'Standards',
      description: 'Expertise categories are the closest available taxonomy in the current API.',
    },
    '/assessors': {
      title: 'Assessors & Trainers',
      eyebrow: 'Expert Network',
      description: 'Expert records, classifications, and consultations.',
    },
    '/committees': {
      title: 'Committees',
      eyebrow: 'Governance',
      description: 'No committee endpoint exists yet; audit logs are shown as a governance reference.',
    },
    '/quality': {
      title: 'Quality Assurance',
      eyebrow: 'Quality',
      description: 'CPD reviews and audit logs are connected as the available quality monitoring sources.',
    },
    '/finance': {
      title: 'Finance & Subscriptions',
      eyebrow: 'Finance',
      description: 'The available finance surfaces are enrollments and wallet actions from user management.',
    },
    '/ai-settings': {
      title: 'AI Assistant',
      eyebrow: 'System Settings',
      description: 'No AI settings endpoint exists yet; audit logs are shown as the control reference.',
    },
    '/reports': {
      title: 'Reports & KPIs',
      eyebrow: 'Analytics',
      description: 'Live summaries from multiple available API sources.',
    },
    '/notifications': {
      title: 'Messages & Notifications',
      eyebrow: 'Operational Communication',
      description: 'Notifications for the current authenticated user.',
    },
  },
  nl: {
    '/content/pages': {
      title: 'Publieke Websitepagina’s',
      eyebrow: 'Contentbeheer',
      description: 'CMS-pagina’s en openbare navigatiemenu’s uit de beheer-API.',
    },
    '/content/news': {
      title: 'Nieuws & Publicaties',
      eyebrow: 'Contentbeheer',
      description: 'De overdracht bevat nog geen apart nieuws-endpoint, daarom worden CMS-pagina’s getoond als publicatiebron.',
    },
    '/content/experts': {
      title: 'Expert-netwerk',
      eyebrow: 'Professionele Gids',
      description: 'Experts, expertisecategorieën en consultatieaanvragen.',
    },
    '/rpl/applications': {
      title: 'RPL-aanvragen',
      eyebrow: 'RPL',
      description: 'Programma-aanvragen zijn de huidige operationele bron voor trajectaanvragen.',
    },
    '/rpl/evidence': {
      title: 'Professioneel Bewijs',
      eyebrow: 'RPL',
      description: 'Er is nog geen apart bewijs-endpoint; gerelateerde programma-aanvragen worden getoond.',
    },
    '/rpl/assessments': {
      title: 'Professionele Beoordeling',
      eyebrow: 'RPL',
      description: 'Er is nog geen apart RPL-beoordelingsendpoint; aanvragen en CPD-records worden getoond.',
    },
    '/rpl/accreditation': {
      title: 'Accreditatie & Certificaten',
      eyebrow: 'RPL',
      description: 'Aanvragen en experts worden getoond totdat specifieke RPL-certificaatcontracten beschikbaar zijn.',
    },
    '/rpl/appeals': {
      title: 'Bezwaar',
      eyebrow: 'Governance',
      description: 'Er is nog geen apart bezwaar-endpoint; auditlogs worden getoond als governance-referentie.',
    },
    '/standards': {
      title: 'Competentiestandaarden',
      eyebrow: 'Standaarden',
      description: 'Expertisecategorieën zijn de dichtstbijzijnde beschikbare taxonomie in de huidige API.',
    },
    '/assessors': {
      title: 'Beoordelaars & Trainers',
      eyebrow: 'Expert-netwerk',
      description: 'Expertrecords, classificaties en consultaties.',
    },
    '/committees': {
      title: 'Commissies',
      eyebrow: 'Governance',
      description: 'Er is nog geen commissie-endpoint; auditlogs worden getoond als governance-referentie.',
    },
    '/quality': {
      title: 'Kwaliteitsborging',
      eyebrow: 'Kwaliteit',
      description: 'CPD-reviews en auditlogs zijn gekoppeld als beschikbare bronnen voor kwaliteitsmonitoring.',
    },
    '/finance': {
      title: 'Financiën & Abonnementen',
      eyebrow: 'Financiën',
      description: 'De beschikbare financiële onderdelen zijn inschrijvingen en wallet-acties vanuit gebruikersbeheer.',
    },
    '/ai-settings': {
      title: 'AI-assistent',
      eyebrow: 'Systeeminstellingen',
      description: 'Er is nog geen AI-instellingenendpoint; auditlogs worden getoond als controlebron.',
    },
    '/reports': {
      title: 'Rapporten & KPI’s',
      eyebrow: 'Analytics',
      description: 'Live samenvattingen uit meerdere beschikbare API-bronnen.',
    },
    '/notifications': {
      title: 'Berichten & Meldingen',
      eyebrow: 'Operationele Communicatie',
      description: 'Meldingen voor de huidige ingelogde gebruiker.',
    },
  },
}

function normalizePath(pathname) {
  return pathname === '/' ? pathname : pathname.replace(/\/+$/, '')
}

async function loadEndpoint(endpoint) {
  try {
    const payload = await endpoint.request()
    return { ...endpoint, ok: true, payload, rows: unwrapCollection(payload), pagination: readPagination(payload) }
  } catch (error) {
    return { ...endpoint, ok: false, error: readApiError(error), rows: [], pagination: null }
  }
}

function getRecordTitle(record, language) {
  return (
    readLocalized(record?.title, language) ||
    readLocalized(record?.name, language) ||
    readLocalized(record?.subject, language) ||
    record?.email ||
    record?.event ||
    record?.id ||
    '—'
  )
}

function getRecordMeta(record, language) {
  return (
    readLocalized(record?.status, language) ||
    readLocalized(record?.type, language) ||
    readLocalized(record?.role, language) ||
    readLocalized(record?.created_at, language) ||
    '—'
  )
}

export default function ApiModulePage() {
  const { pathname } = useLocation()
  const language = getAdminLanguage()
  const normalizedPath = normalizePath(pathname)
  const config = moduleConfig[normalizedPath] || fallbackConfig
  const localizedConfig = { ...config, ...(moduleText[language]?.[normalizedPath] || {}) }
  const endpoints = useMemo(() => config.endpoints.map((endpoint, index) => ({
    ...endpoint,
    label: endpointLabels[language]?.[normalizedPath]?.[index] || endpoint.label,
  })), [config, language, normalizedPath])
  const copy = pageCopy[language] || pageCopy.en
  const isArabic = language === 'ar'
  const Icon = config.icon
  const [state, setState] = useState({ isLoading: true, sources: [] })

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      setState({ isLoading: true, sources: [] })
      const sources = await Promise.all(endpoints.map(loadEndpoint))
      if (isMounted) setState({ isLoading: false, sources })
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [endpoints])

  const combinedRows = useMemo(
    () =>
      state.sources.flatMap((source) =>
        source.rows.slice(0, 5).map((row) => ({
          ...row,
          source: source.label,
        }))
      ),
    [state.sources]
  )

  const columns = [
    {
      key: 'source',
      label: copy.source,
      render: (row) => <Badge variant="info">{row.source}</Badge>,
    },
    {
      key: 'title',
      label: copy.record,
      render: (row) => <span className="font-semibold">{getRecordTitle(row, language)}</span>,
    },
    {
      key: 'status',
      label: copy.status,
      render: (row) => getRecordMeta(row, language),
    },
    {
      key: 'created_at',
      label: copy.updatedAt,
      render: (row) => formatLocalizedDateTime(row.updated_at || row.created_at, language),
    },
  ]

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className={`space-y-7 ${isArabic ? 'text-right' : 'text-left'}`}>
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-primary)] px-6 py-7 text-white shadow-[var(--shadow-card)] sm:px-8 sm:py-9">
        <div className="absolute -left-16 -top-24 h-56 w-56 rounded-full border-[32px] border-white/5" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-secondary)] text-[var(--color-primary)]">
              <Icon aria-hidden="true" size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/65">{localizedConfig.eyebrow}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{localizedConfig.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/75">{localizedConfig.description}</p>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit px-4 py-2">
            {state.isLoading
              ? copy.loading
              : copy.apiRatio(formatLocalizedNumber(state.sources.filter((source) => source.ok).length, language), formatLocalizedNumber(endpoints.length, language))}
          </Badge>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {state.isLoading
          ? endpoints.map((endpoint) => (
              <Card key={endpoint.label}>
                <CardContent className="p-5">
                  <p className="text-sm font-bold text-[var(--color-text)]">{endpoint.label}</p>
                  <div className="mt-4 h-8 w-24 animate-pulse rounded bg-[var(--color-border)]/60" />
                </CardContent>
              </Card>
            ))
          : state.sources.map((source) => (
              <Card key={source.label}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[var(--color-text)]">{source.label}</p>
                    <Badge variant={source.ok ? 'success' : 'danger'}>{source.ok ? copy.connected : copy.error}</Badge>
                  </div>
                  <p className="mt-4 text-3xl font-bold text-[var(--color-primary)]">
                    {source.ok ? formatLocalizedNumber(source.pagination?.total || source.rows.length, language) : '—'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
                    {source.ok ? copy.recordsFromApi : source.error}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      <DataTableShell
        title={copy.latestRecords}
        description={copy.latestDescription}
        columns={columns}
        rows={combinedRows}
        emptyText={state.isLoading ? copy.loadingRows : copy.empty}
      />

      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <CardTitle>{copy.contracts}</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-2">
            {config.endpoints.map((endpoint) => (
              <Badge key={endpoint.label} variant="neutral" className="px-4 py-2">
                {endpoint.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
