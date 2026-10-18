import { Navigate } from 'react-router-dom'
import { PageHeader } from '../../../components/ui'
import { getAdminLanguage } from '../../../services/languageStorage'
import { useAuthorization } from '../../auth/context/useAuthorization'
import ExchangeRatePanel from '../components/ExchangeRatePanel'
import { FINANCE_EXCHANGE_RATE_HREF, exchangeRateCopy, exchangeRateHref } from '../domain/exchangeRate'

/*
 * /finance/exchange-rate: the Finance tab of the same name on a page of its own,
 * for the finance and payment roles that read the rate but cannot open the
 * Finance operations page. A viewer who can open Finance is sent to its tab, so
 * every link and search result lands in one place (walk of 18 Oct 2026). The
 * page header names the screen once; the panel below it does not repeat it.
 */
export default function ExchangeRatePage() {
  const language = getAdminLanguage() === 'ar' ? 'ar' : 'en'
  const copy = exchangeRateCopy(language)
  const { canAccess } = useAuthorization()
  if (exchangeRateHref(canAccess) === FINANCE_EXCHANGE_RATE_HREF) return <Navigate to={FINANCE_EXCHANGE_RATE_HREF} replace />
  return (
    <section dir={language === 'ar' ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader title={copy.title} description={copy.hint} />
      <ExchangeRatePanel language={language} showHeader={false} />
    </section>
  )
}
