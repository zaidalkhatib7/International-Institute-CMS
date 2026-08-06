import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AcademicDiagnosticPage from './AcademicDiagnosticPage'

/*
 * The review workspace for a paper that carries 35% of an admission
 * recommendation.
 *
 * The tests are about the screen making a genuine review POSSIBLE, rather than
 * making approval fast: the reviewer can see the answer key and the distractor
 * rationale, the issue button says why it is blocked, editing visibly
 * withdraws approval, an issued paper is read-only, and there is no bulk
 * approve.
 */

const mocks = vi.hoisted(() => ({
  fetchAcademicDiagnostic: vi.fn(),
  approveAcademicDiagnosticItem: vi.fn(),
  rejectAcademicDiagnosticItem: vi.fn(),
  updateAcademicDiagnosticItem: vi.fn(),
  issueAcademicDiagnostic: vi.fn(),
}))

vi.mock('../../../services/languageStorage', () => ({ getAdminLanguage: () => 'en' }))

vi.mock('../services/academicRplService', () => ({
  fetchAcademicDiagnostic: mocks.fetchAcademicDiagnostic,
  approveAcademicDiagnosticItem: mocks.approveAcademicDiagnosticItem,
  rejectAcademicDiagnosticItem: mocks.rejectAcademicDiagnosticItem,
  updateAcademicDiagnosticItem: mocks.updateAcademicDiagnosticItem,
  issueAcademicDiagnostic: mocks.issueAcademicDiagnostic,
}))

function item(id, governanceStatus = 'approved', overrides = {}) {
  return {
    id,
    axis: 'research_methodology',
    difficulty: 'applied',
    competency: { name: { en: 'Research methodology' } },
    prompt: { en: `Question ${id}` },
    options: [
      { id: 'A', text: { en: 'Causal inference from a cross-sectional design' } },
      { id: 'B', text: { en: 'The p-value threshold is too lenient' } },
      { id: 'C', text: { en: 'The sample was not randomised' } },
      { id: 'D', text: { en: 'Effect size was not reported' } },
    ],
    answer_key: {
      correct_option_id: 'A',
      distractor_rationale: { B: 'Treats significance as strength of evidence.' },
    },
    governance_status: governanceStatus,
    is_ai_generated: true,
    ...overrides,
  }
}

function diagnostic(overrides = {}) {
  return {
    data: {
      id: 7,
      status: 'pending_review',
      application: { public_id: 'abc-123' },
      blueprint: { domain_items: 9, domains: ['international humanitarian law'] },
      items: Array.from({ length: 26 }, (_, index) => item(index + 1)),
      ...overrides,
    },
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/academic-rpl/diagnostics/7']}>
      <Routes>
        <Route path="/academic-rpl/diagnostics/:diagnosticId" element={<AcademicDiagnosticPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
  mocks.fetchAcademicDiagnostic.mockResolvedValue(diagnostic())
  mocks.approveAcademicDiagnosticItem.mockResolvedValue({})
  mocks.rejectAcademicDiagnosticItem.mockResolvedValue({})
  mocks.updateAcademicDiagnosticItem.mockResolvedValue({})
  mocks.issueAcademicDiagnostic.mockResolvedValue({})
})

describe('AcademicDiagnosticPage', () => {
  it('shows the reviewer the answer key, because fairness cannot be judged without it', async () => {
    renderPage()
    expect((await screen.findAllByText('Answer key')).length).toBeGreaterThan(0)
  })

  it('shows what each wrong choice reveals, which is the diagnostic value of the item', async () => {
    renderPage()
    expect(
      (await screen.findAllByText(/Treats significance as strength of evidence/))[0],
    ).toBeInTheDocument()
  })

  it('counts progress in items reviewed so the distance left stays visible', async () => {
    mocks.fetchAcademicDiagnostic.mockResolvedValue(diagnostic({
      items: [...Array.from({ length: 6 }, (_, i) => item(i + 1)), ...Array.from({ length: 20 }, (_, i) => item(i + 7, 'pending'))],
    }))
    renderPage()
    expect(await screen.findByText('6 of 26 reviewed')).toBeInTheDocument()
  })

  it('explains why issue is blocked instead of leaving a grey button', async () => {
    mocks.fetchAcademicDiagnostic.mockResolvedValue(diagnostic({
      items: [...Array.from({ length: 20 }, (_, i) => item(i + 1)), ...Array.from({ length: 6 }, (_, i) => item(i + 21, 'pending'))],
    }))
    renderPage()

    expect(await screen.findByText(/6 question\(s\) still await review/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Issue to the applicant/ })).toBeDisabled()
  })

  it('blocks issue below the governed minimum and says the number', async () => {
    mocks.fetchAcademicDiagnostic.mockResolvedValue(diagnostic({
      items: [...Array.from({ length: 10 }, (_, i) => item(i + 1)), ...Array.from({ length: 16 }, (_, i) => item(i + 11, 'rejected'))],
    }))
    renderPage()

    expect(await screen.findByText(/only 10 approved question\(s\); the governed minimum is 25/)).toBeInTheDocument()
  })

  it('allows issue once every item is reviewed and enough survive', async () => {
    renderPage()
    const issue = await screen.findByRole('button', { name: /Issue to the applicant/ })
    expect(issue).toBeEnabled()

    fireEvent.click(issue)
    await waitFor(() => expect(mocks.issueAcademicDiagnostic).toHaveBeenCalledWith(7, {}))
  })

  it('warns that editing withdraws the approval it replaces', async () => {
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: /Edit/ }))[0])

    expect(await screen.findByText(/returns the item to pending review/)).toBeInTheDocument()
  })

  it('requires a stated reason before an item can be rejected', async () => {
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: /Reject/ }))[0])

    const panel = await screen.findByText(/Reason for rejection/)
    const confirm = within(panel.closest('div')).getByRole('button', { name: /Reject/ })
    expect(confirm).toBeDisabled()
    expect(mocks.rejectAcademicDiagnosticItem).not.toHaveBeenCalled()
  })

  it('sends the rejection reason so the exclusion is explainable later', async () => {
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: /Reject/ }))[0])

    const reason = 'The stem is negatively phrased and the key is arguable.'
    fireEvent.change(await screen.findByPlaceholderText(/Why is this question excluded/), {
      target: { value: reason },
    })
    const panel = screen.getByText(/Reason for rejection/).closest('div')
    fireEvent.click(within(panel).getByRole('button', { name: /Reject/ }))

    await waitFor(() => expect(mocks.rejectAcademicDiagnosticItem).toHaveBeenCalledWith(1, { reason }))
  })

  it('locks an issued paper and says it is a record of what was asked', async () => {
    mocks.fetchAcademicDiagnostic.mockResolvedValue(diagnostic({ status: 'issued' }))
    renderPage()

    expect(await screen.findByText(/record of what was asked/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Approve$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Issue to the applicant/ })).not.toBeInTheDocument()
  })

  it('offers no bulk approval', async () => {
    renderPage()
    await screen.findAllByRole('button', { name: /Approve/ })

    // Structural: 26 deliberate clicks, not one. If a bulk action is ever
    // added here, this fails and someone has to justify it.
    expect(screen.queryByRole('button', { name: /approve all/i })).not.toBeInTheDocument()
  })

  it('names the applicant field the paper was built around', async () => {
    renderPage()
    expect(await screen.findByText(/international humanitarian law/)).toBeInTheDocument()
  })
})
