import { describe, expect, it } from 'vitest'
import { applyCriterionDraft, formatDraftMessage } from './criterionDraft'

/*
 * This is the highest-stakes prefill in the product: the click after it writes
 * governed findings that decide what an applicant is recognised for. Owner
 * instruction, 6 Aug 2026 — "this gemini will fill it not me i will only
 * approve it."
 *
 * Two properties matter more than any convenience:
 *   - the assessor's own writing is never overwritten, and when the draft is
 *     skipped for that reason they are told, not silently ignored
 *   - a value the server declined to draft (unapproved outcome, score with no
 *     governed maximum) leaves the field empty rather than inheriting a guess
 */

const OUTCOMES = [
  { id: 10, code: 'fully_achieved' },
  { id: 11, code: 'partial_achievement' },
]

function row(overrides = {}) {
  return { id: 1, outcome_id: '', score: '', rationale: '', evidence_ids: [], ...overrides }
}

function draft(overrides = {}) {
  return {
    criterion_id: 1,
    suggested_outcome_code: 'fully_achieved',
    suggested_rationale: 'The certificate evidences supervised practice.',
    suggested_evidence_ids: [4, 5],
    suggested_score: null,
    ...overrides,
  }
}

describe('applyCriterionDraft', () => {
  it('fills an empty criterion and maps the outcome code to its id', () => {
    const result = applyCriterionDraft([row()], [draft()], OUTCOMES)

    expect(result.filled).toBe(1)
    expect(result.criterionIds).toEqual([1])
    expect(result.criteria[0]).toMatchObject({
      outcome_id: 10,
      rationale: 'The certificate evidences supervised practice.',
      evidence_ids: [4, 5],
    })
  })

  it('never overwrites what the assessor already wrote, and reports the skip', () => {
    const mine = row({ rationale: 'My own judgement.', outcome_id: 11, evidence_ids: [9] })
    const result = applyCriterionDraft([mine], [draft()], OUTCOMES)

    expect(result.criteria[0].rationale).toBe('My own judgement.')
    expect(result.criteria[0].outcome_id).toBe(11)
    expect(result.criteria[0].evidence_ids).toEqual([9])
    // Reported, not silent — otherwise the button looks broken.
    expect(result.filled).toBe(0)
    expect(result.kept).toBe(1)
  })

  it('fills only the empty fields of a partly written criterion', () => {
    const partial = row({ rationale: 'Already reasoned.' })
    const result = applyCriterionDraft([partial], [draft()], OUTCOMES)

    expect(result.criteria[0].rationale).toBe('Already reasoned.')
    expect(result.criteria[0].outcome_id).toBe(10)
    expect(result.filled).toBe(1)
  })

  it('leaves the outcome empty when the server could not match an approved code', () => {
    // normalizeCriterionAdvice nulls anything not in approved_outcomes.
    const result = applyCriterionDraft([row()], [draft({ suggested_outcome_code: null })], OUTCOMES)

    expect(result.criteria[0].outcome_id).toBe('')
    // The rationale still lands, so the entry is still worth applying.
    expect(result.filled).toBe(1)
  })

  it('leaves the score empty when no score was drafted', () => {
    // Criteria with no governed maximum always arrive with a null score,
    // because the marking policy is still pending governance.
    const result = applyCriterionDraft([row()], [draft({ suggested_score: null })], OUTCOMES)
    expect(result.criteria[0].score).toBe('')
  })

  it('applies a drafted score as a string, matching the input the form holds', () => {
    const result = applyCriterionDraft([row()], [draft({ suggested_score: 4 })], OUTCOMES)
    expect(result.criteria[0].score).toBe('4')
  })

  it('marks which fields came from the draft so the row can be badged', () => {
    const result = applyCriterionDraft([row()], [draft()], OUTCOMES)
    expect(result.criteria[0].ai_drafted).toContain('rationale')
  })

  it('leaves a criterion the draft says nothing about completely untouched', () => {
    const untouched = row({ id: 2 })
    const result = applyCriterionDraft([row(), untouched], [draft()], OUTCOMES)

    expect(result.criteria[1]).toBe(untouched)
    expect(result.criterionIds).toEqual([1])
  })

  it('survives an empty or missing draft without throwing', () => {
    expect(applyCriterionDraft([row()], [], OUTCOMES).filled).toBe(0)
    expect(applyCriterionDraft([row()], undefined, OUTCOMES).filled).toBe(0)
    expect(applyCriterionDraft(undefined, [draft()], OUTCOMES).criteria).toEqual([])
  })

  it('ignores draft entries for criteria that are not on this rubric', () => {
    const result = applyCriterionDraft([row()], [draft({ criterion_id: 999 })], OUTCOMES)
    expect(result.filled).toBe(0)
    expect(result.criteria[0].rationale).toBe('')
  })
})

describe('formatDraftMessage', () => {
  it('substitutes the counts the assessor needs to see', () => {
    expect(formatDraftMessage('Filled {filled}, left {kept}.', { filled: 3, kept: 1 }))
      .toBe('Filled 3, left 1.')
  })
})
