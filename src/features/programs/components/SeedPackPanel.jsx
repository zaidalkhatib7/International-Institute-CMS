import { useCallback, useMemo, useState } from 'react'
import { Loader2, Plus, ShieldCheck, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, Input, Select, Textarea } from '../../../components/ui'
import { approveSeedPack, proposeSeedPack } from '../services/programsService'
import { getCurrentLanguage } from '../../../utils/localization'
import { readApiError } from '../../../services/apiResponse'

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
    nothingWritten: 'مسودة فقط — لم يُكتب أي شيء في البرنامج بعد.',
    competencies: 'ربط الكفايات (من القاموس المعتمد فقط)',
    competenciesHint:
      'لا يُنشئ Gemini كفايات جديدة؛ يربط الدورة بالقاموس المعتمد فقط. إن نقصت كفاية فأضِفها إلى إطار الكفايات أولًا.',
    outcomes: 'مخرجات التعلّم',
    outcomesHint: 'مخرجات قابلة للملاحظة والقياس، وهي المعيار الذي تُقاس عليه الأسئلة والتقييم لاحقًا.',
    competency: 'الكفاية',
    targetLevel: 'المستوى المستهدف',
    entryLevel: 'مستوى الدخول (اختياري)',
    weight: 'الوزن',
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
    saveFirst: 'احفظ البرنامج أولًا ثم عد إلى هنا.',
  },
  en: {
    title: 'Seed pack — Gemini drafts it, a person approves it',
    subtitle:
      'Write only the course name and description. Gemini proposes the competency mappings from the approved dictionary and the learning outcomes, and every field is editable before you approve.',
    propose: 'Propose seed pack',
    reproposeLabel: 'Propose again',
    proposing: 'Proposing…',
    locale: 'Draft language',
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
    weight: 'Weight',
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
    saveFirst: 'Save the programme first, then come back here.',
  },
  nl: {
    title: 'Startpakket — Gemini stelt voor, een mens keurt goed',
    subtitle:
      'Schrijf alleen de cursusnaam en -omschrijving. Gemini stelt de competentiekoppelingen uit de goedgekeurde woordenlijst en de leeruitkomsten voor; elk veld is bewerkbaar vóór goedkeuring.',
    propose: 'Startpakket voorstellen',
    reproposeLabel: 'Opnieuw voorstellen',
    proposing: 'Bezig met voorstellen…',
    locale: 'Concepttaal',
    nothingWritten: 'Alleen een concept — er is nog niets naar het programma geschreven.',
    competencies: 'Competentiekoppelingen (alleen goedgekeurde woordenlijst)',
    competenciesHint:
      'Gemini maakt geen competenties aan; het koppelt de cursus aan de goedgekeurde woordenlijst. Ontbreekt er een, voeg die dan eerst toe aan het competentiekader.',
    outcomes: 'Leeruitkomsten',
    outcomesHint: 'Waarneembare, toetsbare uitkomsten — de norm waaraan vragen en toetsing worden gemeten.',
    competency: 'Competentie',
    targetLevel: 'Streefniveau',
    entryLevel: 'Instapniveau (optioneel)',
    weight: 'Gewicht',
    primary: 'Primair',
    rationale: 'Onderbouwing van de koppeling (van Gemini)',
    code: 'Code',
    outcomeTitle: 'Uitkomst',
    outcomeDescription: 'Toelichting',
    linkedCompetency: 'Gekoppelde competentie',
    none: '— geen —',
    addCompetency: 'Competentiekoppeling toevoegen',
    addOutcome: 'Leeruitkomst toevoegen',
    remove: 'Verwijderen',
    approve: 'Startpakket goedkeuren',
    approving: 'Bezig met goedkeuren…',
    approveHint:
      'Goedkeuren schrijft de koppelingen en uitkomsten naar het programma, vastgelegd op uw naam in het auditspoor.',
    approveConfirm:
      'Dit wordt naar het programma geschreven en op uw naam vastgelegd. Klopt elke koppeling en uitkomst?',
    emptyDraft: 'Het model stelde niets bruikbaars voor. Probeer opnieuw of voeg de rijen zelf toe.',
    saveFirst: 'Sla het programma eerst op en kom dan terug.',
  },
}

/** A translatable field as a plain string, whatever shape it arrives in. */
function locText(value, language) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[language] || value.en || value.ar || value.nl || ''
}

export default function SeedPackPanel({ programId, onApproved }) {
  const language = getCurrentLanguage()
  const copy = COPY[language] || COPY.en
  const [locale, setLocale] = useState(language)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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
      setDraft(response?.data || null)
    } catch (proposeError) {
      setError(readApiError(proposeError))
    } finally {
      setBusy(false)
    }
  }, [programId, locale])

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
          weight: 1,
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
      const response = await approveSeedPack(programId, draft.competencies, draft.learning_outcomes)
      setNotice(response?.message || '')
      setDraft(null)
      if (onApproved) await onApproved()
    } catch (approveError) {
      setError(readApiError(approveError))
    } finally {
      setBusy(false)
    }
  }, [programId, draft, copy.approveConfirm, onApproved])

  const canApprove = useMemo(
    () =>
      Boolean(draft) &&
      (draft.competencies || []).length > 0 &&
      (draft.learning_outcomes || []).length > 0,
    [draft],
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
              <option value="nl">Nederlands</option>
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
          </div>
        </div>

        {error ? <p className="whitespace-pre-line text-sm text-red-600">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}

        {draft ? (
          <>
            <Badge variant="warning">{copy.nothingWritten}</Badge>

            <section className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text)]">{copy.competencies}</h4>
                <p className="text-xs text-[var(--color-text-muted)]">{copy.competenciesHint}</p>
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
                    <Input
                      label={copy.weight}
                      type="number"
                      step="0.1"
                      min="0"
                      value={row.weight ?? 1}
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
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
