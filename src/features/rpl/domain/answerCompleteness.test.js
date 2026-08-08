import { describe, expect, it } from 'vitest'
import { answerProgress, isItemAnswered } from './answerCompleteness'

/*
 * These pin the predicate to the SERVER's, because the whole value of showing
 * progress is that the number on screen explains the gate the server enforces.
 * A client that counted an empty string as an answer would show 25 of 25 beside
 * a button that refuses, which is worse than showing nothing.
 */

function verification(overrides = {}) {
  return {
    status: 'issued',
    issued_snapshot: [{ id: 1 }, { id: 2 }, { id: 3 }],
    answers_submitted_at: null,
    active_items: [
      { id: 1, status: 'approved', response: { selected_option_id: 'C' } },
      { id: 2, status: 'approved', response: { selected_option_id: 'A' } },
      { id: 3, status: 'approved', response: null },
    ],
    ...overrides,
  }
}

describe('isItemAnswered', () => {
  it('accepts a chosen option and free text', () => {
    expect(isItemAnswered({ response: { selected_option_id: 'B' } })).toBe(true)
    expect(isItemAnswered({ response: { answer: 'I led the migration.' } })).toBe(true)
  })

  it('refuses an empty string, a blank string, a null and a missing item', () => {
    // submitAnswers persists ['answer' => $response] with no validation, so a
    // non-null response proves nothing at all.
    expect(isItemAnswered({ response: { selected_option_id: '' } })).toBe(false)
    expect(isItemAnswered({ response: { answer: '   ' } })).toBe(false)
    expect(isItemAnswered({ response: { selected_option_id: null } })).toBe(false)
    expect(isItemAnswered({ response: null })).toBe(false)
    expect(isItemAnswered(undefined)).toBe(false)
  })

  it('refuses a non-scalar, which is how an empty array used to pass', () => {
    expect(isItemAnswered({ response: { answer: [] } })).toBe(false)
    expect(isItemAnswered({ response: { answer: {} } })).toBe(false)
  })
})

describe('answerProgress', () => {
  it('counts against the frozen snapshot, not the live item list', () => {
    const progress = answerProgress(verification())

    expect(progress).toMatchObject({ issued: 3, answered: 2, outstanding: 1, isComplete: false })
    expect(progress.outstandingIds).toEqual([3])
    expect(progress.reasonCode).toBe('items_outstanding')
  })

  it('is complete once every issued item carries an answer', () => {
    const progress = answerProgress(
      verification({
        answers_submitted_at: '2026-08-07T10:00:00Z',
        active_items: [
          { id: 1, status: 'approved', response: { selected_option_id: 'C' } },
          { id: 2, status: 'approved', response: { selected_option_id: 'A' } },
          { id: 3, status: 'approved', response: { selected_option_id: 'D' } },
        ],
      }),
    )

    expect(progress).toMatchObject({ issued: 3, answered: 3, outstanding: 0, isComplete: true })
    expect(progress.reasonCode).toBeNull()
  })

  it('separates "answered everything" from "submitted"', () => {
    const progress = answerProgress(
      verification({
        answers_submitted_at: null,
        active_items: [
          { id: 1, status: 'approved', response: { selected_option_id: 'C' } },
          { id: 2, status: 'approved', response: { selected_option_id: 'A' } },
          { id: 3, status: 'approved', response: { selected_option_id: 'D' } },
        ],
      }),
    )

    // Zero outstanding would otherwise read as finished on a case the server
    // still counts as outstanding.
    expect(progress.outstanding).toBe(0)
    expect(progress.reasonCode).toBe('answers_not_submitted')
  })

  it('falls back to APPROVED items when no snapshot was frozen', () => {
    const progress = answerProgress(
      verification({
        issued_snapshot: null,
        active_items: [
          { id: 1, status: 'approved', response: { selected_option_id: 'C' } },
          // Counting these would make the row impossible to complete for ever.
          { id: 2, status: 'rejected', response: null },
          { id: 3, status: 'pending_review', response: null },
        ],
      }),
    )

    expect(progress).toMatchObject({ issued: 1, answered: 1, isComplete: true })
  })

  it('fails closed on an empty denominator rather than reading as complete', () => {
    const progress = answerProgress({ issued_snapshot: [], active_items: [] })

    expect(progress.isComplete).toBe(false)
    expect(progress.reasonCode).toBe('no_issued_items')
  })

  it('fails closed when an issued id no longer resolves to an item', () => {
    const progress = answerProgress(
      verification({ issued_snapshot: [{ id: 1 }, { id: 99 }], active_items: [
        { id: 1, status: 'approved', response: { selected_option_id: 'C' } },
      ] }),
    )

    expect(progress).toMatchObject({ issued: 2, answered: 1, outstanding: 1, isComplete: false })
  })

  it('survives a null verification, because the panel renders before the load lands', () => {
    expect(answerProgress(null)).toMatchObject({ issued: 0, answered: 0, isComplete: false })
  })
})
