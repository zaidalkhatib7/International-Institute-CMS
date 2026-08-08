import { describe, expect, it } from 'vitest'
import {
  MAX_DOCUMENT_BYTES,
  MAX_READABLE_DOCUMENTS,
  projectEvidenceReadability,
} from './evidenceReadability'

/*
 * THE .docx CV IS THE WHOLE POINT.
 *
 * The platform accepts docx, xlsx, pptx, mp4 and mp3 at upload and the analysis
 * engine can read none of them. Most CVs are .docx. So the case these tests
 * protect is an application carrying documents, contributing nothing, and
 * producing questions that read as though somebody had studied the applicant.
 */

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const pdf = (id, size = 1024) => ({
  id,
  title: `Certificate ${id}`,
  media: { original_name: `cert-${id}.pdf`, mime_type: 'application/pdf', size },
})

describe('projectEvidenceReadability', () => {
  it('reads PDFs, images and plain text', () => {
    const projection = projectEvidenceReadability([
      pdf(1),
      { id: 2, title: 'Scan', media: { mime_type: 'image/jpeg', size: 2048 } },
      { id: 3, title: 'Notes', media: { mime_type: 'text/plain', size: 64 } },
    ])

    expect(projection.readable).toHaveLength(3)
    expect(projection.withheld).toEqual([])
    expect(projection.generationWillRefuse).toBe(false)
  })

  it('withholds a .docx CV and says the format is the reason', () => {
    const projection = projectEvidenceReadability([
      {
        id: 12,
        title: 'Curriculum vitae',
        media: {
          original_name: 'cv.docx',
          mime_type:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 40_000,
        },
      },
    ])

    expect(projection.readable).toEqual([])
    expect(projection.withheld[0]).toMatchObject({ evidence_id: 12, reason: 'unsupported_format' })
    // Documents exist and none can be read: the server refuses outright.
    expect(projection.generationWillRefuse).toBe(true)
  })

  it('does NOT predict a refusal when there is no evidence at all', () => {
    const projection = projectEvidenceReadability([])

    // A different case entirely, and the server generates normally: there is
    // nothing there to have failed to read.
    expect(projection.hasEvidence).toBe(false)
    expect(projection.generationWillRefuse).toBe(false)
  })

  it('withholds an external link, which has no file behind it', () => {
    const projection = projectEvidenceReadability([{ id: 4, title: 'LinkedIn profile' }])

    expect(projection.withheld[0]).toMatchObject({ reason: 'no_uploaded_file' })
  })

  it('does NOT predict a refusal for evidence that is entirely links or declarations', () => {
    const projection = projectEvidenceReadability([
      { id: 4, title: 'LinkedIn profile' },
      { id: 5, title: 'Self-declaration of practice' },
    ])

    /*
     * The server refuses only when an uploaded FILE could not be read. A URL the
     * applicant supplied deliberately never had a file to fail, so warning here
     * would send the administrator chasing a document that does not exist — and
     * the remedy the warning offers, "re-upload it as a PDF", is not a thing
     * anyone can do to a link.
     */
    expect(projection.readable).toHaveLength(0)
    expect(projection.generationWillRefuse).toBe(false)
  })

  it('predicts the refusal when a link sits beside an unreadable upload', () => {
    const projection = projectEvidenceReadability([
      { id: 4, title: 'LinkedIn profile' },
      { id: 5, title: 'Curriculum vitae', media: { mime_type: DOCX_MIME, size: 40_000 } },
    ])

    // One real file existed and could not be read. That is the refusal.
    expect(projection.generationWillRefuse).toBe(true)
  })

  it('withholds a document over the per-document ceiling', () => {
    const projection = projectEvidenceReadability([pdf(5, MAX_DOCUMENT_BYTES + 1)])

    expect(projection.withheld[0]).toMatchObject({ reason: 'file_too_large' })
  })

  it('stops at the reader’s real document ceiling, which is six and not twelve', () => {
    const rows = Array.from({ length: MAX_READABLE_DOCUMENTS + 2 }, (_, index) => pdf(index + 1))
    const projection = projectEvidenceReadability(rows)

    /*
     * The reader's constant is MAX_DOCUMENTS = 12, but it counts PARTS and
     * appends two per document (a label and the inline data), so the seventh
     * document is the first refused. Telling the administrator all eight will be
     * read when two silently will not is the failure this whole file exists to
     * prevent.
     */
    expect(projection.readable).toHaveLength(MAX_READABLE_DOCUMENTS)
    expect(projection.withheld).toHaveLength(2)
    expect(projection.withheld[0]).toMatchObject({ reason: 'document_limit_reached' })
  })

  it('withholds once the whole-request size ceiling would be crossed', () => {
    const projection = projectEvidenceReadability([
      pdf(1, 4 * 1024 * 1024),
      pdf(2, 4 * 1024 * 1024),
      pdf(3, 4 * 1024 * 1024),
      pdf(4, 4 * 1024 * 1024),
    ])

    expect(projection.readable).toHaveLength(3)
    expect(projection.withheld[0]).toMatchObject({
      evidence_id: 4,
      reason: 'request_size_limit_reached',
    })
  })

  it('treats a mixed set as partial rather than refused', () => {
    const projection = projectEvidenceReadability([
      pdf(1),
      { id: 2, title: 'Recording', media: { mime_type: 'video/mp4', size: 500 } },
    ])

    expect(projection.readable).toHaveLength(1)
    expect(projection.withheld).toHaveLength(1)
    expect(projection.generationWillRefuse).toBe(false)
  })

  it('is case- and whitespace-insensitive about the mime type', () => {
    const projection = projectEvidenceReadability([
      { id: 1, title: 'Scan', media: { mime_type: ' APPLICATION/PDF ', size: 10 } },
    ])

    expect(projection.readable).toHaveLength(1)
  })

  it('survives a missing evidence list', () => {
    expect(projectEvidenceReadability(undefined)).toMatchObject({
      total: 0,
      hasEvidence: false,
      generationWillRefuse: false,
    })
  })
})
