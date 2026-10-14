import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplConfigurationPage, { COPY } from './RplConfigurationPage'
import { COURSE_PLAN_MINIMUMS_COPY } from '../domain/coursePlan'
import { PROFESSIONAL_LEVELS } from '../domain/rpl'

/*
 * THE PER-LEVEL COURSE MINIMUMS (owner flow of 12 Oct 2026, step 5; D13(b); P5).
 *
 * `rpl_course_plan_minimums` on GET/PUT /admin/rpl/settings: a JSON map of each
 * active professional level code to a whole number from 0 to 50, saved with the
 * page's existing save. Governed with no default (R15): the owner's 5 / 7 / 10
 * are a hint and never prefilled; a key the server does not hold is written only
 * once someone types, and then with every level. The written reason for
 * approving fewer is always required, so there is no switch for it.
 */

const mocks = vi.hoisted(() => ({
  fetchRplSettings: vi.fn(),
  updateRplSettings: vi.fn(),
  fetchRplConfiguration: vi.fn(),
  fetchRplReferenceData: vi.fn(),
  createRplConfiguration: vi.fn(),
  updateRplConfiguration: vi.fn(),
  deleteRplConfiguration: vi.fn(),
}))

const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/rplService', () => mocks)
vi.mock('../../users/services/usersService', () => ({ fetchUsers: vi.fn() }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

const MC = COURSE_PLAN_MINIMUMS_COPY.en
const longPrompt = 'Governed advisory instruction. '.repeat(20)

function levels(pathwayOffset) {
  return [
    { id: pathwayOffset + 3, code: 'expert', rank: 3, name: { en: 'Professional Expert', ar: 'خبير مهني' } },
    { id: pathwayOffset + 1, code: 'practitioner', rank: 1, name: { en: 'Professional Practitioner', ar: 'ممارس مهني' } },
    { id: pathwayOffset + 2, code: 'advanced_practitioner', rank: 2, name: { en: 'Advanced Professional Practitioner', ar: 'ممارس مهني متقدم' } },
  ]
}

// The two professional pathways repeat the same level codes; the form shows each code once, by rank.
const REFERENCE = {
  data: {
    pathways: [
      { id: 1, code: 'rpl_without_secondary', levels: levels(0) },
      { id: 2, code: 'rpl_with_secondary', levels: levels(10) },
    ],
  },
}

function storedSettings(overrides = {}) {
  return {
    data: {
      appeal_window_days: 15,
      require_verified_evidence_for_assessment: true,
      gemini_advisory_model: 'gemini-3.5-flash',
      gemini_advisory_prompt: longPrompt,
      rpl_advisory_include_evidence_documents: true,
      rpl_reapply_cooldown_days: 7,
      rpl_reapply_cooldown_scope: 'all_rejections',
      rpl_quiz_pass_mark_percent: 50,
      rpl_course_plan_minimums: { practitioner: 5, advanced_practitioner: 7, expert: 10 },
      ...overrides,
    },
  }
}

const label = (name) => `${name} (0 to 50)`

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  mocks.fetchRplConfiguration.mockResolvedValue({ data: [] })
  mocks.fetchRplReferenceData.mockResolvedValue(REFERENCE)
  mocks.updateRplSettings.mockResolvedValue({ data: {} })
  mocks.fetchRplSettings.mockResolvedValue(storedSettings())
})

async function openControls(copy = COPY.en, first = label('Professional Practitioner')) {
  render(<RplConfigurationPage />)
  fireEvent.click(await screen.findByRole('button', { name: copy.workflow }))
  return screen.findByLabelText(first)
}

const save = () => fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))
const saveButton = () => screen.getByRole('button', { name: COPY.en.saveSettings })

describe('the course minimums', () => {
  it('shows one whole-number input per level, labelled from the reference levels, in rank order', async () => {
    await openControls()

    const block = within(screen.getByRole('region', { name: MC.title }))
    const inputs = block.getAllByRole('spinbutton')
    expect(inputs).toHaveLength(3)
    expect(inputs.map((input) => input.labels[0].textContent)).toEqual([
      label('Professional Practitioner'),
      label('Advanced Professional Practitioner'),
      label('Professional Expert'),
    ])
    expect(inputs.map((input) => input.value)).toEqual(['5', '7', '10'])
    for (const input of inputs) {
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '50')
      expect(input).toHaveAttribute('step', '1')
    }
    expect(block.getByText(MC.hint)).toBeInTheDocument()
    expect(block.getByText(MC.ownerValues)).toBeInTheDocument()
    // D13(b): the reason is a fixed rule, never a switch.
    expect(block.getByText(MC.reasonRule)).toBeInTheDocument()
    expect(block.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('saves the held map with the existing save, every level as an integer, in rank order', async () => {
    const practitioner = await openControls()

    fireEvent.change(practitioner, { target: { value: '6' } })
    save()

    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    const body = mocks.updateRplSettings.mock.calls[0][0]
    expect(body.rpl_course_plan_minimums).toEqual({ practitioner: 6, advanced_practitioner: 7, expert: 10 })
    expect(Object.keys(body.rpl_course_plan_minimums)).toEqual(['practitioner', 'advanced_practitioner', 'expert'])
    // The other controls are untouched.
    expect(body).toMatchObject({ appeal_window_days: 15, rpl_quiz_pass_mark_percent: 50, rpl_reapply_cooldown_days: 7 })
  })

  it('invents nothing when the server holds no map: empty inputs, the missing sentence, and no key written (R15)', async () => {
    mocks.fetchRplSettings.mockResolvedValue(storedSettings({ rpl_course_plan_minimums: null }))
    const practitioner = await openControls()

    const block = within(screen.getByRole('region', { name: MC.title }))
    expect(block.getAllByRole('spinbutton').map((input) => input.value)).toEqual(['', '', ''])
    expect(block.getByText(MC.missing)).toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
    save()

    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    expect(mocks.updateRplSettings.mock.calls[0][0]).not.toHaveProperty('rpl_course_plan_minimums')

    // One level typed: the whole map is now written, so every level is required.
    fireEvent.change(practitioner, { target: { value: '5' } })
    expect(block.queryByText(MC.missing)).not.toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
    expect(block.getAllByText(MC.invalid)).toHaveLength(2)
    fireEvent.change(screen.getByLabelText(label('Advanced Professional Practitioner')), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText(label('Professional Expert')), { target: { value: '0' } })
    expect(saveButton()).toBeEnabled()
    save()

    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(2))
    expect(mocks.updateRplSettings.mock.calls[1][0].rpl_course_plan_minimums).toEqual({ practitioner: 5, advanced_practitioner: 7, expert: 0 })
  })

  it.each(['51', '5.5', '-1', ''])('will not save %j and says why', async (value) => {
    const practitioner = await openControls()

    fireEvent.change(practitioner, { target: { value } })

    expect(practitioner).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(MC.invalid)).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('accepts both bounds, 0 and 50', async () => {
    const practitioner = await openControls()

    fireEvent.change(practitioner, { target: { value: '0' } })
    expect(saveButton()).toBeEnabled()
    fireEvent.change(practitioner, { target: { value: '50' } })
    expect(saveButton()).toBeEnabled()
  })

  it('shows the server\'s 422 under the level it names, and the map line under the block', async () => {
    const perLevel = 'The rpl course plan minimums.expert field must not be greater than 50.'
    const mapLine = 'The rpl course plan minimums field must contain entries for: expert.'
    mocks.updateRplSettings.mockRejectedValue({
      response: { status: 422, data: { message: perLevel, errors: { 'rpl_course_plan_minimums.expert': [perLevel], rpl_course_plan_minimums: [mapLine] } } },
    })
    await openControls()

    save()

    const expert = screen.getByLabelText(label('Professional Expert'))
    await waitFor(() => expect(expert).toHaveAttribute('aria-invalid', 'true'))
    expect(document.getElementById(expert.getAttribute('aria-describedby'))).toHaveTextContent(perLevel)
    const block = within(screen.getByRole('region', { name: MC.title }))
    expect(block.getByText(mapLine)).toBeInTheDocument()
    expect(screen.getByLabelText(label('Professional Practitioner'))).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('alert')).toHaveTextContent(perLevel)

    // Editing the level clears the server line under it.
    fireEvent.change(expert, { target: { value: '9' } })
    expect(expert).not.toHaveAttribute('aria-invalid')
    expect(block.queryByText(mapLine)).not.toBeInTheDocument()
  })

  it('falls back to the platform level names when the reference data carries none', async () => {
    mocks.fetchRplReferenceData.mockResolvedValue({ data: { pathways: [{ id: 1, levels: [{ id: 1, code: 'practitioner', rank: 1 }, { id: 2, code: 'advanced_practitioner', rank: 2 }, { id: 3, code: 'expert', rank: 3 }] }] } })
    const practitioner = await openControls(COPY.en, label(PROFESSIONAL_LEVELS[0].labels.en))

    expect(practitioner).toHaveValue(5)
    expect(screen.getByLabelText(label(PROFESSIONAL_LEVELS[2].labels.en))).toHaveValue(10)
  })

  it('renders in Arabic without a literal "undefined"', async () => {
    language.current = 'ar'
    const AR = COURSE_PLAN_MINIMUMS_COPY.ar
    const practitioner = await openControls(COPY.ar, 'ممارس مهني (من 0 إلى 50)')

    expect(practitioner).toHaveValue(5)
    const block = within(screen.getByRole('region', { name: AR.title }))
    expect(block.getByText(AR.reasonRule)).toBeInTheDocument()
    expect(block.getByText(AR.ownerValues)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
