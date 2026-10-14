import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAdminLessonById, fetchAdminSections, updateAdminLesson } from '../services/lessonsService'
import LessonBuilderPage from './LessonBuilderPage'

vi.mock('../services/lessonsService', () => ({
  createAdminLesson: vi.fn(),
  fetchAdminLessonById: vi.fn(),
  fetchAdminSections: vi.fn(),
  updateAdminLesson: vi.fn(),
}))

/*
 * An AI package authored in Arabic stores its lessons as { ar } only. Arabic and
 * English are the platform's two languages (Dutch was removed on 13 Oct 2026),
 * so such a lesson must save from its editor without an English translation, and
 * without its Arabic being copied into the English field, which is how it used
 * to get through.
 */
const arabicLesson = {
  id: 9,
  course_section_id: 3,
  type: 'text',
  sort_order: 1,
  title: { ar: 'درس مولد' },
  text_content: { ar: 'نص الدرس' },
}

async function openLesson(lesson) {
  fetchAdminLessonById.mockResolvedValue({ data: lesson })
  render(
    <MemoryRouter initialEntries={['/lessons/edit?id=9']}>
      <LessonBuilderPage />
    </MemoryRouter>
  )
  await waitFor(() => expect(fetchAdminLessonById).toHaveBeenCalledWith('9'))
  await waitFor(() => expect(screen.queryByText(/Loading lesson|جاري تحميل الدرس/)).not.toBeInTheDocument())
}

describe('LessonBuilderPage — either platform language is a title', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchAdminSections.mockResolvedValue({ data: [{ id: 3, title: { ar: 'وحدة' } }] })
    updateAdminLesson.mockResolvedValue({ data: {} })
  })

  it.each(['ar', 'en'])('saves an Arabic-only lesson from the %s interface and leaves English empty', async (language) => {
    localStorage.setItem('icpc_admin_language', language)
    await openLesson(arabicLesson)

    fireEvent.click(screen.getByRole('button', { name: /^(Save Lesson|حفظ الدرس)$/ }))

    await waitFor(() => expect(updateAdminLesson).toHaveBeenCalledTimes(1))
    const [id, payload] = updateAdminLesson.mock.calls[0]
    expect(id).toBe('9')
    expect(payload.title).toEqual({ en: '', ar: 'درس مولد' })
    expect(payload.text_content).toEqual({ en: '', ar: 'نص الدرس' })
    expect(JSON.stringify(payload)).not.toContain('"nl"')
  })

  it('refuses a lesson titled in neither language, and says either one will do', async () => {
    localStorage.setItem('icpc_admin_language', 'en')
    await openLesson({ ...arabicLesson, title: { nl: 'Alleen Nederlands' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save Lesson' }))

    expect(await screen.findByText('Lesson title is required in English or Arabic.')).toBeInTheDocument()
    expect(updateAdminLesson).not.toHaveBeenCalled()
  })
})
