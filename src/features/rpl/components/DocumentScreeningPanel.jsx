import { useState } from 'react'
import { CheckCheck, ExternalLink, LoaderCircle, RefreshCw, ScanSearch, ShieldAlert, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '../../../components/ui'
import { readApiError, unwrapApiData } from '../../../services/apiResponse'
import { formatLocalizedDate, formatLocalizedDateTime } from '../../../utils/localization'
import { getCategory, localize } from '../domain/rpl'
import {
  ISSUER_CONTACT_FIELDS,
  ISSUER_PRESENCE_FIELDS,
  RISK_BAND_VARIANT,
  SCREENING_IN_FLIGHT,
  SCREENING_STALLED_AFTER_MINUTES,
  caseFigureText,
  claimConfidenceLabel,
  fill,
  humanizeCode,
  isOlderRulesRun,
  isPartialScreen,
  isRiskModelRun,
  isStalledRun,
  labelFor,
  namedInText,
  regionName,
  riskBandLabel,
  riskComponentText,
  riskNoteText,
  safeExternalUrl,
  screeningCopy,
  screeningDocumentTitle,
  sortRiskComponents,
  sourcesAreNotOwn,
  statusExplanation,
  screeningRationaleText,
  topRiskReason,
} from '../domain/documentScreening'
import { acknowledgeRplScreening, requestRplScreening, retryRplScreeningNow } from '../services/rplService'
import AiProvenanceNote from '../../shared/ai/AiProvenanceNote'
import AiRunNotice from '../../shared/ai/AiRunNotice'
import AiServiceBanner from '../../shared/ai/AiServiceBanner'
import { aiCopy } from '../../shared/ai/aiCopy'
import { aiErrorMessage, isWaitingRetry, runError, screeningInstrument } from '../../shared/ai/aiState'

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
 *
 * A run that carries risk_breakdown (rpl-risk-v1, owner report of 18 Oct 2026)
 * also shows the band beside the figure, what raised it most, how it was
 * reached, the issuer details of each document and the platform's confidence
 * in each employer claim. Any other run renders as it always did.
 */

/* Completed is deliberately neutral, not green: a finished run is not good news. */
const STATUS_VARIANT = { queued: 'info', running: 'info', waiting_retry: 'warning', completed: 'neutral', failed: 'danger', refused: 'warning' }

/*
 * AI RESILIENCE (Release G, AI-RESILIENCE-SPEC §5.2, §7.3). Pass 1 and pass 2 may
 * be answered by different models of the chain. The figure stands on pass 1's
 * model, and on pass 2's too when an employer search raised a component of it:
 * the server says which in figure_models (fix review of 23 Oct 2026), and two
 * runs' figures compare only when those models are the same
 * (screeningInstrument). A run waiting to retry says when and offers Retry now;
 * a failed run says why by its code.
 */

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

function RunSummary({ screening, copy, language, categories, canAcknowledge, busy, onAcknowledge, onRetryNow }) {
  const figure = caseFigureText(screening, copy)
  const { code: errorCode, errorClass } = runError(screening)
  // A failed or refused run whose code names the AI service's trouble says so, never the generic "stopped".
  const aiMessage = ['failed', 'refused'].includes(screening.status) && screening.error_code ? aiErrorMessage(errorCode, errorClass, language) : null
  const explanation = aiMessage || statusExplanation(screening, copy)
  const waiting = isWaitingRetry(screening)
  const provenance = screening.ai_provenance && typeof screening.ai_provenance === 'object' ? screening.ai_provenance : null
  const partial = screening.status === 'completed' && isPartialScreen(screening)
  // rpl-risk-v1 only, and only beside a figure: the band, and the one line saying what raised it most.
  const band = figure ? screening.risk_breakdown?.band : null
  const bandLabel = figure ? riskBandLabel(screening, copy) : null
  const headline = figure ? topRiskReason(screening, copy) : null
  const coverage = screening.coverage || {}
  const instructions = (Array.isArray(screening.instructions_found_in_documents) ? screening.instructions_found_in_documents : []).filter(Boolean)
  // The case-level employment signals (plan 5.3: shown to staff as their own column), beside the figure, never in it.
  const caseSignals = (Array.isArray(screening.case_signals) ? screening.case_signals : []).filter((signal) => signal && typeof signal === 'object')

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        {figure ? (
          <div className="flex flex-wrap items-center gap-3">
            <ScanSearch size={26} className="text-[var(--color-primary)]" aria-hidden="true" />
            <p className="text-2xl font-bold text-[var(--color-text)]">{figure}</p>
            {bandLabel ? <span data-band={band}><Badge variant={RISK_BAND_VARIANT[band] || 'neutral'}>{bandLabel}</Badge></span> : null}
            {partial ? <Badge variant="warning">{copy.partial}</Badge> : null}
          </div>
        ) : null}
        {headline ? <p data-risk-headline="true" className="text-sm font-semibold leading-6 text-[var(--color-text)]">{headline}</p> : null}
        {waiting && !isStalledRun(screening) ? <AiRunNotice run={screening} language={language} onRetryNow={onRetryNow} canRetry={Boolean(onRetryNow)} /> : null}
        {explanation ? <p data-error-code={aiMessage ? errorCode : undefined} className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${screening.status === 'refused' || screening.status === 'failed' || isStalledRun(screening) ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-sky-200 bg-sky-50 text-sky-900'}`}>{explanation}</p> : null}
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

        {/* Which model made the figure (pass 1); the employer check (pass 2) says its own below. */}
        {provenance?.pass_1 ? <AiProvenanceNote provenance={provenance.pass_1} language={language} /> : null}

        {(coverage.excluded_categories || []).length || (coverage.extraction_only_categories || []).length ? (
          <dl className="grid gap-5 sm:grid-cols-2">
            {(coverage.excluded_categories || []).length ? <Meta label={copy.excludedCategories}>{coverage.excluded_categories.map((code) => categoryLabel(code, categories, language)).join(' · ')}</Meta> : null}
            {(coverage.extraction_only_categories || []).length ? <Meta label={copy.extractionOnlyCategories}>{coverage.extraction_only_categories.map((code) => categoryLabel(code, categories, language)).join(' · ')}</Meta> : null}
          </dl>
        ) : null}

        {caseSignals.length ? (
          <section aria-label={copy.caseSignalsTitle} data-case-signals="true" className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{copy.caseSignalsTitle}</p>
            <p className="text-xs leading-5 text-[var(--color-text-muted)]">{copy.caseSignalsHint}</p>
            <ul className="space-y-2">
              {caseSignals.map((signal, index) => {
                const hard = signal.severity === 'hard'
                return (
                  <li key={index} data-severity={hard ? 'hard' : 'indicator'} className={`rounded-xl border px-3 py-2 text-xs leading-5 ${hard ? 'border-red-300 bg-red-50 font-semibold text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                    <span className="me-2 inline-flex rounded-full bg-white/70 px-2 py-0.5 font-bold">{labelFor(copy.severity, hard ? 'hard' : 'indicator')}</span>
                    <strong>{labelFor(copy.caseSignalCodes, signal.code)}</strong>
                    {signal.detail ? <span dir="auto" className="mt-1 block">{signal.detail}</span> : null}
                  </li>
                )
              })}
            </ul>
          </section>
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

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

/* missing marks the checklist item; highlight only colours a row that belongs to one (phone, email and website are "contact"). */
function IssuerRow({ field, label, value, missing = false, highlight = missing }) {
  return (
    <div className="contents" data-field={field} data-missing={missing ? 'true' : undefined}>
      <dt className={highlight ? 'font-semibold text-amber-800' : 'text-[var(--color-text-muted)]'}>{label}</dt>
      <dd dir="auto" className={`break-words font-semibold ${highlight ? 'text-amber-800' : ''}`}>{value}</dd>
    </div>
  )
}

/*
 * The issuer as the document shows it (rpl-screen-v3: extracted.issuer_check).
 * An empty value is "not shown"; on an experience letter the details the server
 * counted as missing are marked. Phone, email and website are one checklist item
 * ("contact"), so they are marked together. A presence the model did not report
 * is a dash, never "absent": the server gives it the benefit of the doubt too.
 */
function IssuerDetails({ issuerCheck, item, extracted, copy }) {
  const details = item.risk?.class === 'experience_letter'
    ? (Array.isArray(item.risk.components) ? item.risk.components : []).find((component) => component?.code === 'issuer_details_missing')
    : null
  const missing = new Set(Array.isArray(details?.missing) ? details.missing : [])
  const text = (field) => (typeof issuerCheck[field] === 'string' && issuerCheck[field].trim() !== '' ? issuerCheck[field] : copy.notShown)
  const row = (field) => <IssuerRow key={field} field={field} label={copy.issuerFields[field]} value={text(field)} missing={missing.has(field)} />
  const identifiable = typeof issuerCheck.issuer_identifiable === 'string' ? issuerCheck.issuer_identifiable : null

  return (
    <div data-issuer-check="true">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{copy.issuerTitle}</p>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[max-content_minmax(0,1fr)]">
        {['legal_name', 'registration_number', 'address'].map(row)}
        <div className="contents" data-field="contact" data-missing={missing.has('contact') ? 'true' : undefined}>
          {ISSUER_CONTACT_FIELDS.map((field) => <IssuerRow key={field} field={field} label={copy.issuerFields[field]} value={text(field)} highlight={missing.has('contact')} />)}
        </div>
        {['signatory_name', 'signatory_title'].map(row)}
        {ISSUER_PRESENCE_FIELDS.map((field) => <IssuerRow key={field} field={field} label={copy.issuerFields[field]} value={issuerCheck[field] ? labelFor(copy.presence, issuerCheck[field]) : '—'} missing={missing.has(field)} />)}
        {missing.has('issue_date') ? <IssuerRow field="issue_date" label={copy.extractedFields.issue_date} value={extracted?.issue_date || copy.notShown} missing /> : null}
      </dl>
      {identifiable ? (
        <p className="mt-2 text-xs leading-5" data-issuer-identifiable={identifiable}>
          <strong className={identifiable === 'no' ? 'text-amber-800' : ''}>{labelFor(copy.issuerIdentifiable, identifiable)}</strong>
          {issuerCheck.issuer_identifiable_reason ? <span dir="auto" className="mt-1 block text-[var(--color-text-muted)]">{issuerCheck.issuer_identifiable_reason}</span> : null}
        </p>
      ) : null}
    </div>
  )
}

/* The extracted values are the model's own strings (dates included), shown as read rather than reformatted. */
function DocumentDetails({ item, copy, language }) {
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
  // Optional: rows from before rpl-screen-v3 have no issuer_check key at all.
  const issuerCheck = isPlainObject(extracted?.issuer_check) ? extracted.issuer_check : null

  if (!flags.length && !signals.length && !extractedRows.length && !issuerCheck && !item.rationale) return null

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
      {issuerCheck ? <IssuerDetails issuerCheck={issuerCheck} item={item} extracted={extracted} copy={copy} /> : null}
      {item.rationale ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{copy.rationale}</p>
          <p dir="auto" className="mt-2 whitespace-pre-wrap text-xs leading-5">{screeningRationaleText(item.rationale, language)}</p>
        </div>
      ) : null}
    </div>
  )
}

function percentOrNull(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function RiskComponentItem({ component, documentTitle, caseLevel, copy }) {
  const text = riskComponentText(component, { documentTitle, caseLevel }, copy)
  return (
    <li data-component={component.code} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
      <strong className="block">{text.title}</strong>
      {text.reason ? <span dir="auto" className="mt-1 block">{text.reason}</span> : null}
      {text.weight ? <span className="mt-1 block font-semibold">{text.weight}</span> : null}
      {text.sources ? <span className="mt-1 block text-amber-900">{text.sources}</span> : null}
    </li>
  )
}

/*
 * HOW THE FIGURE WAS REACHED (rpl-risk-v1). The server's arithmetic, as stored
 * with the run: per document, the model's reading and each platform component
 * with its weight and who raised it, then the document's figure; then the
 * case-level components and the case line. Shown, never recomputed here.
 */
function RiskBreakdownCard({ screening, copy }) {
  if (screening.status !== 'completed' || !isRiskModelRun(screening)) return null
  const breakdown = screening.risk_breakdown
  const documents = (Array.isArray(breakdown.documents) ? breakdown.documents : []).filter(isPlainObject)
  const caseComponents = sortRiskComponents(breakdown.case_components)
  const casePercent = percentOrNull(breakdown.case_percent)
  const highest = percentOrNull(breakdown.highest_document_percent)

  return (
    <Card role="region" aria-label={copy.riskTitle} data-risk-breakdown="true">
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle>{copy.riskTitle}</CardTitle>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.riskCombination}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {documents.map((entry, index) => {
          const title = screeningDocumentTitle(screening, entry.evidence_public_id, copy)
          const modelPercent = percentOrNull(entry.model_percent)
          const documentPercent = percentOrNull(entry.document_percent)
          const components = sortRiskComponents(entry.components)
          const notes = (Array.isArray(entry.notes) ? entry.notes : []).filter((note) => typeof note === 'string' && note)
          return (
            <section key={entry.evidence_public_id || index} aria-label={title} data-risk-document={entry.evidence_public_id || ''} className="space-y-2 rounded-2xl border border-[var(--color-border)] p-4 text-sm">
              <p dir="auto" className="font-semibold text-[var(--color-text)]">{title}</p>
              {entry.model_percent_unsupported ? <p className="text-xs leading-5 text-[var(--color-text-muted)]" data-model-dropped="true">{copy.riskModelDropped}</p>
                : modelPercent != null ? <p className="text-xs leading-5 text-[var(--color-text-muted)]">{fill(copy.riskModelPart, { percent: modelPercent })}</p> : null}
              {components.length ? <ul className="space-y-2">{components.map((component, componentIndex) => <RiskComponentItem key={`${component.code}-${componentIndex}`} component={component} documentTitle={title} caseLevel={false} copy={copy} />)}</ul> : null}
              {documentPercent != null ? <p className="font-bold text-[var(--color-text)]">{fill(copy.riskDocumentFigure, { percent: documentPercent })}</p> : null}
              {notes.map((note) => <p key={note} data-note={note} className="text-xs leading-5 text-[var(--color-text-muted)]">{riskNoteText(note, copy)}</p>)}
            </section>
          )
        })}

        {caseComponents.length ? (
          <section aria-label={copy.riskCaseComponentsTitle} data-risk-case="true" className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{copy.riskCaseComponentsTitle}</p>
            <ul className="space-y-2">{caseComponents.map((component, index) => <RiskComponentItem key={`${component.code}-${index}`} component={component} caseLevel copy={copy} />)}</ul>
          </section>
        ) : null}

        <p data-risk-case-line="true" className="border-t border-[var(--color-border)] pt-4 text-sm font-bold text-[var(--color-text)]">
          {casePercent != null
            ? fill(copy.riskCaseLine, { max: highest ?? casePercent, withCase: caseComponents.length ? copy.riskCaseLineWith : '', percent: casePercent })
            : copy.riskCaseNoFigure}
        </p>
      </CardContent>
    </Card>
  )
}

function DocumentsCard({ screening, copy, language, categories }) {
  const items = Array.isArray(screening.items) ? screening.items : []
  const withheld = Array.isArray(screening.coverage?.withheld) ? screening.coverage.withheld : []
  // A refused or failed run never shows a percentage, whatever its rows hold.
  const showFigures = screening.status === 'completed'
  // rpl-risk-v1: the figure combines the model's reading with the platform's signals; the confidence beside it is the model's, in its reading.
  const confidenceHeading = isRiskModelRun(screening) ? copy.columnModelConfidence : copy.columnConfidence
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
                  {[copy.columnDocument, copy.columnRead, copy.columnFigure, confidenceHeading, copy.columnConsistency].map((heading) => <th key={heading} scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const snapshot = item.evidence_snapshot || {}
                  const notScreened = item.read_status !== 'read'
                  const figure = showFigures && !notScreened && !item.extraction_only && item.fake_likelihood_percent != null ? fill(copy.documentPercent, { percent: Number(item.fake_likelihood_percent) }) : '—'
                  const details = <DocumentDetails item={item} copy={copy} language={language} />
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

/*
 * On an rpl-risk-v1 run the confidence column is the platform's confidence in
 * the CLAIM (never above Medium), and the model's confidence in its own
 * classification moves into the details: under "Confidence" it read as
 * confidence in the employer. The pages a search returned for an employer that
 * cannot be identified, or was not found, are said not to be its own.
 */
function EmployersCard({ screening, copy, language }) {
  const checks = Array.isArray(screening.employer_checks) ? screening.employer_checks : []
  if (screening.status !== 'completed' && !checks.length) return null
  const riskRun = isRiskModelRun(screening)

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle>{copy.employersTitle}</CardTitle>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.employersHint}</p>
        {riskRun ? <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{copy.employersHintIdentity}</p> : null}
        {screening.ai_provenance?.pass_2 ? <AiProvenanceNote provenance={screening.ai_provenance.pass_2} language={language} className="mt-2" /> : null}
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {checks.length ? (
          <div className="overflow-x-auto">
            {riskRun ? <p data-hint="claim-confidence" className="mb-3 text-xs leading-5 text-[var(--color-text-muted)]">{copy.claimConfidenceHint}</p> : null}
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {[copy.columnEmployer, copy.columnLocation, copy.columnResult, copy.columnMethod, riskRun ? copy.columnClaimConfidence : copy.columnConfidence, copy.columnSources].map((heading) => <th key={heading} scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {checks.map((check, index) => {
                  const sources = (Array.isArray(check.sources) ? check.sources : []).filter((source) => source?.uri)
                  const queries = (Array.isArray(check.search_queries) ? check.search_queries : []).filter(Boolean)
                  const flags = (Array.isArray(check.flags) ? check.flags : []).filter(Boolean)
                  const modelConfidence = riskRun && check.confidence ? fill(copy.modelConfidence, { value: labelFor(copy.confidence, check.confidence) }) : null
                  const namedIn = riskRun ? namedInText(check, screening, copy) : null
                  const notOwnSources = riskRun && sourcesAreNotOwn(check)
                  const details = flags.length || queries.length || check.rationale || modelConfidence || namedIn ? (
                    <div className="space-y-3 text-xs leading-5">
                      {namedIn ? <p data-named-in="true">{namedIn}</p> : null}
                      {flags.map((flag) => <p key={flag} data-flag={flag} className={flag === 'privacy_query_breach' ? 'flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 font-semibold text-red-800' : 'rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900'}>{flag === 'privacy_query_breach' ? <ShieldAlert size={15} aria-hidden="true" /> : null}{labelFor(copy.employerFlags, flag)}</p>)}
                      {queries.length ? <p><span className="font-semibold text-[var(--color-text-muted)]">{copy.searchQueries}: </span>{queries.map((query, queryIndex) => <bdi key={queryIndex} className="me-2 rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5">{query}</bdi>)}</p> : null}
                      {modelConfidence ? <p data-model-confidence={check.confidence}>{modelConfidence}</p> : null}
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
                      {riskRun
                        ? <td className="px-3 py-3 align-top" data-claim-confidence={check.claim_confidence || undefined}>{claimConfidenceLabel(check, copy) || '—'}</td>
                        : <td className="px-3 py-3 align-top">{labelFor(copy.confidence, check.confidence) || '—'}</td>}
                      <td className="px-3 py-3 align-top text-xs">{sources.length ? (
                        <>
                          {notOwnSources ? <p data-sources-not-own="true" className="mb-1 text-[var(--color-text-muted)]">{copy.sourcesNotThisEmployer}</p> : null}
                          <ul className="space-y-1">{sources.map((source, sourceIndex) => <li key={sourceIndex}><ExternalAnchor href={source.uri}>{source.title || source.uri}</ExternalAnchor></li>)}</ul>
                        </>
                      ) : copy.noSources}</td>
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
  // Arabic or English only; any other value reads English.
  const lang = language === 'ar' ? 'ar' : 'en'
  const copy = screeningCopy(lang)
  const [selectedId, setSelectedId] = useState(null)
  const [action, setAction] = useState({ busy: false, error: '', success: '' })
  const list = Array.isArray(screenings) ? screenings : []
  const selected = list.find((item) => item.public_id === selectedId) || list[0] || null
  // Newest first (the API's order): a queued, running or waiting latest run means a re-run would only queue behind it.
  const inFlight = SCREENING_IN_FLIGHT.includes(list[0]?.status)
  // Unless it is stuck past the API's window: the re-run then closes it as abandoned and replaces it.
  const stalled = inFlight && isStalledRun(list[0])
  const rerunHeld = inFlight && !stalled
  const latestWaiting = isWaitingRetry(list[0]) && !stalled
  // The figures over time (§7.3): the model of the selected run, and of the run before it.
  const selectedIndex = selected ? list.indexOf(selected) : -1
  const previous = selectedIndex >= 0 ? list[selectedIndex + 1] || null : null
  const selectedModel = screeningInstrument(selected)
  const previousModel = selected?.status === 'completed' && previous?.status === 'completed' ? screeningInstrument(previous) : null
  const differentModel = Boolean(selectedModel && previousModel && selectedModel !== previousModel)

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

  /*
   * Retry now (§5.2): the latest run, waiting to retry, starts at once; the same
   * run, not a new one. The screen's own route by its public_id: a re-run while
   * it waits is refused (fix review of 23 Oct 2026).
   */
  async function retryNow() {
    const updated = unwrapApiData(await retryRplScreeningNow(list[0].public_id))
    if (updated?.public_id) onScreeningUpdated?.(updated)
    else onReload?.()
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
      <AiServiceBanner families={['case_analysis', 'web_search']} language={lang} />
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
              {canRun ? <p className={`max-w-sm text-xs ${stalled ? 'text-amber-800' : 'text-[var(--color-text-muted)]'}`}>{stalled ? fill(copy.rerunStalled, { minutes: SCREENING_STALLED_AFTER_MINUTES }) : latestWaiting ? copy.rerunWaiting : inFlight ? copy.rerunBusy : copy.rerunHint}</p> : null}
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
            // A run's model is named when it differs from the selected run's, so a change of instrument shows in the history.
            const model = screeningInstrument(item)
            const otherModel = !active && model && selectedModel && model !== selectedModel ? model : null
            return <button key={item.public_id || index} type="button" onClick={() => setSelectedId(item.public_id)} aria-current={active ? 'true' : undefined} data-model={otherModel || undefined} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${active ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]'}`}>{index === 0 ? `${copy.latest} · ` : ''}{formatLocalizedDateTime(item.created_at, lang)} · {labelFor(copy.status, item.status)}{otherModel ? <> · <bdi>{otherModel}</bdi></> : null}</button>
          })}
        </nav>
      ) : null}

      {selected ? (
        <>
          <RunSummary screening={selected} categories={categories} copy={copy} language={lang} canAcknowledge={selected.status === 'completed'} busy={action.busy} onAcknowledge={acknowledge} onRetryNow={canRun && selected === list[0] ? retryNow : null} />
          {differentModel ? <p data-different-model="true" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">{fill(aiCopy(lang).provenance.differentModel, { model: previousModel })}</p> : null}
          {/* A run on instructions that did not check the issuer's identity: its figure stands as stored, and a re-run applies the current checks. */}
          {canRun && isOlderRulesRun(selected) ? <p data-older-rules="true" className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">{fill(copy.olderRules, { version: selected.prompt_version })}</p> : null}
          <RiskBreakdownCard screening={selected} copy={copy} />
          <DocumentsCard screening={selected} copy={copy} language={lang} categories={categories} />
          <EmployersCard screening={selected} copy={copy} language={lang} />
        </>
      ) : null}
    </div>
  )
}
