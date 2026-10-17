import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ScreeningDecisionCard from './ScreeningDecisionCard'
import GapClosurePanel from './GapClosurePanel'
import CompletenessMeter from './CompletenessMeter'
import ChargesPanel from './ChargesPanel'
import CoursePlanEditor from './CoursePlanEditor'
import { CASE_DECISION_COPY } from '../domain/caseDecision'
import { DECLINE_CATEGORIES } from '../domain/rpl'

/*
 * WHAT STAFF READ ON THE CASE PANELS (platform walk, 17 Oct 2026).
 *
 *   UI-07  the decision card never says "no screening has run" while the screens
 *          are still loading;
 *   UI-08  "الملف مكتمل", not "الملف مكتم";
 *   UI-09  levels and competencies by name, never by code;
 *   UI-12  a date paid outside is a date, never a local time;
 *   UI-16  counts agree with their nouns in Arabic (and English).
 */

const mocks = vi.hoisted(() => ({}))

vi.mock('../services/rplService', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.fromEntries(Object.keys(actual).map((key) => {
    if (typeof actual[key] !== 'function') return [key, actual[key]]
    mocks[key] = vi.fn(() => Promise.resolve({ data: [] }))
    return [key, (...args) => mocks[key](...args)]
  }))
})

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockImplementation(() => Promise.resolve({ data: [] }))
})

describe('UI-07: the latest screen on the decision card', () => {
  const card = (props) => render(<ScreeningDecisionCard applicationId="case-41" status="evidence_verification" canDecide canViewScreening declineCategories={DECLINE_CATEGORIES} language="en" {...props} />)

  it('says it is loading, not that no screening has run, while the screens load', () => {
    card({ screenings: [], screeningsLoading: true })

    expect(screen.getByText(CASE_DECISION_COPY.en.screeningLoading)).toBeInTheDocument()
    expect(screen.queryByText(CASE_DECISION_COPY.en.noScreening)).not.toBeInTheDocument()
  })

  it('says no screening has run once the list has loaded empty', () => {
    card({ screenings: [], screeningsLoading: false })

    expect(screen.getByText(CASE_DECISION_COPY.en.noScreening)).toBeInTheDocument()
  })

  it('counts documents in Arabic with the right noun (UI-16)', () => {
    render(<ScreeningDecisionCard applicationId="case-41" status="evidence_verification" canDecide canViewScreening declineCategories={DECLINE_CATEGORIES} language="ar" screenings={[{ public_id: 's1', status: 'completed', fake_likelihood_percent: 8, score_out_of_10: 0.8, coverage: { documents_total: 3, read: 3, withheld: [] }, is_stale: false }]} />)

    expect(screen.getByText('قُرئت 3 من 3 وثائق.')).toBeInTheDocument()
  })
})

describe('UI-08: the complete portfolio', () => {
  it('reads "الملف مكتمل"', () => {
    render(<CompletenessMeter value={{ percentage: 100, missing: [], declaration: { accepted: true } }} language="ar" />)

    expect(screen.getByText(/الملف مكتمل وجاهز للخطوة التالية/)).toBeInTheDocument()
  })
})

describe('UI-09: names, not codes', () => {
  it('names the target level on the gap-closure panel', async () => {
    mocks.fetchGapClosurePlan.mockResolvedValue({ data: { target_level: { id: 2, code: 'advanced_practitioner' }, gap_count: 0, gaps: [], recommended_packages: [], unresolvable_gaps: [], uncovered_gaps: [], progress: { total_gaps: 0, closable_by_catalogue: 0, percentage: 0 }, catalogue_readiness: { gap_programmes: 100, declaring_competencies: 7, declaring_none: 93, standard_competencies: 12, standard_competencies_mapped: 1 } } })
    render(<GapClosurePanel applicationPublicId="case-41" language="ar" />)

    expect(await screen.findByText('ممارس مهني متقدم')).toBeInTheDocument()
    expect(screen.queryByText('advanced_practitioner')).not.toBeInTheDocument()
  })

  it('names a plan course\'s competency and the level minimums in the course plan', async () => {
    const plan = {
      public_id: 'plan-1', version: 1, status: 'draft', is_live: true, source: 'gemini', entry_quiz_result: 'failed', minimum_required: 7,
      target_level: { code: 'advanced_practitioner' },
      settings_snapshot: { key: 'rpl_course_plan_minimums', value: { practitioner: 5, advanced_practitioner: 7, expert: 10 } },
      items: [{ id: 5, status: 'proposed', purpose: 'gap_closure', position: 1, competency_codes: ['professional_knowledge'], program: { id: 1, title: { ar: 'الاتصال المهني الفعال' }, buyable: true } }],
    }
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: { application: { status: 'course_plan_review' }, draft: plan, approved: null, versions: [], can: {} } })
    render(<CoursePlanEditor applicationId="case-41" application={{ status: 'course_plan_review' }} competencyNames={{ professional_knowledge: { ar: 'المعرفة المهنية', en: 'Professional knowledge' } }} language="ar" />)

    expect(await screen.findByText('المعرفة المهنية')).toBeInTheDocument()
    expect(screen.queryByText('professional_knowledge')).not.toBeInTheDocument()
    expect(screen.queryByText(/advanced_practitioner/)).not.toBeInTheDocument()
  })
})

describe('UI-12: the date a charge was paid outside', () => {
  it('is the date staff entered, with no time', async () => {
    mocks.fetchRplCharges.mockResolvedValue({ data: [{
      id: 1, public_id: 'charge-1', type: 'experience_certificate', cycle: 1, route: 'offline', status: 'paid',
      amount: { currency: 'USD', amount_minor: 1500, amount: '15.00' }, price_usd: { currency: 'USD', amount_minor: 1500, amount: '15.00' },
      invoice_number: 'INV-RPL-20261017-YB6ILSDB', paid_at: '2026-10-17T00:00:00.000000Z', can: {},
    }] })
    render(<ChargesPanel applicationId="case-41" language="en" canReconcile canRefund />)

    expect(await screen.findByText('Paid on 17 Oct 2026')).toBeInTheDocument()
  })
})

describe('UI-09 and UI-16: the level certificate job on the final exam', () => {
  it('names the job status and counts one attempt in Arabic', async () => {
    const { default: FinalExamPanel } = await import('./FinalExamPanel')
    mocks.fetchRplFinalExam.mockResolvedValue({ data: { state: 'passed', rounds: [], studied_courses: [], level_certificate: { state: 'issued', holds: [], outbox: { status: 'processed', attempts: 1 }, certificate: { id: 90, number: 'ICPC-2026-000090', issued_at: '2026-10-21T09:00:00Z' } } } })
    render(<FinalExamPanel applicationId="case-41" language="ar" canManage />)

    const job = await screen.findByText(/مهمة الإصدار/)
    expect(job).toHaveTextContent('مهمة الإصدار: نُفِّذت، محاولة واحدة')
    expect(within(job.parentElement).queryByText(/processed/)).not.toBeInTheDocument()
  })
})

describe('UI-17: the closed plan of a completed case', () => {
  it('counts completed courses, offers none for sale, and does not call the final exam open', async () => {
    const { COURSE_PLAN_COPY } = await import('../domain/coursePlan')
    const items = [1, 2, 3, 4, 5].map((id) => ({ id, status: 'completed', purpose: 'gap_closure', position: id, competency_codes: [], program: { id, title: { en: `Course ${id}` }, buyable: true } }))
    const closed = { public_id: 'plan-1', version: 1, status: 'closed', closed_reason: 'learning_complete', is_live: true, source: 'gemini', entry_quiz_result: 'failed', minimum_required: 5, target_level: { code: 'practitioner' }, items }
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: { application: { status: 'completed' }, draft: null, approved: closed, versions: [], can: {} } })
    render(<CoursePlanEditor applicationId="case-41" application={{ status: 'completed' }} language="en" />)

    expect(await screen.findByText(COURSE_PLAN_COPY.en.learningCompleteClosedCase)).toBeInTheDocument()
    expect(screen.queryByText(COURSE_PLAN_COPY.en.learningComplete)).not.toBeInTheDocument()
    expect(screen.getByText(/5 completed/)).toBeInTheDocument()
    expect(screen.queryByText(/available to buy/)).not.toBeInTheDocument()
  })
})

describe('UI-13 and UI-14: what the screening tab says', () => {
  const identity = {
    evidence_public_id: 'ev-2', evidence_snapshot: { title: 'Passport', category_code: 'identity' }, read_status: 'read', withheld_reason: null, extraction_only: true,
    extracted: { holder_name: 'Maya Client' }, fake_likelihood_percent: null, confidence: null, flags: [], deterministic_signals: [], consistency_with_claim: 'consistent',
    rationale: 'Read only to extract names and dates and compare them with the other documents and the claims. No judgement of whether this document is genuine is made or kept for this category; any disagreement found is listed in the flags.',
  }
  const run = (overrides = {}) => ({
    public_id: 'scr-1', status: 'completed', refusal_code: null, trigger: 'staff_rerun', fake_likelihood_percent: 8, score_out_of_10: 0.8,
    coverage: { documents_total: 1, read: 1, withheld: [], excluded_categories: [], extraction_only_categories: ['identity'] },
    is_stale: false, created_at: '2026-10-17T09:00:00Z', items: [identity], employer_checks: [], instructions_found_in_documents: [], ...overrides,
  })

  it('shows the API\'s fixed extraction-only rationale in Arabic on the Arabic platform', async () => {
    const { default: DocumentScreeningPanel } = await import('./DocumentScreeningPanel')
    const { EXTRACTION_ONLY_RATIONALE } = await import('../domain/documentScreening')
    render(<DocumentScreeningPanel applicationId="case-41" screenings={[run()]} language="ar" onReload={vi.fn()} onScreeningAdded={vi.fn()} onScreeningUpdated={vi.fn()} />)

    expect(screen.getByText(EXTRACTION_ONLY_RATIONALE.ar)).toBeInTheDocument()
    expect(screen.queryByText(/Read only to extract names/)).not.toBeInTheDocument()
  })

  it('says Gemini is not configured on the server, not that the provider did not answer', async () => {
    const { default: DocumentScreeningPanel } = await import('./DocumentScreeningPanel')
    const { SCREENING_COPY } = await import('../domain/documentScreening')
    render(<DocumentScreeningPanel applicationId="case-41" screenings={[run({ status: 'refused', refusal_code: 'provider_not_configured', fake_likelihood_percent: null, score_out_of_10: null, items: [], coverage: { documents_total: 1, read: 0, withheld: [{ evidence_public_id: 'ev-2', title: 'Passport', reason: 'provider_not_configured' }] } })]} language="en" onReload={vi.fn()} onScreeningAdded={vi.fn()} onScreeningUpdated={vi.fn()} />)

    expect(screen.getAllByText(/Gemini is not configured on the server/).length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toContain(SCREENING_COPY.en.statusExplanations?.provider_error ?? 'the AI provider did not answer')
    expect(document.body.textContent).not.toContain('provider_not_configured')
  })
})

describe('UI-13: the wallet ledger in Arabic', () => {
  it('drops the API\'s English description of a known movement and words its subject', async () => {
    const { ledgerDescription, ledgerSubjectText } = await import('../../users/domain/wallet')
    const { chargeTypeLabel } = await import('../domain/afterQuiz')

    expect(ledgerDescription({ kind: 'top_up', description: 'Money received by the institute (bank transfer)' })).toBe('')
    expect(ledgerDescription({ kind: 'legacy', description: 'Points bought in 2025' })).toBe('Points bought in 2025')
    expect(ledgerSubjectText({ type: 'enrollment', id: 5, label: 'Course: Effective professional communication', title: { ar: 'الاتصال المهني الفعال', en: 'Effective professional communication' } }, 'ar', chargeTypeLabel)).toBe('دورة: الاتصال المهني الفعال')
    expect(ledgerSubjectText({ type: 'rpl_charge', id: 7, label: 'RPL payment: experience certificate', charge_type: 'experience_certificate' }, 'ar', chargeTypeLabel)).toBe(`دفعة لطلب RPL: ${chargeTypeLabel('experience_certificate', 'ar')}`)
    expect(ledgerSubjectText({ type: 'wallet_transaction', id: 3, label: 'Wallet movement #3' }, 'ar')).toBe('حركة المحفظة رقم 3')
  })

  it('labels the user list\'s wallet totals as covering every wallet, whatever the filter (UI-20)', async () => {
    const { walletCopy } = await import('../../users/domain/wallet')

    expect(walletCopy('ar').usdTotals).toMatch(/كل المحافظ/)
    expect(walletCopy('ar').sypTotals).toMatch(/كل المحافظ/)
    expect(walletCopy('en').usdTotals).toMatch(/all wallets/)
    expect(walletCopy('en').sypTotals).toMatch(/all wallets/)
  })
})
