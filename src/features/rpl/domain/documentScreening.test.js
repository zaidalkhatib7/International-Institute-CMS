import { describe, expect, it } from 'vitest'
import {
  CLAIMED_EMPLOYERS_COPY,
  SCREENING_COPY,
  SCREENING_SETTINGS_COPY,
  SCREENING_STALLED_AFTER_MINUTES,
  caseFigureText,
  claimedEmployersCopy,
  fill,
  humanizeCode,
  isPartialScreen,
  isStalledRun,
  labelFor,
  readClaimedEmployers,
  safeExternalUrl,
  screeningCopy,
  screeningSettingsCopy,
  statusExplanation,
} from './documentScreening'

const TABLES = { SCREENING_COPY, SCREENING_SETTINGS_COPY, CLAIMED_EMPLOYERS_COPY }

function paths(block, prefix = '') {
  return Object.entries(block).flatMap(([key, value]) =>
    value && typeof value === 'object' && !Array.isArray(value) ? paths(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  )
}

function strings(block) {
  return Object.values(block).flatMap((value) => (value && typeof value === 'object' ? strings(value) : [String(value)]))
}

describe('the screening copy', () => {
  it.each(Object.entries(TABLES))('%s has Arabic and English only, with the same keys', (_, table) => {
    // Dutch was removed from the platform (owner, 13 Oct 2026).
    expect(Object.keys(table).sort()).toEqual(['ar', 'en'])
    expect(paths(table.ar).sort()).toEqual(paths(table.en).sort())
  })

  it.each(Object.entries(TABLES))('%s never words a figure as a verdict', (_, table) => {
    for (const text of [...strings(table.en), ...strings(table.ar)]) {
      expect(text).not.toMatch(/fake|fraud|forged|clean/i)
    }
  })

  it('reads English for any language but Arabic', () => {
    expect(screeningCopy('nl')).toBe(SCREENING_COPY.en)
    expect(screeningCopy(undefined)).toBe(SCREENING_COPY.en)
    expect(screeningSettingsCopy('nl')).toBe(SCREENING_SETTINGS_COPY.en)
    expect(claimedEmployersCopy('ar')).toBe(CLAIMED_EMPLOYERS_COPY.ar)
  })

  it('carries the owner\'s fixed not-found sentence word for word', () => {
    expect(SCREENING_COPY.en.employerResult.not_found_online).toBe('No public online presence found. This does not mean the company does not exist.')
    expect(SCREENING_COPY.ar.employerResult.not_found_online).toBe('لم يُعثر على حضور عام لها على الإنترنت. هذا لا يعني أن الجهة غير موجودة.')
  })

  it('fills placeholders without ever writing "undefined"', () => {
    expect(fill('Re-run by {name}', { name: 'Admin' })).toBe('Re-run by Admin')
    expect(fill('Re-run by {name}', {})).toBe('Re-run by ')
  })
})

/*
 * The values the API publishes and emits (RplDocumentScreeningItem::WITHHELD_REASONS
 * and RplEmployerCheck::FLAGS, pinned on the API side by
 * RplDocumentScreeningSchemaTest). Every one needs words in both languages, or an
 * Arabic page shows English snake-case.
 */
const API_WITHHELD_REASONS = [
  'no_uploaded_file', 'unsupported_format', 'file_too_large', 'document_limit_reached', 'request_size_limit_reached', 'file_unreadable',
  'category_excluded', 'docx_text_not_extractable', 'not_read', 'not_assessed_by_model', 'not_assessable', 'no_supported_figure',
  'run_failed', 'screening_disabled', 'reading_disabled', 'declaration_predates_screening', 'nothing_readable', 'provider_error',
]

const API_EMPLOYER_FLAGS = [
  'privacy_query_breach', 'ungrounded_sources_dropped', 'result_capped_without_grounded_source', 'result_capped_without_search',
  'employer_search_failed', 'not_searched_names_applicant', 'website_not_sent_names_applicant', 'sources_unattributable',
]

/*
 * GeminiRplDocumentScreeningService::EXTRACTION_ONLY_FLAG_DETAILS: the detail the
 * API stores on every flag an identity document keeps, in place of the model's
 * own words (D20(c)). The page shows its own copy of it, by code.
 */
const API_EXTRACTION_ONLY_FLAG_DETAILS = {
  name_mismatch: 'A name on this document differs from a name on another document or in the claims; compare the extracted name.',
  date_inconsistency: 'A date on this document differs from a date on another document or in the claims; compare the extracted dates.',
  embedded_instructions: 'This document carries text addressed to the screen; it is listed under the instructions found in documents.',
}

describe('the detail of a flag on an extraction-only document', () => {
  it('is the API\'s sentence word for word in English, and Arabic words in Arabic, for every flag such a document may keep', () => {
    expect(SCREENING_COPY.en.extractionOnlyFlagDetails).toEqual(API_EXTRACTION_ONLY_FLAG_DETAILS)
    expect(Object.keys(SCREENING_COPY.ar.extractionOnlyFlagDetails).sort()).toEqual(Object.keys(API_EXTRACTION_ONLY_FLAG_DETAILS).sort())
    for (const code of Object.keys(API_EXTRACTION_ONLY_FLAG_DETAILS)) {
      expect(SCREENING_COPY.ar.extractionOnlyFlagDetails[code]).toMatch(/[؀-ۿ]/)
      expect(SCREENING_COPY.ar.extractionOnlyFlagDetails[code]).not.toBe(API_EXTRACTION_ONLY_FLAG_DETAILS[code])
    }
  })
})

describe('every value the API sends has words in both languages', () => {
  it.each(['ar', 'en'])('withheld reasons, in %s', (language) => {
    for (const reason of API_WITHHELD_REASONS) {
      expect(SCREENING_COPY[language].withheldReasons[reason], reason).toEqual(expect.any(String))
      expect(labelFor(SCREENING_COPY[language].withheldReasons, reason)).not.toBe(humanizeCode(reason))
    }
    expect(Object.keys(SCREENING_COPY[language].withheldReasons).sort()).toEqual([...API_WITHHELD_REASONS].sort())
  })

  it.each(['ar', 'en'])('employer flags, in %s', (language) => {
    for (const flag of API_EMPLOYER_FLAGS) {
      expect(SCREENING_COPY[language].employerFlags[flag], flag).toEqual(expect.any(String))
    }
    expect(Object.keys(SCREENING_COPY[language].employerFlags).sort()).toEqual([...API_EMPLOYER_FLAGS].sort())
  })

  it('the Arabic words are Arabic, not the English copied over', () => {
    for (const reason of API_WITHHELD_REASONS) {
      expect(SCREENING_COPY.ar.withheldReasons[reason]).not.toBe(SCREENING_COPY.en.withheldReasons[reason])
      expect(SCREENING_COPY.ar.withheldReasons[reason]).toMatch(/[؀-ۿ]/)
    }
    for (const flag of API_EMPLOYER_FLAGS) {
      expect(SCREENING_COPY.ar.employerFlags[flag]).toMatch(/[؀-ۿ]/)
    }
  })
})

describe('a stalled run', () => {
  const now = Date.parse('2026-10-13T12:00:00Z')
  const minutesAgo = (minutes) => new Date(now - minutes * 60 * 1000).toISOString()

  it('is a queued run requested, or a running run started, more than 30 minutes ago', () => {
    expect(SCREENING_STALLED_AFTER_MINUTES).toBe(30)
    expect(isStalledRun({ status: 'queued', created_at: minutesAgo(31) }, now)).toBe(true)
    expect(isStalledRun({ status: 'queued', created_at: minutesAgo(29) }, now)).toBe(false)
    // A run that waited behind others is judged from when it started, as the API does.
    expect(isStalledRun({ status: 'running', created_at: minutesAgo(120), started_at: minutesAgo(5) }, now)).toBe(false)
    expect(isStalledRun({ status: 'running', created_at: minutesAgo(120), started_at: minutesAgo(31) }, now)).toBe(true)
    expect(isStalledRun({ status: 'running', created_at: minutesAgo(31), started_at: null }, now)).toBe(true)
  })

  it('judges a running run from the start of its current attempt, as the API does: a retried run on its second attempt is not stuck', () => {
    // First started 45 minutes ago; the retry waited behind other jobs and started 5 minutes ago.
    const retried = { status: 'running', created_at: minutesAgo(60), started_at: minutesAgo(45), attempt_started_at: minutesAgo(5) }
    expect(isStalledRun(retried, now)).toBe(false)
    expect(statusExplanation(retried, SCREENING_COPY.en, now)).toBe(SCREENING_COPY.en.statusExplanation.running)
    expect(isStalledRun({ ...retried, attempt_started_at: minutesAgo(31) }, now)).toBe(true)
    // A row from before the API sent the field reads started_at.
    expect(isStalledRun({ ...retried, attempt_started_at: null }, now)).toBe(true)
  })

  it('is never a finished run, or one without a time', () => {
    for (const status of ['completed', 'failed', 'refused']) {
      expect(isStalledRun({ status, created_at: minutesAgo(600), started_at: minutesAgo(600) }, now)).toBe(false)
    }
    expect(isStalledRun({ status: 'queued', created_at: null }, now)).toBe(false)
    expect(isStalledRun(null, now)).toBe(false)
  })

  it('is explained as stuck, not as "usually finishes within a few minutes"', () => {
    const stuck = { status: 'queued', created_at: minutesAgo(45) }
    expect(statusExplanation(stuck, SCREENING_COPY.en, now)).toBe(fill(SCREENING_COPY.en.statusExplanation.stalled, { minutes: 30 }))
    expect(statusExplanation(stuck, SCREENING_COPY.ar, now)).toContain('30')
    expect(statusExplanation({ status: 'queued', created_at: minutesAgo(2) }, SCREENING_COPY.en, now)).toBe(SCREENING_COPY.en.statusExplanation.queued)
  })
})

describe('the case figure', () => {
  const completed = { status: 'completed', fake_likelihood_percent: 30, score_out_of_10: 3 }

  it('is one line for a completed run', () => {
    expect(caseFigureText(completed, SCREENING_COPY.en)).toBe('Authenticity risk 30% (3/10)')
    expect(caseFigureText(completed, SCREENING_COPY.ar)).toBe('مؤشر خطر الأصالة 30٪ (3/10)')
  })

  it.each(['queued', 'running', 'failed', 'refused'])('does not exist for a %s run, whatever its payload holds', (status) => {
    expect(caseFigureText({ ...completed, status, fake_likelihood_percent: 0, score_out_of_10: 0 }, SCREENING_COPY.en)).toBeNull()
  })

  it('does not exist when the run produced none', () => {
    expect(caseFigureText({ ...completed, fake_likelihood_percent: null }, SCREENING_COPY.en)).toBeNull()
    expect(statusExplanation({ ...completed, fake_likelihood_percent: null }, SCREENING_COPY.en)).toBe(SCREENING_COPY.en.completedNoFigure)
    // Documents may have been read but not assessed: the sentence never claims none was read.
    expect(SCREENING_COPY.en.completedNoFigure).toMatch(/assessed/)
    expect(SCREENING_COPY.en.completedNoFigure).not.toMatch(/was read/)
  })

  it('explains a refusal and never states a figure for it', () => {
    expect(statusExplanation({ status: 'refused', refusal_code: 'nothing_readable' }, SCREENING_COPY.en)).toBe(SCREENING_COPY.en.refusal.nothing_readable)
  })

  it('is partial when fewer documents were read than the case holds', () => {
    expect(isPartialScreen({ coverage: { documents_total: 5, read: 4 } })).toBe(true)
    expect(isPartialScreen({ coverage: { documents_total: 5, read: 5 } })).toBe(false)
    expect(isPartialScreen({})).toBe(false)
  })
})

describe('links and claimed employers', () => {
  it.each([
    ['https://example.test/a', 'https://example.test/a'],
    ['http://example.test', 'http://example.test/'],
    ['javascript:alert(1)', null],
    ['data:text/html,<b>x</b>', null],
    ['example.test', null],
    ['', null],
    [null, null],
  ])('%j is linkable as %j', (value, expected) => {
    expect(safeExternalUrl(value)).toBe(expected)
  })

  it('reads the frozen list on a submitted case, and the live profile only without one', () => {
    const frozen = [{ organization: 'Frozen Co' }]
    const live = [{ organization: 'Live Co' }]

    expect(readClaimedEmployers({ profile_snapshot: { work_experiences: frozen }, user: { work_experiences: live } })).toEqual({ source: 'snapshot', items: frozen })
    expect(readClaimedEmployers({ profile_snapshot: null, user: { work_experiences: live } })).toEqual({ source: 'profile', items: live })
    expect(readClaimedEmployers({})).toEqual({ source: null, items: [] })
  })
})
