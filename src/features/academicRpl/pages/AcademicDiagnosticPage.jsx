import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Check, CircleSlash, Loader2, Lock, PencilLine, Send, X,
} from 'lucide-react'
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea,
} from '../../../components/ui'
import { readApiError } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { localize } from '../../rpl/domain/rpl'
import {
  approveAcademicDiagnosticItem, fetchAcademicDiagnostic, issueAcademicDiagnostic,
  rejectAcademicDiagnosticItem, updateAcademicDiagnosticItem,
} from '../services/academicRplService'

/*
 * THE DIAGNOSTIC REVIEW WORKSPACE — owner spec stage 5.
 *
 * Twenty-five to fifty AI-drafted questions, and a human has to read every one
 * before an applicant sees any of them. This result carries 35% of an admission
 * recommendation, so the screen is built around making a genuine review
 * possible rather than making approval fast.
 *
 * WHAT THAT MEANS IN PRACTICE:
 *  - the answer key and the distractor rationale are shown to the reviewer, in
 *    full. They cannot judge whether an item is fair without seeing which
 *    option is correct and which misconception each wrong one is meant to
 *    reveal. This is the one place that material belongs on screen.
 *  - progress is counted in items REVIEWED, not items remaining, so the gap
 *    between "I have looked at 6" and "there are 44 to go" stays visible
 *  - the issue button explains why it is blocked instead of sitting there grey
 *  - editing an item visibly returns it to pending, because the approval that
 *    was withdrawn belonged to wording that no longer exists
 *  - an issued paper is read-only and says so. It is a record of what somebody
 *    sat, not a draft
 *
 * There is no approve-all, and it is not an oversight.
 */

const COPY = {
  ar: {
    back: 'عودة إلى الحالة',
    title: 'مراجعة الاختبار التشخيصي',
    subtitle: 'كل سؤال يحتاج قراءة بشرية قبل الإصدار. هذه النتيجة تُشكّل 35% من توصية القبول.',
    reviewed: 'تمت مراجعته',
    of: 'من',
    approved: 'معتمد',
    pending: 'بانتظار المراجعة',
    rejected: 'مرفوض',
    aiDraft: 'مسودة آلية',
    edited: 'عُدّل',
    axis: 'المحور',
    difficulty: 'المستوى',
    correct: 'الإجابة الصحيحة',
    key: 'مفتاح التصحيح',
    distractor: 'ما يكشفه الخيار الخاطئ',
    approve: 'اعتماد',
    reject: 'رفض',
    edit: 'تعديل',
    save: 'حفظ التعديل',
    cancel: 'إلغاء',
    rejectReason: 'سبب الرفض',
    rejectPlaceholder: 'لماذا يُستبعد هذا السؤال؟ (10 أحرف على الأقل)',
    issue: 'إصدار الاختبار للمتقدم',
    issuing: 'جارٍ الإصدار…',
    timeLimit: 'المدة بالدقائق (اختياري)',
    dueAt: 'آخر موعد (اختياري)',
    blockedPending: 'لا يمكن الإصدار: ما زال {n} سؤالًا بانتظار المراجعة.',
    blockedTooFew: 'لا يمكن الإصدار: عدد الأسئلة المعتمدة {n}، والحد الأدنى المحكوم 25.',
    issuedLocked: 'صدر الاختبار ولم يعد قابلًا للتعديل. هذا سجل لما سُئل فعلًا.',
    editResetsApproval: 'التعديل يُعيد السؤال إلى «بانتظار المراجعة»؛ الاعتماد كان لصياغة لم تعد موجودة.',
    originalPrompt: 'الصياغة الأصلية من النموذج',
    noItems: 'لا توجد أسئلة في هذه المسودة.',
    blueprint: 'خطة بناء الاختبار',
    domainItems: 'أسئلة في مجال المتقدم',
  },
  en: {
    back: 'Back to the case',
    title: 'Diagnostic review',
    subtitle: 'Every question needs a human read before issue. This result carries 35% of an admission recommendation.',
    reviewed: 'reviewed',
    of: 'of',
    approved: 'Approved',
    pending: 'Pending review',
    rejected: 'Rejected',
    aiDraft: 'AI draft',
    edited: 'Edited',
    axis: 'Axis',
    difficulty: 'Difficulty',
    correct: 'Correct answer',
    key: 'Answer key',
    distractor: 'What the wrong choice reveals',
    approve: 'Approve',
    reject: 'Reject',
    edit: 'Edit',
    save: 'Save edit',
    cancel: 'Cancel',
    rejectReason: 'Reason for rejection',
    rejectPlaceholder: 'Why is this question excluded? (at least 10 characters)',
    issue: 'Issue to the applicant',
    issuing: 'Issuing…',
    timeLimit: 'Time limit in minutes (optional)',
    dueAt: 'Due date (optional)',
    blockedPending: 'Cannot issue: {n} question(s) still await review.',
    blockedTooFew: 'Cannot issue: only {n} approved question(s); the governed minimum is 25.',
    issuedLocked: 'This diagnostic has been issued and can no longer be edited. It is a record of what was asked.',
    editResetsApproval: 'Editing returns the item to pending review; the approval belonged to wording that no longer exists.',
    originalPrompt: 'Original wording from the model',
    noItems: 'This draft has no questions.',
    blueprint: 'Paper blueprint',
    domainItems: 'items in the applicant’s own field',
  },
  nl: {
    back: 'Terug naar het dossier',
    title: 'Toetsbeoordeling',
    subtitle: 'Elke vraag vereist een menselijke lezing vóór uitgifte.',
    reviewed: 'beoordeeld',
    of: 'van',
    approved: 'Goedgekeurd',
    pending: 'Te beoordelen',
    rejected: 'Afgewezen',
    aiDraft: 'AI-concept',
    edited: 'Bewerkt',
    axis: 'As',
    difficulty: 'Niveau',
    correct: 'Juiste antwoord',
    key: 'Antwoordsleutel',
    distractor: 'Wat de foute keuze onthult',
    approve: 'Goedkeuren',
    reject: 'Afwijzen',
    edit: 'Bewerken',
    save: 'Bewerking opslaan',
    cancel: 'Annuleren',
    rejectReason: 'Reden voor afwijzing',
    rejectPlaceholder: 'Waarom wordt deze vraag uitgesloten? (minimaal 10 tekens)',
    issue: 'Uitgeven aan de aanvrager',
    issuing: 'Uitgeven…',
    timeLimit: 'Tijdslimiet in minuten (optioneel)',
    dueAt: 'Uiterste datum (optioneel)',
    blockedPending: 'Kan niet uitgeven: {n} vraag/vragen wachten nog op beoordeling.',
    blockedTooFew: 'Kan niet uitgeven: slechts {n} goedgekeurd; het minimum is 25.',
    issuedLocked: 'Deze toets is uitgegeven en kan niet meer worden bewerkt.',
    editResetsApproval: 'Bewerken zet de vraag terug op te beoordelen.',
    originalPrompt: 'Oorspronkelijke formulering van het model',
    noItems: 'Dit concept heeft geen vragen.',
    blueprint: 'Toetsblauwdruk',
    domainItems: 'vragen in het eigen vakgebied',
  },
}

const MIN_QUESTIONS = 25
const LOCKED_STATUSES = ['issued', 'answered', 'assessed']

function fill(template, values) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template)
}

export default function AcademicDiagnosticPage() {
  const { diagnosticId } = useParams()
  const navigate = useNavigate()
  const language = getAdminLanguage()
  const copy = COPY[language] || COPY.en

  const [state, setState] = useState({ loading: true, error: '', diagnostic: null })
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [issueOptions, setIssueOptions] = useState({ time_limit_minutes: '', due_at: '' })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const payload = await fetchAcademicDiagnostic(diagnosticId)
      setState({ loading: false, error: '', diagnostic: payload?.data || null })
    } catch (error) {
      setState({ loading: false, error: readApiError(error), diagnostic: null })
    }
  }, [diagnosticId])

  useEffect(() => {
    load()
  }, [load])

  const diagnostic = state.diagnostic
  const items = useMemo(() => diagnostic?.items || [], [diagnostic])
  const locked = LOCKED_STATUSES.includes(diagnostic?.status)

  const counts = useMemo(() => ({
    approved: items.filter((item) => item.governance_status === 'approved').length,
    pending: items.filter((item) => item.governance_status === 'pending').length,
    rejected: items.filter((item) => item.governance_status === 'rejected').length,
  }), [items])

  const reviewed = counts.approved + counts.rejected

  // Stated rather than implied by a disabled button: a reviewer who cannot tell
  // why they are stuck will assume the screen is broken.
  const blockedReason = counts.pending > 0
    ? fill(copy.blockedPending, { n: counts.pending })
    : counts.approved < MIN_QUESTIONS
      ? fill(copy.blockedTooFew, { n: counts.approved })
      : ''

  async function run(request) {
    setNotice('')
    try {
      await request()
      await load()
      return true
    } catch (error) {
      setNotice(readApiError(error))
      return false
    }
  }

  async function saveEdit(item) {
    setBusyId(item.id)
    const payload = { prompt: editing.prompt }
    if (editing.correct_option_id) {
      payload.answer_key = { ...(item.answer_key || {}), correct_option_id: editing.correct_option_id }
    }
    const ok = await run(() => updateAcademicDiagnosticItem(item.id, payload))
    if (ok) setEditing(null)
    setBusyId(null)
  }

  if (state.loading) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-[var(--color-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      </p>
    )
  }

  if (state.error || !diagnostic) {
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate(`/academic-rpl/applications/${diagnostic.application?.public_id}`)}
          >
            <ArrowLeft size={16} /> {copy.back}
          </Button>
          <h1 className="mt-2 text-2xl font-bold">{copy.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--color-text-muted)]">{copy.subtitle}</p>
        </div>
        <Badge variant={locked ? 'neutral' : 'warning'}>{diagnostic.status}</Badge>
      </div>

      {notice ? (
        <p className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {notice}
        </p>
      ) : null}

      {locked ? (
        <p className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" /> {copy.issuedLocked}
        </p>
      ) : null}

      {/* Progress counted in items reviewed, so the distance left stays honest. */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">
              {reviewed} {copy.of} {items.length} {copy.reviewed}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="success">{copy.approved}: {counts.approved}</Badge>
              <Badge variant="warning">{copy.pending}: {counts.pending}</Badge>
              <Badge variant="neutral">{copy.rejected}: {counts.rejected}</Badge>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${items.length ? (reviewed / items.length) * 100 : 0}%` }}
            />
          </div>

          {diagnostic.blueprint ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              {copy.blueprint}: {diagnostic.blueprint.domain_items} {copy.domainItems}
              {diagnostic.blueprint.domains?.length ? ` (${diagnostic.blueprint.domains.join(', ')})` : ''}
            </p>
          ) : null}

          {!locked ? (
            <div className="space-y-3 border-t border-[var(--color-border)] pt-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs text-[var(--color-text-muted)]">
                  {copy.timeLimit}
                  <Input
                    type="number"
                    min={15}
                    max={480}
                    value={issueOptions.time_limit_minutes}
                    onChange={(event) =>
                      setIssueOptions((current) => ({ ...current, time_limit_minutes: event.target.value }))
                    }
                  />
                </label>
                <label className="text-xs text-[var(--color-text-muted)]">
                  {copy.dueAt}
                  <Input
                    type="datetime-local"
                    value={issueOptions.due_at}
                    onChange={(event) => setIssueOptions((current) => ({ ...current, due_at: event.target.value }))}
                  />
                </label>
                <Button
                  onClick={() =>
                    run(() =>
                      issueAcademicDiagnostic(diagnostic.id, {
                        ...(issueOptions.time_limit_minutes
                          ? { time_limit_minutes: Number(issueOptions.time_limit_minutes) }
                          : {}),
                        ...(issueOptions.due_at ? { due_at: issueOptions.due_at } : {}),
                      }),
                    )
                  }
                  disabled={Boolean(blockedReason)}
                >
                  <Send size={16} /> {copy.issue}
                </Button>
              </div>
              {blockedReason ? (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{blockedReason}</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{copy.noItems}</p>
      ) : null}

      <div className="space-y-4">
        {items.map((item, index) => {
          const isEditing = editing?.id === item.id
          const correctId = item.answer_key?.correct_option_id
          const rationale = item.answer_key?.distractor_rationale || {}

          return (
            <Card key={item.id}>
              <CardHeader className="border-b border-[var(--color-border)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    <span className="text-[var(--color-text-muted)]">#{index + 1}</span>{' '}
                    {localize(item.competency?.name, language) || item.axis}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">{copy.axis}: {item.axis}</Badge>
                    {item.difficulty ? <Badge variant="neutral">{item.difficulty}</Badge> : null}
                    {item.is_ai_generated ? <Badge variant="warning">{copy.aiDraft}</Badge> : null}
                    {item.edited_at ? <Badge variant="neutral">{copy.edited}</Badge> : null}
                    <Badge
                      variant={
                        item.governance_status === 'approved'
                          ? 'success'
                          : item.governance_status === 'rejected'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {copy[item.governance_status] || item.governance_status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-6">
                {isEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      rows={3}
                      value={editing.prompt?.[language] || editing.prompt?.en || ''}
                      onChange={(event) =>
                        setEditing((current) => ({
                          ...current,
                          prompt: { ...current.prompt, [language]: event.target.value },
                        }))
                      }
                    />
                    <label className="block text-xs text-[var(--color-text-muted)]">
                      {copy.correct}
                      <Input
                        value={editing.correct_option_id ?? correctId ?? ''}
                        maxLength={2}
                        onChange={(event) =>
                          setEditing((current) => ({
                            ...current,
                            correct_option_id: event.target.value.toUpperCase(),
                          }))
                        }
                      />
                    </label>
                    <p className="text-xs text-amber-800">{copy.editResetsApproval}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => saveEdit(item)} disabled={busyId === item.id}>
                        {copy.save}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        {copy.cancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium leading-6">{localize(item.prompt, language)}</p>

                    <ul className="space-y-2">
                      {(item.options || []).map((option) => {
                        const isCorrect = option.id === correctId
                        return (
                          <li
                            key={option.id}
                            className={`rounded-lg border p-3 text-sm ${
                              isCorrect
                                ? 'border-emerald-300 bg-emerald-50'
                                : 'border-[var(--color-border)]'
                            }`}
                          >
                            <div className="flex flex-wrap items-start gap-2">
                              <span className="font-mono font-bold"><bdi>{option.id}</bdi></span>
                              <span className="flex-1">{localize(option.text, language)}</span>
                              {/* The reviewer needs the key. They cannot judge
                                  fairness without knowing which is correct. */}
                              {isCorrect ? (
                                <Badge variant="success">{copy.key}</Badge>
                              ) : null}
                            </div>
                            {/* The diagnostic value of a wrong answer: what
                                misconception choosing it would reveal. */}
                            {!isCorrect && rationale[option.id] ? (
                              <p className="mt-1 ps-6 text-xs text-[var(--color-text-muted)]">
                                {copy.distractor}: {rationale[option.id]}
                              </p>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>

                    {item.assessor_note ? (
                      <p className="rounded-lg bg-[var(--color-surface-muted)] p-3 text-xs">{item.assessor_note}</p>
                    ) : null}

                    {/* Shown only once edited, so the difference between the
                        model's wording and the assessor's is visible. */}
                    {item.edited_at && item.ai_original_prompt ? (
                      <details className="text-xs text-[var(--color-text-muted)]">
                        <summary className="cursor-pointer">{copy.originalPrompt}</summary>
                        <p className="mt-1">{localize(item.ai_original_prompt, language)}</p>
                      </details>
                    ) : null}

                    {!locked ? (
                      <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
                        <Button
                          size="sm"
                          onClick={() => run(() => approveAcademicDiagnosticItem(item.id))}
                          disabled={item.governance_status === 'approved'}
                        >
                          <Check size={16} /> {copy.approve}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing({ id: item.id, prompt: item.prompt || {} })}
                        >
                          <PencilLine size={16} /> {copy.edit}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRejecting(item.id)
                            setRejectReason('')
                          }}
                          disabled={item.governance_status === 'rejected'}
                        >
                          <CircleSlash size={16} /> {copy.reject}
                        </Button>
                      </div>
                    ) : null}

                    {rejecting === item.id ? (
                      <div className="space-y-2 rounded-xl border border-[var(--color-border)] p-3">
                        <label className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                          {copy.rejectReason}
                        </label>
                        <Textarea
                          rows={2}
                          value={rejectReason}
                          placeholder={copy.rejectPlaceholder}
                          onChange={(event) => setRejectReason(event.target.value)}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={rejectReason.trim().length < 10}
                            onClick={async () => {
                              const ok = await run(() =>
                                rejectAcademicDiagnosticItem(item.id, { reason: rejectReason.trim() }),
                              )
                              if (ok) setRejecting(null)
                            }}
                          >
                            {copy.reject}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>
                            <X size={16} /> {copy.cancel}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
