import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiServiceBanner from './AiServiceBanner'
import AiChainLine from './AiChainLine'
import { resetAiServiceStatus } from './useAiServiceStatus'
import { degradedStatus, downStatus, okStatus, staleStatus } from '../../../test/aiFixtures'

/*
 * THE AI SERVICE BANNER (AI-RESILIENCE-SPEC §6.5, §9.4): hidden on ok; amber with
 * the serving model on degraded; red with the time on down; grey when the
 * monitor is stale; Arabic and English; right to left in Arabic. It reads the
 * shared status only while someone is signed in.
 */

const mocks = vi.hoisted(() => ({ fetchAiServiceStatus: vi.fn() }))
vi.mock('./aiServiceApi', () => ({ fetchAiServiceStatus: mocks.fetchAiServiceStatus, fetchAiServiceHistory: vi.fn() }))

function renderBanner(props) {
  return render(<MemoryRouter><AiServiceBanner {...props} /></MemoryRouter>)
}

beforeEach(() => {
  resetAiServiceStatus()
  mocks.fetchAiServiceStatus.mockReset()
  localStorage.removeItem('icpc_admin_token')
})

afterEach(() => localStorage.removeItem('icpc_admin_token'))

describe('the banner, given a status', () => {
  it('renders nothing while every family is ok', () => {
    const { container } = renderBanner({ status: okStatus(), language: 'en' })
    expect(container).toBeEmptyDOMElement()
  })

  it('is amber on a backup model, names the serving model and links the AI service page', () => {
    renderBanner({ status: degradedStatus(), language: 'en' })
    const banner = screen.getByRole('status', { name: 'AI service status' })
    expect(banner).toHaveAttribute('data-ai-banner', 'degraded')
    expect(banner).toHaveTextContent('The AI service is running on a backup model for: Case file analysis. Serving now: gemini-3.1-pro-preview.')
    expect(screen.getByRole('link', { name: 'AI service page' })).toHaveAttribute('href', '/settings/ai-service')
    expect(banner.className).toMatch(/amber/)
  })

  it('is red when a family is down, and says each queued job retries for up to six hours from when it was queued', () => {
    renderBanner({ status: downStatus(), language: 'en' })
    const banner = screen.getByRole('status')
    expect(banner).toHaveAttribute('data-ai-banner', 'down')
    expect(banner).toHaveTextContent('unavailable for: Package and content authoring. Each queued AI job retries automatically for up to 6 hours from when it was queued; you can continue by hand.')
    expect(banner.className).toMatch(/red/)
  })

  it('is grey when the monitor has not checked', () => {
    renderBanner({ status: staleStatus(), language: 'en' })
    expect(screen.getByRole('status')).toHaveAttribute('data-ai-banner', 'stale')
    expect(screen.getByRole('status')).toHaveTextContent(/The AI service has not been checked for 4[45] minutes\./)
  })

  it('reads in Arabic, right to left, without RPL, API or CMS', () => {
    renderBanner({ status: degradedStatus(), language: 'ar' })
    const banner = screen.getByRole('status', { name: 'حالة خدمة الذكاء الاصطناعي' })
    expect(banner).toHaveAttribute('dir', 'rtl')
    expect(banner).toHaveTextContent('خدمة الذكاء الاصطناعي تعمل الآن بنموذج احتياطي في: تحليل ملفات الطلبات. النموذج العامل: gemini-3.1-pro-preview.')
    expect(screen.getByRole('link', { name: 'صفحة خدمة الذكاء الاصطناعي' })).toBeInTheDocument()
    expect(banner.textContent).not.toMatch(/RPL|\bAPI\b|CMS/)
  })

  it('looks only at the families a screen uses', () => {
    const { container } = renderBanner({ status: degradedStatus(), families: ['authoring'], language: 'en' })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a plain link outside the router', () => {
    render(<AiServiceBanner status={degradedStatus()} language="en" />)
    expect(screen.getByRole('link', { name: 'AI service page' })).toHaveAttribute('href', '/settings/ai-service')
  })
})

describe('the banner, reading the shared status', () => {
  it('reads nothing without a session', async () => {
    const { container } = renderBanner({ language: 'en' })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(mocks.fetchAiServiceStatus).not.toHaveBeenCalled()
    expect(container).toBeEmptyDOMElement()
  })

  it('reads the status once for every banner on the page', async () => {
    localStorage.setItem('icpc_admin_token', 'token')
    mocks.fetchAiServiceStatus.mockResolvedValue({ data: degradedStatus() })
    render(<MemoryRouter><AiServiceBanner language="en" /><AiServiceBanner families={['case_analysis']} language="en" /></MemoryRouter>)
    await waitFor(() => expect(screen.getAllByRole('status')).toHaveLength(2))
    expect(mocks.fetchAiServiceStatus).toHaveBeenCalledTimes(1)
  })

  it('shows nothing when the read fails, never an error', async () => {
    localStorage.setItem('icpc_admin_token', 'token')
    mocks.fetchAiServiceStatus.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 500 } }))
    const { container } = renderBanner({ language: 'en' })
    await waitFor(() => expect(mocks.fetchAiServiceStatus).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})

describe('the model, read-only on a settings screen (D16)', () => {
  it('shows the chain in order and links the AI service page', () => {
    render(<MemoryRouter><AiChainLine family="case_analysis" status={okStatus()} language="en" /></MemoryRouter>)
    expect(screen.getByText(/set by the server's AI model chain, in this order: gemini-3\.6-flash → gemini-3\.1-pro-preview → gemini-3\.5-flash-lite\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'AI service page' })).toHaveAttribute('href', '/settings/ai-service')
  })

  it('says the chain sets it when the status is not known, in Arabic too', () => {
    render(<MemoryRouter><AiChainLine family="case_analysis" status={null} language="ar" /></MemoryRouter>)
    expect(screen.getByText('يُحدَّد النموذج بسلسلة نماذج الذكاء الاصطناعي على الخادم.')).toBeInTheDocument()
  })
})
