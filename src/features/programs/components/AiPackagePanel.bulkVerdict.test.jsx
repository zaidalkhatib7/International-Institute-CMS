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
 *
 * The review of the same day added: the block only on a finished draft awaiting
 * review (run ai_draft, nothing generating); never a reference on content a
 * regeneration replaced (superseded_by), and such a reference no longer keeps the
 * publish button closed; a refusal reloads the review data and keeps every draft;
 * the switched-off 403 says what it is; and the one-by-one form sends flag_id.
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
    hint: (n) => `The same verdict and the same basis are recorded on every reference in this list that has no verdict yet (${n}), in your name, and each record is marked in the audit trail as a bulk verdict. A reference that already carries a recorded verdict (such as a rejection), or that belongs to content a regeneration replaced, is not included and is reviewed on its own.`,
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
    replacedBadge: 'Superseded',
    replacedNote: 'Content replaced by a regeneration — it does not block publication; its verdict is recorded on its own (SUPERSEDED is the honest verdict here).',
    switchedOff: 'Recording one verdict on many references is switched off on the server; record each reference on its own.',
    forbidden: 'You do not have permission to perform this action.',
    publish: 'Publish package (frozen version)',
  },
  ar: {
    title: (n) => `حكم واحد لكل المراجع غير المراجَعة (${n})`,
    hint: (n) => `يُسجَّل الحكم نفسه والأساس نفسه على كل مرجع في هذه القائمة لم يُسجَّل عليه حكم بعد (${n})، باسمك، ويُوسَم كل سجل في الأثر التدقيقي بأنه حكم جماعي. المرجع الذي عليه حكم مسجَّل (كالمرفوض)، أو الذي ينتمي إلى محتوى استُبدل بإعادة التوليد، لا يشمله هذا الحكم ويُراجَع وحده.`,
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
    replacedBadge: 'استُبدل',
    replacedNote: 'محتوى استُبدل بإعادة التوليد — لا يمنع النشر، ويُسجَّل حكمه وحده (الحكم الصادق هنا SUPERSEDED).',
    switchedOff: 'الحكم الواحد على مراجع كثيرة معطَّل على الخادم الآن، فسجّل حكم كل مرجع وحده.',
    forbidden: 'ليست لديك صلاحية تنفيذ هذا الإجراء.',
    publish: 'نشر الحقيبة (إصدار مجمّد)',
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
// Open, on the lesson a regeneration wrote in place of artifact 501.
const OPEN_C = { flag_id: 'sf_401', citation: 'Deming, Out of the Crisis (1986)', resolved: false, verification_status: 'SOURCE_REVIEW_REQUIRED' }

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

const LESSON_9101 = { en: 'Quality foundations', ar: 'أسس الجودة' }
const LESSON_9102 = { en: 'Planning the work', ar: 'تخطيط العمل' }

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
    artifact(501, 9101, LESSON_9101, [recorded(OPEN_A), recorded(OPEN_LEGACY), REJECTED]),
    artifact(502, 9102, LESSON_9102, [recorded(OPEN_B), APPROVED, LEGACY_RESOLVED]),
  ]
}

/*
 * Lesson 9101 regenerated: its first artifact (501) is kept for the audit trail
 * and points at the artifact that replaced it (503, sequence 2), the way the
 * orchestrator stores a component regeneration. The artifacts come ordered by id.
 */
function regeneratedArtifacts({ currentFlags = [OPEN_B, APPROVED], replacementFlags = [OPEN_C] } = {}) {
  return [
    { ...artifact(501, 9101, LESSON_9101, [OPEN_A, OPEN_LEGACY, REJECTED]), superseded_by: 503 },
    artifact(502, 9102, LESSON_9102, currentFlags),
    { ...artifact(503, 9101, LESSON_9101, replacementFlags), sequence: 2 },
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

// A finished draft awaiting review unless the test says otherwise: the run's
// statuses are queued, generating, ai_draft, failed and archived
// (TrainingPackageAuthoringOrchestrator).
function statusPayload(artifacts, top = {}, runPatch = {}) {
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
      run: { id: RUN_ID, status: 'ai_draft', current_step: null, artifacts, ...runPatch },
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

/*
 * Refusals exactly as ProgramAiAuthoringController::resolveSourceFlagsBulk
 * writes them, and what the reader sees: the server's own words in English, the
 * platform's reading of the same fixed line in Arabic (KNOWN_SERVER_LINES).
 */
const STALE_VIEW = `SOURCE_BULK_STALE_VIEW: the review screen was built from authoring run #${RUN_ID}, but the latest run of this programme is #${RUN_ID + 1}. Reload the review screen; nothing was recorded.`
const ALREADY_REVIEWED_B = `SOURCE_BULK_ALREADY_REVIEWED: the reference "${OPEN_B.citation}" on artifact #502 already carries a recorded verdict (REJECTED). A bulk verdict never overrides a recorded verdict — re-review it on its own. Nothing was recorded.`
const SWITCHED_OFF = 'SOURCE_BULK_VERDICT_DISABLED: recording one verdict on many references at once is switched off on this server (governance.bulk_source_verdicts), so sources take one-by-one review only. Record each verdict on its own reference.'

const READING = {
  en: { staleView: STALE_VIEW, alreadyReviewedB: ALREADY_REVIEWED_B },
  ar: {
    staleView: 'تغيّرت مسودة الحقيبة منذ فُتحت هذه الصفحة؛ أُعيد تحميل القائمة، فراجعها ثم أعد المحاولة. لم يُسجَّل شيء.',
    alreadyReviewedB: `المرجع «${OPEN_B.citation}» عليه حكم مسجَّل (REJECTED)، والحكم الواحد على مراجع كثيرة لا يلغي حكمًا مسجَّلًا؛ راجعه وحده. لم يُسجَّل شيء.`,
  },
}

function validationRefusal(field, line) {
  return { response: { status: 422, data: { message: line, errors: { [field]: [line] } } } }
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
  const reading = READING[language]

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
      artifact(501, 9101, LESSON_9101, [OPEN_A, REJECTED]),
    ]))

    await screen.findByText(OPEN_A.citation)
    expect(screen.queryByRole('region')).toBeNull()
    // The rejected reference still says its verdict is on record.
    expect(cardOf(REJECTED.citation, copy.recordOne).getByText(copy.notInBulk)).toBeInTheDocument()
  })

  // The server records it on ai_draft only (SOURCE_BULK_RUN_NOT_REVIEWABLE).
  it.each([
    ['queued', 'ai_generating'],
    ['generating', 'ai_generating'],
    ['failed', 'generation_failed'],
    ['archived', 'not_generated'],
  ])('is not offered while the run is %s: only a finished draft awaiting review takes it', async (runStatus, aiStatus) => {
    renderPanel(language, statusPayload(reviewArtifacts(), { ai_authoring_status: aiStatus }, { status: runStatus }))

    await screen.findByText(OPEN_A.citation)
    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.queryByPlaceholderText(copy.placeholder)).toBeNull()
    // The one-by-one review is untouched.
    expect(screen.getAllByRole('button', { name: copy.recordOne })).toHaveLength(4)
    expect(mocks.resolveAiPackageSourcesBulk).not.toHaveBeenCalled()
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

  it('shows the server’s refusal in the reader’s language, reloads the review data and keeps every draft', async () => {
    mocks.resolveAiPackageSourcesBulk.mockRejectedValue(validationRefusal('run_id', STALE_VIEW))
    renderPanel(language, statusPayload(reviewArtifacts()))

    await screen.findByRole('region', { name: copy.title(3) })
    fireEvent.change(cardOf(OPEN_A.citation, copy.recordOne).getByLabelText(copy.basis), {
      target: { value: 'A draft for this reference alone' },
    })
    const bulk = bulkBlock(copy.title(3))
    fireEvent.change(bulk.getByLabelText(copy.verdict), { target: { value: 'VERIFIED_APPROVED' } })
    fireEvent.change(bulk.getByLabelText(copy.basis), { target: { value: BASIS[language] } })
    expect(mocks.fetchAiPackageStatus).toHaveBeenCalledTimes(1)
    fireEvent.click(bulk.getByRole('button', { name: copy.record(3) }))

    expect(await screen.findByText(reading.staleView, { exact: false })).toBeInTheDocument()
    if (language === 'ar') expect(screen.queryByText(/SOURCE_BULK_STALE_VIEW/)).toBeNull()
    // Reloaded once, by the refusal itself: the list, the run and the switch the
    // next attempt uses are the server's current ones.
    expect(mocks.fetchAiPackageStatus).toHaveBeenCalledTimes(2)
    expect(screen.queryByText(copy.done(3))).toBeNull()
    const after = bulkBlock(copy.title(3))
    expect(after.getByLabelText(copy.verdict)).toHaveValue('VERIFIED_APPROVED')
    expect(after.getByLabelText(copy.basis)).toHaveValue(BASIS[language])
    await waitFor(() => expect(after.getByRole('button', { name: copy.record(3) })).toBeEnabled())
    expect(cardOf(OPEN_A.citation, copy.recordOne).getByLabelText(copy.basis)).toHaveValue('A draft for this reference alone')
  })

  it('after a refusal the reloaded list decides the retry, with the same verdict and basis', async () => {
    // Another reviewer rejected OPEN_B one by one while this screen was open.
    const decidedElsewhere = {
      ...OPEN_B,
      verification_status: 'REJECTED',
      resolved: false,
      review_notes: 'No seventh edition under this title could be found.',
      reviewed_by: 4,
      reviewed_by_name: 'Huda Saleh',
      reviewed_at: '2026-10-31T09:55:00+00:00',
    }
    mocks.resolveAiPackageSourcesBulk
      .mockRejectedValueOnce(validationRefusal('flags', ALREADY_REVIEWED_B))
      .mockResolvedValueOnce(bulkAnswer('VERIFIED_APPROVED', 2))
    renderPanel(language, statusPayload(reviewArtifacts()))

    await screen.findByRole('region', { name: copy.title(3) })
    fireEvent.change(cardOf(REJECTED.citation, copy.recordOne).getByLabelText(copy.basis), {
      target: { value: 'A re-review draft that stays' },
    })
    const bulk = bulkBlock(copy.title(3))
    fireEvent.change(bulk.getByLabelText(copy.verdict), { target: { value: 'VERIFIED_APPROVED' } })
    fireEvent.change(bulk.getByLabelText(copy.basis), { target: { value: BASIS[language] } })
    mocks.fetchAiPackageStatus.mockResolvedValue(statusPayload([
      artifact(501, 9101, LESSON_9101, [OPEN_A, OPEN_LEGACY, REJECTED]),
      artifact(502, 9102, LESSON_9102, [decidedElsewhere, APPROVED, LEGACY_RESOLVED]),
    ]))
    fireEvent.click(bulk.getByRole('button', { name: copy.record(3) }))

    // The refusal names the reference and its recorded verdict, in the reader's language.
    expect(await screen.findByText(reading.alreadyReviewedB, { exact: false })).toBeInTheDocument()
    expect(mocks.fetchAiPackageStatus).toHaveBeenCalledTimes(2)

    // The list is the server's current one: two open, OPEN_B on record and left out.
    await screen.findByRole('region', { name: copy.title(2) })
    const now = bulkBlock(copy.title(2))
    expect(cardOf(OPEN_B.citation, copy.recordOne).getByText(copy.notInBulk)).toBeInTheDocument()
    // Nothing the reviewer wrote was lost.
    expect(now.getByLabelText(copy.verdict)).toHaveValue('VERIFIED_APPROVED')
    expect(now.getByLabelText(copy.basis)).toHaveValue(BASIS[language])
    expect(cardOf(REJECTED.citation, copy.recordOne).getByLabelText(copy.basis)).toHaveValue('A re-review draft that stays')

    await waitFor(() => expect(now.getByRole('button', { name: copy.record(2) })).toBeEnabled())
    fireEvent.click(now.getByRole('button', { name: copy.record(2) }))

    await waitFor(() => expect(mocks.resolveAiPackageSourcesBulk).toHaveBeenCalledTimes(2))
    expect(mocks.resolveAiPackageSourcesBulk).toHaveBeenLastCalledWith(
      PROGRAM_ID,
      RUN_ID,
      'VERIFIED_APPROVED',
      BASIS[language],
      [
        { artifact_id: 501, flag_id: 'sf_101', citation: OPEN_A.citation },
        { artifact_id: 501, flag_id: null, citation: OPEN_LEGACY.citation },
      ],
    )
    expect(await screen.findByText(copy.done(2))).toBeInTheDocument()
  })

  it('says the server has switched the one verdict for all off, not that a permission is missing', async () => {
    mocks.resolveAiPackageSourcesBulk.mockRejectedValue({ response: { status: 403, data: { message: SWITCHED_OFF } } })
    renderPanel(language, statusPayload(reviewArtifacts()))

    await screen.findByRole('region', { name: copy.title(3) })
    fireEvent.change(cardOf(OPEN_A.citation, copy.recordOne).getByLabelText(copy.basis), {
      target: { value: 'A draft for this reference alone' },
    })
    const bulk = bulkBlock(copy.title(3))
    fireEvent.change(bulk.getByLabelText(copy.verdict), { target: { value: 'VERIFIED_APPROVED' } })
    fireEvent.change(bulk.getByLabelText(copy.basis), { target: { value: BASIS[language] } })
    // The reload finds the switch off.
    mocks.fetchAiPackageStatus.mockResolvedValue(statusPayload(reviewArtifacts(), { bulk_source_verdicts_enabled: false }))
    fireEvent.click(bulk.getByRole('button', { name: copy.record(3) }))

    expect(await screen.findByText(copy.switchedOff)).toBeInTheDocument()
    expect(screen.queryByText(copy.forbidden)).toBeNull()
    expect(screen.queryByText(/SOURCE_BULK_VERDICT_DISABLED/)).toBeNull()
    expect(mocks.fetchAiPackageStatus).toHaveBeenCalledTimes(2)
    // The block follows the reloaded switch; the one-by-one forms and their drafts stay.
    await waitFor(() => expect(screen.queryByRole('region')).toBeNull())
    expect(screen.getAllByRole('button', { name: copy.recordOne })).toHaveLength(4)
    expect(cardOf(OPEN_A.citation, copy.recordOne).getByLabelText(copy.basis)).toHaveValue('A draft for this reference alone')
  })

  it('leaves out every reference on content a regeneration replaced, and marks each of them', async () => {
    mocks.resolveAiPackageSourcesBulk.mockResolvedValue(bulkAnswer('VERIFIED_APPROVED', 2))
    renderPanel(language, statusPayload(regeneratedArtifacts()))

    // Two open on the current content; the two open on replaced content do not count.
    await screen.findByRole('region', { name: copy.title(2) })
    const bulk = bulkBlock(copy.title(2))
    expect(bulk.getByText(copy.hint(2))).toBeInTheDocument()

    for (const flag of [OPEN_A, OPEN_LEGACY, REJECTED]) {
      const card = cardOf(flag.citation, copy.recordOne)
      expect(card.getByText(copy.replacedBadge)).toBeInTheDocument()
      expect(card.getByText(copy.replacedNote)).toBeInTheDocument()
    }
    for (const flag of [OPEN_B, OPEN_C]) {
      const card = cardOf(flag.citation, copy.recordOne)
      expect(card.queryByText(copy.replacedBadge)).toBeNull()
      expect(card.queryByText(copy.replacedNote)).toBeNull()
    }
    expect(screen.getAllByText(copy.replacedNote)).toHaveLength(3)
    // A rejection on replaced content still says its verdict is on record.
    expect(cardOf(REJECTED.citation, copy.recordOne).getByText(copy.notInBulk)).toBeInTheDocument()
    // Each of them keeps its own form.
    expect(screen.getAllByRole('button', { name: copy.recordOne })).toHaveLength(5)
    // Open references on the current content still keep the package unpublishable.
    expect(screen.getByRole('button', { name: copy.publish })).toBeDisabled()

    fireEvent.change(bulk.getByLabelText(copy.verdict), { target: { value: 'VERIFIED_APPROVED' } })
    fireEvent.change(bulk.getByLabelText(copy.basis), { target: { value: BASIS[language] } })
    fireEvent.click(bulk.getByRole('button', { name: copy.record(2) }))

    expect(mocks.resolveAiPackageSourcesBulk).toHaveBeenCalledWith(
      PROGRAM_ID,
      RUN_ID,
      'VERIFIED_APPROVED',
      BASIS[language],
      [
        { artifact_id: 502, flag_id: 'sf_201', citation: OPEN_B.citation },
        { artifact_id: 503, flag_id: 'sf_401', citation: OPEN_C.citation },
      ],
    )
    expect(await screen.findByText(copy.done(2))).toBeInTheDocument()
  })

  it('does not keep the publish button closed for references on replaced content alone', async () => {
    renderPanel(language, statusPayload(regeneratedArtifacts({ currentFlags: [APPROVED], replacementFlags: [] })))

    await screen.findByText(OPEN_A.citation)
    // Two references are open, both on replaced content: nothing to offer in bulk.
    expect(screen.queryByRole('region')).toBeNull()
    for (const flag of [OPEN_A, OPEN_LEGACY, REJECTED]) {
      const card = cardOf(flag.citation, copy.recordOne)
      expect(card.getByText(copy.replacedBadge)).toBeInTheDocument()
      expect(card.getByText(copy.replacedNote)).toBeInTheDocument()
    }
    // The server's gate reads only the current content, and so does the button.
    expect(screen.getByRole('button', { name: copy.publish })).toBeEnabled()
    // The per-reference forms stay available for them.
    expect(screen.getAllByRole('button', { name: copy.recordOne })).toHaveLength(3)
  })

  it('sends the flag’s own flag_id with a one-by-one verdict, and none for a legacy flag', async () => {
    mocks.resolveAiPackageSource.mockResolvedValue({ message: 'Source verdict recorded: REJECTED.', data: { source_flags: [] } })
    renderPanel(language, statusPayload(reviewArtifacts()))

    await screen.findByRole('region', { name: copy.title(3) })
    const first = cardOf(OPEN_A.citation, copy.recordOne)
    fireEvent.change(first.getByLabelText(copy.verdict), { target: { value: 'REJECTED' } })
    fireEvent.change(first.getByLabelText(copy.basis), { target: { value: 'No such edition under this issuer.' } })
    fireEvent.click(first.getByRole('button', { name: copy.recordOne }))

    await waitFor(() => expect(mocks.resolveAiPackageSource).toHaveBeenCalledTimes(1))
    expect(mocks.resolveAiPackageSource).toHaveBeenLastCalledWith(
      PROGRAM_ID, 501, OPEN_A.citation, 'REJECTED', 'No such edition under this issuer.', 'sf_101',
    )
    await waitFor(() => expect(mocks.fetchAiPackageStatus).toHaveBeenCalledTimes(2))

    // A legacy flag has no flag_id: nothing is made up for it (the wire sends null).
    const legacy = cardOf(OPEN_LEGACY.citation, copy.recordOne)
    fireEvent.change(legacy.getByLabelText(copy.verdict), { target: { value: 'VERIFIED_APPROVED' } })
    fireEvent.change(legacy.getByLabelText(copy.basis), { target: { value: 'Checked the edition and the publisher.' } })
    await waitFor(() => expect(legacy.getByRole('button', { name: copy.recordOne })).toBeEnabled())
    fireEvent.click(legacy.getByRole('button', { name: copy.recordOne }))

    await waitFor(() => expect(mocks.resolveAiPackageSource).toHaveBeenCalledTimes(2))
    expect(mocks.resolveAiPackageSource).toHaveBeenLastCalledWith(
      PROGRAM_ID, 501, OPEN_LEGACY.citation, 'VERIFIED_APPROVED', 'Checked the edition and the publisher.', undefined,
    )
    expect(mocks.resolveAiPackageSourcesBulk).not.toHaveBeenCalled()
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
