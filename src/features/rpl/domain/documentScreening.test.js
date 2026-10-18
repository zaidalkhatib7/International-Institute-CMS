import { describe, expect, it } from 'vitest'
import {
  CLAIMED_EMPLOYERS_COPY,
  ISSUER_CHECKLIST,
  ISSUER_PRESENCE_FIELDS,
  ISSUER_TEXT_FIELDS,
  RISK_BAND_VARIANT,
  RISK_COMPONENTS,
  SCREENING_COPY,
  SCREENING_SETTINGS_COPY,
  SCREENING_STALLED_AFTER_MINUTES,
  caseFigureText,
  claimConfidenceLabel,
  claimedEmployersCopy,
  fill,
  humanizeCode,
  isOlderRulesRun,
  isPartialScreen,
  isRiskModelRun,
  isStalledRun,
  labelFor,
  missingChecklistText,
  namedInText,
  readClaimedEmployers,
  riskBandLabel,
  riskComponentText,
  riskNoteText,
  safeExternalUrl,
  screeningCopy,
  screeningSettingsCopy,
  sortRiskComponents,
  sourcesAreNotOwn,
  statusExplanation,
  topRiskReason,
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

  // The API's FORBIDDEN_ARABIC stems: no Arabic sentence may accuse, the new identity words included (owner report of 18 Oct 2026).
  it.each(Object.entries(TABLES))('%s carries no Arabic accusation, with or without diacritics', (_, table) => {
    for (const text of strings(table.ar)) {
      const bare = text.replace(/[ً-ْٰ]/g, '')
      expect(bare).not.toMatch(/وهمي|مزور|تزوير|احتيال|محتال|كاذب|كذاب/)
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

  it('says an employer that cannot be identified is unverified, word for word, never that it does not exist (owner report of 18 Oct 2026)', () => {
    expect(SCREENING_COPY.en.employerResult.not_identifiable).toBe('Cannot be identified: the name does not single out any one organisation, so the claim cannot be verified. Treat it as unverified.')
    expect(SCREENING_COPY.ar.employerResult.not_identifiable).toBe('لا يمكن تحديد هويتها: اسمها لا يميّز منشأة واحدة عن غيرها، فلا يمكن التحقق من الادعاء. تعامل معه بوصفه غير مُتحقَّق منه.')
    expect(SCREENING_COPY.en.employerResult.not_identifiable).not.toMatch(/does not exist|non-existent/i)
    expect(SCREENING_COPY.ar.employerResult.not_identifiable).not.toContain('غير موجودة')
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
  // Platform walk, 17 Oct 2026 (UI-14): no Gemini key is its own refusal.
  'provider_not_configured',
]

const API_EMPLOYER_FLAGS = [
  'privacy_query_breach', 'ungrounded_sources_dropped', 'result_capped_without_grounded_source', 'result_capped_without_search',
  'employer_search_failed', 'not_searched_names_applicant', 'website_not_sent_names_applicant', 'sources_unattributable',
  // rpl-screen-v3 (owner report of 18 Oct 2026): a name that singles out no organisation.
  'name_generic_platform_check', 'result_set_by_generic_name_rule', 'name_not_identifiable_document_reading',
  // Review of 18 Oct 2026: a generic name the search tied pages to; a not_identifiable only the search gave.
  'generic_name_found_by_search', 'name_not_identifiable_search_only',
]

/* RplEmployerCheck::RESULTS since rpl-screen-v3. */
const API_EMPLOYER_RESULTS = ['found_consistent', 'found_inconsistent', 'not_found_online', 'not_identifiable', 'ambiguous', 'not_checked']

/*
 * RplScreeningRiskCalculator (rpl-risk-v1): the component codes, the issuer
 * detail levels, the nine checklist items, the bands, the claim confidences and
 * who raises a component. Each is shown to staff, so each needs words.
 */
const API_RISK_COMPONENTS = ['organisation_name_generic', 'issuer_not_named', 'issuer_details_missing', 'claimed_employer_name_generic']
const API_DETAIL_LEVELS = ['several', 'most', 'no_contact_route', 'nearly_all']
const API_CHECKLIST = ['registration_number', 'address', 'contact', 'signatory_name', 'signatory_title', 'signature', 'stamp_or_seal', 'letterhead', 'issue_date']
const API_BANDS = ['none', 'low', 'attention', 'high', 'very_high']
const API_CLAIM_CONFIDENCES = ['medium', 'undetermined', 'low']
const API_RISK_SOURCES = ['platform_word_check', 'document_reading', 'employer_search']

const ARABIC = /[؀-ۿ]/

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

  it.each(['ar', 'en'])('employer results, in %s, all six and only those', (language) => {
    for (const result of API_EMPLOYER_RESULTS) {
      expect(SCREENING_COPY[language].employerResult[result], result).toEqual(expect.any(String))
    }
    expect(Object.keys(SCREENING_COPY[language].employerResult).sort()).toEqual([...API_EMPLOYER_RESULTS].sort())
  })

  it.each([
    ['risk components', 'riskComponents', API_RISK_COMPONENTS],
    ['issuer detail levels', 'riskDetailsLevel', API_DETAIL_LEVELS],
    ['checklist items', 'issuerChecklist', API_CHECKLIST],
    ['bands', 'riskBand', API_BANDS],
    ['claim confidences', 'claimConfidence', API_CLAIM_CONFIDENCES],
    ['risk sources', 'riskSource', API_RISK_SOURCES],
  ])('%s have words in both languages, Arabic in Arabic, and no others', (_, key, codes) => {
    for (const language of ['ar', 'en']) {
      expect(Object.keys(SCREENING_COPY[language][key]).sort(), `${language}.${key}`).toEqual([...codes].sort())
    }
    for (const code of codes) {
      const ar = SCREENING_COPY.ar[key][code]
      const en = SCREENING_COPY.en[key][code]
      for (const text of typeof ar === 'object' ? Object.values(ar) : [ar]) expect(text, `${key}.${code}`).toMatch(ARABIC)
      for (const text of typeof en === 'object' ? Object.values(en) : [en]) expect(text, `${key}.${code}`).toEqual(expect.any(String))
      expect(ar).not.toEqual(en)
    }
  })

  it('every component has a title and a reason; every issuer field and presence has a label', () => {
    for (const language of ['ar', 'en']) {
      for (const code of API_RISK_COMPONENTS) {
        expect(SCREENING_COPY[language].riskComponents[code]).toEqual({ title: expect.any(String), reason: expect.any(String) })
      }
      expect(Object.keys(SCREENING_COPY[language].issuerFields).sort()).toEqual([...ISSUER_TEXT_FIELDS, ...ISSUER_PRESENCE_FIELDS].sort())
      expect(Object.keys(SCREENING_COPY[language].presence).sort()).toEqual(['absent', 'present', 'unclear'])
      expect(Object.keys(SCREENING_COPY[language].issuerIdentifiable).sort()).toEqual(['no', 'unclear', 'yes'])
    }
    // The platform's own lists agree with the API's.
    expect(RISK_COMPONENTS).toEqual(API_RISK_COMPONENTS)
    expect(ISSUER_CHECKLIST).toEqual(API_CHECKLIST)
    expect(Object.keys(RISK_BAND_VARIANT).sort()).toEqual([...API_BANDS].sort())
  })
})

/*
 * THE W1b CASE (spec 4.8): the owner's letter from "Tourism Company", on plain
 * paper. The generic name (45) and nearly all issuer details missing (35)
 * combine to 64; the CV naming the same employer adds its own 20; the case is
 * the letter's 64.
 */
function w1bScreening(overrides = {}) {
  return {
    status: 'completed',
    prompt_version: 'rpl-screen-v3',
    fake_likelihood_percent: 64,
    score_out_of_10: 6.4,
    items: [
      { evidence_public_id: 'ev-letter', evidence_snapshot: { title: 'Experience letter' } },
      { evidence_public_id: 'ev-cv', evidence_snapshot: { title: 'CV' } },
    ],
    risk_breakdown: {
      version: 'rpl-risk-v1',
      word_lists: 'org-names-v1',
      case_percent: 64,
      model_case_percent: 0,
      highest_document_percent: 64,
      band: 'high',
      documents: [
        {
          evidence_public_id: 'ev-cv', class: 'cv', model_percent: 0, model_percent_unsupported: false, notes: [], document_percent: 20,
          components: [{ code: 'organisation_name_generic', weight: 20, names: ['Tourism Company'], sources: ['platform_word_check'] }],
        },
        {
          evidence_public_id: 'ev-letter', class: 'experience_letter', model_percent: 0, model_percent_unsupported: false, notes: [], document_percent: 64,
          components: [
            { code: 'issuer_details_missing', weight: 35, level: 'nearly_all', missing: ['registration_number', 'address', 'contact', 'signatory_name', 'stamp_or_seal', 'letterhead'], missing_count: 6, contact_route: false },
            { code: 'organisation_name_generic', weight: 45, names: ['Tourism Company'], sources: ['platform_word_check', 'employer_search'] },
          ],
        },
      ],
      case_components: [],
    },
    ...overrides,
  }
}

describe('the risk model run (rpl-risk-v1)', () => {
  const EN = SCREENING_COPY.en
  const AR = SCREENING_COPY.ar

  it('is a run that carries risk_breakdown; an older run is not', () => {
    expect(isRiskModelRun(w1bScreening())).toBe(true)
    expect(isRiskModelRun(w1bScreening({ risk_breakdown: null }))).toBe(false)
    expect(isRiskModelRun({ status: 'completed', prompt_version: 'rpl-screen-v2' })).toBe(false)
    expect(isRiskModelRun({ risk_breakdown: [] })).toBe(false)
    expect(isRiskModelRun(null)).toBe(false)
  })

  it('names the band of a completed run, and none for an older or unfinished one', () => {
    expect(riskBandLabel(w1bScreening(), EN)).toBe('High attention')
    expect(riskBandLabel(w1bScreening(), AR)).toBe('انتباه مرتفع')
    expect(riskBandLabel(w1bScreening({ risk_breakdown: { ...w1bScreening().risk_breakdown, band: 'very_high' } }), EN)).toBe('Very high attention')
    expect(riskBandLabel(w1bScreening({ risk_breakdown: { ...w1bScreening().risk_breakdown, band: null } }), EN)).toBeNull()
    expect(riskBandLabel(w1bScreening({ status: 'refused' }), EN)).toBeNull()
    expect(riskBandLabel({ status: 'completed', fake_likelihood_percent: 30 }, EN)).toBeNull()
  })

  it('never shows a band as success: a low figure is not a clearance', () => {
    expect(RISK_BAND_VARIANT).toEqual({ none: 'neutral', low: 'neutral', attention: 'warning', high: 'danger', very_high: 'danger' })
  })

  it('fills a name component with the names, the document, its weight and who raised it', () => {
    const generic = { code: 'organisation_name_generic', weight: 45, names: ['Tourism Company'], sources: ['platform_word_check', 'employer_search'] }

    expect(riskComponentText(generic, { documentTitle: 'Experience letter' }, EN)).toEqual({
      title: "The organisation's name identifies no one organisation",
      reason: '"Tourism Company" on "Experience letter" does not single out one organisation, so the organisation cannot be identified and what the document attests cannot be verified. Treat it as unverified.',
      weight: 'Weight 45%: on its own it would put the document at 45%.',
      sources: "Raised by: the platform's word check (no AI), the employer search",
    })
    const arabic = riskComponentText(generic, { documentTitle: 'خطاب خبرة' }, AR)
    expect(arabic.reason).toBe('«Tourism Company» في «خطاب خبرة» لا يميّز منشأة واحدة عن غيرها، فلا يمكن معرفة الجهة ولا التحقق مما تشهد به الوثيقة. تعامل معه بوصفه غير مُتحقَّق منه.')
    expect(arabic.weight).toBe('وزنها 45٪: لو كانت وحدها لكان مؤشر الوثيقة 45٪.')
    expect(arabic.sources).toBe('رصدها: فحص المنصة للكلمات (دون ذكاء اصطناعي)، البحث عن جهة العمل')
  })

  it('fills the issuer details with the level, the count and the missing items, and no sources line', () => {
    const details = { code: 'issuer_details_missing', weight: 35, level: 'nearly_all', missing: ['registration_number', 'address', 'contact', 'signatory_name', 'stamp_or_seal', 'letterhead'], missing_count: 6, contact_route: false }

    const text = riskComponentText(details, { documentTitle: 'Experience letter' }, EN)
    expect(text.title).toBe('Issuer details are missing')
    expect(text.reason).toBe("The letter carries almost nothing that identifies its issuer: there is no way to contact or check it, and 6 of 9 details are missing. Missing: registration or licence number, address, phone, email or website, signatory's name, stamp or seal, letterhead.")
    expect(text.weight).toBe('Weight 35%: on its own it would put the document at 35%.')
    expect(text.sources).toBeNull()
    expect(riskComponentText(details, {}, AR).reason).toBe('لا يكاد الخطاب يحمل ما يعرّف بجهة الإصدار: لا سبيل للتواصل معها أو التحقق منها، و6 من 9 بيانات ناقصة. الناقص: رقم السجل التجاري أو الترخيص، العنوان، هاتف أو بريد إلكتروني أو موقع، اسم الموقّع، الختم، الترويسة.')
    expect(riskComponentText({ ...details, level: 'several', missing: ['registration_number', 'stamp_or_seal', 'letterhead', 'signatory_title'], missing_count: 4 }, {}, EN).reason)
      .toBe("4 of 9 details that identify the issuer are missing, but the letter gives a way to contact or check it. Missing: registration or licence number, stamp or seal, letterhead, signatory's title.")
  })

  it('weighs a claimed employer at case level, and an unnamed issuer by its document', () => {
    const claimed = riskComponentText({ code: 'claimed_employer_name_generic', weight: 30, names: ['Trading Company LLC', 'شركة سياحة'], sources: ['platform_word_check'] }, {}, EN)
    expect(claimed.reason).toBe('"Trading Company LLC, شركة سياحة" does not single out one organisation, and no document read identifies it. The claim is unverified.')
    expect(claimed.weight).toBe('Weight 30% at case level.')

    const unnamed = riskComponentText({ code: 'issuer_not_named', weight: 45, sources: ['document_reading'] }, { documentTitle: 'Reference letter' }, EN)
    expect(unnamed.reason).toBe('No organisation is named on "Reference letter", so who issued it cannot be known or checked.')
    expect(unnamed.sources).toBe('Raised by: the document reading')
  })

  it('shows a component code it does not know yet in words, never "undefined"', () => {
    const text = riskComponentText({ code: 'issuer_seal_unreadable', weight: 5 }, { documentTitle: 'Letter' }, EN)
    expect(text.title).toBe('issuer seal unreadable')
    expect(text.reason).toBe('')
    expect(JSON.stringify(text)).not.toContain('undefined')
  })

  it('lists components in the API\'s order, an unknown code last', () => {
    const sorted = sortRiskComponents([{ code: 'zzz' }, { code: 'issuer_details_missing' }, { code: 'organisation_name_generic' }, null, { code: 'issuer_not_named' }])
    expect(sorted.map((component) => component.code)).toEqual(['organisation_name_generic', 'issuer_not_named', 'issuer_details_missing', 'zzz'])
  })

  it('words the missing checklist for each language', () => {
    expect(missingChecklistText(['address', 'contact', 'issue_date'], EN)).toBe('address, phone, email or website, issue date')
    expect(missingChecklistText(['address', 'issue_date'], AR)).toBe('العنوان، تاريخ الإصدار')
    expect(missingChecklistText(null, EN)).toBe('')
  })

  it('words a breakdown note, and shows an unknown one in words', () => {
    expect(riskNoteText('issuer_details_not_reported', EN)).toBe(EN.riskNoteDetailsNotReported)
    expect(riskNoteText('issuer_details_not_reported', AR)).toBe(AR.riskNoteDetailsNotReported)
    expect(riskNoteText('something_new', EN)).toBe('something new')
  })
})

describe('what raised the figure most', () => {
  const EN = SCREENING_COPY.en
  const AR = SCREENING_COPY.ar
  const breakdown = w1bScreening().risk_breakdown

  it('is the heaviest component, named with its document', () => {
    expect(topRiskReason(w1bScreening(), EN)).toBe('What raised it most: "Tourism Company" on "Experience letter" does not single out one organisation, so the organisation cannot be identified and what the document attests cannot be verified. Treat it as unverified.')
    expect(topRiskReason(w1bScreening(), AR)).toContain('أكثر ما رفع المؤشر: «Tourism Company» في «Experience letter»')
  })

  it('on a tie, prefers a document\'s component to the case\'s, then the API\'s order', () => {
    const tie = w1bScreening({
      risk_breakdown: {
        ...breakdown,
        highest_document_percent: 51,
        documents: [{ evidence_public_id: 'ev-letter', model_percent: 0, document_percent: 51, components: [
          { code: 'issuer_details_missing', weight: 30, level: 'no_contact_route', missing: ['registration_number', 'address', 'contact'], missing_count: 3 },
          { code: 'organisation_name_generic', weight: 30, names: ['Medical Center'], sources: ['platform_word_check'] },
        ] }],
        case_components: [{ code: 'claimed_employer_name_generic', weight: 30, names: ['Trading Company LLC'], sources: ['platform_word_check'] }],
      },
    })
    expect(topRiskReason(tie, EN)).toContain('"Medical Center" on "Experience letter"')

    const caseHeavier = w1bScreening({ risk_breakdown: { ...tie.risk_breakdown, case_components: [{ code: 'claimed_employer_name_generic', weight: 31, names: ['Trading Company LLC'] }] } })
    expect(topRiskReason(caseHeavier, EN)).toBe('What raised it most: "Trading Company LLC" does not single out one organisation, and no document read identifies it. The claim is unverified.')
  })

  it('falls back to the model\'s reading of the document it rated highest when no component exists', () => {
    const modelOnly = w1bScreening({
      risk_breakdown: { ...breakdown, case_percent: 30, highest_document_percent: 30, band: 'attention', documents: [
        { evidence_public_id: 'ev-cv', model_percent: 10, components: [], document_percent: 10 },
        { evidence_public_id: 'ev-letter', model_percent: 30, components: [], document_percent: 30 },
      ] },
    })
    expect(topRiskReason(modelOnly, EN)).toBe('What raised it most: The model\'s reading of "Experience letter": 30%')
    expect(topRiskReason(modelOnly, AR)).toBe('أكثر ما رفع المؤشر: قراءة النموذج لـ«Experience letter»: 30٪')
  })

  it('says no indicator is not a verification for the band "none", and nothing on an older run', () => {
    const none = w1bScreening({ risk_breakdown: { ...breakdown, case_percent: 0, highest_document_percent: 0, band: 'none', documents: [{ evidence_public_id: 'ev-letter', model_percent: 0, components: [], document_percent: 0 }] } })
    expect(topRiskReason(none, EN)).toBe('No risk indicator was found in the documents read. This does not mean they were verified; staff decide.')
    expect(topRiskReason(none, AR)).toBe(AR.riskNone)
    expect(topRiskReason({ status: 'completed', fake_likelihood_percent: 30, prompt_version: 'rpl-screen-v2' }, EN)).toBeNull()
  })
})

describe('the confidence in an employer claim', () => {
  const EN = SCREENING_COPY.en

  it('is the platform\'s, in words, and never above Medium', () => {
    expect(claimConfidenceLabel({ result: 'not_identifiable', confidence: 'high', claim_confidence: 'low' }, EN)).toBe('Low')
    expect(claimConfidenceLabel({ claim_confidence: 'undetermined' }, SCREENING_COPY.ar)).toBe('غير محسومة')
    expect(Object.keys(EN.claimConfidence)).not.toContain('high')
  })

  it('does not exist for a row from an older run, whatever the model\'s confidence', () => {
    expect(claimConfidenceLabel({ result: 'found_consistent', confidence: 'high' }, EN)).toBeNull()
    expect(claimConfidenceLabel({ result: 'found_consistent', confidence: 'high', claim_confidence: null }, EN)).toBeNull()
    expect(claimConfidenceLabel(null, EN)).toBeNull()
  })

  it('names the documents that name the employer, by their titles', () => {
    expect(namedInText({ evidence_public_ids: ['ev-letter', 'ev-cv', 'ev-letter'] }, w1bScreening(), EN)).toBe('Named in: Experience letter, CV')
    expect(namedInText({ evidence_public_ids: ['ev-gone'] }, w1bScreening(), SCREENING_COPY.ar)).toBe('مذكورة في: دليل بلا عنوان')
    expect(namedInText({ evidence_public_ids: [] }, w1bScreening(), EN)).toBeNull()
    expect(namedInText({}, w1bScreening(), EN)).toBeNull()
  })
})

describe('a run on older instructions', () => {
  it('is a completed rpl-screen-v1 or v2 run', () => {
    expect(isOlderRulesRun({ status: 'completed', prompt_version: 'rpl-screen-v1' })).toBe(true)
    expect(isOlderRulesRun({ status: 'completed', prompt_version: 'rpl-screen-v2' })).toBe(true)
    expect(isOlderRulesRun({ status: 'completed', prompt_version: 'rpl-screen-v3' })).toBe(false)
    expect(isOlderRulesRun({ status: 'refused', prompt_version: 'rpl-screen-v2' })).toBe(false)
    expect(isOlderRulesRun({ status: 'failed', prompt_version: 'rpl-screen-v1' })).toBe(false)
    expect(isOlderRulesRun(null)).toBe(false)
  })

  it('names its version in the notice', () => {
    expect(fill(SCREENING_COPY.en.olderRules, { version: 'rpl-screen-v2' })).toContain('older instructions (rpl-screen-v2)')
    expect(fill(SCREENING_COPY.ar.olderRules, { version: 'rpl-screen-v2' })).toContain('(rpl-screen-v2)')
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

describe('what raised the figure most is what set it (review of 18 Oct 2026)', () => {
  const EN = SCREENING_COPY.en
  const AR = SCREENING_COPY.ar
  const breakdown = w1bScreening().risk_breakdown
  const run = (risk) => w1bScreening({ risk_breakdown: { ...breakdown, ...risk } })

  it('names the model\'s reading of the document that set the figure, never a component on another document', () => {
    // The letter at 60 on an observed anomaly; the CV naming "Tourism Company" at 20: the case is 60, which the CV's 20 does not raise.
    const letterSets = run({ case_percent: 60, highest_document_percent: 60, documents: [
      { evidence_public_id: 'ev-letter', model_percent: 60, model_percent_unsupported: false, components: [], document_percent: 60 },
      { evidence_public_id: 'ev-cv', model_percent: 0, model_percent_unsupported: false, components: [{ code: 'organisation_name_generic', weight: 20, names: ['Tourism Company'] }], document_percent: 20 },
    ] })
    expect(topRiskReason(letterSets, EN)).toBe('What raised it most: The model\'s reading of "Experience letter": 60%')
    expect(topRiskReason(letterSets, AR)).toBe('أكثر ما رفع المؤشر: قراءة النموذج لـ«Experience letter»: 60٪')
  })

  it('names nothing from a document below the highest, even a component heavier than anything on the highest one', () => {
    // The letter: 30 (a generic name) and the model's 30 make 51; the CV's generic name weighs 45 alone, and its figure is 45.
    const letterSets = run({ case_percent: 51, highest_document_percent: 51, documents: [
      { evidence_public_id: 'ev-cv', model_percent: 0, components: [{ code: 'organisation_name_generic', weight: 45, names: ['Tourism Company'] }], document_percent: 45 },
      { evidence_public_id: 'ev-letter', model_percent: 30, components: [{ code: 'organisation_name_generic', weight: 30, names: ['Training Centre'] }], document_percent: 51 },
    ] })
    expect(topRiskReason(letterSets, EN)).toContain('What raised it most: "Training Centre" on "Experience letter"')
    expect(topRiskReason(letterSets, EN)).not.toContain('Tourism Company')
  })

  it('compares the model\'s reading with the components of the same document, and names the larger', () => {
    // 30 and "several" (10) make 37: the model's 30 raised it most.
    const modelHeavier = run({ case_percent: 37, highest_document_percent: 37, documents: [{ evidence_public_id: 'ev-letter', model_percent: 30, components: [
      { code: 'issuer_details_missing', weight: 10, level: 'several', missing: ['registration_number', 'address', 'stamp_or_seal', 'letterhead'], missing_count: 4, contact_route: true },
    ], document_percent: 37 }] })
    expect(topRiskReason(modelHeavier, EN)).toBe('What raised it most: The model\'s reading of "Experience letter": 30%')

    // A tie goes to the platform's component.
    const tie = run({ case_percent: 70, highest_document_percent: 70, documents: [{ evidence_public_id: 'ev-letter', model_percent: 45, components: [
      { code: 'organisation_name_generic', weight: 45, names: ['Tourism Company'] },
    ], document_percent: 70 }] })
    expect(topRiskReason(tie, EN)).toContain('What raised it most: "Tourism Company" on "Experience letter"')
  })

  it('never names a percentage the platform did not keep', () => {
    const dropped = run({ case_percent: 25, highest_document_percent: 25, documents: [{ evidence_public_id: 'ev-letter', model_percent: 40, model_percent_unsupported: true, components: [
      { code: 'issuer_details_missing', weight: 25, level: 'no_contact_route', missing: ['registration_number', 'address', 'contact'], missing_count: 3, contact_route: false },
    ], document_percent: 25 }] })
    expect(topRiskReason(dropped, EN)).toContain('No registration number, address, phone, email or website')
    expect(topRiskReason(dropped, EN)).not.toContain('40%')
  })

  it('considers every document when the run does not say which set the figure', () => {
    const unsaid = run({ highest_document_percent: null, documents: [
      { evidence_public_id: 'ev-cv', model_percent: 0, components: [{ code: 'organisation_name_generic', weight: 20, names: ['Tourism Company'] }], document_percent: 20 },
    ] })
    expect(topRiskReason(unsaid, EN)).toContain('"Tourism Company" on "CV"')
  })

  it('reads a name component that carries no name by its title, never with empty quotes', () => {
    const unnamed = { code: 'organisation_name_generic', weight: 45, names: [], sources: ['document_reading'] }
    expect(riskComponentText(unnamed, { documentTitle: 'Experience letter' }, EN).reason).toBe('')
    expect(riskComponentText({ ...unnamed, names: undefined }, { documentTitle: 'Experience letter' }, AR).reason).toBe('')
    expect(riskComponentText({ code: 'claimed_employer_name_generic', weight: 30, names: [] }, {}, EN).reason).toBe('')
    // The unnamed issuer has no names to quote: its reason stands.
    expect(riskComponentText({ code: 'issuer_not_named', weight: 45, sources: ['document_reading'] }, { documentTitle: 'Letter' }, EN).reason).toBe('No organisation is named on "Letter", so who issued it cannot be known or checked.')

    const headline = run({ documents: [{ evidence_public_id: 'ev-letter', model_percent: 0, components: [unnamed], document_percent: 64 }] })
    expect(topRiskReason(headline, EN)).toBe('What raised it most: The organisation\'s name identifies no one organisation')
    expect(topRiskReason(headline, AR)).not.toContain('«»')
  })
})

describe('the pages a search returned for an employer', () => {
  it('are said not to be its own when it cannot be identified or was not found, unless the search tied them to it', () => {
    expect(sourcesAreNotOwn({ result: 'not_identifiable', flags: ['name_generic_platform_check'] })).toBe(true)
    expect(sourcesAreNotOwn({ result: 'not_found_online' })).toBe(true)
    expect(sourcesAreNotOwn({ result: 'not_identifiable', flags: ['name_generic_platform_check', 'result_set_by_generic_name_rule', 'generic_name_found_by_search'] })).toBe(false)
    expect(sourcesAreNotOwn({ result: 'found_consistent', flags: [] })).toBe(false)
    expect(sourcesAreNotOwn({ result: 'ambiguous', flags: null })).toBe(false)
    expect(sourcesAreNotOwn(null)).toBe(false)
  })
})

describe('the words of the employer table on the current rules (review of 18 Oct 2026)', () => {
  it('say only what is true of every row: the word check decides the result; the reading or the search alone flags it; the claim is Low either way', () => {
    expect(SCREENING_COPY.en.employersHintIdentity).toBe('A name the platform\'s word check finds generic is recorded as "cannot be identified", whatever the search returns. A name only the document reading or the search judged unidentifiable keeps the search\'s result and is flagged. Either way, the confidence in the claim is Low.')
    expect(SCREENING_COPY.ar.employersHintIdentity).toContain('فحص المنصة للكلمات')
    expect(SCREENING_COPY.ar.employersHintIdentity).toContain('«منخفضة»')
    // An override never tells staff the pages belong to others: a "found" the search tied pages to has its own sentence.
    expect(SCREENING_COPY.en.employerFlags.result_set_by_generic_name_rule).not.toMatch(/other businesses|directories/)
    expect(SCREENING_COPY.ar.employerFlags.result_set_by_generic_name_rule).not.toContain('منشآت أخرى')
    expect(SCREENING_COPY.en.employerFlags.generic_name_found_by_search).toContain('if they are this employer\'s own, the name does identify it')
    expect(SCREENING_COPY.en.columnModelConfidence).toBe("Model's confidence in its reading")
    expect(SCREENING_COPY.ar.columnModelConfidence).toBe('ثقة النموذج في قراءته')
  })
})
