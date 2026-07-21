import { ArrowLeft, ArrowRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui'
import { getAdminLanguage } from '../../../services/languageStorage'

export default function NotFoundPage() {
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const copy = {
    ar: { title: 'الصفحة غير موجودة', description: 'الرابط الذي طلبته غير متاح ضمن نظام ICPC الحالي.', back: 'العودة إلى النظرة العامة' },
    en: { title: 'Page not found', description: 'The requested link is not available in the current ICPC system.', back: 'Back to overview' },
    nl: { title: 'Pagina niet gevonden', description: 'De gevraagde koppeling is niet beschikbaar in het huidige ICPC-systeem.', back: 'Terug naar overzicht' },
  }[language]
  const BackIcon = isArabic ? ArrowRight : ArrowLeft

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="flex min-h-[65vh] items-center justify-center">
      <div className="max-w-xl text-center">
        <p className="text-7xl font-bold text-[var(--color-primary-soft)]">404</p>
        <div className="mx-auto -mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-secondary)] text-[var(--color-primary)]">
          <Home size={24} />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-[var(--color-primary)]">{copy.title}</h1>
        <p className="mt-3 text-[var(--color-text-muted)]">{copy.description}</p>
        <Link to="/dashboard" className="mt-7 inline-block">
          <Button>
            {copy.back}
            <BackIcon size={18} />
          </Button>
        </Link>
      </div>
    </div>
  )
}
