import { useState } from 'react'
import { ArrowLeft, ArrowRight, BadgeCheck, FolderCheck, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { branding, getBrandText } from '../../../config/branding'
import { Button, Input } from '../../../components/ui'
import { getAdminLanguage } from '../../../services/languageStorage'
import { setAdminToken } from '../../../services/tokenStorage'
import { completeAdminMfa, loginAdmin } from '../services/authService'

export default function LoginPage() {
  const navigate = useNavigate()
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const brand = getBrandText(language)
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight

  const [form, setForm] = useState({ email: '', password: '' })
  const [mfaCode, setMfaCode] = useState('')
  const [mfaChallenge, setMfaChallenge] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const copy =
    language === 'ar'
      ? {
        eyebrow: 'بوابة الإدارة والاعتماد',
        title: 'مرحبًا بك في نظام ICPC',
        subtitle: 'سجّل الدخول لإدارة مسارات الاعتراف بالخبرة والاعتماد المهني.',
        email: 'البريد الإلكتروني',
        emailPlaceholder: 'frontend-admin@icpc.nl',
        password: 'كلمة المرور',
        passwordPlaceholder: 'أدخل كلمة المرور',
        submit: 'تسجيل الدخول',
        submitting: 'جارٍ التحقق...',
        mfaCode: 'رمز التحقق',
        mfaCodePlaceholder: 'أدخل الرمز المرسل',
        mfaSubmit: 'إكمال تسجيل الدخول',
        mfaHint: 'تم إرسال رمز تحقق متعدد العوامل إلى حساب المسؤول.',
        error: 'تعذّر تسجيل الدخول. تحقق من بياناتك وحاول مرة أخرى.',
        secure: 'اتصال آمن ومخصص للمستخدمين المخولين',
        panelTitle: 'اعتراف مهني مبني على الكفاءة',
        panelText:
          'منصة مؤسسية لإدارة دورة RPL من الطلب وملف الأدلة، مرورًا بالتقييم وتحليل الفجوات، وصولًا إلى قرار الاعتماد والشهادة القابلة للتحقق.',
        features: ['ملفات أدلة مهنية موثقة', 'تقييم رقمي لكل معيار', 'قرارات وشهادات قابلة للتحقق'],
        levels: 'مستويات الاعتماد',
      }
      : language === 'nl'
      ? {
        eyebrow: 'Beheer- en accreditatieportaal',
        title: 'Welkom bij het ICPC-systeem',
        subtitle: 'Log in om RPL- en professionele accreditatietrajecten te beheren.',
        email: 'E-mailadres',
        emailPlaceholder: 'frontend-admin@icpc.nl',
        password: 'Wachtwoord',
        passwordPlaceholder: 'Voer je wachtwoord in',
        submit: 'Inloggen',
        submitting: 'Bezig met controleren...',
        mfaCode: 'Verificatiecode',
        mfaCodePlaceholder: 'Voer de ontvangen code in',
        mfaSubmit: 'Inloggen voltooien',
        mfaHint: 'Er is een multi-factor verificatiecode naar het beheerdersaccount gestuurd.',
        error: 'Inloggen mislukt. Controleer je gegevens en probeer het opnieuw.',
        secure: 'Beveiligde toegang voor geautoriseerde gebruikers',
        panelTitle: 'Professionele erkenning op basis van competenties',
        panelText:
          'Een institutioneel platform voor de volledige RPL-cyclus: aanvraag, bewijsdossier, beoordeling, gap-analyse, accreditatiebesluit en verifieerbare certificering.',
        features: ['Geverifieerde bewijsdossiers', 'Digitale beoordeling per criterium', 'Verifieerbare besluiten en certificaten'],
        levels: 'Accreditatieniveaus',
      }
      : {
        eyebrow: 'Administration & accreditation portal',
        title: 'Welcome to the ICPC system',
        subtitle: 'Sign in to manage RPL and professional accreditation pathways.',
        email: 'Email address',
        emailPlaceholder: 'frontend-admin@icpc.nl',
        password: 'Password',
        passwordPlaceholder: 'Enter your password',
        submit: 'Sign in',
        submitting: 'Authenticating...',
        mfaCode: 'Verification code',
        mfaCodePlaceholder: 'Enter the code you received',
        mfaSubmit: 'Complete sign in',
        mfaHint: 'A multi-factor verification code was sent to the administrator account.',
        error: 'Sign-in failed. Check your credentials and try again.',
        secure: 'Secure access for authorized users only',
        panelTitle: 'Competency-based professional recognition',
        panelText:
          'An institutional platform for the full RPL cycle, from application and evidence through assessment, gap analysis, accreditation decisions, and verifiable certification.',
        features: ['Verified evidence portfolios', 'Criterion-level digital assessment', 'Verifiable decisions and certificates'],
        levels: 'Accreditation levels',
      }

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const data = mfaChallenge
        ? await completeAdminMfa({
            email: form.email,
            code: mfaCode,
            challengeToken: mfaChallenge.challengeToken,
          })
        : await loginAdmin({ email: form.email, password: form.password })

      if (data?.mfa_required && data?.challenge_token) {
        setMfaChallenge({ challengeToken: data.challenge_token })
        setMfaCode('')
        return
      }

      const token = data?.access_token
      if (!token) throw new Error('Missing access token')

      setAdminToken(token)
      navigate('/dashboard')
    } catch (requestError) {
      const serverMessage = requestError?.response?.data?.message
      setError(serverMessage || copy.error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(500px,0.95fr)]">
      <section className="icpc-grid-pattern relative hidden overflow-hidden bg-[var(--color-primary)] p-12 text-white lg:flex lg:flex-col xl:p-16">
        <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute -left-10 top-1/3 h-48 w-48 rounded-full border border-[var(--color-accent)]/25" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg">
            <img src={branding.logo.src} alt={branding.shortName} className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-2xl font-bold">{branding.shortName}</p>
            <p className="max-w-xs text-xs leading-5 text-[#B8CFDA]">
              {brand.organizationName}
            </p>
          </div>
        </div>

        <div className="relative my-auto max-w-2xl py-16">
          <div className="mb-5 h-1 w-12 rounded-full bg-[var(--color-secondary)]" />
          <h2 className="max-w-xl text-4xl font-bold leading-[1.35] xl:text-5xl">{copy.panelTitle}</h2>
          <p className="mt-6 max-w-xl text-base leading-8 text-[#D1E1E8]">{copy.panelText}</p>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {[FolderCheck, ShieldCheck, BadgeCheck].map((Icon, index) => (
              <div key={copy.features[index]} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <Icon size={20} className="text-[var(--color-secondary)]" />
                <p className="mt-3 text-sm leading-6 text-white">{copy.features[index]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between border-t border-white/10 pt-5 text-xs text-[#9DB9C8]">
          <span>{copy.levels}</span>
          <span>{brand.accreditationLevels.join('  •  ')}</span>
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:min-h-0 xl:px-20">
        <div className="w-full max-w-md">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <img src={branding.logo.src} alt={branding.shortName} className="h-14 w-14 object-contain" />
            <div>
              <p className="text-xl font-bold text-[var(--color-primary)]">{branding.shortName}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{branding.productName}</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)]">
            <LockKeyhole size={14} />
            {copy.eyebrow}
          </div>
          <h1 className="mt-5 text-3xl font-bold leading-tight text-[var(--color-primary)] sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">{copy.subtitle}</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <Input
              label={copy.email}
              type="email"
              autoComplete="email"
              placeholder={copy.emailPlaceholder}
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              disabled={Boolean(mfaChallenge)}
              required
            />
            <Input
              label={copy.password}
              type="password"
              autoComplete="current-password"
              placeholder={copy.passwordPlaceholder}
              value={form.password}
              onChange={(event) => handleChange('password', event.target.value)}
              disabled={Boolean(mfaChallenge)}
              required
            />

            {mfaChallenge ? (
              <>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  {copy.mfaHint}
                </div>
                <Input
                  label={copy.mfaCode}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={copy.mfaCodePlaceholder}
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  required
                />
              </>
            ) : null}

            {error ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button fullWidth type="submit" size="lg" disabled={isSubmitting} className="!mt-7">
              {isSubmitting ? copy.submitting : mfaChallenge ? copy.mfaSubmit : copy.submit}
              {!isSubmitting ? <ArrowIcon size={18} /> : null}
            </Button>
          </form>

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
            <ShieldCheck size={14} className="text-[var(--color-success)]" />
            {copy.secure}
          </p>
        </div>
      </main>
    </div>
  )
}
