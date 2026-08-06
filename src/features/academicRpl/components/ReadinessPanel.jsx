import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Ban, GraduationCap, Loader2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '../../../components/ui'
import { fetchAcademicReadiness } from '../services/academicRplService'
import { readApiError } from '../../../services/apiResponse'
import { localize } from '../../rpl/domain/rpl'

/*
 * READINESS — the owner's stages 6 and 7.
 *
 * All three tracks are always shown, because the whole point of the design is
 * to say "not the doctorate, but you are ready for the master" rather than
 * simply refusing. Hiding the tracks somebody is not ready for would turn a
 * useful answer back into a rejection.
 *
 * THE BREAKDOWN IS NOT DECORATION. This percentage decides whether somebody may
 * pursue a professional doctorate, so the screen has to show what produced it:
 * the four components, the weights actually applied, and the policy version. An
 * assessor who cannot see why it says 82% cannot defend it to an accreditor,
 * and cannot tell a real result from a broken one.
 *
 * Two states are called out because they look like a low score but are not:
 *   - framework not approved: nothing governed to measure against yet
 *   - blocked: a critical competency is unmet, so "ready" is unreachable
 *     whatever the arithmetic says
 */

const COPY = {
  ar: {
    title: 'الجاهزية للمسارات الأكاديمية المهنية',
    subtitle: 'تُحسب النسبة في المنصة من أوزان محكومة. هي قياس، وليست قرار قبول.',
    load: 'احسب الجاهزية',
    loading: 'جارٍ الحساب…',
    recommended: 'المسار الموصى به',
    noneReady: 'لا يوجد مسار جاهز بعد. المطلوب خطة سد فجوات، وليس رفضًا.',
    policy: 'سياسة القبول',
    version: 'الإصدار',
    components: 'مكوّنات الدرجة',
    weightApplied: 'الوزن المطبَّق',
    notAvailable: 'غير متاح',
    blocked: 'كفاءة حرجة غير مستوفاة',
    blockedHint: 'لا يمكن بلوغ حالة «جاهز» مهما بلغ المجموع، حتى تُستوفى هذه الكفاءات.',
    frameworkMissing: 'لم يُعتمد إطار الكفاءات الأكاديمية بعد، فلا يوجد ما يُقاس عليه.',
    frameworkAction: 'اعتمد الإطار أولًا من شاشة إطار الكفاءات.',
    bands: { ready: 'جاهز', conditional: 'جاهز بشروط', not_recommended: 'غير موصى به حاليًا' },
    componentNames: {
      qualifications: 'المؤهلات الأكاديمية',
      experience_evidence: 'الخبرة والأدلة',
      diagnostic: 'الاختبار التشخيصي',
      interview: 'المقابلة / التقييم النهائي',
    },
    reasons: {
      no_usable_evidence: 'لا توجد أدلة صالحة للاحتساب',
      framework_not_approved: 'إطار الكفاءات غير معتمد',
      no_answered_diagnostic: 'لم يُجب أي اختبار تشخيصي بعد',
      diagnostic_has_no_answers: 'الاختبار لم تُسجَّل له إجابات',
      interview_not_recorded: 'لم تُسجَّل مقابلة',
    },
    renormalised: 'أُعيد توزيع وزن المكوّنات غير المتاحة على المتاح، ولم تُحتسب صفرًا.',
  },
  en: {
    title: 'Readiness across the professional academic tracks',
    subtitle: 'The percentage is computed by the platform from governed weights. It is a measurement, not an admission decision.',
    load: 'Compute readiness',
    loading: 'Computing…',
    recommended: 'Recommended track',
    noneReady: 'No track is ready yet. That calls for a gap plan, not a refusal.',
    policy: 'Admission policy',
    version: 'version',
    components: 'Score components',
    weightApplied: 'weight applied',
    notAvailable: 'Not available',
    blocked: 'Critical competency unmet',
    blockedHint: 'The ready band is unreachable whatever the total, until these competencies are met.',
    frameworkMissing: 'The academic competency framework has not been approved, so there is nothing to measure against.',
    frameworkAction: 'Approve the framework first, on the competency framework screen.',
    bands: { ready: 'Ready', conditional: 'Conditionally ready', not_recommended: 'Not recommended yet' },
    componentNames: {
      qualifications: 'Academic qualifications',
      experience_evidence: 'Experience and evidence',
      diagnostic: 'Diagnostic assessment',
      interview: 'Interview / final review',
    },
    reasons: {
      no_usable_evidence: 'No evidence eligible for scoring',
      framework_not_approved: 'Competency framework not approved',
      no_answered_diagnostic: 'No diagnostic has been answered',
      diagnostic_has_no_answers: 'The diagnostic has no recorded answers',
      interview_not_recorded: 'No interview recorded',
    },
    renormalised: 'Unavailable components had their weight redistributed rather than scored zero.',
  },
  nl: {
    title: 'Gereedheid voor de professionele academische trajecten',
    subtitle: 'Het percentage wordt door het platform berekend uit beheerde wegingen. Een meting, geen toelatingsbesluit.',
    load: 'Bereken gereedheid',
    loading: 'Berekenen…',
    recommended: 'Aanbevolen traject',
    noneReady: 'Nog geen traject gereed. Dat vraagt om een hiatenplan, geen afwijzing.',
    policy: 'Toelatingsbeleid',
    version: 'versie',
    components: 'Scorecomponenten',
    weightApplied: 'toegepaste weging',
    notAvailable: 'Niet beschikbaar',
    blocked: 'Kritieke competentie niet aangetoond',
    blockedHint: 'De status gereed is onbereikbaar, ongeacht het totaal, tot deze competenties zijn aangetoond.',
    frameworkMissing: 'Het academische competentiekader is nog niet goedgekeurd.',
    frameworkAction: 'Keur eerst het kader goed op het competentiekaderscherm.',
    bands: { ready: 'Gereed', conditional: 'Voorwaardelijk gereed', not_recommended: 'Nog niet aanbevolen' },
    componentNames: {
      qualifications: 'Academische kwalificaties',
      experience_evidence: 'Ervaring en bewijs',
      diagnostic: 'Diagnostische toets',
      interview: 'Interview / eindbeoordeling',
    },
    reasons: {
      no_usable_evidence: 'Geen bruikbaar bewijs',
      framework_not_approved: 'Competentiekader niet goedgekeurd',
      no_answered_diagnostic: 'Nog geen toets beantwoord',
      diagnostic_has_no_answers: 'De toets heeft geen antwoorden',
      interview_not_recorded: 'Geen interview vastgelegd',
    },
    renormalised: 'Ontbrekende componenten zijn herverdeeld in plaats van op nul gezet.',
  },
}

const BAND_VARIANT = { ready: 'success', conditional: 'warning', not_recommended: 'neutral' }

export default function ReadinessPanel({ applicationPublicId, language = 'en' }) {
  const copy = COPY[language] || COPY.en

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!applicationPublicId) return
    setLoading(true)
    setError('')
    try {
      const payload = await fetchAcademicReadiness(applicationPublicId)
      setResult(payload?.data || null)
    } catch (loadError) {
      setError(readApiError(loadError))
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [applicationPublicId])

  useEffect(() => {
    load()
  }, [load])

  if (!applicationPublicId) return null

  const tracks = result?.tracks || []
  const frameworkReady = tracks.some((track) => track.framework_ready)

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" aria-hidden="true" /> {copy.title}
          </CardTitle>
          {result?.policy ? (
            <Badge variant="neutral">
              {copy.policy} {copy.version} {result.policy.version}
            </Badge>
          ) : null}
        </div>
        <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">{copy.subtitle}</p>
      </CardHeader>

      <CardContent className="space-y-5 p-6">
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

        {result && !loading ? (
          <>
            {/* Called out before the numbers: a 0% that means "nothing approved
                to measure against" reads completely differently from a real 0%. */}
            {!frameworkReady ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {copy.frameworkMissing}
                </p>
                <p className="mt-1">{copy.frameworkAction}</p>
              </div>
            ) : null}

            <div className="rounded-xl border border-[var(--color-border)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                {copy.recommended}
              </p>
              <p className="mt-1 font-bold">
                {result.recommended_track_code
                  ? localize(tracks.find((t) => t.track_code === result.recommended_track_code)?.track_name, language)
                  : copy.noneReady}
              </p>
            </div>

            <div className="space-y-4">
              {tracks.map((track) => (
                <TrackRow key={track.track_code} track={track} copy={copy} language={language} />
              ))}
            </div>

            <p className="text-xs text-[var(--color-text-muted)]">{copy.renormalised}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{result.note}</p>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function TrackRow({ track, copy, language }) {
  const blocked = (track.blocking_competency_codes || []).length > 0

  return (
    <section
      aria-label={localize(track.track_name, language)}
      className="space-y-3 rounded-xl border border-[var(--color-border)] p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{localize(track.track_name, language)}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold tabular-nums">{track.readiness_percentage}%</span>
          <Badge variant={BAND_VARIANT[track.band] || 'neutral'}>
            {copy.bands[track.band] || track.band}
          </Badge>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
        <div
          className={`h-full rounded-full ${
            track.band === 'ready' ? 'bg-emerald-500' : track.band === 'conditional' ? 'bg-amber-500' : 'bg-slate-400'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, track.readiness_percentage))}%` }}
        />
      </div>

      {/* A veto, not a low score. Shown as its own block so it cannot be read
          as "nearly there". */}
      {blocked ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="flex items-center gap-2 font-semibold">
            <Ban className="h-4 w-4" aria-hidden="true" /> {copy.blocked}
          </p>
          <p className="mt-1 font-mono text-xs">
            <bdi>{track.blocking_competency_codes.join(', ')}</bdi>
          </p>
          <p className="mt-1 text-xs">{copy.blockedHint}</p>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">{copy.components}</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {Object.entries(track.components || {}).map(([name, component]) => (
            <li
              key={name}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-sm"
            >
              <span>{copy.componentNames[name] || name}</span>
              {component.available && component.score !== null ? (
                <span className="text-xs">
                  <strong className="tabular-nums">{component.score}%</strong>
                  {track.weights_applied?.[name] ? (
                    <span className="text-[var(--color-text-muted)]">
                      {' '}· {track.weights_applied[name]}% {copy.weightApplied}
                    </span>
                  ) : null}
                </span>
              ) : (
                // Why it is missing, not just that it is. "No interview
                // recorded" and "no evidence" need different work.
                <span className="text-xs text-[var(--color-text-muted)]">
                  {copy.reasons[component.basis?.reason] || copy.notAvailable}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
