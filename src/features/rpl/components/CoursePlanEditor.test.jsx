import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CoursePlanEditor from './CoursePlanEditor'
import { COURSE_PLAN_COPY } from '../domain/coursePlan'
import { fill } from '../domain/documentScreening'

/*
 * THE COURSE PLAN EDITOR (owner flow of 12 Oct 2026, P5).
 *
 * Gemini proposes, staff edit with a reason and approve. What is pinned: the
 * proposal shows why each course is there; every write sends the plan's
 * lock_version and the exact body the API validates; approving fewer than the
 * minimum needs a written reason (D13(b)); a stale write says so, keeps the
 * reason and reloads; only proposed courses can be removed; nothing changes from
 * quality review onwards; a failed entry quiz shows no minimum (7.1 D11); and a
 * 403 hides the tab.
 */

const mocks = vi.hoisted(() => ({
  fetchRplCoursePlan: vi.fn(),
  fetchRplCoursePlanCatalogue: vi.fn(),
  fetchRplCoursePlanVersion: vi.fn(),
  generateRplCoursePlan: vi.fn(),
  regenerateRplCoursePlan: vi.fn(),
  addRplCoursePlanItem: vi.fn(),
  removeRplCoursePlanItem: vi.fn(),
  approveRplCoursePlan: vi.fn(),
  amendRplCoursePlan: vi.fn(),
  discardRplCoursePlan: vi.fn(),
}))

const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/rplService', () => mocks)
// Partial: the course picker and the date formatting read the language off this module.
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

const EN = COURSE_PLAN_COPY.en
const AR = COURSE_PLAN_COPY.ar
const REASON = 'The client already holds this certificate from a recognised body.'

function program(id, overrides = {}) {
  return {
    id,
    slug: `cgp-dgt-0${id}`,
    official_code: `CGP-DGT-0${id}`,
    title: { en: `Course ${id}`, ar: `دورة ${id}` },
    content_status: 'published',
    is_active: true,
    is_free: false,
    price_points: 120,
    buyable: true,
    ...overrides,
  }
}

function item(id, overrides = {}) {
  return {
    id,
    status: 'proposed',
    origin: 'gemini',
    purpose: 'gap_closure',
    purpose_inferred: false,
    position: id,
    program: program(40 + id),
    gemini_reason: `Closes the risk-analysis gap the answers showed (${id}).`,
    grounded_in: ['answered_assessment'],
    is_conditional: false,
    competency_codes: ['DGT-01'],
    addresses_criterion_ids: [],
    evidence_ids_considered: [7],
    added_by: null,
    added_reason: null,
    removed_by: null,
    removed_reason: null,
    removed_at: null,
    carried_from_item_id: null,
    purchased_at: null,
    completed_at: null,
    ...overrides,
  }
}

function plan(overrides = {}) {
  return {
    public_id: 'plan-1',
    version: 1,
    status: 'draft',
    is_live: true,
    is_amendment: false,
    source: 'final_evaluation',
    previous_plan_public_id: null,
    lock_version: 3,
    entry_quiz_result: 'passed',
    target_level: { id: 2, code: 'practitioner', name: { en: 'Practitioner', ar: 'ممارس' } },
    minimum_required: 2,
    minimum_applies: true,
    minimums_setting_snapshot: { key: 'rpl_course_plan_minimums', value: { practitioner: 2, advanced_practitioner: 7, expert: 10 }, level_code: 'practitioner', level_minimum: 2, applied: true, not_applied_reason: null, read_at: '2026-10-15T09:00:00Z' },
    below_minimum: false,
    below_minimum_cause: null,
    below_minimum_reason: null,
    catalogue_shortfall: false,
    catalogue_size: 100,
    model_shortfall: { reported: false, reason: null },
    counts: { active: 2, buyable: 2, removed: 0 },
    model: 'gemini-3.5-flash',
    ai_run_id: 9,
    creation_reason: null,
    created_by: { id: 1, name: 'Admin Example' },
    created_at: '2026-10-15T09:00:00Z',
    approved_by: null,
    approved_at: null,
    discarded_by: null,
    discarded_at: null,
    discard_reason: null,
    superseded_at: null,
    items: [
      item(1),
      item(2, { purpose: 'minimum_completion', gemini_reason: 'Strengthens the weakest area, data governance.', grounded_in: ['evidence_documents'] }),
    ],
    ...overrides,
  }
}

function overview(overrides = {}) {
  return {
    application: { public_id: 'case-1', case_reference: 'RPL-2026-PLAN', status: 'course_plan_review' },
    entry_quiz: { verification_id: 5, result: 'passed', percent: 72, pass_mark_applied: 50, scored_at: '2026-10-14T09:00:00Z' },
    after_courses: 'final_exam',
    experience_certificate_eligible: true,
    generation: { can_generate: false, refusal: 'case_status', target_level: { id: 2, code: 'practitioner', name: { en: 'Practitioner' } }, live_minimum: 2, minimum_applies: true },
    draft: plan(),
    approved: null,
    versions: [{ public_id: 'plan-1', version: 1, status: 'draft', source: 'final_evaluation', is_live: true, minimum_required: 2, active_count: 2, below_minimum: false, created_by_name: 'Admin Example', created_at: '2026-10-15T09:00:00Z', approved_at: null, superseded_at: null, discarded_at: null }],
    can: { generate: false, regenerate: true, edit: true, approve: true, amend: false, discard: true },
    ...overrides,
  }
}

function written(nextPlan, applicationStatus) {
  return { message: 'ok', data: { plan: nextPlan, application_status: applicationStatus } }
}

const EVIDENCE = [{ id: 7, title: 'Employment letter' }]

function renderEditor(props = {}) {
  return render(
    <CoursePlanEditor applicationId="case-1" application={{ status: 'course_plan_review' }} evidence={EVIDENCE} canManage language={language.current} onCaseChanged={props.onCaseChanged || vi.fn()} onForbidden={props.onForbidden || vi.fn()} {...props} />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  mocks.fetchRplCoursePlan.mockResolvedValue({ message: 'fetched', data: overview() })
})

describe('the proposal', () => {
  it('shows each course with its purpose, Gemini\'s reason, its grounds and the evidence considered', async () => {
    renderEditor()

    const first = within(await screen.findByRole('article', { name: 'Course 41' }))
    expect(first.getByText(EN.purpose.gap_closure)).toBeInTheDocument()
    expect(first.getByText(EN.origin.gemini)).toBeInTheDocument()
    expect(first.getByText(EN.itemStatus.proposed)).toBeInTheDocument()
    expect(first.getByText(EN.buyable)).toBeInTheDocument()
    expect(first.getByText('Closes the risk-analysis gap the answers showed (1).')).toBeInTheDocument()
    expect(first.getByText(EN.demonstrated)).toBeInTheDocument()
    expect(first.getByText(`${EN.groundedIn}: ${EN.ground_answered_assessment}`)).toBeInTheDocument()
    expect(first.getByText('Employment letter')).toBeInTheDocument()
    expect(first.getByText('CGP-DGT-041')).toBeInTheDocument()

    const second = within(screen.getByRole('article', { name: 'Course 42' }))
    expect(second.getByText(EN.purpose.minimum_completion)).toBeInTheDocument()
    expect(second.getByText('Strengthens the weakest area, data governance.')).toBeInTheDocument()

    expect(mocks.fetchRplCoursePlan).toHaveBeenCalledWith('case-1')
    expect(screen.getByText('2 of the minimum 2 for Practitioner · 2 available to buy')).toBeInTheDocument()
    expect(screen.getByText(/Entry quiz passed: 72\.00% \(pass mark: more than 50%\)/)).toBeInTheDocument()
    expect(screen.getByText('Minimums setting when generated: practitioner 2 · advanced_practitioner 7 · expert 10')).toBeInTheDocument()
    // A minimum applies to a passed plan, so its top-up is in place: no warning.
    expect(screen.queryByText(/no minimum applies to this plan/)).not.toBeInTheDocument()
  })

  it('labels a top-up as claiming no gap, and gives a staff course no claim from Gemini (R11)', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        draft: plan({
          items: [
            item(1),
            item(2, { purpose: 'minimum_completion', gemini_reason: 'Strengthens the weakest area, data governance.', grounded_in: ['evidence_documents'] }),
            item(3, { origin: 'staff', purpose: 'staff_added', gemini_reason: null, grounded_in: [], is_conditional: null, competency_codes: [], evidence_ids_considered: [], added_reason: REASON, added_by: { id: 1, name: 'Admin Example' } }),
          ],
        }),
      }),
    })
    renderEditor()

    const gap = within(await screen.findByRole('article', { name: 'Course 41' }))
    expect(gap.getByText(EN.demonstrated)).toBeInTheDocument()
    expect(gap.queryByText(EN.claimsNoGap)).not.toBeInTheDocument()

    const topUp = within(screen.getByRole('article', { name: 'Course 42' }))
    expect(topUp.getByText(EN.claimsNoGap)).toBeInTheDocument()
    expect(topUp.queryByText(EN.demonstrated)).not.toBeInTheDocument()
    expect(topUp.queryByText(EN.conditional)).not.toBeInTheDocument()

    const staff = within(screen.getByRole('article', { name: 'Course 43' }))
    expect(staff.getByText(REASON)).toBeInTheDocument()
    expect(staff.queryByText(EN.conditional)).not.toBeInTheDocument()
    expect(staff.queryByText(EN.demonstrated)).not.toBeInTheDocument()
  })

  it('generates with the screen language, shows the wait, and tells the page the case moved', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        application: { public_id: 'case-1', status: 'assessment_in_progress' },
        generation: { can_generate: true, refusal: null, target_level: null, live_minimum: 2, minimum_applies: true },
        draft: null,
        versions: [],
        can: { generate: true, regenerate: false, edit: false, approve: false, amend: false, discard: false },
      }),
    })
    let resolve
    mocks.generateRplCoursePlan.mockReturnValue(new Promise((done) => { resolve = done }))
    const onCaseChanged = vi.fn()
    renderEditor({ onCaseChanged })

    expect(await screen.findByText(EN.none)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: EN.generate }))

    expect(await screen.findByText(EN.generating)).toBeInTheDocument()
    expect(mocks.generateRplCoursePlan).toHaveBeenCalledWith('case-1', { locale: 'en' })

    resolve(written(plan(), 'course_plan_review'))
    await waitFor(() => expect(onCaseChanged).toHaveBeenCalledWith({ message: 'Gemini proposed version 1. Review it before approving.' }))
  })

  it('names the missing minimums setting on a 503, never "temporarily unavailable" (R15)', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        application: { public_id: 'case-1', status: 'assessment_in_progress' },
        generation: { can_generate: true, refusal: null, target_level: null, live_minimum: 5, minimum_applies: true },
        draft: null,
        versions: [],
        can: { generate: true, regenerate: false, edit: false, approve: false, amend: false, discard: false },
      }),
    })
    mocks.generateRplCoursePlan.mockRejectedValue({
      response: { status: 503, data: { message: 'The RPL setting rpl_course_plan_minimums has no minimum for level practitioner.', code: 'rpl_setting_missing', setting: 'rpl_course_plan_minimums' } },
    })
    renderEditor({ language: 'ar' })

    fireEvent.click(await screen.findByRole('button', { name: AR.generate }))

    expect(await screen.findByRole('alert')).toHaveTextContent(AR.blocked.minimum_setting_missing)
    expect(mocks.generateRplCoursePlan).toHaveBeenCalledWith('case-1', { locale: 'ar' })
  })

  it('says why a plan cannot be generated yet', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        application: { public_id: 'case-1', status: 'assessment_in_progress' },
        entry_quiz: { verification_id: 5, result: 'referred', percent: null, pass_mark_applied: null, scored_at: '2026-10-14T09:00:00Z' },
        after_courses: null,
        experience_certificate_eligible: null,
        generation: { can_generate: false, refusal: 'entry_quiz_referred', target_level: null, live_minimum: 2, minimum_applies: null },
        draft: null,
        versions: [],
        can: { generate: false, regenerate: false, edit: false, approve: false, amend: false, discard: false },
      }),
    })
    renderEditor()

    expect(await screen.findByText(EN.blocked.entry_quiz_referred)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.generate })).not.toBeInTheDocument()
  })

  it('regenerates with a required reason, sending the plan lock_version and the language', async () => {
    mocks.regenerateRplCoursePlan.mockResolvedValue(written(plan({ public_id: 'plan-2', version: 2, lock_version: 1, source: 'model_call' }), 'course_plan_review'))
    renderEditor()

    fireEvent.click(await screen.findByRole('button', { name: EN.regenerate }))
    const form = within(screen.getByRole('region', { name: EN.regenerate }))
    expect(form.getByText(/new proposal as version 2/)).toBeInTheDocument()
    expect(form.getByRole('button', { name: EN.regenerateSubmit })).toBeDisabled()
    fireEvent.change(form.getByLabelText(EN.reason), { target: { value: 'The client sent a new employment letter.' } })
    fireEvent.click(form.getByRole('button', { name: EN.regenerateSubmit }))

    await waitFor(() => expect(mocks.regenerateRplCoursePlan).toHaveBeenCalledWith('plan-1', { lock_version: 3, reason: 'The client sent a new employment letter.', locale: 'en' }))
    expect(await screen.findByText('Gemini proposed version 2. Review it before approving.')).toBeInTheDocument()
  })
})

describe('editing the draft', () => {
  it('adds a course from the pathway library, leaving out what is already in the plan, with { program_id, reason, lock_version }', async () => {
    mocks.fetchRplCoursePlanCatalogue.mockResolvedValue({
      data: [
        { program_id: 41, official_code: 'CGP-DGT-041', slug: 'cgp-dgt-041', title: { en: 'Course 41' }, buyable: true, in_plan: true },
        { program_id: 43, official_code: 'CGP-DGT-043', slug: 'cgp-dgt-043', title: { en: 'Course 43' }, buyable: false, in_plan: false },
        { program_id: 44, official_code: 'CGP-DGT-044', slug: 'cgp-dgt-044', title: { en: 'Course 44' }, buyable: true, in_plan: false },
      ],
    })
    const added = plan({ lock_version: 4, items: [...plan().items, item(3, { origin: 'staff', purpose: 'staff_added', program: program(43, { buyable: false }), added_reason: REASON, added_by: { id: 1, name: 'Admin Example' }, gemini_reason: null })] })
    mocks.addRplCoursePlanItem.mockResolvedValue(written(added, 'course_plan_review'))
    // After the write the editor reloads the overview: the server then holds the new course.
    mocks.fetchRplCoursePlan.mockResolvedValueOnce({ data: overview() }).mockResolvedValue({ data: overview({ draft: added }) })
    renderEditor()

    fireEvent.click(await screen.findByRole('button', { name: EN.add }))
    const form = within(screen.getByRole('region', { name: EN.addTitle }))
    expect(await form.findByRole('button', { name: /Course 43/ })).toBeInTheDocument()
    expect(form.getByRole('button', { name: /Course 44/ })).toBeInTheDocument()
    expect(form.queryByRole('button', { name: /Course 41/ })).not.toBeInTheDocument()
    expect(mocks.fetchRplCoursePlanCatalogue).toHaveBeenCalledWith('case-1')

    fireEvent.click(form.getByRole('button', { name: /Course 43/ }))
    // The chosen course says whether it can be bought now.
    expect(form.getByText(EN.notBuyable)).toBeInTheDocument()
    expect(form.getByRole('button', { name: EN.addSubmit })).toBeDisabled()
    fireEvent.change(form.getByLabelText(EN.reason), { target: { value: `  ${REASON}  ` } })
    fireEvent.click(form.getByRole('button', { name: EN.addSubmit }))

    await waitFor(() => expect(mocks.addRplCoursePlanItem).toHaveBeenCalledWith('plan-1', { lock_version: 3, program_id: 43, reason: REASON }))
    const card = within(await screen.findByRole('article', { name: 'Course 43' }))
    expect(card.getByText(EN.purpose.staff_added)).toBeInTheDocument()
    expect(card.getByText(REASON)).toBeInTheDocument()
    expect(card.getByText('Added by Admin Example')).toBeInTheDocument()
    expect(mocks.fetchRplCoursePlan).toHaveBeenCalledTimes(2)
  })

  it('removes a proposed course only with a reason, sent as the DELETE body', async () => {
    const after = plan({ lock_version: 4, items: [item(1, { status: 'removed', removed_reason: REASON, removed_by: { id: 1, name: 'Admin Example' }, removed_at: '2026-10-15T10:00:00Z' }), plan().items[1]] })
    mocks.removeRplCoursePlanItem.mockResolvedValue(written(after, 'course_plan_review'))
    mocks.fetchRplCoursePlan.mockResolvedValueOnce({ data: overview() }).mockResolvedValue({ data: overview({ draft: after }) })
    renderEditor()

    const card = within(await screen.findByRole('article', { name: 'Course 41' }))
    fireEvent.click(card.getByRole('button', { name: EN.remove }))
    const form = within(card.getByRole('region', { name: EN.removeSubmit }))
    const submit = form.getByRole('button', { name: EN.removeSubmit })
    expect(submit).toBeDisabled()
    fireEvent.change(form.getByLabelText(EN.reason), { target: { value: 'too short' } })
    expect(submit).toBeDisabled()
    expect(form.getByText(EN.reasonInvalid)).toBeInTheDocument()
    fireEvent.change(form.getByLabelText(EN.reason), { target: { value: REASON } })
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.removeRplCoursePlanItem).toHaveBeenCalledWith('plan-1', 1, { lock_version: 3, reason: REASON }))
    expect(await screen.findByText(EN.removed)).toBeInTheDocument()
    expect(screen.getByText(`${EN.removedList} (1)`)).toBeInTheDocument()
  })

  it('on a stale plan says so, keeps the typed reason and reloads, never the generic conflict line', async () => {
    mocks.removeRplCoursePlanItem.mockRejectedValue({
      response: { status: 409, data: { message: 'The course plan changed since you loaded it.', code: 'rpl_course_plan_stale', errors: { lock_version: ['The course plan changed since you loaded it.'] }, current_lock_version: 4 } },
    })
    renderEditor()

    const card = within(await screen.findByRole('article', { name: 'Course 41' }))
    fireEvent.click(card.getByRole('button', { name: EN.remove }))
    fireEvent.change(card.getByLabelText(EN.reason), { target: { value: REASON } })
    fireEvent.click(card.getByRole('button', { name: EN.removeSubmit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(EN.conflict)
    expect(screen.queryByText(/conflicts with the record/)).not.toBeInTheDocument()
    await waitFor(() => expect(mocks.fetchRplCoursePlan).toHaveBeenCalledTimes(2))
    expect(within(screen.getByRole('article', { name: 'Course 41' })).getByLabelText(EN.reason)).toHaveValue(REASON)
  })

  it('on a refusal meaning the screen is out of date, shows the server\'s sentence and reloads', async () => {
    const sentence = 'Course plan version 1 is approved and the case is in course_plan_active: only a live draft can change, while the case is in course_plan_review.'
    mocks.removeRplCoursePlanItem.mockRejectedValue({
      response: { status: 422, data: { message: sentence, errors: { plan_not_editable: [sentence] } } },
    })
    renderEditor()

    const card = within(await screen.findByRole('article', { name: 'Course 41' }))
    fireEvent.click(card.getByRole('button', { name: EN.remove }))
    fireEvent.change(card.getByLabelText(EN.reason), { target: { value: REASON } })
    fireEvent.click(card.getByRole('button', { name: EN.removeSubmit }))

    expect(await screen.findByRole('alert')).toHaveTextContent('only a live draft can change')
    await waitFor(() => expect(mocks.fetchRplCoursePlan).toHaveBeenCalledTimes(2))
  })

  it('does not reload on a refusal the writer fixes, such as a course that is no longer proposed', async () => {
    mocks.removeRplCoursePlanItem.mockRejectedValue({
      response: { status: 422, data: { message: 'Only a proposed course can be removed; this one is removed.', errors: { item: ['Only a proposed course can be removed; this one is removed.'] } } },
    })
    renderEditor()

    const card = within(await screen.findByRole('article', { name: 'Course 41' }))
    fireEvent.click(card.getByRole('button', { name: EN.remove }))
    fireEvent.change(card.getByLabelText(EN.reason), { target: { value: REASON } })
    fireEvent.click(card.getByRole('button', { name: EN.removeSubmit }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Only a proposed course can be removed')
    expect(mocks.fetchRplCoursePlan).toHaveBeenCalledTimes(1)
  })

  it('shows any other refusal as the server wrote it', async () => {
    mocks.removeRplCoursePlanItem.mockRejectedValue({
      response: { status: 403, data: { message: 'Staff cannot generate, edit or approve the course plan of their own case.' } },
    })
    renderEditor()

    const card = within(await screen.findByRole('article', { name: 'Course 41' }))
    fireEvent.click(card.getByRole('button', { name: EN.remove }))
    fireEvent.change(card.getByLabelText(EN.reason), { target: { value: REASON } })
    fireEvent.click(card.getByRole('button', { name: EN.removeSubmit }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Staff cannot generate, edit or approve the course plan of their own case.')
  })
})

describe('approving', () => {
  it('approves a plan at the minimum with the lock_version alone', async () => {
    mocks.approveRplCoursePlan.mockResolvedValue(written(plan({ status: 'approved', lock_version: 4, approved_at: '2026-10-15T11:00:00Z', approved_by: { id: 1, name: 'Admin Example' } }), 'course_plan_active'))
    const onCaseChanged = vi.fn()
    renderEditor({ onCaseChanged })

    const approve = within(await screen.findByRole('region', { name: 'Approve version 1' }))
    expect(approve.getByText('2 courses, 2 of them available to buy. The client will see this plan.')).toBeInTheDocument()
    expect(approve.queryByLabelText(EN.belowMinimumReason)).not.toBeInTheDocument()
    fireEvent.click(approve.getByRole('button', { name: EN.approveSubmit }))

    await waitFor(() => expect(mocks.approveRplCoursePlan).toHaveBeenCalledWith('plan-1', { lock_version: 3 }))
    await waitFor(() => expect(onCaseChanged).toHaveBeenCalledWith({ message: 'Plan approved: version 1 is in force.' }))
  })

  it('needs a written reason below the minimum and sends it as below_minimum_reason (D13(b))', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        generation: { can_generate: false, refusal: 'case_status', target_level: null, live_minimum: 5, minimum_applies: true },
        draft: plan({
          minimum_required: 5,
          below_minimum: true,
          below_minimum_cause: 'model_reported_shortfall',
          model_shortfall: { reported: true, reason: 'The library holds only two digital courses.' },
          counts: { active: 2, buyable: 1, removed: 0 },
          items: [item(1), item(2, { program: program(42, { buyable: false, content_status: 'draft' }) })],
        }),
      }),
    })
    mocks.approveRplCoursePlan.mockResolvedValue(written(plan({ status: 'approved', minimum_required: 5, below_minimum: true }), 'course_plan_active'))
    renderEditor()

    expect(await screen.findByText('Below the minimum: 2 of 5.')).toBeInTheDocument()
    expect(screen.getByText(EN.below.model_reported_shortfall)).toBeInTheDocument()
    expect(screen.getByText('What Gemini said about the library: The library holds only two digital courses.')).toBeInTheDocument()
    expect(screen.getByText(EN.shortfallNeverBlocks)).toBeInTheDocument()

    const approve = within(screen.getByRole('region', { name: 'Approve version 1' }))
    expect(approve.getByText('This plan has 2 courses; the minimum for Practitioner is 5.')).toBeInTheDocument()
    expect(approve.getByText('1 of these courses cannot be bought yet; the client will see them as not available yet.')).toBeInTheDocument()
    const submit = approve.getByRole('button', { name: EN.approveSubmit })
    expect(submit).toBeDisabled()
    fireEvent.change(approve.getByLabelText(EN.belowMinimumReason), { target: { value: 'The library has no further digital courses for this pathway.' } })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.approveRplCoursePlan).toHaveBeenCalledWith('plan-1', { lock_version: 3, below_minimum_reason: 'The library has no further digital courses for this pathway.' }))
  })

  it('cannot approve a plan with no course', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: overview({ draft: plan({ items: [], counts: { active: 0, buyable: 0, removed: 0 } }) }) })
    renderEditor()

    const approve = within(await screen.findByRole('region', { name: 'Approve version 1' }))
    expect(approve.getByText(EN.emptyPlan)).toBeInTheDocument()
    expect(approve.getByRole('button', { name: EN.approveSubmit })).toBeDisabled()
  })

  it('notes when the minimum changed after this draft was generated', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: overview({ generation: { can_generate: false, refusal: 'case_status', target_level: null, live_minimum: 6, minimum_applies: true } }) })
    renderEditor()

    expect(await screen.findByText('This version was generated with the minimum 2; the setting is now 6. Generate a new proposal to apply it.')).toBeInTheDocument()
  })
})

describe('an amendment', () => {
  it('keeps the version in force beside the draft, and offers Remove only on proposed courses', async () => {
    const inForce = plan({ status: 'approved', items: [item(1, { status: 'approved' }), item(2, { status: 'approved' })], approved_at: '2026-10-15T11:00:00Z', approved_by: { id: 1, name: 'Admin Example' } })
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        application: { public_id: 'case-1', status: 'course_plan_active' },
        approved: inForce,
        draft: plan({
          public_id: 'plan-2',
          version: 2,
          is_amendment: true,
          source: 'amendment',
          creation_reason: 'The client asked to swap one course.',
          items: [item(11, { carried_from_item_id: 1 }), item(12, { status: 'purchased', carried_from_item_id: 2, purchased_at: '2026-10-16T10:00:00Z' })],
        }),
        can: { generate: false, regenerate: false, edit: true, approve: true, amend: false, discard: true },
      }),
    })
    renderEditor()

    expect(await screen.findByText('Amendment draft version 2: version 1 stays in force until this one is approved.')).toBeInTheDocument()
    expect(screen.getByText('Reason for this version: The client asked to swap one course.')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Course 51' })).getByRole('button', { name: EN.remove })).toBeInTheDocument()
    const purchased = within(screen.getByRole('article', { name: 'Course 52' }))
    expect(purchased.queryByRole('button', { name: EN.remove })).not.toBeInTheDocument()
    expect(purchased.getByText(EN.lockedPurchased)).toBeInTheDocument()
    // The version in force is read-only and never regenerated.
    expect(screen.getByText('Version 1 in force')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.regenerate })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: EN.remove })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: EN.discard }))
    expect(within(screen.getByRole('region', { name: EN.discard })).getByText('The amendment draft is closed and version 1 stays in force. The draft stays in the history.')).toBeInTheDocument()
  })

  it('amends the plan in force with a reason', async () => {
    const inForce = plan({ status: 'approved', items: [item(1, { status: 'approved' })] })
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        application: { public_id: 'case-1', status: 'course_plan_active' },
        approved: inForce,
        draft: null,
        can: { generate: false, regenerate: false, edit: false, approve: false, amend: true, discard: false },
      }),
    })
    mocks.amendRplCoursePlan.mockResolvedValue(written(plan({ public_id: 'plan-2', version: 2, is_amendment: true, source: 'amendment' }), 'course_plan_active'))
    const onCaseChanged = vi.fn()
    renderEditor({ onCaseChanged })

    fireEvent.click(await screen.findByRole('button', { name: EN.amend }))
    const form = within(screen.getByRole('region', { name: EN.amend }))
    fireEvent.change(form.getByLabelText(EN.reason), { target: { value: 'The client asked to swap one course.' } })
    fireEvent.click(form.getByRole('button', { name: EN.amendSubmit }))

    await waitFor(() => expect(mocks.amendRplCoursePlan).toHaveBeenCalledWith('plan-1', { lock_version: 3, reason: 'The client asked to swap one course.' }))
    expect(await screen.findByText('Amendment draft version 2 created.')).toBeInTheDocument()
    // The case did not move, so the page is not asked to reload it.
    expect(onCaseChanged).not.toHaveBeenCalled()
  })
})

describe('what the screen will not do', () => {
  it('is read-only from quality review onwards', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        application: { public_id: 'case-1', status: 'quality_review' },
        draft: null,
        approved: plan({ status: 'approved', items: [item(1, { status: 'approved' })] }),
        can: { generate: false, regenerate: false, edit: false, approve: false, amend: false, discard: false },
      }),
    })
    renderEditor({ application: { status: 'quality_review' } })

    expect(await screen.findByText(EN.readOnly)).toBeInTheDocument()
    for (const name of [EN.remove, EN.add, EN.approveSubmit, EN.amend, EN.discard, EN.regenerate, EN.generate]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })

  it('offers no write to a viewer without rpl.course_plans.manage, whatever the flags say', async () => {
    renderEditor({ canManage: false })

    expect(await screen.findByRole('article', { name: 'Course 41' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.remove })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.approveSubmit })).not.toBeInTheDocument()
  })

  it('shows a failed entry quiz with no Experience Confirmation Certificate, and a plan made before the failed minimum with none (7.1 D11)', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        entry_quiz: { verification_id: 5, result: 'failed', percent: 42, pass_mark_applied: 50, scored_at: '2026-10-14T09:00:00Z' },
        after_courses: 'final_exam',
        experience_certificate_eligible: false,
        generation: { can_generate: false, refusal: 'case_status', target_level: null, live_minimum: 5, minimum_applies: false },
        draft: plan({ entry_quiz_result: 'failed', minimum_required: 0, minimum_applies: false }),
      }),
    })
    renderEditor()

    expect(await screen.findByText(fill(EN.quizFailed, { percent: '42.00', mark: 50, level: 'Practitioner' }))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(EN.noMinimum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument()
    expect(screen.queryByText(/of the minimum/)).not.toBeInTheDocument()
    expect(screen.queryByText(EN.quizPassed.slice(0, 18))).not.toBeInTheDocument()
    // The live minimum differs, but a failed plan has none to apply.
    expect(screen.queryByText(/Generate a new proposal to apply it/)).not.toBeInTheDocument()
    // F1: the fixture's top-up has no place on a gap-closing plan, and the screen says so.
    expect(screen.getByText(fill(EN.topUpWithoutMinimum, { count: 1 }))).toBeInTheDocument()
  })

  it('asks the page to hide the tab on a 403, and shows no error', async () => {
    mocks.fetchRplCoursePlan.mockRejectedValue({ response: { status: 403, data: { message: 'This action is unauthorized.' } } })
    const onForbidden = vi.fn()
    renderEditor({ onForbidden })

    await waitFor(() => expect(onForbidden).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/unauthorized/)).not.toBeInTheDocument()
  })

  it('shows a load failure with a retry', async () => {
    mocks.fetchRplCoursePlan.mockRejectedValueOnce({ response: { status: 500, data: {} } })
    renderEditor()

    fireEvent.click(await screen.findByRole('button', { name: EN.retry }))
    expect(await screen.findByRole('article', { name: 'Course 41' })).toBeInTheDocument()
  })
})

describe('the history', () => {
  it('never says a minimum was sent to Gemini for an amendment, which asks Gemini nothing', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        versions: [
          { public_id: 'plan-2', version: 2, status: 'draft', source: 'amendment', is_live: true, minimum_required: 2, active_count: 2, below_minimum: false, created_by_name: 'Admin Example', created_at: '2026-10-16T09:00:00Z' },
          { public_id: 'plan-1', version: 1, status: 'approved', source: 'model_call', is_live: true, minimum_required: 2, active_count: 2, below_minimum: false, created_by_name: 'Admin Example', created_at: '2026-10-15T09:00:00Z' },
        ],
      }),
    })
    renderEditor()

    await screen.findByText(EN.history)
    const amendmentRow = within(screen.getByText('Version 2').closest('li'))
    expect(amendmentRow.getByText(/2 courses/)).toBeInTheDocument()
    expect(amendmentRow.queryByText(/Minimum sent to Gemini/)).not.toBeInTheDocument()
    expect(within(screen.getAllByText('Version 1').find((node) => node.closest('li')).closest('li')).getByText(/Minimum sent to Gemini: 2/)).toBeInTheDocument()
  })

  it('opens a past version read-only', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        versions: [
          { public_id: 'plan-1', version: 1, status: 'draft', source: 'model_call', is_live: true, minimum_required: 2, active_count: 2, below_minimum: false, created_by_name: 'Admin Example', created_at: '2026-10-15T09:00:00Z' },
          { public_id: 'plan-0', version: 0, status: 'superseded', source: 'final_evaluation', is_live: false, minimum_required: 2, active_count: 1, below_minimum: true, created_by_name: 'Admin Example', created_at: '2026-10-14T09:00:00Z' },
        ],
      }),
    })
    mocks.fetchRplCoursePlanVersion.mockResolvedValue({ data: plan({ public_id: 'plan-0', version: 0, status: 'superseded', is_live: false, items: [item(9)] }) })
    renderEditor()

    await screen.findByText(EN.history)
    fireEvent.click(screen.getAllByRole('button', { name: EN.view })[1])

    await waitFor(() => expect(mocks.fetchRplCoursePlanVersion).toHaveBeenCalledWith('plan-0'))
    expect(await screen.findByText('Course 49')).toBeInTheDocument()
    expect(screen.getByText(EN.planStatus.superseded)).toBeInTheDocument()
  })
})

describe('in Arabic', () => {
  it('renders the whole plan without a literal "undefined"', async () => {
    language.current = 'ar'
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        draft: plan({ below_minimum: true, minimum_required: 5, below_minimum_cause: 'catalogue_shortfall', items: [item(1), item(2, { status: 'removed', removed_reason: REASON, removed_by: { id: 1, name: 'مدير' }, removed_at: '2026-10-15T10:00:00Z' })] }),
      }),
    })
    renderEditor({ language: 'ar' })

    expect(await screen.findByRole('article', { name: 'دورة 41' })).toBeInTheDocument()
    expect(screen.getByText(AR.below.catalogue_shortfall)).toBeInTheDocument()
    expect(screen.getByText(AR.title)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})

/*
 * P6 ON THE COURSE PLAN (owner model of 15 Oct 2026) and the failed-client
 * minimum (round-3 answer O1, "hybrid"). The banner reads the entry quiz itself;
 * each item shows what the client did with it; a governance hold is flagged on
 * the item and listed as a warning (never a block) when approving; a closed plan
 * says the final exam is open; and a failed plan made under O1 counts against its
 * own minimum, flagging only the top-ups it does not need.
 */
describe('P6 on the plan', () => {
  it('reads the banner from the entry quiz, never from leads_to_certificate_review', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: overview({ after_courses: 'final_exam', leads_to_certificate_review: false }) })
    renderEditor()

    expect(await screen.findByText(fill(EN.quizPassed, { percent: '72.00', mark: 50, level: 'Practitioner' }))).toBeInTheDocument()
    expect(screen.queryByText(/Entry quiz not passed/)).not.toBeInTheDocument()
  })

  it('shows what the client bought, the enrolment, the lessons and the course quiz, and a closed plan\'s message', async () => {
    const enrollment = (id, quizPassed, done) => ({ id, status: done === 6 && quizPassed ? 'completed' : 'active', lifecycle_status: 'active', package_version: '1.0', enrolled_at: '2026-10-16T09:00:00Z', completed_at: null, progress: { lessons_completed: done, lessons_total: 6, course_quiz_passed: quizPassed } })
    const closed = plan({
      status: 'closed',
      closed_reason: 'learning_complete',
      closed_at: '2026-10-20T09:00:00Z',
      items: [
        item(1, { status: 'completed', purchased_at: '2026-10-16T09:00:00Z', completed_at: '2026-10-19T09:00:00Z', enrollment: enrollment(501, true, 6) }),
        item(2, { status: 'purchased', purchased_at: '2026-10-16T10:00:00Z', enrollment: enrollment(502, false, 3) }),
      ],
    })
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: overview({ application: { public_id: 'case-1', status: 'final_exam' }, draft: null, approved: closed, can: { generate: false, regenerate: false, edit: false, approve: false, amend: false, discard: false } }) })
    renderEditor({ application: { status: 'final_exam' } })

    expect(await screen.findByText(EN.learningComplete)).toBeInTheDocument()
    expect(screen.getByText(EN.planStatus.closed)).toBeInTheDocument()
    // Read-only in the final exam: nothing to amend or approve.
    expect(screen.getByText(EN.readOnly)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.amend })).not.toBeInTheDocument()

    const done = within(screen.getByRole('article', { name: 'Course 41' }))
    expect(done.getByText(EN.itemStatus.completed)).toBeInTheDocument()
    expect(done.getByText('Enrolment #501 · package version 1.0')).toBeInTheDocument()
    expect(done.getByText('6 of 6 lessons completed')).toBeInTheDocument()
    expect(done.getByText(EN.courseQuizPassed)).toBeInTheDocument()
    expect(done.getByText(/^Completed on /)).toBeInTheDocument()
    // A course the client holds is not offered for sale, so no "buyable" badge on it.
    expect(done.queryByText(EN.buyable)).not.toBeInTheDocument()

    const bought = within(screen.getByRole('article', { name: 'Course 42' }))
    expect(bought.getByText(/^Bought on /)).toBeInTheDocument()
    expect(bought.getByText('3 of 6 lessons completed')).toBeInTheDocument()
    expect(bought.getByText(EN.courseQuizNotPassed)).toBeInTheDocument()
  })

  it('flags a course on a governance hold, and warns about it when approving without blocking', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({ draft: plan({ items: [item(1, { holds: ['new_enrolment', 'new_assessment'], program: program(41, { official_code: 'CGP-PSD-010' }) }), item(2)] }) }),
    })
    renderEditor()

    const held = within(await screen.findByRole('article', { name: 'Course 41' }))
    expect(held.getByText(EN.onHold)).toBeInTheDocument()
    expect(held.getByText(`${EN.itemOnHold} Blocked: New enrolments · New assessments`)).toBeInTheDocument()

    const approve = within(screen.getByRole('region', { name: 'Approve version 1' }))
    expect(approve.getByText(fill(EN.approveHeld, { count: 1, codes: 'CGP-PSD-010' }))).toBeInTheDocument()
    expect(approve.getByRole('button', { name: EN.approveSubmit })).toBeEnabled()
  })

  it('counts a failed plan made under O1 against its own minimum, gaps first, and flags only an unneeded top-up', async () => {
    const failedPlan = (items, minimum = 3) => plan({
      entry_quiz_result: 'failed',
      minimum_required: minimum,
      minimum_applies: true,
      minimums_setting_snapshot: { key: 'rpl_course_plan_minimums_failed', value: { practitioner: 3, advanced_practitioner: 7, expert: 10 }, level_code: 'practitioner', level_minimum: 3, applied: true, not_applied_reason: null, read_at: '2026-10-15T09:00:00Z' },
      counts: { active: items.length, buyable: items.length, removed: 0 },
      items,
    })
    const failedOverview = (draft) => overview({
      entry_quiz: { verification_id: 5, result: 'failed', percent: 42, pass_mark_applied: 50, scored_at: '2026-10-14T09:00:00Z' },
      experience_certificate_eligible: false,
      generation: { can_generate: false, refusal: 'case_status', target_level: { id: 2, code: 'practitioner', name: { en: 'Practitioner' } }, live_minimum: 3, minimum_applies: true },
      draft,
    })
    // Two gaps and one top-up against a minimum of 3: exactly what the plan needs.
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: failedOverview(failedPlan([item(1), item(2), item(3, { purpose: 'minimum_completion' })])) })
    const { unmount } = renderEditor()

    expect(await screen.findByText('3 of the minimum 3 for Practitioner · 3 available to buy')).toBeInTheDocument()
    expect(screen.getByText(fill(EN.failedMinimum, { minimum: 3 }))).toBeInTheDocument()
    expect(screen.queryByText(/without them/)).not.toBeInTheDocument()
    expect(screen.queryByText(EN.noMinimum)).not.toBeInTheDocument()
    unmount()

    // Three gaps already reach the minimum: the top-up is not needed, and staff are told so.
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: failedOverview(failedPlan([item(1), item(2), item(4), item(3, { purpose: 'minimum_completion' })])) })
    renderEditor()
    expect(await screen.findByText(fill(EN.topUpBeyondMinimum, { count: 1, minimum: 3 }))).toBeInTheDocument()
    expect(screen.queryByText(fill(EN.topUpWithoutMinimum, { count: 1 }))).not.toBeInTheDocument()
  })

  it('reads a failed minimum of 0 as gaps only, and flags every top-up', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        entry_quiz: { verification_id: 5, result: 'failed', percent: 42, pass_mark_applied: 50, scored_at: '2026-10-14T09:00:00Z' },
        draft: plan({ entry_quiz_result: 'failed', minimum_required: 0, minimum_applies: true }),
      }),
    })
    renderEditor()

    expect(await screen.findByText(new RegExp(EN.noMinimum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument()
    expect(screen.queryByText(/of the minimum/)).not.toBeInTheDocument()
    expect(screen.getByText(fill(EN.topUpWithoutMinimum, { count: 1 }))).toBeInTheDocument()
  })

  it('renders P6 items in Arabic without a literal "undefined"', async () => {
    language.current = 'ar'
    mocks.fetchRplCoursePlan.mockResolvedValue({
      data: overview({
        application: { public_id: 'case-1', status: 'final_exam' },
        draft: null,
        approved: plan({ status: 'closed', closed_reason: 'learning_complete', items: [item(1, { status: 'completed', holds: ['credential_issuance'], purchased_at: '2026-10-16T09:00:00Z', completed_at: '2026-10-19T09:00:00Z', enrollment: { id: 501, package_version: '1.0', progress: { lessons_completed: 6, lessons_total: 6, course_quiz_passed: true } } })] }),
        can: { generate: false, regenerate: false, edit: false, approve: false, amend: false, discard: false },
      }),
    })
    renderEditor({ language: 'ar', application: { status: 'final_exam' } })

    expect(await screen.findByText(AR.learningComplete)).toBeInTheDocument()
    expect(screen.getByText(AR.courseQuizPassed)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
