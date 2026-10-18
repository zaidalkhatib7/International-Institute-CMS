import { createElement } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthorization } from '../../auth/authorization'
import { permissionsUser, roleUser } from '../../../test/roleFixtures'
import useWorkCounts, { deriveWorkCounts, plannedSources, refreshWorkCounts, resetWorkCounts } from './useWorkCounts'

/*
 * THE WORK COUNTS (PLATFORM-JOURNEY-SPEC §4.1, §9.1 item 5): each source only
 * for its permission, one request per source for every caller within 30 s, a
 * failed source as null fields, and the totals per permission.
 */

const mocks = vi.hoisted(() => ({
  fetchRplDashboard: vi.fn(),
  fetchRplChargeQueue: vi.fn(),
  fetchRplAfterQuizAttention: vi.fn(),
  fetchRplApplications: vi.fn(),
  fetchAcademicApplications: vi.fn(),
  user: { current: null },
}))

vi.mock('../../rpl/services/rplService', () => ({
  fetchRplDashboard: mocks.fetchRplDashboard,
  fetchRplChargeQueue: mocks.fetchRplChargeQueue,
  fetchRplAfterQuizAttention: mocks.fetchRplAfterQuizAttention,
  fetchRplApplications: mocks.fetchRplApplications,
}))
vi.mock('../../academicRpl/services/academicRplService', () => ({ fetchAcademicApplications: mocks.fetchAcademicApplications }))
vi.mock('../../auth/context/useAuthorization', () => ({ useAuthorization: () => createAuthorization(mocks.user.current) }))

const QUEUES = { office_drafts: 1, client_drafts: 0, intake_review: 4, awaiting_client_info: 2, screening_decision: 3, interview_client: 1, interview_schedule: 1, interview_upcoming: 2, interview_record: 0, interview_decide: 0, interview_lapsed: 0, quiz_start: 1, quiz_prepare: 2, quiz_client: 2, plan_generate: 1, quiz_review: 0, plan_approve: 2, learning: 7, final_exam: 1, certificate: 0 }
const DASHBOARD = {
  data: {
    applications: { total: 41, by_status: { quality_review: 1, committee_review: 2, appeal_open: 0 } },
    assignments: { pending: 1, active: 0 },
    open_appeals: 1,
    committee_queue: 2,
    quality_queue: 1,
    overdue_information_requests: 1,
    charges_awaiting_confirmation: 3,
    experience_certificates_awaiting_approval: 1,
    queues: QUEUES,
  },
}

const wrapper = ({ children }) => createElement(MemoryRouter, null, children)

beforeEach(() => {
  vi.clearAllMocks()
  resetWorkCounts()
  mocks.fetchRplDashboard.mockResolvedValue(DASHBOARD)
  mocks.fetchRplChargeQueue.mockResolvedValue({ data: [{ route: 'offline', status: 'pending' }, { route: 'wallet', status: 'pending' }, { route: 'offline', status: 'pending' }] })
  mocks.fetchRplAfterQuizAttention.mockResolvedValue({ data: { final_exam_blocked: [{}], level_certificates_held: [], level_certificates_fee_unusable: [{}], paid_charges_on_closed_cases: [], experience_certificates_not_issued: [{}] } })
  mocks.fetchRplApplications.mockResolvedValue({ data: { data: [{}], total: 6, current_page: 1, last_page: 6 } })
  mocks.fetchAcademicApplications.mockResolvedValue({ data: { data: [{}], total: 2, current_page: 1, last_page: 2 } })
})

describe('which sources a viewer asks', () => {
  it('asks nothing of a role without a counted permission', async () => {
    mocks.user.current = roleUser('content-admin')
    const { result } = renderHook(() => useWorkCounts({ includeTodayOnly: true }), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sources).toEqual([])
    expect(mocks.fetchRplDashboard).not.toHaveBeenCalled()
    expect(mocks.fetchRplChargeQueue).not.toHaveBeenCalled()
    expect(result.current.workTotal).toBeNull()
  })

  it('reads the dashboard for rpl.applications.view, and the offline charges for a reconciler without it', () => {
    const plan = (slugs, today = false) => plannedSources(createAuthorization(permissionsUser(slugs)).hasPermission, today)
    expect(plan(['rpl.applications.view'])).toEqual(['dashboard'])
    expect(plan(['rpl.payments.reconcile'])).toEqual(['charges'])
    expect(plan(['rpl.payments.reconcile', 'rpl.applications.view'])).toEqual(['dashboard'])
  })

  it('reads attention, academic and assigned only on Today', () => {
    const admin = createAuthorization(roleUser('admin')).hasPermission
    expect(plannedSources(admin, false)).toEqual(['dashboard'])
    expect(plannedSources(admin, true)).toEqual(['dashboard', 'attention', 'academic'])
    expect(plannedSources(createAuthorization(roleUser('assessor')).hasPermission, true)).toEqual(['dashboard', 'academic', 'assigned'])
    expect(plannedSources(createAuthorization(roleUser('committee-member')).hasPermission, true)).toEqual(['dashboard', 'academic'])
  })

  it('counts the finance operator\'s payments from the charge list, offline rows only, without the dashboard', async () => {
    mocks.user.current = roleUser('finance-operator')
    const { result } = renderHook(() => useWorkCounts(), { wrapper })
    await waitFor(() => expect(result.current.paymentsToConfirm).toBe(2))
    expect(mocks.fetchRplDashboard).not.toHaveBeenCalled()
    expect(mocks.fetchRplChargeQueue).toHaveBeenCalledWith({ status: 'pending' })
    expect(result.current.workTotal).toBe(2)
  })
})

describe('one shared request per source', () => {
  it('makes one request per source for two callers within 30 seconds', async () => {
    mocks.user.current = roleUser('admin')
    const first = renderHook(() => useWorkCounts(), { wrapper })
    const second = renderHook(() => useWorkCounts(), { wrapper })
    await waitFor(() => expect(first.result.current.casesForYou).not.toBeNull())
    await waitFor(() => expect(second.result.current.casesForYou).not.toBeNull())
    expect(mocks.fetchRplDashboard).toHaveBeenCalledTimes(1)
  })

  it('reads again on refresh()', async () => {
    mocks.user.current = roleUser('admin')
    const { result } = renderHook(() => useWorkCounts(), { wrapper })
    await waitFor(() => expect(result.current.casesForYou).not.toBeNull())
    await result.current.refresh()
    expect(mocks.fetchRplDashboard).toHaveBeenCalledTimes(2)
  })
})

describe('a failed source', () => {
  it('gives null fields and marks the counts partial, never throwing', async () => {
    mocks.user.current = roleUser('admin')
    mocks.fetchRplDashboard.mockRejectedValue(Object.assign(new Error('nope'), { response: { status: 500 } }))
    const { result } = renderHook(() => useWorkCounts({ includeTodayOnly: true }), { wrapper })
    await waitFor(() => expect(result.current.partial).toBe(true))
    await waitFor(() => expect(result.current.attentionTotal).toBe(3))
    expect(result.current.casesForYou).toBeNull()
    expect(result.current.paymentsToConfirm).toBeNull()
    expect(result.current.workTotal).toBeNull()
    expect(result.current.failed).toEqual(['dashboard'])
  })
})

describe('the totals per permission', () => {
  const derive = (user, values = { dashboard: DASHBOARD }) => {
    const { hasPermission } = createAuthorization(user)
    return deriveWorkCounts(values, hasPermission, plannedSources(hasPermission))
  }

  it('sums every staff queue tile, the payments, the certificates and the pre-flow work for an administrator', () => {
    const counts = derive(roleUser('admin'))
    // office 1 + intake 4 + screening 3 + schedule 1 + quiz_start 1 + quiz_prepare 2 + plan_generate 1 + plan_approve 2
    expect(counts.casesForYou).toBe(15)
    expect(counts.paymentsToConfirm).toBe(3)
    expect(counts.experienceToApprove).toBe(1)
    expect(counts.workTotal).toBe(15 + 3 + 1 + 2 + 1 + 1)
    // by_status 1 + 2 + 0, open_appeals 1, assignments 1 + 0
    expect(counts.preflowWork).toBe(5)
  })

  it('counts only the queues the viewer can act on', () => {
    const counts = derive(permissionsUser(['rpl.applications.view', 'rpl.screening.decide']))
    expect(counts.casesForYou).toBe(3)
    expect(counts.paymentsToConfirm).toBeNull()
    expect(counts.workTotal).toBe(3)
  })

  it('gives a committee member the committee queue and no case tiles', () => {
    const counts = derive(roleUser('committee-member'))
    expect(counts.casesForYou).toBe(0)
    expect(counts.workTotal).toBe(2)
  })

  it('leaves the cases for you unknown when the dashboard carries no queues (an older API)', () => {
    const counts = derive(roleUser('admin'), { dashboard: { data: { ...DASHBOARD.data, queues: undefined } } })
    expect(counts.casesForYou).toBeNull()
    expect(counts.workTotal).toBe(3 + 1 + 2 + 1 + 1)
  })
})

describe('reading again (review of 18 Oct 2026)', () => {
  it('keeps the last counts on screen while a source is read again, and says it is refreshing', async () => {
    mocks.user.current = roleUser('admin')
    const { result } = renderHook(() => useWorkCounts({ includeTodayOnly: true }), { wrapper })
    await waitFor(() => expect(result.current.casesForYou).toBe(15))
    let answer
    mocks.fetchRplDashboard.mockReturnValueOnce(new Promise((resolve) => { answer = resolve }))
    act(() => { result.current.refresh() })
    // The light academic read answers first and re-renders every caller while the dashboard is still out.
    await waitFor(() => expect(mocks.fetchAcademicApplications).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.refreshing).toBe(true))
    expect(result.current.casesForYou).toBe(15)
    expect(result.current.queues).toEqual(QUEUES)
    expect(result.current.workTotal).not.toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.pendingSources).toEqual([])
    await act(async () => { answer({ data: { ...DASHBOARD.data, queues: { ...QUEUES, intake_review: 5 } } }) })
    await waitFor(() => expect(result.current.casesForYou).toBe(16))
    expect(result.current.refreshing).toBe(false)
  })

  it('names the sources with nothing to show yet on the first read', async () => {
    mocks.user.current = roleUser('admin')
    mocks.fetchRplDashboard.mockReturnValueOnce(new Promise(() => {}))
    const { result } = renderHook(() => useWorkCounts({ includeTodayOnly: true }), { wrapper })
    await waitFor(() => expect(result.current.attentionTotal).toBe(3))
    expect(result.current.pendingSources).toEqual(['dashboard'])
    expect(result.current.failed).toEqual([])
  })

  it('never shows one user the counts cached for another', async () => {
    mocks.user.current = roleUser('admin')
    const first = renderHook(() => useWorkCounts(), { wrapper })
    await waitFor(() => expect(first.result.current.casesForYou).toBe(15))
    first.unmount()
    mocks.user.current = roleUser('assessor')
    mocks.fetchRplDashboard.mockResolvedValue({ data: { ...DASHBOARD.data, queues: { ...QUEUES, intake_review: 0 } } })
    const second = renderHook(() => useWorkCounts(), { wrapper })
    // Within the 30 seconds: still a new read, and never the admin's queues in between.
    expect(second.result.current.queues).toBeNull()
    await waitFor(() => expect(mocks.fetchRplDashboard).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(second.result.current.queues?.intake_review).toBe(0))
  })

  it('polls the counts on focus but never the heavy attention or charge lists', async () => {
    mocks.user.current = roleUser('admin')
    const { result } = renderHook(() => useWorkCounts({ includeTodayOnly: true }), { wrapper })
    await waitFor(() => expect(result.current.attentionTotal).toBe(3))
    const now = Date.now()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 61_000)
    try {
      act(() => { window.dispatchEvent(new Event('focus')) })
      await waitFor(() => expect(mocks.fetchRplDashboard).toHaveBeenCalledTimes(2))
      expect(mocks.fetchAcademicApplications).toHaveBeenCalledTimes(2)
      expect(mocks.fetchRplAfterQuizAttention).toHaveBeenCalledTimes(1)
      // Refresh still reads everything.
      await act(async () => { await result.current.refresh() })
      expect(mocks.fetchRplAfterQuizAttention).toHaveBeenCalledTimes(2)
    } finally {
      clock.mockRestore()
    }
  })

  it('reads every source in use again after a case action', async () => {
    mocks.user.current = roleUser('admin')
    const { result } = renderHook(() => useWorkCounts(), { wrapper })
    await waitFor(() => expect(result.current.casesForYou).toBe(15))
    refreshWorkCounts()
    refreshWorkCounts()
    await waitFor(() => expect(mocks.fetchRplDashboard).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(mocks.fetchRplDashboard).toHaveBeenCalledTimes(2)
  })
})
