import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
  acknowledgeRplAiAdvisory,
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
