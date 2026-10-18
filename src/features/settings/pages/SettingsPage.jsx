import { useContext, useState } from 'react'
import { ArrowLeftRight, Languages, LogOut, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, CardTitle, LanguageSlider, PageHeader } from '../../../components/ui'
import { getAdminLanguage, setAdminLanguage } from '../../../services/languageStorage'
import { clearAdminToken, hasAdminToken } from '../../../services/tokenStorage'
import { exchangeRateText } from '../../../utils/money'
import { getRouteAccess } from '../../../routes/routeAccess'
import { AuthorizationContext } from '../../auth/context/authorizationContext'
import { exchangeRateCopy, exchangeRateHref } from '../../finance/domain/exchangeRate'
import { useExchangeRate } from '../../finance/hooks/useExchangeRate'
import { resetWorkCounts } from '../../dashboard/hooks/useWorkCounts'

/*
 * THE EXCHANGE RATE ON THE SETTINGS PAGE (owner, 17 Oct 2026: "in the platform
 * settings"). Read-only: the rate in force, from the public currencies route,
 * and a link to the governed screen in Finance where the owner's role sets it.
 */
function ExchangeRateCard({ language }) {
  const copy = exchangeRateCopy(language)
  const authorization = useContext(AuthorizationContext)
  const exchange = useExchangeRate()
  const mayOpen = authorization?.canAccess ? authorization.canAccess(getRouteAccess('/finance/exchange-rate')) : false
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <ArrowLeftRight size={21} className="text-[var(--color-accent)]" />
          {copy.settingsCard}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {exchange.loaded && !exchange.failed ? (
          exchange.rate
            ? <p className="text-2xl font-bold text-[var(--color-primary)]"><bdi>{exchangeRateText(exchange.rate, language)}</bdi></p>
            : <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{copy.noRate}</p>
        ) : null}
        <p className="text-sm text-[var(--color-text-muted)]">{copy.settingsCardHint}</p>
        {mayOpen ? <Link to={exchangeRateHref(authorization.canAccess)} className="text-sm font-semibold text-[var(--color-primary)] underline underline-offset-2">{copy.open}</Link> : null}
      </CardContent>
    </Card>
  )
}

/*
 * MY SETTINGS (owner, 18 Oct 2026; PLATFORM-JOURNEY-SPEC §4.6): the viewer's own
 * language and session, and the exchange rate in force (read-only). The platform
 * identity, integration and stage cards were developer notes and are gone; the
 * page opens from the profile menu, not the sidebar.
 */
const copyByLanguage = {
  ar: {
    title: 'إعداداتي',
    subtitle: 'لغة الواجهة وجلستك وسعر الصرف الساري.',
    language: 'لغة الواجهة',
    languageHint: 'تعمل الواجهة بالعربية والإنجليزية.',
    apply: 'تطبيق اللغة',
    saved: 'تم حفظ تفضيل اللغة. ستُعاد الواجهة لتطبيقه.',
    session: 'الجلسة والأمان',
    active: 'جلستك فعالة',
    inactive: 'لا توجد جلسة فعالة',
    signOut: 'تسجيل الخروج',
  },
  en: {
    title: 'My settings',
    subtitle: 'Your interface language, your session and the exchange rate in force.',
    language: 'Interface language',
    languageHint: 'The interface works in Arabic and English.',
    apply: 'Apply language',
    saved: 'Language preference saved. The interface will reload to apply it.',
    session: 'Session & security',
    active: 'Your session is active',
    inactive: 'No active session',
    signOut: 'Sign out',
  },
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const currentLanguage = getAdminLanguage()
  const copy = copyByLanguage[currentLanguage] || copyByLanguage.ar
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage)
  const [notice, setNotice] = useState('')

  const handleApplyLanguage = () => {
    setAdminLanguage(selectedLanguage)
    setNotice(copy.saved)
    window.setTimeout(() => window.location.reload(), 500)
  }

  const handleSignOut = () => {
    clearAdminToken()
    // The next account signed in on this tab never sees this one's cached counts.
    resetWorkCounts()
    navigate('/login')
  }

  return (
    <div className="space-y-7">
      <PageHeader title={copy.title} description={copy.subtitle} />

      {notice ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Languages size={21} className="text-[var(--color-accent)]" />
              {copy.language}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--color-text-muted)]">{copy.languageHint}</p>
            <div className="mt-5">
              <LanguageSlider value={selectedLanguage} onChange={setSelectedLanguage} />
            </div>
            <Button onClick={handleApplyLanguage} className="mt-5">
              {copy.apply}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ShieldCheck size={21} className="text-[var(--color-success)]" />
              {copy.session}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                hasAdminToken()
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {hasAdminToken() ? copy.active : copy.inactive}
            </div>
            <Button variant="outline" onClick={handleSignOut} className="mt-5 w-full !border-red-200 !text-red-600">
              <LogOut size={17} />
              {copy.signOut}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ExchangeRateCard language={currentLanguage === 'ar' ? 'ar' : 'en'} />
      </div>
    </div>
  )
}
