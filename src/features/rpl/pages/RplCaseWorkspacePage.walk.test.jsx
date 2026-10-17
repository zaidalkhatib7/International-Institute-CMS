import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplCaseWorkspacePage from './RplCaseWorkspacePage'
import { TIMELINE_EVENT_LABELS } from '../domain/rpl'
import { COURSE_PLAN_COPY } from '../domain/coursePlan'
import { createAuthorization } from '../../auth/authorization'

/*
 * THE CASE WORKSPACE AS STAFF READ IT (platform walk, 17 Oct 2026).
 *
 *   UI-01  the header names the client: the primary card keeps its dark surface;
 *   UI-03  the timeline names every event, never a dotted code;
 *   UI-10  a declined case shows who declined, when and why (staff-only), and a
 *          closed case points to no impossible action;
 *   UI-17  a completed case does not call its closed plan "in force".
 */

const mocks = vi.hoisted(() => ({}))
const language = vi.hoisted(() => ({ current: 'en' }))
const auth = vi.hoisted(() => ({ current: null }))

// Every service the page or its panels reach for answers an empty list unless a test says otherwise.
vi.mock('../services/rplService', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.fromEntries(Object.keys(actual).map((key) => {
    if (typeof actual[key] !== 'function') return [key, actual[key]]
    mocks[key] = vi.fn(() => Promise.resolve({ data: [] }))
    return [key, (...args) => mocks[key](...args)]
  }))
})
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))
vi.mock('../../auth/context/useAuthorization', () => ({
  useAuthorization: () => auth.current,
}))

const ADMINISTRATOR = { id: 1, name: 'Admin Example', roles: [{ slug: 'admin' }] }

function application(overrides = {}) {
  return {
    id: 41,
    public_id: 'case-41',
    case_reference: 'RPL-2026-ZYQ8U1YT',
    status: 'evidence_verification',
    user: { name: 'Maya Client', email: 'client1@e2e.test' },
    submitted_at: '2026-10-01T09:00:00+00:00',
    ...overrides,
  }
}

function renderCase(entry = '/rpl/applications/case-41') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/rpl/applications/:applicationId" element={<RplCaseWorkspacePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  language.current = 'en'
  auth.current = createAuthorization(ADMINISTRATOR)
  for (const fn of Object.values(mocks)) fn.mockImplementation(() => Promise.resolve({ data: [] }))
  mocks.fetchRplApplication.mockResolvedValue({ data: application() })
  mocks.fetchRplReferenceData.mockResolvedValue({ data: {} })
  mocks.fetchRplSettings.mockResolvedValue({ data: {} })
})

describe('UI-01: the case header', () => {
  it('keeps the dark primary surface under the white client name, e-mail and reference', async () => {
    renderCase()
    const name = await screen.findByRole('heading', { level: 2, name: 'Maya Client' })
    let card = name.parentElement
    while (card && !String(card.className).includes('bg-[var(--color-primary)]')) card = card.parentElement

    expect(card).not.toBeNull()
    expect(card.className.split(/\s+/)).not.toContain('bg-white')
    expect(within(card).getByText('client1@e2e.test')).toBeInTheDocument()
    expect(within(card).getAllByText('RPL-2026-ZYQ8U1YT').length).toBeGreaterThan(0)
  })
})

describe('UI-03: the timeline', () => {
  it('names the intake, screening, quiz and plan events in Arabic, never as dotted codes', async () => {
    language.current = 'ar'
    mocks.fetchRplTimeline.mockResolvedValue({ data: [
      { id: 1, event: 'application.created', created_at: '2026-10-01T09:00:00Z' },
      { id: 2, event: 'administrative_review.started', created_at: '2026-10-01T10:00:00Z' },
      { id: 3, event: 'screening_decision.recorded', created_at: '2026-10-02T10:00:00Z' },
      { id: 4, event: 'admin.assessment.started', created_at: '2026-10-02T11:00:00Z' },
      { id: 5, event: 'course_plan.generated', created_at: '2026-10-03T11:00:00Z' },
    ] })
    renderCase('/rpl/applications/case-41?tab=timeline')

    for (const code of ['application.created', 'administrative_review.started', 'screening_decision.recorded', 'admin.assessment.started', 'course_plan.generated']) {
      expect(await screen.findByText(TIMELINE_EVENT_LABELS[code].ar)).toBeInTheDocument()
      expect(screen.queryByText(code)).not.toBeInTheDocument()
    }
  })
})

describe('UI-10: a declined case', () => {
  const declined = () => application({
    status: 'rejected',
    status_reason: 'Decline rationale for the record 5bdEvJzE.',
    decline_reason_code: 'screening_declined',
    decline_applicant_category: 'documents_not_verified',
    reapply_available_at: '2026-10-24T10:00:00Z',
  })
  const timeline = [
    { id: 9, event: 'application.declined', to_status: 'rejected', reason: 'Decline rationale for the record 5bdEvJzE.', actor: { name: 'Staff Decider', email: 'decider@e2e.test' }, created_at: '2026-10-17T10:00:00Z' },
  ]

  it('shows staff the rationale and who declined, on the overview and the decision tab', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: declined() })
    mocks.fetchRplTimeline.mockResolvedValue({ data: timeline })
    renderCase()

    expect(await screen.findByText('Decline rationale (staff only; the applicant never sees it)')).toBeInTheDocument()
    expect(screen.getByText('Decline rationale for the record 5bdEvJzE.')).toBeInTheDocument()
    expect(screen.getByText(/Declined by Staff Decider on/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Decision/ }))
    const record = await screen.findByRole('heading', { name: 'The decline' })
    const card = record.closest('div.overflow-hidden')
    expect(within(card).getByText('Decline rationale for the record 5bdEvJzE.')).toBeInTheDocument()
    expect(within(card).getByText(/Declined by Staff Decider/)).toBeInTheDocument()
  })

  it('shows the rationale on the timeline row of the decline', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: declined() })
    mocks.fetchRplTimeline.mockResolvedValue({ data: timeline })
    renderCase('/rpl/applications/case-41?tab=timeline')

    const heading = await screen.findByText(TIMELINE_EVENT_LABELS['application.declined'].en)
    expect(within(heading.closest('li')).getByText('Decline rationale for the record 5bdEvJzE.')).toBeInTheDocument()
  })

  it.each(['rejected', 'completed'])('says a %s case is closed instead of pointing to the decision actions', async (status) => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status, allowed_transitions: [] }) })
    renderCase()

    expect(await screen.findByText('This case is closed: no further status can be set.')).toBeInTheDocument()
    expect(screen.queryByText('No other status can be set from here. Use the decision, interview or decline actions.')).not.toBeInTheDocument()
  })
})

describe('UI-17: the plan of a completed case', () => {
  it('reads closed on the overview, never in force', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'completed', course_plan: { entry_quiz_result: 'failed', draft_version: null, in_force_version: 1, has_plan: true } }) })
    renderCase()

    expect(await screen.findByText('Version 1 of the course plan is closed.')).toBeInTheDocument()
    expect(screen.queryByText(COURSE_PLAN_COPY.en.inForce.replace('{version}', '1'))).not.toBeInTheDocument()
  })
})
