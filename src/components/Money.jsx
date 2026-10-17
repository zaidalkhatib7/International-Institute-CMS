import { formatMoney, readsLeftToRight } from '../utils/money'

/*
 * A Money object (contract 2.1) on screen. Dollars, and pounds in English, read
 * left to right in both languages ("$ 49.99" never becomes "49.99 $" inside an
 * Arabic line); pounds and earlier points in Arabic take the direction of their
 * own words ("125,000 ل.س").
 */
export default function Money({ value, language, className }) {
  return (
    <bdi dir={readsLeftToRight(value, language) ? 'ltr' : undefined} className={className}>
      {formatMoney(value, language)}
    </bdi>
  )
}
