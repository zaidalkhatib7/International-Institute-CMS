/*
 * APPLYING THE GEMINI RUBRIC DRAFT — owner instruction, 6 Aug 2026:
 * "this gemini will fill it not me i will only approve it."
 *
 * The assessor wants the rubric form to arrive populated. This is the highest
 * -stakes prefill in the product: the very next click writes governed findings
 * that decide what an applicant is recognised for. Three rules follow from that.
 *
 * 1. NEVER AUTOMATIC. The assessor presses a button. If the draft appeared on
 *    load, "Gemini wrote this" would become invisible within a week, and nobody
 *    would remember which findings were read and which were waved through.
 *
 * 2. NEVER OVERWRITE THE HUMAN. A field the assessor has already typed in is
 *    left exactly as it is, and the count of what was skipped is reported. Their
 *    work outranks the model's, always, and silently discarding it would be the
 *    single most damaging thing this function could do.
 *
 * 3. NOTHING IS SAVED HERE. This returns form state. The finding does not exist
 *    until the assessor presses save, under their own account, and the audit
 *    trail records both that fact and that the draft came from a machine.
 */

/** A field counts as the assessor's work once it holds anything at all. */
function isEmpty(value) {
  if (Array.isArray(value)) return value.length === 0
  return value === null || value === undefined || String(value).trim() === ''
}

/**
 * Merge a Gemini draft into rubric form rows without touching anything the
 * assessor has already filled in.
 *
 * @param criteria    current form rows
 * @param advice      advisory.criterion_advice, already normalised server-side
 * @param outcomes    approved outcome definitions, to map code -> id
 * @returns {{criteria: Array, filled: number, kept: number, criterionIds: Array}}
 */
export function applyCriterionDraft(criteria, advice, outcomes = []) {
  const byCriterion = new Map(
    (Array.isArray(advice) ? advice : [])
      .filter((entry) => entry && entry.criterion_id !== undefined)
      .map((entry) => [Number(entry.criterion_id), entry]),
  )
  const outcomeIdByCode = new Map(
    (Array.isArray(outcomes) ? outcomes : [])
      .filter((outcome) => outcome?.code)
      .map((outcome) => [String(outcome.code), outcome.id]),
  )

  let filled = 0
  let kept = 0
  const criterionIds = []

  const next = (Array.isArray(criteria) ? criteria : []).map((criterion) => {
    const draft = byCriterion.get(Number(criterion.id))
    if (!draft) return criterion

    const updates = {}

    // An outcome code the server could not match to an approved outcome arrives
    // as null. Leaving the dropdown empty is the honest result — the assessor
    // decides rather than inheriting a guess.
    const outcomeId = outcomeIdByCode.get(String(draft.suggested_outcome_code))
    if (isEmpty(criterion.outcome_id) && outcomeId !== undefined) {
      updates.outcome_id = outcomeId
    }
    if (isEmpty(criterion.rationale) && !isEmpty(draft.suggested_rationale)) {
      updates.rationale = draft.suggested_rationale
    }
    // Null whenever the criterion has no governed maximum, so this simply does
    // not fire for the rubrics that have none.
    if (isEmpty(criterion.score) && draft.suggested_score !== null && draft.suggested_score !== undefined) {
      updates.score = String(draft.suggested_score)
    }
    if (isEmpty(criterion.evidence_ids) && !isEmpty(draft.suggested_evidence_ids)) {
      updates.evidence_ids = draft.suggested_evidence_ids.map(Number)
    }

    const changed = Object.keys(updates).length > 0
    // "Kept" means the draft had something to offer and the assessor's existing
    // work won. Reporting it stops a silent no-op reading as a failed button.
    const hadSomethingToOffer =
      !isEmpty(draft.suggested_rationale) ||
      !isEmpty(draft.suggested_evidence_ids) ||
      outcomeId !== undefined ||
      (draft.suggested_score !== null && draft.suggested_score !== undefined)

    if (changed) {
      filled += 1
      criterionIds.push(criterion.id)
    } else if (hadSomethingToOffer) {
      kept += 1
    }

    return changed ? { ...criterion, ...updates, ai_drafted: Object.keys(updates) } : criterion
  })

  return { criteria: next, filled, kept, criterionIds }
}

/** Fill {filled} / {kept} into a copy string without pulling in an i18n library. */
export function formatDraftMessage(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    String(template ?? ''),
  )
}
