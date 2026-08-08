import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DynamicAssessmentPanel, { COPY } from './DynamicAssessmentPanel'
import { COPY as EVIDENCE_COPY } from './EvidenceReadinessNotice'

/*
 * THE ANSWERS-FIRST WORKSPACE.
 *
 * Owner instruction, 7 Aug 2026: Gemini writes the questions from the client's
 * files, the applicant answers ALL of them, and only then may the model evaluate.
 * Three things on this panel decide whether that rule is legible or merely
 * enforced somewhere the administrator cannot see:
 *
 *   1. WHICH FILES WILL BE READ, before generating. A .docx CV contributes
 *      nothing and the old screen said nothing about it.
 *   2. HOW MANY ANSWERS ARE IN. A disabled evaluation button with no count
 *      beside it is a support ticket, not an instruction.
 *   3. A WAY BACK. Without reissue, the first closed window bricks a live case:
 *      the set is immutable, the applicant cannot answer, and the gate refuses.
 *
 * Assertions run in English for legibility and are repeated in Arabic where the
 * copy is the thing under test — Arabic is what this CMS actually defaults to.
 */

const mocks = vi.hoisted(() => ({
  fetchDynamicAssessments: vi.fn(),
  fetchDynamicAssessment: vi.fn(),
  createDynamicAssessment: vi.fn(),
  generateDynamicAssessmentDraft: vi.fn(),
  approveAllDynamicAssessmentItems: vi.fn(),
  approveDynamicAssessmentItem: vi.fn(),
  addDynamicAssessmentItem: vi.fn(),
  updateDynamicAssessmentItem: vi.fn(),
  rejectDynamicAssessmentItem: vi.fn(),
  regenerateDynamicAssessmentItem: vi.fn(),
  sendDynamicAssessment: vi.fn(),
  reissueDynamicAssessment: vi.fn(),
  cancelDynamicAssessment: vi.fn(),
  finalEvaluateDynamicAssessment: vi.fn(),
  exportDynamicAssessment: vi.fn(),
}))

vi.mock('../services/rplService', () => mocks)

const docxCv = {
  id: 12,
  title: 'Curriculum vitae',
  media: {
    original_name: 'cv.docx',
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 40_000,
  },
}

const pdfCertificate = {
  id: 13,
  title: 'ISO lead auditor certificate',
  media: { original_name: 'iso.pdf', mime_type: 'application/pdf', size: 90_000 },
}

function items(count, answeredCount) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    status: 'approved',
    type: 'knowledge',
    prompt: { generated: `Question ${index + 1}` },
    options: [{ id: 'C', text: 'The governed answer' }],
    response: index < answeredCount ? { selected_option_id: 'C' } : null,
  }))
}

function verification({ itemCount = 0, answeredCount = 0, ...overrides } = {}) {
  return {
    id: 7,
    status: 'draft',
    time_limit_minutes: 25,
    issued_at: null,
    opened_at: null,
    due_at: null,
    answers_submitted_at: null,
    issued_snapshot: null,
    final_evaluation: null,
    active_items: items(itemCount, answeredCount),
    ...overrides,
  }
}

function issued({ itemCount = 25, answeredCount = 0, ...overrides } = {}) {
  const base = verification({ itemCount, answeredCount, status: 'issued' })

  return {
    ...base,
    issued_at: '2026-08-01T09:00:00Z',
    // The frozen denominator, exactly as sendToApplicant writes it.
    issued_snapshot: base.active_items.map((item) => ({ id: item.id })),
    ...overrides,
  }
}

function renderPanel(assessment, props = {}) {
  mocks.fetchDynamicAssessments.mockResolvedValue({ data: assessment ? [{ id: assessment.id }] : [] })
  mocks.fetchDynamicAssessment.mockResolvedValue({ data: assessment })

  return render(
    <DynamicAssessmentPanel assessmentId="12" language="en" evidence={[]} {...props} />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the applicant files the questions will be built from', () => {
  it('names the withheld .docx CV and the reason, before anything is generated', async () => {
    renderPanel(verification(), { evidence: [docxCv] })

    const notice = within(
      await screen.findByRole('region', { name: EVIDENCE_COPY.en.title }),
    )
    expect(notice.getByText(/Curriculum vitae/)).toBeInTheDocument()
    expect(notice.getByText(/the format cannot be read/)).toBeInTheDocument()
  })

  it('warns that generation will be REFUSED when no document can be read', async () => {
    renderPanel(verification(), { evidence: [docxCv] })

    expect(await screen.findByText(/generation will be refused/i)).toBeInTheDocument()
    expect(screen.getByText(/re-upload the affected documents as PDF/i)).toBeInTheDocument()
  })

  it('does not cry refusal when at least one document is readable', async () => {
    renderPanel(verification(), { evidence: [docxCv, pdfCertificate] })

    expect(await screen.findByText(/1 of 2 uploaded documents will be read/)).toBeInTheDocument()
    expect(screen.queryByText(/generation will be refused/i)).not.toBeInTheDocument()
    // The withheld one is still named: a partial read is not a clean read.
    expect(screen.getByText(/Curriculum vitae/)).toBeInTheDocument()
  })

  it('says plainly when no evidence exists at all — a different case, not a refusal', async () => {
    renderPanel(verification(), { evidence: [] })

    expect(await screen.findByText(/No evidence has been uploaded/)).toBeInTheDocument()
    expect(screen.queryByText(/generation will be refused/i)).not.toBeInTheDocument()
  })

  it('says so when governance has switched document reading off', async () => {
    renderPanel(verification(), { evidence: [pdfCertificate], evidenceDocumentsEnabled: false })

    // The kill switch is a deliberate human choice, and the server does NOT
    // refuse under it. Claiming a refusal here would make the switch unusable.
    expect(await screen.findByText(/switched off in RPL settings/)).toBeInTheDocument()
    expect(screen.queryByText(/generation will be refused/i)).not.toBeInTheDocument()
  })

  it('renders the same warning in Arabic, the language this CMS defaults to', async () => {
    renderPanel(verification(), { evidence: [docxCv], language: 'ar' })

    expect(await screen.findByText(/سيُرفض التوليد/)).toBeInTheDocument()
    expect(screen.getByText(/الصيغة غير قابلة للقراءة/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })

  it('disappears once the questions are issued — the moment to check has passed', async () => {
    renderPanel(issued({ answeredCount: 25 }), { evidence: [docxCv] })

    await screen.findByRole('region', { name: COPY.en.progressTitle })
    expect(
      screen.queryByRole('region', { name: EVIDENCE_COPY.en.title }),
    ).not.toBeInTheDocument()
  })

  it('shows every line of a generation refusal, not just the headline', async () => {
    renderPanel(verification(), { evidence: [docxCv] })
    mocks.generateDynamicAssessmentDraft.mockRejectedValue({
      response: {
        status: 422,
        data: {
          message: 'The given data was invalid.',
          errors: {
            evidence_documents_unreadable: [
              'The questions must be generated from the applicant’s own documents.',
              '#12 cv.docx — the format cannot be read by the analysis engine',
              'Readable formats: PDF, PNG, JPEG, WEBP, HEIC, HEIF and plain text.',
            ],
          },
        },
      },
    })

    fireEvent.click(await screen.findByRole('button', { name: /Generate questions with Gemini/ }))

    // The filenames are the actionable part; showing only errors[key][0] drops
    // exactly the line that says which document to ask for again.
    const alert = await screen.findByText(/#12 cv.docx/)
    expect(alert).toHaveTextContent(/Readable formats/)
  })
})

describe('answer progress', () => {
  it('counts issued, answered and outstanding', async () => {
    renderPanel(issued({ answeredCount: 18 }))

    const progress = within(await screen.findByRole('region', { name: COPY.en.progressTitle }))
    expect(progress.getByText('25')).toBeInTheDocument()
    expect(progress.getByText('18')).toBeInTheDocument()
    expect(progress.getByText('7')).toBeInTheDocument()
  })

  it('keeps the final evaluation shut while questions are outstanding', async () => {
    renderPanel(issued({ status: 'answered', answeredCount: 18 }))

    const button = await screen.findByRole('button', { name: /Final advisory evaluation/ })
    expect(button).toBeDisabled()
    expect(screen.getByText(COPY.en.finalBlocked)).toBeInTheDocument()
    expect(mocks.finalEvaluateDynamicAssessment).not.toHaveBeenCalled()
  })

  it('opens the final evaluation once every issued question is answered', async () => {
    const complete = issued({
      status: 'answered',
      answeredCount: 25,
      answers_submitted_at: '2026-08-06T12:00:00Z',
    })
    renderPanel(complete)

    const button = await screen.findByRole('button', { name: /Final advisory evaluation/ })
    expect(button).toBeEnabled()

    fireEvent.click(button)
    await waitFor(() => expect(mocks.finalEvaluateDynamicAssessment).toHaveBeenCalledWith(7))
  })

  it('distinguishes "every answer given" from "submitted"', async () => {
    renderPanel(issued({ answeredCount: 25, answers_submitted_at: null }))

    expect(await screen.findByText(COPY.en.progressNotSubmitted)).toBeInTheDocument()
  })
})

describe('reopening the answering window', () => {
  const expired = () =>
    issued({ answeredCount: 9, opened_at: '2026-08-01T09:05:00Z', due_at: '2026-08-01T09:30:00Z' })

  it('offers the reopen only when the window has closed', async () => {
    renderPanel(expired())

    expect(
      await screen.findByRole('region', { name: COPY.en.reissueTitle }),
    ).toBeInTheDocument()
    expect(screen.getByText(COPY.en.reissueWhyExpired)).toBeInTheDocument()
  })

  it('does not offer it while the window is still open', async () => {
    renderPanel(issued({ answeredCount: 9, due_at: '2099-01-01T00:00:00Z' }))

    await screen.findByRole('region', { name: COPY.en.progressTitle })
    expect(screen.queryByRole('region', { name: COPY.en.reissueTitle })).not.toBeInTheDocument()
  })

  it('offers it for a set marked answered with questions still outstanding', async () => {
    renderPanel(issued({ status: 'answered', answeredCount: 18, answers_submitted_at: '2026-08-06T12:00:00Z' }))

    expect(await screen.findByRole('region', { name: COPY.en.reissueTitle })).toBeInTheDocument()
    expect(screen.getByText(COPY.en.reissueWhyIncomplete)).toBeInTheDocument()
  })

  it('does not offer it on a complete answered set', async () => {
    renderPanel(issued({ status: 'answered', answeredCount: 25, answers_submitted_at: '2026-08-06T12:00:00Z' }))

    await screen.findByRole('region', { name: COPY.en.progressTitle })
    expect(screen.queryByRole('region', { name: COPY.en.reissueTitle })).not.toBeInTheDocument()
  })

  it('requires a reason, and sends it', async () => {
    renderPanel(expired())
    mocks.reissueDynamicAssessment.mockResolvedValue({ data: {} })

    fireEvent.click(await screen.findByRole('button', { name: COPY.en.reissue }))

    const confirm = screen.getByRole('button', { name: COPY.en.reissueConfirm })
    // The server validates `reason` as required. Letting the click through with
    // an empty box turns a governance requirement into a 422.
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByLabelText(COPY.en.reissueReason), {
      target: { value: 'The applicant lost connection during the window.' },
    })
    expect(confirm).toBeEnabled()

    fireEvent.click(confirm)
    await waitFor(() =>
      expect(mocks.reissueDynamicAssessment).toHaveBeenCalledWith(7, {
        reason: 'The applicant lost connection during the window.',
      }),
    )
  })

  it('promises what reopening actually does — answers kept, new window', async () => {
    renderPanel(expired())

    expect(await screen.findByText(COPY.en.reissueNote)).toBeInTheDocument()
  })

  /*
   * The state that actually strands live cases. `due_at` is written when the
   * applicant OPENS the assessment, not when it is sent, so a delivered set
   * nobody opened has no deadline and can never expire — while it sits there,
   * every AI evaluation on that applicant is blocked.
   */
  it('offers the reopen on a set that was sent and never opened', async () => {
    renderPanel(issued({ answeredCount: 0, opened_at: null, due_at: null }))

    expect(await screen.findByRole('region', { name: COPY.en.reissueTitle })).toBeInTheDocument()
    expect(screen.getByText(COPY.en.reissueWhyNeverOpened)).toBeInTheDocument()
  })

  it('offers the reopen on an assessed set with questions still outstanding', async () => {
    // What the old unconditional flip plus the old evaluation produced.
    renderPanel(issued({ status: 'assessed', answeredCount: 3, answers_submitted_at: '2026-08-06T12:00:00Z' }))

    expect(await screen.findByRole('region', { name: COPY.en.reissueTitle })).toBeInTheDocument()
    expect(screen.getByText(COPY.en.reissueWhyIncomplete)).toBeInTheDocument()
  })
})

describe('withdrawing a question set the applicant will not finish', () => {
  it('is offered on a delivered set with questions outstanding', async () => {
    renderPanel(issued({ answeredCount: 4 }))

    const section = within(await screen.findByRole('region', { name: COPY.en.withdrawTitle }))
    // The screen has to say what it costs and what it does not: nothing is
    // deleted, and a withdrawn set never becomes evidence or a gap.
    expect(section.getByText(COPY.en.withdrawNote)).toBeInTheDocument()
  })

  it('is not offered once the applicant has answered everything', async () => {
    renderPanel(issued({ answeredCount: 25, answers_submitted_at: '2026-08-06T12:00:00Z' }))

    await screen.findByRole('region', { name: COPY.en.progressTitle })
    expect(screen.queryByRole('region', { name: COPY.en.withdrawTitle })).not.toBeInTheDocument()
  })

  it('is not offered on a set that has already been answered or assessed', async () => {
    renderPanel(issued({ status: 'answered', answeredCount: 9, answers_submitted_at: '2026-08-06T12:00:00Z' }))

    await screen.findByRole('region', { name: COPY.en.progressTitle })
    // An applicant who HAS answered has been heard; withdrawing that would
    // discard the one thing the ordering rule protects. Reopen instead.
    expect(screen.queryByRole('region', { name: COPY.en.withdrawTitle })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: COPY.en.reissueTitle })).toBeInTheDocument()
  })

  it('requires a reason, and sends it', async () => {
    renderPanel(issued({ answeredCount: 4 }))
    mocks.cancelDynamicAssessment.mockResolvedValue({ data: {} })

    fireEvent.click(await screen.findByRole('button', { name: COPY.en.withdraw }))

    const confirm = screen.getByRole('button', { name: COPY.en.withdrawConfirm })
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByLabelText(COPY.en.withdrawReason), {
      target: { value: 'The applicant withdrew and will not be answering.' },
    })
    fireEvent.click(confirm)

    await waitFor(() =>
      expect(mocks.cancelDynamicAssessment).toHaveBeenCalledWith(7, {
        reason: 'The applicant withdrew and will not be answering.',
      }),
    )
  })
})

describe('the copy itself', () => {
  it('keeps every key in all three language blocks', () => {
    /*
     * THE MISSING-KEY CLASS OF BUG. Lookup is a whole-object fallback with no
     * per-key rescue, so a key present in en and absent from ar renders the
     * literal string "undefined" — in the language the admin actually reads.
     */
    const paths = (block, prefix = '') =>
      Object.entries(block).flatMap(([key, value]) =>
        value && typeof value === 'object' && !Array.isArray(value)
          ? paths(value, `${prefix}${key}.`)
          : [`${prefix}${key}`],
      )

    const en = paths(COPY.en).sort()
    expect(paths(COPY.ar).sort()).toEqual(en)
    expect(paths(COPY.nl).sort()).toEqual(en)

    const evidenceEn = paths(EVIDENCE_COPY.en).sort()
    expect(paths(EVIDENCE_COPY.ar).sort()).toEqual(evidenceEn)
    expect(paths(EVIDENCE_COPY.nl).sort()).toEqual(evidenceEn)
  })

  it('no longer claims the model works from the profile alone', async () => {
    renderPanel(verification())

    expect(await screen.findByText(/own uploaded documents/)).toBeInTheDocument()
    expect(screen.getByText(/no evaluation runs until the applicant has answered every question/))
      .toBeInTheDocument()
  })
})
