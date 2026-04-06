import { branding } from '../../config/branding'
import { sidebarNavigation } from '../../routes/navigation'
import SidebarNav from './SidebarNav'

export default function AppSidebar() {
  return (
    <aside
      className="fixed left-0 top-0 z-30 flex h-full flex-col border-r px-6 py-8 text-white transition-all"
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
            Admin Curator
          </p>
        </div>
      </div>
    </aside>
  )
}