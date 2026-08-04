import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '../../../components/ui'
import {
  approveAssessmentBlueprint,
  approveLearningTime,
  proposeAssessmentBlueprint,
  proposeLearningTime,
} from '../services/programsService'
import { readApiError, readLocalized } from '../../../services/apiResponse'

/*
 * THE LAST TWO GATES BEFORE PUBLICATION.
 *
 * publish-package refuses without an APPROVED learning-time allocation and an
 * APPROVED assessment blueprint. Both had working write endpoints since B2/B3
 * and NO screen, so no governed package could ever be published from the CMS —
 * which is why a hundred programmes sat at "ready" and none went live.
 *
 * Two rules the server enforces exactly, surfaced here so they are visible
 * before you are refused by them:
 *
 *   - learning time must total accredited_hours * 60 EXACTLY. The server calls
 *     it "defensible, not approximate".
 *   - outcome coverage counts must sum to total_questions EXACTLY.
 *
 * Nothing here proposes values on your behalf. The numbers are academic
 * judgements about what learners actually do and how the outcomes are weighed;
 * an AI-suggested default would look like a decision that nobody made.
 */

const COPY = {
  ar: {
    title: 'بوابتا النشر',
    hint: 'يرفض «نشر الحزمة» بدون توزيع زمن تعلّم معتمد ومخطط تقييم معتمد. القيم قرار أكاديمي — لا تُقترح تلقائيًا.',
    ltTitle: 'توزيع زمن التعلّم',
    ltHint: 'بالدقائق. يجب أن يساوي المجموع الساعات المعتمدة بالضبط.',
    ltTotal: 'المجموع',
    ltRequired: 'المطلوب',
    ltNoHours: 'لا توجد ساعات معتمدة لهذا البرنامج، فلا يمكن التحقق من المجموع.',
    bpTitle: 'مخطط التقييم',
    bpHint: 'إجمالي الأسئلة وتوزيعها على مخرجات التعلّم. يجب أن يساوي مجموع التوزيع الإجمالي بالضبط.',
    bpTotal: 'إجمالي أسئلة الاختبار',
    bpSum: 'مجموع التغطية',
    bpNoOutcomes: 'لا توجد مخرجات تعلّم فعّالة. أنشئ حزمة الانطلاق أولًا.',
    available: 'متاح',
    overAvailable: 'التغطية تتجاوز الأسئلة المعتمدة المتاحة — سيُعتمد المخطط لكنه لن يستطيع بناء اختبار.',
    save: 'حفظ المقترح',
    approve: 'اعتماد',
    approved: 'معتمد',
    proposed: 'مقترح — بانتظار الاعتماد',
    none: 'غير مُدخل',
    saving: 'جارٍ الحفظ…',
    mustMatch: 'المجموع لا يطابق المطلوب — سيُرفض الاعتماد.',
    questions: 'سؤال',
  },
  en: {
    title: 'The two publication gates',
    hint: 'Publish package refuses without an approved learning-time allocation and an approved assessment blueprint. The values are academic judgements — nothing is suggested for you.',
    ltTitle: 'Learning-time allocation',
    ltHint: 'In minutes. The total must equal the accredited hours exactly.',
    ltTotal: 'Total',
    ltRequired: 'Required',
    ltNoHours: 'This programme has no accredited hours, so the total cannot be checked.',
    bpTitle: 'Assessment blueprint',
    bpHint: 'Total questions and how they are spread across learning outcomes. Coverage must sum to the total exactly.',
    bpTotal: 'Total exam questions',
    bpSum: 'Coverage sum',
    bpNoOutcomes: 'No active learning outcomes. Approve the seed pack first.',
    available: 'available',
    overAvailable: 'Coverage exceeds the approved questions available — the blueprint would approve but could not build an exam.',
    save: 'Save proposal',
    approve: 'Approve',
    approved: 'Approved',
    proposed: 'Proposed — awaiting approval',
    none: 'Not entered',
    saving: 'Saving…',
    mustMatch: 'The total does not match — approval will be refused.',
    questions: 'questions',
  },
  nl: {
    title: 'De twee publicatiepoorten',
    hint: 'Pakket publiceren weigert zonder goedgekeurde leertijdverdeling en goedgekeurde toetsmatrijs. De waarden zijn academische oordelen — er wordt niets voorgesteld.',
    ltTitle: 'Leertijdverdeling',
    ltHint: 'In minuten. Het totaal moet exact gelijk zijn aan de geaccrediteerde uren.',
    ltTotal: 'Totaal',
    ltRequired: 'Vereist',
    ltNoHours: 'Dit programma heeft geen geaccrediteerde uren, dus het totaal kan niet worden gecontroleerd.',
    bpTitle: 'Toetsmatrijs',
    bpHint: 'Totaal aantal vragen en de verdeling over leeruitkomsten. De dekking moet exact optellen tot het totaal.',
    bpTotal: 'Totaal aantal examenvragen',
    bpSum: 'Som van de dekking',
    bpNoOutcomes: 'Geen actieve leeruitkomsten. Keur eerst het startpakket goed.',
    available: 'beschikbaar',
    overAvailable: 'De dekking overschrijdt het aantal goedgekeurde vragen — de matrijs wordt goedgekeurd maar kan geen examen samenstellen.',
    save: 'Voorstel opslaan',
    approve: 'Goedkeuren',
    approved: 'Goedgekeurd',
    proposed: 'Voorgesteld — wacht op goedkeuring',
    none: 'Niet ingevuld',
    saving: 'Opslaan…',
    mustMatch: 'Het totaal komt niet overeen — goedkeuring wordt geweigerd.',
    questions: 'vragen',
  },
}

const CATEGORY_LABELS = {
  ar: {
    instruction: 'الشرح',
    guided_examples: 'أمثلة موجّهة',
    activities: 'الأنشطة',
    case_work: 'دراسات الحالة',
    practice: 'التطبيق',
    formative_assessment: 'تقييم تكويني',
    summative_assessment: 'تقييم نهائي',
  },
  en: {
    instruction: 'Instruction',
    guided_examples: 'Guided examples',
    activities: 'Activities',
    case_work: 'Case work',
    practice: 'Practice',
    formative_assessment: 'Formative assessment',
    summative_assessment: 'Summative assessment',
  },
  nl: {
    instruction: 'Instructie',
    guided_examples: 'Begeleide voorbeelden',
    activities: 'Activiteiten',
    case_work: 'Casuswerk',
    practice: 'Oefening',
    formative_assessment: 'Formatieve toetsing',
    summative_assessment: 'Summatieve toetsing',
  },
}

export default function PublicationGatesPanel({ programId, gates, language, onChanged }) {
  const copy = COPY[language] || COPY.en
  const labels = CATEGORY_LABELS[language] || CATEGORY_LABELS.en

  const [minutes, setMinutes] = useState({})
  const [totalQuestions, setTotalQuestions] = useState('')
  const [coverage, setCoverage] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const learningTime = gates?.learning_time
  const blueprint = gates?.blueprint
  const outcomes = useMemo(() => gates?.outcomes || [], [gates])

  /*
   * Seed the forms from the server's current state. Existing values are what a
   * reviewer edits; a blank form would silently discard a proposal already made.
   */
  useEffect(() => {
    const existing = learningTime?.allocation || {}
    setMinutes(
      Object.fromEntries(
        (learningTime?.categories || []).map((c) => [c, existing[c] != null ? String(existing[c]) : '']),
      ),
    )
  }, [learningTime])

  useEffect(() => {
    setTotalQuestions(blueprint?.total_questions != null ? String(blueprint.total_questions) : '')
    setCoverage(
      Object.fromEntries(
        (blueprint?.outcome_coverage || []).map((row) => [row.outcome_code, String(row.count)]),
      ),
    )
  }, [blueprint])

  if (!gates) return null

  const num = (v) => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }
  const minutesTotal = Object.values(minutes).reduce((sum, v) => sum + num(v), 0)
  const requiredMinutes = learningTime?.required_minutes ?? null
  const minutesMatch = requiredMinutes == null || minutesTotal === requiredMinutes

  const coverageSum = outcomes.reduce((sum, o) => sum + num(coverage[o.code]), 0)
  const questionsMatch = coverageSum === num(totalQuestions) && num(totalQuestions) > 0
  /*
   * approve() checks only that the counts sum to the total. It never asks
   * whether the bank can supply them, so an over-subscribed outcome approves
   * cleanly and fails later when an exam is built. Warned here because that is
   * the only place it is still cheap to fix.
   */
  const overSubscribed = outcomes.filter(
    (o) => o.available != null && num(coverage[o.code]) > o.available,
  )

  const ltApproved = learningTime?.status === 'approved'
  const bpApproved = blueprint?.status === 'approved'

  async function run(key, action, successNote) {
    setBusy(key)
    setError('')
    setMessage('')
    try {
      await action()
      setMessage(successNote)
      await onChanged?.()
    } catch (actionError) {
      setError(readApiError(actionError))
    } finally {
      setBusy('')
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{copy.title}</CardTitle>
          <div className="flex gap-2">
            <GateBadge ok={ltApproved} label={copy.ltTitle} copy={copy} />
            <GateBadge ok={bpApproved} label={copy.bpTitle} copy={copy} />
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">{copy.hint}</p>
      </CardHeader>

      <CardContent className="space-y-8 p-6">
        {error ? (
          <p className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </p>
        ) : null}

        {/* Named regions: two independent forms in one card. Without an
            accessible name a screen reader — and anyone tabbing through —
            meets fourteen number boxes with no way to tell which gate they
            belong to. */}
        <section className="space-y-3" aria-label={copy.ltTitle}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">{copy.ltTitle}</h3>
            <span className="text-xs text-[var(--color-text-muted)]">{copy.ltHint}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(learningTime?.categories || []).map((category) => (
              <Input
                key={category}
                type="number"
                min="0"
                label={labels[category] || category}
                value={minutes[category] ?? ''}
                disabled={ltApproved}
                onChange={(e) => setMinutes((current) => ({ ...current, [category]: e.target.value }))}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant={minutesMatch ? 'success' : 'warning'}>
              {copy.ltTotal}: {minutesTotal}
            </Badge>
            {requiredMinutes != null ? (
              <Badge variant="neutral">
                {copy.ltRequired}: {requiredMinutes} ({learningTime.accredited_hours}h)
              </Badge>
            ) : (
              <span className="text-[var(--color-text-muted)]">{copy.ltNoHours}</span>
            )}
            {!minutesMatch ? <span className="text-amber-700">{copy.mustMatch}</span> : null}
          </div>

          {!ltApproved ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={busy !== ''}
                onClick={() =>
                  run(
                    'lt-save',
                    () =>
                      proposeLearningTime(
                        programId,
                        Object.fromEntries(Object.entries(minutes).map(([k, v]) => [k, num(v)])),
                      ),
                    copy.proposed,
                  )
                }
              >
                {busy === 'lt-save' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy === 'lt-save' ? copy.saving : copy.save}
              </Button>
              <Button
                disabled={busy !== '' || learningTime?.status !== 'proposed'}
                onClick={() => run('lt-approve', () => approveLearningTime(programId), copy.approved)}
              >
                {copy.approve}
              </Button>
            </div>
          ) : null}
        </section>

        <section className="space-y-3 border-t border-[var(--color-border)] pt-6" aria-label={copy.bpTitle}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">{copy.bpTitle}</h3>
            <span className="text-xs text-[var(--color-text-muted)]">{copy.bpHint}</span>
          </div>

          {outcomes.length === 0 ? (
            <p className="text-sm text-amber-700">{copy.bpNoOutcomes}</p>
          ) : (
            <>
              <div className="max-w-xs">
                <Input
                  type="number"
                  min="1"
                  label={copy.bpTotal}
                  value={totalQuestions}
                  disabled={bpApproved}
                  onChange={(e) => setTotalQuestions(e.target.value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {outcomes.map((outcome) => (
                  <Input
                    key={outcome.code}
                    type="number"
                    min="0"
                    label={`${outcome.code} — ${readLocalized(outcome.title, language)}${
                      outcome.available != null ? ` (${outcome.available} ${copy.available})` : ''
                    }`}
                    value={coverage[outcome.code] ?? ''}
                    disabled={bpApproved}
                    onChange={(e) =>
                      setCoverage((current) => ({ ...current, [outcome.code]: e.target.value }))
                    }
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge variant={questionsMatch ? 'success' : 'warning'}>
                  {copy.bpSum}: {coverageSum}
                </Badge>
                <Badge variant="neutral">
                  {copy.bpTotal}: {num(totalQuestions)} {copy.questions}
                </Badge>
                {!questionsMatch ? <span className="text-amber-700">{copy.mustMatch}</span> : null}
              </div>

              {overSubscribed.length > 0 ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {copy.overAvailable}
                  {' '}
                  {overSubscribed.map((o) => `${o.code} (${o.available})`).join(', ')}
                </p>
              ) : null}

              {!bpApproved ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={busy !== ''}
                    onClick={() =>
                      run(
                        'bp-save',
                        () =>
                          proposeAssessmentBlueprint(programId, {
                            total_questions: num(totalQuestions),
                            // Outcomes with no count are omitted: the server
                            // requires min:1 per row, so sending a zero would be
                            // refused for a row the reviewer simply left blank.
                            outcome_coverage: outcomes
                              .filter((o) => num(coverage[o.code]) > 0)
                              .map((o) => ({ outcome_code: o.code, count: num(coverage[o.code]) })),
                          }),
                        copy.proposed,
                      )
                    }
                  >
                    {busy === 'bp-save' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {busy === 'bp-save' ? copy.saving : copy.save}
                  </Button>
                  <Button
                    disabled={busy !== '' || !blueprint}
                    onClick={() =>
                      run('bp-approve', () => approveAssessmentBlueprint(programId), copy.approved)
                    }
                  >
                    {copy.approve}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </CardContent>
    </Card>
  )
}

function GateBadge({ ok, label, copy }) {
  return (
    <Badge variant={ok ? 'success' : 'warning'}>
      {ok ? <CheckCircle2 size={14} /> : <Circle size={14} />} {label}: {ok ? copy.approved : copy.none}
    </Badge>
  )
}
