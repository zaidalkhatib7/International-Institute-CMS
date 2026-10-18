import { humanizeCode } from './documentScreening'

/*
 * THE ENTRY QUIZ PASS MARK (owner flow of 12 Oct 2026, plan 4.6 and 6 P4).
 *
 * The platform, never Gemini, marks an entry quiz: correct answers over scored
 * questions, compared STRICTLY greater than the pass mark on the exact fraction
 * (D12(a)), so exactly the mark does not pass. What staff read from it, and what
 * the screen must never lead them to believe:
 *
 *   - ONE overall mark (D12(x)). It is an ENTRY GATE to the learning plan, never
 *     a competency finding (R24): the assessor and the committee still judge
 *     every competency.
 *   - At or below the mark (D11, owner): one attempt only, no retake; NO
 *     Experience Confirmation Certificate (owner, 15 Oct 2026); and the client is
 *     not turned away: Gemini still proposes a course plan for them (P5), and
 *     after it one final exam leads to the level certificate (P6). The failed
 *     wording never calls it a decline.
 *   - Above the mark the client may also buy the Experience Confirmation
 *     Certificate (owner, 15 Oct 2026, P6).
 *   - Referred: the platform could not mark the quiz (a question without an
 *     answer key, or no pass mark set). Nothing is decided automatically (R15).
 *   - Quizzes sent before the pass mark carry no scoring policy and are never
 *     scored or re-judged (D21(a)). A scored result keeps the mark it was judged
 *     by: editing the setting later never re-judges it.
 *   - Reopening a quiz the applicant has already opened needs a documented
 *     technical failure, and a scored quiz never reopens (D11, owner). An opened
 *     quiz is never withdrawn either: it is the one attempt, and it is marked
 *     when answered or when its time runs out.
 *   - A referred quiz is marked again by staff once its cause (in practice the
 *     pass mark setting) is fixed, from the same frozen answers, with a reason.
 *   - All of this applies to a quiz sent under a scoring policy only; a quiz sent
 *     before the pass mark keeps today's reopen and withdraw rules (D21(a)).
 *
 * Arabic and English only (owner, 13 Oct 2026). Every lookup falls back to
 * English, so any other value renders English rather than "undefined".
 */

export const QUIZ_PASS_MARK_KEY = 'rpl_quiz_pass_mark_percent'
export const QUIZ_PASS_MARK_MIN = 1
export const QUIZ_PASS_MARK_MAX = 99
/** The worked example under the setting uses a quiz of this many questions. */
export const QUIZ_PASS_MARK_EXAMPLE_QUESTIONS = 50
export const TECHNICAL_FAILURE_REASON_MIN = 10
export const TECHNICAL_FAILURE_REASON_MAX = 2000
export const RESCORE_REASON_MIN = 10
export const RESCORE_REASON_MAX = 2000

/**
 * The referral codes the server sends (RplQuizScoringService REFERRAL_*), pinned
 * on both sides: the API test "the referral reasons are a fixed contract with
 * the CMS result card" and entryQuiz.test.js.
 */
export const ENTRY_QUIZ_REFERRAL_REASONS = ['issued_item_without_answer_key', 'no_scored_items', 'pass_mark_setting_missing']

const SENT_STATUSES = ['issued', 'answered', 'assessed']

export const ENTRY_QUIZ_COPY = {
  ar: {
    title: 'نتيجة اختبار الدخول',
    gateNote: 'علامة إجمالية واحدة: بوابة دخول إلى خطة التعلم، وليست حكمًا على أي كفاءة. يظل المقيّم واللجنة يحكمان على كل كفاءة.',
    correctOfScored: 'الإجابات الصحيحة: {correct} من {scored}',
    percent: '{percent}٪',
    passMark: 'حد النجاح المطبَّق: أكثر من {mark}٪',
    passMarkStrict: 'الحصول على {mark}٪ تمامًا لا يكفي للنجاح.',
    passMarkOther: 'حد النجاح المطبَّق: {mark}٪ ({comparison})',
    frozen: 'تحتفظ كل نتيجة بحد النجاح الذي حُكم بها؛ وتعديل الإعداد لاحقًا لا يعيد الحكم عليها.',
    resultLabels: {
      passed: 'ناجح',
      failed: 'لم ينجح',
      referred: 'محال إلى الموظفين',
    },
    resultExplanation: {
      // Owner model of 15 Oct 2026 (P6). The failed sentence never uses the word for a decline: the client stays on the pathway.
      passed: 'ناجح. يمكن للعميل شراء شهادة تثبيت الخبرة، وتقود خطة الدورات إلى اختبار نهائي واحد وشهادة المستوى.',
      failed: 'غير ناجح. محاولة واحدة فقط دون إعادة: لا شهادة تثبيت خبرة لهذا العميل. ويبقى العميل في المسار: تقود خطة الدورات ثم اختبار نهائي واحد إلى شهادة المستوى.',
      referred: 'تعذّر على المنصة تصحيح هذا الاختبار، فلم يُتخذ أي قرار تلقائيًا. يجب أن يعالج موظف السبب ثم يعيد التصحيح، ولا يمكن نقل الملف إلى مراجعة الجودة قبل ذلك.',
    },
    referralReason: 'السبب: {reason}',
    referralReasons: {
      issued_item_without_answer_key: 'سؤال واحد على الأقل أُرسل بلا مفتاح إجابة',
      no_scored_items: 'لا توجد أسئلة قابلة للتصحيح',
      pass_mark_setting_missing: 'إعداد حد النجاح غير مضبوط أو غير صالح',
    },
    closedByLabel: 'أُغلق',
    closedBy: {
      all_answered: 'أُجيب عن كل الأسئلة',
      timer_expired: 'انتهى الوقت؛ تُحتسب الأسئلة التي بلا إجابة خاطئة',
    },
    scoredAt: 'صُحّح في',
    marksTitle: 'التصحيح لكل سؤال',
    marks: {
      correct: 'صحيحة',
      incorrect: 'خاطئة',
      unanswered: 'بلا إجابة',
      unmarkable: 'بلا مفتاح إجابة',
    },
    heardAtExpiry: 'انتهى الوقت، فصحّحت المنصة الاختبار واحتسبت الأسئلة التي بلا إجابة خاطئة. يُعدّ العميل مسموعًا (استثناء مسجَّل لقاعدة الإجابة عن كل الأسئلة)، ويذكر التقييم الأسئلة التي بقيت بلا إجابة.',
    notScored: 'غير مصحَّح: أُرسل قبل وجود حد النجاح. يبقى هذا الاختبار على القواعد التي أُرسل بموجبها، ولا يُعاد الحكم على شيء.',
    awaiting: 'يُصحَّح تلقائيًا عندما يسلّم العميل كل الإجابات، أو عند انتهاء الوقت، وتُحتسب حينها الأسئلة التي بلا إجابة خاطئة. محاولة واحدة فقط.',
    notSent: 'اختبار دخول: بعد إرساله يُصحَّح تلقائيًا وفق حد النجاح. محاولة واحدة فقط.',
    reopenOpenedRule: 'فتح العميل هذا الاختبار من قبل. محاولة واحدة فقط، فلا يُعاد فتحه إلا بعد عطل تقني موثّق، مثل تعطل المنصة أو انقطاع الاتصال.',
    technicalFailureReason: 'العطل التقني: ما الذي حدث (يُسجَّل في سجل التدقيق)',
    technicalFailurePlaceholder: 'مثال: كانت المنصة متوقفة من 10:05 إلى 10:40 أثناء إجابة العميل.',
    technicalFailureHint: 'من {min} إلى {max} حرف.',
    withdrawBlockedOpened: 'لا يمكن سحب هذا الاختبار: فتحه العميل، وهو محاولة واحدة فقط. يُصحَّح عندما يجيب العميل عن كل الأسئلة أو عند انتهاء الوقت.',
    rescoreTitle: 'إعادة تصحيح اختبار محال',
    rescoreWhy: 'بعد معالجة السبب (عادةً ضبط حد النجاح في الإعدادات)، تصحّح المنصة الاختبار من الإجابات نفسها المجمَّدة، وفق حد النجاح المضبوط حينها. إن بقي السبب فلا يتغير شيء. لا تُعاد أبدًا نتيجة ناجحة أو غير ناجحة.',
    rescore: 'إعادة التصحيح',
    rescoreReason: 'السبب: ما الذي عولج (يُسجَّل في سجل التدقيق)',
    rescorePlaceholder: 'مثال: أعاد المسؤول ضبط حد النجاح على 50٪.',
    rescoreHint: 'من {min} إلى {max} حرف.',
    rescoreConfirm: 'صحّح الآن',
    rescoreCancel: 'إلغاء',
    rescoreDone: 'صُحّح الاختبار من الإجابات المجمَّدة.',
  },
  en: {
    title: 'Entry quiz result',
    gateNote: 'One overall mark: an entry gate to the learning plan, never a competency finding. The assessor and the committee still judge every competency.',
    correctOfScored: 'Correct answers: {correct} of {scored}',
    percent: '{percent}%',
    passMark: 'Pass mark applied: more than {mark}%',
    passMarkStrict: 'Exactly {mark}% does not pass.',
    passMarkOther: 'Pass mark applied: {mark}% ({comparison})',
    frozen: 'Each result keeps the pass mark it was judged by; changing the setting later never re-judges it.',
    resultLabels: {
      passed: 'Passed',
      failed: 'Did not pass',
      referred: 'Referred to staff',
    },
    resultExplanation: {
      passed: 'Passed. The client may buy the Experience Confirmation Certificate, and the course plan leads to one final exam and the level certificate.',
      failed: 'Not passed. One attempt only, with no retake: no Experience Confirmation Certificate for this client. The client stays on the pathway: the course plan and then one final exam lead to the level certificate.',
      referred: 'The platform could not mark this quiz, so nothing was decided automatically. A member of staff must fix the cause and mark it again, and the case cannot move to quality review until then.',
    },
    referralReason: 'Why: {reason}',
    referralReasons: {
      issued_item_without_answer_key: 'at least one question was sent without an answer key',
      no_scored_items: 'there are no questions that can be marked',
      pass_mark_setting_missing: 'the pass mark setting is missing or unusable',
    },
    closedByLabel: 'Closed',
    closedBy: {
      all_answered: 'every question was answered',
      timer_expired: 'the time ran out; unanswered questions count as wrong',
    },
    scoredAt: 'Marked at',
    marksTitle: 'Marks per question',
    marks: {
      correct: 'Correct',
      incorrect: 'Incorrect',
      unanswered: 'Unanswered',
      unmarkable: 'No answer key',
    },
    heardAtExpiry: 'The time ran out, so the platform marked the quiz and counted the unanswered questions as wrong. The applicant counts as heard (a recorded exception to the answer-every-question rule), and the evaluation lists the questions left unanswered.',
    notScored: 'Not scored: sent before the pass mark existed. This quiz keeps the rules it was sent under, and nothing is re-judged.',
    awaiting: 'Marked automatically when the applicant submits every answer, or when the time runs out, when unanswered questions count as wrong. One attempt only.',
    notSent: 'Entry quiz: once sent, it is marked automatically against the pass mark. One attempt only.',
    reopenOpenedRule: 'The applicant has already opened this quiz. One attempt only, so it reopens only after a documented technical failure, such as a platform outage or a lost connection.',
    technicalFailureReason: 'Technical failure: what went wrong (recorded in the audit trail)',
    technicalFailurePlaceholder: 'For example: the platform was unavailable from 10:05 to 10:40 while the applicant was answering.',
    technicalFailureHint: '{min} to {max} characters.',
    withdrawBlockedOpened: 'This quiz cannot be withdrawn: the applicant has opened it, and it is one attempt only. It is marked when every question is answered or when the time runs out.',
    rescoreTitle: 'Mark a referred quiz again',
    rescoreWhy: 'Once the cause is fixed (usually the pass mark setting), the platform marks the quiz from the same frozen answers, against the pass mark set at that moment. If the cause is still there, nothing changes. A passed or failed result is never marked again.',
    rescore: 'Mark again',
    rescoreReason: 'Reason: what was fixed (recorded in the audit trail)',
    rescorePlaceholder: 'For example: the administrator set the pass mark back to 50%.',
    rescoreHint: '{min} to {max} characters.',
    rescoreConfirm: 'Mark now',
    rescoreCancel: 'Cancel',
    rescoreDone: 'The quiz was marked from its frozen answers.',
  },
}

export const QUIZ_PASS_MARK_COPY = {
  ar: {
    title: 'حد النجاح في اختبار الدخول',
    hint: 'إعداد محكوم يقرره المالك (12 أكتوبر 2026)، ولا قيمة افتراضية له في الشيفرة. تصحّح المنصة كل اختبار دخول أُرسل بعد وجود هذا الإعداد، وتقارن نسبة الإجابات الصحيحة بهذا الحد. علامة إجمالية واحدة: بوابة دخول إلى خطة التعلم، وليست حكمًا على أي كفاءة. تحتفظ كل نتيجة بالحد الذي حُكم بها، فلا يعيد تعديله الحكم على اختبار صُحّح، ولا تُصحَّح الاختبارات المرسلة قبل وجوده.',
    label: 'حد النجاح (٪، من 1 إلى 99)',
    rule: 'ينجح العميل بنسبة أكثر من هذا الحد. الحصول على الحد تمامًا لا يكفي للنجاح.',
    example: 'مثال على اختبار من {questions} سؤالًا: {pass} إجابة صحيحة تنجح، و{fail} لا تنجح.',
    missing: 'غير مضبوط: يُحال كل اختبار دخول إلى الموظفين حتى يُحدَّد هذا الإعداد.',
    invalid: 'أدخل عددًا صحيحًا من 1 إلى 99.',
  },
  en: {
    title: 'Entry quiz pass mark',
    hint: 'A governed setting the owner decides (12 Oct 2026); the code holds no default. The platform marks every entry quiz sent after this setting existed, comparing the share of correct answers with this mark. It is one overall mark: an entry gate to the learning plan, never a competency finding. Each result keeps the mark it was judged by, so changing it never re-judges a scored quiz, and quizzes sent before it existed are never scored.',
    label: 'Pass mark (%, 1 to 99)',
    rule: 'A client passes with MORE than this percentage. Exactly this percentage does not pass.',
    example: 'Example with {questions} questions: {pass} correct passes, {fail} correct does not.',
    missing: 'Not set: every entry quiz is referred to staff until it is.',
    invalid: 'Enter a whole number from 1 to 99.',
  },
}

function pick(table, language) {
  return table[language === 'ar' ? 'ar' : 'en']
}

export function entryQuizCopy(language) {
  return pick(ENTRY_QUIZ_COPY, language)
}

export function quizPassMarkCopy(language) {
  return pick(QUIZ_PASS_MARK_COPY, language)
}

/** True once the platform has marked the set. A marked set never reopens. */
export function hasQuizResult(set) {
  return Boolean(set?.quiz_result && typeof set.quiz_result === 'object')
}

/**
 * Where an entry quiz stands, for the result card:
 *   none       not an entry quiz (or a payload from before P4): nothing to show
 *   not_sent   still a draft
 *   not_scored sent before the pass mark existed (scoring_policy null, D21(a))
 *   awaiting   sent under a scoring policy, not marked yet
 *   scored     quiz_result present
 */
export function readEntryQuiz(set) {
  if (!set || set.is_entry_quiz !== true) return { state: 'none', result: null }
  if (hasQuizResult(set)) return { state: 'scored', result: set.quiz_result }
  if (!SENT_STATUSES.includes(set.status)) return { state: 'not_sent', result: null }
  if (set.scoring_policy == null || set.scoring_policy === '') return { state: 'not_scored', result: null }

  return { state: 'awaiting', result: null }
}

/**
 * A quiz the platform closed because the time ran out counts as heard for the
 * answer-completeness gates, with its unanswered questions marked wrong: the
 * recorded exception to the owner's 7 Aug rule (plan R8; D11(i), adopted on the
 * plan recommendation under the owner flow of 12 Oct 2026).
 */
export function isHeardAtExpiry(set) {
  return hasQuizResult(set) && set.quiz_result.closed_by === 'timer_expired'
}

/** The percentage with two decimals, display only; null when the server sent none. */
export function formatQuizPercent(percent) {
  if (percent == null || percent === '' || !Number.isFinite(Number(percent))) return null
  return Number(percent).toFixed(2)
}

/** One question's mark. An answered question with no correctness had no answer key. */
export function entryQuizItemMark(row) {
  if (!row?.answered) return 'unanswered'
  if (row.correct === true) return 'correct'
  if (row.correct === false) return 'incorrect'
  return 'unmarkable'
}

/** item_ref (the item id the panel keys its questions by) to mark. */
export function entryQuizItemMarks(set) {
  const rows = hasQuizResult(set) && Array.isArray(set.quiz_result.items) ? set.quiz_result.items : []
  return new Map(rows.filter((row) => row?.item_ref != null).map((row) => [String(row.item_ref), entryQuizItemMark(row)]))
}

/** A referral reason in words: a known code from the copy, any other code humanised, free text as given. */
export function referralReasonText(reason, copy) {
  if (reason == null || reason === '') return ''
  const text = String(reason)
  return copy.referralReasons[text] || (/\s/.test(text) ? text : humanizeCode(text))
}

/**
 * The applicant has opened this entry quiz at least once: the one attempt (D11,
 * owner). The server's rule, mirrored: a set sent under a scoring policy, with
 * first_opened_at or opened_at. A reopen clears opened_at and keeps
 * first_opened_at, so opened_at alone would forget the attempt after one
 * technical reopen. A set sent before the pass mark keeps today's rules (D21(a)).
 */
export function entryAttemptOpened(set) {
  return Boolean(set?.scoring_policy) && Boolean(set?.first_opened_at || set?.opened_at)
}

/** Reopening a set the applicant has already opened needs a documented technical failure (D11, owner). */
export function reopenNeedsTechnicalFailure(set) {
  return entryAttemptOpened(set)
}

/**
 * E2E-J05-1 (17 Oct 2026): an entry quiz whose answering window is still running
 * reopens for a documented technical failure the applicant reported (owner D11),
 * as the API allows. Only a P4 entry quiz (sent under a scoring policy), only
 * while it is issued and unmarked; the server re-checks every condition.
 */
export function canReopenRunningForTechnicalFailure(set, now = Date.now()) {
  if (!set || set.is_entry_quiz !== true || !set.scoring_policy || set.status !== 'issued' || hasQuizResult(set)) return false
  const due = set.due_at ? new Date(set.due_at).getTime() : Number.NaN
  return Number.isFinite(due) && due >= now
}

/*
 * F4: THE CASE STATUSES THAT ARE CLOSED, mirroring the API's
 * RplApplicationStatus::isClosed(). On a closed case nothing is reopened for the
 * applicant (the server refuses it); an opened quiz is marked when its time runs
 * out. The server stays the authority: a new closed status there would only let
 * the refused control show again, never let it succeed.
 */
export const CLOSED_CASE_STATUSES = Object.freeze(['completed', 'withdrawn', 'rejected'])

/** Whether the set's case is closed, read from the set payload's application.status. A missing status is not closed. */
export function isCaseClosed(set) {
  return CLOSED_CASE_STATUSES.includes(set?.application?.status)
}

/** An opened entry quiz is never withdrawn: it is the one attempt (D11, owner). */
export function withdrawBlockedByAttempt(set) {
  return entryAttemptOpened(set)
}

/** Only a quiz the platform referred is marked again; a passed or failed result is frozen. */
export function canRescoreEntryQuiz(set) {
  return hasQuizResult(set) && set.quiz_result.result === 'referred'
}

export function isRescoreReasonValid(value) {
  const length = String(value ?? '').trim().length
  return length >= RESCORE_REASON_MIN && length <= RESCORE_REASON_MAX
}

export function isTechnicalFailureReasonValid(value) {
  const length = String(value ?? '').trim().length
  return length >= TECHNICAL_FAILURE_REASON_MIN && length <= TECHNICAL_FAILURE_REASON_MAX
}

export function isQuizPassMarkValid(value) {
  const text = String(value ?? '').trim()
  if (!/^\d+$/.test(text)) return false
  const mark = Number(text)
  return mark >= QUIZ_PASS_MARK_MIN && mark <= QUIZ_PASS_MARK_MAX
}

/*
 * The setting's form state. A key the server does not hold is never written
 * with a value nobody chose (the same rule as the screening keys): the mark is
 * governed and has no default (R15), so an absent row stays absent until an
 * administrator types one, and the form says what that means meanwhile.
 */
export function readQuizPassMarkSetting(raw) {
  const stored = raw?.[QUIZ_PASS_MARK_KEY]
  const held = stored != null && stored !== ''
  return { value: held ? String(stored) : '', include: held, error: '' }
}

/** Ready to save: either not being written, or a whole number from 1 to 99. */
export function isQuizPassMarkReady(state) {
  return !state?.include || isQuizPassMarkValid(state.value)
}

export function quizPassMarkPayload(state) {
  return state?.include ? { [QUIZ_PASS_MARK_KEY]: Number(String(state.value).trim()) } : {}
}

/** The server's validation lines for the pass mark, one per line. */
export function quizPassMarkFieldError(error) {
  const errors = error?.response?.data?.errors
  if (!errors || typeof errors !== 'object') return ''
  const lines = Object.entries(errors)
    .filter(([field]) => field === QUIZ_PASS_MARK_KEY || field.startsWith(`${QUIZ_PASS_MARK_KEY}.`))
    .flatMap(([, messages]) => [].concat(messages))
    .filter((line) => typeof line === 'string' && line.trim() !== '')
  return [...new Set(lines)].join('\n')
}

/**
 * The strict rule in numbers: on a quiz of `questions`, the fewest correct
 * answers that pass and the most that do not (correct * 100 > mark * questions).
 */
export function quizPassMarkExample(mark, questions = QUIZ_PASS_MARK_EXAMPLE_QUESTIONS) {
  if (!isQuizPassMarkValid(mark)) return null
  const fail = Math.floor((Number(mark) * questions) / 100)
  return { questions, pass: fail + 1, fail }
}
