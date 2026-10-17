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
 *
 * And activities carry no marks (owner, 17 Oct 2026): they are optional
 * practice for the client's own development. So there is no score field to
 * fill, nothing about scores is sent on create or save, each activity says it
 * is optional, and a course or unit without activities is not flagged.
 *
 * Since clients now see an activity's lesson list, its is_active switch is on
 * the editor: shown, saved, a hidden one says so, and a new one is born hidden.
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

const LANGUAGE_KEY = 'icpc_admin_language'
const SCORE_KEY = /max_score|pass_score|maxScore|passScore/
const OPTIONAL = {
  ar: 'اختياري — بدون علامات، للتطوير الذاتي للعميل',
  en: "Optional - no marks, for the client's own development",
}

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

const TASK = { id: 4, title: { en: 'Task', ar: 'مهمة' }, instructions: {}, is_active: true }

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

/** Every badge (Badge renders a rounded-full span) whose text matches, trimmed. */
function badgesMatching(pattern) {
  return [...document.querySelectorAll('span.rounded-full')].filter((el) => pattern.test(el.textContent.trim()))
}

/*
 * Units render EXPANDED — `open[unit.id] !== false` — deliberately, because
 * hiding content is what made the old screens read as empty. So there is
 * nothing to open, and clicking the header would collapse it instead.
 */
beforeEach(() => {
  vi.restoreAllMocks()
  Object.values(mocks).forEach((m) => m.mockReset())
  mocks.createActivity.mockResolvedValue({})
  mocks.deleteActivity.mockResolvedValue({})
  mocks.updateActivity.mockResolvedValue({})
  localStorage.removeItem(LANGUAGE_KEY)
})

describe('ProgramContentPage — activity add and delete', () => {
  it('offers add on a lesson that has no activities at all, and sends no marks', async () => {
    await renderWithCourse(tree([]))

    const add = await screen.findByRole('button', { name: /Add activity|إضافة نشاط/ })
    fireEvent.click(add)

    await waitFor(() => expect(mocks.createActivity).toHaveBeenCalled())
    const payload = mocks.createActivity.mock.calls[0][0]

    expect(payload.lesson_id).toBe(88)
    expect(Object.values(payload.title)[0]).toBeTruthy()
    // Activities carry no marks: the lesson, a title, and born hidden — nothing else.
    expect(Object.keys(payload).sort()).toEqual(['is_active', 'lesson_id', 'title'])
    expect(payload.is_active).toBe(false)
    expect(JSON.stringify(payload)).not.toMatch(SCORE_KEY)
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
              + 'Deactivate it instead — deleting it would erase work learners have already submitted.',
            ],
          },
        },
      },
    }
    mocks.deleteActivity.mockRejectedValue(refusal)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    await renderWithCourse(tree([TASK]))

    fireEvent.click(await screen.findByRole('button', { name: /Delete|حذف/ }))

    await waitFor(() => expect(mocks.deleteActivity).toHaveBeenCalledWith(4))
    // The count is the actionable part — the refusal means nothing without
    // knowing how much submitted work is at stake.
    expect(await screen.findByText(/3 learner submission/)).toBeInTheDocument()
  })

  it('does not delete when the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    await renderWithCourse(tree([TASK]))

    fireEvent.click(await screen.findByRole('button', { name: /Delete|حذف/ }))
    expect(mocks.deleteActivity).not.toHaveBeenCalled()
  })

  it('asks about submitted work, never about marks, before deleting (English)', async () => {
    localStorage.setItem(LANGUAGE_KEY, 'en')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    await renderWithCourse(tree([TASK]))

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    const question = confirm.mock.calls[0][0]

    expect(question).toMatch(/submitted work/)
    expect(question).not.toMatch(/mark|grade|score/i)
  })

  it('asks about submitted work, never about marks, before deleting (Arabic)', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    await renderWithCourse(tree([TASK]))

    fireEvent.click(await screen.findByRole('button', { name: /حذف/ }))
    const question = confirm.mock.calls[0][0]

    expect(question).toMatch(/سلّموا عملًا/)
    expect(question).not.toMatch(/علام|درج|صحّح|تصحيح/)
  })
})

describe('ProgramContentPage — activities carry no marks', () => {
  it('has no score fields on an activity', async () => {
    localStorage.setItem(LANGUAGE_KEY, 'en')

    await renderWithCourse(tree([TASK]))

    await screen.findByRole('button', { name: 'Save activity' })
    expect(document.querySelectorAll('input[type="number"]')).toHaveLength(0)
    expect(screen.queryByText(/Max score|Pass score/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/score/i)).not.toBeInTheDocument()
  })

  it('has no score fields on an activity in Arabic either', async () => {
    await renderWithCourse(tree([TASK]))

    await screen.findByRole('button', { name: /حفظ النشاط/ })
    expect(document.querySelectorAll('input[type="number"]')).toHaveLength(0)
    expect(screen.queryByText(/الدرجة القصوى|درجة النجاح/)).not.toBeInTheDocument()
  })

  it('neither shows nor sends back the marks an older server still returns', async () => {
    localStorage.setItem(LANGUAGE_KEY, 'en')

    await renderWithCourse(tree([{ ...TASK, max_score: 100, pass_score: 60 }]))

    fireEvent.click(await screen.findByRole('button', { name: 'Save activity' }))

    await waitFor(() => expect(mocks.updateActivity).toHaveBeenCalled())
    const [id, payload] = mocks.updateActivity.mock.calls[0]

    expect(id).toBe(4)
    expect(Object.keys(payload).sort()).toEqual(['instructions', 'is_active', 'title'])
    expect(JSON.stringify(payload)).not.toMatch(SCORE_KEY)
    expect(screen.queryByDisplayValue('100')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('60')).not.toBeInTheDocument()
  })

  it('marks each activity optional, with no marks, in Arabic', async () => {
    await renderWithCourse(tree([TASK, { ...TASK, id: 5, title: { ar: 'مهمة ثانية' } }]))

    const notes = await screen.findAllByText(OPTIONAL.ar)

    expect(notes).toHaveLength(2)
  })

  it('marks each activity optional, with no marks, in English', async () => {
    localStorage.setItem(LANGUAGE_KEY, 'en')

    await renderWithCourse(tree([TASK]))

    expect(await screen.findByText(OPTIONAL.en)).toBeInTheDocument()
    expect(screen.queryByText(OPTIONAL.ar)).not.toBeInTheDocument()
  })

  it('does not flag a course or unit with no activities — they are optional', async () => {
    await renderWithCourse(tree([]))

    await screen.findByRole('button', { name: /إضافة نشاط/ })
    const activityBadges = badgesMatching(/^(Activities|الأنشطة): 0$/)

    // The course total and the unit count.
    expect(activityBadges).toHaveLength(2)
    activityBadges.forEach((badge) => {
      expect(badge.className).toContain('--color-surface-muted')
      expect(badge.className).not.toContain('#FFF4DF')
    })

    // The same tree's empty question bank still warns, so the check above can
    // tell a warning from a neutral badge.
    const questionBadges = badgesMatching(/^(Questions|الأسئلة): 0$/)
    expect(questionBadges).toHaveLength(2)
    questionBadges.forEach((badge) => expect(badge.className).toContain('#FFF4DF'))
  })
})

describe('ProgramContentPage — activity save sends Arabic and English only', () => {
  it('does not send back a Dutch key the stored activity still carries', async () => {
    await renderWithCourse(tree([
      {
        id: 4,
        title: { nl: 'Opdracht 1', en: 'Task one' },
        instructions: { nl: 'Schrijf een verslag.', ar: 'اكتب تقريرًا.' },
        is_active: true,
      },
    ]))

    fireEvent.click(await screen.findByRole('button', { name: /Save activity|حفظ النشاط/ }))

    await waitFor(() => expect(mocks.updateActivity).toHaveBeenCalled())
    const [id, payload] = mocks.updateActivity.mock.calls[0]

    expect(id).toBe(4)
    expect(JSON.stringify(payload)).not.toContain('"nl"')
    expect(payload.title).toEqual({ en: 'Task one', ar: '' })
    expect(payload.instructions).toEqual({ en: '', ar: 'اكتب تقريرًا.' })
  })
})

/*
 * Who sees an activity is its is_active switch: clients see only the active
 * ones in their lesson, and switching one off is the only way to withdraw an
 * activity clients have already submitted work to (delete is refused then).
 */
describe('ProgramContentPage — whether clients see an activity', () => {
  const HIDDEN = { ar: 'مخفي عن العملاء', en: 'Hidden from clients' }
  const SHOWN = { ar: 'ظاهر للعملاء (مُفعَّل)', en: 'Shown to clients (active)' }

  it('shows a shown activity as ticked, with no hidden badge, and saves it switched off', async () => {
    localStorage.setItem(LANGUAGE_KEY, 'en')

    await renderWithCourse(tree([TASK]))

    const shown = await screen.findByRole('checkbox', { name: SHOWN.en })
    expect(shown).toBeChecked()
    expect(screen.queryByText(HIDDEN.en)).not.toBeInTheDocument()

    fireEvent.click(shown)
    expect(shown).not.toBeChecked()
    // Only what was saved counts: the badge waits for the save and the reload.
    expect(screen.queryByText(HIDDEN.en)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save activity' }))

    await waitFor(() => expect(mocks.updateActivity).toHaveBeenCalled())
    const [id, payload] = mocks.updateActivity.mock.calls[0]

    expect(id).toBe(4)
    expect(payload.is_active).toBe(false)
    expect(payload.title).toEqual({ en: 'Task', ar: 'مهمة' })
  })

  it('says a hidden activity is hidden, and saves it switched back on (Arabic)', async () => {
    await renderWithCourse(tree([{ ...TASK, is_active: false }]))

    expect(await screen.findByText(HIDDEN.ar)).toBeInTheDocument()
    const shown = screen.getByRole('checkbox', { name: SHOWN.ar })
    expect(shown).not.toBeChecked()

    fireEvent.click(shown)
    fireEvent.click(screen.getByRole('button', { name: /حفظ النشاط/ }))

    await waitFor(() => expect(mocks.updateActivity).toHaveBeenCalled())
    expect(mocks.updateActivity.mock.calls[0][1].is_active).toBe(true)
  })

  it('saves an untouched activity with the switch it already had', async () => {
    localStorage.setItem(LANGUAGE_KEY, 'en')

    await renderWithCourse(tree([{ ...TASK, is_active: false }, { ...TASK, id: 5, is_active: true }]))

    const saves = await screen.findAllByRole('button', { name: 'Save activity' })
    expect(screen.getAllByText(HIDDEN.en)).toHaveLength(1)
    saves.forEach((button) => fireEvent.click(button))

    await waitFor(() => expect(mocks.updateActivity).toHaveBeenCalledTimes(2))
    const sent = Object.fromEntries(mocks.updateActivity.mock.calls.map(([id, payload]) => [id, payload.is_active]))

    expect(sent).toEqual({ 4: false, 5: true })
  })

  it('treats an activity whose payload does not say as shown, the server default, so a save never hides it by accident', async () => {
    localStorage.setItem(LANGUAGE_KEY, 'en')
    const unsaid = { ...TASK }
    delete unsaid.is_active

    await renderWithCourse(tree([unsaid]))

    expect(await screen.findByRole('checkbox', { name: SHOWN.en })).toBeChecked()
    expect(screen.queryByText(HIDDEN.en)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save activity' }))

    await waitFor(() => expect(mocks.updateActivity).toHaveBeenCalled())
    expect(mocks.updateActivity.mock.calls[0][1].is_active).toBe(true)
  })

  it('tells staff a new activity stays hidden until it is switched on', async () => {
    localStorage.setItem(LANGUAGE_KEY, 'en')

    await renderWithCourse(tree([TASK]))

    expect(await screen.findByText(/A new activity stays hidden from clients until you tick "Shown to clients"/)).toBeInTheDocument()
  })

  it('tells staff a new activity stays hidden until it is switched on (Arabic)', async () => {
    await renderWithCourse(tree([TASK]))

    expect(await screen.findByText(/يبقى النشاط الجديد مخفيًا عن العملاء حتى تفعّل «ظاهر للعملاء»/)).toBeInTheDocument()
  })
})

/*
 * A guard over the content feature's own source: the activity screens and their
 * service name no score field at all, so a mark cannot come back by a stray
 * default or a copied payload. (Rubric criteria elsewhere in the platform do
 * carry scores; they are not activities and are not read here.)
 */
const CONTENT_SOURCES = import.meta.glob(
  ['../**/*.js', '../**/*.jsx', '!../**/*.test.js', '!../**/*.test.jsx'],
  { query: '?raw', import: 'default', eager: true },
)

describe('content feature source — no activity marks', () => {
  it('reads the activity screen and its service', () => {
    const paths = Object.keys(CONTENT_SOURCES)

    expect(paths.some((path) => path.endsWith('/ProgramContentPage.jsx'))).toBe(true)
    expect(paths.some((path) => path.endsWith('/services/contentService.js'))).toBe(true)
  })

  it('names no score field anywhere in the content feature', () => {
    const offenders = Object.entries(CONTENT_SOURCES)
      .filter(([, source]) => SCORE_KEY.test(source))
      .map(([path]) => path)

    expect(offenders).toEqual([])
  })
})
