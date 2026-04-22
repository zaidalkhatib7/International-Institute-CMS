import { useMemo, useState } from 'react'
import { Globe, Languages, LogOut, Server, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, CardTitle, PageHeader } from '../../../components/ui'
import { apiConfig } from '../../../config/api'
import { getSupportedAdminLanguages, setAdminLanguage } from '../../../services/languageStorage'
import { clearAdminToken, hasAdminToken } from '../../../services/tokenStorage'
import { getCurrentLanguage } from '../../../utils/localization'

function getLanguageLabel(languageCode, currentLanguage) {
  const labels = {
    en: {
      en: 'English',
      ar: 'الإنجليزية',
      nl: 'Engels',
    },
    ar: {
      en: 'Arabic',
      ar: 'العربية',
      nl: 'Arabisch',
    },
    nl: {
      en: 'Dutch',
      ar: 'الهولندية',
      nl: 'Nederlands',
    },
  }

  return labels[languageCode]?.[currentLanguage] || languageCode.toUpperCase()
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const currentLanguage = getCurrentLanguage()
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [isApplyingLanguage, setIsApplyingLanguage] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const copy = useMemo(() => {
    if (currentLanguage === 'ar') {
      return {
        title: 'الإعدادات',
        subtitle: 'إدارة اللغة وتفضيلات الأمان الخاصة بجلسة لوحة التحكم.',
        languageCardTitle: 'لغة النظام',
        languageCardHint:
          'اختر لغة الواجهة. سيتم إعادة تحميل الصفحة لتطبيق الترجمة في جميع الصفحات.',
        applyLanguage: 'تطبيق اللغة',
        sessionCardTitle: 'الجلسة والأمان',
        sessionActive: 'الحالة: تم تسجيل الدخول',
        sessionInactive: 'الحالة: غير مسجل الدخول',
        signOut: 'تسجيل الخروج',
        systemCardTitle: 'معلومات النظام',
        apiEndpoint: 'رابط API',
        tokenStorage: 'مفتاح تخزين التوكن',
        languageStorage: 'مفتاح تخزين اللغة',
        applySuccess: 'تم حفظ اللغة. سيتم إعادة تحميل الصفحة الآن.',
        applyError: 'تعذر تطبيق اللغة الآن.',
      }
    }

    if (currentLanguage === 'nl') {
      return {
        title: 'Instellingen',
        subtitle: 'Beheer taal- en beveiligingsvoorkeuren voor deze CMS-sessie.',
        languageCardTitle: 'Systeemtaal',
        languageCardHint:
          'Kies de interface-taal. De pagina wordt opnieuw geladen om alles toe te passen.',
        applyLanguage: 'Taal toepassen',
        sessionCardTitle: 'Sessie en beveiliging',
        sessionActive: 'Status: ingelogd',
        sessionInactive: 'Status: uitgelogd',
        signOut: 'Uitloggen',
        systemCardTitle: 'Systeeminformatie',
        apiEndpoint: 'API-endpoint',
        tokenStorage: 'Token-opslag sleutel',
        languageStorage: 'Taal-opslag sleutel',
        applySuccess: 'Taal opgeslagen. Pagina wordt nu opnieuw geladen.',
        applyError: 'Taal kon nu niet worden toegepast.',
      }
    }

    return {
      title: 'Settings',
      subtitle: 'Manage language and security preferences for this CMS session.',
      languageCardTitle: 'System Language',
      languageCardHint:
        'Choose the interface language. The page will reload to apply translation across pages.',
      applyLanguage: 'Apply Language',
      sessionCardTitle: 'Session & Security',
      sessionActive: 'Status: Signed in',
      sessionInactive: 'Status: Signed out',
      signOut: 'Sign Out',
      systemCardTitle: 'System Information',
      apiEndpoint: 'API Endpoint',
      tokenStorage: 'Token Storage Key',
      languageStorage: 'Language Storage Key',
      applySuccess: 'Language saved. Reloading now.',
      applyError: 'Could not apply language right now.',
    }
  }, [currentLanguage])

  const supportedLanguages = useMemo(() => getSupportedAdminLanguages(), [])
  const tokenActive = hasAdminToken()

  const handleApplyLanguage = async () => {
    setError('')
    setNotice('')
    setIsApplyingLanguage(true)

    try {
      setAdminLanguage(selectedLanguage)
      document.documentElement.lang = selectedLanguage
      document.documentElement.dir = selectedLanguage === 'ar' ? 'rtl' : 'ltr'
      setNotice(copy.applySuccess)
      window.location.reload()
    } catch {
      setError(copy.applyError)
    } finally {
      setIsApplyingLanguage(false)
    }
  }

  const handleSignOut = () => {
    setIsSigningOut(true)
    clearAdminToken()
    navigate('/login')
  }

  return (
    <div className="space-y-8">
      <PageHeader title={copy.title} description={copy.subtitle} />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-3 text-3xl">
              <Languages size={22} className="text-[var(--color-primary)]" />
              {copy.languageCardTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-[var(--color-text-muted)]">{copy.languageCardHint}</p>

            <div className="inline-flex w-full flex-wrap gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2">
              {supportedLanguages.map((code) => {
                const isSelected = selectedLanguage === code
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedLanguage(code)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                      isSelected
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-white text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                    }`}
                  >
                    {getLanguageLabel(code, currentLanguage)}
                  </button>
                )
              })}
            </div>

            <div>
              <Button
                onClick={handleApplyLanguage}
                disabled={isApplyingLanguage}
                className="!h-12 !rounded-2xl !px-6"
              >
                <Globe size={18} />
                {copy.applyLanguage}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-3xl">
              <ShieldCheck size={22} className="text-[var(--color-primary)]" />
              {copy.sessionCardTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                tokenActive
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-600'
              }`}
            >
              {tokenActive ? copy.sessionActive : copy.sessionInactive}
            </div>

            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="!h-12 !w-full !rounded-2xl !border-red-200 !text-red-600 hover:!bg-red-50"
            >
              <LogOut size={17} />
              {copy.signOut}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-3xl">
            <Server size={22} className="text-[var(--color-primary)]" />
            {copy.systemCardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {copy.apiEndpoint}
            </p>
            <p className="mt-2 break-all text-sm font-medium text-[var(--color-text)]">
              {apiConfig.baseURL}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {copy.tokenStorage}
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--color-text)]">
              {apiConfig.tokenStorageKey}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {copy.languageStorage}
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--color-text)]">
              {apiConfig.languageStorageKey}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
