import { describe, expect, it } from 'vitest'
import {
  MAX_DOCUMENT_BYTES,
  MAX_READABLE_DOCUMENTS,
  MAX_TOTAL_BYTES,
  base64EncodedSize,
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

  it('stops at the reader’s document ceiling, which is twelve documents', () => {
    const rows = Array.from({ length: 14 }, (_, index) => pdf(index + 1))
    const projection = projectEvidenceReadability(rows)

    /*
     * RplAdvisoryEvidenceReader::MAX_DOCUMENTS = 12, and the reader counts the
     * documents it included, not the two parts it sends for each. The
     * thirteenth is the first refused. This projection used to stop at six,
     * mirroring the reader's old part-counting bug, and so told administrators
     * that six of their twelve readable documents would be withheld.
     */
    expect(MAX_READABLE_DOCUMENTS).toBe(12)
    expect(projection.readable).toHaveLength(12)
    expect(projection.withheld).toHaveLength(2)
    expect(projection.withheld[0]).toMatchObject({ evidence_id: 13, reason: 'document_limit_reached' })
  })

  it('does not count a withheld document towards the ceiling', () => {
    const rows = [
      { id: 100, title: 'Curriculum vitae', media: { mime_type: DOCX_MIME, size: 40_000 } },
      ...Array.from({ length: 12 }, (_, index) => pdf(index + 1)),
    ]
    const projection = projectEvidenceReadability(rows)

    // The reader increments its count only for a document it actually sends.
    expect(projection.readable).toHaveLength(12)
    expect(projection.withheld).toEqual([
      expect.objectContaining({ evidence_id: 100, reason: 'unsupported_format' }),
    ])
  })

  it('sizes the request budget by the base64 payload, as the reader does', () => {
    expect(base64EncodedSize(0)).toBe(0)
    expect(base64EncodedSize(1)).toBe(4)
    expect(base64EncodedSize(3)).toBe(4)
    expect(base64EncodedSize(4)).toBe(8)
    expect(base64EncodedSize(MAX_DOCUMENT_BYTES)).toBe(5_592_408)
  })

  it('withholds a third 4 MiB scan, whose raw sizes would still fit under 14 MiB', () => {
    const projection = projectEvidenceReadability([
      pdf(1, MAX_DOCUMENT_BYTES),
      pdf(2, MAX_DOCUMENT_BYTES),
      pdf(3, MAX_DOCUMENT_BYTES),
    ])

    /*
     * Raw, the three add up to 12 MiB, under the 14 MiB ceiling. Encoded, which
     * is what the reader adds up, each is 5,592,408 bytes and the third would
     * take the request to 16,777,224 against 14,680,064. Summing raw sizes here
     * would promise a document the server withholds.
     */
    expect(3 * MAX_DOCUMENT_BYTES).toBeLessThan(MAX_TOTAL_BYTES)
    expect(projection.readable).toHaveLength(2)
    expect(projection.withheld).toEqual([
      expect.objectContaining({
        evidence_id: 3,
        reason: 'request_size_limit_reached',
        size: MAX_DOCUMENT_BYTES,
        encoded_size: 5_592_408,
      }),
    ])
  })

  it('still reads a smaller document that fits in the budget a larger one could not', () => {
    const projection = projectEvidenceReadability([
      pdf(1, MAX_DOCUMENT_BYTES),
      pdf(2, MAX_DOCUMENT_BYTES),
      pdf(3, MAX_DOCUMENT_BYTES),
      pdf(4, 1024),
    ])

    // The reader skips the one that does not fit and keeps going, so does this.
    expect(projection.readable.map((item) => item.evidence_id)).toEqual([1, 2, 4])
    expect(projection.withheld[0]).toMatchObject({ evidence_id: 3, reason: 'request_size_limit_reached' })
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
