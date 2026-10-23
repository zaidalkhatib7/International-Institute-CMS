import { useState } from 'react'
import { Hourglass, LoaderCircle, RotateCw, TriangleAlert } from 'lucide-react'
import { Button } from '../../../components/ui'
import { readApiError } from '../../../services/apiResponse'
import { getCurrentLanguage } from '../../../utils/localization'
import { aiCopy } from './aiCopy'
import { aiErrorMessage, isWaitingRetry, runError, triedModelsText, waitingRetryLines } from './aiState'

/*
 * A QUEUED AI STEP THAT IS WAITING, OR THAT STOPPED FOR A REASON STAFF CAN NAME
 * (AI-RESILIENCE-SPEC §5.1-5.2).
 *
 * waiting_retry: the whole model chain was busy, so the job went back to the
 * queue and tries again on its own. The notice says when, which try it is and
 * until when it keeps trying, and that the work can go on by hand meanwhile.
 * "Retry now" (for staff who may start the step) starts the next try at once:
 * the server rotates the run, and the job it replaces wakes later, sees it is
 * stale and makes no call, so a click never pays twice.
 *
 * failed (or abandoned) with a code: the reason in plain words, by class
 * (busy, configuration, refused), never the generic "stopped". A failure this
 * table does not know renders nothing, and the panel's own text stands.
 *
 * Queued and running are left to each panel, which already words them.
 */
export default function AiRunNotice({ run, language, onRetryNow = null, canRetry = true, className = '' }) {
  const lang = (language || getCurrentLanguage()) === 'ar' ? 'ar' : 'en'
  const copy = aiCopy(lang).run
  const [state, setState] = useState({ busy: false, error: '', done: false })

  if (!run || typeof run !== 'object') return null

  if (isWaitingRetry(run)) {
    const lines = waitingRetryLines(run, lang)
    const tried = triedModelsText(run, lang)
    async function retryNow() {
      setState({ busy: true, error: '', done: false })
      try {
        await onRetryNow()
        setState({ busy: false, error: '', done: true })
      } catch (error) {
        setState({ busy: false, error: readApiError(error, copy.retryNowFailed, lang), done: false })
      }
    }
    return (
      <section role="status" data-ai-run="waiting_retry" aria-label={copy.status.waiting_retry} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950 ${className}`}>
        <p className="flex items-start gap-2"><Hourglass size={16} aria-hidden="true" className="mt-1 shrink-0" /><span>{lines.join(' ')}</span></p>
        {tried ? <p className="text-xs leading-5" data-models-tried="true">{tried}</p> : null}
        {onRetryNow && canRetry ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="outline" onClick={retryNow} disabled={state.busy}>{state.busy ? <LoaderCircle size={15} className="animate-spin" /> : <RotateCw size={15} />}{copy.retryNow}</Button>
            <span className="text-xs leading-5">{copy.retryNowHint}</span>
          </div>
        ) : null}
        {state.done ? <p className="text-xs font-semibold">{copy.retryNowDone}</p> : null}
        {state.error ? <p role="alert" className="whitespace-pre-line text-xs text-red-700">{state.error}</p> : null}
      </section>
    )
  }

  if (run.status === 'failed' || run.status === 'abandoned' || run.status === 'refused') {
    const { code, errorClass } = runError(run)
    const message = aiErrorMessage(code, errorClass, lang)
    if (!message) return null
    return (
      <p role="note" data-ai-run="failed" data-error-code={code || undefined} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950 ${className}`}>
        <TriangleAlert size={16} aria-hidden="true" className="mt-1 shrink-0" />
        <span>{message}</span>
      </p>
    )
  }

  return null
}
