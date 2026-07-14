import { useState } from 'react'
import AppSidebar from '../components/layout/AppSidebar'
import AppTopbar from '../components/layout/AppTopbar'
import { getAdminLanguage } from '../services/languageStorage'

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isArabic = getAdminLanguage() === 'ar'

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div
        className={`min-h-screen transition-[margin] duration-300 ${
          isArabic ? 'lg:mr-[var(--layout-sidebar-width)]' : 'lg:ml-[var(--layout-sidebar-width)]'
        }`}
      >
        <AppTopbar onMenuToggle={() => setIsSidebarOpen((value) => !value)} />
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="app-container">{children}</div>
        </main>
      </div>
    </div>
  )
}
