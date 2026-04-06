import {
  LayoutDashboard,
  Users,
  BookOpenCheck,
  Grid3X3,
  GraduationCap,
  Layers3,
  BookOpen,
  FileQuestion,
  Settings,
  LifeBuoy,
} from 'lucide-react'

export const mainNavigation = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Users', path: '/users', icon: Users },
  { label: 'Enrollments', path: '/enrollments', icon: BookOpenCheck },
  { label: 'Categories', path: '/categories', icon: Grid3X3 },
  { label: 'Programs', path: '/programs', icon: GraduationCap },
  { label: 'Sections', path: '/sections', icon: Layers3 },
  { label: 'Lessons', path: '/lessons', icon: BookOpen },
  { label: 'Quizzes', path: '/quizzes', icon: FileQuestion },
]

export const secondaryNavigation = [
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Support', path: '/support', icon: LifeBuoy },
]