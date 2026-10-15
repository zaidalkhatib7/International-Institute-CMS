import { useEffect, useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AfterQuizSettings from './AfterQuizSettings'
import { AFTER_QUIZ_COPY, afterQuizSettingsPayload, changeAfterQuizSetting, readAfterQuizSettings } from '../domain/afterQuiz'

/*
 * THE FIVE SETTINGS AFTER THE ENTRY QUIZ (owner model of 15 Oct 2026, P6; 2.2).
 *
 * Pinned: five whole-number inputs with their bounds; nothing prefilled but what
 * the server holds (the pass mark is seeded 50); "empty" says what it stops; an
 * invalid value says why; and the server's 422 shows under its own key.
 */

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

describe('the after-quiz settings block', () => {
  it('shows five inputs with their bounds, and only what the server holds', () => {
    render(<Harness raw={{ rpl_final_exam_pass_mark_percent: 50, rpl_experience_certificate_price_points: null }} />)

    const block = within(screen.getByRole('region', { name: S.title }))
    const inputs = block.getAllByRole('spinbutton')
    expect(inputs).toHaveLength(5)
    expect(inputs.map((input) => input.labels[0].textContent)).toEqual([
      S.fields.price.label,
      S.fields.passMark.label,
      S.fields.questionsPerCourse.label,
      S.fields.waitDays.label,
      S.fields.retakeFee.label,
    ])
    expect(inputs.map((input) => input.value)).toEqual(['', '50', '', '', ''])
    expect(inputs.map((input) => [input.getAttribute('min'), input.getAttribute('max')])).toEqual([['1', '1000000'], ['1', '99'], ['1', '50'], ['0', '365'], ['1', '1000000']])
    // Empty says what it stops; the pass mark carries its own rule.
    expect(block.getByText(`${S.notSet} ${S.fields.price.hint}`)).toBeInTheDocument()
    expect(block.getByText(S.fields.passMark.hint)).toBeInTheDocument()
  })

  it('says why a value is refused, and that the pass mark cannot be emptied', () => {
    render(<Harness raw={{ rpl_final_exam_pass_mark_percent: 50 }} />)

    fireEvent.change(screen.getByLabelText(S.fields.questionsPerCourse.label), { target: { value: '51' } })
    expect(screen.getByText('Enter a whole number from 1 to 50.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(S.fields.passMark.label), { target: { value: '' } })
    expect(screen.getByText(S.passMarkRequired)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(S.fields.passMark.label), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText(S.fields.questionsPerCourse.label), { target: { value: '5' } })
    expect(afterQuizSettingsPayload(probe.state)).toEqual({ rpl_final_exam_pass_mark_percent: 60, rpl_final_exam_questions_per_course: 5 })
  })

  it('shows the server\'s 422 under its own key', () => {
    render(<Harness raw={{ rpl_final_exam_retake_fee_points: 400 }} errors={{ rpl_final_exam_retake_fee_points: 'The retake fee must be an integer.' }} />)

    const fee = screen.getByLabelText(S.fields.retakeFee.label)
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
