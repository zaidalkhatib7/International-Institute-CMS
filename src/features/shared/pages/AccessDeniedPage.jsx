import { ArrowLeft, ArrowRight, LayoutDashboard, ShieldX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardContent } from '../../../components/ui'
import { getAdminLanguage } from '../../../services/languageStorage'

const copyByLanguage = {
  ar: {
    eyebrow: 'رمز الحالة 403',
    title: 'ليس لديك صلاحية للوصول',
    description: 'حسابك موثّق، لكن الدور الحالي لا يملك الصلاحية المطلوبة لهذه المساحة. تواصل مع مدير النظام إذا كنت تحتاج هذا الوصول.',
    back: 'العودة للصفحة السابقة',
    dashboard: 'الانتقال إلى لوحة التحكم',
  },
  en: {
    eyebrow: 'Status code 403',
    title: 'You do not have access',
    description: 'Your session is authenticated, but your current role does not have the permission required for this workspace. Contact a system administrator if you need access.',
    back: 'Go back',
    dashboard: 'Go to dashboard',
  },
  nl: {
    eyebrow: 'Statuscode 403',
    title: 'Je hebt geen toegang',
    description: 'Je sessie is geverifieerd, maar je huidige rol heeft niet de vereiste rechten voor deze werkruimte. Neem contact op met een systeembeheerder als je toegang nodig hebt.',
    back: 'Ga terug',
    dashboard: 'Naar dashboard',
  },
}
export default function AccessDeniedPage() {
  const navigate = useNavigate()
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const copy = copyByLanguage[language] || copyByLanguage.en
  const BackIcon = isArabic ? ArrowRight : ArrowLeft

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center py-8">
      <Card className={`w-full overflow-hidden ${isArabic ? 'text-right' : 'text-left'}`}>
        <CardContent className="relative p-8 sm:p-12">
          <div className="absolute -top-16 end-0 h-48 w-48 rounded-full bg-[var(--color-primary-soft)] opacity-70" />
          <div className="relative">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <ShieldX size={30} />
            </span>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-red-600">{copy.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-bold text-[var(--color-primary)] sm:text-4xl">{copy.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-text-muted)] sm:text-base">{copy.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => navigate('/dashboard')}>
                <LayoutDashboard size={18} />
                {copy.dashboard}
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>
                <BackIcon size={18} />
                {copy.back}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
