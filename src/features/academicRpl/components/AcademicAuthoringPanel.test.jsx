import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AcademicAuthoringPanel, { COPY } from './AcademicAuthoringPanel'

/*
 * The academic authoring panel — the screen a reviewer governs a generated
 * package from.
 *
 * These tests are about the panel making a real review POSSIBLE rather than
 * making generation easy, so they are pinned to the things that would silently
 * degrade into a rubber stamp:
 *
 *   - the SIBLING BOUNDARY is on the screen, and the panel says which siblings
 *     were actually sent with the request; a package created after the run is
 *     marked as one the model was never told about
 *   - generation is refused without an authorization, and the authorization's
 *     EXPIRY is visible
 *   - module_count is never defaulted — the button stays disabled until an
 *     academic states a number inside the server's bounds
 *   - a source verdict needs an explicit choice AND a written basis
 *   - regeneration addresses a component by module CODE, and the package-level
 *     policy carries no ref at all
 *   - a fallback model that answered is shown, not merely recorded
 */

const mocks = vi.hoisted(() => ({
  fetchAcademicPackageAuthoring: vi.fn(),
  authorizeAcademicPackageGeneration: vi.fn(),
  revokeAcademicPackageGeneration: vi.fn(),
  startAcademicPackageAuthoring: vi.fn(),
  regenerateAcademicPackageComponent: vi.fn(),
  resolveAcademicPackageSourceFlag: vi.fn(),
  rejectAcademicPackageDraft: vi.fn(),
}))

// The panel reads the admin language from storage, which is Arabic by default.
// Pinned to English so the assertions read as the copy they are checking.
vi.mock('../../../services/languageStorage', () => ({ getAdminLanguage: () => 'en' }))

vi.mock('../services/academicRplService', () => mocks)

const SIBLINGS = [
  { code: 'LD-002', name: { en: 'Operational leadership' }, status: 'draft' },
  { code: 'LD-003', name: { en: 'Governance and boards' }, status: 'draft' },
]

function authorization(overrides = {}) {
  return {
    id: 4,
    status: 'ACTIVE',
    scope: 'package_version',
    package_version: '1.0',
    note: 'Framework signed off by the school council.',
    authorized_at: '2026-08-07T09:00:00+00:00',
    expires_at: '2026-08-14T09:00:00+00:00',
    consumed_at: null,
    consumed_by_run_id: null,
    revoked_at: null,
    revoked_reason: null,
    authorized_by: 'Dr Salma Haddad',
    unusable_reason: null,
    ...overrides,
  }
}

function payload(overrides = {}) {
  return {
    data: {
      package_code: 'LD-001',
      package_name: { en: 'Strategic leadership' },
      package_version: '1.0',
      package_status: 'draft',
      school_code: 'LD',
      ai_authoring_status: 'not_generated',
      progress: null,
      content_tree: [],
      run: null,
      governance: {
        ready: true,
        declared_competencies: 2,
        placeholder_competencies: [],
        competencies: [
          { code: 'LC-001', required_level: 'professional_master', classification: 'core' },
          { code: 'LC-004', required_level: 'professional_diploma', classification: 'supporting' },
        ],
        authorized: false,
        active_authorization: null,
        latest_authorization: null,
        module_count_bounds: { min: 1, max: 24 },
      },
      review: {
        blocking_source_flags: 0,
        mcq_items: { total: 0, draft: 0, published: 0 },
        modules_still_draft: 0,
      },
      ...overrides,
    },
  }
}

/** A completed draft run with artifacts, one open source flag and one recorded. */
function draftRun(overrides = {}) {
  return {
    id: 12,
    status: 'ai_draft',
    current_step: null,
    package_code: 'LD-001',
    package_version: '1.0',
    prompt_version: 'academic-authoring-v1',
    ai_model: 'gemini-2.5-pro',
    error: null,
    started_at: '2026-08-07T10:00:00+00:00',
    requester: { id: 3, name: 'Ahmad Nasser' },
    ai_run_id: 'air_9f3',
    validation_results: { modules_created: 2, assessment_policy: 'ASSESSMENT_POLICY_PENDING_GOVERNANCE' },
    governed_input_manifest: {
      package_code: 'LD-001',
      // LD-003 is deliberately absent: it was created after this run, and the
      // panel has to say so.
      sibling_package_codes: ['LD-002', 'LD-009'],
      sibling_count: 2,
      competency_codes: ['LC-001', 'LC-004'],
      professional_program_count: 100,
    },
    artifacts: [
      {
        id: 51,
        component_type: 'outline',
        component_ref: 'outline',
        sequence: 1,
        superseded_by: null,
        provenance_state: 'GOVERNED',
        used_fallback_model: false,
        source_flags: [
          {
            flag_id: 'sf_1',
            citation: 'Mintzberg, The Structuring of Organizations (1979)',
            resolved: false,
            verification_status: 'SOURCE_REVIEW_REQUIRED',
            blocks_publication: true,
          },
        ],
      },
      {
        id: 52,
        component_type: 'module',
        component_ref: 'module:LD-001-M01',
        sequence: 1,
        superseded_by: null,
        provenance_state: 'GOVERNED',
        used_fallback_model: false,
        source_flags: [],
      },
      {
        id: 53,
        component_type: 'question_batch',
        component_ref: 'questions:LD-001-M01',
        sequence: 1,
        superseded_by: null,
        provenance_state: 'GOVERNED',
        used_fallback_model: false,
        source_flags: [],
      },
      {
        id: 54,
        component_type: 'assessment_policy',
        component_ref: 'assessment_policy',
        sequence: 1,
        superseded_by: null,
        provenance_state: 'GOVERNED',
        used_fallback_model: false,
        source_flags: [
          {
            flag_id: 'sf_2',
            citation: 'ISO 21001:2018',
            resolved: true,
            verification_status: 'VERIFIED_APPROVED',
            review_notes: 'Checked the standard number, issuer and year against the ISO catalogue.',
            reviewed_by: 3,
            reviewed_by_name: 'Ahmad Nasser',
            reviewed_at: '2026-08-07T12:00:00+00:00',
            blocks_publication: false,
          },
        ],
      },
    ],
    ...overrides,
  }
}

function renderPanel(response = payload(), props = {}) {
  mocks.fetchAcademicPackageAuthoring.mockResolvedValue(response)
  return render(<AcademicAuthoringPanel packageCode="LD-001" siblings={SIBLINGS} {...props} />)
}

let confirmSpy

beforeEach(() => {
  vi.clearAllMocks()
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  mocks.authorizeAcademicPackageGeneration.mockResolvedValue({})
  mocks.revokeAcademicPackageGeneration.mockResolvedValue({})
  mocks.startAcademicPackageAuthoring.mockResolvedValue({})
  mocks.regenerateAcademicPackageComponent.mockResolvedValue({})
  mocks.resolveAcademicPackageSourceFlag.mockResolvedValue({})
  mocks.rejectAcademicPackageDraft.mockResolvedValue({})
})

afterEach(() => {
  confirmSpy.mockRestore()
})

describe('the governed input, and the sibling boundary in particular', () => {
  it('shows the School Specification slot the model was given', async () => {
    renderPanel()

    expect(await screen.findByText('Strategic leadership')).toBeInTheDocument()
    expect(screen.getByText(COPY.en.slotTitle)).toBeInTheDocument()
    expect(screen.getByText('LC-001')).toBeInTheDocument()
    // The level is on the PIVOT: the same competency is a different bar at
    // diploma and at doctorate, so a bare code would understate the input.
    expect(screen.getByText(/Professional Master/)).toBeInTheDocument()
  })

  it('lists every sibling the model was told not to cover, by code and name', async () => {
    renderPanel()

    expect(await screen.findByText(COPY.en.siblingTitle)).toBeInTheDocument()
    expect(screen.getByText('LD-002')).toBeInTheDocument()
    expect(screen.getByText('Operational leadership')).toBeInTheDocument()
    expect(screen.getByText('LD-003')).toBeInTheDocument()
  })

  it('says which siblings were actually sent, and flags one the model never saw', async () => {
    renderPanel(payload({ run: draftRun(), ai_authoring_status: 'ai_draft' }))

    // LD-002 travelled with the request; LD-003 was created afterwards, so the
    // draft may have swallowed its scope and nothing in the draft would show it.
    expect(await screen.findAllByText(COPY.en.siblingInjected)).toHaveLength(1)
    expect(screen.getAllByText(COPY.en.siblingMissing)).toHaveLength(1)
    expect(screen.getByText(COPY.en.siblingMissingHint)).toBeInTheDocument()
  })

  it('names a code the run was given that is no longer in the school', async () => {
    renderPanel(payload({ run: draftRun(), ai_authoring_status: 'ai_draft' }))

    expect(await screen.findByText('LD-009')).toBeInTheDocument()
    expect(screen.getByText(COPY.en.siblingGoneHint)).toBeInTheDocument()
  })

  it('says plainly when the model was given no boundary at all', async () => {
    renderPanel(payload(), { siblings: [] })

    expect(await screen.findByText(COPY.en.siblingNone)).toBeInTheDocument()
  })
})

describe('the two generation gates', () => {
  it('will not start a run before an authorization is recorded', async () => {
    renderPanel()

    await screen.findByText(COPY.en.govNotAuthorized)
    fireEvent.change(screen.getByLabelText(/Number of learning modules/), { target: { value: '6' } })

    expect(screen.getByRole('button', { name: new RegExp(COPY.en.generate) })).toBeDisabled()
  })

  it('records an authorization with its written basis and an expiry', async () => {
    renderPanel()

    await screen.findByText(COPY.en.govNotAuthorized)
    fireEvent.change(screen.getByLabelText(COPY.en.govNote), {
      target: { value: 'School council approved the framework on 6 Aug.' },
    })
    fireEvent.change(screen.getByLabelText(COPY.en.govExpiry), { target: { value: '2026-08-20T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.en.govAuthorize) }))

    await waitFor(() =>
      expect(mocks.authorizeAcademicPackageGeneration).toHaveBeenCalledWith('LD-001', {
        note: 'School council approved the framework on 6 Aug.',
        expires_at: '2026-08-20T10:00',
      }),
    )
  })

  it('refuses to record an authorization with no written basis', async () => {
    renderPanel()

    await screen.findByText(COPY.en.govNotAuthorized)
    fireEvent.change(screen.getByLabelText(COPY.en.govNote), { target: { value: 'ok' } })

    // The server accepts a null note. This screen does not: a grant with no
    // recorded reason is indistinguishable later from one nobody thought about.
    expect(screen.getByRole('button', { name: new RegExp(COPY.en.govAuthorize) })).toBeDisabled()
    expect(mocks.authorizeAcademicPackageGeneration).not.toHaveBeenCalled()
  })

  it('shows when a live authorization expires', async () => {
    renderPanel(
      payload({
        governance: {
          ...payload().data.governance,
          authorized: true,
          active_authorization: authorization(),
          latest_authorization: authorization(),
        },
      }),
    )

    expect(await screen.findByText(COPY.en.govAuthorized)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(COPY.en.govExpires))).toBeInTheDocument()
    expect(screen.getByText(/Dr Salma Haddad/)).toBeInTheDocument()
  })

  it('withdraws a live authorization only with a written reason', async () => {
    renderPanel(
      payload({
        governance: {
          ...payload().data.governance,
          authorized: true,
          active_authorization: authorization(),
          latest_authorization: authorization(),
        },
      }),
    )

    await screen.findByText(COPY.en.govAuthorized)
    const revoke = screen.getByRole('button', { name: new RegExp(COPY.en.govRevoke) })
    expect(revoke).toBeDisabled()

    fireEvent.change(screen.getByLabelText(COPY.en.govRevoke), {
      target: { value: 'Framework approval was rescinded by the council.' },
    })
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.en.govRevoke) }))

    await waitFor(() =>
      expect(mocks.revokeAcademicPackageGeneration).toHaveBeenCalledWith('LD-001', {
        reason: 'Framework approval was rescinded by the council.',
      }),
    )
  })
})

describe('starting the run', () => {
  const authorized = payload({
    governance: {
      ...payload().data.governance,
      authorized: true,
      active_authorization: authorization(),
      latest_authorization: authorization(),
    },
  })

  it('never defaults the module count, and refuses one outside the bounds', async () => {
    renderPanel(authorized)

    await screen.findByText(COPY.en.govAuthorized)
    const generate = screen.getByRole('button', { name: new RegExp(COPY.en.generate) })

    // Empty: the module is the smallest assessable unit, so the number is an
    // academic judgement the platform must not make.
    expect(generate).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Number of learning modules/), { target: { value: '25' } })
    expect(generate).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Number of learning modules/), { target: { value: '8' } })
    expect(generate).toBeEnabled()
  })

  it('sends the module count and the Arabic locale v1 authors in', async () => {
    renderPanel(authorized)

    await screen.findByText(COPY.en.govAuthorized)
    fireEvent.change(screen.getByLabelText(/Number of learning modules/), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.en.generate) }))

    await waitFor(() =>
      expect(mocks.startAcademicPackageAuthoring).toHaveBeenCalledWith('LD-001', {
        module_count: 8,
        locale: 'ar',
      }),
    )
  })

  it('offers no other content language, and says why', async () => {
    renderPanel(authorized)

    expect(await screen.findByText(COPY.en.localeHint)).toBeInTheDocument()
    expect(screen.queryByText('Nederlands')).not.toBeInTheDocument()
  })

  it('will not start a second run over an existing draft', async () => {
    renderPanel(
      payload({
        ai_authoring_status: 'ai_draft',
        run: draftRun(),
        governance: {
          ...payload().data.governance,
          authorized: true,
          active_authorization: authorization(),
          latest_authorization: authorization(),
        },
      }),
    )

    await screen.findByText(COPY.en.alreadyDrafted)
    fireEvent.change(screen.getByLabelText(/Number of learning modules/), { target: { value: '8' } })

    expect(screen.getByRole('button', { name: new RegExp(COPY.en.generate) })).toBeDisabled()
  })
})

describe('reviewing the draft', () => {
  const drafted = payload({ ai_authoring_status: 'ai_draft', run: draftRun() })

  it('lists the artifacts by component type', async () => {
    renderPanel(drafted)

    expect(await screen.findByText(COPY.en.types.outline)).toBeInTheDocument()
    expect(screen.getByText(COPY.en.types.module)).toBeInTheDocument()
    expect(screen.getByText(COPY.en.types.question_batch)).toBeInTheDocument()
  })

  it('regenerates a question batch as question_bank, addressed by module CODE', async () => {
    renderPanel(drafted)

    await screen.findByText(COPY.en.types.question_batch)
    const rows = screen.getAllByRole('button', { name: new RegExp(COPY.en.regenerate) })
    // outline (not regeneratable) + module + question_batch + assessment_policy
    expect(rows).toHaveLength(3)

    fireEvent.click(rows[1])

    await waitFor(() =>
      expect(mocks.regenerateAcademicPackageComponent).toHaveBeenCalledWith('LD-001', {
        component: 'question_bank',
        ref: 'LD-001-M01',
      }),
    )
  })

  it('regenerates the package-level policy with no ref at all', async () => {
    renderPanel(drafted)

    // Twice on the screen on purpose: once as the artifact, once as the origin
    // of the source flag recorded against it.
    await screen.findAllByText(COPY.en.types.assessment_policy)
    const rows = screen.getAllByRole('button', { name: new RegExp(COPY.en.regenerate) })
    fireEvent.click(rows[2])

    await waitFor(() =>
      expect(mocks.regenerateAcademicPackageComponent).toHaveBeenCalledWith('LD-001', {
        component: 'assessment_policy',
      }),
    )
  })

  it('records a source verdict only with an explicit choice and a written basis', async () => {
    renderPanel(drafted)

    await screen.findByText('SOURCE_REVIEW_REQUIRED')
    const record = screen.getByRole('button', { name: new RegExp(COPY.en.recordVerdict) })
    expect(record).toBeDisabled()

    fireEvent.change(screen.getByLabelText(COPY.en.sourceVerdict), { target: { value: 'VERIFIED_APPROVED' } })
    // A verdict with no reasoning is indistinguishable from a click.
    expect(record).toBeDisabled()

    fireEvent.change(screen.getByLabelText(COPY.en.sourceNotes), {
      target: { value: 'Verified the title, publisher and 1979 edition in the university catalogue.' },
    })
    fireEvent.click(record)

    await waitFor(() =>
      expect(mocks.resolveAcademicPackageSourceFlag).toHaveBeenCalledWith('LD-001', {
        artifact_id: 51,
        citation: 'Mintzberg, The Structuring of Organizations (1979)',
        flag_id: 'sf_1',
        verification_status: 'VERIFIED_APPROVED',
        review_notes: 'Verified the title, publisher and 1979 edition in the university catalogue.',
      }),
    )
  })

  it('warns that SUPERSEDED lifts the publication block exactly as approval does', async () => {
    renderPanel(drafted)

    await screen.findByText('SOURCE_REVIEW_REQUIRED')
    fireEvent.change(screen.getByLabelText(COPY.en.sourceVerdict), { target: { value: 'SUPERSEDED' } })

    expect(screen.getByText(COPY.en.supersededWarning)).toBeInTheDocument()
  })

  it('keeps a recorded verdict visible and re-reviewable rather than hiding it', async () => {
    renderPanel(drafted)

    expect(await screen.findByText(COPY.en.recordedTitle)).toBeInTheDocument()
    expect(screen.getByText('ISO 21001:2018')).toBeInTheDocument()
    // WHO decided, not just that somebody did — a reviewer revisiting a verdict
    // has to see whose judgement they are revisiting.
    expect(screen.getByText(new RegExp(`${COPY.en.recordedBy}: Ahmad Nasser`))).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.en.reReview) }))

    /*
     * Re-review opens the SAME fail-closed form — one beside the still-open
     * flag, one beside the reopened record — so there is exactly one way to
     * record a decision, and it never edits the old record in place.
     */
    expect(screen.getAllByLabelText(COPY.en.sourceVerdict)).toHaveLength(2)
  })

  it('rejects the whole draft only after a confirmation', async () => {
    renderPanel(drafted)

    await screen.findByText(COPY.en.alreadyDrafted)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.en.reject) }))

    expect(confirmSpy).toHaveBeenCalledWith(COPY.en.rejectConfirm)
    await waitFor(() => expect(mocks.rejectAcademicPackageDraft).toHaveBeenCalledWith('LD-001'))
  })

  it('does not offer regeneration once the package is no longer editable', async () => {
    renderPanel(payload({ ai_authoring_status: 'ai_draft', package_status: 'published', run: draftRun() }))

    await screen.findByText(COPY.en.types.outline)
    expect(screen.queryByRole('button', { name: new RegExp(COPY.en.regenerate) })).not.toBeInTheDocument()
  })
})

describe('provenance the reviewer has to be able to see', () => {
  it('shows that a model other than the one requested answered', async () => {
    const run = draftRun()
    run.artifacts[1] = { ...run.artifacts[1], used_fallback_model: true, responding_model: 'gemini-2.5-flash' }

    renderPanel(payload({ ai_authoring_status: 'ai_draft', run }))

    expect(await screen.findByText(COPY.en.fallbackTitle)).toBeInTheDocument()
    expect(screen.getByText('gemini-2.5-flash')).toBeInTheDocument()
  })

  it('names the governed run record and the prompt version', async () => {
    renderPanel(payload({ ai_authoring_status: 'ai_draft', run: draftRun() }))

    expect(await screen.findByText(/air_9f3/)).toBeInTheDocument()
    expect(screen.getByText(/academic-authoring-v1/)).toBeInTheDocument()
  })

  it('reports the assessment policy as owed rather than inventing one', async () => {
    renderPanel(payload({ ai_authoring_status: 'ai_draft', run: draftRun() }))

    expect(await screen.findByText(/ASSESSMENT_POLICY_PENDING_GOVERNANCE/)).toBeInTheDocument()
  })
})

describe('the copy contract', () => {
  it('exposes the same key set in all three languages', () => {
    const shape = (block) =>
      Object.entries(block)
        .flatMap(([key, value]) =>
          value && typeof value === 'object' ? Object.keys(value).map((inner) => `${key}.${inner}`) : [key],
        )
        .sort()

    // A whole-object fallback with no per-key rescue renders the string
    // "undefined" for a key that exists in en and not in nl. This codebase has
    // already shipped a blank Dutch card that way.
    expect(shape(COPY.ar)).toEqual(shape(COPY.en))
    expect(shape(COPY.nl)).toEqual(shape(COPY.en))
  })
})
