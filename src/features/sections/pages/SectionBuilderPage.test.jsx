import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAdminPrograms } from '../../programs/services/programsService'
import { fetchAdminSectionById, updateAdminSection } from '../services/sectionsService'
import SectionBuilderPage from './SectionBuilderPage'

vi.mock('../../programs/services/programsService', () => ({
  fetchAdminPrograms: vi.fn(),
}))

vi.mock('../services/sectionsService', () => ({
  createAdminSection: vi.fn(),
  fetchAdminSectionById: vi.fn(),
  updateAdminSection: vi.fn(),
}))

/*
 * A unit an AI run authored in Arabic has an Arabic title and description and no
 * English. Either platform language is enough to save it; the English fields
 * stay empty rather than being filled with the Arabic.
 */
const arabicSection = {
  id: 12,
  program_id: 240,
  sort_order: 1,
  title: { ar: 'الوحدة الأولى' },
  description: { ar: 'وصف الوحدة' },
}

async function openSection(section) {
  fetchAdminSectionById.mockResolvedValue({ data: section })
  render(
    <MemoryRouter initialEntries={['/sections/edit?id=12']}>
      <SectionBuilderPage />
    </MemoryRouter>
  )
  await waitFor(() => expect(fetchAdminSectionById).toHaveBeenCalledWith('12'))
  await waitFor(() => expect(screen.queryByText(/Loading section|جاري تحميل القسم/)).not.toBeInTheDocument())
}

describe('SectionBuilderPage — either platform language is a title and a description', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchAdminPrograms.mockResolvedValue({ data: [{ id: 240, title: { ar: 'القيادة' } }] })
    updateAdminSection.mockResolvedValue({ data: {} })
  })

  it.each(['ar', 'en'])('saves an Arabic-only unit from the %s interface and leaves English empty', async (language) => {
    localStorage.setItem('icpc_admin_language', language)
    await openSection(arabicSection)

    fireEvent.click(screen.getByRole('button', { name: /^(Save Section|حفظ القسم)$/ }))

    await waitFor(() => expect(updateAdminSection).toHaveBeenCalledTimes(1))
    const [id, payload] = updateAdminSection.mock.calls[0]
    expect(id).toBe('12')
    expect(payload.title).toEqual({ en: '', ar: 'الوحدة الأولى' })
    expect(payload.description).toEqual({ en: '', ar: 'وصف الوحدة' })
    expect(JSON.stringify(payload)).not.toContain('"nl"')
  })

  it('refuses a unit whose description is in neither language', async () => {
    localStorage.setItem('icpc_admin_language', 'en')
    await openSection({ ...arabicSection, description: { nl: 'Alleen Nederlands' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save Section' }))

    expect(await screen.findByText('Section description is required in English or Arabic.')).toBeInTheDocument()
    expect(updateAdminSection).not.toHaveBeenCalled()
  })
})
