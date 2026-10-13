import { useState } from 'react'
import { CheckCheck, ExternalLink, LoaderCircle, RefreshCw, ScanSearch, ShieldAlert, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '../../../components/ui'
import { readApiError, unwrapApiData } from '../../../services/apiResponse'
import { formatLocalizedDate, formatLocalizedDateTime } from '../../../utils/localization'
import { getCategory, localize } from '../domain/rpl'
import {
  SCREENING_STALLED_AFTER_MINUTES,
  caseFigureText,
  fill,
  humanizeCode,
  isPartialScreen,
  isStalledRun,
  labelFor,
  regionName,
  safeExternalUrl,
  screeningCopy,
  statusExplanation,
} from '../domain/documentScreening'
import { acknowledgeRplScreening, requestRplScreening } from '../services/rplService'

/*
 * DOCUMENT SCREENING PANEL (owner flow of 12 Oct 2026, P2).
 *
 * What the advisory screen made of the case's documents and claimed employers,
 * for administrators and evidence reviewers only (D17(a)). The page decides
 * whether the panel exists at all; this component never asks.
 *
 * It reads and acknowledges; it never sets an evidence status and never moves
 * the case, because the screen may not either. The figure is shown only for a
 * COMPLETED run, so a refusal or a failure can never read as a low risk.
 */

/* Completed is deliberately neutral, not green: a finished run is not good news. */
const STATUS_VARIANT = { queued: 'info', running: 'info', completed: 'neutral', failed: 'danger', refused: 'warning' }

function readRerunError(error, copy, language) {
  /*
   * The 429 is the per-case daily cap (or the general admin-write throttle). Its
   * message says when the next run is allowed, so it is shown as sent, under a
   * heading in the reader's own language, the way readApiError treats a 422.
   */
  if (Number(error?.response?.status) === 429) {
    const data = error.response.data || {}
    const lines = [].concat(data.errors?.screening || []).filter((line) => typeof line === 'string' && line.trim())
    const detail = lines.length ? lines.join('\n') : typeof data.message === 'string' ? data.message : ''
    return detail ? `${copy.rerunLimited}\n\n${detail}` : copy.rerunLimited
  }
  return readApiError(error, copy.rerunFailed, language)
}

function categoryLabel(code, categories, language) {
  const category = getCategory(code, Array.isArray(categories) && categories.length ? categories : undefined)
  return localize(category?.name || category?.labels, language) || code
}

function personName(person, copy) {
  return person?.name || copy.someone
}

function Meta({ label, children }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[var(--color-text)]">{children || '—'}</dd></div>
}

function ExternalAnchor({ href, children }) {
  const safe = safeExternalUrl(href)
  if (!safe) return <bdi className="break-all">{children || href}</bdi>
  return <a href={safe} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all font-semibold text-[var(--color-primary)] underline underline-offset-2"><bdi>{children || href}</bdi><ExternalLink size={13} aria-hidden="true" /></a>
}

function modelText(screening, copy) {
  const requested = screening.requested_model
  const responding = screening.responding_model
  if (requested && responding && requested !== responding) return fill(copy.modelAnswered, { requested, responding })
  return responding || requested || null
}

function RunSummary({ screening, copy, language, categories, canAcknowledge, busy, onAcknowledge }) {
  const figure = caseFigureText(screening, copy)
  const explanation = statusExplanation(screening, copy)
  const partial = screening.status === 'completed' && isPartialScreen(screening)
  const coverage = screening.coverage || {}
  const instructions = (Array.isArray(screening.instructions_found_in_documents) ? screening.instructions_found_in_documents : []).filter(Boolean)

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        {figure ? (
          <div className="flex flex-wrap items-center gap-3">
            <ScanSearch size={26} className="text-[var(--color-primary)]" aria-hidden="true" />
            <p className="text-2xl font-bold text-[var(--color-text)]">{figure}</p>
            {partial ? <Badge variant="warning">{copy.partial}</Badge> : null}
          </div>
        ) : null}
        {explanation ? <p className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${screening.status === 'refused' || screening.status === 'failed' || isStalledRun(screening) ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-sky-200 bg-sky-50 text-sky-900'}`}>{explanation}</p> : null}
        {screening.status === 'completed' && coverage.documents_total != null ? (
          <p className="text-sm text-[var(--color-text-muted)]">{fill(copy.coverage, { read: coverage.read ?? 0, total: coverage.documents_total })}{partial ? ` ${copy.partialHint}` : ''}</p>
        ) : null}

        {/* Stale: evidence changed after the run. Never re-run automatically (D18(a), cost): staff decide whether to spend a run. */}
        {screening.is_stale ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900" data-stale="true">
            <strong className="flex items-center gap-2"><TriangleAlert size={17} aria-hidden="true" />{copy.staleTitle}</strong>
            <p className="mt-1">{[screening.stale_since ? fill(copy.staleSince, { since: formatLocalizedDateTime(screening.stale_since, language) }) : null, screening.stale_reason ? labelFor(copy.staleReasons, screening.stale_reason) : null].filter(Boolean).join(': ')}</p>
            <p className="mt-1">{copy.staleBody}</p>
          </div>
        ) : null}

        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Meta label={copy.statusLabel}>{labelFor(copy.status, screening.status)}</Meta>
          <Meta label={copy.trigger}>{screening.trigger === 'auto_on_submit' ? copy.triggerAuto : screening.trigger === 'staff_rerun' ? fill(copy.triggerStaff, { name: personName(screening.requested_by, copy) }) : humanizeCode(screening.trigger)}</Meta>
          <Meta label={copy.model}><bdi>{modelText(screening, copy)}</bdi></Meta>
          <Meta label={copy.promptVersion}><bdi>{screening.prompt_version}</bdi></Meta>
          <Meta label={copy.requestedAt}>{screening.created_at ? formatLocalizedDateTime(screening.created_at, language) : null}</Meta>
          <Meta label={copy.completedAt}>{screening.completed_at ? formatLocalizedDateTime(screening.completed_at, language) : null}</Meta>
          <Meta label={copy.webSearch}>{screening.web_search_used ? copy.webSearchUsed : copy.webSearchNotUsed}</Meta>
        </dl>

        {(coverage.excluded_categories || []).length || (coverage.extraction_only_categories || []).length ? (
          <dl className="grid gap-5 sm:grid-cols-2">
            {(coverage.excluded_categories || []).length ? <Meta label={copy.excludedCategories}>{coverage.excluded_categories.map((code) => categoryLabel(code, categories, language)).join(' · ')}</Meta> : null}
            {(coverage.extraction_only_categories || []).length ? <Meta label={copy.extractionOnlyCategories}>{coverage.extraction_only_categories.map((code) => categoryLabel(code, categories, language)).join(' · ')}</Meta> : null}
          </dl>
        ) : null}

        {/* Prompt injection made visible: text a document addressed to the model. Rendered as text, never as markup. */}
        {instructions.length ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" aria-label={copy.instructionsTitle}>
            <strong className="flex items-center gap-2"><ShieldAlert size={17} aria-hidden="true" />{copy.instructionsTitle}</strong>
            <p className="mt-1 leading-6">{copy.instructionsHint}</p>
            <ul className="mt-3 space-y-2">{instructions.map((text, index) => <li key={index} dir="auto" className="whitespace-pre-wrap break-words rounded-xl border border-red-200 bg-white px-3 py-2 font-mono text-xs">{String(text)}</li>)}</ul>
          </section>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          {screening.acknowledged_at ? (
            <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><CheckCheck size={17} aria-hidden="true" />{fill(copy.acknowledged, { name: personName(screening.acknowledged_by, copy), at: formatLocalizedDateTime(screening.acknowledged_at, language) })}</p>
          ) : canAcknowledge ? (
            <>
              <p className="text-sm text-[var(--color-text-muted)]">{copy.acknowledgeHint}</p>
              <Button size="sm" variant="outline" onClick={() => onAcknowledge(screening)} disabled={busy}><CheckCheck size={16} />{copy.acknowledge}</Button>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

/* The extracted values are the model's own strings (dates included), shown as read rather than reformatted. */
function DocumentDetails({ item, copy }) {
  const flags = Array.isArray(item.flags) ? item.flags : []
  const signals = Array.isArray(item.deterministic_signals) ? item.deterministic_signals : []
  const extracted = item.extracted && typeof item.extracted === 'object' ? item.extracted : null
  const extractedRows = extracted ? [
    ['holder_name', extracted.holder_name],
    ['issuer', extracted.issuer],
    ['issue_date', extracted.issue_date],
    ['document_number', extracted.document_number],
    ['employer_names', (extracted.employer_names || []).filter(Boolean).join(' · ')],
    ['job_titles', (extracted.job_titles || []).filter(Boolean).join(' · ')],
    ['period', extracted.period?.from || extracted.period?.to ? `${extracted.period?.from || '—'} – ${extracted.period?.to || '—'}` : null],
  ].filter(([, value]) => value) : []

  if (!flags.length && !signals.length && !extractedRows.length && !item.rationale) return null

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {signals.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{copy.signals}</p>
          <ul className="mt-2 space-y-2">
            {/* Platform facts (for example the same file on another applicant's case). Shown beside the figure, never blended into it. */}
            {signals.map((signal, index) => {
              const hard = signal?.severity === 'hard'
              return <li key={index} data-severity={hard ? 'hard' : 'indicator'} className={`rounded-xl border px-3 py-2 text-xs leading-5 ${hard ? 'border-red-300 bg-red-50 font-semibold text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><span className="me-2 inline-flex rounded-full bg-white/70 px-2 py-0.5 font-bold">{labelFor(copy.severity, hard ? 'hard' : 'indicator')}</span><span dir="auto">{signal?.detail || humanizeCode(signal?.code)}</span></li>
            })}
          </ul>
        </div>
      ) : null}
      {flags.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{copy.flags}</p>
          <ul className="mt-2 space-y-2">
            {flags.map((flag, index) => {
              // An identity document's flag shows the platform's sentence for its code, never stored text (D20(c)).
              const detail = item.extraction_only ? copy.extractionOnlyFlagDetails?.[flag?.code] : flag?.detail
              return <li key={index} className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs leading-5"><strong>{labelFor(copy.flagCodes, flag?.code)}</strong>{flag?.page ? <span className="text-[var(--color-text-muted)]"> · {fill(copy.page, { page: flag.page })}</span> : null}{detail ? <span dir="auto" className="mt-1 block text-[var(--color-text-muted)]">{detail}</span> : null}</li>
            })}
          </ul>
        </div>
      ) : null}
      {extractedRows.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{copy.extracted}</p>
          <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[max-content_minmax(0,1fr)]">
            {extractedRows.map(([key, value]) => <div key={key} className="contents"><dt className="text-[var(--color-text-muted)]">{copy.extractedFields[key]}</dt><dd dir="auto" className="break-words font-semibold">{value}</dd></div>)}
          </dl>
        </div>
      ) : null}
      {item.rationale ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{copy.rationale}</p>
          <p dir="auto" className="mt-2 whitespace-pre-wrap text-xs leading-5">{item.rationale}</p>
        </div>
      ) : null}
    </div>
  )
}

function DocumentsCard({ screening, copy, language, categories }) {
  const items = Array.isArray(screening.items) ? screening.items : []
  const withheld = Array.isArray(screening.coverage?.withheld) ? screening.coverage.withheld : []
  // A refused or failed run never shows a percentage, whatever its rows hold.
  const showFigures = screening.status === 'completed'
  if (!items.length && !withheld.length) return null

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.documentsTitle}</CardTitle></CardHeader>
      <CardContent className="space-y-6 pt-6">
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {[copy.columnDocument, copy.columnRead, copy.columnFigure, copy.columnConfidence, copy.columnConsistency].map((heading) => <th key={heading} scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const snapshot = item.evidence_snapshot || {}
                  const notScreened = item.read_status !== 'read'
                  const figure = showFigures && !notScreened && !item.extraction_only && item.fake_likelihood_percent != null ? fill(copy.documentPercent, { percent: Number(item.fake_likelihood_percent) }) : '—'
                  const details = <DocumentDetails item={item} copy={copy} />
                  return (
                    <ScreeningRowGroup key={item.evidence_public_id || index} details={details} columns={5}>
                      <td className="px-3 py-3 align-top">
                        <p dir="auto" className="font-semibold text-[var(--color-text)]">{snapshot.title || copy.untitled}</p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{[snapshot.category_code ? categoryLabel(snapshot.category_code, categories, language) : null, snapshot.issuer, snapshot.issued_on ? formatLocalizedDate(snapshot.issued_on, language) : null, snapshot.document_number].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <Badge variant={notScreened ? 'warning' : 'neutral'}>{labelFor(copy.readStatus, item.read_status)}</Badge>
                        {notScreened && item.withheld_reason ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">{labelFor(copy.withheldReasons, item.withheld_reason)}</p> : null}
                        {item.extraction_only ? <p className="mt-2"><Badge variant="info">{copy.extractionOnly}</Badge></p> : null}
                      </td>
                      <td className="px-3 py-3 align-top font-bold">{figure}</td>
                      <td className="px-3 py-3 align-top">{labelFor(copy.confidence, item.confidence) || '—'}</td>
                      <td className="px-3 py-3 align-top">{labelFor(copy.consistency, item.consistency_with_claim) || '—'}</td>
                    </ScreeningRowGroup>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-[var(--color-text-muted)]">{copy.noDocuments}</p>}

        {/* Withheld is NOT SCREENED. A document the model never saw has no figure, and no figure is not a good one. */}
        {withheld.length ? (
          <section aria-label={fill(copy.notScreenedTitle, { count: withheld.length })} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <strong>{fill(copy.notScreenedTitle, { count: withheld.length })}</strong>
            <p className="mt-1 leading-6">{copy.notScreenedHint}</p>
            <ul className="mt-3 space-y-1">{withheld.map((entry, index) => <li key={entry?.evidence_public_id || index}><bdi className="font-semibold">{entry?.title || copy.untitled}</bdi>{entry?.reason ? ` — ${labelFor(copy.withheldReasons, entry.reason)}` : ''}</li>)}</ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ScreeningRowGroup({ children, details, columns }) {
  return (
    <>
      <tr className={details ? '' : 'border-b border-[var(--color-border)]'}>{children}</tr>
      {details ? <tr className="border-b border-[var(--color-border)]"><td colSpan={columns} className="px-3 pb-4">{details}</td></tr> : null}
    </>
  )
}

/*
 * Google's grounding terms may require its "Search Suggestions" wherever grounded
 * results are shown. The markup comes from Google through our server, so it is
 * never injected into this page: it renders inside a sandboxed frame with NO
 * scripts and no same-origin access. Popups are allowed (and <base target> sends
 * every chip to a new tab) because a suggestion chip is a link to Google Search,
 * and Google refuses to be framed.
 */
function SearchSuggestions({ html, title }) {
  if (typeof html !== 'string' || html.trim() === '') return null
  const frameDocument = `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><base target="_blank"></head><body style="margin:0">${html}</body></html>`
  return <iframe title={title} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={frameDocument} className="h-24 w-full rounded-xl border border-[var(--color-border)] bg-white" />
}

function EmployersCard({ screening, copy, language }) {
  const checks = Array.isArray(screening.employer_checks) ? screening.employer_checks : []
  if (screening.status !== 'completed' && !checks.length) return null

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle>{copy.employersTitle}</CardTitle>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.employersHint}</p>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {checks.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {[copy.columnEmployer, copy.columnLocation, copy.columnResult, copy.columnMethod, copy.columnConfidence, copy.columnSources].map((heading) => <th key={heading} scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {checks.map((check, index) => {
                  const sources = (Array.isArray(check.sources) ? check.sources : []).filter((source) => source?.uri)
                  const queries = (Array.isArray(check.search_queries) ? check.search_queries : []).filter(Boolean)
                  const flags = (Array.isArray(check.flags) ? check.flags : []).filter(Boolean)
                  const details = flags.length || queries.length || check.rationale ? (
                    <div className="space-y-3 text-xs leading-5">
                      {flags.map((flag) => <p key={flag} data-flag={flag} className={flag === 'privacy_query_breach' ? 'flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 font-semibold text-red-800' : 'rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900'}>{flag === 'privacy_query_breach' ? <ShieldAlert size={15} aria-hidden="true" /> : null}{labelFor(copy.employerFlags, flag)}</p>)}
                      {queries.length ? <p><span className="font-semibold text-[var(--color-text-muted)]">{copy.searchQueries}: </span>{queries.map((query, queryIndex) => <bdi key={queryIndex} className="me-2 rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5">{query}</bdi>)}</p> : null}
                      {check.rationale ? <p dir="auto" className="whitespace-pre-wrap"><span className="font-semibold text-[var(--color-text-muted)]">{copy.rationale}: </span>{check.rationale}</p> : null}
                    </div>
                  ) : null
                  return (
                    <ScreeningRowGroup key={`${check.claimed_name}-${index}`} details={details} columns={6}>
                      <td className="px-3 py-3 align-top"><p dir="auto" className="font-semibold">{check.claimed_name || '—'}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{labelFor(copy.claimSource, check.claim_source)}</p></td>
                      <td className="px-3 py-3 align-top text-xs">
                        <p>{[check.city, check.country ? regionName(check.country, language) : null].filter(Boolean).join(', ') || '—'}</p>
                        {check.website ? <p className="mt-1"><ExternalAnchor href={check.website} /></p> : null}
                      </td>
                      <td className="px-3 py-3 align-top" data-result={check.result}>{labelFor(copy.employerResult, check.result) || '—'}</td>
                      <td className="px-3 py-3 align-top">{labelFor(copy.employerMethod, check.method) || '—'}</td>
                      <td className="px-3 py-3 align-top">{labelFor(copy.confidence, check.confidence) || '—'}</td>
                      <td className="px-3 py-3 align-top text-xs">{sources.length ? <ul className="space-y-1">{sources.map((source, sourceIndex) => <li key={sourceIndex}><ExternalAnchor href={source.uri}>{source.title || source.uri}</ExternalAnchor></li>)}</ul> : copy.noSources}</td>
                    </ScreeningRowGroup>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-[var(--color-text-muted)]">{copy.employersNone}</p>}
        <SearchSuggestions html={screening.search_entry_point_html} title={copy.searchSuggestions} />
      </CardContent>
    </Card>
  )
}

export default function DocumentScreeningPanel({ applicationId, screenings = [], loading = false, error = '', canRun = false, categories, language = 'en', onReload, onScreeningAdded, onScreeningUpdated }) {
  // Arabic or English only; any other value (the NL switcher) reads English.
  const lang = language === 'ar' ? 'ar' : 'en'
  const copy = screeningCopy(lang)
  const [selectedId, setSelectedId] = useState(null)
  const [action, setAction] = useState({ busy: false, error: '', success: '' })
  const list = Array.isArray(screenings) ? screenings : []
  const selected = list.find((item) => item.public_id === selectedId) || list[0] || null
  // Newest first (the API's order): a queued or running latest run means a re-run would only queue behind it.
  const inFlight = ['queued', 'running'].includes(list[0]?.status)
  // Unless it is stuck past the API's window: the re-run then closes it as abandoned and replaces it.
  const stalled = inFlight && isStalledRun(list[0])
  const rerunHeld = inFlight && !stalled

  async function rerun() {
    setAction({ busy: true, error: '', success: '' })
    try {
      const created = unwrapApiData(await requestRplScreening(applicationId))
      setAction({ busy: false, error: '', success: created?.status === 'refused' ? copy.rerunRefused : copy.rerunQueued })
      if (created?.public_id) {
        onScreeningAdded?.(created)
        setSelectedId(created.public_id)
      } else onReload?.()
    } catch (requestError) {
      setAction({ busy: false, error: readRerunError(requestError, copy, lang), success: '' })
    }
  }

  async function acknowledge(screening) {
    setAction({ busy: true, error: '', success: '' })
    try {
      const updated = unwrapApiData(await acknowledgeRplScreening(screening.public_id))
      setAction({ busy: false, error: '', success: copy.acknowledgedDone })
      if (updated?.public_id) onScreeningUpdated?.(updated)
      else onReload?.()
    } catch (requestError) {
      setAction({ busy: false, error: readApiError(requestError, copy.acknowledgeFailed, lang), success: '' })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{copy.title}</CardTitle>
                {selected ? <Badge variant={STATUS_VARIANT[selected.status] || 'neutral'}>{labelFor(copy.status, selected.status)}</Badge> : null}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text)]">{copy.disclaimer}</p>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--color-text-muted)]">{copy.audience}</p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onReload?.()} disabled={loading}><RefreshCw size={16} />{copy.refresh}</Button>
                {canRun ? <Button size="sm" onClick={rerun} disabled={action.busy || loading || rerunHeld}>{action.busy ? <LoaderCircle className="animate-spin" size={16} /> : <ScanSearch size={16} />}{copy.rerun}</Button> : null}
              </div>
              {canRun ? <p className={`max-w-sm text-xs ${stalled ? 'text-amber-800' : 'text-[var(--color-text-muted)]'}`}>{stalled ? fill(copy.rerunStalled, { minutes: SCREENING_STALLED_AFTER_MINUTES }) : inFlight ? copy.rerunBusy : copy.rerunHint}</p> : null}
            </div>
          </div>
        </CardHeader>
        {action.error || action.success ? (
          <CardContent className="pt-4">
            <div role="alert" className={`whitespace-pre-line rounded-2xl border px-4 py-3 text-sm ${action.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>{action.error || action.success}</div>
          </CardContent>
        ) : null}
      </Card>

      {loading && !list.length ? <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">{copy.loading}</p> : null}
      {error ? <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="outline" onClick={() => onReload?.()}>{copy.retry}</Button></div> : null}
      {!loading && !error && !list.length ? <p className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">{copy.empty}</p> : null}

      {list.length > 1 ? (
        <nav aria-label={copy.history} className="flex flex-wrap gap-2">
          {list.map((item, index) => {
            const active = item.public_id === selected?.public_id
            return <button key={item.public_id || index} type="button" onClick={() => setSelectedId(item.public_id)} aria-current={active ? 'true' : undefined} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${active ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]'}`}>{index === 0 ? `${copy.latest} · ` : ''}{formatLocalizedDateTime(item.created_at, lang)} · {labelFor(copy.status, item.status)}</button>
          })}
        </nav>
      ) : null}

      {selected ? (
        <>
          <RunSummary screening={selected} categories={categories} copy={copy} language={lang} canAcknowledge={selected.status === 'completed'} busy={action.busy} onAcknowledge={acknowledge} />
          <DocumentsCard screening={selected} copy={copy} language={lang} categories={categories} />
          <EmployersCard screening={selected} copy={copy} language={lang} />
        </>
      ) : null}
    </div>
  )
}
