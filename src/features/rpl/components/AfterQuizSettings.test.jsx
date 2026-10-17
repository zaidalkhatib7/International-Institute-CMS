import { useEffect, useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AfterQuizSettings from './AfterQuizSettings'
import { AFTER_QUIZ_COPY, afterQuizSettingsPayload, changeAfterQuizSetting, readAfterQuizSettings } from '../domain/afterQuiz'

/*
 * THE FIVE SETTINGS AFTER THE ENTRY QUIZ (owner model of 15 Oct 2026, P6; 2.2;
 * the prices in US dollars since the owner decisions of 17 Oct 2026).
 *
 * Pinned: the two prices are money fields in US dollars with cents (held as
 * whole US cents, shown as dollars), with a pound preview at today's rate; the
 * three others are whole-number inputs with their bounds; nothing prefilled but
 * what the server holds (the pass mark is seeded 50); "empty" says what it stops;
 * an invalid value says why; and the server's 422 shows under its own key.
 */

const mocks = vi.hoisted(() => ({ fetchCurrencies: vi.fn() }))
vi.mock('../../finance/services/financeService', () => mocks)

const S = AFTER_QUIZ_COPY.en.settings
// What the page would save: the harness reports its state here after each render.
const probe = { state: null }

function Harness({ raw, errors, language = 'en' }) {
  const [state, setState] = useState(() => ({ ...readAfterQuizSettings(raw), errors: errors || {} }))
  useEffect(() => {
    probe.state = state
  }, [state])
  return <AfterQuizSettings language={language} state={state} onChange={(key, value) => setState((current) => changeAfterQuizSetting(current, key, value))} />
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetchCurrencies.mockResolvedValue({ currencies: [], exchange_rate: { id: 7, syp_per_usd: '13000.0000', effective_from: '2026-10-17T09:00:00Z' }, rounding: 'half_up_whole_pound' })
})

describe('the after-quiz settings block', () => {
  it('shows two dollar fields and three whole-number inputs with their bounds, and only what the server holds', () => {
    render(<Harness raw={{ rpl_final_exam_pass_mark_percent: 50, rpl_experience_certificate_price_usd_minor: null }} />)

    const block = within(screen.getByRole('region', { name: S.title }))
    const numbers = block.getAllByRole('spinbutton')
    expect(numbers.map((input) => input.labels[0].textContent)).toEqual([S.fields.passMark.label, S.fields.questionsPerCourse.label, S.fields.waitDays.label])
    expect(numbers.map((input) => input.value)).toEqual(['50', '', ''])
    expect(numbers.map((input) => [input.getAttribute('min'), input.getAttribute('max')])).toEqual([['1', '99'], ['1', '50'], ['0', '365']])
    for (const label of [S.fields.price.label, S.fields.retakeFee.label]) {
      const money = block.getByLabelText(label)
      expect(money).toHaveAttribute('type', 'text')
      expect(money).toHaveAttribute('inputmode', 'decimal')
      expect(money).toHaveValue('')
    }
    expect(S.fields.price.label).toContain('US dollars, 1.00 to 1,000,000.00')
    // Empty says what it stops; the pass mark carries its own rule.
    expect(block.getByText(`${S.notSet} ${S.fields.price.hint}`)).toBeInTheDocument()
    expect(block.getByText(S.fields.passMark.hint)).toBeInTheDocument()
    expect(mocks.fetchCurrencies).not.toHaveBeenCalled()
  })

  it('shows a held price in dollars, takes cents, and sends whole US cents', async () => {
    render(<Harness raw={{ rpl_final_exam_pass_mark_percent: 50, rpl_experience_certificate_price_usd_minor: 150000 }} />)

    expect(screen.getByLabelText(S.fields.price.label)).toHaveValue('1500.00')
    expect(await screen.findByText('19,500,000 SYP at today\'s rate')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(S.fields.retakeFee.label), { target: { value: '5.50' } })
    expect(afterQuizSettingsPayload(probe.state)).toEqual({ rpl_final_exam_pass_mark_percent: 50, rpl_experience_certificate_price_usd_minor: 150000, rpl_final_exam_retake_fee_usd_minor: 550 })
    expect(await screen.findByText('71,500 SYP at today\'s rate')).toBeInTheDocument()
  })

  it('says why a value is refused, and that the pass mark cannot be emptied', () => {
    render(<Harness raw={{ rpl_final_exam_pass_mark_percent: 50 }} />)

    fireEvent.change(screen.getByLabelText(S.fields.questionsPerCourse.label), { target: { value: '51' } })
    expect(screen.getByText('Enter a whole number from 1 to 50.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(S.fields.price.label), { target: { value: '0.99' } })
    expect(screen.getByText(S.usdInvalid)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(S.fields.price.label), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText(S.fields.passMark.label), { target: { value: '' } })
    expect(screen.getByText(S.passMarkRequired)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(S.fields.passMark.label), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText(S.fields.questionsPerCourse.label), { target: { value: '5' } })
    expect(afterQuizSettingsPayload(probe.state)).toEqual({ rpl_final_exam_pass_mark_percent: 60, rpl_final_exam_questions_per_course: 5, rpl_experience_certificate_price_usd_minor: null })
  })

  it('shows the server\'s 422 under its own key', () => {
    render(<Harness raw={{ rpl_final_exam_retake_fee_usd_minor: 40000 }} errors={{ rpl_final_exam_retake_fee_usd_minor: 'The retake fee must be an integer.' }} />)

    const fee = screen.getByLabelText(S.fields.retakeFee.label)
    expect(fee).toHaveValue('400.00')
    expect(fee).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(fee.getAttribute('aria-describedby'))).toHaveTextContent('The retake fee must be an integer.')
    expect(screen.getByLabelText(S.fields.price.label)).not.toHaveAttribute('aria-invalid')
  })

  it('renders in Arabic without a literal "undefined"', () => {
    render(<Harness raw={{ rpl_final_exam_pass_mark_percent: 50 }} language="ar" />)

    expect(screen.getByRole('region', { name: AFTER_QUIZ_COPY.ar.settings.title })).toBeInTheDocument()
    expect(screen.getByLabelText(AFTER_QUIZ_COPY.ar.settings.fields.passMark.label)).toHaveValue(50)
    expect(document.body.textContent).not.toContain('undefined')
  })
})
