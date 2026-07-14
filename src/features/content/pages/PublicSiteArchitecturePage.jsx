import {
  Award,
  Building2,
  Circle,
  FileQuestion,
  Globe2,
  GraduationCap,
  Home,
  MessageCircle,
  Newspaper,
  Network,
  Route,
  Users,
} from 'lucide-react'
import { Badge, Card, CardContent } from '../../../components/ui'
import { getPlatformArchitecture } from '../../../config/platformArchitecture'
import { getAdminLanguage } from '../../../services/languageStorage'
import { getLocaleForLanguage } from '../../../utils/localization'

const iconMap = {
  about: Building2,
  methodology: Route,
  'training-programs': GraduationCap,
  'rpl-service': FileQuestion,
  'professional-accreditation': Award,
  'experts-network': Users,
  news: Newspaper,
  'contact-login': MessageCircle,
}

const copyByLanguage = {
  ar: {
    eyebrow: 'تجربة الزائر قبل تسجيل الدخول',
    title: 'بنية الموقع العام',
    description: 'الخريطة المرجعية لصفحات ICPC العامة من الصفحة الرئيسية إلى المحتوى التعريفي والتدريبي وخدمات RPL والاعتماد.',
    mainSections: 'أقسام رئيسية',
    childPaths: 'مسارات فرعية',
    start: 'نقطة البداية',
    home: 'الصفحة الرئيسية',
    homeDescription: 'المدخل الموحد إلى محتوى الموقع العام وخدماته الأساسية.',
    branches: 'الأقسام المتفرعة',
    section: 'القسم',
    note: 'تمثل هذه الخريطة الهيكل المعلوماتي للموقع العام فقط؛ أما رحلة المتقدم ولوحات الأدوار الإدارية فتبدأ بعد تسجيل الدخول.',
  },
  en: {
    eyebrow: 'Visitor experience before login',
    title: 'Public Website Architecture',
    description: 'Reference map for ICPC public pages, from the home page to informational content, training, RPL services, and accreditation.',
    mainSections: 'main sections',
    childPaths: 'child paths',
    start: 'Starting point',
    home: 'Home page',
    homeDescription: 'The unified entry point for public website content and core services.',
    branches: 'Child sections',
    section: 'Section',
    note: 'This map represents the public website information architecture only. Applicant journeys and role dashboards begin after login.',
  },
  nl: {
    eyebrow: 'Bezoekerservaring vóór login',
    title: 'Architectuur van de Publieke Website',
    description: 'Referentiekaart voor publieke ICPC-pagina’s, van de homepage tot informatie, trainingen, RPL-services en accreditatie.',
    mainSections: 'hoofdsecties',
    childPaths: 'subroutes',
    start: 'Startpunt',
    home: 'Homepage',
    homeDescription: 'Het centrale toegangspunt voor publieke website-inhoud en kerndiensten.',
    branches: 'Onderliggende secties',
    section: 'Sectie',
    note: 'Deze kaart beschrijft alleen de informatiearchitectuur van de publieke website. Aanvragerstrajecten en roldashboards beginnen na login.',
  },
}

function SectionCard({ section, index, copy, formatNumber }) {
  const SectionIcon = iconMap[section.id] || Globe2
  const children = section.children || []

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-0">
        <div className="flex items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-5 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white">
            <SectionIcon aria-hidden="true" size={22} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--color-text-muted)]">
              {copy.section} {formatNumber(index + 1)}
            </p>
            <h3 className="mt-0.5 text-lg font-bold leading-7 text-[var(--color-text)]">{section.title}</h3>
          </div>
          <Badge variant="secondary" className="shrink-0">{formatNumber(children.length)}</Badge>
        </div>

        <ul className="flex-1 space-y-3 px-5 py-5 sm:px-6" aria-label={section.title}>
          {children.map((child) => (
            <li key={child} className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3">
              <Circle aria-hidden="true" size={9} fill="currentColor" className="mt-2 shrink-0 text-[var(--color-secondary)]" />
              <p className="text-sm font-semibold leading-6 text-[var(--color-text)]">{child}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export default function PublicSiteArchitecturePage() {
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const copy = copyByLanguage[language] || copyByLanguage.ar
  const architecture = getPlatformArchitecture(language)
  const sections = architecture.publicSiteArchitecture.filter((section) => section.id !== 'home')
  const childCount = sections.reduce((total, section) => total + (section.children?.length || 0), 0)
  const formatNumber = (value) => new Intl.NumberFormat(getLocaleForLanguage(language)).format(value)

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className={`space-y-8 ${isArabic ? 'text-right' : 'text-left'}`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
            <Globe2 aria-hidden="true" size={18} />
            <span>{copy.eyebrow}</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text)] sm:text-4xl">{copy.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-text-muted)] sm:text-base">{copy.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="primary" className="px-4 py-2">{formatNumber(sections.length)} {copy.mainSections}</Badge>
          <Badge variant="secondary" className="px-4 py-2">{formatNumber(childCount)} {copy.childPaths}</Badge>
        </div>
      </div>

      <div className="relative mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-primary)] px-6 py-7 text-white shadow-[var(--shadow-card)] sm:px-8">
          <Network aria-hidden="true" size={120} strokeWidth={1} className="absolute -left-5 -bottom-9 text-white/5" />
          <div className="relative flex items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-secondary)] text-[var(--color-primary)]">
              <Home aria-hidden="true" size={27} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60">{copy.start}</p>
              <h2 className="mt-1 text-2xl font-bold">{copy.home}</h2>
              <p className="mt-1 text-sm leading-6 text-white/70">{copy.homeDescription}</p>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="mx-auto h-10 w-px bg-[var(--color-border)]" />
        <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-bold text-[var(--color-text-muted)] shadow-[var(--shadow-card)]">
          <span className="h-2 w-2 rounded-full bg-[var(--color-secondary)]" />
          {copy.branches}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
        {sections.map((section, index) => (
          <SectionCard key={section.id} section={section} index={index} copy={copy} formatNumber={formatNumber} />
        ))}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-4 text-sm leading-6 text-[var(--color-text-muted)]">
        {copy.note}
      </div>
    </section>
  )
}
