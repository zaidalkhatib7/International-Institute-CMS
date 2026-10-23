import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthorization } from '../../auth/authorization'
import { roleUser } from '../../../test/roleFixtures'
import { resetWorkCounts } from '../hooks/useWorkCounts'
import TodayPage from './TodayPage'
import { resetAiServiceStatus } from '../../shared/ai/useAiServiceStatus'
import { degradedStatus, downStatus, okStatus } from '../../../test/aiFixtures'

/*
 * TODAY (PLATFORM-JOURNEY-SPEC §4.1, §9.1 item 6): the tiles a role can act on,
 * each with its count and the exact list it opens; the client chips and the
 * stage strip for case managers; the academic and pre-flow blocks; the role's
 * other screens; and the empty and failure lines.
 */

const mocks = vi.hoisted(() => ({
  fetchRplDashboard: vi.fn(),
  fetchRplChargeQueue: vi.fn(),
  fetchRplAfterQuizAttention: vi.fn(),
  fetchRplApplications: vi.fn(),
  fetchAcademicApplications: vi.fn(),
  user: { current: null },
  language: { current: 'en' },
}))

vi.mock('../../rpl/services/rplService', () => ({
  fetchRplDashboard: mocks.fetchRplDashboard,
  fetchRplChargeQueue: mocks.fetchRplChargeQueue,
  fetchRplAfterQuizAttention: mocks.fetchRplAfterQuizAttention,
  fetchRplApplications: mocks.fetchRplApplications,
}))
vi.mock('../../academicRpl/services/academicRplService', () => ({ fetchAcademicApplications: mocks.fetchAcademicApplications }))
// The AI service status (AI resilience, Release G): read only while someone is signed in.
const ai = vi.hoisted(() => ({ fetchAiServiceStatus: vi.fn() }))
vi.mock('../../shared/ai/aiServiceApi', () => ({ fetchAiServiceStatus: ai.fetchAiServiceStatus, fetchAiServiceHistory: vi.fn() }))
vi.mock('../../auth/context/useAuthorization', () => ({ useAuthorization: () => createAuthorization(mocks.user.current) }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => mocks.language.current,
}))

const QUEUES = { office_drafts: 1, client_drafts: 2, intake_review: 4, awaiting_client_info: 2, information_overdue: 1, information_review: 1, screening_decision: 3, interview_client: 1, interview_schedule: 1, interview_upcoming: 2, interview_record: 0, interview_decide: 0, interview_lapsed: 0, quiz_start: 0, quiz_prepare: 2, quiz_client: 2, plan_generate: 1, quiz_review: 0, plan_approve: 2, learning: 7, final_exam: 1, certificate: 0 }
const DASHBOARD = {
  applications: { total: 41, by_status: { submitted: 3, administrative_review: 1, evidence_verification: 3, interview_required: 1, assessment_in_progress: 5, course_plan_active: 7, completed: 10, rejected: 2, committee_review: 2 } },
  assignments: { pending: 0, active: 0 },
  open_appeals: 0,
  committee_queue: 2,
  quality_queue: 0,
  overdue_information_requests: 1,
  charges_awaiting_confirmation: 1,
  experience_certificates_awaiting_approval: 1,
  queues: QUEUES,
}

function Location() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname}{location.search}</p>
}

function renderToday() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<TodayPage />} />
        <Route path="*" element={<Location />} />
      </Routes>
    </MemoryRouter>,
  )
}

const tile = (name) => screen.getByRole('button', { name: new RegExp(`^${name}: `) })

beforeEach(() => {
  vi.clearAllMocks()
  resetWorkCounts()
  mocks.language.current = 'en'
  mocks.fetchRplDashboard.mockResolvedValue({ data: DASHBOARD })
  mocks.fetchRplChargeQueue.mockResolvedValue({ data: [{ route: 'offline', status: 'pending' }] })
  mocks.fetchRplAfterQuizAttention.mockResolvedValue({ data: { final_exam_blocked: [{}], level_certificates_held: [], level_certificates_fee_unusable: [], paid_charges_on_closed_cases: [], experience_certificates_not_issued: [{}] } })
  mocks.fetchRplApplications.mockResolvedValue({ data: { data: [], total: 3, current_page: 1, last_page: 3 } })
  mocks.fetchAcademicApplications.mockResolvedValue({ data: { data: [], total: 2, current_page: 1, last_page: 2 } })
})

describe('an administrator', () => {
  beforeEach(() => { mocks.user.current = roleUser('admin') })

  it('sees every tile with its count and the list it opens, the zero tiles muted and last', async () => {
    renderToday()
    await waitFor(() => expect(tile('Screening decision due')).toHaveAccessibleName('Screening decision due: 3'))
    expect(tile('New requests to review')).toHaveAttribute('data-href', '/rpl/applications?stage=request&queue=intake_review')
    // The overdue tile counts the information_overdue queue (cases), and opens exactly that list.
    expect(tile('Overdue information requests')).toHaveAccessibleName('Overdue information requests: 1')
    expect(tile('Overdue information requests')).toHaveAttribute('data-href', '/rpl/applications?stage=request&queue=information_overdue')
    expect(tile('Client replies to review')).toHaveAttribute('data-href', '/rpl/applications?stage=request&queue=information_review')
    expect(tile('Entry quizzes to prepare and send')).toHaveAttribute('data-href', '/rpl/applications?stage=entry_quiz&queue=quiz_prepare')
    expect(tile('Course plans to approve')).toHaveAttribute('data-href', '/rpl/applications?stage=course_plan&queue=plan_approve')
    expect(tile('Payments to confirm')).toHaveAccessibleName('Payments to confirm: 1')
    expect(tile('Experience certificates to approve')).toHaveAttribute('data-href', '/rpl/experience-certificates')
    await waitFor(() => expect(tile('Needs attention')).toHaveAccessibleName('Needs attention: 2'))

    const section = screen.getByRole('region', { name: 'Waiting for you' })
    const buttons = within(section).getAllByRole('button')
    const zeroIndex = buttons.findIndex((button) => button.dataset.zero === 'true')
    expect(zeroIndex).toBeGreaterThan(0)
    expect(buttons.slice(zeroIndex).every((button) => button.dataset.zero === 'true')).toBe(true)
    expect(tile('Interviews to record')).toHaveAttribute('data-zero', 'true')
    expect(screen.queryByRole('button', { name: /Cases assigned to you/ })).not.toBeInTheDocument()
  })

  it('opens the exact list a tile counts', async () => {
    renderToday()
    await waitFor(() => expect(tile('Screening decision due')).toHaveAccessibleName('Screening decision due: 3'))
    fireEvent.click(tile('Screening decision due'))
    expect(screen.getByTestId('location')).toHaveTextContent('/rpl/applications?stage=decision&queue=screening_decision')
  })

  it('shows the client chips, the stage strip and the academic block', async () => {
    renderToday()
    const client = await screen.findByRole('region', { name: 'Waiting for the client' })
    await waitFor(() => expect(within(client).getByRole('link', { name: /Learning/ })).toHaveTextContent('7'))
    expect(within(client).getByRole('link', { name: /Preparing the request/ })).toHaveAttribute('href', '/rpl/applications?stage=request&queue=client_drafts')

    const glance = screen.getByRole('region', { name: 'The professional path at a glance' })
    expect(within(glance).getByRole('link', { name: /Request/ })).toHaveTextContent('4')
    expect(within(glance).getByRole('link', { name: /Request/ })).toHaveAttribute('href', '/rpl/applications?stage=request')
    expect(within(glance).getByRole('link', { name: /Entry quiz/ })).toHaveTextContent('5')
    expect(within(glance).getByRole('link', { name: /Closed/ })).toHaveTextContent('12')

    const academic = screen.getByRole('region', { name: 'Professional academic path' })
    await waitFor(() => expect(academic).toHaveTextContent('New requests 2'))
    expect(mocks.fetchAcademicApplications).toHaveBeenCalledWith({ status: 'submitted', per_page: 1 })
    expect(within(academic).getByRole('link', { name: /Open the cases/ })).toHaveAttribute('href', '/academic-rpl/applications')
  })

  it('shows the pre-flow block only while pre-flow work exists', async () => {
    renderToday()
    expect(await screen.findByRole('region', { name: 'Pre-flow committee path' })).toBeInTheDocument()
  })

  it('says nothing waits when every tile is 0', async () => {
    mocks.fetchRplDashboard.mockResolvedValue({ data: { ...DASHBOARD, overdue_information_requests: 0, charges_awaiting_confirmation: 0, experience_certificates_awaiting_approval: 0, queues: Object.fromEntries(Object.keys(QUEUES).map((key) => [key, 0])) } })
    mocks.fetchRplAfterQuizAttention.mockResolvedValue({ data: {} })
    renderToday()
    expect(await screen.findByText('Nothing is waiting for you right now.')).toBeInTheDocument()
  })

  it('shows a quiet placeholder, never "—", while the first read is out', async () => {
    mocks.fetchRplDashboard.mockReturnValue(new Promise(() => {}))
    renderToday()
    await waitFor(() => expect(tile('Needs attention')).toHaveAccessibleName('Needs attention: 2'))
    expect(tile('Screening decision due')).toHaveAccessibleName('Screening decision due: loading')
    expect(tile('Screening decision due')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Some counts could not be refreshed.')).not.toBeInTheDocument()
    const glance = screen.getByRole('region', { name: 'The professional path at a glance' })
    expect(glance.textContent).not.toContain('—')
  })

  it('shows "—" and one quiet line when a source fails, never an error', async () => {
    mocks.fetchRplDashboard.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 500 } }))
    renderToday()
    expect(await screen.findByText('Some counts could not be refreshed.')).toBeInTheDocument()
    await waitFor(() => expect(tile('Screening decision due')).toHaveAccessibleName('Screening decision due: —'))
    expect(document.body.textContent).not.toMatch(/\bAPI\b|CMS|endpoint/i)
  })

  it('renders in Arabic, without RPL, API or CMS', async () => {
    mocks.language.current = 'ar'
    renderToday()
    expect(await screen.findByRole('heading', { name: 'اليوم' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: /^بانتظار قرار الفرز: / })).toBeInTheDocument())
    expect(screen.getByRole('region', { name: 'بانتظار العميل' })).toBeInTheDocument()
    expect(screen.getByText('كيف يسير المسار')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/RPL|\bAPI\b|CMS|endpoint|undefined/)
    // The stage strip's separators point forward: a chevron drawn for the direction, never a mirrored '‹'.
    const glance = screen.getByRole('region', { name: 'المسار المهني بنظرة واحدة' })
    expect(glance.textContent).not.toMatch(/[‹›]/)
    expect(glance.querySelectorAll('svg.lucide-chevron-left').length).toBe(6)
    expect(glance.querySelectorAll('svg.lucide-chevron-right').length).toBe(0)
  })
})

describe('the other roles', () => {
  it('gives the finance operator only the payments tile, counted from the charge list', async () => {
    mocks.user.current = roleUser('finance-operator')
    renderToday()
    await waitFor(() => expect(tile('Payments to confirm')).toHaveAccessibleName('Payments to confirm: 1'))
    const section = screen.getByRole('region', { name: 'Waiting for you' })
    expect(within(section).getAllByRole('button')).toHaveLength(1)
    expect(mocks.fetchRplDashboard).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Waiting for the client' })).not.toBeInTheDocument()
  })

  it('gives the content admin its screens and nothing else', async () => {
    mocks.user.current = roleUser('content-admin')
    renderToday()
    const screens = await screen.findByRole('region', { name: 'Your screens' })
    expect(within(screens).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/programs', '/competency-gap-library', '/library', '/settings/ai-service'])
    expect(screen.queryByRole('region', { name: 'Waiting for you' })).not.toBeInTheDocument()
    expect(screen.queryByText('How the path runs')).not.toBeInTheDocument()
  })

  it('gives the committee member the pre-flow block', async () => {
    mocks.user.current = roleUser('committee-member')
    renderToday()
    const block = await screen.findByRole('region', { name: 'Pre-flow committee path' })
    await waitFor(() => expect(within(block).getByRole('button', { name: /^Committee decisions due: 2/ })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /^Quality reviews due/ })).not.toBeInTheDocument()
  })

  it('gives the assessor the cases assigned to it, scoped by the server', async () => {
    mocks.user.current = roleUser('assessor')
    renderToday()
    await waitFor(() => expect(tile('Cases assigned to you')).toHaveAccessibleName('Cases assigned to you: 3'))
    expect(mocks.fetchRplApplications).toHaveBeenCalledWith({ per_page: 1 })
    expect(screen.queryByRole('region', { name: 'The professional path at a glance' })).not.toBeInTheDocument()
  })
})

/*
 * THE AI SERVICE ON TODAY (AI resilience, Release G, AI-RESILIENCE-SPEC D20,
 * §6.5): amber while a family runs on a backup model, red while one is down,
 * nothing while all is well; Arabic and English.
 */
describe('the AI service banner', () => {
  beforeEach(() => {
    mocks.user.current = roleUser('admin')
    resetAiServiceStatus()
    localStorage.setItem('icpc_admin_token', 'token')
  })
  afterEach(() => localStorage.removeItem('icpc_admin_token'))

  it('says which work runs on a backup model and which model serves', async () => {
    ai.fetchAiServiceStatus.mockResolvedValue({ data: degradedStatus() })
    renderToday()
    const banner = await screen.findByRole('status', { name: 'AI service status' })
    expect(banner).toHaveTextContent('The AI service is running on a backup model for: Case file analysis. Serving now: gemini-3.1-pro-preview.')
    expect(within(banner).getByRole('link', { name: 'AI service page' })).toHaveAttribute('href', '/settings/ai-service')
  })

  it('says nothing while all is well', async () => {
    ai.fetchAiServiceStatus.mockResolvedValue({ data: okStatus() })
    renderToday()
    await waitFor(() => expect(ai.fetchAiServiceStatus).toHaveBeenCalled())
    await waitFor(() => expect(tile('Screening decision due')).toHaveAccessibleName('Screening decision due: 3'))
    expect(screen.queryByRole('status', { name: 'AI service status' })).not.toBeInTheDocument()
  })

  it('says it in Arabic when the work is down, without RPL, API or CMS', async () => {
    mocks.language.current = 'ar'
    ai.fetchAiServiceStatus.mockResolvedValue({ data: downStatus() })
    renderToday()
    const banner = await screen.findByRole('status', { name: 'حالة خدمة الذكاء الاصطناعي' })
    expect(banner).toHaveAttribute('data-ai-banner', 'down')
    expect(banner).toHaveTextContent(/خدمة الذكاء الاصطناعي غير متاحة الآن في: إعداد الحزم والمحتوى\./)
    expect(banner.textContent).not.toMatch(/RPL|\bAPI\b|CMS/)
  })
})
