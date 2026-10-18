import { ArrowLeft, ArrowRight, Inbox, LogOut, ShieldX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardContent } from '../../../components/ui'
import { getAdminLanguage } from '../../../services/languageStorage'
import { clearAdminToken } from '../../../services/tokenStorage'
import { logoutAdmin } from '../../auth/services/authService'
import { resetWorkCounts } from '../../dashboard/hooks/useWorkCounts'

const copyByLanguage = {
  ar: {
    eyebrow: 'رمز الحالة 403',
    title: 'ليس لديك صلاحية للوصول',
    description: 'حسابك موثّق، لكن الدور الحالي لا يملك الصلاحية المطلوبة لهذه المساحة. تواصل مع مدير النظام إذا كنت تحتاج هذا الوصول.',
    notOperator: 'حسابك موثّق، لكنه ليس حساب موظف في المنصة. سجّل الخروج ثم ادخل بحساب موظف.',
    back: 'العودة للصفحة السابقة',
    today: 'الانتقال إلى اليوم',
    signOut: 'تسجيل الخروج',
  },
  en: {
    eyebrow: 'Status code 403',
    title: 'You do not have access',
    description: 'Your session is authenticated, but your current role does not have the permission required for this workspace. Contact a system administrator if you need access.',
    notOperator: 'Your session is authenticated, but this is not a staff account on the platform. Sign out, then sign in with a staff account.',
    back: 'Go back',
    today: 'Go to Today',
    signOut: 'Sign out',
  },
}

/**
 * The 403 screen. A staff member without a screen's permission goes back or to
 * Today; a signed-in account that is not staff (a learner, an expert) can open
 * nothing, so it is offered Sign out only, never a page that would refuse again
 * (PLATFORM-JOURNEY-SPEC §4.7, F-14).
 */
export default function AccessDeniedPage({ notOperator = false }) {
  const navigate = useNavigate()
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const copy = copyByLanguage[language] || copyByLanguage.en
  const BackIcon = isArabic ? ArrowRight : ArrowLeft

  async function signOut() {
    try {
      await logoutAdmin()
    } catch {
      // The token is cleared even when the server refuses the logout.
    }
    clearAdminToken()
    resetWorkCounts()
    navigate('/login')
  }

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
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-text-muted)] sm:text-base">{notOperator ? copy.notOperator : copy.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {notOperator ? (
                <Button onClick={signOut}>
                  <LogOut size={18} />
                  {copy.signOut}
                </Button>
              ) : (
                <>
                  <Button onClick={() => navigate('/dashboard')}>
                    <Inbox size={18} />
                    {copy.today}
                  </Button>
                  <Button variant="outline" onClick={() => navigate(-1)}>
                    <BackIcon size={18} />
                    {copy.back}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
