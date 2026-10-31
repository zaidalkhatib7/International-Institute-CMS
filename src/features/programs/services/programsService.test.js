import { beforeEach, describe, expect, test, vi } from 'vitest'

import { resolveAiPackageSource, resolveAiPackageSourcesBulk } from './programsService'

/*
 * THE WIRE OF THE SOURCE VERDICTS, WHICH THE PANEL TESTS CANNOT SEE.
 *
 * AiPackagePanel's tests replace this module with vi.mock, so they prove the
 * panel calls the right function with the right arguments and nothing about
 * the request that function sends. This file mocks the HTTP client instead and
 * pins the path and body of the one-by-one verdict and of the one verdict for
 * many references (owner, 31 Oct 2026), as the server declares them:
 * POST /admin/programs/{id}/ai-package/resolve-source and
 * POST /admin/programs/{id}/ai-package/resolve-sources-bulk.
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

describe('the source verdict endpoints of the AI package', () => {
  test('one verdict for many references posts the run, the verdict, the basis and the references', async () => {
    const answer = {
      message: 'Source verdict VERIFIED_APPROVED recorded on 2 reference(s) at once.',
      data: { recorded: 2, bulk_review_id: '6f1c2b8e-4d3a-4f6b-9c1d-2e7a5b9c0d14', verification_status: 'VERIFIED_APPROVED', artifacts: [] },
    }
    http.post.mockResolvedValueOnce({ data: answer })
    const flags = [
      { artifact_id: 501, flag_id: 'sf_101', citation: 'ISO 9001:2015' },
      { artifact_id: 501, flag_id: null, citation: 'Kotter, Leading Change (1996)' },
    ]

    const result = await resolveAiPackageSourcesBulk(77, 31, 'VERIFIED_APPROVED', 'Checked every citation against the issuer catalogue.', flags)

    expect(http.post).toHaveBeenCalledTimes(1)
    expect(http.post).toHaveBeenCalledWith('/admin/programs/77/ai-package/resolve-sources-bulk', {
      run_id: 31,
      verification_status: 'VERIFIED_APPROVED',
      review_notes: 'Checked every citation against the issuer catalogue.',
      flags,
    })
    expect(result).toEqual(answer)
  })

  test('the one-by-one verdict still posts to its own endpoint', async () => {
    await resolveAiPackageSource(77, 501, 'ISO 9001:2015', 'REJECTED', 'No such edition under this issuer.')

    expect(http.post).toHaveBeenCalledWith('/admin/programs/77/ai-package/resolve-source', {
      artifact_id: 501,
      citation: 'ISO 9001:2015',
      verification_status: 'REJECTED',
      review_notes: 'No such edition under this issuer.',
    })
  })
})
