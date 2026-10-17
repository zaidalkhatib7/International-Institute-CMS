import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplAfterQuizQueuePage from './RplAfterQuizQueuePage'
import { AFTER_QUIZ_COPY } from '../domain/afterQuiz'
import { getRouteAccess } from '../../../routes/routeAccess'

/*
 * THE STAFF QUEUES AFTER THE ENTRY QUIZ (owner model of 15 Oct 2026, P6).
 *
 * One page with a mode. Pinned: each mode loads its own route with its filters
 * (payments default to pending), every row links to its case, the attention
 * mode shows its three lists, and each route is kept to its permission.
 */

const mocks = vi.hoisted(() => ({
  fetchRplChargeQueue: vi.fn(),
  fetchRplExperienceCertificateQueue: vi.fn(),
  fetchRplAfterQuizAttention: vi.fn(),
}))

const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/rplService', () => mocks)
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

const Q = AFTER_QUIZ_COPY.en.queue

function staffCharge(overrides = {}) {
  return {
    id: 7,
    public_id: 'charge-7',
    type: 'certification_fee',
    cycle: 1,
    amount: { currency: 'USD', amount_minor: 90000, amount: '900.00' },
    price_usd: { currency: 'USD', amount_minor: 90000, amount: '900.00' },
    exchange_rate: null,
    route: 'offline',
    status: 'pending',
    payer_reference: 'Transfer from Amina',
    requested_at: '2026-10-21T09:00:00Z',
    application: { public_id: 'case-41', case_reference: 'RPL-2026-AFTER' },
    client: { id: 9, name: 'Amina Saleh' },
    lock_version: 1,
    can: { confirm: true, cancel: true, refund: false },
    ...overrides,
  }
}

function renderPage(mode) {
  return render(<MemoryRouter><RplAfterQuizQueuePage mode={mode} /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  mocks.fetchRplChargeQueue.mockResolvedValue({ data: [staffCharge()] })
  mocks.fetchRplExperienceCertificateQueue.mockResolvedValue({
    data: [{ public_id: 'cert-1', status: 'requested', client_choice: 'stop', application: { public_id: 'case-42', case_reference: 'RPL-2026-EXC', status: 'course_plan_active' }, client: { id: 10, name: 'Omar Haddad' }, entry_quiz: { percent: 72, pass_mark_applied: 50 }, charge: { amount: { currency: 'SYP', amount_minor: 19500000, amount: '19500000' }, price_usd: { currency: 'USD', amount_minor: 150000, amount: '1500.00' }, exchange_rate: { id: 7, syp_per_usd: '13000.0000' }, status: 'paid' }, created_at: '2026-10-21T08:00:00Z' }],
  })
  mocks.fetchRplAfterQuizAttention.mockResolvedValue({
    data: {
      final_exam_blocked: [{ application: { public_id: 'case-43', case_reference: 'RPL-2026-BLK' }, blocked_reason: 'question_bank_short', program: { id: 42, official_code: 'CGP-DGT-042', title: { en: 'Course 42' } } }],
      level_certificates_held: [{ application: { public_id: 'case-44', case_reference: 'RPL-2026-HLD' }, holds: [{ hold_id: 3, program_code: 'CGP-PSD-010', package_version: '1.0' }] }],
      level_certificates_fee_unusable: [{ application: { public_id: 'case-46', case_reference: 'RPL-2026-FEE', status: 'final_exam' }, setting: 'rpl_fee_schedules', problem: 'RPL_SETTING_MISSING: rpl_fee_schedules' }],
      paid_charges_on_closed_cases: [staffCharge({ public_id: 'charge-8', type: 'final_exam_retake', cycle: 2, status: 'paid', application: { public_id: 'case-45', case_reference: 'RPL-2026-CLS' } })],
    },
  })
})

describe('the payments queue (S1)', () => {
  it('loads the pending charges, filters by type, and links each row to its case', async () => {
    renderPage('payments')

    expect(await screen.findByRole('heading', { name: Q.payments.title })).toBeInTheDocument()
    await waitFor(() => expect(mocks.fetchRplChargeQueue).toHaveBeenCalledWith({ status: 'pending' }))
    expect(await screen.findByRole('link', { name: 'RPL-2026-AFTER' })).toHaveAttribute('href', '/rpl/applications/case-41')
    const table = within(screen.getByRole('table', { name: Q.payments.title }))
    expect(table.getByText('Level certification fee')).toBeInTheDocument()
    expect(table.getByText('$ 900.00')).toBeInTheDocument()
    // Paid in (owner, 17 Oct 2026): the currency of the request, in words.
    expect(table.getByRole('columnheader', { name: Q.paidIn })).toBeInTheDocument()
    expect(table.getByText(AFTER_QUIZ_COPY.en.common.paidIn.USD)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(Q.type), { target: { value: 'certification_fee' } })
    await waitFor(() => expect(mocks.fetchRplChargeQueue).toHaveBeenLastCalledWith({ status: 'pending', type: 'certification_fee' }))
    fireEvent.change(screen.getByLabelText(Q.status), { target: { value: '' } })
    await waitFor(() => expect(mocks.fetchRplChargeQueue).toHaveBeenLastCalledWith({ type: 'certification_fee' }))
  })
})

describe('the experience certificates queue (S7)', () => {
  it('loads the server default (awaiting approval), filters by status, and links to the case', async () => {
    renderPage('experience_certificates')

    await waitFor(() => expect(mocks.fetchRplExperienceCertificateQueue).toHaveBeenCalledWith({}))
    expect(await screen.findByRole('link', { name: 'RPL-2026-EXC' })).toHaveAttribute('href', '/rpl/applications/case-42')
    expect(screen.getByText(AFTER_QUIZ_COPY.en.experience.choices.stop)).toBeInTheDocument()
    expect(screen.getByText('Entry quiz: 72.00% (pass mark: more than 50%)')).toBeInTheDocument()
    expect(screen.getByText('19,500,000 SYP ($ 1,500.00 at 1 USD = 13,000 SYP) · Paid')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(Q.status), { target: { value: 'issued' } })
    await waitFor(() => expect(mocks.fetchRplExperienceCertificateQueue).toHaveBeenLastCalledWith({ status: 'issued' }))
  })
})

describe('the attention list (S17)', () => {
  it('shows its four lists, each row linked to its case', async () => {
    renderPage('attention')

    const blocked = within(await screen.findByRole('table', { name: Q.attention.blocked }))
    expect(blocked.getByRole('link', { name: 'RPL-2026-BLK' })).toHaveAttribute('href', '/rpl/applications/case-43')
    expect(blocked.getByText('CGP-DGT-042 has fewer approved questions than the final exam draws.')).toBeInTheDocument()
    const held = within(screen.getByRole('table', { name: Q.attention.held }))
    expect(held.getByText('Hold #3: CGP-PSD-010 version 1.0')).toBeInTheDocument()
    // O2: a pass stranded by a fee the Fees tab holds in money (S17 level_certificates_fee_unusable).
    const fee = within(screen.getByRole('table', { name: Q.attention.feeUnusable }))
    expect(fee.getByRole('link', { name: 'RPL-2026-FEE' })).toHaveAttribute('href', '/rpl/applications/case-46')
    expect(fee.getByText(AFTER_QUIZ_COPY.en.finalExam.level.feeUnusable)).toBeInTheDocument()
    const paid = within(screen.getByRole('table', { name: Q.attention.paidClosed }))
    expect(paid.getByRole('link', { name: 'RPL-2026-CLS' })).toBeInTheDocument()
    expect(paid.getByText('Final-exam retake · round 2')).toBeInTheDocument()
    expect(mocks.fetchRplChargeQueue).not.toHaveBeenCalled()
  })

  it('renders in Arabic without a literal "undefined"', async () => {
    language.current = 'ar'
    renderPage('attention')

    expect(await screen.findByRole('table', { name: AFTER_QUIZ_COPY.ar.queue.attention.blocked })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})

describe('the routes', () => {
  it('keeps each queue to its permission', () => {
    expect(getRouteAccess('/rpl/payments')).toEqual({ allPermissions: ['rpl.payments.reconcile'] })
    expect(getRouteAccess('/rpl/experience-certificates')).toEqual({ allPermissions: ['rpl.experience_certificates.approve'] })
    expect(getRouteAccess('/rpl/attention')).toEqual({ allPermissions: ['rpl.applications.view'] })
  })
})
