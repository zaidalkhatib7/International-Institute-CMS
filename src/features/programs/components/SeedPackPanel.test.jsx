import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SeedPackPanel from './SeedPackPanel'

/*
 * A competency weight is a whole-number percentage, 1 to 100. This input used to
 * step by 0.1, the server accepted any number, and MySQL stored every fraction
 * in an unsignedTinyInteger column as 0 — four production programmes lost all
 * eighteen of their weights through an approval that reported success.
 *
 * What is worth pinning here is the reviewer's side of the server rule: a
 * fraction is refused rather than rounded, a weight the server dropped arrives
 * as an empty box rather than a plausible 1, and what is sent is an integer.
 */

const mocks = vi.hoisted(() => ({
  proposeSeedPack: vi.fn(),
  approveSeedPack: vi.fn(),
  language: { current: 'en' },
}))

vi.mock('../services/programsService', () => ({
  proposeSeedPack: mocks.proposeSeedPack,
  approveSeedPack: mocks.approveSeedPack,
}))

vi.mock('../../../utils/localization', () => ({
  getCurrentLanguage: () => mocks.language.current,
}))

// The copy each locale shows for the two buttons these tests press.
const PROPOSE = { en: 'Propose seed pack', ar: 'اقترح حزمة الانطلاق', nl: 'Startpakket voorstellen' }

function draftFixture() {
  return {
    program_id: 240,
    model: 'seed-pack-model',
    competencies: [
      // The server dropped the model's weight (it sent 0.3): a person decides it.
      { professional_competency_id: 5, is_primary: true, weight: null,
        entry_proficiency_level_id: null, target_proficiency_level_id: 3, rationale: 'Core of the course.' },
      { professional_competency_id: 6, is_primary: false, weight: 30,
        entry_proficiency_level_id: null, target_proficiency_level_id: 3, rationale: '' },
    ],
    learning_outcomes: [
      { code: 'LO-001', title: { en: 'Evaluates evidence' }, description: { en: '' }, professional_competency_id: 5 },
    ],
    academic_identity: {},
    dictionary: [
      { id: 5, code: 'PC-GOV-005', name: 'Governs records' },
      { id: 6, code: 'PC-GOV-006', name: 'Audits controls' },
    ],
    proficiency_levels: [{ id: 3, code: 'L3', rank: 3, name: 'Proficient' }],
  }
}

async function renderWithDraft(language = 'en') {
  mocks.language.current = language
  render(<SeedPackPanel programId={240} />)
  fireEvent.click(screen.getByRole('button', { name: PROPOSE[language] }))
  return screen.findAllByLabelText(language === 'en' ? 'Weight (%)' : /%/)
}

function approveButton() {
  return screen.getByRole('button', { name: 'Approve seed pack' })
}

beforeEach(() => {
  mocks.proposeSeedPack.mockReset().mockResolvedValue({ data: draftFixture() })
  mocks.approveSeedPack.mockReset().mockResolvedValue({ message: 'Seed pack approved.' })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SeedPackPanel competency weight', () => {
  it('steps by whole numbers from 1 to 100', async () => {
    const [weight] = await renderWithDraft()

    expect(weight).toHaveAttribute('step', '1')
    expect(weight).toHaveAttribute('min', '1')
    expect(weight).toHaveAttribute('max', '100')
  })

  it('shows a weight the server dropped as an empty box, not as 1, and will not approve it', async () => {
    const [dropped, kept] = await renderWithDraft()

    // An empty box is honest; a 1 there would look like a decision nobody made.
    expect(dropped).toHaveValue(null)
    expect(kept).toHaveValue(30)
    expect(approveButton()).toBeDisabled()
    expect(screen.getByText(/Every mapped competency needs a weight from 1 to 100/)).toBeInTheDocument()

    fireEvent.change(dropped, { target: { value: '25' } })

    expect(approveButton()).toBeEnabled()
    expect(screen.queryByText(/Every mapped competency needs a weight/)).not.toBeInTheDocument()
  })

  it.each([
    ['0.3', 'a fraction, which MySQL stored as 0'],
    ['30.0', 'a decimal, refused rather than trusted'],
    ['0', 'zero'],
    ['101', 'more than all of it'],
  ])('refuses %s (%s) rather than rounding it', async (value) => {
    const [, kept] = await renderWithDraft()
    // The other row is made valid, so the refusal below is this row's alone.
    fireEvent.change(screen.getAllByLabelText('Weight (%)')[0], { target: { value: '40' } })
    expect(approveButton()).toBeEnabled()

    fireEvent.change(kept, { target: { value } })

    expect(kept).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Enter a whole number from 1 to 100.')).toBeInTheDocument()
    expect(approveButton()).toBeDisabled()
  })

  it('sends each weight as an integer, because the server accepts nothing else', async () => {
    const [dropped] = await renderWithDraft()
    fireEvent.change(dropped, { target: { value: '25' } })

    fireEvent.click(approveButton())

    await waitFor(() => expect(mocks.approveSeedPack).toHaveBeenCalledTimes(1))
    const [programId, competencies] = mocks.approveSeedPack.mock.calls[0]
    expect(programId).toBe(240)
    // 25 the number, not "25" the string the box holds: the server's rule is
    // integer:strict and would refuse the string.
    expect(competencies.map((row) => row.weight)).toEqual([25, 30])
    competencies.forEach((row) => expect(Number.isInteger(row.weight)).toBe(true))
  })

  it('starts a hand-added mapping with an empty weight for the reviewer to enter', async () => {
    await renderWithDraft()
    fireEvent.click(screen.getByRole('button', { name: 'Add competency mapping' }))

    const weights = screen.getAllByLabelText('Weight (%)')
    expect(weights).toHaveLength(3)
    expect(weights[2]).toHaveValue(null)
  })

  /*
   * The copy lookup is whole-object: a key added to one locale and not the
   * others renders as "undefined" for those readers. All three are checked.
   */
  it.each(['ar', 'en', 'nl'])('labels the weight as a percentage, with its hint, in %s', async (language) => {
    const weights = await renderWithDraft(language)

    expect(weights.length).toBe(2)
    expect(document.body.textContent).not.toMatch(/undefined/)
    // The hint, the per-row refusal for the empty box, and the approve-bar note.
    expect(screen.getAllByText(/100/).length).toBeGreaterThanOrEqual(3)
  })
})
