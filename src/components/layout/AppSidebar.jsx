import { X } from 'lucide-react'
import { branding, getBrandText } from '../../config/branding'
import { getSidebarNavigation } from '../../routes/navigation'
import { getAdminLanguage } from '../../services/languageStorage'
import { useAuthorization } from '../../features/auth/context/useAuthorization'
import SidebarNav from './SidebarNav'

const footerCopy = {
  ar: {
    closeMenu: 'إغلاق القائمة',
    close: 'إغلاق',
    administration: 'الإدارة المركزية',
    system: 'نظام الاعتماد المهني',
  },
  en: {
    closeMenu: 'Close menu',
    close: 'Close',
    administration: 'Central administration',
    system: 'Accreditation system',
  },
  nl: {
    closeMenu: 'Menu sluiten',
    close: 'Sluiten',
    administration: 'Centraal beheer',
    system: 'Accreditatiesysteem',
  },
}

export default function AppSidebar({ isOpen = false, onClose }) {
  const { canAccess } = useAuthorization()
  const groups = getSidebarNavigation(canAccess)
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const brand = getBrandText(language)
  const copy = footerCopy[language] || footerCopy.ar
  const closedTransform = isArabic ? 'translate-x-full' : '-translate-x-full'

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label={copy.closeMenu}
          className="fixed inset-0 z-40 bg-[#031C2C]/55 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`icpc-grid-pattern fixed inset-y-0 z-50 flex w-[var(--layout-sidebar-width)] flex-col border-white/10 bg-[var(--color-primary)] text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 lg:shadow-none ${
          isArabic ? 'right-0 border-l' : 'left-0 border-r'
        } ${isOpen ? 'translate-x-0' : closedTransform}`}
      >
        <div className="flex h-[var(--layout-topbar-height)] shrink-0 items-center gap-3 border-b border-white/10 px-5">
          <img
            src={branding.logo.src}
            alt={branding.shortName}
            className="h-12 w-12 shrink-0 object-contain drop-shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-tight text-white">{branding.shortName}</p>
            <p className="mt-0.5 text-[10px] leading-4 text-[#B8CFDA]">{brand.productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label={copy.close}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="hide-scrollbar flex-1 overflow-y-auto px-4 py-5">
          <SidebarNav groups={groups} />
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-secondary)] text-xs font-bold text-[var(--color-primary)]">
                IC
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{copy.administration}</p>
                <p className="text-[11px] text-[#9DB9C8]">{copy.system}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
