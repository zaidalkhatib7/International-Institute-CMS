import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SupportOperationsPage from './SupportOperationsPage'
import {
  fetchAnnouncements,
  fetchFaqCategories,
  fetchFaqs,
  fetchSupportDashboard,
  fetchSupportTicket,
  fetchSupportTickets,
} from '../services/supportService'

vi.mock('../services/supportService', () => ({
  createAnnouncement: vi.fn(),
  createFaq: vi.fn(),
  createFaqCategory: vi.fn(),
  deleteAnnouncement: vi.fn(),
  deleteFaq: vi.fn(),
  deleteFaqCategory: vi.fn(),
  fetchAnnouncements: vi.fn(),
  fetchFaqCategories: vi.fn(),
  fetchFaqs: vi.fn(),
  fetchSupportDashboard: vi.fn(),
  fetchSupportTicket: vi.fn(),
  fetchSupportTickets: vi.fn(),
  replyToSupportTicket: vi.fn(),
  updateAnnouncement: vi.fn(),
  updateFaq: vi.fn(),
  updateFaqCategory: vi.fn(),
  updateSupportTicket: vi.fn(),
}))

const ticket = {
  id: 22,
  number: 'SUP-000022',
  subject: 'Evidence upload requires review',
  requester: { name: 'Omar Khaled', email: 'omar@example.test' },
  category: 'rpl',
  priority: 'high',
  status: 'open',
  assigned_to: null,
  sla_due_at: '2099-07-15T12:00:00Z',
}

describe('SupportOperationsPage', () => {
  beforeEach(() => {
    localStorage.setItem('icpc_admin_language', 'en')
    vi.clearAllMocks()
    fetchSupportDashboard.mockResolvedValue({
      data: { total: 1, overdue: 0, unassigned: 1, first_response_sla_breaches: 0 },
    })
    fetchSupportTickets.mockResolvedValue({
      data: { data: [ticket], current_page: 1, last_page: 1, per_page: 20, total: 1 },
    })
    fetchFaqCategories.mockResolvedValue({ data: [] })
    fetchFaqs.mockResolvedValue({ data: [] })
    fetchAnnouncements.mockResolvedValue({ data: [] })
    fetchSupportTicket.mockResolvedValue({
      data: {
        ...ticket,
        messages: [
          { id: 5, body: 'The evidence team is reviewing the submitted document.', sender: { name: 'Support Agent' }, is_internal: false, attachments: [] },
        ],
      },
    })
  })

  it('renders SLA-aware tickets and opens the conversation workspace', async () => {
    render(<SupportOperationsPage />)

    expect(await screen.findByRole('heading', { name: 'Support & communications' })).toBeInTheDocument()
    expect(await screen.findByText('SUP-000022')).toBeInTheDocument()
    expect(screen.getByText('Evidence upload requires review')).toBeInTheDocument()
    expect(screen.getByText('Omar Khaled')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))

    await waitFor(() => expect(fetchSupportTicket).toHaveBeenCalledWith(22))
    expect(await screen.findByRole('dialog', { name: 'Ticket workspace: SUP-000022' })).toBeInTheDocument()
    expect(screen.getByText('The evidence team is reviewing the submitted document.')).toBeInTheDocument()
  })
})
