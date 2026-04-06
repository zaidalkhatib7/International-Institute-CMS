import { useEffect } from 'react'
import { theme } from '../../config/theme'

export default function AppThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement

    const vars = {
      '--color-primary': theme.colors.primary,
      '--color-primary-hover': theme.colors.primaryHover,
      '--color-secondary': theme.colors.secondary,
      '--color-secondary-soft': theme.colors.secondarySoft,
      '--color-background': theme.colors.background,
      '--color-surface': theme.colors.surface,
      '--color-surface-muted': theme.colors.surfaceMuted,
      '--color-text': theme.colors.text,
      '--color-text-muted': theme.colors.textMuted,
      '--color-border': theme.colors.border,
      '--color-success': theme.colors.success,
      '--color-warning': theme.colors.warning,
      '--color-danger': theme.colors.danger,
      '--color-info': theme.colors.info,

      '--radius-sm': theme.radius.sm,
      '--radius-md': theme.radius.md,
      '--radius-lg': theme.radius.lg,
      '--radius-xl': theme.radius.xl,

      '--shadow-card': theme.shadow.card,
      '--shadow-floating': theme.shadow.floating,

      '--layout-sidebar-width': theme.layout.sidebarWidth,
      '--layout-topbar-height': theme.layout.topbarHeight,
      '--layout-page-max-width': theme.layout.pageMaxWidth,
    }

    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }, [])

  return children
}