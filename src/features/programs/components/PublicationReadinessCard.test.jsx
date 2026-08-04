import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import PublicationReadinessCard from './PublicationReadinessCard'

/*
 * The defect this card exists to prevent: activation failed with
 * "Complete and publish the programme content before activation.
 *  (and 4 more errors)" — one line, four dropped, no way to know what to fix.
 *
 * So the thing worth testing is not that it renders, but that every failing
 * check is NAMED and REACHABLE.
 */

const navigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => navigate,
}))

const readiness = {
  percentage: 73,
  completed_count: 11,
  total_count: 15,
  is_ready: false,
  missing: ['scientific_material', 'question_bank', 'passing_score', 'rpl_pathway_mapping'],
  checklist: {
    classification: true,
    title_translations: true,
    summary_translations: true,
    objective_translations: true,
    knowledge: true,
    skills: true,
    professional_behaviours: true,
    abilities: true,
    performance_indicators: true,
    outcomes: true,
    scientific_material: false,
    question_bank: false,
    passing_score: false,
    competency_mapping: true,
    rpl_pathway_mapping: false,
  },
}

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <PublicationReadinessCard
        readiness={readiness}
        contentStatus="draft"
        language="en"
        onGoToTab={props.onGoToTab || vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('PublicationReadinessCard', () => {
  it('names every failing check instead of counting them', () => {
    renderCard()

    for (const label of [
      'Learning material',
      'Question bank',
      'Passing score',
      'RPL pathway mapping',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }

    // And the passing ones are still shown, so the list is a state, not a nag.
    expect(screen.getByText('Classification')).toBeInTheDocument()
    expect(screen.getByText('11 of 15')).toBeInTheDocument()
  })

  it('shows content_status as its own blocker, because it is a separate gate', () => {
    renderCard()
    expect(screen.getByText(/Content status: draft/)).toBeInTheDocument()
  })

  it('does not report the content_status blocker once it is published', () => {
    renderCard({ contentStatus: 'published' })
    expect(screen.queryByText(/Content status:/)).not.toBeInTheDocument()
  })

  it('routes a check that is fixed on another screen, not on this editor', () => {
    const onGoToTab = vi.fn()
    navigate.mockClear()
    renderCard({ onGoToTab })

    // rpl_pathway_mapping is editable ONLY in the competency-gap library.
    const row = screen.getByText('RPL pathway mapping').closest('div')
    fireEvent.click(within(row).getByRole('button'))

    expect(navigate).toHaveBeenCalledWith('/competency-gap-library')
    expect(onGoToTab).not.toHaveBeenCalled()
  })

  it('switches tab for a check that is fixed on this editor', () => {
    const onGoToTab = vi.fn()
    navigate.mockClear()
    renderCard({ onGoToTab })

    const row = screen.getByText('Passing score').closest('div')
    fireEvent.click(within(row).getByRole('button'))

    expect(onGoToTab).toHaveBeenCalledWith('final-quiz')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('offers no fix button on a check that already passes', () => {
    renderCard()
    const row = screen.getByText('Classification').closest('div')
    expect(within(row).queryByRole('button')).toBeNull()
  })

  it('renders nothing when the programme has no readiness verdict', () => {
    const { container } = render(
      <MemoryRouter>
        <PublicationReadinessCard readiness={null} contentStatus="" language="en" />
      </MemoryRouter>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
