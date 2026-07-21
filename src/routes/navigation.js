import {
  Award,
  BadgeCheck,
  BookOpenCheck,
  Bot,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  FileQuestion,
  FileText,
  FolderOpen,
  Gavel,
  GraduationCap,
  Headphones,
  Landmark,
  Layers3,
  LibraryBig,
  LayoutDashboard,
  Newspaper,
  PanelsTopLeft,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  UsersRound,
  WalletCards,
} from 'lucide-react'
import { getAdminLanguage } from '../services/languageStorage'
import { getRouteAccess } from './routeAccess'

const groups = [
  {
    label: { ar: 'الموقع العام', en: 'Public website', nl: 'Publieke website' },
    items: [
      {
        label: { ar: 'هيكل الموقع العام', en: 'Website architecture', nl: 'Website-architectuur' },
        href: '/content/architecture',
        icon: PanelsTopLeft,
      },
      {
        label: { ar: 'الصفحات والمحتوى', en: 'Pages & content', nl: "Pagina's & inhoud" },
        href: '/content/pages',
        icon: FileText,
      },
      { label: { ar: 'الأخبار', en: 'News', nl: 'Nieuws' }, href: '/content/news', icon: Newspaper },
      {
        label: { ar: 'شبكة الخبراء', en: 'Expert network', nl: 'Expert-netwerk' },
        href: '/content/experts',
        icon: UsersRound,
      },
    ],
  },
  {
    label: { ar: 'رحلة الاعتماد RPL', en: 'RPL accreditation', nl: 'RPL-accreditatie' },
    items: [
      {
        label: { ar: 'طلبات الاعتراف', en: 'RPL applications', nl: 'RPL-aanvragen' },
        href: '/rpl/applications',
        icon: ClipboardList,
      },
      {
        label: { ar: 'التحقق والأدلة', en: 'Evidence & verification', nl: 'Bewijs & verificatie' },
        href: '/rpl/evidence',
        icon: FolderOpen,
      },
      { label: { ar: 'لوحة المقيّم', en: 'Assessor workbench', nl: 'Beoordelaarswerkruimte' }, href: '/rpl/assessments', icon: ClipboardCheck },
      {
        label: { ar: 'قرارات الاعتماد', en: 'Accreditation decisions', nl: 'Accreditatiebesluiten' },
        href: '/rpl/accreditation',
        icon: BadgeCheck,
      },
      {
        label: { ar: 'التظلمات والتجديد', en: 'Appeals & renewal', nl: 'Bezwaar & verlenging' },
        href: '/rpl/appeals',
        icon: Gavel,
      },
      {
        label: { ar: 'إعدادات RPL', en: 'RPL configuration', nl: 'RPL-configuratie' },
        href: '/rpl/configuration',
        icon: Settings,
      },
      {
        label: { ar: 'مرجع RPL المعتمد', en: 'RPL source of truth', nl: 'RPL-bron van waarheid' },
        href: '/rpl/source-of-truth',
        icon: BookOpenCheck,
      },
    ],
  },
  {
    label: { ar: 'التعلم والمعايير', en: 'Learning & standards', nl: 'Leren & standaarden' },
    items: [
      {
        label: { ar: 'مكتبة سد فجوات الكفاءات', en: 'Competency gap library', nl: 'Bibliotheek competentiekloven' },
        href: '/competency-gap-library',
        icon: LibraryBig,
      },
      {
        label: { ar: 'معايير الكفاءة', en: 'Competency standards', nl: 'Competentiestandaarden' },
        href: '/standards',
        icon: BookOpenCheck,
      },
      {
        label: { ar: 'البرامج والحقائب', en: 'Programs & packages', nl: "Programma's & pakketten" },
        href: '/programs',
        icon: GraduationCap,
      },
      {
        label: { ar: 'المحتوى التعليمي', en: 'Learning content', nl: 'Leerinhoud' },
        href: '/sections',
        icon: Layers3,
      },
      {
        label: { ar: 'أدوات التقييم والأسئلة', en: 'Assessment tools', nl: 'Beoordelingsinstrumenten' },
        href: '/quizzes',
        icon: FileQuestion,
      },
    ],
  },
  {
    label: { ar: 'العمليات والخدمات', en: 'Operations & services', nl: 'Operaties & diensten' },
    items: [
      {
        label: { ar: 'إدارة الشهادات', en: 'Certificate administration', nl: 'Certificaatbeheer' },
        href: '/certificates',
        icon: Award,
      },
      {
        label: { ar: 'المكتبة الرقمية', en: 'Digital library', nl: 'Digitale bibliotheek' },
        href: '/library',
        icon: LibraryBig,
      },
      {
        label: { ar: 'الدعم والاتصالات', en: 'Support & communications', nl: 'Support en communicatie' },
        href: '/support',
        icon: Headphones,
      },
      { label: { ar: 'النظام المالي', en: 'Finance', nl: 'Financiën' }, href: '/finance', icon: WalletCards },
    ],
  },
  {
    label: { ar: 'الحوكمة والإدارة', en: 'Governance & administration', nl: 'Governance & beheer' },
    items: [
      {
        label: { ar: 'المستخدمون والصلاحيات', en: 'Users & permissions', nl: 'Gebruikers & rechten' },
        href: '/users',
        icon: Users,
      },
      {
        label: { ar: 'عملاء الموقع', en: 'Website clients', nl: 'Websitecliënten' },
        href: '/users/website',
        icon: Users,
      },
      {
        label: { ar: 'عملاء المكتب', en: 'On-site clients', nl: 'Kantoorcliënten' },
        href: '/users/onsite',
        icon: Users,
      },
      {
        label: { ar: 'المقيّمون والمدربون', en: 'Assessors & trainers', nl: 'Beoordelaars & trainers' },
        href: '/assessors',
        icon: UserCheck,
      },
      { label: { ar: 'اللجان', en: 'Committees', nl: 'Commissies' }, href: '/committees', icon: Landmark },
      {
        label: { ar: 'الجودة والتدقيق', en: 'Quality & audit', nl: 'Kwaliteit & audit' },
        href: '/quality',
        icon: ShieldCheck,
      },
      {
        label: { ar: 'إعدادات الذكاء الاصطناعي', en: 'AI settings', nl: 'AI-instellingen' },
        href: '/ai-settings',
        icon: Bot,
      },
      {
        label: { ar: 'التقارير والمؤشرات', en: 'Reports & KPIs', nl: "Rapporten & KPI's" },
        href: '/reports',
        icon: ChartColumn,
      },
      {
        label: { ar: 'إعدادات النظام', en: 'System settings', nl: 'Systeeminstellingen' },
        href: '/settings',
        icon: Settings,
      },
    ],
  },
]

function pickLabel(label, language) {
  return label?.[language] || label?.en || label?.ar || label?.nl || ''
}

export function getSidebarNavigation(canAccess = () => true) {
  const language = getAdminLanguage()

  return [
    {
      label: '',
      items: [
        {
          name: pickLabel({ ar: 'نظرة عامة', en: 'Overview', nl: 'Overzicht' }, language),
          href: '/dashboard',
          icon: LayoutDashboard,
          access: getRouteAccess('/dashboard'),
        },
      ],
    },
    ...groups.map((group) => ({
      label: pickLabel(group.label, language),
      items: group.items
        .map((item) => ({
          name: pickLabel(item.label, language),
          href: item.href,
          icon: item.icon,
          access: getRouteAccess(item.href),
        }))
        .filter((item) => canAccess(item.access)),
    })).filter((group) => group.items.length),
  ].filter((group) => group.items.every((item) => canAccess(item.access)))
}

export function getNavigationItems(canAccess) {
  return getSidebarNavigation(canAccess).flatMap((group) => group.items)
}
