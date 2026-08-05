import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Layers3, Loader2, Target } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '../../../components/ui'
import { fetchGapClosurePlan } from '../services/rplService'
import { readApiError } from '../../../services/apiResponse'
import { localize } from '../domain/rpl'

/*
 * GAP CLOSURE ENGINE — owner specification, 5 Aug 2026.
 *
 * The number of packages a candidate needs comes from the gaps their assessment
 * found, never from the level they are targeting. Two people pursuing
 * practitioner may need one package and four.
 *
 * Deterministic: the server runs set-cover over governed competency mappings,
 * no model involved. Every row here can be traced to "this package declares
 * this competency", which is what makes it defensible to an accreditor.
 *
 * THREE OUTCOMES ARE SHOWN SEPARATELY BECAUSE THEY MEAN DIFFERENT THINGS:
 *   recommended  — a package closes this gap
 *   uncovered    — the competency is known, but nothing in the catalogue
 *                  teaches it. The catalogue needs a package.
 *   unresolvable — the standard's competency is not mapped to the central
 *                  dictionary, so it cannot be matched at all. The mapping
 *                  needs doing.
 *
 * Collapsing those into one "not covered" list would hide which of two very
 * different jobs needs doing.
 */

const COPY = {
  ar: {
    title: 'محرك سد الفجوات',
    subtitle: 'الحقائب التي تُغلق الفجوات التي كشفها التقييم. العدد يتبع الفجوات، لا المستوى المستهدف.',
    load: 'احسب خطة سد الفجوات',
    loading: 'جارٍ الحساب…',
    progress: 'التقدم نحو المستوى المستهدف',
    ofGaps: 'من الفجوات يمكن سدها من المكتبة',
    recommended: 'الحقائب المقترحة',
    closes: 'تُغلق',
    competency: 'كفاءة',
    noGaps: 'لا توجد فجوات مسجّلة لهذه الحالة بعد. يُحسب المحرك بعد تسجيل تحليل الفجوات.',
    uncovered: 'فجوات لا تغطيها أي حقيبة',
    uncoveredHint: 'الكفاءة معروفة لكن لا توجد حقيبة تُعلّمها. تحتاج المكتبة إلى حقيبة جديدة.',
    unresolvable: 'فجوات غير قابلة للمطابقة',
    unresolvableHint: 'كفاءة المعيار غير مربوطة بالقاموس المركزي، فلا يمكن مطابقتها بأي حقيبة. المطلوب ربطها.',
    readiness: 'لماذا قد تكون الخطة قصيرة',
    declaring: 'حقيبة تُعلن كفاءاتها',
    declaringNone: 'حقيبة لا تُعلن أي كفاءة — غير مرئية للمحرك',
    mapped: 'كفاءة معيار مربوطة بالقاموس',
    draftWarning: 'مسودة — غير متاحة للتسجيل بعد',
    computedNote: 'هذه خطة محسوبة ولم تُحفظ. الاعتماد يبقى قرار المقيّم عبر المسار المحكوم.',
  },
  en: {
    title: 'Gap Closure Engine',
    subtitle: 'The packages that close the gaps this assessment found. The count follows the gaps, never the target level.',
    load: 'Compute the gap closure plan',
    loading: 'Computing…',
    progress: 'Progress toward the target level',
    ofGaps: 'of the gaps can be closed from the library',
    recommended: 'Recommended packages',
    closes: 'closes',
    competency: 'competency',
    noGaps: 'No gaps recorded for this case yet. The engine computes once a gap analysis exists.',
    uncovered: 'Gaps no package covers',
    uncoveredHint: 'The competency is known, but nothing in the library teaches it. The catalogue needs a package.',
    unresolvable: 'Gaps that cannot be matched',
    unresolvableHint: 'The standard competency is not mapped to the central dictionary, so it cannot be matched to any package. The mapping needs doing.',
    readiness: 'Why the plan may be short',
    declaring: 'packages declare their competencies',
    declaringNone: 'packages declare none — invisible to the engine',
    mapped: 'standard competencies mapped to the dictionary',
    draftWarning: 'draft — not yet enrollable',
    computedNote: 'This is a computed plan and has not been saved. Approval remains the assessor’s decision through the governed route.',
  },
  nl: {
    title: 'Gap Closure Engine',
    subtitle: 'De pakketten die de gevonden hiaten sluiten. Het aantal volgt de hiaten, nooit het doelniveau.',
    load: 'Bereken het plan',
    loading: 'Berekenen…',
    progress: 'Voortgang naar het doelniveau',
    ofGaps: 'van de hiaten kan de bibliotheek sluiten',
    recommended: 'Aanbevolen pakketten',
    closes: 'sluit',
    competency: 'competentie',
    noGaps: 'Nog geen hiaten vastgelegd voor deze zaak.',
    uncovered: 'Hiaten die geen pakket dekt',
    uncoveredHint: 'De competentie is bekend, maar niets in de bibliotheek onderwijst haar.',
    unresolvable: 'Hiaten die niet te matchen zijn',
    unresolvableHint: 'De standaardcompetentie is niet gekoppeld aan het centrale woordenboek.',
    readiness: 'Waarom het plan kort kan zijn',
    declaring: 'pakketten verklaren hun competenties',
    declaringNone: 'pakketten verklaren er geen — onzichtbaar voor de engine',
    mapped: 'standaardcompetenties gekoppeld aan het woordenboek',
    draftWarning: 'concept — nog niet inschrijfbaar',
    computedNote: 'Dit is een berekend plan en is niet opgeslagen.',
  },
}

export default function GapClosurePanel({ applicationPublicId, language }) {
  const copy = COPY[language] || COPY.en

  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!applicationPublicId) return
    setLoading(true)
    setError('')
    try {
      const payload = await fetchGapClosurePlan(applicationPublicId)
      setPlan(payload?.data || null)
    } catch (loadError) {
      setError(readApiError(loadError))
      setPlan(null)
    } finally {
      setLoading(false)
    }
  }, [applicationPublicId])

  useEffect(() => {
    load()
  }, [load])

  if (!applicationPublicId) return null

  const readiness = plan?.catalogue_readiness
  const percentage = plan?.progress?.percentage ?? 0

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" aria-hidden="true" /> {copy.title}
          </CardTitle>
          {plan?.target_level?.code ? (
            <Badge variant="neutral">{plan.target_level.code}</Badge>
          ) : null}
        </div>
        <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">{copy.subtitle}</p>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.loading}
          </p>
        ) : null}

        {error ? (
          <div className="space-y-3">
            <p className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
            <Button variant="outline" onClick={load}>{copy.load}</Button>
          </div>
        ) : null}

        {plan && !loading ? (
          <>
            {plan.gap_count === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">{copy.noGaps}</p>
            ) : (
              <>
                {/* Progress is closable-by-catalogue over total gaps — NOT a
                    claim that the candidate has completed anything. */}
                <section aria-label={copy.progress} className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold">{copy.progress}</h3>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {plan.progress.closable_by_catalogue}/{plan.progress.total_gaps} {copy.ofGaps}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                    <div
                      className={`h-full rounded-full ${percentage === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </section>

                {plan.recommended_packages.length > 0 ? (
                  <section aria-label={copy.recommended} className="space-y-3">
                    <h3 className="font-semibold">
                      {copy.recommended} ({plan.recommended_packages.length})
                    </h3>
                    {plan.recommended_packages.map((pkg) => (
                      <div
                        key={pkg.program_id}
                        className="rounded-xl border border-[var(--color-border)] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{localize(pkg.title, language)}</p>
                            <p className="mt-1 font-mono text-xs text-[var(--color-text-muted)]">
                              <bdi>{pkg.official_code}</bdi>
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="success">
                              <Layers3 className="h-4 w-4" aria-hidden="true" />
                              {copy.closes} {pkg.closes_count} {copy.competency}
                            </Badge>
                            {/* An unpublished package cannot be enrolled in. Saying
                                so here avoids recommending something unreachable. */}
                            {pkg.content_status !== 'published' ? (
                              <Badge variant="warning">{copy.draftWarning}</Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </section>
                ) : null}

                <GapList
                  title={copy.uncovered}
                  hint={copy.uncoveredHint}
                  gaps={plan.uncovered_gaps}
                  language={language}
                />
                <GapList
                  title={copy.unresolvable}
                  hint={copy.unresolvableHint}
                  gaps={plan.unresolvable_gaps}
                  language={language}
                />
              </>
            )}

            {/* Why a plan is short is nearly always here, not in the candidate. */}
            {readiness ? (
              <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted,transparent)] p-4 text-sm">
                <h3 className="font-semibold">{copy.readiness}</h3>
                <ul className="mt-2 space-y-1 text-[var(--color-text-muted)]">
                  <li>{readiness.declaring_competencies} / {readiness.gap_programmes} {copy.declaring}</li>
                  <li className={readiness.declaring_none > 0 ? 'text-amber-700' : ''}>
                    {readiness.declaring_none} {copy.declaringNone}
                  </li>
                  <li className={readiness.standard_competencies_mapped < readiness.standard_competencies ? 'text-amber-700' : ''}>
                    {readiness.standard_competencies_mapped} / {readiness.standard_competencies} {copy.mapped}
                  </li>
                </ul>
              </section>
            ) : null}

            <p className="text-xs text-[var(--color-text-muted)]">{copy.computedNote}</p>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function GapList({ title, hint, gaps, language }) {
  if (!gaps || gaps.length === 0) return null

  return (
    <section aria-label={title} className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-amber-900">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {title} ({gaps.length})
      </h3>
      <p className="text-xs text-amber-800">{hint}</p>
      <ul className="space-y-1 text-sm">
        {gaps.map((gap) => (
          <li key={gap.gap_item_id} className="flex flex-wrap gap-2">
            <span className="font-mono text-xs"><bdi>{gap.code || '—'}</bdi></span>
            <span>{localize(gap.name, language) || gap.description}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
