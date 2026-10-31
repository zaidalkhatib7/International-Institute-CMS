import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiPackagePanel from './AiPackagePanel'

/*
 * ONE VERDICT FOR EVERY OPEN REFERENCE (owner, 31 Oct 2026).
 *
 *   "i want the ability to confirm all those in one click and same message for
 *    all the sources like everything is correct i will write what ever i want"
 *
 * The SOURCE_REVIEW_REQUIRED card offers one verdict and one written basis for
 * every reference with no verdict on record, sent to
 * POST /admin/programs/{id}/ai-package/resolve-sources-bulk with the run the
 * screen showed. These tests pin what stays fail-closed: the verdict is an
 * explicit choice, the basis has ten characters, only the open references are
 * sent (a rejection is on record, and the server refuses to override it), the
 * block exists only when the server says the owner's switch is on, and a refusal
 * keeps every draft. The payload is the shape ProgramAiAuthoringController::show
 * sends: source_flags on each artifact of the latest run, and
 * bulk_source_verdicts_enabled beside them.
 */

const mocks = vi.hoisted(() => ({
  fetchAiPackageStatus: vi.fn(),
  resolveAiPackageSource: vi.fn(),
  resolveAiPackageSourcesBulk: vi.fn(),
  language: { current: 'en' },
}))

vi.mock('../services/programsService', () => ({
  authorizeGeneration: vi.fn(),
  revokeGenerationAuthorization: vi.fn(),
  downloadPackagePdf: vi.fn(),
  fetchAiPackageStatus: mocks.fetchAiPackageStatus,
  generateAiPackage: vi.fn(),
  openNewPackageVersion: vi.fn(),
  publishTrainingPackage: vi.fn(),
  regenerateAiPackageComponent: vi.fn(),
  rejectAiPackage: vi.fn(),
  resolveAiPackageSource: mocks.resolveAiPackageSource,
  resolveAiPackageSourcesBulk: mocks.resolveAiPackageSourcesBulk,
}))

vi.mock('../../../utils/localization', async (importOriginal) => ({
  ...(await importOriginal()),
  getCurrentLanguage: () => mocks.language.current,
}))

vi.mock('./PublicationGatesPanel', () => ({ default: () => null }))

const PROGRAM_ID = 77
const RUN_ID = 31

const COPY = {
  en: {
    title: (n) => `One verdict for every unreviewed reference (${n})`,
    hint: (n) => `The same verdict and the same basis are recorded on every reference in this list that has no verdict yet (${n}), in your name, and each record is marked in the audit trail as a bulk verdict. A reference that already carries a recorded verdict (such as a rejection) is not included and is reviewed on its own.`,
    placeholder: 'Write the basis once; it is stored as written on every reference.',
    record: (n) => `Record the verdict on all references (${n})`,
    done: (n) => `The verdict was recorded on all references at once (${n}).`,
    bulkBadge: 'Bulk verdict',
    notInBulk: 'Recorded verdict — reviewed on its own',
    verdict: 'Source verdict (explicit human decision)',
    basis: 'Basis of the verdict (required)',
    recordOne: 'Record verdict',
    reReview: 'Re-review verdict',
    superseded: 'Warning: SUPERSEDED lifts the publication block exactly as approval does. Do not record it until the content actually cites the newer reference.',
  },
  ar: {
    title: (n) => `حكم واحد لكل المراجع غير المراجَعة (${n})`,
    hint: (n) => `يُسجَّل الحكم نفسه والأساس نفسه على كل مرجع في هذه القائمة لم يُسجَّل عليه حكم بعد (${n})، باسمك، ويُوسَم كل سجل في الأثر التدقيقي بأنه حكم جماعي. المرجع الذي عليه حكم مسجَّل (كالمرفوض) لا يشمله هذا الحكم ويُراجَع وحده.`,
    placeholder: 'اكتب الأساس مرة واحدة، وسيُحفظ كما هو على كل مرجع.',
    record: (n) => `تسجيل الحكم على كل المراجع (${n})`,
    done: (n) => `سُجّل الحكم على كل المراجع دفعة واحدة (${n}).`,
    bulkBadge: 'حكم جماعي',
    notInBulk: 'حكم مسجَّل — يُراجَع وحده',
    verdict: 'حكم المصدر (قرار بشري صريح)',
    basis: 'أساس الحكم (إلزامي)',
    recordOne: 'تسجيل الحكم',
    reReview: 'إعادة تقييم الحكم',
    superseded: 'تنبيه: SUPERSEDED يرفع منع النشر تمامًا مثل الاعتماد. لا تسجّله إلا بعد تعديل المحتوى فعلًا إلى المرجع الأحدث.',
  },
}

// What the owner said he would write: anything, once, in his own words.
const BASIS = {
  en: 'Checked every citation against the issuer catalogue; all are correct.',
  ar: 'راجعتُ كل المراجع مقابل فهارس الجهات المُصدِرة، وكلها صحيحة.',
}

// Open: no verdict on record. Two carry the flag_id the generator writes; the
// legacy one has neither an id nor a status (the server reads it as open too).
const OPEN_A = { flag_id: 'sf_101', citation: 'ISO 9001:2015 Quality management systems', resolved: false, verification_status: 'SOURCE_REVIEW_REQUIRED' }
const OPEN_LEGACY = { citation: 'Kotter, Leading Change (1996)', resolved: false }
const OPEN_B = { flag_id: 'sf_201', citation: 'PMI, A Guide to the Project Management Body of Knowledge, 7th ed. (2021)', resolved: false, verification_status: 'SOURCE_REVIEW_REQUIRED' }

// Unresolved but not open: listed in the review card, never part of the bulk verdict.
const REJECTED = {
  flag_id: 'sf_102',
  citation: 'Regional leadership survey (2019)',
  resolved: false,
  verification_status: 'REJECTED',
  review_notes: 'No survey under this title or issuer could be found.',
  reviewed_by: 4,
  reviewed_by_name: 'Huda Saleh',
  reviewed_at: '2026-10-30T09:00:00+00:00',
}

// Resolved: in the recorded card. The second is a legacy flag resolved before
// verdicts had a status.
const APPROVED = {
  flag_id: 'sf_202',
  citation: 'ISO 21001:2018',
  resolved: true,
  verification_status: 'VERIFIED_APPROVED',
  review_notes: 'Checked the standard number, issuer and year against the ISO catalogue.',
  reviewed_by: 3,
  reviewed_by_name: 'Ahmad Nasser',
  reviewed_at: '2026-10-29T12:00:00+00:00',
}
const LEGACY_RESOLVED = { citation: 'Drucker, The Effective Executive (1967)', resolved: true }

function artifact(id, lessonId, title, flags) {
  return {
    id,
    component_type: 'lesson',
    component_ref: `lesson:${lessonId}`,
    ref_title: title,
    sequence: 1,
    superseded_by: null,
    source_flags: flags,
  }
}

function reviewArtifacts(stamp = null) {
  const recorded = (flag) => (stamp ? { ...flag, ...stamp } : flag)
  return [
    artifact(501, 9101, { en: 'Quality foundations', ar: 'أسس الجودة' }, [recorded(OPEN_A), recorded(OPEN_LEGACY), REJECTED]),
    artifact(502, 9102, { en: 'Planning the work', ar: 'تخطيط العمل' }, [recorded(OPEN_B), APPROVED, LEGACY_RESOLVED]),
  ]
}

// The three open flags after the server recorded one bulk verdict on them.
function afterBulk(verdict, language) {
  return reviewArtifacts({
    verification_status: verdict,
    resolved: verdict !== 'REJECTED',
    review_notes: BASIS[language],
    reviewed_by: 5,
    reviewed_by_name: 'Omar Haddad',
    reviewed_at: '2026-10-31T10:00:00+00:00',
    review_mode: 'bulk',
    bulk_review_id: '6f1c2b8e-4d3a-4f6b-9c1d-2e7a5b9c0d14',
    bulk_review_size: 3,
  })
}

function statusPayload(artifacts, top = {}) {
  return {
    data: {
      program_id: PROGRAM_ID,
      program_title: { en: 'Leading teams' },
      package_version: '1.0',
      ai_authoring_status: 'ai_draft',
      package_published_at: null,
      progress: null,
      rationale_coverage: null,
      content_tree: [],
      run: { id: RUN_ID, status: 'completed', current_step: null, artifacts },
      governance: null,
      publication_gates: null,
      bulk_source_verdicts_enabled: true,
      ...top,
    },
  }
}

function bulkAnswer(verdict, recorded) {
  return {
    message: `Source verdict ${verdict} recorded on ${recorded} reference(s) at once.`,
    data: { recorded, bulk_review_id: '6f1c2b8e-4d3a-4f6b-9c1d-2e7a5b9c0d14', verification_status: verdict, artifacts: [] },
  }
}

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function renderPanel(language, payload) {
  mocks.language.current = language
  // readApiError reads the stored language; keep it the same as the panel's.
  localStorage.setItem('icpc_admin_language', language)
  mocks.fetchAiPackageStatus.mockResolvedValue(payload)
  render(
    <MemoryRouter>
      <AiPackagePanel programId={PROGRAM_ID} isGoverned officialCode="CGP-QMS-077" />
    </MemoryRouter>,
  )
}

/*
 * One reference's card: the nearest element that holds both its citation and
 * the button its card ends with (its own "Record verdict" in the review card,
 * "Re-review verdict" in the recorded one). Every card has the same labels, so
 * a reference's form is only ever read through its card.
 */
function cardOf(citation, buttonName) {
  let node = screen.getByText(citation)
  while (node && within(node).queryAllByRole('button', { name: buttonName }).length === 0) node = node.parentElement
  return within(node)
}

function bulkBlock(title) {
  return within(screen.getByRole('region', { name: title }))
}

beforeEach(() => {
  mocks.fetchAiPackageStatus.mockReset()
  mocks.resolveAiPackageSource.mockReset()
  mocks.resolveAiPackageSourcesBulk.mockReset()
})

afterEach(() => {
  localStorage.removeItem('icpc_admin_language')
  vi.restoreAllMocks()
})

describe.each(['en', 'ar'])('AiPackagePanel one verdict for every open reference (%s)', (language) => {
  const copy = COPY[language]

  it('counts the open references only, and marks a rejected one as reviewed on its own', async () => {
    renderPanel(language, statusPayload(reviewArtifacts()))

    await screen.findByRole('region', { name: copy.title(3) })
    const bulk = bulkBlock(copy.title(3))
    expect(bulk.getByText(copy.hint(3))).toBeInTheDocument()
    expect(bulk.getByLabelText(copy.basis)).toHaveAttribute('placeholder', copy.placeholder)
    expect(bulk.getByRole('button', { name: copy.record(3) })).toBeDisabled()

    // The rejection is on record: its verdict is shown, and it is left out.
    const rejected = cardOf(REJECTED.citation, copy.recordOne)
    expect(rejected.getByText('REJECTED')).toBeInTheDocument()
    expect(rejected.getByText(copy.notInBulk)).toBeInTheDocument()
    expect(screen.getAllByText(copy.notInBulk)).toHaveLength(1)
    for (const flag of [OPEN_A, OPEN_LEGACY, OPEN_B]) {
      expect(cardOf(flag.citation, copy.recordOne).queryByText(copy.notInBulk)).toBeNull()
    }

    // Every reference in the card keeps its own form, the rejected one included.
    expect(screen.getAllByRole('button', { name: copy.recordOne })).toHaveLength(4)
  })

  it('is not offered when the server says the owner’s switch is off', async () => {
    renderPanel(language, statusPayload(reviewArtifacts(), { bulk_source_verdicts_enabled: false }))

    await screen.findByText(OPEN_A.citation)
    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.queryByPlaceholderText(copy.placeholder)).toBeNull()
    // The one-by-one review is untouched.
    expect(screen.getAllByRole('button', { name: copy.recordOne })).toHaveLength(4)
  })

  it('is not offered by an older server that does not say (it has no endpoint)', async () => {
    const payload = statusPayload(reviewArtifacts())
    delete payload.data.bulk_source_verdicts_enabled
    renderPanel(language, payload)

    await screen.findByText(OPEN_A.citation)
    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.queryByPlaceholderText(copy.placeholder)).toBeNull()
  })

  it('is not offered while fewer than two references are open', async () => {
    renderPanel(language, statusPayload([
      artifact(501, 9101, { en: 'Quality foundations', ar: 'أسس الجودة' }, [OPEN_A, REJECTED]),
    ]))

    await screen.findByText(OPEN_A.citation)
    expect(screen.queryByRole('region')).toBeNull()
    // The rejected reference still says its verdict is on record.
    expect(cardOf(REJECTED.citation, copy.recordOne).getByText(copy.notInBulk)).toBeInTheDocument()
  })

  it('keeps the button closed until a verdict is chosen and the basis has ten characters', async () => {
    renderPanel(language, statusPayload(reviewArtifacts()))

    await screen.findByRole('region', { name: copy.title(3) })
    const bulk = bulkBlock(copy.title(3))
    const button = bulk.getByRole('button', { name: copy.record(3) })
    const verdict = bulk.getByLabelText(copy.verdict)
    const basis = bulk.getByLabelText(copy.basis)

    // A basis alone records nothing: the verdict is an explicit choice.
    fireEvent.change(basis, { target: { value: BASIS[language] } })
    expect(button).toBeDisabled()
    fireEvent.change(verdict, { target: { value: 'VERIFIED_APPROVED' } })
    expect(button).toBeEnabled()

    // Blanks are not a basis: nine characters inside them are still too few.
    fireEvent.change(basis, { target: { value: '          ' } })
    expect(button).toBeDisabled()
    fireEvent.change(basis, { target: { value: '   123456789    ' } })
    expect(button).toBeDisabled()
    fireEvent.change(basis, { target: { value: '  1234567890  ' } })
    expect(button).toBeEnabled()

    // Back to the placeholder: no verdict, no record.
    fireEvent.change(verdict, { target: { value: '' } })
    expect(button).toBeDisabled()
    expect(mocks.resolveAiPackageSourcesBulk).not.toHaveBeenCalled()
  })

  it('records the one verdict on exactly the open references shown, in order, then reloads', async () => {
    const pending = deferred()
    mocks.resolveAiPackageSourcesBulk.mockReturnValue(pending.promise)
    renderPanel(language, statusPayload(reviewArtifacts()))

    await screen.findByRole('region', { name: copy.title(3) })
    const bulk = bulkBlock(copy.title(3))
    fireEvent.change(bulk.getByLabelText(copy.verdict), { target: { value: 'VERIFIED_APPROVED' } })
    fireEvent.change(bulk.getByLabelText(copy.basis), { target: { value: BASIS[language] } })
    mocks.fetchAiPackageStatus.mockResolvedValue(statusPayload(afterBulk('VERIFIED_APPROVED', language)))
    fireEvent.click(bulk.getByRole('button', { name: copy.record(3) }))

    expect(mocks.resolveAiPackageSourcesBulk).toHaveBeenCalledTimes(1)
    expect(mocks.resolveAiPackageSourcesBulk).toHaveBeenCalledWith(
      PROGRAM_ID,
      RUN_ID,
      'VERIFIED_APPROVED',
      BASIS[language],
      [
        { artifact_id: 501, flag_id: 'sf_101', citation: OPEN_A.citation },
        { artifact_id: 501, flag_id: null, citation: OPEN_LEGACY.citation },
        { artifact_id: 502, flag_id: 'sf_201', citation: OPEN_B.citation },
      ],
    )
    // One click: the button stays closed while the request is out.
    expect(bulk.getByRole('button', { name: copy.record(3) })).toBeDisabled()
    expect(mocks.resolveAiPackageSource).not.toHaveBeenCalled()

    pending.resolve(bulkAnswer('VERIFIED_APPROVED', 3))

    expect(await screen.findByText(copy.done(3))).toBeInTheDocument()
    await waitFor(() => expect(mocks.fetchAiPackageStatus).toHaveBeenCalledTimes(2))
    // Reloaded: nothing open is left to offer, and each verdict it recorded says so.
    await waitFor(() => expect(screen.queryByRole('region')).toBeNull())
    for (const flag of [OPEN_A, OPEN_LEGACY, OPEN_B]) {
      const card = cardOf(flag.citation, copy.reReview)
      expect(card.getByText('VERIFIED_APPROVED')).toBeInTheDocument()
      expect(card.getByText(copy.bulkBadge)).toBeInTheDocument()
    }
    expect(cardOf(APPROVED.citation, copy.reReview).queryByText(copy.bulkBadge)).toBeNull()
    expect(cardOf(LEGACY_RESOLVED.citation, copy.reReview).queryByText(copy.bulkBadge)).toBeNull()
    // The rejection it left out is still waiting on its own form.
    expect(cardOf(REJECTED.citation, copy.recordOne).getByText('REJECTED')).toBeInTheDocument()
  })

  it('clears the drafts of the references it recorded and keeps every other one', async () => {
    mocks.resolveAiPackageSourcesBulk.mockResolvedValue(bulkAnswer('REJECTED', 3))
    renderPanel(language, statusPayload(reviewArtifacts()))

    await screen.findByRole('region', { name: copy.title(3) })
    fireEvent.change(cardOf(OPEN_A.citation, copy.recordOne).getByLabelText(copy.basis), {
      target: { value: 'A draft for this reference alone' },
    })
    fireEvent.change(cardOf(REJECTED.citation, copy.recordOne).getByLabelText(copy.basis), {
      target: { value: 'A re-review draft that stays' },
    })

    const bulk = bulkBlock(copy.title(3))
    fireEvent.change(bulk.getByLabelText(copy.verdict), { target: { value: 'REJECTED' } })
    fireEvent.change(bulk.getByLabelText(copy.basis), { target: { value: BASIS[language] } })
    mocks.fetchAiPackageStatus.mockResolvedValue(statusPayload(afterBulk('REJECTED', language)))
    fireEvent.click(bulk.getByRole('button', { name: copy.record(3) }))

    expect(await screen.findByText(copy.done(3))).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('region')).toBeNull())

    // A rejection stays in the review card: each one now shows its verdict, that
    // it was a bulk verdict, and that it is reviewed on its own from here on.
    for (const flag of [OPEN_A, OPEN_LEGACY, OPEN_B]) {
      const card = cardOf(flag.citation, copy.recordOne)
      expect(card.getByText('REJECTED')).toBeInTheDocument()
      expect(card.getByText(copy.bulkBadge)).toBeInTheDocument()
      expect(card.getByText(copy.notInBulk)).toBeInTheDocument()
    }
    expect(cardOf(OPEN_A.citation, copy.recordOne).getByLabelText(copy.basis)).toHaveValue('')
    const untouched = cardOf(REJECTED.citation, copy.recordOne)
    expect(untouched.getByLabelText(copy.basis)).toHaveValue('A re-review draft that stays')
    expect(untouched.queryByText(copy.bulkBadge)).toBeNull()
  })

  it('shows the server’s refusal and keeps every draft', async () => {
    mocks.resolveAiPackageSourcesBulk.mockRejectedValue({
      response: {
        status: 422,
        data: {
          message: 'SOURCE_BULK_STALE_VIEW: the review screen is out of date.',
          errors: {
            run_id: ['SOURCE_BULK_STALE_VIEW: the review screen shows an earlier authoring run. Reload the review screen; nothing was recorded.'],
          },
        },
      },
    })
    renderPanel(language, statusPayload(reviewArtifacts()))

    await screen.findByRole('region', { name: copy.title(3) })
    fireEvent.change(cardOf(OPEN_A.citation, copy.recordOne).getByLabelText(copy.basis), {
      target: { value: 'A draft for this reference alone' },
    })
    const bulk = bulkBlock(copy.title(3))
    fireEvent.change(bulk.getByLabelText(copy.verdict), { target: { value: 'VERIFIED_APPROVED' } })
    fireEvent.change(bulk.getByLabelText(copy.basis), { target: { value: BASIS[language] } })
    fireEvent.click(bulk.getByRole('button', { name: copy.record(3) }))

    expect(await screen.findByText(/Reload the review screen; nothing was recorded\./)).toBeInTheDocument()
    expect(screen.queryByText(copy.done(3))).toBeNull()
    const after = bulkBlock(copy.title(3))
    expect(after.getByLabelText(copy.verdict)).toHaveValue('VERIFIED_APPROVED')
    expect(after.getByLabelText(copy.basis)).toHaveValue(BASIS[language])
    expect(after.getByRole('button', { name: copy.record(3) })).toBeEnabled()
    expect(cardOf(OPEN_A.citation, copy.recordOne).getByLabelText(copy.basis)).toHaveValue('A draft for this reference alone')
  })

  it('warns in the bulk block too that SUPERSEDED lifts the publication block', async () => {
    renderPanel(language, statusPayload(reviewArtifacts()))

    await screen.findByRole('region', { name: copy.title(3) })
    const bulk = bulkBlock(copy.title(3))
    expect(bulk.queryByText(copy.superseded)).toBeNull()

    fireEvent.change(bulk.getByLabelText(copy.verdict), { target: { value: 'SUPERSEDED' } })
    expect(bulk.getByText(copy.superseded)).toBeInTheDocument()
    // No reference's own form chose it, so the bulk block is the only one warning.
    expect(screen.getAllByText(copy.superseded)).toHaveLength(1)
  })

  it('marks a recorded verdict that a bulk verdict made, and only that one', async () => {
    const recordedInBulk = {
      flag_id: 'sf_301',
      citation: 'ISO 45001:2018',
      resolved: true,
      verification_status: 'VERIFIED_APPROVED',
      review_notes: BASIS[language],
      reviewed_by: 5,
      reviewed_by_name: 'Omar Haddad',
      reviewed_at: '2026-10-31T10:00:00+00:00',
      review_mode: 'bulk',
      bulk_review_id: '6f1c2b8e-4d3a-4f6b-9c1d-2e7a5b9c0d14',
      bulk_review_size: 2,
    }
    renderPanel(language, statusPayload([
      artifact(503, 9103, { en: 'Safe workplaces', ar: 'بيئات عمل آمنة' }, [recordedInBulk, APPROVED]),
    ]))

    await screen.findByText(recordedInBulk.citation)
    const card = cardOf(recordedInBulk.citation, copy.reReview)
    expect(card.getByText('VERIFIED_APPROVED')).toBeInTheDocument()
    expect(card.getByText(copy.bulkBadge)).toBeInTheDocument()
    expect(cardOf(APPROVED.citation, copy.reReview).queryByText(copy.bulkBadge)).toBeNull()
    expect(screen.getAllByText(copy.bulkBadge)).toHaveLength(1)
    // Nothing is open, so there is nothing to offer one verdict for.
    expect(screen.queryByRole('region')).toBeNull()
  })
})
