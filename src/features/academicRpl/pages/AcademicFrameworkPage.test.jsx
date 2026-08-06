import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AcademicFrameworkPage from './AcademicFrameworkPage'

/*
 * The approval gate on the entire academic pathway.
 *
 * Approving a competency here is what allows an admission recommendation to be
 * computed against it, so the tests are about friction being present on
 * purpose: a written basis, one competency at a time, and no bulk action. A
 * framework waved through in one click is indistinguishable from one nobody
 * read.
 */

const mocks = vi.hoisted(() => ({
  fetchAcademicReferenceData: vi.fn(),
  approveAcademicCompetency: vi.fn(),
}))

// The page reads the admin language from storage, which is Arabic by default.
// Pinned to English so the assertions read as the copy they are checking.
vi.mock('../../../services/languageStorage', () => ({
  getAdminLanguage: () => 'en',
}))

vi.mock('../services/academicRplService', () => ({
  fetchAcademicReferenceData: mocks.fetchAcademicReferenceData,
  approveAcademicCompetency: mocks.approveAcademicCompetency,
}))

function reference(overrides = {}) {
  return {
    data: {
      tracks: [
        {
          id: 2,
          code: 'professional_master',
          name: { en: 'Professional Master' },
          rank: 2,
          requirements: [
            { academic_rpl_competency_id: 1, weight: 3, is_critical: true },
          ],
        },
      ],
      competencies: [
        {
          id: 1,
          code: 'ARC-RM',
          name: { en: 'Research methodology' },
          definition: { en: 'Designs and justifies an appropriate enquiry.' },
          level_descriptors: {
            professional_diploma: 'Reads and interprets a study others designed.',
            professional_master: 'Designs and defends a small applied study.',
            professional_doctorate: 'Designs original enquiry at doctorate depth.',
          },
          status: 'draft',
        },
      ],
      framework: { total: 8, approved: 0, ready: false },
      admission_policy: { version: 1 },
      policy_valid: true,
      ...overrides,
    },
  }
}

beforeEach(() => {
  mocks.fetchAcademicReferenceData.mockReset().mockResolvedValue(reference())
  mocks.approveAcademicCompetency.mockReset().mockResolvedValue({ data: {} })
})

describe('AcademicFrameworkPage', () => {
  it('states the consequence of an unapproved framework where it is discovered', async () => {
    render(<AcademicFrameworkPage />)

    // Not left for somebody to infer from an empty readiness screen later.
    expect(await screen.findByText(/pathway is halted/)).toBeInTheDocument()
    expect(screen.getByText(/0 \/ 8/)).toBeInTheDocument()
  })

  it('shows all three track depths together, because approval accepts all of them', async () => {
    render(<AcademicFrameworkPage />)

    expect(await screen.findByText(/Reads and interprets a study others designed/)).toBeInTheDocument()
    expect(screen.getByText(/Designs and defends a small applied study/)).toBeInTheDocument()
    expect(screen.getByText(/Designs original enquiry at doctorate depth/)).toBeInTheDocument()
  })

  it('marks where the competency is critical', async () => {
    render(<AcademicFrameworkPage />)
    expect(await screen.findByText('Critical')).toBeInTheDocument()
  })

  it('refuses approval without a written basis', async () => {
    render(<AcademicFrameworkPage />)

    fireEvent.click(await screen.findByRole('button', { name: /Approve competency/ }))

    expect(await screen.findByText(/too short/)).toBeInTheDocument()
    expect(mocks.approveAcademicCompetency).not.toHaveBeenCalled()
  })

  it('sends the basis with the approval so the audit trail records why', async () => {
    render(<AcademicFrameworkPage />)

    const basis = 'Reviewed against the doctorate descriptors and accepted by the academic lead.'
    fireEvent.change(await screen.findByLabelText(/Basis for approval/), { target: { value: basis } })
    fireEvent.click(screen.getByRole('button', { name: /Approve competency/ }))

    await waitFor(() => expect(mocks.approveAcademicCompetency).toHaveBeenCalledWith(1, { basis }))
  })

  it('offers no bulk approval', async () => {
    render(<AcademicFrameworkPage />)
    await screen.findByRole('button', { name: /Approve competency/ })

    // Structural: if an approve-all is ever added, this fails and someone has
    // to justify it.
    expect(screen.queryByRole('button', { name: /approve all/i })).not.toBeInTheDocument()
    expect(screen.getByText(/deliberately no approve-all/)).toBeInTheDocument()
  })

  it('stops offering approval once a competency is approved', async () => {
    mocks.fetchAcademicReferenceData.mockResolvedValue(reference({
      competencies: [{ ...reference().data.competencies[0], status: 'approved' }],
      framework: { total: 8, approved: 1, ready: true },
    }))

    render(<AcademicFrameworkPage />)

    await screen.findByText(/framework is approved/)
    expect(screen.queryByRole('button', { name: /Approve competency/ })).not.toBeInTheDocument()
  })

  it('surfaces a server refusal without clearing what was typed', async () => {
    mocks.approveAcademicCompetency.mockRejectedValue({
      response: { status: 422, data: { message: 'This competency is already approved.' } },
    })
    render(<AcademicFrameworkPage />)

    const basis = 'Reviewed against the doctorate descriptors and accepted by the academic lead.'
    const field = await screen.findByLabelText(/Basis for approval/)
    fireEvent.change(field, { target: { value: basis } })
    fireEvent.click(screen.getByRole('button', { name: /Approve competency/ }))

    expect(await screen.findByText(/already approved/)).toBeInTheDocument()
    // Losing the text on failure would make the reviewer write it twice.
    expect(field).toHaveValue(basis)
  })
})
