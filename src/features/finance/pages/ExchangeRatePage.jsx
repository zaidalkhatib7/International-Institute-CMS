import { PageHeader } from '../../../components/ui'
import { getAdminLanguage } from '../../../services/languageStorage'
import ExchangeRatePanel from '../components/ExchangeRatePanel'
import { exchangeRateCopy } from '../domain/exchangeRate'

/*
 * /finance/exchange-rate: the Finance tab of the same name on a page of its own,
 * open to every role that reads the rate (finance and payment staff), not only
 * to those who reach the Finance operations page.
 */
export default function ExchangeRatePage() {
  const language = getAdminLanguage() === 'ar' ? 'ar' : 'en'
  const copy = exchangeRateCopy(language)
  return (
    <section dir={language === 'ar' ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader title={copy.title} description={copy.hint} />
      <ExchangeRatePanel language={language} />
    </section>
  )
}
