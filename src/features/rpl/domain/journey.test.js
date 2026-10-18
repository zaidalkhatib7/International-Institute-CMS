import { describe, expect, it } from 'vitest'
import { APPLICATION_STATUS } from './rpl'
import { AFTER_QUIZ_COPY, AFTER_QUIZ_STATES } from './afterQuiz'
import {
  CLIENT_CHIP_QUEUE_KEYS,
  NEXT_STEP_COPY,
  QUEUES,
  QUEUE_KEYS,
  STAFF_TILE_QUEUE_KEYS,
  STAGES,
  STEP_KEYS,
  caseJourney,
  caseNextStep,
  caseQueueKey,
  queueHref,
  stageOf,
} from './journey'

/*
 * THE FIRST PATH'S JOURNEY (PLATFORM-JOURNEY-SPEC §4.2, §4.3, §9.1 item 4).
 * Table-driven: every status has one stage; every Next-step row says who acts,
 * what to do and which tab opens; the stepper's states follow the case.
 */

const all = () => true
const none = () => false
const S = NEXT_STEP_COPY.sentences

describe('stages', () => {
  // RplApplicationStatus holds 22 cases (the spec's "23" miscounted; every one is covered).
  it('maps every one of the 22 statuses to exactly one stage', () => {
    const statuses = Object.keys(APPLICATION_STATUS)
    expect(statuses).toHaveLength(22)
    for (const status of statuses) {
      expect(STAGES.filter((stage) => stage.statuses.includes(status))).toHaveLength(1)
      expect(stageOf(status)).toBeTruthy()
    }
    expect(STAGES.flatMap((stage) => stage.statuses)).toHaveLength(22)
  })

  it('names every stage, queue and Next-step sentence in Arabic and English, without RPL, API or CMS in Arabic and with no Dutch', () => {
    const labels = [
      ...STAGES.map((stage) => stage.label),
      ...QUEUES.flatMap((queue) => [queue.chip, queue.tile, queue.clientChip].filter(Boolean)),
      ...Object.values(S),
      ...Object.values(NEXT_STEP_COPY.actors),
      ...Object.values(NEXT_STEP_COPY.tabs),
    ]
    for (const label of labels) {
      expect(label.ar?.trim()).toBeTruthy()
      expect(label.en?.trim()).toBeTruthy()
      expect(label.ar).not.toMatch(/RPL|API|CMS/)
      expect(label).not.toHaveProperty('nl')
    }
  })

  it('keeps the API\'s twenty-two queue keys, each in one stage, and links a queue by stage and key only', () => {
    expect(QUEUE_KEYS).toEqual(['office_drafts', 'client_drafts', 'intake_review', 'awaiting_client_info', 'information_overdue', 'information_review', 'screening_decision', 'interview_client', 'interview_schedule', 'interview_upcoming', 'interview_record', 'interview_decide', 'interview_lapsed', 'quiz_start', 'quiz_prepare', 'quiz_client', 'plan_generate', 'quiz_review', 'plan_approve', 'learning', 'final_exam', 'certificate'])
    expect(queueHref('quiz_prepare')).toBe('/rpl/applications?stage=entry_quiz&queue=quiz_prepare')
    expect(STAFF_TILE_QUEUE_KEYS.every((key) => QUEUES.find((queue) => queue.key === key).actor === 'staff')).toBe(true)
    expect(CLIENT_CHIP_QUEUE_KEYS.every((key) => QUEUES.find((queue) => queue.key === key).actor === 'client')).toBe(true)
  })

  it('reads the after-quiz codes from afterQuiz.js, each a key of its label map', () => {
    const en = AFTER_QUIZ_COPY.en
    expect(en.finalExam.states).toHaveProperty(AFTER_QUIZ_STATES.finalExamBlocked)
    expect(en.finalExam.states).toHaveProperty(AFTER_QUIZ_STATES.finalExamNotYet)
    expect(en.finalExam.level.states).toHaveProperty(AFTER_QUIZ_STATES.levelHeld)
    expect(en.finalExam.level.states).toHaveProperty(AFTER_QUIZ_STATES.levelFeeUnusable)
    expect(en.experience.states).toHaveProperty(AFTER_QUIZ_STATES.experienceAwaitingIssue)
  })
})

const NEXT_STEP_ROWS = [
  // [work_queue, extra case fields, permission that makes it "your move" (null: not staff), expected sentence, tab, anchor]
  ['office_drafts', { status: 'draft' }, 'rpl.applications.manage', S.office_drafts.en, 'evidence'],
  ['client_drafts', { status: 'draft' }, null, S.client_drafts.en, null],
  ['intake_review', { status: 'submitted' }, 'rpl.applications.manage', S.intake_review.en, 'overview', 'initial-review'],
  ['awaiting_client_info', { status: 'awaiting_applicant', information_requests: [{ status: 'open', due_at: '2030-01-02T10:00:00Z' }, { status: 'open', due_at: '2030-01-01T10:00:00Z' }] }, null, /^Waiting for information from the client until .*2030/, 'overview', 'information-requests'],
  ['information_overdue', { status: 'awaiting_applicant', information_requests: [{ status: 'open', due_at: '2020-01-01T10:00:00Z' }] }, 'rpl.applications.manage', /^The information request was due on .*2020.* and the client has not replied/, 'overview', 'information-requests'],
  ['information_review', { status: 'awaiting_applicant', information_requests: [{ status: 'responded', due_at: '2030-01-01T10:00:00Z' }] }, 'rpl.applications.manage', S.information_replied.en, 'overview', 'information-requests'],
  ['information_review', { status: 'awaiting_applicant', information_requests: [{ status: 'closed' }] }, 'rpl.applications.manage', S.information_none_open.en, 'overview', 'information-requests'],
  ['screening_decision', { status: 'evidence_verification' }, 'rpl.screening.decide', S.screening_decide.en, 'decision'],
  ['interview_client', { status: 'interview_required', active_interview: { status: 'offered', response_due_at: '2030-03-01T09:00:00Z' } }, null, /^An interview was offered; waiting for the client to choose online or office, until .*2030/, 'decision'],
  // The API's modes are online and in_person (RplInterview::MODES).
  ['interview_schedule', { status: 'interview_required', active_interview: { chosen_mode: 'in_person' } }, 'rpl.interviews.manage', 'The client chose an interview at the office. Schedule it.', 'decision'],
  ['interview_schedule', { status: 'interview_required', active_interview: { chosen_mode: 'online' } }, 'rpl.interviews.manage', 'The client chose an interview online. Schedule it.', 'decision'],
  ['interview_upcoming', { status: 'interview_required', active_interview: { chosen_mode: 'online', scheduled_at: '2030-10-21T09:00:00Z' } }, null, /^The interview online is on .*2030/, 'decision'],
  ['interview_upcoming', { status: 'interview_required', active_interview: { chosen_mode: 'in_person', scheduled_at: '2030-10-21T09:00:00Z' } }, null, /^The interview at the office is on .*2030/, 'decision'],
  ['interview_record', { status: 'interview_required' }, 'rpl.interviews.manage', S.interview_record.en, 'decision'],
  ['interview_decide', { status: 'interview_required' }, 'rpl.screening.decide', S.interview_decide.en, 'decision'],
  ['interview_lapsed', { status: 'interview_required' }, 'rpl.interviews.manage', S.interview_lapsed.en, 'decision'],
  ['quiz_start', { status: 'ready_for_assessment' }, 'rpl.applications.manage', S.quiz_start.en, 'entry_quiz'],
  ['quiz_prepare', { status: 'assessment_in_progress' }, 'rpl.applications.manage', S.quiz_prepare.en, 'entry_quiz'],
  ['quiz_client', { status: 'assessment_in_progress' }, null, S.quiz_client.en, 'entry_quiz'],
  ['quiz_review', { status: 'assessment_in_progress' }, 'rpl.applications.manage', S.quiz_review.en, 'entry_quiz'],
  ['plan_generate', { status: 'assessment_in_progress', course_plan: { entry_quiz_result: 'passed' } }, 'rpl.course_plans.manage', S.plan_generate_passed.en, 'course_plan'],
  ['plan_generate', { status: 'assessment_in_progress', course_plan: { entry_quiz_result: 'failed' } }, 'rpl.course_plans.manage', S.plan_generate_failed.en, 'course_plan'],
  ['plan_approve', { status: 'course_plan_review', course_plan: { draft_version: 2 } }, 'rpl.course_plans.manage', 'Review and approve the course plan (version 2).', 'course_plan'],
  ['learning', { status: 'course_plan_active' }, null, S.learning.en, 'course_plan'],
  ['final_exam', { status: 'final_exam', after_quiz: { final_exam_state: 'available' } }, null, S.final_exam.en, 'final_exam'],
  ['final_exam', { status: 'final_exam', after_quiz: { final_exam_state: AFTER_QUIZ_STATES.finalExamBlocked } }, 'rpl.applications.manage', S.final_exam_blocked.en, 'final_exam'],
  ['final_exam', { status: 'final_exam', after_quiz: { final_exam_state: 'waiting' } }, null, S.final_exam_waiting.en, 'final_exam'],
  ['final_exam', { status: 'final_exam', after_quiz: { final_exam_state: 'retake_due' } }, null, S.final_exam_retake_due.en, 'final_exam'],
  ['final_exam', { status: 'final_exam', after_quiz: { final_exam_state: 'passed', level_certificate_state: 'queued' } }, null, S.final_exam_passed.en, 'final_exam'],
  // The API holds an unusable-fee pass in final_exam (RplLevelCertificateIssuer::feeUnusableProblem).
  ['final_exam', { status: 'final_exam', after_quiz: { final_exam_state: 'passed', level_certificate_state: AFTER_QUIZ_STATES.levelFeeUnusable } }, 'rpl.applications.manage', S.final_exam_fee_unusable.en, 'final_exam'],
  ['certificate', { status: 'credential_pending', after_quiz: { level_certificate_state: 'queued' } }, null, S.certificate.en, 'final_exam'],
  ['certificate', { status: 'credential_pending', after_quiz: { level_certificate_state: 'awaiting_fee' } }, null, S.certificate_awaiting_fee.en, 'final_exam'],
  ['certificate', { status: 'credential_pending', after_quiz: { level_certificate_state: AFTER_QUIZ_STATES.levelHeld } }, 'rpl.applications.manage', S.certificate_held.en, 'final_exam'],
]

describe('the Next step for each queue (§4.3)', () => {
  it.each(NEXT_STEP_ROWS.map((row) => [row[0], row]))('%s', (_, [queue, fields, permission, sentence, tabKey, anchor]) => {
    const application = { work_queue: queue, ...fields }
    const mine = caseNextStep(application, { hasPermission: all })
    if (sentence instanceof RegExp) expect(mine.sentence.en).toMatch(sentence)
    else expect(mine.sentence.en).toBe(sentence)
    expect(mine.sentence.ar).toBeTruthy()
    expect(mine.sentence.ar).not.toMatch(/\{\w+\}/)
    if (tabKey) expect(mine.action?.tab).toBe(tabKey)
    else expect(mine.action).toBeNull()
    if (anchor) expect(mine.action.anchor).toBe(anchor)
    if (permission) {
      expect(mine.actor).toBe('you')
      expect(caseNextStep(application, { hasPermission: (slug) => slug !== permission }).actor).toBe('other')
    } else {
      expect(['client', 'automatic', 'scheduled']).toContain(mine.actor)
    }
  })

  it('asks the viewer who sees screens to read an unacknowledged screen first', () => {
    const step = caseNextStep({ work_queue: 'screening_decision', status: 'evidence_verification' }, { hasPermission: all, screenings: [{ public_id: 's1', status: 'completed', acknowledged_at: null }] })
    expect(step.sentence.en).toBe(S.screening_read.en)
    expect(caseNextStep({ work_queue: 'screening_decision', status: 'evidence_verification' }, { hasPermission: all, screenings: [{ status: 'completed', acknowledged_at: '2026-10-18T09:00:00Z' }] }).sentence.en).toBe(S.screening_decide.en)
  })

  // Walk of 18 Oct 2026: a screen that never ran (refused), failed or is still running has nothing to read.
  it.each(['refused', 'failed', 'queued', 'running'])('asks for the decision, not a read, when the latest screen is %s', (status) => {
    const step = caseNextStep({ work_queue: 'screening_decision', status: 'evidence_verification' }, { hasPermission: all, screenings: [{ public_id: 's1', status, acknowledged_at: null }] })
    expect(step.sentence).toEqual(S.screening_decide)
  })

  it('marks an information request past its date as overdue', () => {
    expect(caseNextStep({ work_queue: 'awaiting_client_info', status: 'awaiting_applicant', information_requests: [{ status: 'open', due_at: '2020-01-01T00:00:00Z' }] }, { hasPermission: all }).overdue).toBe(true)
    expect(caseNextStep({ work_queue: 'information_overdue', status: 'awaiting_applicant', information_requests: [{ status: 'open', due_at: '2020-01-01T00:00:00Z' }] }, { hasPermission: all }).overdue).toBe(true)
  })

  it('never counts a responded request as still waiting on the client', () => {
    const replied = { work_queue: 'awaiting_client_info', status: 'awaiting_applicant', information_requests: [{ status: 'responded', due_at: '2020-01-01T00:00:00Z' }, { status: 'open', due_at: '2030-05-01T00:00:00Z' }] }
    const step = caseNextStep(replied, { hasPermission: all })
    expect(step.overdue).toBe(false)
    expect(step.sentence.en).toMatch(/until .*2030/)
  })

  it('leaves an unknown interview mode out of the sentence instead of a gap', () => {
    const schedule = caseNextStep({ work_queue: 'interview_schedule', status: 'interview_required', active_interview: { chosen_mode: 'video' } }, { hasPermission: all })
    expect(schedule.sentence).toEqual(S.interview_schedule_nomode)
    const upcoming = caseNextStep({ work_queue: 'interview_upcoming', status: 'interview_required', active_interview: { scheduled_at: '2030-10-21T09:00:00Z' } }, { hasPermission: all })
    expect(upcoming.sentence.en).toMatch(/^The interview is on .*2030/)
    for (const step of [schedule, upcoming]) {
      expect(step.sentence.en).not.toMatch(/ {2}| \./)
      expect(step.sentence.ar).not.toMatch(/ {2}| \./)
    }
  })

  it('offers Submit the request on an office draft only when the server allows the move and the viewer manages cases', () => {
    const draft = { work_queue: 'office_drafts', status: 'draft', allowed_transitions: ['submitted', 'withdrawn'] }
    expect(caseNextStep(draft, { hasPermission: all }).secondary).toMatchObject({ transition: 'submitted' })
    expect(caseNextStep({ ...draft, allowed_transitions: ['withdrawn'] }, { hasPermission: all }).secondary).toBeNull()
    expect(caseNextStep(draft, { hasPermission: none }).secondary).toBeNull()
  })

  it('links a pass waiting on an unusable fee to the Fees settings, for a settings manager only', () => {
    const application = { work_queue: 'final_exam', status: 'final_exam', after_quiz: { final_exam_state: 'passed', level_certificate_state: AFTER_QUIZ_STATES.levelFeeUnusable } }
    expect(caseNextStep(application, { hasPermission: all }).links).toEqual([{ label: NEXT_STEP_COPY.tabs.feeSettings, href: '/rpl/configuration?tab=fees' }])
    expect(caseNextStep(application, { hasPermission: (slug) => slug !== 'rpl.settings.manage' }).links).toEqual([])
  })

  it('closes a completed case on the certificate register, by its route', () => {
    expect(caseNextStep({ status: 'completed', work_queue: null, after_quiz: { completion_route: 'experience_certificate' } }, { hasPermission: all })).toMatchObject({ sentence: S.completed_experience, action: { href: '/certificates' } })
    expect(caseNextStep({ status: 'completed', work_queue: null }, { hasPermission: none })).toMatchObject({ sentence: S.completed, action: null })
  })

  it('names the reapply date on a declined case (F-8)', () => {
    expect(caseNextStep({ status: 'rejected', work_queue: null, reapply_available_at: '2030-11-01T00:00:00Z' }, { hasPermission: all }).sentence.en).toMatch(/^The request was declined. The client may apply again from .*2030/)
    expect(caseNextStep({ status: 'rejected', work_queue: null }, { hasPermission: all }).sentence).toEqual(S.rejected_nodate)
    expect(caseNextStep({ status: 'withdrawn', work_queue: null }, { hasPermission: all }).sentence).toEqual(S.withdrawn)
  })

  it('sends a pre-flow case to the committee tab only while its forms can be saved', () => {
    expect(caseNextStep({ status: 'quality_review' }, { hasPermission: all })).toMatchObject({ actor: 'you', action: { tab: 'governance' } })
    expect(caseNextStep({ status: 'decision_issued' }, { hasPermission: all })).toMatchObject({ action: null })
    expect(caseNextStep({ status: 'committee_review' }, { hasPermission: none }).actor).toBe('other')
  })

  it('falls back to the status and its stage\'s tab when an open case is in no queue', () => {
    const step = caseNextStep({ status: 'assessment_in_progress', work_queue: null }, { hasPermission: all })
    expect(step.sentence.en).toBe(`Assessment in progress. ${NEXT_STEP_COPY.noStep.en}`)
    expect(step.action.tab).toBe('entry_quiz')
  })

  it('reads the status\'s unambiguous queue only when the API sends no work_queue at all', () => {
    expect(caseQueueKey({ status: 'evidence_verification' })).toBe('screening_decision')
    expect(caseQueueKey({ status: 'evidence_verification', work_queue: null })).toBeNull()
    expect(caseQueueKey({ status: 'interview_required' })).toBeNull()
    expect(caseQueueKey({ status: 'draft', work_queue: 'office_drafts' })).toBe('office_drafts')
  })

  it('adds the Also lines: a payment to confirm for a reconciler, and a paid experience certificate', () => {
    const application = { work_queue: 'learning', status: 'course_plan_active', after_quiz: { charges_pending: 1, experience_certificate_state: AFTER_QUIZ_STATES.experienceAwaitingIssue } }
    const also = caseNextStep(application, { hasPermission: all }).also
    expect(also.map((line) => line.text)).toEqual([NEXT_STEP_COPY.also_lines.payment, NEXT_STEP_COPY.also_lines.experience])
    expect(also.every((line) => line.tab === 'payments')).toBe(true)
    expect(caseNextStep(application, { hasPermission: (slug) => slug !== 'rpl.payments.reconcile' }).also.map((line) => line.text)).toEqual([NEXT_STEP_COPY.also_lines.experience])
  })
})

describe('the stepper (§4.3)', () => {
  it('marks earlier steps done, the stage current and later upcoming on an open case', () => {
    const { states, preflow } = caseJourney({ status: 'assessment_in_progress' })
    expect(preflow).toBe(false)
    expect(STEP_KEYS.map((key) => states[key])).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming'])
  })

  it('completes every step on a level-certificate case, and stops at the entry quiz on an experience-certificate case', () => {
    expect(Object.values(caseJourney({ status: 'completed', after_quiz: { completion_route: 'level_certificate' } }).states)).toEqual(Array(7).fill('done'))
    const experience = caseJourney({ status: 'completed', after_quiz: { completion_route: 'experience_certificate' } }, 'ar')
    expect(STEP_KEYS.map((key) => experience.states[key])).toEqual(['done', 'done', 'done', 'skipped', 'skipped', 'skipped', 'skipped'])
    expect(experience.marker).toEqual({ stepKey: 'entry_quiz', text: 'انتهى بشهادة تثبيت الخبرة' })
  })

  it('closes a case rejected after the screening decision at that step', () => {
    const { states } = caseJourney({ status: 'rejected', latest_screening_decision: { decision: 'decline' } })
    expect(STEP_KEYS.map((key) => states[key])).toEqual(['done', 'closed', 'skipped', 'skipped', 'skipped', 'skipped', 'skipped'])
  })

  // Walk of 18 Oct 2026: the decline action leaves no screening decision row; the stamped reason says where the case closed.
  it.each([
    ['screening_declined', ['done', 'closed', 'skipped', 'skipped', 'skipped', 'skipped', 'skipped']],
    ['interview_declined', ['done', 'closed', 'skipped', 'skipped', 'skipped', 'skipped', 'skipped']],
    ['interview_no_show', ['done', 'closed', 'skipped', 'skipped', 'skipped', 'skipped', 'skipped']],
    ['intake_declined', ['closed', 'skipped', 'skipped', 'skipped', 'skipped', 'skipped', 'skipped']],
  ])('closes a case declined with %s at the step that reason names', (reason, expected) => {
    const { states } = caseJourney({ status: 'rejected', latest_screening_decision: null, decline_reason_code: reason })
    expect(STEP_KEYS.map((key) => states[key])).toEqual(expected)
  })

  it('closes a case withdrawn while learning at the learning step', () => {
    const { states } = caseJourney({ status: 'withdrawn', latest_screening_decision: {}, course_plan: { entry_quiz_result: 'failed', has_plan: true, in_force_version: 1 }, after_quiz: { final_exam_state: AFTER_QUIZ_STATES.finalExamNotYet } })
    expect(STEP_KEYS.map((key) => states[key])).toEqual(['done', 'done', 'done', 'done', 'closed', 'skipped', 'skipped'])
  })

  it('gives a pre-flow case no stepper: the Next step sentence says where it stands', () => {
    const journey = caseJourney({ status: 'committee_review' }, 'en')
    expect(journey).toEqual({ preflow: true, states: {}, marker: null })
    expect(caseNextStep({ status: 'committee_review' }, { hasPermission: all }).sentence.en).toBe('Pre-flow committee case: Committee review.')
  })
})
