import { useCallback, useEffect, useState } from 'react'
import AppSidebar from '../components/layout/AppSidebar'
import AppTopbar from '../components/layout/AppTopbar'
import RouteScrollReset from '../components/layout/RouteScrollReset'
import { getAdminLanguage } from '../services/languageStorage'

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const skipLink = { ar: 'انتقل إلى المحتوى الرئيسي', en: 'Skip to main content', nl: 'Ga naar de hoofdinhoud' }[language]
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), [])

  useEffect(() => {
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [isArabic, language])

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-[var(--color-background)]">
      <a className="skip-link" href="#main-content">{skipLink}</a>
      <RouteScrollReset onRouteChange={closeSidebar} />
      <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div
        className={`min-h-screen transition-[margin] duration-300 ${
          isArabic ? 'lg:mr-[var(--layout-sidebar-width)]' : 'lg:ml-[var(--layout-sidebar-width)]'
        }`}
      >
        <AppTopbar onMenuToggle={() => setIsSidebarOpen((value) => !value)} />
        <main id="main-content" tabIndex="-1" className="min-w-0 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <div className="app-container app-page-enter">{children}</div>
        </main>
      </div>
    </div>
  )
}
