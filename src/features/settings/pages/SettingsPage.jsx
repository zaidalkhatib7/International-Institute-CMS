import { useContext, useState } from 'react'
import { ArrowLeftRight, Languages, LogOut, Palette, ServerCog, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, LanguageSlider, PageHeader } from '../../../components/ui'
import { branding, getBrandText } from '../../../config/branding'
import { getPlatformArchitecture } from '../../../config/platformArchitecture'
import { getAdminLanguage, setAdminLanguage } from '../../../services/languageStorage'
import { clearAdminToken, hasAdminToken } from '../../../services/tokenStorage'
import { exchangeRateText } from '../../../utils/money'
import { getRouteAccess } from '../../../routes/routeAccess'
import { AuthorizationContext } from '../../auth/context/authorizationContext'
import { exchangeRateCopy } from '../../finance/domain/exchangeRate'
import { useExchangeRate } from '../../finance/hooks/useExchangeRate'

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
        {mayOpen ? <Link to="/finance/exchange-rate" className="text-sm font-semibold text-[var(--color-primary)] underline underline-offset-2">{copy.open}</Link> : null}
      </CardContent>
    </Card>
  )
}

const copyByLanguage = {
  ar: {
    title: 'إعدادات النظام',
    subtitle: 'إدارة لغة واجهة ICPC والجلسة وهوية منصة الاعتماد المهني.',
    language: 'لغة الواجهة',
    languageHint: 'تدعم الواجهة العربية والإنجليزية، ويتم إرسال نفس اللغة إلى API عبر Accept-Language.',
    apply: 'تطبيق اللغة',
    saved: 'تم حفظ تفضيل اللغة. ستُعاد الواجهة لتطبيقه.',
    session: 'الجلسة والأمان',
    active: 'جلسة الإدارة فعالة',
    inactive: 'لا توجد جلسة فعالة',
    signOut: 'تسجيل الخروج',
    identity: 'هوية المنصة',
    integration: 'حالة التكامل',
    integrationText:
      'تم ربط الواجهة بعقود API المتاحة في ملف التسليم. بعض وحدات RPL ما زالت تحتاج endpoints مخصصة في backend.',
    rplStages: 'مراحل RPL',
  },
  en: {
    title: 'System Settings',
    subtitle: 'Manage the ICPC interface language, session, and accreditation platform identity.',
    language: 'Interface Language',
    languageHint: 'The interface supports Arabic and English, and sends the same value to the API using Accept-Language.',
    apply: 'Apply language',
    saved: 'Language preference saved. The interface will reload to apply it.',
    session: 'Session & Security',
    active: 'Administration session is active',
    inactive: 'No active session',
    signOut: 'Sign out',
    identity: 'Platform Identity',
    integration: 'Integration Status',
    integrationText:
      'The frontend is connected to the API contracts available in the handoff. Some RPL modules still need dedicated backend endpoints.',
    rplStages: 'RPL stages',
  },
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const currentLanguage = getAdminLanguage()
  const copy = copyByLanguage[currentLanguage] || copyByLanguage.ar
  const brand = getBrandText(currentLanguage)
  const architecture = getPlatformArchitecture(currentLanguage)
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage)
  const [notice, setNotice] = useState('')

  const handleApplyLanguage = () => {
    setAdminLanguage(selectedLanguage)
    setNotice(copy.saved)
    window.setTimeout(() => window.location.reload(), 500)
  }

  const handleSignOut = () => {
    clearAdminToken()
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Palette size={21} className="text-[var(--color-secondary)]" />
              {copy.identity}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] p-4">
              <img src={branding.logo.src} alt={branding.shortName} className="h-14 w-14 object-contain" />
              <div>
                <p className="font-bold text-[var(--color-primary)]">{brand.organizationName}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{brand.productName}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {brand.accreditationLevels.map((level) => (
                <Badge key={level} variant="secondary">
                  {level}
                </Badge>
              ))}
              <Badge variant="info">
                {architecture.rplWorkflowStages.length} {copy.rplStages}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ServerCog size={21} className="text-[var(--color-accent)]" />
              {copy.integration}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
              <p className="text-sm leading-7 text-[var(--color-text-body)]">{copy.integrationText}</p>
            </div>
          </CardContent>
        </Card>

        <ExchangeRateCard language={currentLanguage === 'ar' ? 'ar' : 'en'} />
      </div>
    </div>
  )
}
