import {
  BookOpen,
  FileQuestion,
  Grid3X3,
  GraduationCap,
  Layers3,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react'
import { getAdminLanguage } from '../services/languageStorage'

const navigationLabelMap = {
  dashboard: { en: 'Dashboard', ar: 'لوحة التحكم', nl: 'Dashboard' },
  users: { en: 'Users', ar: 'المستخدمون', nl: 'Gebruikers' },
  categories: { en: 'Categories', ar: 'التصنيفات', nl: 'Categorieen' },
  programs: { en: 'Programs', ar: 'البرامج', nl: "Programma's" },
  sections: { en: 'Sections', ar: 'الأقسام', nl: 'Secties' },
  lessons: { en: 'Lessons', ar: 'الدروس', nl: 'Lessen' },
  quizzes: { en: 'Question Banks', ar: 'بنوك الأسئلة', nl: 'Vraagbanken' },
  settings: { en: 'Settings', ar: 'الإعدادات', nl: 'Instellingen' },
}

function getLabel(key, language) {
  const entry = navigationLabelMap[key]
  if (!entry) return key
  return entry[language] || entry.en
}

export function getSidebarNavigation() {
  const language = getAdminLanguage()

  return [
    { name: getLabel('dashboard', language), href: '/dashboard', icon: LayoutDashboard },
    { name: getLabel('users', language), href: '/users', icon: Users },
    { name: getLabel('categories', language), href: '/categories', icon: Grid3X3 },
    { name: getLabel('programs', language), href: '/programs', icon: GraduationCap },
    { name: getLabel('sections', language), href: '/sections', icon: Layers3 },
    { name: getLabel('lessons', language), href: '/lessons', icon: BookOpen },
    { name: getLabel('quizzes', language), href: '/quizzes', icon: FileQuestion },
    { name: getLabel('settings', language), href: '/settings', icon: Settings },
  ]
}
