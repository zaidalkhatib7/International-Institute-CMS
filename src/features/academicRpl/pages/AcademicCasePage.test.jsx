import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthorization } from '../../auth/authorization'
import { roleUser } from '../../../test/roleFixtures'
import AcademicCasePage from './AcademicCasePage'

/*
 * THE ACADEMIC CASE, PER ROLE (review of 18 Oct 2026; PLATFORM-JOURNEY-SPEC D-21).
 * The diagnostic page and its generation need rpl.applications.manage: a viewer
 * of the case without it sees each diagnostic's status, never a Review or a
 * Generate button that would end on Access denied.
 */

const mocks = vi.hoisted(() => ({ user: { current: null } }))

vi.mock('../services/academicRplService', () => ({
  fetchAcademicApplication: vi.fn().mockResolvedValue({
    data: {
      public_id: 'aca-1',
      case_reference: 'ARPL-2026-0001',
      status: 'diagnostic_in_progress',
      user: { name: 'Academic Client' },
      evidences: [],
      analyses: [{ id: 1, extraction: {} }],
      diagnostics: [{ id: 5, status: 'draft', items: [{ governance_status: 'pending' }] }],
    },
  }),
  fetchAcademicReferenceData: vi.fn().mockResolvedValue({ data: { tracks: [{ id: 2, code: 'diploma', name: { en: 'Diploma', ar: 'دبلوم' } }], eligibility_routes: [] } }),
  fetchAcademicReadiness: vi.fn().mockResolvedValue({ data: null }),
  fetchAcademicGapPlan: vi.fn(),
  analyseAcademicApplication: vi.fn(),
  confirmAcademicEligibility: vi.fn(),
  generateAcademicDiagnostic: vi.fn(),
  recordAcademicRecommendation: vi.fn(),
}))
vi.mock('../../auth/context/useAuthorization', () => ({ useAuthorization: () => createAuthorization(mocks.user.current) }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => 'en',
}))

function renderCase() {
  return render(
    <MemoryRouter initialEntries={['/academic-rpl/applications/aca-1']}>
      <Routes><Route path="/academic-rpl/applications/:applicationId" element={<AcademicCasePage />} /></Routes>
    </MemoryRouter>,
  )
}

describe('the diagnostic controls on the academic case', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('offers Review and Generate to a role that manages cases', async () => {
    mocks.user.current = roleUser('admin')
    renderCase()
    expect(await screen.findByRole('button', { name: 'Review' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate for/ })).toBeInTheDocument()
  })

  it('shows a committee member the diagnostic\'s status only', async () => {
    mocks.user.current = roleUser('committee-member')
    renderCase()
    expect(await screen.findByText('ARPL-2026-0001', { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Generate for/ })).not.toBeInTheDocument()
  })
})
