import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="app-card max-w-xl p-10 text-center">
        <h1 className="text-5xl font-bold text-[var(--color-text)]">404</h1>
        <p className="mt-3 text-lg text-[var(--color-text-muted)]">
          The page you are looking for does not exist.
        </p>
        <Link to="/dashboard" className="app-btn-primary mt-6 inline-flex">
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}