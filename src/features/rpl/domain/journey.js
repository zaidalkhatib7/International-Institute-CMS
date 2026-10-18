import { formatLocalizedDateTime } from '../../../utils/localization'
import { APPLICATION_STATUS, localize } from './rpl'
import { fill } from './documentScreening'
import { AFTER_QUIZ_STATES } from './afterQuiz'

/*
 * THE FIRST PATH'S JOURNEY ON THE PLATFORM (owner, 18 Oct 2026: "enhance the
 * experience and the journey focusing on the first path"; PLATFORM-JOURNEY-SPEC
 * §4.2, §4.3, §5.1).
 *
 * One place says where a professional case stands: its stage (from its status),
 * its work queue (from the API's `work_queue`, which the same rule as the queue
 * counts and lists computes), the steps of its stepper and the Next step sentence.
 * The platform only explains and opens tabs: the API stays the authority on every
 * action, and when a fact is missing the card falls back to the status sentence.
 */

const L = (ar, en) => Object.freeze({ ar, en })

/** The stages of the professional path, in order, with the statuses each holds (§4.2). */
export const STAGES = Object.freeze([
  { key: 'request', label: L('الطلب', 'Request'), statuses: ['draft', 'submitted', 'administrative_review', 'awaiting_applicant'] },
  { key: 'decision', label: L('الفرز والقرار', 'Screening & decision'), statuses: ['evidence_verification', 'interview_required'] },
  { key: 'entry_quiz', label: L('اختبار الدخول', 'Entry quiz'), statuses: ['ready_for_assessment', 'assessment_in_progress'] },
  { key: 'course_plan', label: L('خطة الدورات', 'Course plan'), statuses: ['course_plan_review'] },
  { key: 'learning', label: L('التعلم', 'Learning'), statuses: ['course_plan_active'] },
  { key: 'final_exam', label: L('الاختبار النهائي', 'Final exam'), statuses: ['final_exam'] },
  { key: 'certificate', label: L('الشهادة', 'Certificate'), statuses: ['credential_pending'] },
  { key: 'closed', label: L('مغلقة', 'Closed'), statuses: ['completed', 'rejected', 'withdrawn'] },
  { key: 'pre_flow', label: L('المسار السابق', 'Pre-flow'), statuses: ['quality_review', 'committee_review', 'remediation_required', 'decision_issued', 'appeal_open', 'under_appeal', 'returned_for_rework'] },
])

/** The seven steps of the stepper: the open stages, in order. */
export const STEP_KEYS = Object.freeze(['request', 'decision', 'entry_quiz', 'course_plan', 'learning', 'final_exam', 'certificate'])

export const STATUS_TO_STAGE = Object.freeze(Object.fromEntries(STAGES.flatMap((stage) => stage.statuses.map((status) => [status, stage.key]))))

export const PRE_FLOW_STATUSES = Object.freeze(STAGES.find((stage) => stage.key === 'pre_flow').statuses)

export function stageOf(status) {
  return STATUS_TO_STAGE[status] || null
}

export function stageLabel(key, language) {
  return localize(STAGES.find((stage) => stage.key === key)?.label, language === 'ar' ? 'ar' : 'en')
}

export function statusesOfStage(key) {
  return STAGES.find((stage) => stage.key === key)?.statuses || []
}

/*
 * THE WORK QUEUES (§5.1), in the API's order. `actor` is who moves the case on:
 * staff (with `permission`), the client, the system, or staff later (a booked
 * interview). `chip` names it in the case list's queue chips; `tile` on Today
 * when staff act; `clientChip` on Today's "waiting for the client" line.
 */
export const QUEUES = Object.freeze([
  { key: 'office_drafts', stage: 'request', actor: 'staff', permission: 'rpl.applications.manage', chip: L('مسودات المكتب', 'Office drafts'), tile: L('مسودات المكتب للإرسال', 'Office drafts to submit') },
  { key: 'client_drafts', stage: 'request', actor: 'client', chip: L('يجهّز العميل طلبه', 'Client preparing'), clientChip: L('يجهّز طلبه', 'Preparing the request') },
  { key: 'intake_review', stage: 'request', actor: 'staff', permission: 'rpl.applications.manage', chip: L('للمراجعة', 'To review'), tile: L('طلبات جديدة للمراجعة', 'New requests to review') },
  { key: 'awaiting_client_info', stage: 'request', actor: 'client', chip: L('بانتظار معلومات العميل', 'Waiting for client information'), clientChip: L('معلومات مطلوبة', 'Information requested') },
  { key: 'information_overdue', stage: 'request', actor: 'staff', permission: 'rpl.applications.manage', chip: L('مهلة المعلومات انتهت', 'Information overdue'), tile: L('طلبات معلومات متأخرة', 'Overdue information requests') },
  { key: 'information_review', stage: 'request', actor: 'staff', permission: 'rpl.applications.manage', chip: L('ردّ العميل', 'Client replied'), tile: L('ردود العملاء للمراجعة', 'Client replies to review') },
  { key: 'screening_decision', stage: 'decision', actor: 'staff', permission: 'rpl.screening.decide', chip: L('بانتظار قرار الفرز', 'Screening decision due'), tile: L('بانتظار قرار الفرز', 'Screening decision due') },
  { key: 'interview_client', stage: 'decision', actor: 'client', chip: L('بانتظار اختيار العميل', 'Client choosing'), clientChip: L('اختيار نوع المقابلة', 'Choosing the interview type') },
  { key: 'interview_schedule', stage: 'decision', actor: 'staff', permission: 'rpl.interviews.manage', chip: L('مقابلات للجدولة', 'To schedule'), tile: L('مقابلات للجدولة', 'Interviews to schedule') },
  { key: 'interview_upcoming', stage: 'decision', actor: 'scheduled', chip: L('مقابلات قادمة', 'Upcoming interviews') },
  { key: 'interview_record', stage: 'decision', actor: 'staff', permission: 'rpl.interviews.manage', chip: L('لتسجيل النتيجة', 'To record'), tile: L('مقابلات لتسجيل نتيجتها', 'Interviews to record') },
  { key: 'interview_decide', stage: 'decision', actor: 'staff', permission: 'rpl.screening.decide', chip: L('قرارات المقابلة', 'Interview decisions'), tile: L('قرارات مقابلة معلّقة', 'Interview decisions due') },
  { key: 'interview_lapsed', stage: 'decision', actor: 'staff', permission: 'rpl.interviews.manage', chip: L('مهلة منتهية', 'Lapsed offers'), tile: L('عروض مقابلة انتهت مهلتها', 'Lapsed interview offers') },
  { key: 'quiz_start', stage: 'entry_quiz', actor: 'staff', permission: 'rpl.applications.manage', chip: L('للبدء', 'To start'), tile: L('اختبارات دخول للبدء', 'Entry quizzes to start') },
  { key: 'quiz_prepare', stage: 'entry_quiz', actor: 'staff', permission: 'rpl.applications.manage', chip: L('للتجهيز والإرسال', 'To prepare and send'), tile: L('اختبارات دخول للتجهيز والإرسال', 'Entry quizzes to prepare and send') },
  { key: 'quiz_client', stage: 'entry_quiz', actor: 'client', chip: L('بانتظار إجابة العميل', 'Waiting for the client'), clientChip: L('إجابة اختبار الدخول', 'Answering the entry quiz') },
  { key: 'plan_generate', stage: 'entry_quiz', actor: 'staff', permission: 'rpl.course_plans.manage', chip: L('خطط للتوليد', 'Plans to generate'), tile: L('خطط دورات للتوليد', 'Course plans to generate') },
  { key: 'quiz_review', stage: 'entry_quiz', actor: 'staff', permission: 'rpl.applications.manage', chip: L('إجابات للمراجعة', 'Answers to review'), tile: L('إجابات بحاجة إلى مراجعة', 'Answers to review') },
  { key: 'plan_approve', stage: 'course_plan', actor: 'staff', permission: 'rpl.course_plans.manage', chip: L('بانتظار الاعتماد', 'To approve'), tile: L('خطط بانتظار الاعتماد', 'Course plans to approve') },
  { key: 'learning', stage: 'learning', actor: 'client', chip: L('يتعلّم', 'Learning'), clientChip: L('يتعلّم', 'Learning') },
  { key: 'final_exam', stage: 'final_exam', actor: 'client', chip: L('في الاختبار النهائي', 'In the final exam'), clientChip: L('في الاختبار النهائي', 'In the final exam') },
  { key: 'certificate', stage: 'certificate', actor: 'system', chip: L('قيد الإصدار', 'Being issued') },
])

export const QUEUE_KEYS = Object.freeze(QUEUES.map((queue) => queue.key))

/** The staff queues whose tile counts toward "cases for you" (§4.1), in the tiles' order. */
export const STAFF_TILE_QUEUE_KEYS = Object.freeze(['office_drafts', 'intake_review', 'information_overdue', 'information_review', 'screening_decision', 'interview_schedule', 'interview_record', 'interview_decide', 'interview_lapsed', 'quiz_start', 'quiz_prepare', 'quiz_review', 'plan_generate', 'plan_approve'])

/** Today's "waiting for the client" chips, in order. */
export const CLIENT_CHIP_QUEUE_KEYS = Object.freeze(['client_drafts', 'awaiting_client_info', 'interview_client', 'quiz_client', 'learning', 'final_exam'])

export function queueOf(key) {
  return QUEUES.find((queue) => queue.key === key) || null
}

export function queuesOfStage(stage) {
  return QUEUES.filter((queue) => queue.stage === stage)
}

/** The case list URL for a queue: its stage and its key, never a name or an email. */
export function queueHref(key) {
  const queue = queueOf(key)
  return queue ? `/rpl/applications?stage=${queue.stage}&queue=${queue.key}` : '/rpl/applications'
}

/** The tab of the case page that holds a stage's work. */
export const STAGE_TAB = Object.freeze({
  request: 'overview',
  decision: 'decision',
  entry_quiz: 'entry_quiz',
  course_plan: 'course_plan',
  learning: 'course_plan',
  final_exam: 'final_exam',
  certificate: 'final_exam',
  closed: 'overview',
  pre_flow: 'overview',
})

/* ===== The stepper (§4.3) ===== */

export const JOURNEY_COPY = Object.freeze({
  experienceMarker: L('انتهى بشهادة تثبيت الخبرة', 'Ended with the experience certificate'),
})

export function journeySteps(language) {
  const lang = language === 'ar' ? 'ar' : 'en'
  return STEP_KEYS.map((key) => ({ key, label: stageLabel(key, lang) }))
}

function statusLabel(status, language) {
  return localize(APPLICATION_STATUS[status]?.labels, language) || String(status || '')
}

/*
 * The step a decline closed, from the case's stamped reason (RplDeclineReason):
 * a direct decline at screening or after the interview leaves no screening
 * decision row, so its reason is what says the case reached the decision step
 * (walk of 18 Oct 2026). An intake decline closes the request itself.
 */
const DECLINE_REASON_STEP = Object.freeze({
  intake_declined: 'request',
  screening_declined: 'decision',
  interview_declined: 'decision',
  interview_no_show: 'decision',
  quiz_below_pass_mark: 'entry_quiz',
})

/** The furthest step a closed case reached, from what its detail carries. */
function lastReachedStep(application) {
  const afterQuiz = application?.after_quiz || {}
  const plan = application?.course_plan || {}
  let reached = DECLINE_REASON_STEP[application?.decline_reason_code] || 'request'
  if (application?.latest_screening_decision && STEP_KEYS.indexOf(reached) < STEP_KEYS.indexOf('decision')) reached = 'decision'
  if (plan.entry_quiz_result || (Array.isArray(application?.assessments) && application.assessments.length)) reached = 'entry_quiz'
  if (plan.has_plan) reached = 'course_plan'
  if (plan.in_force_version != null) reached = 'learning'
  if (afterQuiz.final_exam_state != null && afterQuiz.final_exam_state !== AFTER_QUIZ_STATES.finalExamNotYet) reached = 'final_exam'
  return reached
}

/**
 * Where the case stands on the stepper: `{ preflow, states, marker }`. A
 * pre-flow case has no stepper: the Next step card's pre-flow sentence says
 * where it stands.
 */
export function caseJourney(application, language = 'en') {
  const lang = language === 'ar' ? 'ar' : 'en'
  const status = application?.status
  if (PRE_FLOW_STATUSES.includes(status)) {
    return { preflow: true, states: {}, marker: null }
  }
  const states = {}
  let marker = null
  if (status === 'completed') {
    if (application?.after_quiz?.completion_route === 'experience_certificate') {
      STEP_KEYS.forEach((key, index) => { states[key] = index <= 2 ? 'done' : 'skipped' })
      marker = { stepKey: 'entry_quiz', text: JOURNEY_COPY.experienceMarker[lang] }
    } else {
      STEP_KEYS.forEach((key) => { states[key] = 'done' })
    }
  } else if (status === 'rejected' || status === 'withdrawn') {
    const reached = STEP_KEYS.indexOf(lastReachedStep(application))
    STEP_KEYS.forEach((key, index) => { states[key] = index < reached ? 'done' : index === reached ? 'closed' : 'skipped' })
  } else {
    const current = STEP_KEYS.indexOf(stageOf(status))
    STEP_KEYS.forEach((key, index) => { states[key] = current < 0 ? 'upcoming' : index < current ? 'done' : index === current ? 'current' : 'upcoming' })
  }
  return { preflow: false, states, marker }
}

/* ===== The Next step card (§4.3) ===== */

export const NEXT_STEP_COPY = Object.freeze({
  title: L('الخطوة التالية', 'Next step'),
  also: L('وأيضًا', 'Also'),
  overdue: L('متأخر', 'Overdue'),
  actors: Object.freeze({
    you: L('عليك', 'Your move'),
    other: L('على فريق آخر', 'Another team'),
    client: L('بانتظار العميل', 'Waiting for the client'),
    automatic: L('تلقائي', 'Automatic'),
    scheduled: L('مجدولة', 'Scheduled'),
  }),
  // The API's RplInterview modes: online and in_person (phone only on a legacy row).
  modes: Object.freeze({ online: L('عبر الإنترنت', 'online'), in_person: L('في المكتب', 'at the office'), phone: L('هاتفية', 'by phone') }),
  submitRequest: L('إرسال الطلب', 'Submit the request'),
  submitConfirm: L('سيُرسل الطلب ويبدأ فرز الوثائق.', 'The request will be submitted and document screening will start.'),
  backToReview: L('إعادة الطلب إلى المراجعة', 'Move back to review'),
  backToReviewConfirm: L('يعود الطلب إلى المراجعة الإدارية، وفيها تقبله للفرز أو تطلب معلومات أخرى أو ترفضه.', 'The case goes back to administrative review, where you accept it for screening, ask for more information, or reject it.'),
  confirmMove: L('تأكيد', 'Confirm'),
  noStep: L('لا خطوة محددة الآن.', 'No defined next step right now.'),
  tabs: Object.freeze({
    overview: L('نظرة عامة', 'Overview'),
    evidence: L('فتح الوثائق', 'Open documents'),
    initialReview: L('المراجعة الأولية', 'Initial review'),
    informationRequests: L('طلبات المعلومات', 'Information requests'),
    decision: L('الفرز والقرار', 'Screening & decision'),
    entryQuiz: L('افتح اختبار الدخول', 'Open the entry quiz'),
    coursePlan: L('خطة الدورات', 'Course plan'),
    finalExam: L('الاختبار النهائي', 'Final exam'),
    payments: L('المدفوعات والشهادات', 'Payments & certificates'),
    governance: L('اللجنة والجودة', 'Committee & quality'),
    certificates: L('سجل الشهادات', 'Certificate register'),
    feeSettings: L('إعدادات الرسوم', 'Fee settings'),
  }),
  also_lines: Object.freeze({
    payment: L('دفعة بانتظار التأكيد', 'A payment is waiting for confirmation'),
    experience: L('شهادة تثبيت الخبرة مدفوعة: بانتظار اعتمادها أو إصدارها', 'The experience certificate is paid: waiting for its approval or issue'),
  }),
  sentences: Object.freeze({
    office_drafts: L('ارفع ملفات العميل ثم أرسل الطلب نيابةً عنه.', 'Upload the client\'s files, then submit the request for them.'),
    client_drafts: L('يجهّز العميل طلبه على الموقع ولم يرسله بعد.', 'The client is preparing the request on the website and has not submitted it yet.'),
    intake_review: L('راجع الطلب: اقبله للفرز أو اطلب معلومات أو ارفضه.', 'Review the request: accept it for screening, ask for information, or reject it.'),
    awaiting_client_info: L('بانتظار معلومات من العميل حتى {date}.', 'Waiting for information from the client until {date}.'),
    awaiting_client_info_nodate: L('بانتظار معلومات من العميل.', 'Waiting for information from the client.'),
    information_overdue: L('انتهت مهلة طلب المعلومات في {date} ولم يرد العميل. تابع معه، أو أغلق الطلب وقرّر.', 'The information request was due on {date} and the client has not replied. Follow up with the client, or close the request and decide.'),
    information_overdue_nodate: L('انتهت مهلة طلب المعلومات ولم يرد العميل. تابع معه، أو أغلق الطلب وقرّر.', 'The information request is past its due date and the client has not replied. Follow up with the client, or close the request and decide.'),
    information_replied: L('ردّ العميل على طلب المعلومات. راجع الرد، ثم أعد الطلب إلى المراجعة أو الفرز.', 'The client replied to the information request. Review the reply, then move the case back to review or screening.'),
    information_none_open: L('لا ينتظر الطلب أي معلومات من العميل. أعده إلى المراجعة أو الفرز.', 'The case is not waiting for any information from the client. Move it back to review or screening.'),
    screening_read: L('اقرأ نتيجة فرز الوثائق ثم قرّر.', 'Read the document screen, then decide.'),
    screening_decide: L('قرّر: اختبار الدخول أو مقابلة أو رفض.', 'Decide: entry quiz, interview, or decline.'),
    interview_client: L('عُرضت مقابلة؛ بانتظار اختيار العميل: عبر الإنترنت أو في المكتب، حتى {date}.', 'An interview was offered; waiting for the client to choose online or office, until {date}.'),
    interview_client_nodate: L('عُرضت مقابلة؛ بانتظار اختيار العميل: عبر الإنترنت أو في المكتب.', 'An interview was offered; waiting for the client to choose online or office.'),
    interview_schedule: L('اختار العميل مقابلة {mode}. حدّد الموعد.', 'The client chose an interview {mode}. Schedule it.'),
    interview_schedule_nomode: L('اختار العميل نوع المقابلة. حدّد الموعد.', 'The client chose the interview type. Schedule it.'),
    interview_upcoming: L('المقابلة {mode} في {date}.', 'The interview {mode} is on {date}.'),
    interview_upcoming_nomode: L('المقابلة في {date}.', 'The interview is on {date}.'),
    interview_record: L('مضى موعد المقابلة. سجّل النتيجة: حضر أو لم يحضر.', 'The interview time has passed. Record the outcome: attended or no-show.'),
    interview_decide: L('سُجّلت نتيجة المقابلة. سجّل القرار: اختبار الدخول أو رفض.', 'The interview outcome is recorded. Record the decision: entry quiz or decline.'),
    interview_lapsed: L('لم يختر العميل نوع المقابلة في المهلة. اعرض مقابلة جديدة أو قرّر.', 'The client did not choose an interview type in time. Offer a new interview or decide.'),
    quiz_start: L('اجتاز الطلب الفرز. ابدأ اختبار الدخول.', 'The case passed screening. Start the entry quiz.'),
    quiz_prepare: L('جهّز اختبار الدخول: أنشئ الأسئلة وراجعها ثم أرسلها إلى العميل.', 'Prepare the entry quiz: create and review the questions, then send them to the client.'),
    quiz_client: L('أُرسل اختبار الدخول؛ بانتظار إجابات العميل.', 'The entry quiz was sent; waiting for the client\'s answers.'),
    quiz_review: L('إجابات اختبار الدخول تحتاج مراجعتك.', 'The entry-quiz answers need your review.'),
    plan_generate_passed: L('نجح العميل في اختبار الدخول. ولّد خطة الدورات؛ ويختار العميل على الموقع بين شهادة تثبيت الخبرة ومتابعة الدورات.', 'The client passed the entry quiz. Generate the course plan; on the website the client chooses between the experience certificate and continuing with courses.'),
    plan_generate_failed: L('لم ينجح العميل في اختبار الدخول. ولّد خطة الدورات لسد الفجوات.', 'The client did not pass the entry quiz. Generate the course plan to close the gaps.'),
    plan_approve: L('راجع خطة الدورات (الإصدار {n}) واعتمدها.', 'Review and approve the course plan (version {n}).'),
    plan_approve_noversion: L('راجع خطة الدورات واعتمدها.', 'Review and approve the course plan.'),
    learning: L('يدرس العميل الدورات المعتمدة في خطته.', 'The client is studying the approved courses in the plan.'),
    final_exam_blocked: L('الاختبار النهائي متوقف. افتح التبويب لمعرفة السبب وإصلاحه.', 'The final exam is blocked. Open the tab to see why and fix it.'),
    final_exam: L('الاختبار النهائي متاح للعميل.', 'The final exam is open to the client.'),
    final_exam_waiting: L('استنفد العميل محاولاته في هذه الجولة؛ تُتاح الإعادة بعد فترة الانتظار.', 'The client used every try of this round; a retake opens after the waiting period.'),
    final_exam_retake_due: L('انتهت فترة الانتظار؛ بانتظار دفع العميل رسوم الإعادة.', 'The waiting period is over; waiting for the client to pay the retake fee.'),
    final_exam_fee_unusable: L('نجح العميل في الاختبار النهائي، لكن رسوم شهادة المستوى ليست بالدولار الأمريكي، فيبقى الطلب هنا حتى تُدخل بالدولار أو تُضبط على صفر.', 'The client passed the final exam, but the level-certificate fee is not in US dollars, so the case waits here until the fee is entered in US dollars or set to 0.'),
    final_exam_passed: L('نجح العميل في الاختبار النهائي؛ تصدر شهادة المستوى تلقائيًا.', 'The client passed the final exam; the level certificate is issued automatically.'),
    certificate_held: L('شهادة المستوى معلّقة. افتح التبويب لمعرفة السبب.', 'The level certificate is on hold. Open the tab to see why.'),
    certificate_awaiting_fee: L('بانتظار دفع العميل رسوم شهادة المستوى؛ تصدر الشهادة بعد الدفع.', 'Waiting for the client to pay the level-certificate fee; the certificate is issued once it is paid.'),
    certificate: L('تصدر شهادة المستوى تلقائيًا.', 'The level certificate is issued automatically.'),
    completed_experience: L('انتهى الملف بشهادة تثبيت الخبرة.', 'The case ended with the experience certificate.'),
    completed: L('اكتمل الملف وصدرت شهادة المستوى.', 'The case is complete and the level certificate is issued.'),
    rejected: L('رُفض الطلب. يمكن للعميل التقديم مجددًا من {date}.', 'The request was declined. The client may apply again from {date}.'),
    rejected_nodate: L('رُفض الطلب.', 'The request was declined.'),
    withdrawn: L('سُحب الطلب.', 'The request was withdrawn.'),
    preflow: L('ملف من مسار اللجنة السابق: {status}.', 'Pre-flow committee case: {status}.'),
  }),
})

/** A sentence in both languages, its placeholders filled per language. */
function both(template, values = {}) {
  return {
    ar: fill(template.ar, typeof values === 'function' ? values('ar') : values),
    en: fill(template.en, typeof values === 'function' ? values('en') : values),
  }
}

const date = (value) => (lang) => ({ date: formatLocalizedDateTime(value, lang) })

/** When the API sends no work_queue at all (an older API), the statuses whose queue is unambiguous. */
const STATUS_QUEUE_FALLBACK = Object.freeze({
  submitted: 'intake_review',
  administrative_review: 'intake_review',
  evidence_verification: 'screening_decision',
  ready_for_assessment: 'quiz_start',
  course_plan_review: 'plan_approve',
  course_plan_active: 'learning',
  final_exam: 'final_exam',
  credential_pending: 'certificate',
})

/** The queue a case is in: the API's own key, or (with no key sent at all) the status's unambiguous one. */
export function caseQueueKey(application) {
  if (!application) return null
  if (typeof application.work_queue === 'string' && QUEUE_KEYS.includes(application.work_queue)) return application.work_queue
  if (Object.prototype.hasOwnProperty.call(application, 'work_queue')) return null
  return STATUS_QUEUE_FALLBACK[application.status] || null
}

function informationRequests(application) {
  return Array.isArray(application?.information_requests) ? application.information_requests.filter(Boolean) : []
}

/** The earliest due date of a request still open: a responded or closed request waits on nobody. */
function earliestOpenDue(application) {
  const open = informationRequests(application)
    .filter((item) => item.status === 'open' && item.due_at)
    .map((item) => item.due_at)
    .sort((a, b) => new Date(a) - new Date(b))
  return open[0] || null
}

/** Whether the latest screen finished and nobody has read it yet: a screen that was refused, failed or is still running has nothing to read. */
function latestScreenUnacknowledged(screenings) {
  const items = Array.isArray(screenings) ? screenings : []
  if (!items.length) return false
  return items[0]?.status === 'completed' && !items[0]?.acknowledged_at
}

function tab(labelKey, key, anchor) {
  return { label: NEXT_STEP_COPY.tabs[labelKey], tab: key, ...(anchor ? { anchor } : {}) }
}

/**
 * The Next step card for a case (§4.3): `{ actor, sentence:{ar,en}, action?,
 * secondary?, also:[...], overdue }`. ctx: `{ hasPermission, screenings }`, all
 * already loaded by the page. The card never acts by itself: an action opens a
 * tab (and scrolls to its anchor) or a link; the one exception is submitting an
 * office draft, offered only when the server allows that move.
 */
export function caseNextStep(application, ctx = {}) {
  const may = typeof ctx.hasPermission === 'function' ? ctx.hasPermission : () => false
  const staff = (permission) => (may(permission) ? 'you' : 'other')
  const S = NEXT_STEP_COPY.sentences
  const status = application?.status
  const afterQuiz = application?.after_quiz || {}
  const plan = application?.course_plan || {}
  const interview = application?.active_interview || {}
  const modeOf = (lang) => localize(NEXT_STEP_COPY.modes[interview.chosen_mode], lang) || ''
  // A mode this map does not know is left out of the sentence, never shown as a gap.
  const knownMode = Boolean(NEXT_STEP_COPY.modes[interview.chosen_mode])
  const result = { actor: null, sentence: null, action: null, secondary: null, also: [], overdue: false, links: [] }

  if (PRE_FLOW_STATUSES.includes(status)) {
    // The committee roles act on it: quality review for rpl.quality.approve, the committee for rpl.committee.decide.
    result.actor = status === 'quality_review' ? staff('rpl.quality.approve') : status === 'committee_review' ? staff('rpl.committee.decide') : 'other'
    result.sentence = both(S.preflow, (lang) => ({ status: statusLabel(status, lang) }))
    if (['quality_review', 'committee_review'].includes(status)) result.action = tab('governance', 'governance')
    return withAlso(result, application, may)
  }
  if (status === 'completed') {
    result.actor = null
    result.sentence = both(afterQuiz.completion_route === 'experience_certificate' ? S.completed_experience : S.completed)
    if (may('certificates.view')) result.action = { label: NEXT_STEP_COPY.tabs.certificates, href: '/certificates' }
    return withAlso(result, application, may)
  }
  if (status === 'rejected') {
    const reapply = application?.reapply_available_at || application?.effective_reapply_available_at
    result.actor = 'client'
    result.sentence = reapply ? both(S.rejected, date(reapply)) : both(S.rejected_nodate)
    return withAlso(result, application, may)
  }
  if (status === 'withdrawn') {
    result.sentence = both(S.withdrawn)
    return withAlso(result, application, may)
  }

  const key = caseQueueKey(application)
  switch (key) {
    case 'office_drafts':
      result.actor = staff('rpl.applications.manage')
      result.sentence = both(S.office_drafts)
      result.action = tab('evidence', 'evidence')
      if (Array.isArray(application?.allowed_transitions) && application.allowed_transitions.includes('submitted') && may('rpl.applications.manage')) {
        result.secondary = { label: NEXT_STEP_COPY.submitRequest, confirm: NEXT_STEP_COPY.submitConfirm, transition: 'submitted' }
      }
      break
    case 'client_drafts':
      result.actor = 'client'
      result.sentence = both(S.client_drafts)
      break
    case 'intake_review':
      result.actor = staff('rpl.applications.manage')
      result.sentence = both(S.intake_review)
      result.action = tab('initialReview', 'overview', 'initial-review')
      break
    case 'awaiting_client_info': {
      const due = earliestOpenDue(application)
      result.actor = 'client'
      result.sentence = due ? both(S.awaiting_client_info, date(due)) : both(S.awaiting_client_info_nodate)
      result.overdue = Boolean(due && new Date(due).getTime() < Date.now())
      result.action = tab('informationRequests', 'overview', 'information-requests')
      break
    }
    case 'information_overdue': {
      const due = earliestOpenDue(application)
      result.actor = staff('rpl.applications.manage')
      result.sentence = due ? both(S.information_overdue, date(due)) : both(S.information_overdue_nodate)
      result.overdue = true
      result.action = tab('informationRequests', 'overview', 'information-requests')
      break
    }
    case 'information_review':
      result.actor = staff('rpl.applications.manage')
      result.sentence = both(informationRequests(application).some((item) => item.status === 'responded') ? S.information_replied : S.information_none_open)
      result.action = tab('informationRequests', 'overview', 'information-requests')
      // The move back to review, offered only when the server allows it; the server still decides.
      if (Array.isArray(application?.allowed_transitions) && application.allowed_transitions.includes('administrative_review') && may('rpl.applications.manage')) {
        result.secondary = { label: NEXT_STEP_COPY.backToReview, confirm: NEXT_STEP_COPY.backToReviewConfirm, confirmLabel: NEXT_STEP_COPY.confirmMove, transition: 'administrative_review' }
      }
      break
    case 'screening_decision':
      result.actor = staff('rpl.screening.decide')
      result.sentence = both(may('rpl.screening.view') && latestScreenUnacknowledged(ctx.screenings) ? S.screening_read : S.screening_decide)
      result.action = tab('decision', 'decision')
      break
    case 'interview_client':
      result.actor = 'client'
      result.sentence = interview.response_due_at ? both(S.interview_client, date(interview.response_due_at)) : both(S.interview_client_nodate)
      result.action = tab('decision', 'decision')
      break
    case 'interview_schedule':
      result.actor = staff('rpl.interviews.manage')
      result.sentence = knownMode ? both(S.interview_schedule, (lang) => ({ mode: modeOf(lang) })) : both(S.interview_schedule_nomode)
      result.action = tab('decision', 'decision')
      break
    case 'interview_upcoming':
      result.actor = 'scheduled'
      result.sentence = both(knownMode ? S.interview_upcoming : S.interview_upcoming_nomode, (lang) => ({ mode: modeOf(lang), date: formatLocalizedDateTime(interview.scheduled_at, lang) }))
      result.action = tab('decision', 'decision')
      break
    case 'interview_record':
      result.actor = staff('rpl.interviews.manage')
      result.sentence = both(S.interview_record)
      result.action = tab('decision', 'decision')
      break
    case 'interview_decide':
      result.actor = staff('rpl.screening.decide')
      result.sentence = both(S.interview_decide)
      result.action = tab('decision', 'decision')
      break
    case 'interview_lapsed':
      result.actor = staff('rpl.interviews.manage')
      result.sentence = both(S.interview_lapsed)
      result.action = tab('decision', 'decision')
      break
    case 'quiz_start':
    case 'quiz_prepare':
    case 'quiz_review':
      result.actor = staff('rpl.applications.manage')
      result.sentence = both(S[key])
      result.action = tab('entryQuiz', 'entry_quiz')
      break
    case 'quiz_client':
      result.actor = 'client'
      result.sentence = both(S.quiz_client)
      result.action = tab('entryQuiz', 'entry_quiz')
      break
    case 'plan_generate':
      result.actor = staff('rpl.course_plans.manage')
      result.sentence = both(plan.entry_quiz_result === 'passed' ? S.plan_generate_passed : S.plan_generate_failed)
      result.action = tab('coursePlan', 'course_plan')
      break
    case 'plan_approve':
      result.actor = staff('rpl.course_plans.manage')
      result.sentence = plan.draft_version != null ? both(S.plan_approve, { n: plan.draft_version }) : both(S.plan_approve_noversion)
      result.action = tab('coursePlan', 'course_plan')
      break
    case 'learning':
      result.actor = 'client'
      result.sentence = both(S.learning)
      result.action = tab('coursePlan', 'course_plan')
      break
    case 'final_exam': {
      // A pass whose certification fee is unusable waits in final_exam (the API's
      // feeUnusableProblem holds only there), so it is read before the exam's state.
      const examState = afterQuiz.final_exam_state
      if (afterQuiz.level_certificate_state === AFTER_QUIZ_STATES.levelFeeUnusable) {
        result.actor = staff('rpl.applications.manage')
        result.sentence = both(S.final_exam_fee_unusable)
        if (may('rpl.settings.manage')) result.links.push({ label: NEXT_STEP_COPY.tabs.feeSettings, href: '/rpl/configuration?tab=fees' })
      } else if (examState === AFTER_QUIZ_STATES.finalExamBlocked) {
        result.actor = staff('rpl.applications.manage')
        result.sentence = both(S.final_exam_blocked)
      } else if (examState === AFTER_QUIZ_STATES.finalExamWaiting) {
        result.actor = 'client'
        result.sentence = both(S.final_exam_waiting)
      } else if (examState === AFTER_QUIZ_STATES.finalExamRetakeDue) {
        result.actor = 'client'
        result.sentence = both(S.final_exam_retake_due)
      } else if (examState === AFTER_QUIZ_STATES.finalExamPassed) {
        result.actor = 'automatic'
        result.sentence = both(S.final_exam_passed)
      } else {
        result.actor = 'client'
        result.sentence = both(S.final_exam)
      }
      result.action = tab('finalExam', 'final_exam')
      break
    }
    case 'certificate': {
      const levelState = afterQuiz.level_certificate_state
      if (levelState === AFTER_QUIZ_STATES.levelHeld || levelState === AFTER_QUIZ_STATES.levelFeeUnusable) {
        result.actor = staff('rpl.applications.manage')
        result.sentence = both(S.certificate_held)
        if (levelState === AFTER_QUIZ_STATES.levelFeeUnusable && may('rpl.settings.manage')) result.links.push({ label: NEXT_STEP_COPY.tabs.feeSettings, href: '/rpl/configuration?tab=fees' })
      } else if (levelState === AFTER_QUIZ_STATES.levelAwaitingFee) {
        result.actor = 'client'
        result.sentence = both(S.certificate_awaiting_fee)
      } else {
        result.actor = 'automatic'
        result.sentence = both(S.certificate)
      }
      result.action = tab('finalExam', 'final_exam')
      break
    }
    default: {
      // An open case outside every queue: its status and the tab of its stage, nothing invented.
      const stage = stageOf(status)
      result.sentence = { ar: `${statusLabel(status, 'ar')}. ${NEXT_STEP_COPY.noStep.ar}`, en: `${statusLabel(status, 'en')}. ${NEXT_STEP_COPY.noStep.en}` }
      const tabKey = STAGE_TAB[stage] || 'overview'
      result.action = { label: tabLabelFor(tabKey), tab: tabKey }
    }
  }
  return withAlso(result, application, may)
}

function tabLabelFor(tabKey) {
  const map = { overview: 'overview', decision: 'decision', entry_quiz: 'entryQuiz', course_plan: 'coursePlan', final_exam: 'finalExam' }
  return NEXT_STEP_COPY.tabs[map[tabKey] || 'overview']
}

/** The "Also" lines: a payment to confirm, an experience certificate paid and not yet issued. */
function withAlso(result, application, may) {
  const afterQuiz = application?.after_quiz || {}
  if (Number(afterQuiz.charges_pending) > 0 && may('rpl.payments.reconcile')) {
    result.also.push({ text: NEXT_STEP_COPY.also_lines.payment, tab: 'payments', label: NEXT_STEP_COPY.tabs.payments })
  }
  if (afterQuiz.experience_certificate_state === AFTER_QUIZ_STATES.experienceAwaitingIssue) {
    result.also.push({ text: NEXT_STEP_COPY.also_lines.experience, tab: 'payments', label: NEXT_STEP_COPY.tabs.payments })
  }
  return result
}
