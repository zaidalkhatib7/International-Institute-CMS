import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FinalExamPanel from './FinalExamPanel'
import { AFTER_QUIZ_COPY } from '../domain/afterQuiz'

/*
 * THE FINAL EXAM ON THE CASE (owner model of 15 Oct 2026, P6).
 *
 * Pinned: rounds, tries and the per-item correctness render for staff; the
 * blocked reason names the programme; the held level certificate lists its
 * holds; the certification fee (O2) shows as due under the API's state name
 * (awaiting_fee) with the fee frozen at the pass and its charge, and a fee the
 * Fees tab holds in money shows as fee_unusable; Void and Reopen appear only
 * with rpl.applications.manage and the server's flag, each needs a reason and
 * sends only it; a 403 tells the page to drop the tab.
 */

const mocks = vi.hoisted(() => ({
  fetchRplFinalExam: vi.fn(),
  voidRplFinalExamTry: vi.fn(),
  reopenRplFinalExamTry: vi.fn(),
}))

vi.mock('../services/rplService', () => mocks)

const EN = AFTER_QUIZ_COPY.en.finalExam
const AR = AFTER_QUIZ_COPY.ar.finalExam
const COMMON = AFTER_QUIZ_COPY.en.common
const usd = (minor, amount) => ({ currency: 'USD', amount_minor: minor, amount })

function attempt(number, overrides = {}) {
  return {
    verification_id: 80 + number,
    try_number: number,
    status: 'answered',
    opened_at: '2026-10-20T09:00:00Z',
    due_at: '2026-10-20T09:06:00Z',
    quiz_scored_at: '2026-10-20T09:05:00Z',
    result: 'failed',
    percent: 50,
    pass_mark_applied: 50,
    closed_by: 'all_answered',
    referral_reason: null,
    issued_snapshot_sha256: 'f00d'.repeat(16),
    manifest: { seed: 4242, per_course: [{ program_id: 41, k: 3, eligible: 9, excluded: { pending_review: 2, legacy_unreviewed: 0 } }, { program_id: 42, k: 3, eligible: 5, excluded: {} }] },
    items: [
      { item_ref: 1, program_id: 41, question_id: 501, answered: true, correct: true },
      { item_ref: 2, program_id: 42, question_id: 502, answered: true, correct: false },
      { item_ref: 3, program_id: 42, question_id: 503, answered: false, correct: null },
    ],
    ...overrides,
  }
}

function exam(overrides = {}) {
  return {
    state: 'available',
    blocked_reason: null,
    blocked_program: null,
    plan: { public_id: 'plan-1', version: 2, status: 'closed', closed_at: '2026-10-19T09:00:00Z' },
    courses: [
      { program: { id: 41, official_code: 'CGP-DGT-041', title: { en: 'Course 41', ar: 'دورة 41' } }, enrollment_id: 501, enrolled_package_version: '1.0', completed_at: '2026-10-18T09:00:00Z', eligible_question_count: 9, holds: [] },
      { program: { id: 42, official_code: 'CGP-DGT-042', title: { en: 'Course 42', ar: 'دورة 42' } }, enrollment_id: 502, enrolled_package_version: '1.1', completed_at: '2026-10-19T08:00:00Z', eligible_question_count: 2, holds: ['new_assessment'] },
    ],
    settings: { pass_mark_percent: 50, questions_per_course: 3, retake_wait_days: null, retake_fee: { usd: usd(40000, '400.00'), syp: null, exchange_rate: null } },
    rounds: [
      {
        round_number: 1,
        kind: 'included',
        status: 'open',
        tries_allowed: 3,
        exhausted_at: null,
        retake_wait_days_applied: null,
        eligible_from: null,
        passed_at: null,
        charge: null,
        tries: [
          attempt(1),
          attempt(2, { status: 'answered', result: 'referred', percent: null, referral_reason: 'snapshot_hash_mismatch' }),
          attempt(3, { status: 'issued', quiz_scored_at: null, result: null, percent: null, closed_by: null, items: [] }),
        ],
      },
    ],
    level_certificate: { state: 'not_due', holds: [], outbox: null, certificate: null },
    can: { void: true, reopen: true },
    ...overrides,
  }
}

function renderPanel(props = {}) {
  return render(<FinalExamPanel applicationId="case-41" language="en" canManage {...props} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetchRplFinalExam.mockResolvedValue({ data: exam() })
  mocks.voidRplFinalExamTry.mockResolvedValue({ data: exam() })
  mocks.reopenRplFinalExamTry.mockResolvedValue({ data: exam() })
})

describe('what staff see', () => {
  it('shows the rounds, the tries and the per-item correctness, the draw and the fingerprint', async () => {
    renderPanel()

    expect(await screen.findByText(EN.autoIssue)).toBeInTheDocument()
    expect(screen.getByText(EN.states.available)).toBeInTheDocument()
    const round = within(screen.getByRole('article', { name: 'Round 1' }))
    expect(round.getByText(EN.kinds.included)).toBeInTheDocument()
    expect(round.getByText('3 tries')).toBeInTheDocument()

    const first = within(round.getByRole('listitem', { name: 'Try 1' }))
    expect(first.getByText(EN.results.failed)).toBeInTheDocument()
    expect(first.getByText('50.00% (pass mark applied: more than 50%)')).toBeInTheDocument()
    expect(first.getByText('Seed: 4242')).toBeInTheDocument()
    expect(first.getByText('Programme 41: 3 drawn of 9 eligible')).toBeInTheDocument()
    expect(first.getByText('Excluded: pending review 2')).toBeInTheDocument()
    expect(first.getByText('Fingerprint of the questions sent: f00df00df00d…')).toBeInTheDocument()
    expect(first.getByText('Question 1 (programme 41)').closest('li')).toHaveTextContent(EN.marks.correct)
    expect(first.getByText('Question 2 (programme 42)').closest('li')).toHaveTextContent(EN.marks.incorrect)
    expect(first.getByText('Question 3 (programme 42)').closest('li')).toHaveTextContent(EN.marks.unanswered)
  })

  it('shows each studied course, its eligible questions against the draw, and its holds', async () => {
    renderPanel()

    const courses = within(await screen.findByRole('region', { name: EN.courses }))
    expect(courses.getByText('9 approved questions eligible for the draw')).toBeInTheDocument()
    expect(courses.getByText('2 approved questions eligible, and the draw takes 3: too few.')).toBeInTheDocument()
    expect(courses.getByText(/Blocked: New assessments/)).toBeInTheDocument()
    const settings = within(screen.getByRole('region', { name: EN.settings }))
    expect(settings.getByText('Pass mark: more than 50%')).toBeInTheDocument()
    expect(settings.getByText(`Waiting days before a retake: ${COMMON.notSet}`)).toBeInTheDocument()
    expect(settings.getByText('Retake fee: $ 400.00')).toBeInTheDocument()
  })

  it('names the programme when the final exam is blocked', async () => {
    mocks.fetchRplFinalExam.mockResolvedValue({ data: exam({ state: 'blocked', blocked_reason: 'question_bank_short', blocked_program: { id: 42, official_code: 'CGP-DGT-042' } }) })
    renderPanel()

    expect(await screen.findByText('CGP-DGT-042 has fewer approved questions than the final exam draws.')).toBeInTheDocument()
    expect(screen.getByText(EN.states.blocked)).toBeInTheDocument()
  })

  it('lists the holds a level certificate waits on', async () => {
    mocks.fetchRplFinalExam.mockResolvedValue({
      data: exam({
        state: 'passed',
        level_certificate: { state: 'held', holds: [{ hold_id: 3, program_code: 'CGP-PSD-010', package_version: '1.0' }], outbox: { status: 'pending', attempts: 2, last_error: 'Held: credential_issuance hold #3.', available_at: '2026-10-21T09:15:00Z' }, certificate: null },
      }),
    })
    renderPanel()

    const card = within(await screen.findByRole('region', { name: EN.level.title }))
    expect(card.getByText(EN.level.states.held)).toBeInTheDocument()
    expect(card.getByText(EN.level.held)).toBeInTheDocument()
    expect(card.getByText('Hold #3: CGP-PSD-010 version 1.0')).toBeInTheDocument()
    expect(card.getByText('Issuance job: pending, 2 attempts')).toBeInTheDocument()
    expect(card.getByText('Last error: Held: credential_issuance hold #3.')).toBeInTheDocument()
  })

  it('shows the level certification fee as due, then the issued certificate (O2)', async () => {
    // The API's S14 shape (RplLevelCertificateIssuer::staffState): awaiting_fee, the fee frozen at the pass, and its charge.
    mocks.fetchRplFinalExam.mockResolvedValue({
      data: exam({ state: 'passed', level_certificate: { state: 'awaiting_fee', fee_problem: null, holds: [], outbox: null, certificate: null, certification_fee: usd(90000, '900.00'), charge: { public_id: 'charge-9', type: 'certification_fee', amount: usd(90000, '900.00'), price_usd: usd(90000, '900.00'), exchange_rate: null, status: 'pending' } } }),
    })
    const { unmount } = renderPanel()

    const due = within(await screen.findByRole('region', { name: EN.level.title }))
    expect(due.getByText(EN.level.states.awaiting_fee)).toBeInTheDocument()
    expect(due.getByText(EN.level.feeDue)).toBeInTheDocument()
    expect(due.getByText('Certification fee frozen at the pass: $ 900.00')).toBeInTheDocument()
    expect(due.getByText('Certification fee: $ 900.00 · Awaiting confirmation')).toBeInTheDocument()
    expect(due.queryByText(EN.level.feeUnusable)).not.toBeInTheDocument()
    unmount()

    // Not yet requested by the client: the frozen fee, and no charge line.
    mocks.fetchRplFinalExam.mockResolvedValue({
      data: exam({ state: 'passed', level_certificate: { state: 'awaiting_fee', fee_problem: null, holds: [], outbox: null, certificate: null, certification_fee: usd(4000, '40.00'), charge: null } }),
    })
    const { unmount: unmountUnpaid } = renderPanel()
    const unpaid = within(await screen.findByRole('region', { name: EN.level.title }))
    expect(unpaid.getByText('Certification fee frozen at the pass: $ 40.00')).toBeInTheDocument()
    expect(unpaid.queryByText(/^Certification fee: /)).not.toBeInTheDocument()
    unmountUnpaid()

    mocks.fetchRplFinalExam.mockResolvedValue({ data: exam({ state: 'passed', level_certificate: { state: 'issued', holds: [], outbox: { status: 'processed', attempts: 1 }, certificate: { id: 90, number: 'ICPC-2026-000090', issued_at: '2026-10-21T09:00:00Z' } } }) })
    renderPanel()
    const issued = within(await screen.findByRole('region', { name: EN.level.title }))
    expect(issued.getByText(/^Certificate ICPC-2026-000090, issued on /)).toBeInTheDocument()
  })

  it('shows a pass stranded by a money fee on the Fees tab as fee_unusable, never as being issued (O2)', async () => {
    mocks.fetchRplFinalExam.mockResolvedValue({
      data: exam({ state: 'passed', level_certificate: { state: 'fee_unusable', fee_problem: 'RPL_SETTING_MISSING: rpl_fee_schedules', holds: [], outbox: { status: 'pending', attempts: 0, last_error: 'RPL_SETTING_MISSING: rpl_fee_schedules', available_at: '2026-10-21T09:15:00Z' }, certificate: null, certification_fee: null, charge: null } }),
    })
    renderPanel()

    const card = within(await screen.findByRole('region', { name: EN.level.title }))
    expect(card.getByText(EN.level.states.fee_unusable)).toBeInTheDocument()
    expect(card.getByText(EN.level.feeUnusable)).toBeInTheDocument()
    expect(card.queryByText(EN.level.states.queued)).not.toBeInTheDocument()
    expect(card.queryByText(EN.level.feeDue)).not.toBeInTheDocument()
  })
})

describe('void and reopen (S15, S16)', () => {
  it('voids only the referred try, with a reason, sending only the reason', async () => {
    renderPanel()

    const round = within(await screen.findByRole('article', { name: 'Round 1' }))
    expect(within(round.getByRole('listitem', { name: 'Try 1' })).queryByRole('button')).not.toBeInTheDocument()
    const referred = within(round.getByRole('listitem', { name: 'Try 2' }))
    expect(referred.getByText('Why referred: snapshot hash mismatch')).toBeInTheDocument()
    fireEvent.click(referred.getByRole('button', { name: EN.void }))

    const form = within(screen.getByRole('region', { name: EN.void }))
    expect(form.getByText(EN.voidHint)).toBeInTheDocument()
    const submit = form.getByRole('button', { name: EN.voidSubmit })
    fireEvent.change(form.getByLabelText(COMMON.reason), { target: { value: 'short' } })
    expect(submit).toBeDisabled()
    fireEvent.change(form.getByLabelText(COMMON.reason), { target: { value: 'The snapshot hash failed after the deploy of 20 Oct.' } })
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.voidRplFinalExamTry).toHaveBeenCalledWith(82, { reason: 'The snapshot hash failed after the deploy of 20 Oct.' }))
    expect(await screen.findByText(EN.voided)).toBeInTheDocument()
  })

  it('reopens only an opened try that is not marked, with a reason', async () => {
    renderPanel()

    const open = within(within(await screen.findByRole('article', { name: 'Round 1' })).getByRole('listitem', { name: 'Try 3' }))
    fireEvent.click(open.getByRole('button', { name: EN.reopen }))
    const form = within(screen.getByRole('region', { name: EN.reopen }))
    fireEvent.change(form.getByLabelText(COMMON.reason), { target: { value: 'The client lost the connection at 09:03.' } })
    fireEvent.click(form.getByRole('button', { name: EN.reopenSubmit }))

    await waitFor(() => expect(mocks.reopenRplFinalExamTry).toHaveBeenCalledWith(83, { reason: 'The client lost the connection at 09:03.' }))
  })

  it.each([
    ['without rpl.applications.manage', { canManage: false }, { void: true, reopen: true }],
    ['when the server allows neither', {}, { void: false, reopen: false }],
  ])('offers neither act %s', async (_, props, can) => {
    mocks.fetchRplFinalExam.mockResolvedValue({ data: exam({ can }) })
    renderPanel(props)

    await screen.findByRole('article', { name: 'Round 1' })
    expect(screen.queryByRole('button', { name: EN.void })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.reopen })).not.toBeInTheDocument()
  })

  it('shows a refusal and reloads when the try moved on', async () => {
    mocks.voidRplFinalExamTry.mockRejectedValue({ response: { status: 422, data: { message: 'Only a referred try can be voided.', reason_code: 'try_not_referred', errors: { verification: ['Only a referred try can be voided.'] } } } })
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: EN.void }))
    const form = within(screen.getByRole('region', { name: EN.void }))
    fireEvent.change(form.getByLabelText(COMMON.reason), { target: { value: 'The snapshot hash failed after the deploy.' } })
    fireEvent.click(form.getByRole('button', { name: EN.voidSubmit }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Only a referred try can be voided.')
    await waitFor(() => expect(mocks.fetchRplFinalExam).toHaveBeenCalledTimes(2))
  })
})

describe('the panel itself', () => {
  it('tells the page to drop the tab on a 403', async () => {
    mocks.fetchRplFinalExam.mockRejectedValue({ response: { status: 403, data: { message: 'This action is unauthorized.' } } })
    const onForbidden = vi.fn()
    renderPanel({ onForbidden })

    await waitFor(() => expect(onForbidden).toHaveBeenCalledTimes(1))
  })

  it('renders in Arabic without a literal "undefined"', async () => {
    mocks.fetchRplFinalExam.mockResolvedValue({ data: exam({ state: 'waiting', level_certificate: { state: 'awaiting_fee', holds: [], outbox: null, certificate: null, certification_fee: usd(90000, '900.00'), charge: { amount: { currency: 'SYP', amount_minor: 11700000, amount: '11700000' }, price_usd: usd(90000, '900.00'), exchange_rate: { id: 7, syp_per_usd: '13000.0000' }, status: 'pending' } } }) })
    renderPanel({ language: 'ar' })

    expect(await screen.findByText(AR.states.waiting)).toBeInTheDocument()
    expect(screen.getByText(AR.level.states.awaiting_fee)).toBeInTheDocument()
    expect(screen.getByText(AR.level.feeDue)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
