import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EvidenceUploadCenter from './EvidenceUploadCenter'
import { MAX_EVIDENCE_FILE_SIZE } from '../domain/rpl'

const service = vi.hoisted(() => ({ reviewRplEvidence: vi.fn() }))

// Partial: only the review call is answered here.
vi.mock('../services/rplService', async (importOriginal) => ({
  ...(await importOriginal()),
  reviewRplEvidence: service.reviewRplEvidence,
}))

// The API's refusal of a reason that reads like a screening result: English,
// naming an Arabic fragment, under the generic heading in the reader's language.
const REFUSAL = 'This text is sent to the applicant, so it may not contain a percentage or words such as fake, forged, counterfeit or fraud (مزور، مزيف، تزوير، احتيال). Document-screening results are for staff only: say what the applicant should provide instead. Refused wording: "\u2068مزورة\u2069".'

describe('EvidenceUploadCenter', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:evidence-preview')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('uses RTL direction and exposes the required multi-file picker in Arabic', () => {
    const { container } = render(<EvidenceUploadCenter applicationId="case-uuid" language="ar" />)
    expect(screen.getByRole('heading', { name: 'مركز رفع الأدلة والتحقق' }).closest('section')).toHaveAttribute('dir', 'rtl')
    const input = container.querySelector('input[type="file"]')
    expect(input).toHaveAttribute('multiple')
    expect(input.accept).toContain('.pdf')
    expect(input.accept).toContain('.mp4')
  })

  it('queues multiple valid files and shows client-side size validation', () => {
    const { container } = render(<EvidenceUploadCenter applicationId="case-uuid" language="en" />)
    const input = container.querySelector('input[type="file"]')
    const pdf = new File(['pdf'], 'experience.pdf', { type: 'application/pdf' })
    const photo = new File(['jpg'], 'identity.jpg', { type: 'image/jpeg' })
    const large = new File(['large'], 'large.pdf', { type: 'application/pdf' })
    Object.defineProperty(large, 'size', { value: MAX_EVIDENCE_FILE_SIZE + 1 })

    fireEvent.change(input, { target: { files: [pdf, photo, large] } })

    expect(screen.getByText('experience.pdf')).toBeInTheDocument()
    expect(screen.getByText('identity.jpg')).toBeInTheDocument()
    expect(screen.getByText('large.pdf')).toBeInTheDocument()
    expect(screen.getByText('The file exceeds the 50 MB limit.')).toBeInTheDocument()
  })

  it('keeps LTR direction in English', () => {
    render(<EvidenceUploadCenter applicationId="case-uuid" language="en" />)
    expect(screen.getByRole('heading', { name: 'Evidence & Verification Upload Center' }).closest('section')).toHaveAttribute('dir', 'ltr')
  })

  it('renders only standard-scoped categories and authoritative completeness', () => {
    render(
      <EvidenceUploadCenter
        applicationId="case-uuid"
        language="en"
        categories={[{ id: 7, code: 'portfolio', name: { en: 'Portfolio' }, accepts_files: true }]}
        completeness={{ percentage: 37.5, declaration: { accepted: false } }}
      />
    )

    expect(screen.getByRole('option', { name: 'Portfolio' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Personal identity' })).not.toBeInTheDocument()
    expect(screen.getByText('38% complete')).toBeInTheDocument()
  })

  /*
   * In the Arabic CMS the refusal sits in a right-to-left page: read as one
   * right-to-left paragraph, the quoted fragment and its quotes drift away from
   * "Refused wording". Each line keeps its own direction, and the line breaks
   * between the heading and the detail stay.
   */
  it('shows a refused review reason line by line, each line in its own direction', async () => {
    service.reviewRplEvidence.mockRejectedValue({ response: { status: 422, data: { message: 'The given data was invalid.', errors: { reason: [REFUSAL] } } } })
    render(<EvidenceUploadCenter applicationId="case-uuid" language="ar" evidence={[{ public_id: 'evidence-1', title: 'خطاب الخبرة', status: 'new', kind: 'url', external_url: 'https://example.org/letter' }]} />)

    fireEvent.change(screen.getByLabelText('سبب القرار أو الملاحظة'), { target: { value: 'الوثيقة مزورة' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ نتيجة المراجعة' }))

    const message = await screen.findByText((content) => content.includes('Refused wording'))
    expect(message.textContent).toContain('\n\n' + REFUSAL)
    expect(message).toHaveClass('whitespace-pre-line', '[unicode-bidi:plaintext]')
  })

  it('blocks file selection when the standard has no upload category', () => {
    const { container } = render(<EvidenceUploadCenter applicationId="case-uuid" language="en" categories={[]} />)
    expect(screen.getByRole('button', { name: /choose files/i })).toBeDisabled()
    expect(screen.getByText(/no evidence categories are enabled/i)).toBeInTheDocument()
    expect(container.querySelector('input[type="file"]')).toBeInTheDocument()
  })
})
