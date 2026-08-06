import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AcademicLibraryPage, { COPY } from './AcademicLibraryPage'

/*
 * The academic gap library — the screen that decides what any gap plan is able
 * to recommend.
 *
 * WHY THIS FILE EXISTS AT ALL. There was no test here, and that is the direct
 * reason the screen broke silently when the Golden Specification renamed the
 * API: every /modules call started 404ing, school creation started 422ing for a
 * missing competency_prefix, and the readiness panel went on rendering
 * plausible numbers off keys the server had stopped sending. Nothing failed
 * loudly. So these tests are pinned to the things that were wrong:
 *
 *   - packages are addressed by CODE (LD-001), never a numeric id
 *   - a school carries TWO codes and both are sent
 *   - a competency mapping carries a required_level per competency
 *   - a publish refusal renders the sentence for ITS error code, not a toast
 *   - an inspection that finds errors is a SUCCESS, and warnings are not errors
 *   - every key exists in all three language blocks
 */

const mocks = vi.hoisted(() => ({
  fetchAcademicLibrary: vi.fn(),
  createAcademicSchool: vi.fn(),
  approveAcademicSchool: vi.fn(),
  createAcademicPackage: vi.fn(),
  updateAcademicPackage: vi.fn(),
  setAcademicPackageCompetencies: vi.fn(),
  publishAcademicPackage: vi.fn(),
  deleteAcademicPackage: vi.fn(),
  inspectAcademicPackageFile: vi.fn(),
  importAcademicPackageFile: vi.fn(),
  inspectAcademicCompetencyFile: vi.fn(),
  importAcademicCompetencyFile: vi.fn(),
}))

// The page reads the admin language from storage, which is Arabic by default.
// Pinned to English so the assertions read as the copy they are checking.
vi.mock('../../../services/languageStorage', () => ({ getAdminLanguage: () => 'en' }))

vi.mock('../services/academicRplService', () => mocks)

function library(overrides = {}) {
  return {
    data: {
      schools: [
        {
          id: 1,
          code: 'LD',
          competency_prefix: 'LC',
          name: { en: 'Leadership and management' },
          status: 'approved',
          sort_order: 1,
          packages_count: 1,
        },
        {
          id: 2,
          // RI/REC — one of the seven schools where the two codes differ, which
          // is the whole reason the prefix is entered rather than derived.
          code: 'RI',
          competency_prefix: 'REC',
          name: { en: 'Research and innovation' },
          status: 'draft',
          sort_order: 2,
          packages_count: 0,
        },
      ],
      packages: [
        {
          id: 11,
          code: 'LD-001',
          name: { en: 'Strategic leadership' },
          slug: 'ld-001',
          status: 'draft',
          qualification_level: 'professional_master',
          academic_path: 'professional_master',
          credit_hours: 6,
          learning_hours: 150,
          version: '1.0',
          serves_diploma: false,
          serves_master: true,
          serves_doctorate: false,
          academic_rpl_school_id: 1,
          school: { code: 'LD', name: { en: 'Leadership and management' } },
          modules_count: 2,
          modules: [
            { id: 101, code: 'LD-001-M1', name: { en: 'Reading the strategic field' }, status: 'draft', sequence: 1 },
            { id: 102, code: 'LD-001-M2', name: { en: 'Deciding under contest' }, status: 'published', sequence: 2 },
          ],
          competencies: [
            {
              id: 5,
              code: 'LC-001',
              name: { en: 'Strategic judgement' },
              status: 'approved',
              is_placeholder: false,
              pivot: { required_level: 'professional_master', classification: 'core', weight: 40 },
            },
          ],
        },
      ],
      competencies: [
        { id: 5, code: 'LC-001', name: { en: 'Strategic judgement' }, status: 'approved', is_placeholder: false },
        { id: 9, code: 'LC-901', name: { en: 'Unauthored stand-in' }, status: 'draft', is_placeholder: true },
      ],
      tracks: [{ id: 2, code: 'professional_master', name: { en: 'Professional Master' }, rank: 2 }],
      readiness: {
        schools_total: 2,
        schools_approved: 1,
        packages_total: 1,
        packages_published: 0,
        packages_declaring_none: 0,
        modules_total: 2,
        modules_published: 1,
        competencies_with_no_package: ['LC-901'],
      },
      ...overrides,
    },
  }
}

function refusal(code) {
  return { response: { status: 422, data: { error: code, message: 'Refused.' } } }
}

function report(overrides = {}) {
  return {
    valid: true,
    schema_errors: [],
    referential_errors: [],
    warnings: [],
    summary: { package_code: 'LD-002', modules: 4 },
    ...overrides,
  }
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
  mocks.fetchAcademicLibrary.mockResolvedValue(library())
  mocks.createAcademicSchool.mockResolvedValue({ data: {} })
  mocks.approveAcademicSchool.mockResolvedValue({ data: {} })
  mocks.createAcademicPackage.mockResolvedValue({ data: {} })
  mocks.updateAcademicPackage.mockResolvedValue({ data: {} })
  mocks.setAcademicPackageCompetencies.mockResolvedValue({ data: {} })
  mocks.publishAcademicPackage.mockResolvedValue({ data: {} })
  mocks.deleteAcademicPackage.mockResolvedValue({ data: {} })
  mocks.inspectAcademicPackageFile.mockResolvedValue({ data: report() })
  mocks.importAcademicPackageFile.mockResolvedValue({ data: report() })
  mocks.inspectAcademicCompetencyFile.mockResolvedValue({ data: report() })
  mocks.importAcademicCompetencyFile.mockResolvedValue({ data: report() })
})

describe('AcademicLibraryPage', () => {
  it('renders the schools, packages and competencies the payload carries', async () => {
    render(<AcademicLibraryPage />)

    expect((await screen.findAllByText('Leadership and management')).length).toBeGreaterThan(0)
    expect(screen.getByText('Research and innovation')).toBeInTheDocument()
    expect(screen.getByText('Strategic leadership')).toBeInTheDocument()
    expect(screen.getByText('LD-001')).toBeInTheDocument()
    expect(screen.getByText('Strategic judgement')).toBeInTheDocument()
    expect(screen.getByText('Unauthored stand-in')).toBeInTheDocument()
  })

  it('shows both of a school’s codes and explains that they are different codes', async () => {
    render(<AcademicLibraryPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Add a knowledge school/ }))

    // Not a code comment: the person entering their first school reads it here.
    expect(await screen.findByText(/two codes, and they are not the same code/)).toBeInTheDocument()
    expect(screen.getByText(/LD gives LD-001/)).toBeInTheDocument()
    expect(screen.getByText(/the same school is LC/)).toBeInTheDocument()
    expect(screen.getByText(/seven of the twelve schools/)).toBeInTheDocument()
  })

  it('sends BOTH the school code and the competency prefix when creating a school', async () => {
    render(<AcademicLibraryPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Add a knowledge school/ }))

    fireEvent.change(screen.getByLabelText(/School code/), { target: { value: 'HS' } })
    fireEvent.change(screen.getByLabelText(/Competency prefix/), { target: { value: 'HSC' } })
    fireEvent.change(screen.getByLabelText(/Name \(English\)/), { target: { value: 'Health sciences' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    // The missing competency_prefix is what 422'd every school creation.
    await waitFor(() =>
      expect(mocks.createAcademicSchool).toHaveBeenCalledWith({
        code: 'HS',
        competency_prefix: 'HSC',
        name: { en: 'Health sciences' },
      }),
    )
  })

  it('never derives one school code from the other', async () => {
    render(<AcademicLibraryPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Add a knowledge school/ }))

    fireEvent.change(screen.getByLabelText(/School code/), { target: { value: 'LG' } })

    // LG + "C" would be right for four of the twelve schools and wrong for the
    // rest. Typing the school code must fill in nothing.
    expect(screen.getByLabelText(/Competency prefix/)).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('posts a new package with the id of the school it belongs to', async () => {
    render(<AcademicLibraryPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Add a package/ }))

    fireEvent.change(screen.getByLabelText(/Package code/), { target: { value: 'LD-002' } })
    fireEvent.change(screen.getByLabelText('Knowledge school'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/Name \(English\)/), { target: { value: 'Operational leadership' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.createAcademicPackage).toHaveBeenCalledTimes(1))
    expect(mocks.createAcademicPackage.mock.calls[0][0]).toMatchObject({
      code: 'LD-002',
      academic_rpl_school_id: 1,
      name: { en: 'Operational leadership' },
    })
  })

  it('sends a required_level for every competency the package requires, addressed by code', async () => {
    render(<AcademicLibraryPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Map competencies/ }))

    fireEvent.change(await screen.findByLabelText('Required level — LC-001'), {
      target: { value: 'professional_doctorate' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save mapping/ }))

    // required_level is mandatory per competency, and the old { id, coverage }
    // shape no longer exists at package level.
    await waitFor(() =>
      expect(mocks.setAcademicPackageCompetencies).toHaveBeenCalledWith('LD-001', [
        { id: 5, required_level: 'professional_doctorate', classification: 'core', weight: 40 },
      ]),
    )
  })

  it('omits a competency left unrequired rather than sending it with no level', async () => {
    render(<AcademicLibraryPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Map competencies/ }))

    // LC-901 is offered but left alone; only LC-001 carries a level.
    expect(await screen.findByLabelText('Required level — LC-901')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: /Save mapping/ }))

    await waitFor(() => expect(mocks.setAcademicPackageCompetencies).toHaveBeenCalledTimes(1))
    const [, rows] = mocks.setAcademicPackageCompetencies.mock.calls[0]
    expect(rows.map((row) => row.id)).toEqual([5])
  })

  it('publishes against the package CODE, not a numeric id', async () => {
    render(<AcademicLibraryPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }))

    await waitFor(() => expect(mocks.publishAcademicPackage).toHaveBeenCalledWith('LD-001'))
  })

  it('edits and deletes against the package CODE too', async () => {
    render(<AcademicLibraryPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Edit identity/ }))

    fireEvent.change(screen.getByLabelText(/Version/), { target: { value: '1.1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.updateAcademicPackage).toHaveBeenCalledTimes(1))
    expect(mocks.updateAcademicPackage.mock.calls[0][0]).toBe('LD-001')
  })

  const PUBLISH_REFUSALS = [
    ['ACADEMIC_PACKAGE_NO_SCHOOL', /article 7 requires every package to belong to a school/],
    ['ACADEMIC_PACKAGE_SCHOOL_NOT_APPROVED', /knowledge school is still a draft/],
    ['ACADEMIC_PACKAGE_DECLARES_NOTHING', /no gap plan could ever reach it/],
    ['ACADEMIC_PACKAGE_PLACEHOLDER_COMPETENCY', /reserved 9xx placeholder/],
    ['ACADEMIC_PACKAGE_HAS_NO_MODULES', /smallest assessable unit/],
  ]

  it.each(PUBLISH_REFUSALS)('answers %s with the sentence for that code', async (code, expected) => {
    mocks.publishAcademicPackage.mockRejectedValue(refusal(code))
    render(<AcademicLibraryPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }))

    // The server names its refusal so the author can be told what to fix. A
    // generic toast would throw away the only useful part of the answer.
    expect(await screen.findByText(expected)).toBeInTheDocument()
  })

  it('gives every named refusal its own sentence, in every language', () => {
    /*
     * Structural: if two codes are ever given the same copy, the author is back
     * to guessing which thing is wrong, which is the whole reason the server
     * names its refusals instead of returning one message.
     *
     * Asserted as a PROPERTY of the map rather than as a count. The map started
     * as the five publish codes and has since taken
     * ACADEMIC_SCHOOL_ALREADY_APPROVED, because school approval refuses in the
     * same shape and deserves the same treatment. A hard-coded length turns
     * every future addition into a failing test that says nothing about
     * correctness — what matters is that the five publish codes are all present
     * and that no two entries collide.
     */
    const publishCodes = PUBLISH_REFUSALS.map(([code]) => code)
    expect(publishCodes).toHaveLength(5)

    Object.entries(COPY).forEach(([language, block]) => {
      publishCodes.forEach((code) => {
        expect(block.publishErrors[code], `${language} is missing ${code}`).toBeTruthy()
      })

      const sentences = Object.values(block.publishErrors)
      expect(new Set(sentences).size, `${language} reuses one sentence for two codes`)
        .toBe(sentences.length)
    })
  })

  it('falls back to the server message for a refusal code it has never seen', async () => {
    mocks.publishAcademicPackage.mockRejectedValue({
      response: { status: 422, data: { error: 'ACADEMIC_PACKAGE_SOMETHING_NEW', message: 'A newly added gate.' } },
    })
    render(<AcademicLibraryPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }))

    expect(await screen.findByText(/A newly added gate/)).toBeInTheDocument()
  })

  it('shows the modules read-only, because they arrive with the JSON', async () => {
    render(<AcademicLibraryPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Show modules/ }))

    expect(await screen.findByText('Reading the strategic field')).toBeInTheDocument()
    expect(screen.getByText('Deciding under contest')).toBeInTheDocument()
    expect(screen.getByText(/Modules are authored in the package JSON/)).toBeInTheDocument()
    // Nothing on this screen authors module content any more.
    expect(screen.queryByRole('button', { name: /Add a module/i })).not.toBeInTheDocument()
  })

  it('marks a placeholder competency, because a package requiring one can never publish', async () => {
    render(<AcademicLibraryPage />)

    expect((await screen.findAllByText('Placeholder')).length).toBeGreaterThan(0)
    expect(screen.getByText(/can never be published/)).toBeInTheDocument()
  })

  it('reads the new readiness keys and says what the work is where a number is zero', async () => {
    render(<AcademicLibraryPage />)

    expect(await screen.findByText(/1 \/ 2 knowledge schools approved of/)).toBeInTheDocument()
    expect(screen.getByText(/0 \/ 1 packages published of/)).toBeInTheDocument()
    expect(screen.getByText(/1 \/ 2 learning modules published of/)).toBeInTheDocument()
    // Zero published is not left as a nought for somebody to interpret.
    expect(screen.getByText(/A package publishes only with an approved school/)).toBeInTheDocument()
    expect(screen.getByText(/Competencies no package requires/)).toBeInTheDocument()
  })

  it('does not silently render the retired readiness keys as blanks', async () => {
    mocks.fetchAcademicLibrary.mockResolvedValue(library({
      readiness: {
        schools_total: 0,
        schools_approved: 0,
        packages_total: 0,
        packages_published: 0,
        packages_declaring_none: 0,
        modules_total: 0,
        modules_published: 0,
        competencies_with_no_package: [],
      },
    }))
    render(<AcademicLibraryPage />)

    expect(await screen.findByText(/No knowledge school exists yet/)).toBeInTheDocument()
    expect(screen.getByText(/The library is empty/)).toBeInTheDocument()
    expect(screen.getByText(/Modules arrive with the package JSON/)).toBeInTheDocument()
    // `undefined` is what a retired key renders as, and it is invisible in a
    // review. If one is ever read again, this is the failure.
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
  })

  it('treats an inspection that finds errors as a successful inspection', async () => {
    mocks.inspectAcademicPackageFile.mockResolvedValue({
      data: report({
        valid: false,
        schema_errors: [{ path: '/section_1_package_identity/code', message: 'is required' }],
        referential_errors: [{ path: '/section_6/0', message: 'competency [LC-404] does not exist' }],
      }),
    })
    render(<AcademicLibraryPage />)

    fireEvent.change(await screen.findByLabelText(/Or paste the JSON/), {
      target: { value: '{"section_1_package_identity":{}}' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Inspect/ }))

    expect(await screen.findByText(/Schema errors/)).toBeInTheDocument()
    expect(screen.getByText(/is required/)).toBeInTheDocument()
    expect(screen.getByText(/Referential errors/)).toBeInTheDocument()
    expect(screen.getByText(/competency \[LC-404\] does not exist/)).toBeInTheDocument()
    // The dry run answered 200. Nothing failed; the file has problems.
    expect(screen.queryByText(/could not be completed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Could not connect to the server/i)).not.toBeInTheDocument()
  })

  it('offers Import only once an inspection came back clean', async () => {
    mocks.inspectAcademicPackageFile.mockResolvedValue({ data: report({ valid: false }) })
    render(<AcademicLibraryPage />)

    // Before any inspection.
    expect(await screen.findByRole('button', { name: 'Import' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Or paste the JSON/), { target: { value: '{"a":1}' } })
    fireEvent.click(screen.getByRole('button', { name: /Inspect/ }))

    await screen.findByText(/cannot be imported until the problems below are fixed/)
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
    expect(mocks.importAcademicPackageFile).not.toHaveBeenCalled()
  })

  it('renders warnings as warnings, and lets the import proceed', async () => {
    mocks.inspectAcademicPackageFile.mockResolvedValue({
      data: report({
        valid: true,
        warnings: ['3 text field(s) have no nl translation; the package is importable'],
      }),
    })
    render(<AcademicLibraryPage />)

    fireEvent.change(await screen.findByLabelText(/Or paste the JSON/), { target: { value: '{"a":1}' } })
    fireEvent.click(screen.getByRole('button', { name: /Inspect/ }))

    expect(await screen.findByText(/Warnings — importable, but worth seeing/)).toBeInTheDocument()
    expect(screen.getByText(/no nl translation/)).toBeInTheDocument()
    // Painting a warning as a failure teaches authors to ignore the report, and
    // then they ignore the errors in it too.
    expect(screen.getByText(/Warnings never block an import/)).toBeInTheDocument()
    expect(screen.getByText(/No blocking problems/)).toBeInTheDocument()
    expect(screen.queryByText(/Schema errors/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled()
  })

  it('sends the parsed object to the inspect endpoint, not the raw text', async () => {
    render(<AcademicLibraryPage />)

    fireEvent.change(await screen.findByLabelText(/Or paste the JSON/), {
      target: { value: '{"owner_school_code":"LD"}' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Inspect/ }))

    await waitFor(() =>
      expect(mocks.inspectAcademicPackageFile).toHaveBeenCalledWith({ owner_school_code: 'LD' }),
    )
  })

  it('inspects a competency bundle against the competency endpoint', async () => {
    render(<AcademicLibraryPage />)

    fireEvent.change(await screen.findByLabelText(/File type/), { target: { value: 'competencies' } })
    fireEvent.change(screen.getByLabelText(/Or paste the JSON/), { target: { value: '{"owner_school_code":"LD"}' } })
    fireEvent.click(screen.getByRole('button', { name: /Inspect/ }))

    await waitFor(() => expect(mocks.inspectAcademicCompetencyFile).toHaveBeenCalledTimes(1))
    expect(mocks.inspectAcademicPackageFile).not.toHaveBeenCalled()
  })

  it('says the file is not JSON instead of sending it', async () => {
    render(<AcademicLibraryPage />)

    fireEvent.change(await screen.findByLabelText(/Or paste the JSON/), { target: { value: 'not json {' } })
    fireEvent.click(screen.getByRole('button', { name: /Inspect/ }))

    expect(await screen.findByText(/not valid JSON/)).toBeInTheDocument()
    expect(mocks.inspectAcademicPackageFile).not.toHaveBeenCalled()
  })

  it('shows the whole report when an import is refused, and says nothing was written', async () => {
    mocks.importAcademicPackageFile.mockRejectedValue({
      response: {
        status: 422,
        data: {
          error: 'ACADEMIC_IMPORT_REFUSED',
          message: 'Refused.',
          report: report({
            valid: false,
            referential_errors: [{ path: '/section_1/school_code', message: 'school [ZZ] does not exist' }],
          }),
        },
      },
    })
    render(<AcademicLibraryPage />)

    fireEvent.change(await screen.findByLabelText(/Or paste the JSON/), { target: { value: '{"a":1}' } })
    fireEvent.click(screen.getByRole('button', { name: /Inspect/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Import' }))

    expect(await screen.findByText(/refused and nothing was written/)).toBeInTheDocument()
    expect(screen.getByText(/school \[ZZ\] does not exist/)).toBeInTheDocument()
  })

  it('reloads the library after a successful import so the new package appears', async () => {
    render(<AcademicLibraryPage />)
    await screen.findByText('LD-001')
    const loadsBefore = mocks.fetchAcademicLibrary.mock.calls.length

    fireEvent.change(screen.getByLabelText(/Or paste the JSON/), { target: { value: '{"a":1}' } })
    fireEvent.click(screen.getByRole('button', { name: /Inspect/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Import' }))

    expect(await screen.findByText(/Imported as a draft/)).toBeInTheDocument()
    await waitFor(() =>
      expect(mocks.fetchAcademicLibrary.mock.calls.length).toBeGreaterThan(loadsBefore),
    )
  })

  it('offers nothing editable on a published package', async () => {
    mocks.fetchAcademicLibrary.mockResolvedValue(library({
      packages: [{ ...library().data.packages[0], status: 'published' }],
    }))
    render(<AcademicLibraryPage />)

    expect(await screen.findByText(/may already appear in a plan/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Map competencies/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Edit identity/ })).not.toBeInTheDocument()
  })

  it('requires a written basis of substance before a school can be approved', async () => {
    render(<AcademicLibraryPage />)

    const approve = await screen.findByRole('button', { name: /Approve school/ })
    expect(approve).toBeDisabled()

    const basis = 'Reviewed against the constitution article 7 school list by the academic lead.'
    fireEvent.change(screen.getByLabelText(/Basis for approval/), { target: { value: basis } })
    fireEvent.click(screen.getByRole('button', { name: /Approve school/ }))

    // The draft school is id 2; approval is still addressed by id, not code.
    await waitFor(() => expect(mocks.approveAcademicSchool).toHaveBeenCalledWith(2, { basis }))
  })

  it('keeps every key in all three language blocks', () => {
    /*
     * THE GUARD FOR THE MISSING-KEY CLASS OF BUG.
     *
     * Copy lookup on these pages is a whole-object fallback —
     * COPY[language] || COPY.en — with no per-key rescue. A key present in en
     * and absent from nl renders the literal string "undefined", which reviews
     * fine in English and ships a blank card in Dutch. This repo has done
     * exactly that before.
     */
    const paths = (block, prefix = '') =>
      Object.entries(block).flatMap(([key, value]) =>
        value && typeof value === 'object' && !Array.isArray(value)
          ? paths(value, `${prefix}${key}.`)
          : [`${prefix}${key}`],
      )

    const en = paths(COPY.en).sort()
    expect(paths(COPY.ar).sort()).toEqual(en)
    expect(paths(COPY.nl).sort()).toEqual(en)
    expect(Object.keys(COPY).sort()).toEqual(['ar', 'en', 'nl'])
  })

  it('has no empty string anywhere in any language block', () => {
    const leaves = (block) =>
      Object.values(block).flatMap((value) =>
        value && typeof value === 'object' ? leaves(value) : [value],
      )

    Object.entries(COPY).forEach(([language, block]) => {
      leaves(block).forEach((value) => {
        expect(typeof value, language).toBe('string')
        expect(String(value).trim(), language).not.toBe('')
      })
    })
  })
})
