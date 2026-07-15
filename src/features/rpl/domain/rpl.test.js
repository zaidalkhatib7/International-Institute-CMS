import { describe, expect, it } from 'vitest'
import {
  EVIDENCE_CATEGORIES,
  EVIDENCE_UPLOAD_POLICY,
  evidencePreviewKind,
  getApplicationEvidenceCategories,
  isEvidenceEligibleForAssessment,
  MAX_EVIDENCE_FILE_SIZE,
  readApplicationCompleteness,
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
