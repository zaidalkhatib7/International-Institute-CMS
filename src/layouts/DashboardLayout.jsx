import { useCallback, useState } from 'react'
import AppSidebar from '../components/layout/AppSidebar'
import AppTopbar from '../components/layout/AppTopbar'
import RouteScrollReset from '../components/layout/RouteScrollReset'
import { getAdminLanguage } from '../services/languageStorage'

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isArabic = getAdminLanguage() === 'ar'
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), [])

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <RouteScrollReset onRouteChange={closeSidebar} />
      <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div
        className={`min-h-screen transition-[margin] duration-300 ${
          isArabic ? 'lg:mr-[var(--layout-sidebar-width)]' : 'lg:ml-[var(--layout-sidebar-width)]'
        }`}
      >
        <AppTopbar onMenuToggle={() => setIsSidebarOpen((value) => !value)} />
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="app-container">{children}</div>
        </main>
      </div>
    </div>
  )
}
