import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplCaseWorkspacePage from './RplCaseWorkspacePage'
import { APPLICATION_STATUS } from '../domain/rpl'
import { createAuthorization } from '../../auth/authorization'

/*
 * A FAILED ENTRY QUIZ STOPS THE CERTIFICATE CHAIN (owner, 12 Oct 2026, D11, P4).
 *
 * The server refuses assessment_in_progress -> quality_review (422 errors.status)
 * when the case's marked entry quiz did not pass or was referred, and names the
 * quiz in its message. The case screen has to show that sentence to the person
 * who pressed "Update status", not a generic failure.
 */

const mocks = vi.hoisted(() => ({
  assignRplAssessor: vi.fn(),
  acceptRplAssignment: vi.fn(),
  closeRplInformationRequest: vi.fn(),
  createRplInformationRequest: vi.fn(),
  declareRplConflict: vi.fn(),
  fetchRplApplication: vi.fn(),
  fetchRplAssessments: vi.fn(),
  fetchRplAssessors: vi.fn(),
  fetchRplAssignments: vi.fn(),
  fetchRplEvidence: vi.fn(),
  fetchRplReferenceData: vi.fn(),
  fetchRplTimeline: vi.fn(),
  submitRplCommitteeDecision: vi.fn(),
  submitRplInitialReview: vi.fn(),
  submitRplQualityReview: vi.fn(),
  startAdminRplAssessment: vi.fn(),
  startRplAssessment: vi.fn(),
  transitionRplApplication: vi.fn(),
  reconcileRplPayment: vi.fn(),
  fetchRplScreenings: vi.fn(),
  requestRplScreening: vi.fn(),
  acknowledgeRplScreening: vi.fn(),
}))

const language = vi.hoisted(() => ({ current: 'en' }))
const auth = vi.hoisted(() => ({ current: null }))

vi.mock('../services/rplService', () => mocks)
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))
vi.mock('../../auth/context/useAuthorization', () => ({
  useAuthorization: () => auth.current,
}))

const ADMINISTRATOR = { id: 1, name: 'Admin Example', roles: [{ slug: 'admin' }] }
const REFUSAL = 'The entry quiz on this case did not pass the pass mark (48.00%, more than 50% needed), so the case cannot move to quality review: the client goes to a course plan.'

function renderCase() {
  return render(
    <MemoryRouter initialEntries={['/rpl/applications/41']}>
      <Routes>
        <Route path="/rpl/applications/:applicationId" element={<RplCaseWorkspacePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  auth.current = createAuthorization(ADMINISTRATOR)
  mocks.fetchRplScreenings.mockResolvedValue({ data: [] })
  mocks.fetchRplApplication.mockResolvedValue({
    data: {
      id: 41,
      case_reference: 'RPL-2026-ENTRYQUIZ',
      status: 'assessment_in_progress',
      user: { name: 'Applicant Example', email: 'applicant@example.test' },
      submitted_at: '2026-10-01T09:00:00+00:00',
    },
  })
  mocks.fetchRplEvidence.mockResolvedValue({ data: [] })
  mocks.fetchRplReferenceData.mockResolvedValue({ data: {} })
  mocks.fetchRplTimeline.mockResolvedValue({ data: [] })
  mocks.fetchRplAssessments.mockResolvedValue({ data: [] })
  mocks.fetchRplAssignments.mockResolvedValue({ data: [] })
  mocks.fetchRplAssessors.mockResolvedValue({ data: [] })
  mocks.transitionRplApplication.mockRejectedValue({
    response: { status: 422, data: { message: REFUSAL, errors: { status: [REFUSAL] } } },
  })
})

describe('the move to quality review after a failed entry quiz', () => {
  it('sends the move and shows the server\'s refusal, naming the quiz', async () => {
    renderCase()

    fireEvent.change(await screen.findByLabelText('Next status'), { target: { value: 'quality_review' } })
    fireEvent.change(screen.getByLabelText('Transition note'), { target: { value: 'Assessment finished.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }))

    await waitFor(() => expect(mocks.transitionRplApplication).toHaveBeenCalledTimes(1))
    expect(mocks.transitionRplApplication.mock.calls[0]).toEqual(['41', { status: 'quality_review', reason: 'Assessment finished.' }])
    const alert = await screen.findByRole('alert')
    await waitFor(() => expect(alert).toHaveTextContent(REFUSAL))
    // The case did not move: the badge still reads assessment in progress.
    expect(screen.queryByText('Application status updated.')).not.toBeInTheDocument()
    expect(screen.getAllByText(APPLICATION_STATUS.assessment_in_progress.labels.en).length).toBeGreaterThan(0)
  })

  it('shows the same refusal on the Arabic page', async () => {
    language.current = 'ar'
    renderCase()

    fireEvent.change(await screen.findByLabelText('الحالة التالية'), { target: { value: 'quality_review' } })
    fireEvent.click(screen.getByRole('button', { name: 'تحديث الحالة' }))

    const alert = await screen.findByRole('alert')
    await waitFor(() => expect(alert.textContent).toContain(REFUSAL))
    expect(document.body.textContent).not.toContain('undefined')
  })
})
