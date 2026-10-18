import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import NextStepCard from './NextStepCard'
import JourneyStepper from './JourneyStepper'
import { caseJourney, caseNextStep, journeySteps } from '../domain/journey'

/*
 * THE NEXT STEP CARD AND THE STEPPER (PLATFORM-JOURNEY-SPEC §4.3).
 * The card explains and opens tabs; it acts only to submit an office draft, after
 * asking; it offers no tab the viewer lacks. The stepper marks the current step.
 */

const all = () => true

function renderCard(step, props = {}) {
  return render(<MemoryRouter><NextStepCard step={step} {...props} /></MemoryRouter>)
}

describe('the Next step card', () => {
  it('names who acts and opens the tab and anchor of the step', () => {
    const onOpenTab = vi.fn()
    renderCard(caseNextStep({ work_queue: 'intake_review', status: 'submitted' }, { hasPermission: all }), { language: 'en', onOpenTab })
    const card = screen.getByRole('region', { name: 'Next step' })
    expect(within(card).getByText('Your move')).toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: 'Initial review' }))
    expect(onOpenTab).toHaveBeenCalledWith('overview', 'initial-review')
  })

  it('offers no button for a tab the viewer does not have', () => {
    renderCard(caseNextStep({ work_queue: 'screening_decision', status: 'evidence_verification' }, { hasPermission: () => false }), { language: 'en', visibleTabs: ['overview', 'evidence', 'timeline'] })
    expect(screen.getByText('Another team')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('draws the actor chip in tones that keep 4.5:1 on their tint', () => {
    const { unmount } = renderCard(caseNextStep({ work_queue: 'certificate', status: 'credential_pending', after_quiz: { level_certificate_state: 'queued' } }, { hasPermission: all }), { language: 'ar' })
    expect(screen.getByText('تلقائي').className).toContain('text-[#157A45]')
    unmount()
    renderCard(caseNextStep({ work_queue: 'intake_review', status: 'submitted' }, { hasPermission: all }), { language: 'ar' })
    expect(screen.getByText('عليك').className).toContain('text-[#8A4F06]')
  })

  it('marks an overdue information request', () => {
    renderCard(caseNextStep({ work_queue: 'awaiting_client_info', status: 'awaiting_applicant', information_requests: [{ status: 'open', due_at: '2020-02-01T00:00:00Z' }] }, { hasPermission: all }), { language: 'ar' })
    expect(screen.getByText('متأخر')).toBeInTheDocument()
    expect(screen.getByText('بانتظار العميل')).toBeInTheDocument()
  })

  it('asks before submitting an office draft, and can be taken back', async () => {
    const onSubmitRequest = vi.fn().mockResolvedValue(undefined)
    renderCard(caseNextStep({ work_queue: 'office_drafts', status: 'draft', allowed_transitions: ['submitted'] }, { hasPermission: all }), { language: 'en', onSubmitRequest })
    fireEvent.click(screen.getByRole('button', { name: 'Submit the request' }))
    // Focus moves into the confirmation, which names its sentence.
    const dialog = screen.getByRole('alertdialog', { name: 'Submit the request' })
    expect(within(dialog).getByRole('button', { name: 'Confirm and submit' })).toHaveFocus()
    expect(dialog).toHaveAccessibleDescription('The request will be submitted and document screening will start.')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    // Back returns focus to Submit.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit the request' })).toHaveFocus())
    expect(onSubmitRequest).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Submit the request' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and submit' }))
    await waitFor(() => expect(onSubmitRequest).toHaveBeenCalledTimes(1))
  })

  it('links a completed case to the certificate register', () => {
    renderCard(caseNextStep({ status: 'completed' }, { hasPermission: all }), { language: 'en' })
    expect(screen.getByRole('link', { name: /Certificate register/ })).toHaveAttribute('href', '/certificates')
  })

  it('renders nothing without a sentence', () => {
    const { container } = renderCard(null)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('the stepper', () => {
  it('marks the current step for assistive technology and follows the direction', () => {
    const journey = caseJourney({ status: 'course_plan_review' }, 'ar')
    render(<JourneyStepper steps={journeySteps('ar')} states={journey.states} language="ar" />)
    const region = screen.getByRole('region', { name: 'مراحل الطلب' })
    expect(region).toHaveAttribute('dir', 'rtl')
    expect(region.querySelector('[aria-current="step"]')).toHaveTextContent('خطة الدورات')
    expect(region.className).toMatch(/overflow-x-auto/)
  })

  it('can be scrolled from the keyboard: the scrolling card is a named region that takes focus', () => {
    render(<JourneyStepper steps={journeySteps('en')} states={caseJourney({ status: 'final_exam' }).states} language="en" />)
    const region = screen.getByRole('region', { name: 'Case stages' })
    expect(region).toHaveAttribute('tabindex', '0')
    region.focus()
    expect(region).toHaveFocus()
  })

  it('draws skipped steps in a readable grey (slate-500, 4.76:1 on white)', () => {
    const journey = caseJourney({ status: 'completed', after_quiz: { completion_route: 'experience_certificate' } }, 'en')
    render(<JourneyStepper steps={journeySteps('en')} states={journey.states} marker={journey.marker} language="en" />)
    const skipped = screen.getAllByRole('listitem').filter((item) => item.dataset.state === 'skipped')
    expect(skipped.every((item) => item.innerHTML.includes('text-slate-500') && !item.innerHTML.includes('text-slate-400'))).toBe(true)
  })

  it('shows the experience certificate marker on a case that ended there', () => {
    const journey = caseJourney({ status: 'completed', after_quiz: { completion_route: 'experience_certificate' } }, 'en')
    render(<JourneyStepper steps={journeySteps('en')} states={journey.states} marker={journey.marker} language="en" />)
    expect(screen.getByText('Ended with the experience certificate')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').filter((item) => item.dataset.state === 'skipped')).toHaveLength(4)
  })
})
