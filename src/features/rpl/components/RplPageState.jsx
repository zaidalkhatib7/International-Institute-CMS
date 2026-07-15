import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'
import { Button, Card, CardContent } from '../../../components/ui'

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
        <CardContent className="flex min-h-52 items-center justify-center gap-3 p-8 text-[var(--color-text-muted)]" role="status">
          <LoaderCircle className="animate-spin" size={24} />
          <span>{text.loading}</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
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
