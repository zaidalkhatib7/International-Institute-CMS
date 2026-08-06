import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, FileSearch, ListChecks, Loader2, Sparkles, Target } from 'lucide-react'
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle, Textarea,
} from '../../../components/ui'
import { readApiError } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { localize } from '../../rpl/domain/rpl'
import { formatLocalizedDateTime } from '../../../utils/localization'
import {
  analyseAcademicApplication, fetchAcademicApplication, fetchAcademicGapPlan,
  fetchAcademicReferenceData, generateAcademicDiagnostic, recordAcademicRecommendation,
} from '../services/academicRplService'
import ReadinessPanel from '../components/ReadinessPanel'

/*
 * The case workspace — the owner's eight stages in the order they happen.
 *
 * Ordered analysis → readiness → recommendation → gap plan, because that is the
 * dependency chain: the extraction feeds the score, the score feeds the
 * recommendation, and the gap plan only makes sense once you know what is short.
 *
 * The screen is careful about one distinction throughout: the ANALYSIS is what
 * a model read in the documents, and the READINESS is what the platform
 * computed. They are shown as separate cards for that reason — an assessor must
 * be able to reject the first without discarding the second.
 */

const COPY = {
  ar: {
    back: 'عودة إلى القائمة',
    applicant: 'المتقدم',
    requestedTrack: 'المسار المطلوب',
    route: 'مسوّغ الأهلية',
    bridged: 'قادم من حالة RPL',
    evidence: 'الأدلة المرفوعة',
    noEvidence: 'لم يرفع المتقدم أي أدلة بعد.',
    analysisTitle: 'تحليل الأدلة (المرحلة 4)',
    analysisSubtitle: 'يقرأ Gemini الملفات ويستخرج المؤهلات وسنوات الخبرة والمجالات ومؤشرات الكفاءات. لا يُصدر أي درجة.',
    runAnalysis: 'حلّل الأدلة',
    analysing: 'جارٍ التحليل…',
    noAnalysis: 'لم يُجرَ تحليل بعد. الاختبار التشخيصي لا يُولَّد قبله.',
    years: 'سنوات الخبرة المستخرجة',
    domains: 'المجالات المستخرجة',
    signals: 'مؤشرات الكفاءات',
    contradictions: 'تناقضات رُصدت',
    missing: 'ما ينقص للمراجعة',
    documentsRead: 'ملفًا قُرئ',
    strippedWarning: 'حاول النموذج إصدار درجة رغم المنع، وأُزيلت. راجع المخرجات بعناية.',
    diagnosticTitle: 'الاختبار التشخيصي (المرحلة 5)',
    diagnosticSubtitle: 'اختبار مبني على مجالات المتقدم المستخرجة، لا اختبار موحد. كل سؤال يحتاج مراجعة بشرية قبل الإصدار.',
    diagnosticNeedsAnalysis: 'لا يمكن توليد الاختبار قبل تحليل الأدلة: بدونه لا توجد مجالات، فيصبح الاختبار عامًا.',
    noDiagnostic: 'لم يُولَّد اختبار بعد.',
    generateFor: 'ولّد اختبارًا لـ',
    items: 'سؤالًا',
    awaitingReview: 'بانتظار المراجعة',
    review: 'مراجعة',
    recommendTitle: 'تسجيل التوصية (المرحلة 7)',
    recommendSubtitle: 'يحفظ درجات المسارات الثلاثة ويصدر توصية. ليست قرار قبول.',
    rationale: 'مسوّغ التوصية',
    rationalePlaceholder: 'اذكر ما استندت إليه في هذه التوصية (20 حرفًا على الأقل).',
    record: 'سجّل التوصية',
    recording: 'جارٍ التسجيل…',
    gapTitle: 'خطة سد الفجوات (المرحلة 8)',
    computeGap: 'احسب خطة الفجوات',
    unmet: 'كفاءات غير مستوفاة',
    blocking: 'حاجبة',
    improves: 'تُحسّن الجاهزية',
    experienceShort: 'نقص في سنوات الخبرة',
    years_: 'سنة',
    requiredDepth: 'العمق المطلوب',
    notAdmission: 'هذه توصية علمية وليست قرار قبول. القبول يبقى قرارًا بشريًا محكومًا.',
  },
  en: {
    back: 'Back to the list',
    applicant: 'Applicant',
    requestedTrack: 'Requested track',
    route: 'Eligibility route',
    bridged: 'Bridged from RPL case',
    evidence: 'Uploaded evidence',
    noEvidence: 'The applicant has not uploaded any evidence yet.',
    analysisTitle: 'Evidence analysis (stage 4)',
    analysisSubtitle: 'Gemini reads the files and extracts qualifications, years, domains and competency signals. It produces no score.',
    runAnalysis: 'Analyse the evidence',
    analysing: 'Analysing…',
    noAnalysis: 'No analysis has been run. The diagnostic cannot be generated before it.',
    years: 'Extracted years of experience',
    domains: 'Extracted domains',
    signals: 'Competency signals',
    contradictions: 'Contradictions found',
    missing: 'Missing for review',
    documentsRead: 'documents read',
    strippedWarning: 'The model attempted to emit a score despite the rules; it was stripped. Read the output carefully.',
    diagnosticTitle: 'Diagnostic assessment (stage 5)',
    diagnosticSubtitle: 'A paper built from the applicant’s extracted domains, not a standard one. Every question needs a human review before issue.',
    diagnosticNeedsAnalysis: 'The diagnostic cannot be generated before the evidence analysis: without it there are no domains, and the paper would be generic.',
    noDiagnostic: 'No diagnostic has been generated yet.',
    generateFor: 'Generate for',
    items: 'items',
    awaitingReview: 'awaiting review',
    review: 'Review',
    recommendTitle: 'Record the recommendation (stage 7)',
    recommendSubtitle: 'Saves the scores for all three tracks and issues a recommendation. Not an admission decision.',
    rationale: 'Rationale',
    rationalePlaceholder: 'State what this recommendation rests on (at least 20 characters).',
    record: 'Record recommendation',
    recording: 'Recording…',
    gapTitle: 'Gap closure plan (stage 8)',
    computeGap: 'Compute the gap plan',
    unmet: 'Unmet competencies',
    blocking: 'Blocking',
    improves: 'Improves readiness',
    experienceShort: 'Experience shortfall',
    years_: 'years',
    requiredDepth: 'Required depth',
    notAdmission: 'A scientific recommendation, not an admission decision. Admission remains a governed human decision.',
  },
  nl: {
    back: 'Terug naar de lijst',
    applicant: 'Aanvrager',
    requestedTrack: 'Gevraagd traject',
    route: 'Toelatingsroute',
    bridged: 'Overgekomen uit RPL-dossier',
    evidence: 'Geüpload bewijs',
    noEvidence: 'De aanvrager heeft nog geen bewijs geüpload.',
    analysisTitle: 'Bewijsanalyse (fase 4)',
    analysisSubtitle: 'Gemini leest de bestanden en extraheert kwalificaties, jaren, domeinen en competentiesignalen. Geen score.',
    runAnalysis: 'Analyseer het bewijs',
    analysing: 'Analyseren…',
    noAnalysis: 'Nog geen analyse uitgevoerd. De toets kan niet eerder worden gegenereerd.',
    years: 'Geëxtraheerde jaren ervaring',
    domains: 'Geëxtraheerde domeinen',
    signals: 'Competentiesignalen',
    contradictions: 'Gevonden tegenstrijdigheden',
    missing: 'Ontbreekt voor beoordeling',
    documentsRead: 'documenten gelezen',
    strippedWarning: 'Het model probeerde toch een score te geven; die is verwijderd.',
    diagnosticTitle: 'Diagnostische toets (fase 5)',
    diagnosticSubtitle: 'Een toets op basis van de gevonden domeinen. Elke vraag vereist menselijke beoordeling.',
    diagnosticNeedsAnalysis: 'De toets kan niet worden gegenereerd vóór de bewijsanalyse.',
    noDiagnostic: 'Nog geen toets gegenereerd.',
    generateFor: 'Genereren voor',
    items: 'vragen',
    awaitingReview: 'te beoordelen',
    review: 'Beoordelen',
    recommendTitle: 'Aanbeveling vastleggen (fase 7)',
    recommendSubtitle: 'Slaat de scores voor alle drie trajecten op. Geen toelatingsbesluit.',
    rationale: 'Onderbouwing',
    rationalePlaceholder: 'Vermeld waarop deze aanbeveling berust (minimaal 20 tekens).',
    record: 'Aanbeveling vastleggen',
    recording: 'Vastleggen…',
    gapTitle: 'Hiatenplan (fase 8)',
    computeGap: 'Bereken het hiatenplan',
    unmet: 'Niet-aangetoonde competenties',
    blocking: 'Blokkerend',
    improves: 'Verbetert gereedheid',
    experienceShort: 'Tekort aan ervaringsjaren',
    years_: 'jaar',
    requiredDepth: 'Vereiste diepgang',
    notAdmission: 'Een aanbeveling, geen toelatingsbesluit.',
  },
}

export default function AcademicCasePage() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const language = getAdminLanguage()
  const copy = COPY[language] || COPY.en

  const [state, setState] = useState({ loading: true, error: '', application: null, tracks: [] })
  const [action, setAction] = useState({ busy: false, error: '', success: '' })
  const [rationale, setRationale] = useState('')
  const [gapPlan, setGapPlan] = useState(null)

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      // Reference data comes along for the real track ids. Deriving them from
      // list position would break the moment a track is added or reordered.
      const [payload, reference] = await Promise.all([
        fetchAcademicApplication(applicationId),
        fetchAcademicReferenceData(),
      ])
      setState({
        loading: false,
        error: '',
        application: payload?.data || null,
        tracks: reference?.data?.tracks || [],
      })
    } catch (error) {
      setState({ loading: false, error: readApiError(error), application: null, tracks: [] })
    }
  }, [applicationId])

  useEffect(() => {
    load()
  }, [load])

  async function run(request, success) {
    setAction({ busy: true, error: '', success: '' })
    try {
      const result = await request()
      setAction({ busy: false, error: '', success })
      return result
    } catch (error) {
      setAction({ busy: false, error: readApiError(error), success: '' })
      return null
    }
  }

  const application = state.application
  const analysis = application?.analyses?.[0]
  const extraction = analysis?.extraction

  if (state.loading) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-[var(--color-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      </p>
    )
  }

  if (state.error || !application) {
    return (
      <div className="space-y-4 p-6">
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
        <Button variant="outline" onClick={() => navigate('/academic-rpl/applications')}>
          <ArrowLeft size={16} /> {copy.back}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" onClick={() => navigate('/academic-rpl/applications')}>
            <ArrowLeft size={16} /> {copy.back}
          </Button>
          <h1 className="mt-2 text-2xl font-bold">
            <bdi>{application.case_reference}</bdi>
          </h1>
        </div>
        <Badge variant="neutral">{application.status}</Badge>
      </div>

      {action.error ? (
        <p className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {action.error}
        </p>
      ) : null}
      {action.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {action.success}
        </p>
      ) : null}

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={copy.applicant} value={application.user?.name} hint={application.user?.email} />
          <Field
            label={copy.requestedTrack}
            value={localize(application.requested_track?.name, language) || '—'}
          />
          <Field label={copy.route} value={localize(application.eligibility_route?.name, language) || '—'} />
          {application.source_rpl_application ? (
            <Field label={copy.bridged} value={application.source_rpl_application.case_reference} />
          ) : null}
        </CardContent>
      </Card>

      {/* STAGE 3 — what there is to work from. */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" aria-hidden="true" /> {copy.evidence} ({application.evidences?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {application.evidences?.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {application.evidences.map((evidence) => (
                <li
                  key={evidence.public_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-semibold">{evidence.title}</span>
                    <span className="ms-2 text-xs text-[var(--color-text-muted)]">
                      {localize(evidence.category?.name, language)}
                    </span>
                  </span>
                  <Badge variant={evidence.status === 'verified' ? 'success' : 'neutral'}>{evidence.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">{copy.noEvidence}</p>
          )}
        </CardContent>
      </Card>

      {/* STAGE 4 — extraction, kept visibly apart from the score. */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" aria-hidden="true" /> {copy.analysisTitle}
          </CardTitle>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">{copy.analysisSubtitle}</p>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <Button
            variant="outline"
            onClick={async () => {
              const done = await run(
                () => analyseAcademicApplication(applicationId, { response_locale: language }),
                copy.analysisTitle,
              )
              if (done) load()
            }}
            disabled={action.busy || !application.evidences?.length}
          >
            <Sparkles size={16} /> {action.busy ? copy.analysing : copy.runAnalysis}
          </Button>

          {analysis ? (
            <div className="space-y-3 text-sm">
              <p className="text-xs text-[var(--color-text-muted)]">
                {formatLocalizedDateTime(analysis.generated_at, language)} · <bdi>{analysis.model}</bdi>
                {' · '}
                {(analysis.input_snapshot?.evidence_documents?.included || []).length} {copy.documentsRead}
              </p>

              {/* Non-empty means the model tried to grade an admission. Worth
                  seeing, not silently swallowed. */}
              {extraction?.stripped_score_fields?.length ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  {copy.strippedWarning} ({extraction.stripped_score_fields.join(', ')})
                </p>
              ) : null}

              {extraction?.summary ? <p className="leading-6">{extraction.summary}</p> : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={copy.years} value={analysis.extracted_years_experience ?? '—'} />
                <Field label={copy.domains} value={(analysis.extracted_domains || []).join(' · ') || '—'} />
              </div>

              {extraction?.competency_signals?.length ? (
                <section>
                  <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">{copy.signals}</p>
                  <ul className="mt-2 space-y-1">
                    {extraction.competency_signals.map((signal) => (
                      <li key={signal.competency_code} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-mono text-xs"><bdi>{signal.competency_code}</bdi></span>
                        <Badge variant={signal.confidence === 'high' ? 'success' : 'neutral'}>
                          {signal.confidence}
                        </Badge>
                        <span className="text-[var(--color-text-muted)]">{signal.observation}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <ListBlock title={copy.contradictions} items={extraction?.contradictions} tone="amber" />
              <ListBlock title={copy.missing} items={extraction?.missing_for_review} />
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">{copy.noAnalysis}</p>
          )}
        </CardContent>
      </Card>

      {/* STAGE 5 — the personalised paper, built from what stage 4 extracted. */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" aria-hidden="true" /> {copy.diagnosticTitle}
          </CardTitle>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">{copy.diagnosticSubtitle}</p>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {application.diagnostics?.length ? (
            <ul className="space-y-2">
              {application.diagnostics.map((diagnostic) => (
                <li
                  key={diagnostic.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] p-3 text-sm"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant={diagnostic.status === 'issued' ? 'success' : 'warning'}>
                      {diagnostic.status}
                    </Badge>
                    <span>{(diagnostic.items || []).length} {copy.items}</span>
                    {/* The count that decides whether it can be issued. */}
                    <span className="text-[var(--color-text-muted)]">
                      {(diagnostic.items || []).filter((i) => i.governance_status === 'pending').length}{' '}
                      {copy.awaitingReview}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/academic-rpl/diagnostics/${diagnostic.id}`)}
                  >
                    {copy.review}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">{copy.noDiagnostic}</p>
          )}

          {/* Disabled without an analysis, because the server refuses anyway —
              and the reason belongs next to the button, not in an error toast. */}
          <div className="flex flex-wrap items-center gap-3">
            {state.tracks.map((track) => (
              <Button
                key={track.id}
                size="sm"
                variant="outline"
                disabled={action.busy || !analysis}
                onClick={async () => {
                  const created = await run(
                    () => generateAcademicDiagnostic(applicationId, {
                      track_id: track.id,
                      response_locale: language,
                    }),
                    copy.diagnosticTitle,
                  )
                  if (created?.data?.id) navigate(`/academic-rpl/diagnostics/${created.data.id}`)
                }}
              >
                <Sparkles size={16} /> {copy.generateFor} {localize(track.name, language)}
              </Button>
            ))}
          </div>
          {!analysis ? (
            <p className="text-xs text-amber-800">{copy.diagnosticNeedsAnalysis}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* STAGES 6 & 7 — the computed measurement. */}
      <ReadinessPanel applicationPublicId={applicationId} language={language} />

      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" aria-hidden="true" /> {copy.recommendTitle}
          </CardTitle>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">{copy.recommendSubtitle}</p>
        </CardHeader>
        <CardContent className="space-y-3 p-6">
          <Textarea
            rows={3}
            value={rationale}
            placeholder={copy.rationalePlaceholder}
            onChange={(event) => setRationale(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={async () => {
                const done = await run(
                  () => recordAcademicRecommendation(applicationId, { rationale }),
                  copy.recommendTitle,
                )
                if (done) {
                  setRationale('')
                  load()
                }
              }}
              disabled={action.busy || rationale.trim().length < 20}
            >
              {action.busy ? copy.recording : copy.record}
            </Button>
            <span className="text-xs text-[var(--color-text-muted)]">{copy.notAdmission}</span>
          </div>
        </CardContent>
      </Card>

      {/* STAGE 8 — what to do when no track is ready. */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" aria-hidden="true" /> {copy.gapTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap gap-2">
            {state.tracks.map((track) => (
              <Button
                key={track.id}
                size="sm"
                variant="outline"
                onClick={async () => {
                  const result = await run(
                    () => fetchAcademicGapPlan(applicationId, { track: track.code }),
                    copy.gapTitle,
                  )
                  if (result) setGapPlan(result.data)
                }}
                disabled={action.busy}
              >
                {copy.computeGap} · {localize(track.name, language)}
              </Button>
            ))}
          </div>

          {gapPlan ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold">
                {localize(gapPlan.track?.name, language)} — {gapPlan.current_readiness_percentage}% ({gapPlan.band})
              </p>

              {gapPlan.experience_shortfall_years > 0 ? (
                // Not something a module closes. Kept out of the list so the
                // list stays a list of things they can actually go and do.
                <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
                  {copy.experienceShort}: {gapPlan.experience_shortfall_years} {copy.years_}
                </p>
              ) : null}

              {gapPlan.unmet_competencies?.length ? (
                <section>
                  <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">{copy.unmet}</p>
                  <ul className="mt-2 space-y-2">
                    {gapPlan.unmet_competencies.map((gap) => (
                      <li key={gap.competency_code} className="rounded-xl border border-[var(--color-border)] p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{localize(gap.name, language)}</span>
                          <span className="font-mono text-xs text-[var(--color-text-muted)]">
                            <bdi>{gap.competency_code}</bdi>
                          </span>
                          <Badge variant={gap.is_critical ? 'danger' : 'neutral'}>
                            {gap.is_critical ? copy.blocking : copy.improves}
                          </Badge>
                        </div>
                        {gap.required_depth ? (
                          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            {copy.requiredDepth}: {gap.required_depth}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <p className="text-xs text-[var(--color-text-muted)]">{gapPlan.catalogue_note}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{gapPlan.note}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, value, hint }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 font-semibold">{value ?? '—'}</p>
      {hint ? <p className="text-xs text-[var(--color-text-muted)]"><bdi>{hint}</bdi></p> : null}
    </div>
  )
}

function ListBlock({ title, items, tone }) {
  if (!items || items.length === 0) return null

  return (
    <section
      className={`rounded-xl p-3 ${tone === 'amber' ? 'bg-amber-50 text-amber-900' : 'bg-[var(--color-surface-muted)]'}`}
    >
      <p className="text-xs font-semibold uppercase">{title}</p>
      <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
