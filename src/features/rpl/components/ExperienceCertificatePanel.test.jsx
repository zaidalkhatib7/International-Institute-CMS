import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExperienceCertificatePanel from './ExperienceCertificatePanel'
import { AFTER_QUIZ_COPY } from '../domain/afterQuiz'

/*
 * THE EXPERIENCE CONFIRMATION CERTIFICATE ON THE CASE (owner model of 15 Oct
 * 2026, P6; K11).
 *
 * Pinned: Approve and Refuse show only with rpl.experience_certificates.approve
 * AND the server's can flags; Approve sends the lock_version alone; Refuse needs
 * a category and a reason and says the payment is returned; the not-eligible
 * and unavailable reasons are sentences; the wording frozen at approval is
 * shown; a stale write reloads; and Arabic never shows "undefined".
 */

const mocks = vi.hoisted(() => ({
  fetchRplExperienceCertificate: vi.fn(),
  approveRplExperienceCertificate: vi.fn(),
  refuseRplExperienceCertificate: vi.fn(),
}))

vi.mock('../services/rplService', () => mocks)

const EN = AFTER_QUIZ_COPY.en.experience
const AR = AFTER_QUIZ_COPY.ar.experience
const COMMON = AFTER_QUIZ_COPY.en.common
const SHA = 'ab12cd34ef56'.repeat(5) + 'abcd'
const USD_1500 = { currency: 'USD', amount_minor: 150000, amount: '1500.00' }
// The live price (contract S18): US dollars, and pounds at today's rate while a rate is set.
const LIVE_PRICE = { usd: USD_1500, syp: { currency: 'SYP', amount_minor: 19500000, amount: '19500000' }, exchange_rate: { id: 7, syp_per_usd: '13000.0000', effective_from: '2026-10-15T08:00:00Z' } }

function certificate(overrides = {}) {
  return {
    public_id: 'cert-1',
    status: 'requested',
    client_choice: 'stop',
    choice_changed_at: null,
    application: { public_id: 'case-41', case_reference: 'RPL-2026-AFTER', status: 'course_plan_active' },
    client: { id: 9, name: 'Amina Saleh' },
    entry_quiz: { verification_id: 5, percent: 72, pass_mark_applied: 50, scored_at: '2026-10-14T09:00:00Z' },
    charge: { public_id: 'charge-1', type: 'experience_certificate', amount: USD_1500, price_usd: USD_1500, exchange_rate: null, route: 'wallet', status: 'paid' },
    approved_by: null,
    approved_at: null,
    refused_by: null,
    refused_at: null,
    refusal_reason: null,
    refusal_category: null,
    wording: null,
    certificate: null,
    case_closed_at: null,
    stop_not_applied_reason: null,
    lock_version: 3,
    created_at: '2026-10-15T08:00:00Z',
    can: { approve: true, refuse: true },
    ...overrides,
  }
}

function overview(overrides = {}) {
  return {
    eligible: true,
    state: 'awaiting_issue',
    reason_code: null,
    live_price: LIVE_PRICE,
    live_wording: { id: 2, version: 1, sha256: SHA },
    current: certificate(),
    history: [],
    ...overrides,
  }
}

function renderPanel(props = {}) {
  return render(<MemoryRouter><ExperienceCertificatePanel applicationId="case-41" language="en" canApprove {...props} /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetchRplExperienceCertificate.mockResolvedValue({ data: overview() })
  mocks.approveRplExperienceCertificate.mockResolvedValue({ message: 'Experience confirmation certificate approved; it is being issued.', data: certificate({ status: 'approved' }) })
  mocks.refuseRplExperienceCertificate.mockResolvedValue({ message: 'Experience confirmation certificate refused; the payment is returned.', data: certificate({ status: 'refused' }) })
})

describe('approving and refusing (S8, S9)', () => {
  it('shows the request, and approves with the lock_version alone', async () => {
    renderPanel()

    expect(await screen.findByText(EN.states.awaiting_issue)).toBeInTheDocument()
    expect(screen.getByText(`${EN.choice}: ${EN.choices.stop}`)).toBeInTheDocument()
    expect(screen.getByText('Entry quiz: 72.00% (pass mark: more than 50%)')).toBeInTheDocument()
    expect(screen.getByText('Approved wording: version 1')).toBeInTheDocument()
    expect(screen.getByText("Current price: $ 1,500.00 (19,500,000 SYP at today's rate)")).toBeInTheDocument()
    expect(screen.getByText('Payment: $ 1,500.00 · Wallet, dollar balance · Paid')).toBeInTheDocument()
    expect(screen.getByText(EN.approveHint)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: EN.approveSubmit }))

    await waitFor(() => expect(mocks.approveRplExperienceCertificate).toHaveBeenCalledWith('cert-1', { lock_version: 3 }))
    expect(await screen.findByText(EN.approved)).toBeInTheDocument()
  })

  it('refuses only with a category and a reason, and says the payment is returned', async () => {
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: EN.refuse }))
    const form = within(screen.getByRole('region', { name: EN.refuseTitle }))
    expect(form.getByText(EN.refuseHint)).toBeInTheDocument()
    const submit = form.getByRole('button', { name: EN.refuseSubmit })
    fireEvent.change(form.getByLabelText(COMMON.reason), { target: { value: 'The transfer was reversed by the bank.' } })
    expect(submit).toBeDisabled()
    fireEvent.change(form.getByLabelText(EN.category), { target: { value: 'payment_not_verified' } })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.refuseRplExperienceCertificate).toHaveBeenCalledWith('cert-1', { lock_version: 3, reason: 'The transfer was reversed by the bank.', category: 'payment_not_verified' }))
    expect(await screen.findByText(EN.refused)).toBeInTheDocument()
  })

  it('offers neither act without rpl.experience_certificates.approve', async () => {
    renderPanel({ canApprove: false })

    await screen.findByText(EN.states.awaiting_issue)
    expect(screen.queryByRole('button', { name: EN.approveSubmit })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.refuse })).not.toBeInTheDocument()
  })

  it('follows the server\'s can flags: no approval while the payment is pending', async () => {
    mocks.fetchRplExperienceCertificate.mockResolvedValue({ data: overview({ state: 'awaiting_payment', current: certificate({ charge: { ...certificate().charge, route: 'offline', status: 'pending' }, can: { approve: false, refuse: true } }) }) })
    renderPanel()

    expect(await screen.findByText(EN.states.awaiting_payment)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.approveSubmit })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: EN.refuse })).toBeInTheDocument()
  })

  it('on a stale request says so and reloads (409 rpl_experience_certificate_stale)', async () => {
    mocks.approveRplExperienceCertificate.mockRejectedValue({ response: { status: 409, data: { message: 'Changed.', code: 'rpl_experience_certificate_stale', current_lock_version: 4 } } })
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: EN.approveSubmit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(EN.stale)
    await waitFor(() => expect(mocks.fetchRplExperienceCertificate).toHaveBeenCalledTimes(2))
  })

  it('shows the server\'s refusal for the actor\'s own case as it was written', async () => {
    mocks.approveRplExperienceCertificate.mockRejectedValue({ response: { status: 403, data: { message: 'Staff cannot confirm, approve or refuse a payment or certificate on their own case.' } } })
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: EN.approveSubmit }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Staff cannot confirm, approve or refuse a payment or certificate on their own case.')
  })
})

describe('what the panel says', () => {
  it.each([
    ['not_eligible', 'entry_quiz_not_passed', EN.notEligible.entry_quiz_not_passed],
    ['not_eligible', 'no_entry_quiz', EN.notEligible.no_entry_quiz],
    ['unavailable', 'wording_not_approved', EN.unavailable.wording_not_approved],
    ['unavailable', 'price_not_set', EN.unavailable.price_not_set],
    ['unavailable', 'case_status', EN.unavailable.case_status],
  ])('says why it is %s (%s) in a sentence', async (state, reason, sentence) => {
    mocks.fetchRplExperienceCertificate.mockResolvedValue({ data: overview({ eligible: state !== 'not_eligible', state, reason_code: reason, live_price: null, live_wording: null, current: null }) })
    renderPanel()

    expect(await screen.findByText(sentence)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the wording frozen at approval, and the certificate once issued', async () => {
    mocks.fetchRplExperienceCertificate.mockResolvedValue({
      data: overview({
        state: 'issued',
        current: certificate({ status: 'issued', client_choice: 'continue', approved_by: { id: 4, name: 'Reviewer Example' }, approved_at: '2026-10-15T10:00:00Z', wording: { id: 2, version: 1, sha256: SHA }, certificate: { id: 77, number: 'ICPC-EXC-2026-000001', issued_at: '2026-10-15T10:05:00Z' }, can: { approve: false, refuse: false } }),
      }),
    })
    renderPanel()

    expect(await screen.findByText('Wording frozen at approval: version 1 · ab12cd34ef56…')).toBeInTheDocument()
    expect(screen.getByText(/^Approved by Reviewer Example on /)).toBeInTheDocument()
    expect(screen.getByText(/^Certificate ICPC-EXC-2026-000001, issued on /)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: EN.openCertificates })).toHaveAttribute('href', '/certificates')
    expect(screen.queryByRole('button', { name: EN.approveSubmit })).not.toBeInTheDocument()
  })

  it('says when "stop" did not close the case', async () => {
    mocks.fetchRplExperienceCertificate.mockResolvedValue({ data: overview({ state: 'issued', current: certificate({ status: 'issued', stop_not_applied_reason: 'case_already_at_level_certificate', can: { approve: false, refuse: false } }) }) })
    renderPanel()

    expect(await screen.findByText(EN.stopNotApplied.case_already_at_level_certificate)).toBeInTheDocument()
  })

  it('renders in Arabic without a literal "undefined"', async () => {
    mocks.fetchRplExperienceCertificate.mockResolvedValue({ data: overview({ history: [certificate({ public_id: 'cert-0', status: 'refused', refused_at: '2026-10-14T10:00:00Z', refused_by: { id: 4, name: 'مراجع' }, refusal_category: 'other', refusal_reason: 'سبب داخلي.' })] }) })
    renderPanel({ language: 'ar' })

    expect(await screen.findByText(AR.states.awaiting_issue)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: AR.refuse }))
    expect(screen.getByRole('region', { name: AR.refuseTitle })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
