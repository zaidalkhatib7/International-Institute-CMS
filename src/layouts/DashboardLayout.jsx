import AppSidebar from '../components/layout/AppSidebar'
import AppTopbar from '../components/layout/AppTopbar'
import { getAdminLanguage } from '../services/languageStorage'

export default function DashboardLayout({ children }) {
  const isArabic = getAdminLanguage() === 'ar'

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AppSidebar />

      <div
        style={{
          marginLeft: isArabic ? '0' : 'var(--layout-sidebar-width)',
          marginRight: isArabic ? 'var(--layout-sidebar-width)' : '0',
          minHeight: '100vh',
        }}
      >
        <AppTopbar />

        <main className="px-8 py-8">{children}</main>
      </div>
    </div>
  )
}
