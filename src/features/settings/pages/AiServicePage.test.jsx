import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AiServicePage from './AiServicePage'
import { degradedStatus, downStatus, staleStatus } from '../../../test/aiFixtures'

/*
 * THE AI SERVICE PAGE (AI-RESILIENCE-SPEC §6.5, §9.4): the overall state and the
 * last check, the fallback policy with the owner's decision, each chain with the
 * state of each step and the serving model, the queued work waiting, a seven-day
 * bar per model and the incidents; Arabic and English.
 */

const mocks = vi.hoisted(() => ({ fetchAiServiceStatus: vi.fn(), fetchAiServiceHistory: vi.fn(), language: { current: 'en' } }))
vi.mock('../../shared/ai/aiServiceApi', () => ({ fetchAiServiceStatus: mocks.fetchAiServiceStatus, fetchAiServiceHistory: mocks.fetchAiServiceHistory }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({ ...(await importOriginal()), getAdminLanguage: () => mocks.language.current }))

const hoursAgo = (hours) => new Date(Date.now() - hours * 3600000).toISOString()

function history() {
  return {
    days: 7,
    models: [
      { model: 'gemini-3.6-flash', hours: [{ hour: hoursAgo(1), probes_ok: 2, probes_total: 6, traffic_ok: 0, traffic_total: 4 }, { hour: hoursAgo(30), probes_ok: 6, probes_total: 6, traffic_ok: 10, traffic_total: 10 }] },
      { model: 'gemini-3.1-pro-preview', hours: [{ hour: hoursAgo(1), probes_ok: 6, probes_total: 6, traffic_ok: 4, traffic_total: 4 }] },
      { model: 'gemini-3.8-flash', watched: true, hours: [{ hour: hoursAgo(2), probes_ok: 0, probes_total: 6, traffic_ok: 0, traffic_total: 0 }] },
    ],
    incidents: [{ id: 7, family: 'case_analysis', kind: 'degraded', status: 'resolved', opened_at: hoursAgo(50), resolved_at: hoursAgo(48), summary: 'Step 1 answered 503 for two hours.' }],
  }
}

function renderPage() {
  return render(<MemoryRouter><AiServicePage /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.language.current = 'en'
  mocks.fetchAiServiceStatus.mockResolvedValue({ data: degradedStatus() })
  mocks.fetchAiServiceHistory.mockResolvedValue({ data: history() })
})

describe('the AI service page', () => {
  it('shows the overall state, the policy and each chain with its serving model', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'AI service', level: 1 })).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('[data-overall="degraded"]')).toHaveTextContent('Running on a backup model'))
    expect(screen.getByText(/Availability comes first: .+every result shows the model that made it \(owner decision of 23 Oct 2026\)\./)).toBeInTheDocument()
    expect(screen.getByText(/^Last checked: /)).toBeInTheDocument()
    expect(mocks.fetchAiServiceHistory).toHaveBeenCalledWith(7)

    const caseCard = screen.getByRole('region', { name: 'Case file analysis' })
    expect(caseCard).toHaveTextContent('Serving now: gemini-3.1-pro-preview')
    const rows = within(caseCard).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.getAttribute('data-step'))).toEqual(['1', '2', '3'])
    expect(rows[0]).toHaveTextContent('gemini-3.6-flash')
    expect(rows[0]).toHaveTextContent(/Paused\s*until /)
    expect(rows[0]).toHaveTextContent(/Busy · status 503/)
    expect(rows[1]).toHaveTextContent('Healthy')
    expect(rows[1]).toHaveTextContent('2.1 s')
    for (const name of ['Employer checks by web search', 'Package and content authoring', 'Instant requests']) expect(screen.getByRole('region', { name })).toBeInTheDocument()
  })

  it('shows the banner, the queued work waiting and the incidents', async () => {
    renderPage()
    expect(await screen.findByRole('status', { name: 'AI service status' })).toHaveAttribute('data-ai-banner', 'degraded')
    expect(document.querySelector('[data-waiting="rpl_document_screening"]')).toHaveTextContent('Document screens3')
    expect(document.querySelector('[data-waiting="entry_quiz_draft"]')).toHaveTextContent('Entry quiz drafts1')
    expect(document.querySelector('[data-waiting="course_plan"]')).toBeNull()
    await waitFor(() => expect(document.querySelector('[data-incident="7"]')).toHaveTextContent('Case file analysis'))
    expect(document.querySelector('[data-incident="7"]')).toHaveTextContent('Backup model')
    expect(document.querySelector('[data-incident="7"]')).toHaveTextContent('Resolved')
  })

  it('draws a seven-day bar per model, by hour, with its share of calls that succeeded', async () => {
    renderPage()
    const flash = await waitFor(() => {
      const row = document.querySelector('[data-history-model="gemini-3.6-flash"]')
      expect(row).not.toBeNull()
      return row
    })
    expect(flash.querySelectorAll('span[title]')).toHaveLength(7 * 24)
    expect(flash).toHaveTextContent('69.2% of calls succeeded')
    expect(flash.querySelectorAll('.bg-red-500, .bg-amber-400').length).toBe(1)
    expect(flash.querySelectorAll('.bg-green-500').length).toBe(1)
    const watched = document.querySelector('[data-history-model="gemini-3.8-flash"]')
    expect(watched).toHaveTextContent('Watched model, in no chain')
    expect(watched.querySelectorAll('.bg-red-500').length).toBe(1)
  })

  it('lists an open incident and says the work is down', async () => {
    mocks.fetchAiServiceStatus.mockResolvedValue({ data: downStatus() })
    renderPage()
    await waitFor(() => expect(document.querySelector('[data-incident="12"]')).toHaveTextContent('Open'))
    expect(screen.getByRole('region', { name: 'Package and content authoring' })).toHaveTextContent('No model in this chain is answering right now.')
  })

  it('says the monitor has stopped when no check has arrived', async () => {
    mocks.fetchAiServiceStatus.mockResolvedValue({ data: staleStatus() })
    renderPage()
    expect(await screen.findByText(/Monitoring has stopped/)).toBeInTheDocument()
    expect(document.querySelector('[data-overall="unknown"]')).toHaveTextContent('Unknown')
  })

  it('says when fallback is switched off on the server', async () => {
    mocks.fetchAiServiceStatus.mockResolvedValue({ data: { ...degradedStatus(), fallback_policy: 'disabled' } })
    renderPage()
    expect(await screen.findByText('Fallback models are switched off on the server: every kind of AI work uses its first model only.')).toBeInTheDocument()
  })

  it('shows a failed read with a way to try again', async () => {
    mocks.fetchAiServiceStatus.mockRejectedValueOnce(Object.assign(new Error('x'), { response: { status: 500 } }))
    mocks.fetchAiServiceHistory.mockRejectedValueOnce(new Error('x'))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('The AI service status could not be loaded.')
    expect(screen.getByText('The seven-day history could not be loaded.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Case file analysis' })).toBeInTheDocument())
  })

  it('reads in Arabic, right to left, without RPL, API or CMS', async () => {
    mocks.language.current = 'ar'
    renderPage()
    expect(await screen.findByRole('heading', { name: 'خدمة الذكاء الاصطناعي', level: 1 })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('region', { name: 'تحليل ملفات الطلبات' })).toHaveTextContent('النموذج العامل الآن: gemini-3.1-pro-preview'))
    expect(screen.getByText(/قرار المالك في 23 أكتوبر 2026/)).toBeInTheDocument()
    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()
    expect(document.body.textContent).not.toMatch(/RPL|\bAPI\b|CMS|undefined/)
  })
})
