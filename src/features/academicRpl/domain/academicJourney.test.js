import { describe, expect, it } from 'vitest'
import { ACADEMIC_STATUS_LABELS, ACADEMIC_STEPS, academicJourney, academicStatusLabel, academicSteps, academicStepsDone } from './academicJourney'

/*
 * THE ACADEMIC PATH'S STEPS (PLATFORM-JOURNEY-SPEC §8): five steps numbered 1 to
 * 5 (the page used to jump 2, 4, 5, 7, 8), computed from what the case carries,
 * for the stepper the professional path uses; and status codes as words.
 */

const STEP_KEYS = ACADEMIC_STEPS.map((step) => step.key)

describe('the academic steps', () => {
  it('are five, named in Arabic and English', () => {
    expect(STEP_KEYS).toEqual(['eligibility', 'analysis', 'diagnostic', 'recommendation', 'gap_plan'])
    expect(academicSteps('ar').map((step) => step.label)).toEqual(['الأهلية', 'تحليل الأدلة', 'الاختبار التشخيصي', 'التوصية', 'خطة سد الفجوات'])
    expect(academicSteps('en').map((step) => step.label)).toEqual(['Eligibility', 'Evidence analysis', 'Diagnostic test', 'Recommendation', 'Gap plan'])
  })

  it('start at eligibility on a new case', () => {
    const { states, current } = academicJourney({ status: 'submitted' })
    expect(current).toBe('eligibility')
    expect(STEP_KEYS.map((key) => states[key])).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming'])
  })

  it('count a diagnostic as taken only once answered or assessed', () => {
    const base = { eligibility_confirmed: true, analyses: [{ id: 1 }] }
    expect(academicStepsDone({ ...base, diagnostics: [{ status: 'issued' }] }).diagnostic).toBe(false)
    expect(academicStepsDone({ ...base, diagnostics: [{ status: 'answered' }] }).diagnostic).toBe(true)
    const { states } = academicJourney({ ...base, diagnostics: [{ status: 'assessed' }] })
    expect(STEP_KEYS.map((key) => states[key])).toEqual(['done', 'done', 'done', 'current', 'upcoming'])
  })

  it('finish with a recommendation and a gap plan, recorded or computed on the page', () => {
    const application = { eligibility_confirmed: true, analyses: [{}], diagnostics: [{ status: 'assessed' }], recommendations: [{ id: 2 }] }
    expect(academicJourney(application).current).toBe('gap_plan')
    expect(academicJourney(application, { gapPlan: { track: {} } }).current).toBeNull()
    expect(academicJourney({ ...application, gap_plans: [{ id: 3 }] }).current).toBeNull()
  })

  it('close a withdrawn case where it stood', () => {
    const { states } = academicJourney({ status: 'withdrawn', eligibility_confirmed: true })
    expect(STEP_KEYS.map((key) => states[key])).toEqual(['done', 'closed', 'skipped', 'skipped', 'skipped'])
  })
})

describe('the status words', () => {
  it('name the list, case, evidence and diagnostic codes in both languages, and leave an unknown code to the caller', () => {
    expect(academicStatusLabel('submitted', 'ar')).toBe('مُرسل')
    expect(academicStatusLabel('issued', 'en')).toBe('Issued')
    expect(academicStatusLabel('answered', 'ar')).toBe('مُجاب')
    expect(academicStatusLabel('mystery', 'en')).toBeNull()
    for (const label of Object.values(ACADEMIC_STATUS_LABELS)) {
      expect(label.ar).toBeTruthy()
      expect(label.en).toBeTruthy()
      expect(label).not.toHaveProperty('nl')
    }
  })
})
