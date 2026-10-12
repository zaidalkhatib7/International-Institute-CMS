import { describe, expect, it } from 'vitest'
import {
  DECLINE_REASONS,
  EVIDENCE_CATEGORIES,
  EVIDENCE_UPLOAD_POLICY,
  evidencePreviewKind,
  getApplicationEvidenceCategories,
  isEvidenceEligibleForAssessment,
  MAX_EVIDENCE_FILE_SIZE,
  readApplicationCompleteness,
  readApplicationDecline,
  readApplicationDeclarationAccepted,
  validateEvidenceFile,
} from './rpl'

function file(name, type, size = 100) {
  const value = new File(['evidence'], name, { type })
  Object.defineProperty(value, 'size', { value: size })
  return value
}

describe('RPL evidence validation', () => {
  it('accepts every required evidence family', () => {
    expect(validateEvidenceFile(file('identity.pdf', 'application/pdf')).valid).toBe(true)
    expect(validateEvidenceFile(file('photo.jpg', 'image/jpeg')).valid).toBe(true)
    expect(validateEvidenceFile(file('portfolio.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).valid).toBe(true)
    expect(validateEvidenceFile(file('work.mp4', 'video/mp4')).valid).toBe(true)
    expect(validateEvidenceFile(file('interview.mp3', 'audio/mpeg')).valid).toBe(true)
  })

  it('rejects unsupported formats and files larger than 50 MB', () => {
    expect(validateEvidenceFile(file('archive.exe', 'application/octet-stream')).code).toBe('unsupported_type')
    expect(validateEvidenceFile(file('oversize.pdf', 'application/pdf', MAX_EVIDENCE_FILE_SIZE + 1)).code).toBe('too_large')
  })

  it('detects the appropriate preview renderer', () => {
    expect(evidencePreviewKind('image/png', 'photo.png')).toBe('image')
    expect(evidencePreviewKind('application/pdf', 'proof.pdf')).toBe('pdf')
    expect(evidencePreviewKind('video/mp4', 'proof.mp4')).toBe('video')
    expect(evidencePreviewKind('audio/mpeg', 'proof.mp3')).toBe('audio')
    expect(evidencePreviewKind('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'proof.docx')).toBe('document')
  })
})

describe('RPL application evidence contract', () => {
  it('scopes upload categories to the application standard and preserves pivot requirements', () => {
    const reference = [
      { id: 1, code: 'identity', name: { en: 'Identity' }, is_active: true },
      { id: 2, code: 'portfolio', name: { en: 'Portfolio' }, is_active: true },
      { id: 3, code: 'award_accreditation', is_active: true },
    ]
    const application = {
      standard: {
        evidence_categories: [
          { id: 2, code: 'portfolio', pivot: { is_required: true, minimum_items: 2, maximum_items: 4 } },
          { id: 1, code: 'identity', pivot: { is_required: false, minimum_items: 0 } },
        ],
      },
    }

    expect(getApplicationEvidenceCategories(application, reference)).toEqual([
      expect.objectContaining({ id: 2, code: 'portfolio', is_required: true, minimum_items: 2, maximum_items: 4 }),
      expect.objectContaining({ id: 1, code: 'identity', is_required: false, minimum_items: 0 }),
    ])
  })

  it('uses authoritative completeness and declaration state, including consent collections', () => {
    const application = { completeness: { percentage: 62.5, declaration: { accepted: true } }, consents: [] }
    expect(readApplicationCompleteness(application)).toEqual(application.completeness)
    expect(readApplicationDeclarationAccepted(application)).toBe(true)
    expect(readApplicationDeclarationAccepted({ consents: [{ accepted: true }] })).toBe(true)
    expect(readApplicationDeclarationAccepted({ consents: [{ accepted: false }] })).toBe(false)
  })

  it('matches backend assessment evidence eligibility', () => {
    expect(isEvidenceEligibleForAssessment({ status: 'verified' }, true)).toBe(true)
    expect(isEvidenceEligibleForAssessment({ status: 'under_review' }, true)).toBe(false)
    expect(isEvidenceEligibleForAssessment({ status: 'under_review' }, false)).toBe(true)
    expect(isEvidenceEligibleForAssessment({ status: 'rejected' }, false)).toBe(false)
    expect(isEvidenceEligibleForAssessment({ status: 'unverifiable' }, false)).toBe(false)
  })

  it('publishes the immutable runtime upload policy', () => {
    expect(EVIDENCE_UPLOAD_POLICY.maxFileSizeBytes).toBe(50 * 1024 * 1024)
    expect(EVIDENCE_UPLOAD_POLICY.extensions).toEqual(['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx', 'pptx', 'mp4', 'mp3'])
  })
})

/*
 * THE DECLINE STAMP (owner, 12 Oct 2026).
 *
 * Every move into `rejected` now records why (a code from App\Enums\RplDeclineReason)
 * and when the same client may open a new RPL case. Staff see both on the case.
 * The date is the one frozen at the rejection, never one recomputed from the
 * cooldown setting as it stands today.
 */
describe('RPL decline stamp', () => {
  it('labels every code the API can stamp, in all three languages', () => {
    expect(Object.keys(DECLINE_REASONS).sort()).toEqual([
      'appeal_rejected',
      'committee_rejected',
      'intake_declined',
      'interview_declined',
      'interview_no_show',
      'quiz_below_pass_mark',
      'screening_declined',
    ])
    for (const { labels } of Object.values(DECLINE_REASONS)) {
      expect(Object.keys(labels).sort()).toEqual(['ar', 'en', 'nl'])
      expect(Object.values(labels).every((label) => typeof label === 'string' && label.trim() !== '')).toBe(true)
    }
  })

  it('reads the stored reason and reapply date of a rejected case', () => {
    const application = {
      status: 'rejected',
      decline_reason_code: 'intake_declined',
      reapply_available_at: '2026-10-19T10:00:00+00:00',
    }

    expect(readApplicationDecline(application, 'en')).toEqual({
      code: 'intake_declined',
      reason: 'Declined at the initial review',
      reapplyAvailableAt: '2026-10-19T10:00:00+00:00',
      reapplyDerived: false,
    })
    expect(readApplicationDecline(application, 'ar').reason).toBe(DECLINE_REASONS.intake_declined.labels.ar)
    expect(readApplicationDecline(application, 'nl').reason).toBe(DECLINE_REASONS.intake_declined.labels.nl)
  })

  it('shows nothing for a case that carries no stamp and imposes no date', () => {
    // An open case, and a case rejected before the stamp existed under a scope that gives it no cooldown.
    expect(readApplicationDecline({ status: 'submitted', effective_reapply_available_at: null })).toBeNull()
    expect(readApplicationDecline({ status: 'rejected', decline_reason_code: null, reapply_available_at: null, effective_reapply_available_at: null })).toBeNull()
    expect(readApplicationDecline(null)).toBeNull()
  })

  it('shows the date the API holds a pre-stamp rejection to, flagged as derived', () => {
    // Rejected before the stamp existed: no code, no stored date, but the intake
    // check refuses the client until finalised_at + the governed days.
    expect(readApplicationDecline({ status: 'rejected', decline_reason_code: null, reapply_available_at: null, effective_reapply_available_at: '2026-10-17T12:00:00.000000Z' }, 'en')).toEqual({
      code: null,
      reason: null,
      reapplyAvailableAt: '2026-10-17T12:00:00.000000Z',
      reapplyDerived: true,
    })
    // A stored stamp always wins over the derived date.
    expect(readApplicationDecline({ decline_reason_code: 'intake_declined', reapply_available_at: '2026-10-19T10:00:00.000000Z', effective_reapply_available_at: '2026-11-11T10:00:00.000000Z' })).toMatchObject({
      reapplyAvailableAt: '2026-10-19T10:00:00.000000Z',
      reapplyDerived: false,
    })
  })

  it('shows an unknown code as itself rather than hiding it', () => {
    expect(readApplicationDecline({ decline_reason_code: 'some_future_code', reapply_available_at: null }, 'en')).toEqual({
      code: 'some_future_code',
      reason: 'some_future_code',
      reapplyAvailableAt: null,
      reapplyDerived: false,
    })
  })
})
