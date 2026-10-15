import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
  acknowledgeRplAiAdvisory,
  approveRplCertificateWording,
  approveRplExperienceCertificate,
  cancelRplCharge,
  confirmRplChargePayment,
  draftRplCertificateWording,
  fetchRplAfterQuizAttention,
  fetchRplCertificateWordings,
  fetchRplChargeQueue,
  fetchRplCharges,
  fetchRplExperienceCertificate,
  fetchRplExperienceCertificateQueue,
  fetchRplFinalExam,
  refundRplCharge,
  refuseRplExperienceCertificate,
  reopenRplFinalExamTry,
  updateRplCertificateWording,
  voidRplFinalExamTry,
  addRplCoursePlanItem,
  amendRplCoursePlan,
  approveRplCoursePlan,
  discardRplCoursePlan,
  fetchRplCoursePlan,
  fetchRplCoursePlanCatalogue,
  fetchRplCoursePlanVersion,
  generateRplCoursePlan,
  regenerateRplCoursePlan,
  removeRplCoursePlanItem,
  acknowledgeRplScreening,
  fetchRplScreenings,
  requestRplScreening,
  cancelRplInterview,
  completeRplInterview,
  declineRplApplication,
  decideRplInterview,
  fetchRplInterviews,
  fetchRplScreeningDecisions,
  markRplInterviewNoShow,
  offerRplInterview,
  recordRplScreeningDecision,
  scheduleRplCaseInterview,
  updateRplInterview,
  addDynamicAssessmentItem,
  approveAllDynamicAssessmentItems,
  approveDynamicAssessmentItem,
  cancelDynamicAssessment,
  createDynamicAssessment,
  fetchDynamicAssessment,
  fetchDynamicAssessments,
  fetchRplAssessment,
  fetchRplSettings,
  finalEvaluateDynamicAssessment,
  generateDynamicAssessmentDraft,
  generateRplAiAdvisory,
  regenerateDynamicAssessmentItem,
  reissueDynamicAssessment,
  rejectDynamicAssessmentItem,
  rescoreDynamicAssessment,
  saveRplAssessmentFindings,
  sendDynamicAssessment,
  updateDynamicAssessmentItem,
  updateRplSettings,
} from './rplService'

/*
 * THE WIRE ITSELF, WHICH NOTHING ELSE TESTS.
 *
 * The panel tests below this layer replace this whole module with vi.mock, so
 * they prove the screen calls the right FUNCTION with the right arguments and
 * prove nothing whatever about the URL that function builds. That blindness is
 * exactly how this screen broke before: the backend moved its endpoints, every
 * call started 404ing, and the suite stayed green because no test ever looked
 * below the service boundary.
 *
 * So this file mocks the HTTP CLIENT instead, and the paths are transcribed from
 * routes/api.php rather than from the service under test — a test that reads its
 * expectations out of the code it is testing agrees with that code by
 * construction.
 *
 * Two shapes in the dynamic-assessment family are easy to get wrong and cannot
 * be caught anywhere else:
 *
 *   1. THE SPLIT. Actions on the SET hang off /dynamic-assessments/{verification}
 *      (generate, approve-all, send, reissue, final-evaluation). Actions on ONE
 *      QUESTION hang off /dynamic-assessments/items/{item} — no verification
 *      segment at all. Sending an item action to the set path addresses a
 *      different record entirely, and {verification} is whereNumber, so an item
 *      id lands on somebody else's assessment rather than 404ing.
 *   2. REISSUE CARRIES A BODY. The server validates `reason` as required. Posting
 *      it bare returns a 422 about a missing field, which reads as a bug in the
 *      form rather than in the call.
 */

vi.mock('../../../services/http', () => ({
  http: {
    get: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    put: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    delete: vi.fn(() => Promise.resolve({ data: { data: {} } })),
  },
}))

const { http } = await import('../../../services/http')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the dynamic assessment endpoints, as declared by the server', () => {
  test('the list is filtered by rpl_assessment_id on the collection root', async () => {
    await fetchDynamicAssessments({ rpl_assessment_id: 12 })

    expect(http.get).toHaveBeenCalledWith('/admin/rpl/dynamic-assessments', {
      params: { rpl_assessment_id: 12 },
    })
  })

  test('a container is created from the ASSESSMENT id, not the verification id', async () => {
    await createDynamicAssessment(12)

    expect(http.post).toHaveBeenCalledWith('/admin/rpl/dynamic-assessments/from-assessment/12')
  })

  test('one assessment is read by verification id', async () => {
    await fetchDynamicAssessment(7)

    expect(http.get).toHaveBeenCalledWith('/admin/rpl/dynamic-assessments/7')
  })

  test('generation posts to the set, with the long AI timeout', async () => {
    await generateDynamicAssessmentDraft(7)

    const [url, body, options] = http.post.mock.calls[0]
    expect(url).toBe('/admin/rpl/dynamic-assessments/7/generate')
    expect(body).toEqual({})
    // Generation reads every applicant document and can take two minutes; the
    // default CMS budget aborts it and the admin sees a timeout, not a refusal.
    expect(options.timeout).toBe(5 * 60 * 1000)
  })

  test('approve-all and send hang off the set', async () => {
    await approveAllDynamicAssessmentItems(7)
    await sendDynamicAssessment(7)

    expect(http.post).toHaveBeenNthCalledWith(1, '/admin/rpl/dynamic-assessments/7/approve-all')
    expect(http.post).toHaveBeenNthCalledWith(2, '/admin/rpl/dynamic-assessments/7/send')
  })

  test('reissue posts the required reason to the set-level action', async () => {
    await reissueDynamicAssessment(7, { reason: 'The applicant lost connection mid-window.' })

    expect(http.post).toHaveBeenCalledWith('/admin/rpl/dynamic-assessments/7/reissue', {
      reason: 'The applicant lost connection mid-window.',
    })
  })

  test('reissue of an opened set carries the technical failure reason beside the reason (owner, 12 Oct 2026)', async () => {
    // One attempt only: the server refuses to reopen an opened set (422 errors.set)
    // unless the body carries technical_failure_reason, which it audits.
    await reissueDynamicAssessment(7, {
      reason: 'Platform outage.',
      technical_failure_reason: 'The platform was unavailable from 10:05 to 10:40.',
    })

    expect(http.post).toHaveBeenCalledWith('/admin/rpl/dynamic-assessments/7/reissue', {
      reason: 'Platform outage.',
      technical_failure_reason: 'The platform was unavailable from 10:05 to 10:40.',
    })
  })

  test('marking a referred entry quiz again posts the reason to its own set-level action (P4)', async () => {
    // routes/api.php: POST dynamic-assessments/{verification}/rescore. It is not
    // reissue: the applicant's frozen answers are marked again, nothing reopens.
    await rescoreDynamicAssessment(7, { reason: 'The pass mark setting was restored.' })

    expect(http.post).toHaveBeenCalledWith('/admin/rpl/dynamic-assessments/7/rescore', {
      reason: 'The pass mark setting was restored.',
    })
  })

  test('reissue is NOT the send route — reopening must not re-deliver a new set', async () => {
    await reissueDynamicAssessment(7, { reason: 'x' })

    const [url] = http.post.mock.calls[0]
    expect(url).toContain('/reissue')
    expect(url).not.toContain('/send')
    expect(url).not.toContain('/generate')
  })

  test('withdrawal posts the required reason to its own set-level action', async () => {
    // The escape hatch for a case an applicant will never finish. It is not
    // reissue and it is not send: reaching the wrong one of the three would
    // either re-deliver the set or renew a timer on an abandoned case.
    await cancelDynamicAssessment(7, { reason: 'The applicant withdrew and will not answer.' })

    expect(http.post).toHaveBeenCalledWith('/admin/rpl/dynamic-assessments/7/cancel', {
      reason: 'The applicant withdrew and will not answer.',
    })
  })

  test('the final evaluation posts to the set with the long AI timeout', async () => {
    await finalEvaluateDynamicAssessment(7)

    const [url, body, options] = http.post.mock.calls[0]
    expect(url).toBe('/admin/rpl/dynamic-assessments/7/final-evaluation')
    expect(body).toEqual({})
    expect(options.timeout).toBe(5 * 60 * 1000)
  })

  test('a manual item is added under the SET, because it belongs to that set', async () => {
    const payload = { type: 'analytical', prompt: { generated: 'Describe…' } }
    await addDynamicAssessmentItem(7, payload)

    expect(http.post).toHaveBeenCalledWith('/admin/rpl/dynamic-assessments/7/items', payload)
  })

  test('every single-item action is addressed under /items/{item}, with no verification segment', async () => {
    await updateDynamicAssessmentItem(41, { prompt: { generated: 'Edited' } })
    await approveDynamicAssessmentItem(41)
    await rejectDynamicAssessmentItem(41)
    await regenerateDynamicAssessmentItem(41)

    expect(http.put).toHaveBeenCalledWith('/admin/rpl/dynamic-assessments/items/41', {
      prompt: { generated: 'Edited' },
    })
    expect(http.post).toHaveBeenNthCalledWith(1, '/admin/rpl/dynamic-assessments/items/41/approve')
    expect(http.post).toHaveBeenNthCalledWith(2, '/admin/rpl/dynamic-assessments/items/41/reject', {})
    expect(http.post).toHaveBeenNthCalledWith(
      3,
      '/admin/rpl/dynamic-assessments/items/41/regenerate',
      {},
      { timeout: 5 * 60 * 1000 },
    )

    /*
     * A blanket sweep as well as the four assertions, so a NEW item action added
     * later against the set path is caught by a test nobody had to remember to
     * write. {verification} is whereNumber: an item id sent there resolves to a
     * different assessment instead of failing loudly.
     */
    const everyUrl = [...http.put.mock.calls, ...http.post.mock.calls].map(([url]) => url)
    for (const url of everyUrl) {
      expect(url).toContain('/dynamic-assessments/items/41')
    }
  })
})

describe('the advisory and findings endpoints the same screen calls', () => {
  test('the assessment is read by id under the admin prefix', async () => {
    await fetchRplAssessment(12)

    expect(http.get).toHaveBeenCalledWith('/admin/rpl/assessments/12')
  })

  test('generating an advisory posts to the assessment’s ai-advisories collection', async () => {
    await generateRplAiAdvisory(12, { assessor_question: null })

    const [url, body, options] = http.post.mock.calls[0]
    expect(url).toBe('/admin/rpl/assessments/12/ai-advisories')
    expect(body).toEqual({ assessor_question: null })
    expect(options.timeout).toBe(5 * 60 * 1000)
  })

  test('acknowledging addresses the ADVISORY id, not the assessment id', async () => {
    await acknowledgeRplAiAdvisory(99)

    // Different resource, different root. Sending the assessment id here would
    // acknowledge whichever advisory happens to carry that number.
    expect(http.post).toHaveBeenCalledWith('/admin/rpl/ai-advisories/99/acknowledge')
  })

  test('findings are PUT, and carry the ai_prefill provenance the audit reads', async () => {
    const payload = {
      findings: [],
      ai_prefill: { advisory_id: 5, criterion_ids: [1, 2] },
    }
    await saveRplAssessmentFindings(12, payload)

    expect(http.put).toHaveBeenCalledWith('/admin/rpl/assessments/12/findings', payload)
  })
})

/*
 * DOCUMENT SCREENING (owner flow of 12 Oct 2026, P2). Transcribed from the
 * admin contract, not from the service: the list and the re-run hang off the
 * CASE (bound by public_id); acknowledge hangs off the SCREENING's own
 * public_id, under its own root.
 */
describe('the document screening endpoints', () => {
  test('the screens are listed under the case', async () => {
    await fetchRplScreenings('9a1c0d6e-case')

    expect(http.get).toHaveBeenCalledWith('/admin/rpl/applications/9a1c0d6e-case/screenings')
  })

  test('a re-run posts to the same collection, with no body and the normal timeout', async () => {
    // The request only queues the job; the model runs on the worker.
    await requestRplScreening('9a1c0d6e-case')

    expect(http.post).toHaveBeenCalledWith('/admin/rpl/applications/9a1c0d6e-case/screenings')
    expect(http.post.mock.calls[0]).toHaveLength(1)
  })

  test('acknowledging addresses the SCREENING, not the case', async () => {
    await acknowledgeRplScreening('5f2e-screening')

    expect(http.post).toHaveBeenCalledWith('/admin/rpl/screenings/5f2e-screening/acknowledge')
  })
})

describe('the RPL settings endpoint the configuration screen writes through', () => {
  test('settings are read from the collection root', async () => {
    await fetchRplSettings()

    expect(http.get).toHaveBeenCalledWith('/admin/rpl/settings')
  })

  test('the evidence-documents kill switch is PUT to the same root', async () => {
    /*
     * The switch that decides whether the applicant's own files leave the
     * platform for Gemini. The configuration screen's own tests replace this
     * module wholesale, so a wrong verb or path here would 404 in silence and
     * the administrator would believe they had turned document reading off.
     */
    await updateRplSettings({ rpl_advisory_include_evidence_documents: false })

    expect(http.put).toHaveBeenCalledWith('/admin/rpl/settings', {
      rpl_advisory_include_evidence_documents: false,
    })
  })
})

/*
 * THE DECISION, INTERVIEW AND DECLINE ROUTES (owner flow of 12 Oct 2026, P3).
 *
 * Transcribed from the P3 contract, not from the service: the case is addressed
 * by public_id under /admin/rpl/applications, an interview by its numeric id
 * under /admin/rpl/interviews, and each step has its own POST. The panels mock
 * this module, so a wrong path here would 404 with every panel test green.
 */
describe('the P3 decision, interview and decline endpoints', () => {
  test('the decisions are read under the case, and one is recorded with its body', async () => {
    await fetchRplScreeningDecisions('9a1c0d6e-case')
    expect(http.get).toHaveBeenCalledWith('/admin/rpl/applications/9a1c0d6e-case/screening-decisions')

    const body = { decision: 'pass_to_quiz', rationale: 'All required evidence is verified.' }
    await recordRplScreeningDecision('9a1c0d6e-case', body)
    expect(http.post).toHaveBeenCalledWith('/admin/rpl/applications/9a1c0d6e-case/screening-decision', body)
  })

  test('a decline posts the category and the rationale to the case', async () => {
    const body = { decline_category: 'documents_not_verified', rationale: 'The employer letter could not be verified.' }
    await declineRplApplication('9a1c0d6e-case', body)

    expect(http.post).toHaveBeenCalledWith('/admin/rpl/applications/9a1c0d6e-case/decline', body)
  })

  test('interviews are listed and offered under the case', async () => {
    await fetchRplInterviews('9a1c0d6e-case')
    expect(http.get).toHaveBeenCalledWith('/admin/rpl/applications/9a1c0d6e-case/interviews')

    const body = { offered_modes: ['online', 'in_person'], offer_message: 'Please choose.' }
    await offerRplInterview('9a1c0d6e-case', body)
    expect(http.post).toHaveBeenCalledWith('/admin/rpl/applications/9a1c0d6e-case/interviews', body)
  })

  test('each interview step addresses the INTERVIEW, not the case', async () => {
    const schedule = { scheduled_at: '2030-11-02T08:30:00.000Z', location_or_url: 'https://meet.example.org/rpl', mode: 'online' }
    await scheduleRplCaseInterview(15, schedule)
    expect(http.post).toHaveBeenCalledWith('/admin/rpl/interviews/15/schedule', schedule)

    await completeRplInterview(15, { notes: 'Held.', minutes_media_id: 55 })
    expect(http.post).toHaveBeenCalledWith('/admin/rpl/interviews/15/complete', { notes: 'Held.', minutes_media_id: 55 })

    await cancelRplInterview(15, { reason: 'Withdrawn.' })
    expect(http.post).toHaveBeenCalledWith('/admin/rpl/interviews/15/cancel', { reason: 'Withdrawn.' })

    await decideRplInterview(15, { decision: 'decline', rationale: 'Did not attend twice.', decline_category: 'interview_not_attended' })
    expect(http.post).toHaveBeenCalledWith('/admin/rpl/interviews/15/decision', { decision: 'decline', rationale: 'Did not attend twice.', decline_category: 'interview_not_attended' })
  })

  test('a no-show posts with no body', async () => {
    await markRplInterviewNoShow(15)

    expect(http.post).toHaveBeenCalledWith('/admin/rpl/interviews/15/no-show')
    expect(http.post.mock.calls[0]).toHaveLength(1)
  })

  test("a legacy interview's outcome still goes through the assessment-era update", async () => {
    await updateRplInterview(4, { status: 'completed', outcome: 'Confirmed.' })

    expect(http.put).toHaveBeenCalledWith('/admin/rpl/interviews/4', { status: 'completed', outcome: 'Confirmed.' })
  })
})

/*
 * THE GOVERNED COURSE PLAN (owner flow of 12 Oct 2026, P5). Transcribed from the
 * P5 contract (routes R1-R10 under /api/v1/admin/rpl), not from the service: the
 * case hangs off /applications/{public_id}/course-plan; a plan version is
 * addressed by its own public_id under /course-plans; an item by its id under
 * its plan. Only generate and regenerate call Gemini, so only they take the AI
 * timeout, and the item removal carries its body on the DELETE.
 */
describe('the course plan endpoints', () => {
  test('the overview and the picker catalogue are read under the case', async () => {
    await fetchRplCoursePlan('case-41')
    await fetchRplCoursePlanCatalogue('case-41')

    expect(http.get).toHaveBeenNthCalledWith(1, '/admin/rpl/applications/case-41/course-plan')
    expect(http.get).toHaveBeenNthCalledWith(2, '/admin/rpl/applications/case-41/course-plan/catalogue')
  })

  test('one version is read by the plan public_id', async () => {
    await fetchRplCoursePlanVersion('plan-1')

    expect(http.get).toHaveBeenCalledWith('/admin/rpl/course-plans/plan-1')
  })

  test('generation posts the locale under the case, with the long AI timeout', async () => {
    await generateRplCoursePlan('case-41', { locale: 'ar' })

    const [url, body, options] = http.post.mock.calls[0]
    expect(url).toBe('/admin/rpl/applications/case-41/course-plan/generate')
    expect(body).toEqual({ locale: 'ar' })
    expect(options.timeout).toBe(5 * 60 * 1000)
  })

  test('regeneration posts the lock_version, the reason and the locale to the draft, with the long AI timeout', async () => {
    await regenerateRplCoursePlan('plan-1', { lock_version: 3, reason: 'The client sent a new letter.', locale: 'en' })

    const [url, body, options] = http.post.mock.calls[0]
    expect(url).toBe('/admin/rpl/course-plans/plan-1/regenerate')
    expect(body).toEqual({ lock_version: 3, reason: 'The client sent a new letter.', locale: 'en' })
    expect(options.timeout).toBe(5 * 60 * 1000)
  })

  test('every other write posts its body to the plan, with the normal timeout', async () => {
    await addRplCoursePlanItem('plan-1', { lock_version: 3, program_id: 43, reason: 'Already certified elsewhere.' })
    await approveRplCoursePlan('plan-1', { lock_version: 4, below_minimum_reason: 'The library holds no more.' })
    await amendRplCoursePlan('plan-1', { lock_version: 5, reason: 'The client asked for a swap.' })
    await discardRplCoursePlan('plan-2', { lock_version: 1, reason: 'Drafted against the wrong level.' })

    expect(http.post.mock.calls).toEqual([
      ['/admin/rpl/course-plans/plan-1/items', { lock_version: 3, program_id: 43, reason: 'Already certified elsewhere.' }],
      ['/admin/rpl/course-plans/plan-1/approve', { lock_version: 4, below_minimum_reason: 'The library holds no more.' }],
      ['/admin/rpl/course-plans/plan-1/amend', { lock_version: 5, reason: 'The client asked for a swap.' }],
      ['/admin/rpl/course-plans/plan-2/discard', { lock_version: 1, reason: 'Drafted against the wrong level.' }],
    ])
  })

  test('removing an item sends its reason and lock_version as the DELETE body, under its plan', async () => {
    await removeRplCoursePlanItem('plan-1', 11, { lock_version: 3, reason: 'Already certified elsewhere.' })

    expect(http.delete).toHaveBeenCalledWith('/admin/rpl/course-plans/plan-1/items/11', {
      data: { lock_version: 3, reason: 'Already certified elsewhere.' },
    })
  })
})

/*
 * AFTER THE ENTRY QUIZ (owner model of 15 Oct 2026, P6). Transcribed from the
 * P6 contract (S1-S17 under /api/v1/admin/rpl), not from the service: a charge
 * and an experience certificate by public_id, a wording by id, a final-exam try
 * by its verification id, the case by public_id. Nothing here calls Gemini, so
 * nothing takes the AI timeout.
 */
describe('the P6 endpoints', () => {
  test('the charges: the case list, the queue with its filters, and the three writes', async () => {
    await fetchRplCharges('case-41')
    await fetchRplChargeQueue({ status: 'pending', type: 'final_exam_retake' })
    await confirmRplChargePayment('charge-1', { lock_version: 2, method: 'bank_transfer', reference: 'TRX-1', paid_at: '2026-10-14', amount_received: '150.00', currency_received: 'EUR' })
    await cancelRplCharge('charge-1', { lock_version: 3, reason: 'No transfer arrived.', category: 'payment_not_found' })
    await refundRplCharge('charge-2', { lock_version: 1, reason: 'Paid twice by mistake.' })

    expect(http.get.mock.calls).toEqual([
      ['/admin/rpl/applications/case-41/charges'],
      ['/admin/rpl/charges', { params: { status: 'pending', type: 'final_exam_retake' } }],
    ])
    expect(http.post.mock.calls).toEqual([
      ['/admin/rpl/charges/charge-1/confirm-payment', { lock_version: 2, method: 'bank_transfer', reference: 'TRX-1', paid_at: '2026-10-14', amount_received: '150.00', currency_received: 'EUR' }],
      ['/admin/rpl/charges/charge-1/cancel', { lock_version: 3, reason: 'No transfer arrived.', category: 'payment_not_found' }],
      ['/admin/rpl/charges/charge-2/refund', { lock_version: 1, reason: 'Paid twice by mistake.' }],
    ])
  })

  test('the experience certificate: the case overview, the queue, approve and refuse', async () => {
    await fetchRplExperienceCertificate('case-41')
    await fetchRplExperienceCertificateQueue({ status: 'requested' })
    await approveRplExperienceCertificate('cert-1', { lock_version: 4 })
    await refuseRplExperienceCertificate('cert-1', { lock_version: 5, reason: 'The transfer was reversed.', category: 'payment_not_verified' })

    expect(http.get.mock.calls).toEqual([
      ['/admin/rpl/applications/case-41/experience-certificate'],
      ['/admin/rpl/experience-certificates', { params: { status: 'requested' } }],
    ])
    expect(http.post.mock.calls).toEqual([
      ['/admin/rpl/experience-certificates/cert-1/approve', { lock_version: 4 }],
      ['/admin/rpl/experience-certificates/cert-1/refuse', { lock_version: 5, reason: 'The transfer was reversed.', category: 'payment_not_verified' }],
    ])
  })

  test('the wording: listed by code, drafted, a draft updated with PUT, and approved', async () => {
    await fetchRplCertificateWordings('rpl_experience_confirmation')
    await draftRplCertificateWording({ code: 'rpl_experience_confirmation', title: { ar: 'ع', en: 'T' }, body: { ar: 'ن', en: 'B' } })
    await updateRplCertificateWording(7, { lock_version: 2, title: { ar: 'ع', en: 'T' }, body: { ar: 'ن', en: 'B' } })
    await approveRplCertificateWording(7, { lock_version: 3, approval_note: 'Approved by the owner.' })

    expect(http.get).toHaveBeenCalledWith('/admin/rpl/certificate-wordings', { params: { code: 'rpl_experience_confirmation' } })
    expect(http.post.mock.calls).toEqual([
      ['/admin/rpl/certificate-wordings', { code: 'rpl_experience_confirmation', title: { ar: 'ع', en: 'T' }, body: { ar: 'ن', en: 'B' } }],
      ['/admin/rpl/certificate-wordings/7/approve', { lock_version: 3, approval_note: 'Approved by the owner.' }],
    ])
    expect(http.put).toHaveBeenCalledWith('/admin/rpl/certificate-wordings/7', { lock_version: 2, title: { ar: 'ع', en: 'T' }, body: { ar: 'ن', en: 'B' } })
  })

  test('the final exam: the case view, void and reopen a try by verification id, and the attention list', async () => {
    await fetchRplFinalExam('case-41')
    await voidRplFinalExamTry(88, { reason: 'Snapshot hash mismatch after a deploy.' })
    await reopenRplFinalExamTry(89, { reason: 'The client lost the connection at 10:05.' })
    await fetchRplAfterQuizAttention()

    expect(http.get.mock.calls).toEqual([
      ['/admin/rpl/applications/case-41/final-exam'],
      ['/admin/rpl/after-quiz/attention'],
    ])
    expect(http.post.mock.calls).toEqual([
      ['/admin/rpl/final-exam/tries/88/void', { reason: 'Snapshot hash mismatch after a deploy.' }],
      ['/admin/rpl/final-exam/tries/89/reopen', { reason: 'The client lost the connection at 10:05.' }],
    ])
  })
})
