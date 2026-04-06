import { useLocation } from 'react-router-dom'

export default function PlaceholderPage() {
  const location = useLocation()

  return (
    <div className="app-card p-8">
      <h1 className="text-4xl font-bold text-[var(--color-text)]">
        {location.pathname}
      </h1>
      <p className="mt-3 text-[var(--color-text-muted)]">
        This module placeholder is ready for implementation.
      </p>
    </div>
  )
}