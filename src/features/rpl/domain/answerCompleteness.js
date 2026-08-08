/*
 * ANSWERS BEFORE EVALUATION — the browser-side mirror of
 * app/Services/RplAnswerCompletenessService.php.
 *
 * The server is the authority and recomputes this on every gated call; nothing
 * here can open a gate. This exists so the administrator can see WHY the gate
 * is shut. "18 of 25 answered, 7 outstanding" is a next action; a disabled
 * button with no sentence beside it is a support ticket.
 *
 * Three parts of the predicate look like details and are not, so they are
 * mirrored exactly rather than approximated:
 *
 *   - the denominator is the frozen issued_snapshot, falling back to APPROVED
 *     items only. Counting rejected or superseded items would make a legacy row
 *     impossible to complete and would show a case as permanently short;
 *   - an empty string, a null and an empty array are not answers. The applicant
 *     endpoint persists free text unvalidated, so a non-null `response` proves
 *     nothing;
 *   - an empty denominator fails CLOSED. "Nothing to answer" is not "fully
 *     answered" — that vacuity is exactly what the owner's rule forbids.
 */

/** Mirrors RplAnswerCompletenessService::hasContent — scalars only, trimmed. */
function hasContent(value) {
  if (typeof value === 'number' || typeof value === 'boolean') return true

  return typeof value === 'string' && value.trim() !== ''
}

/** Mirrors RplAnswerCompletenessService::isAnswered. */
export function isItemAnswered(item) {
  if (!item) return false

  return hasContent(item.response?.selected_option_id) || hasContent(item.response?.answer)
}

function issuedItemIds(verification) {
  const frozen = Array.isArray(verification?.issued_snapshot) ? verification.issued_snapshot : []
  const frozenIds = [...new Set(frozen.map((row) => Number(row?.id)).filter(Boolean))]
  if (frozenIds.length) return frozenIds

  const items = Array.isArray(verification?.active_items) ? verification.active_items : []

  return [
    ...new Set(
      items
        .filter((item) => item.status === 'approved')
        .map((item) => Number(item.id))
        .filter(Boolean),
    ),
  ]
}

/**
 * Per-verification answer progress.
 *
 * @returns {{issued: number, answered: number, outstanding: number, outstandingIds: number[],
 *   isComplete: boolean, reasonCode: (null|'no_issued_items'|'items_outstanding'|'answers_not_submitted')}}
 */
export function answerProgress(verification) {
  const issuedIds = issuedItemIds(verification)
  const items = Array.isArray(verification?.active_items) ? verification.active_items : []
  const byId = new Map(items.map((item) => [Number(item.id), item]))

  // A missing item fails closed: an id that was issued and no longer resolves
  // cannot be counted as answered on the applicant's behalf.
  const outstandingIds = issuedIds.filter((id) => !isItemAnswered(byId.get(id)))
  const itemsComplete = issuedIds.length > 0 && outstandingIds.length === 0
  const submitted = Boolean(verification?.answers_submitted_at)

  let reasonCode = null
  if (issuedIds.length === 0) reasonCode = 'no_issued_items'
  else if (outstandingIds.length > 0) reasonCode = 'items_outstanding'
  // Every item answered but nothing submitted still reads as zero outstanding,
  // which would look finished. The server treats it as outstanding, so do we.
  else if (!submitted) reasonCode = 'answers_not_submitted'

  return {
    issued: issuedIds.length,
    answered: issuedIds.length - outstandingIds.length,
    outstanding: outstandingIds.length,
    outstandingIds,
    isComplete: itemsComplete,
    reasonCode,
  }
}
