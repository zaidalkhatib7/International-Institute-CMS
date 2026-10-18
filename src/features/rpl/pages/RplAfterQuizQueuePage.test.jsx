import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplAfterQuizQueuePage from './RplAfterQuizQueuePage'
import { AFTER_QUIZ_COPY } from '../domain/afterQuiz'
import { getRouteAccess } from '../../../routes/routeAccess'
import { createAuthorization } from '../../auth/authorization'
import { roleUser } from '../../../test/roleFixtures'
import { resetWorkCounts } from '../../dashboard/hooks/useWorkCounts'

/*
 * THE STAFF QUEUES AFTER THE ENTRY QUIZ (owner model of 15 Oct 2026, P6), acted
 * on in the row (PLATFORM-JOURNEY-SPEC §4.5, §9.1 item 9).
 *
 * Pinned: a payment is confirmed on its card in the queue with the case's own
 * form and payload (lock_version), a stale write says so, and the counts are read
 * again; a reconciler who cannot open cases meets plain text, never a link; an
 * administrator approves an experience certificate in its expanded row; the
 * attention links open the tab of the work, and the approved-not-issued list shows.
 */

const mocks = vi.hoisted(() => ({
  fetchRplChargeQueue: vi.fn(),
  fetchRplExperienceCertificateQueue: vi.fn(),
  fetchRplAfterQuizAttention: vi.fn(),
  confirmRplChargePayment: vi.fn(),
  cancelRplCharge: vi.fn(),
  refundRplCharge: vi.fn(),
  fetchRplCharges: vi.fn(),
  fetchRplExperienceCertificate: vi.fn(),
  approveRplExperienceCertificate: vi.fn(),
  refuseRplExperienceCertificate: vi.fn(),
  fetchRplDashboard: vi.fn(),
  fetchRplApplications: vi.fn(),
}))
const language = vi.hoisted(() => ({ current: 'en' }))
const auth = vi.hoisted(() => ({ user: null }))

vi.mock('../services/rplService', () => mocks)
vi.mock('../../academicRpl/services/academicRplService', () => ({ fetchAcademicApplications: vi.fn().mockResolvedValue({ data: [] }) }))
vi.mock('../../auth/context/useAuthorization', () => ({ useAuthorization: () => createAuthorization(auth.user) }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

const Q = AFTER_QUIZ_COPY.en.queue
const C = AFTER_QUIZ_COPY.en.charges

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
  resetWorkCounts()
  language.current = 'en'
  auth.user = roleUser('admin')
  mocks.fetchRplDashboard.mockResolvedValue({ data: { charges_awaiting_confirmation: 1 } })
  mocks.fetchRplChargeQueue.mockResolvedValue({ data: [staffCharge()] })
  mocks.fetchRplExperienceCertificateQueue.mockResolvedValue({
    data: [{ public_id: 'cert-1', status: 'requested', client_choice: 'stop', application: { public_id: 'case-42', case_reference: 'RPL-2026-EXC', status: 'course_plan_active' }, client: { id: 10, name: 'Omar Haddad' }, entry_quiz: { percent: 72, pass_mark_applied: 50 }, charge: { amount: { currency: 'SYP', amount_minor: 19500000, amount: '19500000' }, price_usd: { currency: 'USD', amount_minor: 150000, amount: '1500.00' }, exchange_rate: { id: 7, syp_per_usd: '13000.0000' }, status: 'paid' }, created_at: '2026-10-21T08:00:00Z' }],
  })
  mocks.fetchRplExperienceCertificate.mockResolvedValue({ data: { eligible: true, state: 'awaiting_issue', reason_code: null, live_price: null, live_wording: { id: 2, version: 1, sha256: 'ab' }, current: { public_id: 'cert-1', status: 'requested', lock_version: 3, client_choice: 'stop', charge: { status: 'paid', amount: { currency: 'USD', amount_minor: 150000, amount: '1500.00' } }, can: { approve: true, refuse: true } }, history: [] } })
  mocks.approveRplExperienceCertificate.mockResolvedValue({ data: {} })
  mocks.fetchRplAfterQuizAttention.mockResolvedValue({
    data: {
      final_exam_blocked: [{ application: { public_id: 'case-43', case_reference: 'RPL-2026-BLK' }, blocked_reason: 'question_bank_short', program: { id: 42, official_code: 'CGP-DGT-042', title: { en: 'Course 42' } } }],
      level_certificates_held: [{ application: { public_id: 'case-44', case_reference: 'RPL-2026-HLD' }, holds: [{ hold_id: 3, program_code: 'CGP-PSD-010', package_version: '1.0' }] }],
      level_certificates_fee_unusable: [{ application: { public_id: 'case-46', case_reference: 'RPL-2026-FEE', status: 'final_exam' }, setting: 'rpl_fee_schedules', problem: 'RPL_SETTING_MISSING: rpl_fee_schedules' }],
      paid_charges_on_closed_cases: [staffCharge({ public_id: 'charge-8', type: 'final_exam_retake', cycle: 2, status: 'paid', application: { public_id: 'case-45', case_reference: 'RPL-2026-CLS' } })],
      experience_certificates_not_issued: [{ application: { public_id: 'case-47', case_reference: 'RPL-2026-NIS' }, certificate_public_id: 'cert-9', approved_at: '2026-10-17T10:03:00+00:00' }],
    },
  })
})

describe('the payments queue (S1), acted on in the row', () => {
  it('loads the pending charges as cards naming their case and client, and filters by type and status', async () => {
    renderPage('payments')

    expect(await screen.findByRole('heading', { level: 1, name: Q.payments.title })).toBeInTheDocument()
    await waitFor(() => expect(mocks.fetchRplChargeQueue).toHaveBeenCalledWith({ status: 'pending' }))
    const card = await screen.findByRole('article', { name: /RPL-2026-AFTER/ })
    expect(within(card).getByRole('link', { name: 'RPL-2026-AFTER' })).toHaveAttribute('href', '/rpl/applications/case-41?tab=payments')
    expect(within(card).getByRole('link', { name: 'Amina Saleh' })).toHaveAttribute('href', '/users/9')
    expect(within(card).getByText('Level certification fee')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(Q.type), { target: { value: 'certification_fee' } })
    await waitFor(() => expect(mocks.fetchRplChargeQueue).toHaveBeenLastCalledWith({ status: 'pending', type: 'certification_fee' }))
    fireEvent.change(screen.getByLabelText(Q.status), { target: { value: '' } })
    await waitFor(() => expect(mocks.fetchRplChargeQueue).toHaveBeenLastCalledWith({ type: 'certification_fee' }))
  })

  it('lets a reconciler who cannot open cases confirm a payment in the row, with the case reference as plain text', async () => {
    auth.user = roleUser('finance-operator')
    mocks.confirmRplChargePayment.mockResolvedValue({ data: {} })
    renderPage('payments')

    const card = await screen.findByRole('article', { name: /RPL-2026-AFTER/ })
    expect(within(card).queryByRole('link', { name: 'RPL-2026-AFTER' })).not.toBeInTheDocument()
    expect(within(card).getByText('RPL-2026-AFTER')).toBeInTheDocument()
    // The finance operator holds users.view (A4), so the client is one click away.
    expect(within(card).getByRole('link', { name: 'Amina Saleh' })).toHaveAttribute('href', '/users/9')

    fireEvent.click(within(card).getByRole('button', { name: C.confirm }))
    const form = within(screen.getByRole('region', { name: C.confirmTitle }))
    fireEvent.change(form.getByLabelText(C.reference), { target: { value: 'TRX-2026-9' } })
    fireEvent.change(form.getByLabelText(C.paidOn), { target: { value: '2026-01-05' } })
    fireEvent.change(form.getByLabelText(C.amountReceived), { target: { value: '900' } })
    fireEvent.click(form.getByRole('button', { name: C.confirmSubmit }))

    await waitFor(() => expect(mocks.confirmRplChargePayment).toHaveBeenCalledWith('charge-7', expect.objectContaining({ lock_version: 1, reference: 'TRX-2026-9', paid_at: '2026-01-05', amount_received_minor: 90000, currency_received: 'USD' })))
    // The counts are read again so the badge drops; the reconciler reads them from the charge list.
    await waitFor(() => expect(mocks.fetchRplChargeQueue.mock.calls.length).toBeGreaterThanOrEqual(3))
    expect(mocks.fetchRplDashboard).not.toHaveBeenCalled()
  })

  it('says a stale payment was changed by someone else', async () => {
    mocks.confirmRplChargePayment.mockRejectedValue({ response: { status: 409, data: { code: 'rpl_charge_stale', message: 'stale' } } })
    renderPage('payments')

    fireEvent.click(await screen.findByRole('button', { name: C.confirm }))
    const form = within(screen.getByRole('region', { name: C.confirmTitle }))
    fireEvent.change(form.getByLabelText(C.reference), { target: { value: 'TRX-1' } })
    fireEvent.change(form.getByLabelText(C.paidOn), { target: { value: '2026-01-05' } })
    fireEvent.change(form.getByLabelText(C.amountReceived), { target: { value: '900' } })
    fireEvent.click(form.getByRole('button', { name: C.confirmSubmit }))

    expect(await screen.findByText(C.stale)).toBeInTheDocument()
  })

  it('never warns about a paid slot from another case', async () => {
    mocks.fetchRplChargeQueue.mockResolvedValue({ data: [staffCharge(), staffCharge({ public_id: 'charge-99', status: 'paid', application: { public_id: 'case-99', case_reference: 'RPL-2026-OTHER' } })] })
    renderPage('payments')

    fireEvent.click(within(await screen.findByRole('article', { name: /RPL-2026-AFTER/ })).getByRole('button', { name: C.confirm }))
    expect(screen.queryByText(C.slotTaken)).not.toBeInTheDocument()
  })

  it('links the exchange rate for a viewer who can read it, inside Finance when Finance is open', async () => {
    renderPage('payments')
    expect(await screen.findByRole('link', { name: Q.exchangeRate })).toHaveAttribute('href', '/finance?tab=exchange_rate')
  })

  it('says wallet purchases need no confirmation when nothing waits', async () => {
    mocks.fetchRplChargeQueue.mockResolvedValue({ data: [] })
    renderPage('payments')
    expect(await screen.findByText(Q.payments.empty)).toBeInTheDocument()
  })
})

describe('the experience certificates queue (S7)', () => {
  it('loads the server default (awaiting approval), filters by status, and links to the case\'s payments', async () => {
    renderPage('experience_certificates')

    await waitFor(() => expect(mocks.fetchRplExperienceCertificateQueue).toHaveBeenCalledWith({}))
    expect(await screen.findByRole('link', { name: 'RPL-2026-EXC' })).toHaveAttribute('href', '/rpl/applications/case-42?tab=payments')
    expect(screen.getByText(AFTER_QUIZ_COPY.en.experience.choices.stop)).toBeInTheDocument()
    expect(screen.getByText('Entry quiz: 72.00% (pass mark: more than 50%)')).toBeInTheDocument()
    expect(screen.getByText('19,500,000 SYP ($ 1,500.00 at 1 USD = 13,000 SYP) · Paid')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(Q.status), { target: { value: 'issued' } })
    await waitFor(() => expect(mocks.fetchRplExperienceCertificateQueue).toHaveBeenLastCalledWith({ status: 'issued' }))
  })

  it('lets an administrator approve a certificate in its expanded row, then reads the list again', async () => {
    renderPage('experience_certificates')

    fireEvent.click(await screen.findByRole('button', { name: Q.reviewApprove }))
    await waitFor(() => expect(mocks.fetchRplExperienceCertificate).toHaveBeenCalledWith('case-42'))
    fireEvent.click(await screen.findByRole('button', { name: AFTER_QUIZ_COPY.en.experience.approveSubmit }))
    await waitFor(() => expect(mocks.approveRplExperienceCertificate).toHaveBeenCalledWith('cert-1', { lock_version: 3 }))
    await waitFor(() => expect(mocks.fetchRplExperienceCertificateQueue).toHaveBeenCalledTimes(2))
  })

  // Walk of 18 Oct 2026: the approved row leaves the list and unmounts its panel, so the page keeps the sentence.
  it.each(['en', 'ar'])('keeps the approval sentence on the page after the approved row leaves the list (%s)', async (screenLanguage) => {
    language.current = screenLanguage
    const copy = AFTER_QUIZ_COPY[screenLanguage]
    renderPage('experience_certificates')

    fireEvent.click(await screen.findByRole('button', { name: copy.queue.reviewApprove }))
    mocks.fetchRplExperienceCertificateQueue.mockResolvedValue({ data: [] })
    fireEvent.click(await screen.findByRole('button', { name: copy.experience.approveSubmit }))

    expect(await screen.findByText(copy.queue.experience_certificates.empty)).toBeInTheDocument()
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(copy.experience.approved)
    expect(within(notice).getByText('RPL-2026-EXC')).toBeInTheDocument()
  })

  // Review of the fixes (17 Oct 2026): a revoked certificate stays an "issued" request; the certificate's own status decides.
  it.each([
    ['en', 'Revoked after issue', 'Issued'],
    ['ar', 'أُلغيت بعد صدورها', 'صدرت'],
  ])('lists a revoked certificate as revoked, never as issued (%s)', async (screenLanguage, revokedLabel, issuedLabel) => {
    language.current = screenLanguage
    mocks.fetchRplExperienceCertificateQueue.mockResolvedValue({
      data: [
        { public_id: 'cert-2', status: 'issued', client_choice: 'stop', application: { public_id: 'case-47', case_reference: 'RPL-2026-RVK' }, client: { id: 11, name: 'Lina Haddad' }, entry_quiz: null, charge: null, certificate: { id: 77, number: 'ICPC-EXC-2026-000001', issued_at: '2026-10-15T10:05:00Z', status: 'revoked', reissued: false, revoked_at: '2026-10-16T09:00:00Z' }, created_at: '2026-10-15T08:00:00Z' },
        { public_id: 'cert-3', status: 'issued', client_choice: 'continue', application: { public_id: 'case-48', case_reference: 'RPL-2026-ISS' }, client: { id: 12, name: 'Sami Khoury' }, entry_quiz: null, charge: null, certificate: { id: 78, number: 'ICPC-EXC-2026-000002', issued_at: '2026-10-15T11:05:00Z', status: 'active', reissued: false, revoked_at: null }, created_at: '2026-10-15T09:00:00Z' },
      ],
    })
    renderPage('experience_certificates')

    const revokedRow = (await screen.findByRole('link', { name: 'RPL-2026-RVK' })).closest('tr')
    expect(within(revokedRow).getByText(revokedLabel)).toBeInTheDocument()
    expect(within(revokedRow).queryByText(issuedLabel)).not.toBeInTheDocument()
    const issuedRow = screen.getByRole('link', { name: 'RPL-2026-ISS' }).closest('tr')
    expect(within(issuedRow).getByText(issuedLabel)).toBeInTheDocument()
    expect(within(issuedRow).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('the attention list (S17)', () => {
  it('shows its five lists, each row linked to the tab of its work', async () => {
    renderPage('attention')

    const blocked = within(await screen.findByRole('table', { name: Q.attention.blocked }))
    expect(blocked.getByRole('link', { name: 'RPL-2026-BLK' })).toHaveAttribute('href', '/rpl/applications/case-43?tab=final_exam')
    expect(blocked.getByRole('link', { name: 'Course 42' })).toHaveAttribute('href', '/programs/edit?id=42')
    expect(blocked.getByText('CGP-DGT-042 has fewer approved questions than the final exam draws.')).toBeInTheDocument()
    const held = within(screen.getByRole('table', { name: Q.attention.held }))
    expect(held.getByText('Hold #3: CGP-PSD-010 version 1.0')).toBeInTheDocument()
    // O2: a pass stranded by a fee the Fees tab holds in money (S17 level_certificates_fee_unusable).
    const fee = within(screen.getByRole('table', { name: Q.attention.feeUnusable }))
    expect(fee.getByRole('link', { name: 'RPL-2026-FEE' })).toHaveAttribute('href', '/rpl/applications/case-46?tab=final_exam')
    expect(fee.getByRole('link', { name: Q.feeSettings })).toHaveAttribute('href', '/rpl/configuration?tab=fees')
    const notIssued = within(screen.getByRole('table', { name: Q.attention.notIssued }))
    expect(notIssued.getByRole('link', { name: 'RPL-2026-NIS' })).toHaveAttribute('href', '/rpl/applications/case-47?tab=payments')
    expect(screen.getByText(Q.attention.notIssuedHint)).toBeInTheDocument()
    const paid = within(screen.getByRole('table', { name: Q.attention.paidClosed }))
    expect(paid.getByRole('link', { name: 'RPL-2026-CLS' })).toHaveAttribute('href', '/rpl/applications/case-45?tab=payments')
    expect(paid.getByText('Final-exam retake · round 2')).toBeInTheDocument()
    expect(mocks.fetchRplChargeQueue).not.toHaveBeenCalled()
  })

  it('says nothing needs attention when every list is empty', async () => {
    mocks.fetchRplAfterQuizAttention.mockResolvedValue({ data: {} })
    renderPage('attention')
    expect(await screen.findByText(Q.attention.allEmpty)).toBeInTheDocument()
  })

  it('renders in Arabic without a literal "undefined" or RPL in the eyebrow', async () => {
    language.current = 'ar'
    renderPage('attention')

    expect(await screen.findByRole('table', { name: AFTER_QUIZ_COPY.ar.queue.attention.blocked })).toBeInTheDocument()
    expect(screen.getByText('المسار المهني')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
    expect(document.body.textContent.replace(/RPL-2026-\w+/g, '')).not.toMatch(/RPL/)
  })
})

describe('the routes', () => {
  it('keeps each queue to its permission', () => {
    expect(getRouteAccess('/rpl/payments')).toEqual({ allPermissions: ['rpl.payments.reconcile'] })
    expect(getRouteAccess('/rpl/experience-certificates')).toEqual({ allPermissions: ['rpl.experience_certificates.approve'] })
    expect(getRouteAccess('/rpl/attention')).toEqual({ allPermissions: ['rpl.applications.view'] })
  })
})

describe('review of 18 Oct 2026', () => {
  it('says "nothing matches this filter", with a way back, when a non-default filter finds nothing', async () => {
    mocks.fetchRplChargeQueue.mockResolvedValue({ data: [] })
    renderPage('payments')
    expect(await screen.findByText(Q.payments.empty)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(Q.status), { target: { value: 'paid' } })
    expect(await screen.findByText(Q.emptyFiltered)).toBeInTheDocument()
    expect(screen.queryByText(Q.payments.empty)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: Q.clearFilter }))
    expect(await screen.findByText(Q.payments.empty)).toBeInTheDocument()
    expect(screen.getByLabelText(Q.status)).toHaveValue('pending')
  })

  it('does the same on the experience certificates queue', async () => {
    mocks.fetchRplExperienceCertificateQueue.mockResolvedValue({ data: [] })
    renderPage('experience_certificates')
    expect(await screen.findByText(Q.experience_certificates.empty)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(Q.status), { target: { value: 'issued' } })
    expect(await screen.findByText(Q.emptyFiltered)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: Q.clearFilter }))
    await waitFor(() => expect(mocks.fetchRplExperienceCertificateQueue).toHaveBeenLastCalledWith({}))
  })

  it('opens the review next to the act: focus moves into it and the button names it', async () => {
    renderPage('experience_certificates')
    const button = await screen.findByRole('button', { name: Q.reviewApprove })
    fireEvent.click(button)
    const review = await screen.findByRole('region', { name: 'Review of RPL-2026-EXC' })
    expect(button).toHaveAttribute('aria-controls', review.id)
    await waitFor(() => expect(review).toHaveFocus())
  })

  it('draws only the attention lists that hold something, and names the empty ones on one line', async () => {
    mocks.fetchRplAfterQuizAttention.mockResolvedValue({ data: { final_exam_blocked: [{ application: { public_id: 'case-43', case_reference: 'RPL-2026-BLK' }, blocked_reason: 'setting_missing', program: null }] } })
    renderPage('attention')
    expect(await screen.findByRole('table', { name: Q.attention.blocked })).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    expect(screen.queryByText(Q.attention.empty)).not.toBeInTheDocument()
    expect(screen.getByText(`Nothing in: ${[Q.attention.held, Q.attention.feeUnusable, Q.attention.notIssued, Q.attention.paidClosed].join(', ')}.`)).toBeInTheDocument()
  })

  it('shows one line and no empty tables when nothing needs attention', async () => {
    mocks.fetchRplAfterQuizAttention.mockResolvedValue({ data: {} })
    renderPage('attention')
    expect(await screen.findByText(Q.attention.allEmpty)).toBeInTheDocument()
    expect(screen.queryAllByRole('table')).toHaveLength(0)
  })
})
