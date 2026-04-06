import { Bell, Globe, Search } from 'lucide-react'
import { Button, Input } from '../ui'

export default function AppTopbar() {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between border-b px-8"
      style={{
        height: 'var(--layout-topbar-height)',
        backgroundColor: 'rgba(245, 241, 232, 0.96)',
        borderColor: 'var(--color-border)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">Admin Panel</p>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">
          International Institute CMS
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <Input
            placeholder="Search..."
            leftIcon={<Search size={18} />}
            inputClassName="w-[320px]"
          />
        </div>

        <Button variant="outline" size="icon">
          <Globe size={18} />
        </Button>

        <Button variant="outline" size="icon">
          <Bell size={18} />
        </Button>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white">
          DA
        </div>
      </div>
    </header>
  )
}
