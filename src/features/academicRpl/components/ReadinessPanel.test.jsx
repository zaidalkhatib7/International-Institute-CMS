import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReadinessPanel from './ReadinessPanel'

/*
 * This panel shows a percentage that decides whether somebody may pursue a
 * professional doctorate. The tests are about whether an assessor can TELL
 * THINGS APART on it, because three very different situations all render as a
 * low number:
 *
 *   - a genuine low score
 *   - a critical competency unmet, where "ready" is unreachable at any total
 *   - the framework unapproved, where nothing was measured at all
 *
 * Collapsing those would make the screen actively misleading.
 */

const mocks = vi.hoisted(() => ({ fetchAcademicReadiness: vi.fn() }))

vi.mock('../services/academicRplService', () => ({
  fetchAcademicReadiness: mocks.fetchAcademicReadiness,
}))

function track(overrides = {}) {
  return {
    track_id: 2,
    track_code: 'professional_master',
    track_name: { en: 'Professional Master', ar: 'الماجستير المهني' },
    rank: 2,
    components: {
      qualifications: { score: 100, available: true, basis: {} },
      experience_evidence: { score: 70, available: true, basis: {} },
      diagnostic: { score: 80, available: true, basis: {} },
      interview: { score: null, available: false, basis: { reason: 'interview_not_recorded' } },
    },
    weights_applied: { qualifications: 27.78, experience_evidence: 33.33, diagnostic: 38.89 },
    readiness_percentage: 82.22,
    band: 'ready',
    blocking_competency_codes: [],
    requirement_count: 8,
    framework_ready: true,
    ...overrides,
  }
}

function payload(overrides = {}) {
  return {
    data: {
      policy: {
        id: 1,
        version: 1,
        weights: { qualifications: 25, experience_evidence: 30, diagnostic: 35, interview: 10 },
        threshold_ready: 80,
        threshold_conditional: 60,
      },
      tracks: [track()],
      recommended_track_code: 'professional_master',
      note: 'Readiness is computed by the platform. It is a measurement, not an admission decision.',
      ...overrides,
    },
  }
}

beforeEach(() => {
  mocks.fetchAcademicReadiness.mockReset().mockResolvedValue(payload())
})

function renderPanel(data) {
  if (data) mocks.fetchAcademicReadiness.mockResolvedValue(data)
  return render(<ReadinessPanel applicationPublicId="abc-123" language="en" />)
}

describe('ReadinessPanel', () => {
  it('loads readiness for the application it is given', async () => {
    renderPanel()
    await waitFor(() => expect(mocks.fetchAcademicReadiness).toHaveBeenCalledWith('abc-123'))
    expect(await screen.findByText('82.22%')).toBeInTheDocument()
  })

  it('shows the policy version, because a score is only defensible with the policy behind it', async () => {
    renderPanel()
    expect(await screen.findByText(/Admission policy version 1/)).toBeInTheDocument()
  })

  it('breaks the score into its components with the weights actually applied', async () => {
    renderPanel()
    const section = within(await screen.findByRole('region', { name: /Professional Master/ }))

    expect(section.getByText('Academic qualifications')).toBeInTheDocument()
    // The applied weight, not the nominal one — they differ once a component
    // is missing, and the difference is what makes the total reproducible.
    expect(section.getByText(/27.78% weight applied/)).toBeInTheDocument()
  })

  it('says WHY a component is missing rather than showing a bare zero', async () => {
    renderPanel()
    const section = within(await screen.findByRole('region', { name: /Professional Master/ }))

    // "No interview recorded" and "no evidence" call for completely different
    // work; a shared blank would hide which.
    expect(section.getByText('No interview recorded')).toBeInTheDocument()
  })

  it('flags an unmet critical competency as a veto, not a low score', async () => {
    renderPanel(payload({
      tracks: [track({ band: 'conditional', blocking_competency_codes: ['ARC-RM', 'ARC-LIT'] })],
      recommended_track_code: null,
    }))

    expect(await screen.findByText(/Critical competency unmet/)).toBeInTheDocument()
    expect(screen.getByText('ARC-RM, ARC-LIT')).toBeInTheDocument()
    expect(screen.getByText(/unreachable whatever the total/)).toBeInTheDocument()
  })

  it('explains an unapproved framework instead of implying the applicant scored nothing', async () => {
    renderPanel(payload({
      tracks: [track({ framework_ready: false, requirement_count: 0, readiness_percentage: 0, band: 'not_recommended' })],
      recommended_track_code: null,
    }))

    expect(await screen.findByText(/framework has not been approved/)).toBeInTheDocument()
    expect(screen.getByText(/Approve the framework first/)).toBeInTheDocument()
  })

  it('treats no ready track as a gap plan, not a refusal', async () => {
    renderPanel(payload({
      tracks: [track({ band: 'conditional' })],
      recommended_track_code: null,
    }))

    expect(await screen.findByText(/calls for a gap plan, not a refusal/)).toBeInTheDocument()
  })

  it('states that the result is not an admission decision', async () => {
    renderPanel()
    expect(await screen.findByText(/not an admission decision/)).toBeInTheDocument()
  })

  it('renders nothing without an application', () => {
    const { container } = render(<ReadinessPanel applicationPublicId={null} language="en" />)
    expect(container).toBeEmptyDOMElement()
    expect(mocks.fetchAcademicReadiness).not.toHaveBeenCalled()
  })

  it('surfaces a server refusal and offers a retry', async () => {
    mocks.fetchAcademicReadiness.mockRejectedValue({
      response: { status: 422, data: { message: 'No active admission policy.' } },
    })
    renderPanel()
    expect(await screen.findByRole('button', { name: /Compute readiness/ })).toBeInTheDocument()
  })
})
