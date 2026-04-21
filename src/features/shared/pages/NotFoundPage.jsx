import { Link } from 'react-router-dom'
import { getCurrentLanguage } from '../../../utils/localization'

export default function NotFoundPage() {
  const language = getCurrentLanguage()
  const copy =
    language === 'ar'
      ? {
          message: 'الصفحة التي تبحث عنها غير موجودة.',
          goToDashboard: 'الذهاب إلى لوحة التحكم',
        }
      : language === 'nl'
      ? {
          message: 'De pagina die je zoekt bestaat niet.',
          goToDashboard: 'Ga naar dashboard',
        }
      : {
          message: 'The page you are looking for does not exist.',
          goToDashboard: 'Go to Dashboard',
        }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="app-card max-w-xl p-10 text-center">
        <h1 className="text-5xl font-bold text-[var(--color-text)]">404</h1>
        <p className="mt-3 text-lg text-[var(--color-text-muted)]">
          {copy.message}
        </p>
        <Link to="/dashboard" className="app-btn-primary mt-6 inline-flex">
          {copy.goToDashboard}
        </Link>
      </div>
    </div>
  )
}
