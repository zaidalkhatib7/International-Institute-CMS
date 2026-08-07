import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
  approveAcademicSchool,
  authorizeAcademicPackageGeneration,
  createAcademicPackage,
  createAcademicSchool,
  deleteAcademicPackage,
  fetchAcademicLibrary,
  fetchAcademicPackageAuthoring,
  importAcademicCompetencyFile,
  importAcademicPackageFile,
  inspectAcademicCompetencyFile,
  inspectAcademicPackageFile,
  publishAcademicPackage,
  regenerateAcademicPackageComponent,
  rejectAcademicPackageDraft,
  resolveAcademicPackageSourceFlag,
  revokeAcademicPackageGeneration,
  setAcademicPackageCompetencies,
  startAcademicPackageAuthoring,
  updateAcademicPackage,
} from './academicRplService'

/*
 * THE WIRE ITSELF, WHICH NOTHING ELSE TESTS.
 *
 * AcademicLibraryPage.test.jsx replaces this whole module with vi.mock, so its
 * 32 tests prove the page calls the right FUNCTION with the right arguments and
 * prove nothing at all about the URL that function builds. Mutation testing
 * confirmed it: pointing publishAcademicPackage at the dead
 * /academic-rpl/library/modules/{code}/publish left the entire suite green.
 *
 * That is not a hypothetical. It is exactly how this screen broke — the backend
 * renamed its endpoints, every call started returning 404, and no test noticed
 * because no test ever looked below the service boundary. A page-level mock is
 * the right tool for page behaviour and is structurally blind to this class of
 * defect.
 *
 * So this file mocks the HTTP CLIENT instead of the service, and asserts the
 * method, the path and the body of every request the library screen can make.
 * The paths below are transcribed from `php artisan route:list`, not from the
 * service under test — a test that reads its expectations out of the code it is
 * testing agrees with that code by construction.
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

describe('the academic library endpoints, as declared by the server', () => {
  test('the library is read from the collection root', async () => {
    await fetchAcademicLibrary()

    expect(http.get).toHaveBeenCalledWith('/academic-rpl/library')
  })

  test('a school is created at the schools collection', async () => {
    const payload = { code: 'LD', competency_prefix: 'LC', name: { en: 'Leadership' } }
    await createAcademicSchool(payload)

    expect(http.post).toHaveBeenCalledWith('/academic-rpl/library/schools', payload)
  })

  test('a school is approved by NUMERIC ID, because that route is whereNumber', async () => {
    await approveAcademicSchool(7, { basis: 'A written basis of sufficient length.' })

    // The packages routes bind by code and this one does not. Sending a code
    // here would not 404 loudly — it would fail route-model binding and come
    // back as a confusing 404 on an object that plainly exists.
    expect(http.post).toHaveBeenCalledWith(
      '/academic-rpl/library/schools/7/approve',
      { basis: 'A written basis of sufficient length.' },
    )
  })

  test('a package is created at the packages collection', async () => {
    const payload = { code: 'LD-001', academic_rpl_school_id: 3, name: { ar: 'حقيبة' } }
    await createAcademicPackage(payload)

    expect(http.post).toHaveBeenCalledWith('/academic-rpl/library/packages', payload)
  })

  test('a package is addressed by CODE, not by id, on update', async () => {
    await updateAcademicPackage('LD-001', { credit_hours: 12 })

    expect(http.put).toHaveBeenCalledWith('/academic-rpl/library/packages/LD-001', { credit_hours: 12 })
  })

  test('a package is addressed by code on delete', async () => {
    await deleteAcademicPackage('LD-001')

    expect(http.delete).toHaveBeenCalledWith('/academic-rpl/library/packages/LD-001')
  })

  test('publish posts to the code-addressed publish action', async () => {
    await publishAcademicPackage('LD-001')

    // The exact assertion the mutation test defeated before this file existed.
    expect(http.post).toHaveBeenCalledWith('/academic-rpl/library/packages/LD-001/publish')
  })

  test('the competency mapping is PUT with a required_level on every entry', async () => {
    const competencies = [
      { id: 4, required_level: 'professional_master', classification: 'core' },
      { id: 9, required_level: 'professional_diploma' },
    ]
    await setAcademicPackageCompetencies('LD-001', competencies)

    expect(http.put).toHaveBeenCalledWith(
      '/academic-rpl/library/packages/LD-001/competencies',
      { competencies },
    )
  })

  test('a package code is URL-encoded, so a stray character cannot rewrite the path', async () => {
    await publishAcademicPackage('LD-001/../schools')

    const [url] = http.post.mock.calls[0]

    // Percent-encoded rather than interpolated raw: a code carrying a slash
    // would otherwise address a different resource entirely.
    expect(url).toBe('/academic-rpl/library/packages/LD-001%2F..%2Fschools/publish')
    expect(url).not.toContain('/schools/')
  })
})

describe('the bulk JSON import endpoints', () => {
  const file = { spec_version: 'GPS-1.0' }

  test('inspecting a package file is a dry run at the inspect path', async () => {
    await inspectAcademicPackageFile(file)

    expect(http.post).toHaveBeenCalledWith('/academic-rpl/library/import/packages/inspect', { payload: file })
  })

  test('importing a package file posts to the import path', async () => {
    await importAcademicPackageFile(file)

    expect(http.post).toHaveBeenCalledWith('/academic-rpl/library/import/packages', { payload: file })
  })

  test('inspecting a competency bundle is a dry run at its own inspect path', async () => {
    await inspectAcademicCompetencyFile(file)

    expect(http.post).toHaveBeenCalledWith('/academic-rpl/library/import/competencies/inspect', { payload: file })
  })

  test('importing a competency bundle posts to its own import path', async () => {
    await importAcademicCompetencyFile(file)

    expect(http.post).toHaveBeenCalledWith('/academic-rpl/library/import/competencies', { payload: file })
  })

  test('the file is wrapped in a payload key, which is what the server validates', async () => {
    await importAcademicPackageFile(file)

    const [, body] = http.post.mock.calls[0]

    // The endpoint validates `payload` as required|array. Posting the document
    // bare would be refused as a missing field, not as a bad document.
    expect(body).toEqual({ payload: file })
    expect(body.payload).toBe(file)
  })
})

/*
 * THE AI AUTHORING ENDPOINTS.
 *
 * Transcribed from `php artisan route:list`, not from the service under test.
 * Two things here are easy to get wrong and impossible to catch anywhere else:
 *
 *   1. THE PREFIX. These are /api/v1/academic-rpl/library/packages/{code}/...
 *      with NO /admin segment. The professional pipeline's equivalents DO sit
 *      under an admin prefix, so a copy of that client would 404 on every call.
 *   2. THE SPLIT. Authorize and revoke hang off the package root
 *      (rpl.settings.manage); start, regenerate, source-flags and reject hang
 *      off /authoring (programs.manage). Sending an authorize to the /authoring
 *      path would start a run instead of authorizing one.
 */
describe('the AI package authoring endpoints, as declared by the server', () => {
  test('the authoring workspace is read from the package authoring path', async () => {
    await fetchAcademicPackageAuthoring('LD-001')

    expect(http.get).toHaveBeenCalledWith('/academic-rpl/library/packages/LD-001/authoring')
  })

  test('authorizing hangs off the package root, not off /authoring', async () => {
    const body = { note: 'The school council signed off the framework.', expires_at: '2026-08-20T10:00' }
    await authorizeAcademicPackageGeneration('LD-001', body)

    // Key one. Posting this to /authoring would START a run rather than permit
    // one — the same path, a different governed act, a different permission.
    expect(http.post).toHaveBeenCalledWith('/academic-rpl/library/packages/LD-001/authorize-generation', body)
  })

  test('withdrawing an authorization has its own action, and carries a reason', async () => {
    await revokeAcademicPackageGeneration('LD-001', { reason: 'Approval was rescinded by the council.' })

    expect(http.post).toHaveBeenCalledWith(
      '/academic-rpl/library/packages/LD-001/revoke-generation-authorization',
      { reason: 'Approval was rescinded by the council.' },
    )
  })

  test('starting a run posts to /authoring with a module count and the locale', async () => {
    await startAcademicPackageAuthoring('LD-001', { module_count: 8, locale: 'ar' })

    expect(http.post).toHaveBeenCalledWith(
      '/academic-rpl/library/packages/LD-001/authoring',
      { module_count: 8, locale: 'ar' },
    )
  })

  test('regeneration posts to the regenerate action with a module CODE as the ref', async () => {
    await regenerateAcademicPackageComponent('LD-001', { component: 'question_bank', ref: 'LD-001-M01' })

    // The ref is the module code, not a numeric id: the professional panel
    // parses an id out of its component_ref and the academic one must not.
    expect(http.post).toHaveBeenCalledWith(
      '/academic-rpl/library/packages/LD-001/authoring/regenerate',
      { component: 'question_bank', ref: 'LD-001-M01' },
    )
  })

  test('a source verdict posts to the source-flags action', async () => {
    const verdict = {
      artifact_id: 51,
      citation: 'Mintzberg (1979)',
      flag_id: 'sf_1',
      verification_status: 'VERIFIED_APPROVED',
      review_notes: 'Verified the title, publisher and year against the catalogue.',
    }
    await resolveAcademicPackageSourceFlag('LD-001', verdict)

    expect(http.post).toHaveBeenCalledWith(
      '/academic-rpl/library/packages/LD-001/authoring/source-flags',
      verdict,
    )
  })

  test('rejecting the draft is a DELETE on /authoring, not on the package', async () => {
    await rejectAcademicPackageDraft('LD-001')

    // DELETE on the package itself deletes the PACKAGE. This one removes only
    // the generated content and leaves the slot the academic authored.
    expect(http.delete).toHaveBeenCalledWith('/academic-rpl/library/packages/LD-001/authoring')
    expect(http.delete).not.toHaveBeenCalledWith('/academic-rpl/library/packages/LD-001')
  })

  test('the package code is URL-encoded on every authoring call too', async () => {
    await Promise.all([
      fetchAcademicPackageAuthoring('LD-001/../schools'),
      authorizeAcademicPackageGeneration('LD-001/../schools', {}),
      revokeAcademicPackageGeneration('LD-001/../schools', {}),
      startAcademicPackageAuthoring('LD-001/../schools', {}),
      regenerateAcademicPackageComponent('LD-001/../schools', {}),
      resolveAcademicPackageSourceFlag('LD-001/../schools', {}),
      rejectAcademicPackageDraft('LD-001/../schools'),
    ])

    const everyUrl = [
      ...http.get.mock.calls,
      ...http.post.mock.calls,
      ...http.delete.mock.calls,
    ].map(([url]) => url)

    expect(everyUrl).toHaveLength(7)

    for (const url of everyUrl) {
      expect(url).toContain('LD-001%2F..%2Fschools')
      expect(url).not.toContain('/schools/authoring')
    }
  })

  test('no authoring call is sent to an /admin prefix', async () => {
    await Promise.all([
      fetchAcademicPackageAuthoring('LD-001'),
      authorizeAcademicPackageGeneration('LD-001', {}),
      revokeAcademicPackageGeneration('LD-001', {}),
      startAcademicPackageAuthoring('LD-001', {}),
      regenerateAcademicPackageComponent('LD-001', {}),
      resolveAcademicPackageSourceFlag('LD-001', {}),
      rejectAcademicPackageDraft('LD-001'),
    ])

    /*
     * A blanket sweep rather than one assertion per function. The professional
     * routes DO carry an /admin segment, so the likeliest way this client breaks
     * is somebody copying one of those paths across — and a new call added later
     * is caught by a test nobody had to remember to write.
     */
    const everyUrl = [
      ...http.get.mock.calls,
      ...http.post.mock.calls,
      ...http.delete.mock.calls,
    ].map(([url]) => url)

    expect(everyUrl).toHaveLength(7)

    for (const url of everyUrl) {
      expect(url).not.toContain('/admin')
      expect(url.startsWith('/academic-rpl/library/packages/')).toBe(true)
    }
  })
})

describe('the removed module endpoints stay removed', () => {
  test('no library call anywhere addresses /modules', async () => {
    await Promise.all([
      fetchAcademicLibrary(),
      createAcademicPackage({}),
      updateAcademicPackage('LD-001', {}),
      deleteAcademicPackage('LD-001'),
      publishAcademicPackage('LD-001'),
      setAcademicPackageCompetencies('LD-001', []),
      inspectAcademicPackageFile({}),
      importAcademicPackageFile({}),
      fetchAcademicPackageAuthoring('LD-001'),
      startAcademicPackageAuthoring('LD-001', {}),
      regenerateAcademicPackageComponent('LD-001', {}),
    ])

    /*
     * A blanket sweep rather than one assertion per function, so a NEW library
     * call added later against the dead prefix is caught by a test nobody had
     * to remember to write.
     */
    const everyUrl = [
      ...http.get.mock.calls,
      ...http.post.mock.calls,
      ...http.put.mock.calls,
      ...http.delete.mock.calls,
    ].map(([url]) => url)

    expect(everyUrl.length).toBeGreaterThan(0)

    for (const url of everyUrl) {
      expect(url).not.toContain('/library/modules')
    }
  })
})
