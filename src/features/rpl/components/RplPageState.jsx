import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'
import { Button, Card, CardContent, Skeleton } from '../../../components/ui'

const copy = {
  ar: { loading: 'جارٍ تحميل بيانات RPL...', retry: 'إعادة المحاولة' },
  en: { loading: 'Loading RPL data...', retry: 'Try again' },
  nl: { loading: 'RPL-gegevens laden...', retry: 'Opnieuw proberen' },
}

export default function RplPageState({ loading, error, onRetry, language = 'en', children }) {
  const text = copy[language] || copy.en
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6" role="status" aria-live="polite">
          <span className="sr-only">{text.loading}</span>
          <div className="mb-6 flex items-center gap-3 text-sm font-medium text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={18} />{text.loading}</div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/30">
        <CardContent className="flex min-h-44 flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="text-red-500" size={30} />
          <p className="max-w-xl text-sm leading-6 text-red-700">{error}</p>
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw size={16} /> {text.retry}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  return children
}
