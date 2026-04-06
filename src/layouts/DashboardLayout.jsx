import AppSidebar from '../components/layout/AppSidebar'
import AppTopbar from '../components/layout/AppTopbar'

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AppSidebar />

      <div
        style={{
          marginLeft: 'var(--layout-sidebar-width)',
          minHeight: '100vh',
        }}
      >
        <AppTopbar />

        <main className="px-8 py-8">{children}</main>
      </div>
    </div>
  )
}