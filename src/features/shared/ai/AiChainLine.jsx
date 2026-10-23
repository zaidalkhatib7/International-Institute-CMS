import { Link, useInRouterContext } from 'react-router-dom'
import { Workflow } from 'lucide-react'
import { appPath } from '../../../services/appPath'
import { getCurrentLanguage } from '../../../utils/localization'
import { fill } from '../../rpl/domain/documentScreening'
import { AI_SERVICE_PAGE, aiCopy } from './aiCopy'
import { statusFamilies } from './aiState'
import useAiServiceStatus from './useAiServiceStatus'

/*
 * THE MODEL, READ-ONLY (AI-RESILIENCE-SPEC §3.4, D16).
 *
 * Where a settings screen used to take a model name as free text, it now shows
 * the server's chain for that work, in order, and points to the AI service
 * page. The model is no longer a staff setting: a free-text field is what put
 * an alias back in as the only model, and the server refuses the old keys
 * (422 model_set_by_chain).
 */
export default function AiChainLine({ family = 'case_analysis', language, status: given, className = '' }) {
  const lang = (language || getCurrentLanguage()) === 'ar' ? 'ar' : 'en'
  const copy = aiCopy(lang).chainLine
  const inRouter = useInRouterContext()
  const shared = useAiServiceStatus({ enabled: given === undefined })
  const status = given === undefined ? shared.status : given
  const entry = statusFamilies(status, [family])[0]
  const chain = (Array.isArray(entry?.chain) ? entry.chain : []).map((step) => (typeof step === 'string' ? step : step?.model)).filter(Boolean)
  const linkClass = 'font-semibold text-[var(--color-primary)] underline underline-offset-2'

  return (
    <div data-ai-chain={family} className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm leading-6 ${className}`}>
      <p className="flex items-center gap-2 font-semibold text-[var(--color-text)]"><Workflow size={15} aria-hidden="true" />{copy.label}</p>
      <p className="mt-1 text-[var(--color-text-muted)]">{chain.length ? fill(copy.text, { chain: chain.join(lang === 'ar' ? ' ← ' : ' → ') }) : copy.unknown}</p>
      <p className="mt-1">{inRouter ? <Link to={AI_SERVICE_PAGE} className={linkClass}>{copy.link}</Link> : <a href={appPath(AI_SERVICE_PAGE)} className={linkClass}>{copy.link}</a>}</p>
    </div>
  )
}
