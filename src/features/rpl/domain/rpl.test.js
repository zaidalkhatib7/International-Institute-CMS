import { describe, expect, it } from 'vitest'
import {
  APPLICATION_STATUS,
  DECLINE_CATEGORIES,
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
  readDeclineCategories,
  declineCategoryLabel,
  TIMELINE_EVENT_LABELS,
  timelineEventLabel,
  timelineEventTitle,
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
  it('labels every code the API can stamp, in Arabic and English', () => {
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
      expect(Object.keys(labels).sort()).toEqual(['ar', 'en'])
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

/*
 * THE INTERVIEW STATUS AND WHAT A DECLINED APPLICANT IS TOLD (owner flow of
 * 12 Oct 2026, P3).
 *
 * `interview_required` is labelled wherever a status is (badges, filters, the
 * controls list). The decline categories are applicant-facing and fixed (D8(b)):
 * the sentences below are transcribed from App\Enums\DeclineCategory, not from
 * the module under test, and they stand in whenever the reference data does not
 * send its own list.
 */
describe('the P3 status and the decline categories', () => {
  it('labels interview_required in Arabic and English', () => {
    expect(APPLICATION_STATUS.interview_required.labels).toEqual({ ar: 'مقابلة مطلوبة', en: 'Interview required' })
  })

  it('carries the four fixed categories word for word, in Arabic and English only', () => {
    expect(DECLINE_CATEGORIES).toEqual([
      { code: 'documents_not_verified', label: { ar: 'تعذّر التحقق من الوثائق المقدّمة.', en: 'The documents submitted could not be verified.' } },
      { code: 'experience_not_confirmed', label: { ar: 'تعذّر تأكيد الخبرة المهنية المذكورة.', en: 'The professional experience stated could not be confirmed.' } },
      { code: 'interview_not_attended', label: { ar: 'لم تُعقد المقابلة.', en: 'The interview did not take place.' } },
      { code: 'requirements_not_met', label: { ar: 'الطلب لا يستوفي متطلبات المسار.', en: 'The request does not meet the requirements of the pathway.' } },
    ])
  })

  it("prefers the server's list, and falls back to the fixed one when it sends none", () => {
    const sent = [{ code: 'documents_not_verified', label: { ar: 'نص الخادم', en: 'Server text' } }]
    expect(readDeclineCategories({ decline_categories: sent })).toEqual(sent)
    expect(readDeclineCategories({ decline_categories: [] })).toBe(DECLINE_CATEGORIES)
    expect(readDeclineCategories(null)).toBe(DECLINE_CATEGORIES)
    expect(declineCategoryLabel('interview_not_attended', 'ar')).toBe('لم تُعقد المقابلة.')
    expect(declineCategoryLabel('some_future_category', 'en')).toBe('some_future_category')
  })

  it('shows staff the sentence a declined applicant was given', () => {
    expect(readApplicationDecline({
      status: 'rejected',
      decline_reason_code: 'screening_declined',
      decline_applicant_category: 'documents_not_verified',
      reapply_available_at: '2026-10-21T10:00:00+00:00',
    }, 'en')).toEqual({
      code: 'screening_declined',
      reason: 'Declined after document screening',
      reapplyAvailableAt: '2026-10-21T10:00:00+00:00',
      reapplyDerived: false,
      applicantCategory: 'documents_not_verified',
      applicantCategoryLabel: 'The documents submitted could not be verified.',
    })
  })
})

/*
 * THE COURSE PLAN STATUSES (owner flow of 12 Oct 2026, P5): a draft course plan
 * awaits staff approval, then the approved plan is in force. Both are labelled
 * in Arabic and English, so the badge, the applications filter and the settings
 * list never show a raw code.
 */
describe('RPL course plan statuses', () => {
  it('labels both statuses in Arabic and English, right after assessment in progress', () => {
    expect(APPLICATION_STATUS.course_plan_review).toEqual({ variant: 'info', labels: { ar: 'مراجعة خطة الدورات', en: 'Course plan review' } })
    expect(APPLICATION_STATUS.course_plan_active).toEqual({ variant: 'success', labels: { ar: 'خطة الدورات سارية', en: 'Course plan active' } })
    const order = Object.keys(APPLICATION_STATUS)
    const start = order.indexOf('assessment_in_progress')
    expect(order.slice(start, start + 3)).toEqual(['assessment_in_progress', 'course_plan_review', 'course_plan_active'])
  })
})

/*
 * THE FINAL EXAM STATUS AND THE P6 TIMELINE (owner model of 15 Oct 2026). The
 * one new case status sits right after the course plan, labelled in Arabic and
 * English, and every status event of the contract (2.8) has a label in both.
 */
describe('the P6 status and timeline labels', () => {
  it('labels final_exam in Arabic and English, right after course_plan_active', () => {
    expect(APPLICATION_STATUS.final_exam).toEqual({ variant: 'info', labels: { ar: 'الاختبار النهائي', en: 'Final exam' } })
    const order = Object.keys(APPLICATION_STATUS)
    expect(order[order.indexOf('course_plan_active') + 1]).toBe('final_exam')
  })

  it('labels every P6 status event in Arabic and English only', () => {
    expect(Object.keys(TIMELINE_EVENT_LABELS)).toEqual(expect.arrayContaining([
      'charge.cancelled',
      'charge.paid',
      'charge.refunded',
      'course_plan.completed',
      'credential.issued',
      'experience_certificate.choice_changed',
      'experience_certificate.issued',
      'experience_certificate.refused',
      'experience_certificate.requested',
      'final_exam.passed',
      'final_exam.round_opened',
      'final_exam.try_scored',
    ]))
    for (const labels of Object.values(TIMELINE_EVENT_LABELS)) {
      expect(Object.keys(labels).sort()).toEqual(['ar', 'en'])
      expect(labels.ar.trim()).not.toBe('')
      expect(labels.en.trim()).not.toBe('')
    }
    expect(timelineEventLabel('course_plan.completed', 'en')).toBe('Course plan completed; the final exam is open')
    expect(timelineEventLabel('final_exam.passed', 'nl')).toBe('Final exam passed')
    expect(timelineEventLabel('something.else', 'en')).toBe('')
  })
})

/*
 * EVERY EVENT ON THE CASE TIMELINE IS NAMED (platform walk, 17 Oct 2026, UI-03).
 *
 * The label map knew only the twelve P6 events, so the Arabic and English
 * timelines of every professional case showed dotted codes for the rest:
 * application.created, administrative_review.started, screening_decision.recorded,
 * admin.assessment.started, course_plan.generated, application.declined, … This
 * is every event the API writes onto a case (rpl_status_events.event, the list
 * App\Support\RplApplicantView::TIMELINE governs, plus the administrator's
 * evidence correction).
 */
const API_TIMELINE_EVENTS = [
  'application.created', 'application.created_by_administrator', 'application.submitted', 'application.transitioned',
  'administrative_review.started', 'administrative_review.accepted', 'administrative_review.information_requested', 'administrative_review.rejected',
  'information_request.created', 'information_request.responded', 'information_request.closed',
  'evidence.clarification_requested', 'evidence.corrected_by_administrator', 'payment.reconciled', 'assessor.assigned',
  'admin.assessment.started', 'assessment.started', 'assessor.report_submitted', 'quality.review_completed', 'quality.rework_opened',
  'committee.decision_issued', 'appeal.window_opened', 'appeal.submitted', 'appeal.decided', 'appeal.remanded', 'appeal.reassigned',
  'decision.finalized', 'credential.issued',
  'interview.offered', 'interview.mode_chosen', 'interview.scheduled', 'interview.cancelled', 'interview.decided',
  'application.declined', 'screening_decision.recorded',
  'course_plan.generated', 'course_plan.approved', 'course_plan.amended', 'course_plan.discarded',
  'experience_certificate.requested', 'experience_certificate.choice_changed', 'experience_certificate.refused', 'experience_certificate.issued',
  'charge.paid', 'charge.cancelled', 'charge.refunded', 'course_plan.completed',
  'final_exam.round_opened', 'final_exam.try_scored', 'final_exam.passed',
]

describe('the case timeline names every event the API writes', () => {
  it.each(API_TIMELINE_EVENTS)('%s has an Arabic and an English label', (code) => {
    const ar = timelineEventLabel(code, 'ar')
    const en = timelineEventLabel(code, 'en')
    expect(ar).not.toBe('')
    expect(en).not.toBe('')
    expect(/[ء-ي]/.test(ar)).toBe(true)
    expect(ar).not.toMatch(/[a-z]+\.[a-z_]+/)
    expect(en).not.toContain('_')
  })

  it('names the status a generic transition moved the case to', () => {
    expect(timelineEventTitle({ event: 'application.transitioned', to_status: 'withdrawn' }, 'en')).toBe(`${TIMELINE_EVENT_LABELS['application.transitioned'].en}: ${APPLICATION_STATUS.withdrawn.labels.en}`)
    expect(timelineEventTitle({ event: 'application.declined' }, 'ar')).toBe(TIMELINE_EVENT_LABELS['application.declined'].ar)
    // The server's own title, when it sends one, still comes first; an unknown code is shown in words.
    expect(timelineEventTitle({ event: 'application.created', title: { ar: 'عنوان', en: 'Title' } }, 'en')).toBe('Title')
    expect(timelineEventTitle({ event: 'brand.new_event' }, 'en')).toBe('brand new event')
  })
})
