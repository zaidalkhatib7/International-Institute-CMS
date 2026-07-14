import { ArrowLeft, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="max-w-xl text-center">
        <p className="text-7xl font-bold text-[var(--color-primary-soft)]">404</p>
        <div className="mx-auto -mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-secondary)] text-[var(--color-primary)]">
          <Home size={24} />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-[var(--color-primary)]">الصفحة غير موجودة</h1>
        <p className="mt-3 text-[var(--color-text-muted)]">
          الرابط الذي طلبته غير متاح ضمن هيكل نظام ICPC الحالي.
        </p>
        <Link to="/dashboard" className="mt-7 inline-block">
          <Button>
            العودة إلى النظرة العامة
            <ArrowLeft size={18} />
          </Button>
        </Link>
      </div>
    </div>
  )
}
