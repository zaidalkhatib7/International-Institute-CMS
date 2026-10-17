import { useEffect, useState } from 'react'
import { unwrapApiData } from '../../../services/apiResponse'
import { fetchCurrencies } from '../services/financeService'

/** The current rate from the public currencies route (W1), or null while none is set. */
export function readCurrentRate(payload) {
  const rate = unwrapApiData(payload)?.exchange_rate
  return rate && typeof rate === 'object' && typeof rate.syp_per_usd === 'string' ? rate : null
}

/*
 * The current USD -> SYP rate for a PREVIEW (a pound figure next to a dollar
 * price being typed). One fetch per page, and only once `enabled`: a screen with
 * nothing to preview asks for nothing. Never used for an amount anybody pays:
 * those come from the server. `failed` is true when the route could not be read,
 * so a preview says nothing rather than "no rate is set".
 */
export function useExchangeRate({ enabled = true } = {}) {
  const [state, setState] = useState({ loaded: false, failed: false, rate: null })

  useEffect(() => {
    if (!enabled || state.loaded) return undefined
    let cancelled = false
    fetchCurrencies()
      .then((payload) => {
        if (!cancelled) setState({ loaded: true, failed: false, rate: readCurrentRate(payload) })
      })
      .catch(() => {
        if (!cancelled) setState({ loaded: true, failed: true, rate: null })
      })
    return () => {
      cancelled = true
    }
  }, [enabled, state.loaded])

  return state
}
