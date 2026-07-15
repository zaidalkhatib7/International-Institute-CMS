import { Navigate } from 'react-router-dom'
import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'
import { Button } from '../ui'
import { useAuthorization } from '../../features/auth/context/useAuthorization'
import AccessDeniedPage from '../../features/shared/pages/AccessDeniedPage'
import { getAdminLanguage } from '../../services/languageStorage'
import { hasAdminToken } from '../../services/tokenStorage'

/**
 * A wrapper component that checks for an admin token.
 * If no token is found, it redirects to the login page.
 */
export default function ProtectedRoute({ children }) {
  const { user, isCmsOperator, isLoading, error, refresh } = useAuthorization()

  if (!hasAdminToken()) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]" role="status">
        <LoaderCircle className="animate-spin text-[var(--color-primary)]" size={38} />
        <span className="sr-only">Loading authenticated session</span>
      </div>
    )
  }

  if (!user || error) {
    const language = getAdminLanguage()
    const isArabic = language === 'ar'
    const copy = {
      ar: ['تعذر التحقق من الجلسة', 'لم نتمكن من تحميل صلاحيات حسابك. تحقق من اتصال الخادم ثم أعد المحاولة.', 'إعادة المحاولة'],
      en: ['Session verification failed', 'We could not load your account permissions. Check the server connection and try again.', 'Try again'],
      nl: ['Sessiecontrole mislukt', 'We konden je accountrechten niet laden. Controleer de serververbinding en probeer opnieuw.', 'Opnieuw proberen'],
    }[language] || ['Session verification failed', 'We could not load your account permissions. Check the server connection and try again.', 'Try again']

    return (
      <main dir={isArabic ? 'rtl' : 'ltr'} className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-5">
        <div className={`w-full max-w-lg rounded-3xl border border-red-200 bg-white p-8 shadow-[var(--shadow-card)] ${isArabic ? 'text-right' : 'text-left'}`}>
          <AlertTriangle className="text-red-600" size={34} />
          <h1 className="mt-5 text-2xl font-bold text-[var(--color-primary)]">{copy[0]}</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">{copy[1]}</p>
          <Button className="mt-6" onClick={refresh}>
            <RefreshCw size={17} />
            {copy[2]}
          </Button>
        </div>
      </main>
    )
  }

  if (!isCmsOperator) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-5">
        <AccessDeniedPage />
      </main>
    )
  }

  return children
}
