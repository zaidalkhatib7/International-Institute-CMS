import { useCallback, useMemo, useState } from 'react'
import { Loader2, PenLine, Plus, ShieldCheck, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, Input, Select, Textarea } from '../../../components/ui'
import { approveSeedPack, proposeSeedPack } from '../services/programsService'
import { fetchCompetencyFramework } from '../../competency/services/competencyFrameworkService'
import { getCurrentLanguage } from '../../../utils/localization'
import { readApiError } from '../../../services/apiResponse'
import AiProvenanceNote from '../../shared/ai/AiProvenanceNote'
import AiServiceBanner from '../../shared/ai/AiServiceBanner'
import { aiBusyMessage } from '../../shared/ai/aiState'

/*
 * THE SEED PACK — what a course must have before anything can be generated from it.
 *
 * A programme cannot be AI-authored until it has approved competency mappings and
 * active learning outcomes. Those two are the STANDARD every later artefact is
 * measured against, and hand-authoring them is what stopped every course at the
 * gate. So Gemini drafts them from nothing more than the course name and
 * description, and a person approves them.
 *
 * The separation is the whole point, and this screen exists to make it visible:
 *
 *   Propose   nothing is written. The draft below lives in this browser only.
 *   Edit      every field is yours to change — this is a proposal, not a result.
 *   Approve   the accountable act. Only now does the programme change, and the
 *             audit trail records YOUR name as the approver with Gemini as the
 *             drafter.
 *
 * A refresh before approving loses the draft. That is deliberate: an unapproved
 * draft that persists starts to look like a decision, and this one is not.
 */

const COPY = {
  ar: {
    title: 'حزمة الانطلاق — يقترحها Gemini ويعتمدها إنسان',
    subtitle:
      'اكتب اسم الدورة ووصفها فقط. يقترح Gemini الكفايات المرتبطة من القاموس المعتمد ومخرجات التعلّم، وكل حقل قابل للتعديل قبل الاعتماد.',
    propose: 'اقترح حزمة الانطلاق',
    reproposeLabel: 'اقتراح جديد',
    proposing: 'جارٍ الاقتراح…',
    locale: 'لغة المسودة',
    draftedBy: 'صاغها النموذج',
    nothingWritten: 'مسودة فقط — لم يُكتب أي شيء في البرنامج بعد.',
    competencies: 'ربط الكفايات (من القاموس المعتمد فقط)',
    competenciesHint:
      'لا يُنشئ Gemini كفايات جديدة؛ يربط الدورة بالقاموس المعتمد فقط. إن نقصت كفاية فأضِفها إلى إطار الكفايات أولًا.',
    outcomes: 'مخرجات التعلّم',
    outcomesHint: 'مخرجات قابلة للملاحظة والقياس، وهي المعيار الذي تُقاس عليه الأسئلة والتقييم لاحقًا.',
    competency: 'الكفاية',
    targetLevel: 'المستوى المستهدف',
    entryLevel: 'مستوى الدخول (اختياري)',
    weight: 'الوزن (%)',
    weightHint:
      'الوزن عدد صحيح من 1 إلى 100: نصيب الكفاية من تركيز الدورة مقارنةً بالكفايات الأخرى المرتبطة. لا يلزم أن يبلغ مجموع الأوزان 100.',
    weightInvalid: 'أدخل عددًا صحيحًا من 1 إلى 100.',
    weightsIncomplete: 'لكل كفاية مرتبطة وزن من 1 إلى 100 قبل أن يمكن اعتماد الحزمة.',
    primary: 'أساسية',
    rationale: 'مبرر الربط (من Gemini)',
    code: 'الرمز',
    outcomeTitle: 'المخرج',
    outcomeDescription: 'التفصيل',
    linkedCompetency: 'الكفاية المرتبطة',
    none: '— بلا —',
    addCompetency: 'إضافة ربط كفاية',
    addOutcome: 'إضافة مخرج تعلّم',
    remove: 'حذف',
    approve: 'اعتماد حزمة الانطلاق',
    approving: 'جارٍ الاعتماد…',
    approveHint: 'الاعتماد يكتب الربط والمخرجات في البرنامج ويُسجَّل باسمك في الأثر التدقيقي.',
    approveConfirm:
      'سيُكتب هذا في البرنامج ويُسجَّل باسمك كمعتمِد. تأكدت من أن كل ربط ومخرج صحيح؟',
    emptyDraft: 'لم يقترح النموذج شيئًا قابلًا للاستخدام. أعد المحاولة أو أضِف الصفوف يدويًا.',
    identity: 'الهوية الأكاديمية المحكومة',
    identityHint: 'الأربعة الأولى يصوغها Gemini من الدورة. المؤشرات والمخرجات مشتقّة من الكفايات ومخرجات التعلّم المعتمدة — لا يخترعها النموذج.',
    knowledge: 'المعرفة',
    skills: 'المهارات',
    professional_behaviours: 'السلوكيات المهنية',
    abilities: 'القدرات',
    performance_indicators: 'مؤشرات الأداء',
    identityOutcomes: 'المخرجات',
    derived: 'مشتقّ',
    saveFirst: 'احفظ البرنامج أولًا ثم عد إلى هنا.',
    writeByHand: 'اكتبها يدويًا',
    writingByHand: 'جارٍ تحميل القاموس…',
    writtenByHand: 'مسودة مكتوبة يدويًا — دون ذكاء اصطناعي',
    writeByHandHint: 'إن كانت خدمة الذكاء الاصطناعي مشغولة أو لا تريد اقتراحها، فاكتب الربط والمخرجات بنفسك في المحرر نفسه، ثم اعتمدها بالطريقة نفسها.',
    dictionaryEmpty: 'القاموس المعتمد للكفايات فارغ، فلا يوجد ما يُربط به. أضِف الكفايات واعتمدها في إطار الكفايات أولًا.',
  },
  en: {
    title: 'Seed pack — Gemini drafts it, a person approves it',
    subtitle:
      'Write only the course name and description. Gemini proposes the competency mappings from the approved dictionary and the learning outcomes, and every field is editable before you approve.',
    propose: 'Propose seed pack',
    reproposeLabel: 'Propose again',
    proposing: 'Proposing…',
    locale: 'Draft language',
    draftedBy: 'Drafted by',
    nothingWritten: 'Draft only — nothing has been written to the programme yet.',
    competencies: 'Competency mappings (approved dictionary only)',
    competenciesHint:
      'Gemini does not create competencies; it maps the course to the approved dictionary. If one is missing, add it to the competency framework first.',
    outcomes: 'Learning outcomes',
    outcomesHint:
      'Observable, assessable outcomes — the standard the questions and the assessment are later measured against.',
    competency: 'Competency',
    targetLevel: 'Target level',
    entryLevel: 'Entry level (optional)',
    weight: 'Weight (%)',
    weightHint:
      'A weight is a whole number from 1 to 100: the share of the course’s emphasis this competency carries, relative to the others mapped. Weights do not have to total 100.',
    weightInvalid: 'Enter a whole number from 1 to 100.',
    weightsIncomplete: 'Every mapped competency needs a weight from 1 to 100 before the seed pack can be approved.',
    primary: 'Primary',
    rationale: 'Mapping rationale (from Gemini)',
    code: 'Code',
    outcomeTitle: 'Outcome',
    outcomeDescription: 'Detail',
    linkedCompetency: 'Linked competency',
    none: '— none —',
    addCompetency: 'Add competency mapping',
    addOutcome: 'Add learning outcome',
    remove: 'Remove',
    approve: 'Approve seed pack',
    approving: 'Approving…',
    approveHint:
      'Approving writes the mappings and outcomes to the programme, recorded against your name in the audit trail.',
    approveConfirm:
      'This will be written to the programme and recorded with you as the approver. Is every mapping and outcome correct?',
    emptyDraft: 'The model proposed nothing usable. Try again, or add the rows yourself.',
    identity: 'Governed academic identity',
    identityHint: 'Gemini writes the first four from the course. Indicators and outcomes are derived from the approved competencies and learning outcomes — the model does not invent them.',
    knowledge: 'Knowledge',
    skills: 'Skills',
    professional_behaviours: 'Professional behaviours',
    abilities: 'Abilities',
    performance_indicators: 'Performance indicators',
    identityOutcomes: 'Outcomes',
    derived: 'derived',
    saveFirst: 'Save the programme first, then come back here.',
    writeByHand: 'Write by hand',
    writingByHand: 'Loading the dictionary…',
    writtenByHand: 'Draft written by hand — no AI',
    writeByHandHint: 'If the AI service is busy, or you would rather not have it propose, write the mappings and outcomes yourself in the same editor, then approve them the same way.',
    dictionaryEmpty: 'The approved competency dictionary is empty, so there is nothing to map to. Add and approve competencies in the competency framework first.',
  },
}

/*
 * A competency weight is a whole-number percentage, 1 to 100 — the unit the
 * column holds and the server enforces. The input used to step by 0.1, and
 * MySQL stored every fraction as 0: four programmes lost all their weights
 * through an approval that reported success.
 *
 * Digits only, so "30.0" and "0.3" are refused here rather than rounded, and
 * an empty box — which is what a proposal the server could not trust arrives
 * as — is refused until the reviewer types a value.
 */
function isValidWeight(value) {
  const text = String(value ?? '').trim()
  if (!/^\d{1,3}$/.test(text)) return false
  const number = Number(text)
  return number >= 1 && number <= 100
}

/** A translatable field as a plain string, whatever shape it arrives in. */
function locText(value, language) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[language] || value.en || value.ar || ''
}

export default function SeedPackPanel({ programId, onApproved }) {
  const language = getCurrentLanguage()
  const copy = COPY[language] || COPY.en
  const [locale, setLocale] = useState(language)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // 'outcomes' here is the academic-identity field, distinct from the
  // learning-outcome section heading that already owns copy.outcomes.
  const identityLabel = (field) => (field === 'outcomes' ? copy.identityOutcomes : copy[field])

  const dictionary = useMemo(() => draft?.dictionary || [], [draft])
  const levels = useMemo(() => draft?.proficiency_levels || [], [draft])

  const competencyLabel = useCallback(
    (id) => {
      const entry = dictionary.find((item) => Number(item.id) === Number(id))
      return entry ? `${entry.code} — ${entry.name}` : `#${id}`
    },
    [dictionary],
  )

  const propose = useCallback(async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await proposeSeedPack(programId, locale)
      setDraft(response?.data ? { ...response.data, source: 'ai' } : null)
    } catch (proposeError) {
      // The interactive budget ran out on every model (503 ai_busy_retry_later, Release G): nothing was saved, and Write by hand is beside the button.
      setError(aiBusyMessage(proposeError, language) || readApiError(proposeError))
    } finally {
      setBusy(false)
    }
  }, [programId, locale, language])

  /*
   * WRITE BY HAND (AI resilience, Release G, AI-RESILIENCE-SPEC §5.3, D15). The
   * same editor with an empty draft: the approved dictionary and the active
   * proficiency ladder come from the competency framework, as the proposal
   * would have sent them, and nothing else is filled in. Approving it is the
   * same accountable act, recorded with draft_source "manual".
   */
  const writeByHand = useCallback(async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const framework = (await fetchCompetencyFramework()) || {}
      const usable = (Array.isArray(framework.competencies) ? framework.competencies : [])
        .filter((item) => ['approved', 'published'].includes(item?.status) && item?.is_active !== false)
        .map((item) => ({ id: item.id, code: item.code, name: locText(item.name, language) }))
      const ladder = (Array.isArray(framework.proficiency_levels) ? framework.proficiency_levels : [])
        .filter((level) => level?.is_active !== false)
        .map((level) => ({ id: level.id, code: level.code, name: locText(level.name, language), rank: level.rank }))
      if (!usable.length) {
        setError(copy.dictionaryEmpty)
        return
      }
      setDraft({
        source: 'manual',
        model: null,
        dictionary: usable,
        proficiency_levels: ladder,
        competencies: [{
          professional_competency_id: usable[0].id,
          target_proficiency_level_id: ladder[ladder.length - 1]?.id ?? '',
          entry_proficiency_level_id: null,
          is_primary: true,
          weight: null,
          rationale: '',
        }],
        learning_outcomes: [{ code: '', title: { [locale]: '' }, description: { [locale]: '' }, professional_competency_id: null }],
        academic_identity: {},
      })
    } catch (loadError) {
      setError(readApiError(loadError))
    } finally {
      setBusy(false)
    }
  }, [copy.dictionaryEmpty, language, locale])

  const patchCompetency = (index, patch) =>
    setDraft((prev) => ({
      ...prev,
      competencies: prev.competencies.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }))

  const patchOutcome = (index, patch) =>
    setDraft((prev) => ({
      ...prev,
      learning_outcomes: prev.learning_outcomes.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }))

  const removeAt = (key, index) =>
    setDraft((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }))

  const addCompetency = () =>
    setDraft((prev) => ({
      ...prev,
      competencies: [
        ...prev.competencies,
        {
          professional_competency_id: dictionary[0]?.id ?? '',
          target_proficiency_level_id: levels[levels.length - 1]?.id ?? '',
          entry_proficiency_level_id: null,
          is_primary: false,
          // Empty, not 1: in percentages a default of 1 is a near-zero share
          // nobody chose. The reviewer enters it.
          weight: null,
          rationale: '',
        },
      ],
    }))

  const addOutcome = () =>
    setDraft((prev) => ({
      ...prev,
      learning_outcomes: [
        ...prev.learning_outcomes,
        { code: '', title: { [locale]: '' }, description: { [locale]: '' }, professional_competency_id: null },
      ],
    }))

  const approve = useCallback(async () => {
    if (!window.confirm(copy.approveConfirm)) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      // The box holds text; the server accepts a JSON integer and nothing else,
      // so "30" is sent as 30. canApprove has already refused anything that is
      // not a whole number from 1 to 100.
      const competencies = draft.competencies.map((row) => ({
        ...row,
        weight: Number(String(row.weight).trim()),
      }))
      const response = await approveSeedPack(
        programId, competencies, draft.learning_outcomes, draft.academic_identity,
        draft.source === 'manual'
          ? { source: 'manual' }
          : { source: 'ai', provenance: draft.ai_provenance || null },
      )
      setNotice(response?.message || '')
      setDraft(null)
      if (onApproved) await onApproved()
    } catch (approveError) {
      setError(readApiError(approveError))
    } finally {
      setBusy(false)
    }
  }, [programId, draft, copy.approveConfirm, onApproved])

  const weightsValid = useMemo(
    () => (draft?.competencies || []).every((row) => isValidWeight(row.weight)),
    [draft],
  )

  const canApprove = useMemo(
    () =>
      Boolean(draft) &&
      (draft.competencies || []).length > 0 &&
      (draft.learning_outcomes || []).length > 0 &&
      weightsValid,
    [draft, weightsValid],
  )

  if (!programId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-[var(--color-text-muted)]">{copy.saveFirst}</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text)]">
              <Wand2 className="h-5 w-5" aria-hidden="true" /> {copy.title}
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-[var(--color-text-muted)]">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
              className="w-36"
              aria-label={copy.locale}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </Select>
            <Button disabled={busy} onClick={propose}>
              {busy && !draft ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.proposing}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />{' '}
                  {draft ? copy.reproposeLabel : copy.propose}
                </>
              )}
            </Button>
            {!draft ? (
              <Button variant="outline" disabled={busy} onClick={writeByHand}>
                <PenLine className="h-4 w-4" aria-hidden="true" /> {copy.writeByHand}
              </Button>
            ) : null}
          </div>
        </div>

        <AiServiceBanner families={['interactive']} language={language} />
        {!draft ? <p className="text-xs text-[var(--color-text-muted)]">{copy.writeByHandHint}</p> : null}

        {error ? <p className="whitespace-pre-line text-sm text-red-600">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}

        {draft ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">{copy.nothingWritten}</Badge>
              {draft.source === 'manual' ? <Badge variant="neutral">{copy.writtenByHand}</Badge> : null}
              {/* which model wrote this, so the reviewer knows what they are judging */}
              {draft.model ? (
                <Badge variant="neutral">
                  {copy.draftedBy}: {draft.ai_provenance?.answering_model || draft.model}
                </Badge>
              ) : null}
            </div>
            {/* A fallback model said plainly, with why the first was passed over (AI resilience, §7.3); the badge above names the answering model. */}
            {draft.ai_provenance?.used_fallback ? <AiProvenanceNote provenance={draft.ai_provenance} language={language} /> : null}

            <section className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text)]">{copy.competencies}</h4>
                <p className="text-xs text-[var(--color-text-muted)]">{copy.competenciesHint}</p>
                {/* Once, here, rather than under every row's narrow weight column. */}
                <p className="text-xs text-[var(--color-text-muted)]">{copy.weightHint}</p>
              </div>

              {(draft.competencies || []).length === 0 ? (
                <p className="text-sm text-amber-600">{copy.emptyDraft}</p>
              ) : null}

              {(draft.competencies || []).map((row, index) => (
                <div
                  key={`competency-${index}`}
                  className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Select
                      label={copy.competency}
                      value={row.professional_competency_id ?? ''}
                      onChange={(event) =>
                        patchCompetency(index, { professional_competency_id: Number(event.target.value) })
                      }
                    >
                      {dictionary.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} — {item.name}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label={copy.targetLevel}
                      value={row.target_proficiency_level_id ?? ''}
                      onChange={(event) =>
                        patchCompetency(index, { target_proficiency_level_id: Number(event.target.value) })
                      }
                    >
                      {levels.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.code} — {level.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="grid items-end gap-3 md:grid-cols-4">
                    <Select
                      label={copy.entryLevel}
                      value={row.entry_proficiency_level_id ?? ''}
                      onChange={(event) =>
                        patchCompetency(index, {
                          entry_proficiency_level_id: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                    >
                      <option value="">{copy.none}</option>
                      {levels.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.code} — {level.name}
                        </option>
                      ))}
                    </Select>
                    {/*
                      Shown empty when the draft has no weight, never as 1. The
                      server drops a proposed weight it cannot trust to null so a
                      person decides it; displaying a 1 there would look decided.
                    */}
                    <Input
                      label={copy.weight}
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min="1"
                      max="100"
                      required
                      value={row.weight ?? ''}
                      error={isValidWeight(row.weight) ? undefined : copy.weightInvalid}
                      onChange={(event) => patchCompetency(index, { weight: event.target.value })}
                    />
                    <label className="flex items-center gap-2 py-3 text-sm text-[var(--color-text)]">
                      <input
                        type="checkbox"
                        checked={Boolean(row.is_primary)}
                        onChange={(event) => patchCompetency(index, { is_primary: event.target.checked })}
                      />
                      {copy.primary}
                    </label>
                    <Button
                      variant="ghost"
                      className="justify-self-start"
                      onClick={() => removeAt('competencies', index)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" /> {copy.remove}
                    </Button>
                  </div>

                  {row.rationale ? (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      <span className="font-medium">{copy.rationale}:</span> {row.rationale}
                    </p>
                  ) : null}
                </div>
              ))}

              <Button variant="outline" onClick={addCompetency} disabled={dictionary.length === 0}>
                <Plus className="h-4 w-4" aria-hidden="true" /> {copy.addCompetency}
              </Button>
            </section>

            {/*
              The six fields the library screen shows and nothing filled in. Four
              are the model's prose; the last two are computed from governed data
              and labelled so, because a reviewer editing them should know they are
              overriding a derivation rather than writing free text.
            */}
            <section className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text)]">{copy.identity}</h4>
                <p className="text-xs text-[var(--color-text-muted)]">{copy.identityHint}</p>
              </div>

              {['knowledge', 'skills', 'professional_behaviours', 'abilities',
                'performance_indicators', 'outcomes'].map((field) => (
                <Textarea
                  key={field}
                  label={
                    ['performance_indicators', 'outcomes'].includes(field)
                      ? `${identityLabel(field)} (${copy.derived})`
                      : identityLabel(field)
                  }
                  rows={['performance_indicators', 'outcomes'].includes(field) ? 4 : 3}
                  value={locText(draft.academic_identity?.[field], locale)}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      academic_identity: {
                        ...(prev.academic_identity || {}),
                        [field]: {
                          ...(prev.academic_identity?.[field] || {}),
                          [locale]: event.target.value,
                        },
                      },
                    }))
                  }
                />
              ))}
            </section>

            <section className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text)]">{copy.outcomes}</h4>
                <p className="text-xs text-[var(--color-text-muted)]">{copy.outcomesHint}</p>
              </div>

              {(draft.learning_outcomes || []).map((row, index) => (
                <div
                  key={`outcome-${index}`}
                  className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                >
                  <div className="grid gap-3 md:grid-cols-[8rem_1fr]">
                    <Input
                      label={copy.code}
                      value={locText(row.code, locale)}
                      placeholder="LO-001"
                      onChange={(event) => patchOutcome(index, { code: event.target.value })}
                    />
                    <Input
                      label={copy.outcomeTitle}
                      value={locText(row.title, locale)}
                      onChange={(event) =>
                        patchOutcome(index, { title: { ...(row.title || {}), [locale]: event.target.value } })
                      }
                    />
                  </div>
                  <Textarea
                    label={copy.outcomeDescription}
                    rows={2}
                    value={locText(row.description, locale)}
                    onChange={(event) =>
                      patchOutcome(index, {
                        description: { ...(row.description || {}), [locale]: event.target.value },
                      })
                    }
                  />
                  <div className="grid items-end gap-3 md:grid-cols-[1fr_auto]">
                    <Select
                      label={copy.linkedCompetency}
                      value={row.professional_competency_id ?? ''}
                      onChange={(event) =>
                        patchOutcome(index, {
                          professional_competency_id: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                    >
                      <option value="">{copy.none}</option>
                      {dictionary.map((item) => (
                        <option key={item.id} value={item.id}>
                          {competencyLabel(item.id)}
                        </option>
                      ))}
                    </Select>
                    <Button variant="ghost" onClick={() => removeAt('learning_outcomes', index)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" /> {copy.remove}
                    </Button>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addOutcome}>
                <Plus className="h-4 w-4" aria-hidden="true" /> {copy.addOutcome}
              </Button>
            </section>

            <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-4">
              <Button disabled={busy || !canApprove} onClick={approve}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.approving}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" /> {copy.approve}
                  </>
                )}
              </Button>
              <p className="text-xs text-[var(--color-text-muted)]">{copy.approveHint}</p>
              {/* Says why the button is disabled, instead of leaving it to be guessed. */}
              {!weightsValid ? <p className="text-xs text-amber-600">{copy.weightsIncomplete}</p> : null}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
