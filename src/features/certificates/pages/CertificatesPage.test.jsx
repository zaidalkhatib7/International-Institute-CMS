import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CertificatesPage from './CertificatesPage'
import { createAuthorization } from '../../auth/authorization'
import { AuthorizationContext } from '../../auth/context/authorizationContext'
import {
  fetchCertificate,
  fetchCertificates,
  fetchCertificateTemplates,
  issueCertificate,
  updateCertificateTemplate,
} from '../services/certificatesService'

vi.mock('../services/certificatesService', () => ({
  createCertificateTemplate: vi.fn(),
  downloadCertificate: vi.fn(),
  fetchCertificate: vi.fn(),
  fetchCertificates: vi.fn(),
  fetchCertificateTemplates: vi.fn(),
  issueCertificate: vi.fn(),
  reissueCertificate: vi.fn(),
  revokeCertificate: vi.fn(),
  updateCertificateTemplate: vi.fn(),
}))

const certificate = {
  id: 41,
  number: 'ICPC-000041',
  status: 'active',
  issued_at: '2026-07-12T09:00:00Z',
  user: { name: 'Amina Saleh', email: 'amina@example.test' },
  template: { code: 'RPL-PRO' },
  snapshot: { credential: { title: { en: 'RPL Professional Assessor' } } },
}

function renderPage(user = { role: 'admin' }) {
  const authorization = createAuthorization(user)
  return render(
    <AuthorizationContext.Provider value={{ ...authorization, isLoading: false, error: null, refresh: vi.fn() }}>
      <CertificatesPage />
    </AuthorizationContext.Provider>
  )
}

describe('CertificatesPage', () => {
  beforeEach(() => {
    localStorage.setItem('icpc_admin_language', 'en')
    vi.clearAllMocks()
    fetchCertificates.mockResolvedValue({
      data: { data: [certificate], current_page: 1, last_page: 1, per_page: 20, total: 1 },
    })
    fetchCertificateTemplates.mockResolvedValue({
      data: [{ id: 7, code: 'RPL-PRO', name: { en: 'RPL certificate' }, is_active: true }],
    })
    fetchCertificate.mockResolvedValue({
      data: certificate,
      verification_token: 'verify-icpc-000041',
    })
  })

  it('renders registry data and opens governed certificate details', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Certificate administration' })).toBeInTheDocument()
    expect(await screen.findByText('ICPC-000041')).toBeInTheDocument()
    expect(screen.getByText('Amina Saleh')).toBeInTheDocument()
    expect(screen.getByText('RPL Professional Assessor')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'View' }))

    await waitFor(() => expect(fetchCertificate).toHaveBeenCalledWith(41))
    expect(await screen.findByRole('dialog', { name: 'Certificate details' })).toBeInTheDocument()
    expect(screen.getByText('verify-icpc-000041')).toBeInTheDocument()
  })

  it('keeps a certificates viewer read-only and avoids unauthorized template requests', async () => {
    renderPage({
      role: 'user',
      roles: [{ slug: 'support-agent', permissions: [{ slug: 'certificates.view' }] }],
    })

    expect(await screen.findByText('ICPC-000041')).toBeInTheDocument()
    expect(fetchCertificateTemplates).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Issue certificate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reissue' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Certificate templates' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument()
  })

  it('issues a credential named in Arabic and English only', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Issue certificate' }))
    expect(document.body.textContent).not.toMatch(/Dutch/)
    fireEvent.change(screen.getByLabelText('User ID'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Credential name in English'), { target: { value: 'RPL Professional Assessor' } })
    fireEvent.change(screen.getByLabelText('Credential name in Arabic'), { target: { value: 'مقيّم RPL مهني' } })
    fireEvent.submit(document.getElementById('certificate-issue-form'))

    await waitFor(() => expect(issueCertificate).toHaveBeenCalledTimes(1))
    const [payload] = issueCertificate.mock.calls[0]
    expect(payload.credential.title).toEqual({ en: 'RPL Professional Assessor', ar: 'مقيّم RPL مهني' })
    expect(JSON.stringify(payload)).not.toContain('"nl"')
  })

  it('edits a template in Arabic and English only, and never sends a stored nl back', async () => {
    fetchCertificateTemplates.mockResolvedValue({
      data: [{
        id: 7,
        code: 'RPL-PRO',
        name: { en: 'RPL certificate', ar: 'شهادة RPL', nl: 'RPL-certificaat' },
        title: { en: 'Certificate of recognition', ar: 'شهادة اعتراف', nl: 'Erkenningscertificaat' },
        body: { en: 'Awarded to', ar: 'تُمنح إلى', nl: 'Toegekend aan' },
        is_active: true,
      }],
    })
    renderPage()

    fireEvent.click(await screen.findByRole('tab', { name: /Certificate templates/ }))
    fireEvent.click(await screen.findByRole('button', { name: /RPL certificate/ }))
    expect(document.body.textContent).not.toMatch(/Dutch/)
    fireEvent.submit(document.getElementById('certificate-template-form'))

    await waitFor(() => expect(updateCertificateTemplate).toHaveBeenCalledTimes(1))
    const [id, payload] = updateCertificateTemplate.mock.calls[0]
    expect(id).toBe(7)
    expect(payload.name).toEqual({ en: 'RPL certificate', ar: 'شهادة RPL' })
    expect(payload.title).toEqual({ en: 'Certificate of recognition', ar: 'شهادة اعتراف' })
    expect(payload.body).toEqual({ en: 'Awarded to', ar: 'تُمنح إلى' })
    expect(JSON.stringify(payload)).not.toContain('"nl"')
  })
})

/*
 * THE TWO RPL CERTIFICATES IN THE REGISTRY (owner model of 15 Oct 2026, P6).
 *
 * Each row names its kind from snapshot.credential.kind (it survives a reissue),
 * and the registry filters by it; the experience-confirmation template is
 * reserved, read-only and never offered for a manual issue; and a number prefix
 * another template already uses is shown on the prefix field (X1).
 */
describe('CertificatesPage after the entry quiz (P6)', () => {
  const experience = { ...certificate, id: 51, number: 'ICPC-EXC-2026-000001', snapshot: { credential: { kind: 'rpl_experience_confirmation', title: { en: 'Experience Confirmation Certificate' } } } }
  const level = { ...certificate, id: 52, number: 'ICPC-000052', snapshot: { credential: { kind: 'rpl_level', title: { en: 'Professional Practitioner' } } }, metadata: { channel: 'reissue' } }
  const reserved = { id: 9, code: 'rpl-experience-confirmation', number_prefix: 'ICPC-EXC', name: { en: 'RPL experience confirmation' }, title: { en: 'Experience Confirmation Certificate' }, is_active: true }

  it('names each certificate\'s kind and filters the registry by it', async () => {
    fetchCertificates.mockResolvedValue({ data: { data: [certificate, experience, level], current_page: 1, last_page: 1, per_page: 20, total: 3 } })
    renderPage()

    expect(await screen.findByText('ICPC-EXC-2026-000001')).toBeInTheDocument()
    expect(screen.getAllByText('Experience Confirmation Certificate').length).toBeGreaterThan(0)
    const table = within(screen.getByRole('table', { name: 'Certificate registry' }))
    expect(table.getByText('RPL level certificate')).toBeInTheDocument()
    expect(table.getByText('Other')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'rpl_level' } })
    expect(screen.getByText('ICPC-000052')).toBeInTheDocument()
    expect(screen.queryByText('ICPC-EXC-2026-000001')).not.toBeInTheDocument()
    expect(screen.queryByText('ICPC-000041')).not.toBeInTheDocument()
    // The kind is read on the screen, so it is never sent to the registry route.
    expect(fetchCertificates.mock.calls.every(([params]) => !('kind' in params))).toBe(true)
  })

  it('shows the reserved template read-only and never offers it for a manual issue', async () => {
    fetchCertificateTemplates.mockResolvedValue({ data: [{ id: 7, code: 'RPL-PRO', name: { en: 'RPL certificate' }, is_active: true }, reserved] })
    renderPage()

    fireEvent.click(await screen.findByRole('tab', { name: /Certificate templates/ }))
    expect(await screen.findByText('Managed by the RPL certificate wording')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /RPL experience confirmation/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /RPL certificate/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Certificate registry/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Issue certificate' }))
    const options = within(screen.getByLabelText('Template')).getAllByRole('option').map((option) => option.textContent)
    expect(options).toContain('RPL certificate')
    expect(options).not.toContain('RPL experience confirmation')
  })

  it('shows a duplicate number prefix on the prefix field', async () => {
    const line = 'The number prefix has already been taken.'
    updateCertificateTemplate.mockRejectedValue({ response: { status: 422, data: { message: line, errors: { number_prefix: [line] } } } })
    fetchCertificateTemplates.mockResolvedValue({ data: [{ id: 7, code: 'RPL-PRO', number_prefix: 'ICPC-EXC', name: { en: 'RPL certificate' }, title: { en: 'Certificate of recognition' }, is_active: true }] })
    renderPage()

    fireEvent.click(await screen.findByRole('tab', { name: /Certificate templates/ }))
    fireEvent.click(await screen.findByRole('button', { name: /RPL certificate/ }))
    fireEvent.submit(document.getElementById('certificate-template-form'))

    const prefix = await screen.findByLabelText('Number prefix')
    await waitFor(() => expect(prefix).toHaveAttribute('aria-invalid', 'true'))
    expect(document.getElementById(prefix.getAttribute('aria-describedby'))).toHaveTextContent(line)
    fireEvent.change(prefix, { target: { value: 'ICPC-NEW' } })
    expect(prefix).not.toHaveAttribute('aria-invalid')
  })
})
