import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DigitalLibraryPage from './DigitalLibraryPage'
import {
  fetchLibraryCategories,
  fetchLibraryResource,
  fetchLibraryResources,
} from '../services/libraryService'

vi.mock('../services/libraryService', () => ({
  addLibraryVersion: vi.fn(),
  archiveLibraryResource: vi.fn(),
  createLibraryCategory: vi.fn(),
  createLibraryResource: vi.fn(),
  deleteLibraryCategory: vi.fn(),
  fetchLibraryCategories: vi.fn(),
  fetchLibraryResource: vi.fn(),
  fetchLibraryResources: vi.fn(),
  publishLibraryVersion: vi.fn(),
  updateLibraryCategory: vi.fn(),
  updateLibraryResource: vi.fn(),
}))

const resource = {
  id: 15,
  slug: 'rpl-evidence-guide',
  type: 'guide',
  title: { en: 'RPL Evidence Verification Guide' },
  category: { name: { en: 'RPL standards' } },
  access_level: 'restricted',
  current_version_number: 2,
  status: 'published',
}

describe('DigitalLibraryPage', () => {
  beforeEach(() => {
    localStorage.setItem('icpc_admin_language', 'en')
    vi.clearAllMocks()
    fetchLibraryResources.mockResolvedValue({
      data: { data: [resource], current_page: 1, last_page: 1, per_page: 20, total: 1 },
    })
    fetchLibraryCategories.mockResolvedValue({
      data: [{ id: 3, slug: 'rpl-standards', name: { en: 'RPL standards' }, is_active: true }],
    })
    fetchLibraryResource.mockResolvedValue({
      data: {
        ...resource,
        versions: [
          { id: 92, version_number: 2, media: { original_name: 'rpl-evidence-guide-v2.pdf' } },
        ],
      },
    })
  })

  it('renders controlled resources and opens exact version history', async () => {
    render(<DigitalLibraryPage />)

    expect(await screen.findByRole('heading', { name: 'Digital library' })).toBeInTheDocument()
    expect(await screen.findByText('RPL Evidence Verification Guide')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Restricted' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Manage versions' }))

    await waitFor(() => expect(fetchLibraryResource).toHaveBeenCalledWith(15))
    expect(await screen.findByRole('dialog', { name: 'Manage versions: RPL Evidence Verification Guide' })).toBeInTheDocument()
    expect(screen.getByText('rpl-evidence-guide-v2.pdf')).toBeInTheDocument()
    expect(screen.getByText('Published version')).toBeInTheDocument()
  })
})
