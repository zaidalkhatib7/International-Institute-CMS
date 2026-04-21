import { branding } from '../../config/branding'
import { getSidebarNavigation } from '../../routes/navigation'
import { getAdminLanguage } from '../../services/languageStorage'
import SidebarNav from './SidebarNav'

export default function AppSidebar() {
  const sidebarNavigation = getSidebarNavigation()
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const roleLabel =
    language === 'ar'
      ? 'منسق إداري'
      : language === 'nl'
      ? 'Admin Curator'
      : 'Admin Curator'

  return (
    <aside
      className={`fixed top-0 z-30 flex h-full flex-col px-6 py-8 text-white transition-all ${
        isArabic ? 'right-0 border-l' : 'left-0 border-r'
      }`}
      style={{
        width: 'var(--layout-sidebar-width)',
        backgroundColor: '#162E45',
        borderColor: 'rgba(203,213,225,0.12)',
      }}
    >
      <div className="mb-10 px-4">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-secondary)]">
          {branding.logo.fullText}
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <SidebarNav items={sidebarNavigation} />
      </nav>

      <div className="mt-auto border-t pt-4" style={{ borderColor: 'rgba(203,213,225,0.12)' }}>
        <div className="mt-6 rounded-2xl border p-3" style={{ borderColor: 'rgba(203,213,225,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <p className="text-sm font-semibold text-white">Dr. Arjan</p>
          <p className="text-xs uppercase tracking-[0.12em] text-[#CBD5E1]">
            {roleLabel}
          </p>
        </div>
      </div>
    </aside>
  )
}
