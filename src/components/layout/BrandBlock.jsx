import { GraduationCap } from 'lucide-react'
import { branding } from '../../config/branding'

export default function BrandBlock({ collapsed = false }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: 'var(--color-secondary)' }}
      >
        <GraduationCap size={22} color="var(--color-primary)" />
      </div>

      {!collapsed && (
        <div>
          <h1 className="text-lg font-semibold text-white leading-tight">
            {branding.logo.fullText}
          </h1>
          <p className="text-sm text-white/60 leading-tight">
            {branding.logo.subText}
          </p>
        </div>
      )}
    </div>
  )
}