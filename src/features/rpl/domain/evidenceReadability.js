/*
 * WHICH APPLICANT FILES THE MODEL CAN ACTUALLY READ.
 *
 * The owner's rule is that the questions are built from the client's files. Five
 * formats the platform ACCEPTS at upload — docx, xlsx, pptx, mp4, mp3 — can never
 * be parsed by the analysis engine, and most CVs are .docx. So an application can
 * carry eight documents, contribute none of them, and produce twenty-five
 * plausible-looking "individualised" questions built from titles alone. The
 * server now refuses that outright, but a refusal after a two-minute generation
 * attempt is the wrong moment to learn it: the fix is to ask the applicant for a
 * different file, and the administrator needs to know that BEFORE pressing
 * generate.
 *
 * This is a PROJECTION, not the decision. It mirrors
 * app/Services/RplAdvisoryEvidenceReader.php over the upload metadata the screen
 * already holds. The server reads the bytes and is the authority — it can still
 * withhold a file this projection expects to be read (a stored object that has
 * gone missing, or one whose real size differs from what the uploader reported).
 * It cannot go the other way: nothing the server reads is invisible here.
 */

/** RplAdvisoryEvidenceReader::SUPPORTED_MIME_TYPES. */
export const READABLE_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
  'text/plain',
]

/** RplAdvisoryEvidenceReader::MAX_DOCUMENT_BYTES. */
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024

/** RplAdvisoryEvidenceReader::MAX_TOTAL_BYTES — the whole-request ceiling. */
export const MAX_TOTAL_BYTES = 14 * 1024 * 1024

/*
 * SIX, NOT TWELVE, AND THAT IS DELIBERATE.
 *
 * The reader's ceiling is `count($parts) >= MAX_DOCUMENTS` with MAX_DOCUMENTS = 12,
 * but it appends TWO parts per document — a label part and the inline data — so
 * the seventh document is the first one refused. This mirrors what the server
 * does, not what its constant is named. If the server is corrected to count
 * documents, raise this to 12 with it.
 */
export const MAX_READABLE_DOCUMENTS = 6

/** The reader's machine reason codes. The UI translates them; the manifest stores them. */
export const WITHHELD_REASONS = [
  'no_uploaded_file',
  'unsupported_format',
  'file_too_large',
  'document_limit_reached',
  'request_size_limit_reached',
  'file_unreadable',
]

/*
 * The reasons that mean A FILE EXISTED AND COULD NOT BE READ, which is the only
 * thing the server refuses generation over. External-link and declaration-only
 * evidence is withheld as `no_uploaded_file` — nothing failed there, and telling
 * the administrator to "re-upload it as a PDF" would be nonsense advice about a
 * URL the applicant supplied deliberately.
 */
const UNREADABLE_FILE_REASONS = ['unsupported_format', 'file_too_large', 'file_unreadable']

function describe(item, extra = {}) {
  return {
    evidence_id: item?.id ?? null,
    title: item?.title || item?.media?.original_name || null,
    ...extra,
  }
}

/**
 * Project which uploaded documents the analysis engine will read.
 *
 * @param {Array} evidence the application's evidence rows, each with an optional `media`
 * @returns {{total: number, readable: Array, withheld: Array, hasEvidence: boolean, generationWillRefuse: boolean}}
 */
export function projectEvidenceReadability(evidence) {
  const rows = Array.isArray(evidence) ? evidence : []
  const readable = []
  const withheld = []
  let totalBytes = 0

  for (const item of rows) {
    if (readable.length >= MAX_READABLE_DOCUMENTS) {
      withheld.push(describe(item, { reason: 'document_limit_reached' }))
      continue
    }

    const media = item?.media
    if (!media) {
      // External-link and declaration-only evidence have no file at all.
      withheld.push(describe(item, { reason: 'no_uploaded_file' }))
      continue
    }

    const mime = String(media.mime_type || '').trim().toLowerCase()
    if (!READABLE_MIME_TYPES.includes(mime)) {
      withheld.push(describe(item, { reason: 'unsupported_format', mime_type: mime }))
      continue
    }

    const size = Number(media.size) || 0
    if (size > MAX_DOCUMENT_BYTES) {
      withheld.push(describe(item, { reason: 'file_too_large', size }))
      continue
    }

    if (totalBytes + size > MAX_TOTAL_BYTES) {
      withheld.push(describe(item, { reason: 'request_size_limit_reached', size }))
      continue
    }

    totalBytes += size
    readable.push(describe(item, { mime_type: mime, size }))
  }

  return {
    total: rows.length,
    readable,
    withheld,
    hasEvidence: rows.length > 0,
    /*
     * The exact condition GeminiRplAdvisoryService::assertEvidenceDocumentsReadable
     * refuses on: an uploaded FILE existed and not one could be read. Two shapes
     * deliberately do not refuse — an application with no evidence at all (nothing
     * there to have failed) and one whose evidence is entirely links or
     * declarations (no file ever existed). Warning on those would send the
     * administrator chasing a document the applicant never had.
     */
    generationWillRefuse:
      readable.length === 0 &&
      withheld.some((item) => UNREADABLE_FILE_REASONS.includes(item.reason)),
  }
}
