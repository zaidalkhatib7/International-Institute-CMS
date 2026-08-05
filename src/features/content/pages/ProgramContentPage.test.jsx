import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProgramContentPage from './ProgramContentPage'

/*
 * Activities had UPDATE and nothing else. Add and delete are new, so what is
 * worth testing is that the add button is reachable when a lesson has NO
 * activities — the moment it is most needed, and the easiest to render only
 * inside the list it is meant to populate — and that the server's refusal to
 * delete a submitted-to activity reaches the screen intact.
 */

const mocks = vi.hoisted(() => ({
  fetchProgramContentTree: vi.fn(),
  createActivity: vi.fn(),
  deleteActivity: vi.fn(),
  updateActivity: vi.fn(),
  fetchAdminPrograms: vi.fn(),
}))

vi.mock('../services/contentService', () => ({
  fetchProgramContentTree: mocks.fetchProgramContentTree,
  createActivity: mocks.createActivity,
  deleteActivity: mocks.deleteActivity,
  updateActivity: mocks.updateActivity,
}))

vi.mock('../../programs/services/programsService', () => ({
  fetchAdminPrograms: mocks.fetchAdminPrograms,
}))

function tree(activities = []) {
  return {
    data: {
      program_id: 240,
      official_code: 'CGP-LED-007',
      content_status: 'draft',
      totals: { units: 1, lessons: 1, activities: activities.length, questions: 0 },
      units: [{
        id: 12,
        title: { en: 'Unit one', ar: 'الوحدة الأولى' },
        sort_order: 1,
        lesson_count: 1,
        activity_count: activities.length,
        quiz_id: null,
        question_count: 0,
        lessons: [{
          id: 88,
          title: { en: 'Lesson one', ar: 'الدرس الأول' },
          type: 'text',
          sort_order: 1,
          body_length: 4000,
          video_url: null,
          activities,
        }],
      }],
    },
  }
}

/*
 * CoursePicker is a search field, not a select: typing filters, and Enter
 * commits when exactly one course matches. Driving it that way is how a person
 * uses it, and it is the only route to the tree.
 */
async function renderWithCourse(payload = tree()) {
  mocks.fetchAdminPrograms.mockResolvedValue({
    data: [{ id: 240, official_code: 'CGP-LED-007', title: { en: 'Leadership', ar: 'القيادة' } }],
  })
  mocks.fetchProgramContentTree.mockResolvedValue(payload)

  render(
    <MemoryRouter>
      <ProgramContentPage />
    </MemoryRouter>,
  )

  await waitFor(() => expect(mocks.fetchAdminPrograms).toHaveBeenCalled())

  const search = document.querySelector('input[type="search"], input:not([type="number"])')
  fireEvent.change(search, { target: { value: 'CGP-LED-007' } })
  fireEvent.keyDown(search, { key: 'Enter' })

  await waitFor(() => expect(mocks.fetchProgramContentTree).toHaveBeenCalledWith('240'))
}

/*
 * Units render EXPANDED — `open[unit.id] !== false` — deliberately, because
 * hiding content is what made the old screens read as empty. So there is
 * nothing to open, and clicking the header would collapse it instead.
 */
beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
  mocks.createActivity.mockResolvedValue({})
  mocks.deleteActivity.mockResolvedValue({})
})

describe('ProgramContentPage — activity add and delete', () => {
  it('offers add on a lesson that has no activities at all', async () => {
    await renderWithCourse(tree([]))

    const add = await screen.findByRole('button', { name: /Add activity|إضافة نشاط/ })
    fireEvent.click(add)

    await waitFor(() => expect(mocks.createActivity).toHaveBeenCalled())
    const payload = mocks.createActivity.mock.calls[0][0]

    expect(payload.lesson_id).toBe(88)
    // Defaults that satisfy the server's pass<=max rule without asking first.
    expect(payload.max_score).toBe(100)
    expect(payload.pass_score).toBe(60)
    expect(Object.values(payload.title)[0]).toBeTruthy()
  })

  it('reloads the tree after adding, so the new activity appears', async () => {
    await renderWithCourse(tree([]))

    fireEvent.click(await screen.findByRole('button', { name: /Add activity|إضافة نشاط/ }))

    // Once on mount-with-course, once after the write.
    await waitFor(() => expect(mocks.fetchProgramContentTree).toHaveBeenCalledTimes(2))
  })

  it('shows the server refusal verbatim when learners have submitted', async () => {
    const refusal = {
      response: {
        status: 422,
        data: {
          message: 'This activity has learner submissions and cannot be deleted.',
          errors: {
            activity: [
              'ACTIVITY_HAS_SUBMISSIONS: 3 learner submission(s) reference this activity. '
              + 'Deactivate it instead — deleting it would erase work that has already been marked.',
            ],
          },
        },
      },
    }
    mocks.deleteActivity.mockRejectedValue(refusal)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    await renderWithCourse(tree([
      { id: 4, title: { en: 'Task', ar: 'مهمة' }, instructions: {}, max_score: 100, pass_score: 60, is_active: true },
    ]))

    fireEvent.click(await screen.findByRole('button', { name: /Delete|حذف/ }))

    await waitFor(() => expect(mocks.deleteActivity).toHaveBeenCalledWith(4))
    // The count is the actionable part — "deactivate instead" means nothing
    // without knowing how much work is at stake.
    expect(await screen.findByText(/3 learner submission/)).toBeInTheDocument()
  })

  it('does not delete when the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    await renderWithCourse(tree([
      { id: 4, title: { en: 'Task', ar: 'مهمة' }, instructions: {}, max_score: 100, pass_score: 60, is_active: true },
    ]))

    fireEvent.click(await screen.findByRole('button', { name: /Delete|حذف/ }))
    expect(mocks.deleteActivity).not.toHaveBeenCalled()
  })
})
