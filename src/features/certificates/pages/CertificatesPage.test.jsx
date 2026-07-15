import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CertificatesPage from './CertificatesPage'
import { createAuthorization } from '../../auth/authorization'
import { AuthorizationContext } from '../../auth/context/authorizationContext'
import {
  fetchCertificate,
  fetchCertificates,
  fetchCertificateTemplates,
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
})
