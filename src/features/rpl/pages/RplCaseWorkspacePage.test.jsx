import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplCaseWorkspacePage from './RplCaseWorkspacePage'
import { DECLINE_REASONS } from '../domain/rpl'
import { formatLocalizedDateTime } from '../../../utils/localization'

/*
 * A REJECTED CASE SAYS WHY, AND WHEN ITS CLIENT MAY COME BACK.
 *
 * Owner flow of 12 Oct 2026: every move into `rejected` stamps the case with a
 * reason code and `reapply_available_at`, the end of the reapply cooldown frozen
 * at that moment. Until the client's wait is over the API refuses a new RPL case
 * for them, so the staff member on the phone needs that date on the case itself,
 * not a calculation from today's setting.
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
}))

const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/rplService', () => mocks)
// Partial: utils/localization reads the language metadata off this same module.
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))
vi.mock('../../auth/context/useAuthorization', () => ({
  useAuthorization: () => ({ isAdministrator: true }),
}))

function application(overrides = {}) {
  return {
    id: 41,
    case_reference: 'RPL-2026-DECLINED',
    status: 'rejected',
    user: { name: 'Applicant Example', email: 'applicant@example.test' },
    submitted_at: '2026-10-01T09:00:00+00:00',
    finalised_at: '2026-10-12T10:00:00+00:00',
    decline_reason_code: 'intake_declined',
    reapply_available_at: '2026-10-19T10:00:00+00:00',
    ...overrides,
  }
}

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
  mocks.fetchRplApplication.mockResolvedValue({ data: application() })
  mocks.fetchRplEvidence.mockResolvedValue({ data: [] })
  mocks.fetchRplReferenceData.mockResolvedValue({ data: {} })
  mocks.fetchRplTimeline.mockResolvedValue({ data: [] })
  mocks.fetchRplAssessments.mockResolvedValue({ data: [] })
  mocks.fetchRplAssignments.mockResolvedValue({ data: [] })
  mocks.fetchRplAssessors.mockResolvedValue({ data: [] })
})

describe('the decline stamp on the case summary', () => {
  it('shows the reason and the date the client may open a new request', async () => {
    renderCase()

    expect(await screen.findByText('Decline reason')).toBeInTheDocument()
    expect(screen.getByText(DECLINE_REASONS.intake_declined.labels.en)).toBeInTheDocument()
    expect(screen.getByText('May open a new request from')).toBeInTheDocument()
    // The stored date, formatted; never a date recomputed from today's setting.
    expect(screen.getByText(formatLocalizedDateTime('2026-10-19T10:00:00+00:00', 'en'))).toBeInTheDocument()
  })

  it('shows neither on a case that is not declined', async () => {
    mocks.fetchRplApplication.mockResolvedValue({
      data: application({ status: 'administrative_review', finalised_at: null, decline_reason_code: null, reapply_available_at: null }),
    })
    renderCase()

    expect(await screen.findByText('Case summary')).toBeInTheDocument()
    expect(screen.queryByText('Decline reason')).not.toBeInTheDocument()
    expect(screen.queryByText('May open a new request from')).not.toBeInTheDocument()
  })

  it('shows the date the API holds a pre-stamp rejection to, marked as derived', async () => {
    // Rejected before the stamp existed: nothing stored, but both store routes
    // refuse the client until finalised_at + the cooldown days. Before, staff saw
    // no date at all.
    mocks.fetchRplApplication.mockResolvedValue({
      data: application({ decline_reason_code: null, reapply_available_at: null, effective_reapply_available_at: '2026-10-19T10:00:00.000000Z' }),
    })
    renderCase()

    expect(await screen.findByText('May open a new request from')).toBeInTheDocument()
    expect(
      screen.getByText(`${formatLocalizedDateTime('2026-10-19T10:00:00.000000Z', 'en')} (derived from the rejection date and the current cooldown setting)`),
    ).toBeInTheDocument()
  })

  it('never marks a stored stamp as derived', async () => {
    mocks.fetchRplApplication.mockResolvedValue({
      data: application({ effective_reapply_available_at: '2026-10-19T10:00:00+00:00' }),
    })
    renderCase()

    expect(await screen.findByText(formatLocalizedDateTime('2026-10-19T10:00:00+00:00', 'en'))).toBeInTheDocument()
    expect(screen.queryByText(/derived from the rejection date/)).not.toBeInTheDocument()
  })

  it('renders the stamp in Arabic without a literal "undefined"', async () => {
    language.current = 'ar'
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ decline_reason_code: 'committee_rejected' }) })
    renderCase()

    expect(await screen.findByText('سبب الرفض')).toBeInTheDocument()
    expect(screen.getByText(DECLINE_REASONS.committee_rejected.labels.ar)).toBeInTheDocument()
    expect(screen.getByText('يمكنه تقديم طلب جديد اعتبارًا من')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
