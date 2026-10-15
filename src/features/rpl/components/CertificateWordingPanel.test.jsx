import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CertificateWordingPanel from './CertificateWordingPanel'
import { AFTER_QUIZ_COPY } from '../domain/afterQuiz'
import { createAuthorization } from '../../auth/authorization'
import { AuthorizationContext } from '../../auth/context/authorizationContext'

/*
 * THE EXPERIENCE CONFIRMATION CERTIFICATE WORDING (owner, 15 Oct 2026; K12, O3).
 *
 * Pinned: a draft is editable by rpl.settings.manage and saved with its
 * lock_version; Approve shows only for the owner's role (super-admin, never a
 * plain administrator) and needs a note; an approved version is read-only and a
 * new draft starts from it; while nothing is approved, the banner says the
 * certificate cannot be sold or issued; a stale write keeps the text and reloads.
 */

const mocks = vi.hoisted(() => ({
  fetchRplCertificateWordings: vi.fn(),
  draftRplCertificateWording: vi.fn(),
  updateRplCertificateWording: vi.fn(),
  approveRplCertificateWording: vi.fn(),
}))

vi.mock('../services/rplService', () => mocks)

const W = AFTER_QUIZ_COPY.en.wording
const COMMON = AFTER_QUIZ_COPY.en.common
const NOTE = 'Approved by the owner after reading both languages.'

function wording(overrides = {}) {
  return {
    id: 1,
    code: 'rpl_experience_confirmation',
    version: 1,
    status: 'draft',
    title: { ar: 'شهادة تثبيت الخبرة', en: 'Experience Confirmation Certificate' },
    body: { ar: 'تشهد المؤسسة بأن حامل هذه الشهادة...', en: 'The Institute certifies that the holder of this certificate...' },
    content_sha256: 'c0ffee'.repeat(10) + 'c0ff',
    created_by: null,
    updated_by: null,
    approved_by: null,
    approved_at: null,
    approval_note: null,
    retired_at: null,
    lock_version: 1,
    created_at: '2026-10-15T09:00:00Z',
    can: { edit: true, approve: true },
    ...overrides,
  }
}

function renderPanel(user = { roles: [{ slug: 'super-admin' }] }, language = 'en') {
  const authorization = createAuthorization(user)
  return render(
    <AuthorizationContext.Provider value={{ ...authorization, isLoading: false, error: null, refresh: vi.fn() }}>
      <CertificateWordingPanel language={language} />
    </AuthorizationContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetchRplCertificateWordings.mockResolvedValue({ data: [wording()] })
  mocks.updateRplCertificateWording.mockResolvedValue({ data: wording({ lock_version: 2 }) })
  mocks.approveRplCertificateWording.mockResolvedValue({ data: wording({ status: 'approved' }) })
  mocks.draftRplCertificateWording.mockResolvedValue({ data: wording({ id: 3, version: 3 }) })
})

describe('the seeded draft', () => {
  it('says nothing can be sold or issued while no version is approved, and lists the draft', async () => {
    renderPanel()

    expect(await screen.findByText(W.notApproved)).toBeInTheDocument()
    expect(mocks.fetchRplCertificateWordings).toHaveBeenCalledWith('rpl_experience_confirmation')
    const draft = within(screen.getByRole('article', { name: 'Version 1' }))
    expect(draft.getByText(W.statuses.draft)).toBeInTheDocument()
    expect(draft.getByText('Experience Confirmation Certificate')).toBeInTheDocument()
    expect(draft.getByText('شهادة تثبيت الخبرة')).toBeInTheDocument()
    expect(draft.getByText('Fingerprint: c0ffeec0ffee…')).toBeInTheDocument()
  })

  it('edits the draft and saves it with its lock_version, every text trimmed', async () => {
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: W.edit }))
    const form = within(screen.getByRole('region', { name: W.edit }))
    fireEvent.change(form.getByLabelText(W.titleEn), { target: { value: '  Certificate of Confirmed Experience  ' } })
    fireEvent.click(form.getByRole('button', { name: W.save }))

    await waitFor(() => expect(mocks.updateRplCertificateWording).toHaveBeenCalledWith(1, {
      lock_version: 1,
      title: { ar: 'شهادة تثبيت الخبرة', en: 'Certificate of Confirmed Experience' },
      body: { ar: 'تشهد المؤسسة بأن حامل هذه الشهادة...', en: 'The Institute certifies that the holder of this certificate...' },
    }))
    expect(await screen.findByText(W.saved)).toBeInTheDocument()
  })

  it('will not save an empty text', async () => {
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: W.edit }))
    const form = within(screen.getByRole('region', { name: W.edit }))
    fireEvent.change(form.getByLabelText(W.bodyAr), { target: { value: '   ' } })
    expect(form.getByText(W.bodyInvalid)).toBeInTheDocument()
    expect(form.getByRole('button', { name: W.save })).toBeDisabled()
  })
})

describe('approving (super-admin only)', () => {
  it('approves with a note of 10 or more characters and the lock_version', async () => {
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: W.approve }))
    const form = within(screen.getByRole('region', { name: W.approve }))
    expect(form.getByText(W.approveHint)).toBeInTheDocument()
    const submit = form.getByRole('button', { name: W.approveSubmit })
    expect(submit).toBeDisabled()
    fireEvent.change(form.getByLabelText(W.approvalNote), { target: { value: 'ok' } })
    expect(form.getByText(COMMON.reasonInvalid)).toBeInTheDocument()
    fireEvent.change(form.getByLabelText(W.approvalNote), { target: { value: NOTE } })
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.approveRplCertificateWording).toHaveBeenCalledWith(1, { lock_version: 1, approval_note: NOTE }))
    expect(await screen.findByText(W.approved)).toBeInTheDocument()
  })

  it('never offers approval to a plain administrator, who may still edit the draft', async () => {
    renderPanel({ roles: [{ slug: 'admin' }] })

    expect(await screen.findByRole('button', { name: W.edit })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: W.approve })).not.toBeInTheDocument()
    expect(screen.getByText(W.approverOnly)).toBeInTheDocument()
  })

  it('offers neither act to an account without rpl.settings.manage', async () => {
    renderPanel({ roles: [{ slug: 'assessor', permissions: [{ slug: 'rpl.applications.view' }] }] })

    await screen.findByRole('article', { name: 'Version 1' })
    expect(screen.queryByRole('button', { name: W.edit })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: W.approve })).not.toBeInTheDocument()
  })

  it('on a stale draft says so, keeps the note and reloads (409 rpl_certificate_wording_stale)', async () => {
    mocks.approveRplCertificateWording.mockRejectedValue({ response: { status: 409, data: { message: 'Changed.', code: 'rpl_certificate_wording_stale', current_lock_version: 2 } } })
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: W.approve }))
    const form = within(screen.getByRole('region', { name: W.approve }))
    fireEvent.change(form.getByLabelText(W.approvalNote), { target: { value: NOTE } })
    fireEvent.click(form.getByRole('button', { name: W.approveSubmit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(W.stale)
    await waitFor(() => expect(mocks.fetchRplCertificateWordings).toHaveBeenCalledTimes(2))
    expect(within(screen.getByRole('region', { name: W.approve })).getByLabelText(W.approvalNote)).toHaveValue(NOTE)
  })
})

describe('an approved version', () => {
  const approved = wording({ id: 2, version: 2, status: 'approved', approved_by: { id: 1, name: 'Owner Example' }, approved_at: '2026-10-16T09:00:00Z', approval_note: NOTE, lock_version: 2, can: { edit: false, approve: false } })
  const retired = wording({ id: 1, version: 1, status: 'retired', retired_at: '2026-10-16T09:00:00Z', can: { edit: false, approve: false } })

  it('is read-only, the banner is gone, and a new draft starts from it', async () => {
    mocks.fetchRplCertificateWordings.mockResolvedValue({ data: [retired, approved] })
    renderPanel()

    const current = within(await screen.findByRole('article', { name: 'Version 2' }))
    expect(screen.queryByText(W.notApproved)).not.toBeInTheDocument()
    expect(current.getByText(W.readOnly)).toBeInTheDocument()
    expect(current.getByText(/^Approved by Owner Example on /)).toBeInTheDocument()
    expect(current.getByText(`Approval note: ${NOTE}`)).toBeInTheDocument()
    expect(current.queryByRole('button')).not.toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Version 1' })).getByText(W.statuses.retired)).toBeInTheDocument()
    // Newest first.
    expect(screen.getAllByRole('article').map((node) => node.getAttribute('aria-label'))).toEqual(['Version 2', 'Version 1'])

    fireEvent.click(screen.getByRole('button', { name: W.newDraft }))
    const form = within(screen.getByRole('region', { name: W.newDraft }))
    expect(form.getByLabelText(W.titleEn)).toHaveValue('Experience Confirmation Certificate')
    fireEvent.change(form.getByLabelText(W.bodyEn), { target: { value: 'An edited English body.' } })
    fireEvent.click(form.getByRole('button', { name: W.draftSubmit }))

    await waitFor(() => expect(mocks.draftRplCertificateWording).toHaveBeenCalledWith({
      code: 'rpl_experience_confirmation',
      title: { ar: 'شهادة تثبيت الخبرة', en: 'Experience Confirmation Certificate' },
      body: { ar: 'تشهد المؤسسة بأن حامل هذه الشهادة...', en: 'An edited English body.' },
    }))
    expect(await screen.findByText(W.drafted)).toBeInTheDocument()
  })

  it('renders in Arabic without a literal "undefined"', async () => {
    mocks.fetchRplCertificateWordings.mockResolvedValue({ data: [approved, wording({ id: 3, version: 3 })] })
    renderPanel(undefined, 'ar')

    expect(await screen.findByText(AFTER_QUIZ_COPY.ar.wording.statuses.approved)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
