import { Link, useInRouterContext } from 'react-router-dom'
import { CircleAlert, Clock3, TriangleAlert } from 'lucide-react'
import { appPath } from '../../../services/appPath'
import { getCurrentLanguage } from '../../../utils/localization'
import { AI_SERVICE_PAGE, aiCopy } from './aiCopy'
import { bannerState } from './aiState'
import useAiServiceStatus from './useAiServiceStatus'

/*
 * THE AI SERVICE BANNER (AI-RESILIENCE-SPEC §6.5, D20).
 *
 * On Today and on every screen that starts AI work. Amber when a family runs on
 * a backup model (and which model serves), red when no model of a family
 * answers (queued work retries on its own, and the work can go on by hand), grey
 * when the monitor has not checked for a while. Nothing at all while every
 * family concerned is ok: a banner that is always there is a banner nobody reads.
 *
 * `families` limits it to the families a screen uses; Today passes none and
 * sees them all. `status` is for a parent that already holds the status (the AI
 * service page); everywhere else the shared read is used.
 */

const TONE = {
  down: 'border-red-300 bg-red-50 text-red-900',
  degraded: 'border-amber-300 bg-amber-50 text-amber-950',
  stale: 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text)]',
}
const ICON = { down: CircleAlert, degraded: TriangleAlert, stale: Clock3 }

function PageLink({ children }) {
  const inRouter = useInRouterContext()
  const className = 'font-semibold underline underline-offset-2'
  if (inRouter) return <Link to={AI_SERVICE_PAGE} className={className}>{children}</Link>
  return <a href={appPath(AI_SERVICE_PAGE)} className={className}>{children}</a>
}

export default function AiServiceBanner({ families = null, language, status: given, showLink = true, className = '' }) {
  const lang = (language || getCurrentLanguage()) === 'ar' ? 'ar' : 'en'
  const shared = useAiServiceStatus({ enabled: given === undefined })
  const status = given === undefined ? shared.status : given
  const state = bannerState(status, { families, language: lang })
  if (!state) return null

  const copy = aiCopy(lang).banner
  const Icon = ICON[state.severity]
  return (
    <div role="status" aria-label={copy.label} data-ai-banner={state.severity} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-6 ${TONE[state.severity]} ${className}`}>
      <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="min-w-0 space-y-1">
        {state.lines.map((line) => <p key={line.kind} data-line={line.kind}>{line.text}</p>)}
        {showLink ? <p><PageLink>{copy.link}</PageLink></p> : null}
      </div>
    </div>
  )
}
