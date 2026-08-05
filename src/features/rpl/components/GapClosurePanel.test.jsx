import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GapClosurePanel from './GapClosurePanel'

/*
 * The panel's job is to keep three outcomes distinguishable, because they need
 * completely different work:
 *
 *   recommended  — a package closes this gap
 *   uncovered    — the competency is known but nothing teaches it; the
 *                  catalogue needs a package written
 *   unresolvable — the standard competency is not mapped to the dictionary;
 *                  the mapping needs doing
 *
 * Collapsing them into one "not covered" list would hide which job is which,
 * and on production data today the second and third dominate: 93 of 100
 * packages declare no competencies and 11 of 12 standard competencies are
 * unmapped. The panel has to make that legible rather than just look empty.
 */

const mocks = vi.hoisted(() => ({ fetchGapClosurePlan: vi.fn() }))

vi.mock('../services/rplService', () => ({
  fetchGapClosurePlan: mocks.fetchGapClosurePlan,
}))

function plan(overrides = {}) {
  return {
    data: {
      target_level: { id: 2, code: 'practitioner' },
      gap_count: 3,
      gaps: [],
      recommended_packages: [
        {
          program_id: 11,
          official_code: 'CGP-GOV-001',
          title: { en: 'Quality management', ar: 'أسس إدارة الجودة' },
          slug: 'cgp-gov-001',
          content_status: 'published',
          is_active: true,
          closes_competency_ids: [1, 2],
          closes_count: 2,
        },
      ],
      unresolvable_gaps: [],
      uncovered_gaps: [],
      progress: { total_gaps: 3, closable_by_catalogue: 2, percentage: 67 },
      catalogue_readiness: {
        gap_programmes: 100,
        declaring_competencies: 7,
        declaring_none: 93,
        standard_competencies: 12,
        standard_competencies_mapped: 1,
      },
      ...overrides,
    },
  }
}

beforeEach(() => {
  mocks.fetchGapClosurePlan.mockReset().mockResolvedValue(plan())
})

function renderPanel(payload) {
  if (payload) mocks.fetchGapClosurePlan.mockResolvedValue(payload)

  return render(<GapClosurePanel applicationPublicId="abc-123" language="en" />)
}

describe('GapClosurePanel', () => {
  it('loads the plan for the application it is given', async () => {
    renderPanel()
    await waitFor(() => expect(mocks.fetchGapClosurePlan).toHaveBeenCalledWith('abc-123'))
    expect(await screen.findByText('CGP-GOV-001')).toBeInTheDocument()
  })

  it('names how many competencies each package closes', async () => {
    renderPanel()
    expect(await screen.findByText(/closes 2 competency/)).toBeInTheDocument()
  })

  it('separates "no package teaches it" from "not mapped to the dictionary"', async () => {
    renderPanel(plan({
      uncovered_gaps: [{ gap_item_id: 1, code: 'SC-ORPHAN', name: { en: 'Uncovered thing' } }],
      unresolvable_gaps: [{ gap_item_id: 2, code: 'SC-NOBRIDGE', name: { en: 'Unmapped thing' } }],
    }))

    const uncovered = within(await screen.findByRole('region', { name: /Gaps no package covers/ }))
    expect(uncovered.getByText('SC-ORPHAN')).toBeInTheDocument()
    expect(uncovered.getByText(/catalogue needs a package/)).toBeInTheDocument()

    const unresolvable = within(screen.getByRole('region', { name: /cannot be matched/ }))
    expect(unresolvable.getByText('SC-NOBRIDGE')).toBeInTheDocument()
    expect(unresolvable.getByText(/mapping needs doing/)).toBeInTheDocument()
  })

  it('explains a thin plan with the catalogue numbers rather than leaving it a mystery', async () => {
    renderPanel()
    expect(await screen.findByText(/93 packages declare none/)).toBeInTheDocument()
    expect(screen.getByText(/1 \/ 12 standard competencies mapped/)).toBeInTheDocument()
  })

  it('says the plan is computed and unsaved, because approval is the assessor’s act', async () => {
    renderPanel()
    expect(await screen.findByText(/has not been saved/)).toBeInTheDocument()
  })

  it('flags a recommended package that cannot be enrolled in yet', async () => {
    renderPanel(plan({
      recommended_packages: [{
        program_id: 11, official_code: 'CGP-DRAFT-001', title: { en: 'Draft package' },
        slug: 'd', content_status: 'draft', is_active: false,
        closes_competency_ids: [1], closes_count: 1,
      }],
    }))
    expect(await screen.findByText(/not yet enrollable/)).toBeInTheDocument()
  })

  it('says so plainly when no gap analysis exists yet', async () => {
    renderPanel(plan({ gap_count: 0, recommended_packages: [], progress: { total_gaps: 0, closable_by_catalogue: 0, percentage: 100 } }))
    expect(await screen.findByText(/once a gap analysis exists/)).toBeInTheDocument()
  })

  it('renders nothing without an application', () => {
    const { container } = render(<GapClosurePanel applicationPublicId={null} language="en" />)
    expect(container).toBeEmptyDOMElement()
    expect(mocks.fetchGapClosurePlan).not.toHaveBeenCalled()
  })

  it('surfaces a server refusal and offers a retry', async () => {
    mocks.fetchGapClosurePlan.mockRejectedValue({
      response: { status: 403, data: { message: 'Forbidden.' } },
    })
    renderPanel()
    expect(await screen.findByRole('button', { name: /Compute the gap closure plan/ })).toBeInTheDocument()
  })
})
