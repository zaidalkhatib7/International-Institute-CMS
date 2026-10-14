import { fill } from './documentScreening'

/*
 * THE STAFF DECISION AFTER SCREENING, THE INTERVIEW AND THE DECLINE
 * (owner flow of 12 Oct 2026, plan 4.4, 4.5 and P3).
 *
 * What this module holds the CMS to:
 *
 *   - Staff decide (D6(a)): one staff member records Pass to quiz, Interview or
 *     Decline with a written rationale. The screening figure is shown beside
 *     the decision as advice and is frozen into it as "what staff saw"; it
 *     never chooses the outcome.
 *   - The rationale is staff-only. A declined applicant is told one sentence
 *     from a fixed, neutral list and the date they may apply again (D8(b)):
 *     never the rationale, never a figure, never free text.
 *   - The applicant picks online or at the office; staff then set the time and
 *     the link or address (D9(a)). No time slots, and an interview never stands
 *     in for verified documents.
 *   - An offer past its answer date is expired: shown as such and never
 *     schedulable, even before the server has written the new status.
 *
 * Arabic and English only (owner, 13 Oct 2026). Every lookup falls back to
 * English, so any other value renders English rather than "undefined".
 */

export const CASE_DECISION_PERMISSIONS = Object.freeze({
  decide: 'rpl.screening.decide',
  interviews: 'rpl.interviews.manage',
  // The assessment-scoped update that still records a legacy interview's outcome.
  legacyInterviews: 'rpl.assessments.perform',
  // The office address is read from the RPL settings, which need this.
  settings: 'rpl.settings.manage',
})

export const SCREENING_DECISIONS = Object.freeze(['pass_to_quiz', 'interview_required', 'decline'])
export const INTERVIEW_DECISIONS = Object.freeze(['pass_to_quiz', 'decline'])
export const INTERVIEW_MODES = Object.freeze(['online', 'in_person'])
export const ACTIVE_INTERVIEW_STATUSES = Object.freeze(['offered', 'mode_chosen', 'scheduled'])
/** The two statuses a case may be declined from by the decline route. */
export const DECLINABLE_STATUSES = Object.freeze(['evidence_verification', 'interview_required'])
/** The statuses a legacy (assessment-scoped) interview can be closed with. */
export const LEGACY_INTERVIEW_RESULTS = Object.freeze(['completed', 'no_show', 'cancelled'])

/** The API's validation bounds for these routes. */
export const CASE_DECISION_LIMITS = Object.freeze({
  rationaleMin: 10,
  rationaleMax: 5000,
  overrideMax: 5000,
  offerMessageMax: 2000,
  cancelReasonMin: 3,
  cancelReasonMax: 2000,
  notesMax: 5000,
  legacyOutcomeMax: 10000,
  officeAddressMax: 500,
  responseDaysMin: 1,
  responseDaysMax: 60,
})

export const DECISION_VARIANT = Object.freeze({ pass_to_quiz: 'success', interview_required: 'info', decline: 'danger' })
export const INTERVIEW_STATUS_VARIANT = Object.freeze({
  offered: 'info',
  mode_chosen: 'info',
  scheduled: 'warning',
  completed: 'success',
  no_show: 'danger',
  cancelled: 'neutral',
  expired: 'neutral',
})

export const CASE_DECISION_COPY = {
  ar: {
    tab: 'القرار والمقابلة',
    title: 'قرار ما بعد فرز الوثائق',
    hint: 'يقرر الموظفون الخطوة التالية. مؤشر الفرز استشاري: لا يقرر في الطلب أبدًا، ولا يراه المتقدم.',
    latestScreening: 'أحدث فرز للوثائق',
    noScreening: 'لم يُشغَّل أي فرز للوثائق على هذا الطلب.',
    noCurrentScreening: 'لا يوجد لهذا الطلب فرز مكتمل حالي. ما دام الفرز مفعّلًا، يطلب الخادم سببًا للتجاوز قبل أن يسجّل القرار.',
    staleScreening: 'تغيّرت الأدلة بعد تشغيل هذا الفرز، فلم يعد يصف الوثائق الحالية.',
    coverage: 'قُرئت {read} من {total} وثيقة.',
    decision: 'القرار',
    decisions: { pass_to_quiz: 'إحالة إلى الاختبار', interview_required: 'مقابلة', decline: 'رفض' },
    decisionHints: {
      pass_to_quiz: 'ينتقل الطلب إلى «جاهز للتقييم»، ويبقى شرط الأدلة المتحقق منها قائمًا قبل بدء التقييم.',
      interview_required: 'تُعرض على المتقدم مقابلة يختار أن تكون عبر الإنترنت أو في المكتب، ثم يحدد الموظفون الموعد والرابط أو العنوان. لا تحل المقابلة محل الوثائق المتحقق منها.',
      decline: 'يُغلق الطلب. يرى المتقدم فئة محايدة والتاريخ الذي يمكنه فيه التقديم من جديد، ولا يرى التعليل أبدًا.',
    },
    modes: 'أنماط المقابلة المعروضة',
    modeLabels: { online: 'عبر الإنترنت', in_person: 'في المكتب', phone: 'هاتفية' },
    modesRequired: 'اختر نمطًا واحدًا على الأقل.',
    offerMessage: 'رسالة إلى المتقدم (اختيارية)',
    offerMessageHint: 'تظهر للمتقدم مع الدعوة، بحد أقصى 2000 حرف. لا تذكر أي مؤشر للفرز أو أي شبهة.',
    offerMessageTooLong: 'بحد أقصى 2000 حرف.',
    category: 'الفئة التي يراها المتقدم',
    categoryHint: 'لا يُبلَّغ المتقدم إلا بهذه الجملة وبالتاريخ الذي يمكنه فيه التقديم من جديد.',
    categoryRequired: 'اختر فئة.',
    applicantReads: 'ما يقرؤه المتقدم',
    rationale: 'التعليل (للموظفين فقط)',
    rationaleHint: 'مطلوب، من 10 إلى 5000 حرف. يُحفظ في السجل للموظفين وجهات الاعتماد، ولا يظهر للمتقدم أبدًا.',
    rationaleInvalid: 'اكتب ما بين 10 و5000 حرف.',
    overrideReason: 'سبب التجاوز',
    overrideHint: 'اذكر لماذا تقرر دون فرز مكتمل حالي. بحد أقصى 5000 حرف.',
    overrideRequired: 'يطلبه الخادم لهذا القرار.',
    submit: 'تسجيل القرار',
    submitDecline: 'رفض الطلب',
    confirmDecline: 'تأكيد الرفض',
    confirmDeclineHint: 'يُغلق الطلب، ولا يستطيع المتقدم التقديم من جديد إلا بعد انتهاء مهلة الانتظار. لا يمكن التراجع عن الرفض.',
    back: 'رجوع',
    passAndStart: 'إحالة إلى الاختبار وبدء التقييم',
    passAndStartHint: 'يسجّل القرار، ثم يبدأ تقييم المدير الخاص بك.',
    recorded: {
      pass_to_quiz: 'سُجّل القرار: الطلب جاهز للتقييم.',
      interview_required: 'سُجّل القرار: عُرضت المقابلة على المتقدم.',
      decline: 'سُجّل القرار: رُفض الطلب.',
    },
    startFailed: 'سُجّل القرار، لكن تعذّر بدء التقييم.',
    failed: 'تعذّر تسجيل القرار.',
    history: 'سجل القرارات',
    historyEmpty: 'لم يُسجَّل أي قرار بعد الفرز.',
    historyLoading: 'جارٍ تحميل سجل القرارات…',
    historyLoadError: 'تعذّر تحميل سجل القرارات.',
    retry: 'إعادة المحاولة',
    decidedBy: 'قرّره {name} في {at}',
    someone: 'أحد الموظفين',
    overrideRecorded: 'سبب التجاوز',
    seenAtDecision: 'الفرز كما رآه الموظف عند القرار',
    snapshotState: { completed: 'فرز مكتمل', stale: 'فرز قديم', none: 'لا يوجد فرز مكتمل', screening_disabled: 'كان الفرز موقوفًا' },
    employerSummary: 'جهات العمل: {found_consistent} متسقة، {found_inconsistent} غير متسقة، {not_found_online} لم يُعثر عليها على الإنترنت، {ambiguous} غير حاسمة، {not_checked} لم تُفحص.',
    latestDecisionTitle: 'قرار ما بعد الفرز',
    noDecisionYet: 'لم يُسجَّل أي قرار بعد الفرز على هذا الطلب.',
    awaitingDecision: 'ينتظر هذا الطلب قرار ما بعد فرز الوثائق.',
    goToDecision: 'تسجيل القرار',
    awaitingInterview: 'ينتظر هذا الطلب المقابلة.',
    goToInterview: 'إدارة المقابلة',
  },
  en: {
    tab: 'Decision & interview',
    title: 'Screening decision',
    hint: 'Staff decide what happens next. The screening figure is advisory: it never decides the case, and the applicant never sees it.',
    latestScreening: 'Latest document screening',
    noScreening: 'No document screening has run on this case.',
    noCurrentScreening: 'This case has no current completed screen. While screening is switched on, the server asks for an override reason before it records a decision.',
    staleScreening: 'Evidence changed after this screen ran, so it no longer describes the current documents.',
    coverage: 'Read {read} of {total} documents.',
    decision: 'Decision',
    decisions: { pass_to_quiz: 'Pass to quiz', interview_required: 'Interview', decline: 'Decline' },
    decisionHints: {
      pass_to_quiz: 'The case moves to "Ready for assessment". The verified-evidence gate still applies before the assessment starts.',
      interview_required: 'The applicant is offered an interview and chooses online or at the office; staff then set the time and the link or address. An interview never stands in for verified documents.',
      decline: 'The request is closed. The applicant sees a neutral category and the date they may apply again, never the rationale.',
    },
    modes: 'Interview modes to offer',
    modeLabels: { online: 'Online', in_person: 'At the office', phone: 'Phone' },
    modesRequired: 'Choose at least one mode.',
    offerMessage: 'Message to the applicant (optional)',
    offerMessageHint: 'Shown to the applicant with the invitation, at most 2,000 characters. Never mention a screening figure or a suspicion.',
    offerMessageTooLong: 'At most 2,000 characters.',
    category: 'Category the applicant sees',
    categoryHint: 'The applicant is told only this sentence and the date they may apply again.',
    categoryRequired: 'Choose a category.',
    applicantReads: 'What the applicant reads',
    rationale: 'Rationale (staff only)',
    rationaleHint: 'Required, 10 to 5,000 characters. Kept on the record for staff and accreditors; never shown to the applicant.',
    rationaleInvalid: 'Write between 10 and 5,000 characters.',
    overrideReason: 'Override reason',
    overrideHint: 'Say why you decide without a current completed screen. At most 5,000 characters.',
    overrideRequired: 'Required by the server for this decision.',
    submit: 'Record decision',
    submitDecline: 'Decline the request',
    confirmDecline: 'Confirm the decline',
    confirmDeclineHint: 'The case closes and the applicant may apply again only after the cooldown. A decline cannot be undone.',
    back: 'Back',
    passAndStart: 'Pass to quiz and start the assessment',
    passAndStartHint: 'Records the decision, then starts your administrator assessment.',
    recorded: {
      pass_to_quiz: 'Decision recorded: the case is ready for assessment.',
      interview_required: 'Decision recorded: the interview was offered to the applicant.',
      decline: 'Decision recorded: the request was declined.',
    },
    startFailed: 'The decision was recorded, but the assessment could not be started.',
    failed: 'The decision could not be recorded.',
    history: 'Decision history',
    historyEmpty: 'No screening decision has been recorded.',
    historyLoading: 'Loading the decision history…',
    historyLoadError: 'Unable to load the decision history.',
    retry: 'Try again',
    decidedBy: 'Decided by {name} on {at}',
    someone: 'a staff member',
    overrideRecorded: 'Override reason',
    seenAtDecision: 'Screening as staff saw it at the decision',
    snapshotState: { completed: 'Completed screen', stale: 'Stale screen', none: 'No completed screen', screening_disabled: 'Screening was switched off' },
    employerSummary: 'Employers: {found_consistent} consistent, {found_inconsistent} inconsistent, {not_found_online} not found online, {ambiguous} ambiguous, {not_checked} not checked.',
    latestDecisionTitle: 'Screening decision',
    noDecisionYet: 'No screening decision has been recorded on this case.',
    awaitingDecision: 'This case awaits the screening decision.',
    goToDecision: 'Record the decision',
    awaitingInterview: 'This case is waiting for its interview.',
    goToInterview: 'Manage the interview',
  },
}

export const INTERVIEW_COPY = {
  ar: {
    title: 'المقابلة',
    hint: 'يختار المتقدم أن تكون المقابلة عبر الإنترنت أو في المكتب، ثم يحدد الموظفون الموعد والرابط أو العنوان. لا تحل المقابلة أبدًا محل الوثائق المتحقق منها.',
    loading: 'جارٍ تحميل المقابلات…',
    loadError: 'تعذّر تحميل المقابلات.',
    retry: 'إعادة المحاولة',
    empty: 'لم تُعرض أي مقابلة على هذا الطلب.',
    current: 'المقابلة الحالية',
    history: 'مقابلات سابقة',
    status: { offered: 'معروضة', mode_chosen: 'اختير النمط', scheduled: 'مجدولة', completed: 'عُقدت', no_show: 'لم يحضر', cancelled: 'ملغاة', expired: 'منتهية المهلة' },
    legacy: 'مقابلة تقييم سابقة',
    openAssessment: 'فتح التقييم',
    offeredModes: 'الأنماط المعروضة',
    offerMessage: 'الرسالة إلى المتقدم',
    offeredBy: 'عرضها',
    offeredAt: 'تاريخ العرض',
    responseDue: 'آخر موعد لرد المتقدم',
    chosenMode: 'النمط',
    chosenByApplicant: 'اختاره المتقدم',
    chosenByStaff: 'سجّله الموظف نيابة عن المتقدم',
    chosenAt: 'تاريخ الاختيار',
    scheduledAt: 'الموعد',
    location: 'الرابط أو العنوان',
    officeAddressSnapshot: 'عنوان المكتب المُبلَّغ للمتقدم',
    notes: 'ملاحظات (للموظفين فقط)',
    minutes: 'رقم ملف المحضر',
    decision: 'القرار',
    decisionRationale: 'التعليل (للموظفين فقط)',
    decidedBy: 'قرّره',
    decidedAt: 'تاريخ القرار',
    cancelledReason: 'سبب الإلغاء (للموظفين فقط)',
    legacyOutcome: 'النتيجة',
    someone: 'أحد الموظفين',
    modeLabels: { online: 'عبر الإنترنت', in_person: 'في المكتب', phone: 'هاتفية' },
    decisions: { pass_to_quiz: 'إحالة إلى الاختبار', decline: 'رفض' },
    awaitingChoice: 'بانتظار أن يختار المتقدم بين الإنترنت والمكتب. إن أبلغك باختياره فسجّله عند الجدولة.',
    expiredHint: 'لم يختر المتقدم نمطًا قبل انتهاء المهلة، فلم يعد بالإمكان الرد على هذا العرض. اعرض مقابلة جديدة أو ارفض الطلب.',
    offerTitle: 'عرض مقابلة',
    offerHint: 'يُبلَّغ المتقدم ويختار أحد الأنماط التي تعرضها.',
    modes: 'الأنماط المعروضة',
    modesRequired: 'اختر نمطًا واحدًا على الأقل.',
    offerMessageLabel: 'رسالة إلى المتقدم (اختيارية)',
    offerMessageHint: 'تظهر للمتقدم، بحد أقصى 2000 حرف. لا تذكر أي مؤشر للفرز أو أي شبهة.',
    offerMessageTooLong: 'بحد أقصى 2000 حرف.',
    offerSubmit: 'عرض المقابلة',
    offeredDone: 'عُرضت المقابلة على المتقدم.',
    scheduleTitle: 'جدولة المقابلة',
    rescheduleTitle: 'إعادة جدولة المقابلة',
    reschedule: 'إعادة الجدولة',
    recordMode: 'النمط الذي اختاره المتقدم',
    recordModeHint: 'لم يختر المتقدم عبر البوابة. سجّل النمط الذي طلبه، وسيُعلَّم بأنه مسجّل من الموظف.',
    modeRequired: 'اختر النمط.',
    scheduledAtLabel: 'الموعد',
    scheduledAtFuture: 'اختر موعدًا في المستقبل.',
    link: 'رابط الاجتماع',
    linkHint: 'رابط يبدأ بـ https://. يراه المتقدم بعد جدولة المقابلة.',
    linkInvalid: 'أدخل رابطًا يبدأ بـ https://.',
    address: 'عنوان المكتب',
    addressHint: 'مملوء مسبقًا من إعداد عنوان المكتب بلغة المتقدم. إن تُرك فارغًا استخدم الخادم ذلك الإعداد.',
    scheduleSubmit: 'حفظ الموعد',
    scheduledDone: 'جُدولت المقابلة.',
    completeTitle: 'تسجيل انعقاد المقابلة',
    completeNotes: 'ملاحظات (للموظفين فقط، اختيارية)',
    notesTooLong: 'بحد أقصى 5000 حرف.',
    minutesId: 'رقم ملف المحضر (اختياري)',
    minutesHint: 'رقم الوسائط لملف محضر مرفوع. يتحقق الخادم من أنه يخص هذا الطلب.',
    minutesInvalid: 'أدخل عددًا صحيحًا.',
    completeSubmit: 'تسجيل الانعقاد',
    completedDone: 'سُجّل انعقاد المقابلة.',
    noShow: 'لم يحضر المتقدم',
    noShowConfirm: 'هل تسجّل أن المتقدم لم يحضر؟ بعد ذلك يكون القرار الوحيد الممكن هو الرفض.',
    noShowSubmit: 'تسجيل عدم الحضور',
    noShowDone: 'سُجّل عدم الحضور.',
    cancel: 'إلغاء المقابلة',
    cancelReason: 'السبب (للموظفين فقط)',
    cancelReasonHint: 'من 3 إلى 2000 حرف. لا يظهر للمتقدم أبدًا.',
    cancelReasonInvalid: 'اكتب ما بين 3 و2000 حرف.',
    cancelSubmit: 'تأكيد الإلغاء',
    cancelledDone: 'أُلغيت المقابلة.',
    back: 'رجوع',
    decideTitle: 'القرار بعد المقابلة',
    decideNoShowHint: 'لم يحضر المتقدم، فالقرار الوحيد الممكن هو الرفض.',
    decideSubmit: 'تسجيل القرار',
    decidedDone: { pass_to_quiz: 'سُجّل القرار: الطلب جاهز للتقييم.', decline: 'سُجّل القرار: رُفض الطلب.' },
    legacyTitle: 'تسجيل النتيجة',
    legacyHint: 'تتبع هذه المقابلة تقييمًا بدأ قبل نقل المقابلات إلى الطلب.',
    legacyResult: 'النتيجة',
    legacyResults: { completed: 'عُقدت', no_show: 'لم يحضر', cancelled: 'ملغاة' },
    legacyOutcomeLabel: 'الملاحظات على النتيجة (اختيارية)',
    legacySubmit: 'حفظ النتيجة',
    legacyDone: 'حُفظت النتيجة.',
    failed: 'تعذّر إكمال الإجراء.',
  },
  en: {
    title: 'Interview',
    hint: 'The applicant chooses online or at the office; staff then set the time and the link or address. An interview never stands in for verified documents.',
    loading: 'Loading the interviews…',
    loadError: 'Unable to load the interviews.',
    retry: 'Try again',
    empty: 'No interview has been offered on this case.',
    current: 'Current interview',
    history: 'Earlier interviews',
    status: { offered: 'Offered', mode_chosen: 'Mode chosen', scheduled: 'Scheduled', completed: 'Held', no_show: 'No-show', cancelled: 'Cancelled', expired: 'Expired' },
    legacy: 'Earlier assessment interview',
    openAssessment: 'Open the assessment',
    offeredModes: 'Modes offered',
    offerMessage: 'Message to the applicant',
    offeredBy: 'Offered by',
    offeredAt: 'Offered on',
    responseDue: 'Applicant answers by',
    chosenMode: 'Mode',
    chosenByApplicant: 'chosen by the applicant',
    chosenByStaff: 'recorded by staff for the applicant',
    chosenAt: 'Chosen on',
    scheduledAt: 'Date and time',
    location: 'Link or address',
    officeAddressSnapshot: 'Office address given to the applicant',
    notes: 'Notes (staff only)',
    minutes: 'Minutes file ID',
    decision: 'Decision',
    decisionRationale: 'Rationale (staff only)',
    decidedBy: 'Decided by',
    decidedAt: 'Decided on',
    cancelledReason: 'Cancellation reason (staff only)',
    legacyOutcome: 'Outcome',
    someone: 'a staff member',
    modeLabels: { online: 'Online', in_person: 'At the office', phone: 'Phone' },
    decisions: { pass_to_quiz: 'Pass to quiz', decline: 'Decline' },
    awaitingChoice: 'Waiting for the applicant to choose online or at the office. If they told you their choice, record it when you schedule.',
    expiredHint: 'The applicant did not choose a mode before the deadline, so this offer can no longer be answered. Offer a new interview or decline the request.',
    offerTitle: 'Offer an interview',
    offerHint: 'The applicant is notified and chooses one of the modes you offer.',
    modes: 'Modes to offer',
    modesRequired: 'Choose at least one mode.',
    offerMessageLabel: 'Message to the applicant (optional)',
    offerMessageHint: 'Shown to the applicant, at most 2,000 characters. Never mention a screening figure or a suspicion.',
    offerMessageTooLong: 'At most 2,000 characters.',
    offerSubmit: 'Offer the interview',
    offeredDone: 'Interview offered to the applicant.',
    scheduleTitle: 'Schedule the interview',
    rescheduleTitle: 'Reschedule the interview',
    reschedule: 'Reschedule',
    recordMode: 'Mode the applicant chose',
    recordModeHint: 'The applicant has not chosen in the portal. Record the mode they asked for; it is marked as recorded by staff.',
    modeRequired: 'Choose the mode.',
    scheduledAtLabel: 'Date and time',
    scheduledAtFuture: 'Choose a date and time in the future.',
    link: 'Meeting link',
    linkHint: 'An https:// link. The applicant sees it once the interview is scheduled.',
    linkInvalid: 'Enter a link that starts with https://.',
    address: 'Office address',
    addressHint: "Prefilled from the office address setting, in the applicant's language. Left empty, the server uses that setting.",
    scheduleSubmit: 'Save the schedule',
    scheduledDone: 'Interview scheduled.',
    completeTitle: 'Record that the interview was held',
    completeNotes: 'Notes (staff only, optional)',
    notesTooLong: 'At most 5,000 characters.',
    minutesId: 'Minutes file ID (optional)',
    minutesHint: 'The media ID of an uploaded minutes file. The server checks that it belongs to this case.',
    minutesInvalid: 'Enter a whole number.',
    completeSubmit: 'Mark as held',
    completedDone: 'Interview recorded as held.',
    noShow: 'Applicant did not attend',
    noShowConfirm: 'Record that the applicant did not attend? Afterwards the only decision is a decline.',
    noShowSubmit: 'Record the no-show',
    noShowDone: 'Recorded as a no-show.',
    cancel: 'Cancel the interview',
    cancelReason: 'Reason (staff only)',
    cancelReasonHint: '3 to 2,000 characters. Never shown to the applicant.',
    cancelReasonInvalid: 'Write between 3 and 2,000 characters.',
    cancelSubmit: 'Confirm the cancellation',
    cancelledDone: 'Interview cancelled.',
    back: 'Back',
    decideTitle: 'Decision after the interview',
    decideNoShowHint: 'The applicant did not attend, so the only decision is a decline.',
    decideSubmit: 'Record decision',
    decidedDone: { pass_to_quiz: 'Decision recorded: the case is ready for assessment.', decline: 'Decision recorded: the request was declined.' },
    legacyTitle: 'Record the outcome',
    legacyHint: 'This interview belongs to an assessment started before interviews moved to the case.',
    legacyResult: 'Result',
    legacyResults: { completed: 'Held', no_show: 'Did not attend', cancelled: 'Cancelled' },
    legacyOutcomeLabel: 'Outcome notes (optional)',
    legacySubmit: 'Save the outcome',
    legacyDone: 'Outcome saved.',
    failed: 'The action could not be completed.',
  },
}

export const DECLINE_COPY = {
  ar: {
    action: 'رفض الطلب',
    title: 'رفض الطلب',
    hint: 'يرفض الطلبَ موظف واحد بتعليل مكتوب، ولا تظلم (قرار المالك في 12 أكتوبر 2026). يرى المتقدم فئة محايدة والتاريخ الذي يمكنه فيه التقديم من جديد، ولا يرى التعليل أبدًا. تُلغى أي مقابلة قائمة.',
    submit: 'تأكيد الرفض',
    cancel: 'رجوع',
    done: 'رُفض الطلب. يمكن للمتقدم التقديم من جديد اعتبارًا من {date}.',
    doneNoDate: 'رُفض الطلب.',
    failed: 'تعذّر رفض الطلب.',
  },
  en: {
    action: 'Decline the request',
    title: 'Decline the request',
    hint: 'One staff member declines, with a written rationale; there is no appeal (owner decision of 12 Oct 2026). The applicant sees a neutral category and the date they may apply again, never the rationale. An active interview is cancelled.',
    submit: 'Confirm the decline',
    cancel: 'Back',
    done: 'The request was declined. The applicant may apply again from {date}.',
    doneNoDate: 'The request was declined.',
    failed: 'The request could not be declined.',
  },
}

/** The copy for a language; anything but Arabic reads English. */
function pick(table, language) {
  return table[language] || table.en
}

export function caseDecisionCopy(language) {
  return pick(CASE_DECISION_COPY, language)
}

export function interviewCopy(language) {
  return pick(INTERVIEW_COPY, language)
}

export function declineCopy(language) {
  return pick(DECLINE_COPY, language)
}

function trimmedLength(value) {
  return String(value ?? '').trim().length
}

/** A staff rationale the API accepts: 10 to 5,000 characters once trimmed. */
export function isRationaleValid(value) {
  const length = trimmedLength(value)
  return length >= CASE_DECISION_LIMITS.rationaleMin && length <= CASE_DECISION_LIMITS.rationaleMax
}

export function isCancelReasonValid(value) {
  const length = trimmedLength(value)
  return length >= CASE_DECISION_LIMITS.cancelReasonMin && length <= CASE_DECISION_LIMITS.cancelReasonMax
}

/**
 * The status to show and act on. An offer whose answer date has passed is
 * expired whether or not the server has persisted that yet (it does so on the
 * next touch): it can never be chosen or scheduled.
 */
export function interviewStatus(interview, now = Date.now()) {
  const status = interview?.status || null
  if (status !== 'offered') return status
  const due = Date.parse(interview?.response_due_at || '')
  return Number.isFinite(due) && due < now ? 'expired' : status
}

export function isActiveInterview(interview, now = Date.now()) {
  return ACTIVE_INTERVIEW_STATUSES.includes(interviewStatus(interview, now))
}

/** A row from the assessment-scoped route that predates the case-level interview. */
export function isLegacyInterview(interview) {
  return interview?.kind === 'legacy_assessment'
}

/**
 * Whether PUT /admin/rpl/interviews/{id} would take this legacy row's outcome
 * from this viewer (RplAssessmentController::updateInterview): a scheduled legacy
 * row whose assessment is on the case and not locked, and either an
 * administrator's own evaluation (no assessor assignment; administrators only) or
 * an assessment assigned to this viewer, the assignment accepted and cleared of
 * any conflict. Anything the case does not show hides the action, rather than
 * offer one the server refuses.
 */
export function canRecordLegacyOutcome(interview, application, viewer) {
  if (!isLegacyInterview(interview) || interview?.status !== 'scheduled') return false
  const sameId = (left, right) => left != null && right != null && String(left) === String(right)
  const assessments = Array.isArray(application?.assessments) ? application.assessments : []
  const assessment = assessments.find((item) => sameId(item?.id, interview.rpl_assessment_id))
  if (!assessment || assessment.locked_at) return false
  if (assessment.rpl_assessor_assignment_id == null) return Boolean(viewer?.isAdministrator)
  if (!sameId(assessment.assessor_id, viewer?.id)) return false
  const assignments = application?.assessor_assignments || application?.assessorAssignments
  const assignment = (Array.isArray(assignments) ? assignments : []).find((item) => sameId(item?.id, assessment.rpl_assessor_assignment_id))
  const conflict = assignment?.conflict_declaration || assignment?.conflictDeclaration
  return assignment?.status === 'accepted' && Boolean(conflict) && !conflict.has_conflict && conflict.resolution === 'cleared'
}

/**
 * The case-level interview staff act on: the active one, else the newest case
 * row (the list is newest first). Legacy rows are history, never current.
 */
export function currentInterview(interviews, now = Date.now()) {
  const caseRows = (Array.isArray(interviews) ? interviews : []).filter((interview) => interview && !isLegacyInterview(interview))
  return caseRows.find((interview) => isActiveInterview(interview, now)) || caseRows[0] || null
}

/**
 * The server's request for an override reason: a 422 that names override_reason,
 * sent when screening is on and the case has no current completed screen. Its
 * own lines, or '' when the refusal is about something else.
 */
export function overrideReasonRequest(error) {
  if (Number(error?.response?.status) !== 422) return ''
  const lines = error?.response?.data?.errors?.override_reason
  if (lines == null) return ''
  const text = [].concat(lines).filter((line) => typeof line === 'string' && line.trim()).join('\n')
  return text || ' '
}

/**
 * The POST /screening-decision body, holding only what the chosen decision
 * takes: the modes and message for an interview, the category for a decline,
 * and the override reason only once the server has asked for it.
 */
export function screeningDecisionPayload(form, { overrideRequested = false } = {}) {
  const payload = { decision: form.decision, rationale: String(form.rationale ?? '').trim() }
  const override = String(form.override_reason ?? '').trim()
  if (overrideRequested && override) payload.override_reason = override
  if (form.decision === 'interview_required') {
    payload.offered_modes = INTERVIEW_MODES.filter((mode) => (form.offered_modes || []).includes(mode))
    const message = String(form.offer_message ?? '').trim()
    if (message) payload.offer_message = message
  }
  if (form.decision === 'decline') payload.decline_category = form.decline_category
  return payload
}

/** What still stops the decision form from being sent, by field; empty when it may be sent. */
export function screeningDecisionProblems(form, { overrideRequested = false } = {}) {
  const problems = {}
  if (!SCREENING_DECISIONS.includes(form.decision)) problems.decision = true
  if (!isRationaleValid(form.rationale)) problems.rationale = true
  if (overrideRequested) {
    const length = trimmedLength(form.override_reason)
    if (length < 1 || length > CASE_DECISION_LIMITS.overrideMax) problems.override_reason = true
  }
  if (form.decision === 'interview_required') {
    if (!INTERVIEW_MODES.some((mode) => (form.offered_modes || []).includes(mode))) problems.offered_modes = true
    if (trimmedLength(form.offer_message) > CASE_DECISION_LIMITS.offerMessageMax) problems.offer_message = true
  }
  if (form.decision === 'decline' && !form.decline_category) problems.decline_category = true
  return problems
}

/** A stored instant as the value of a datetime-local input, in the browser's own zone. */
export function toDateTimeLocalValue(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * A datetime-local value as an ISO 8601 instant. The input carries no zone, and
 * a bare "2026-11-02T10:30" would be read in the server's zone instead of the
 * one the staff member chose it in; the applicant is then told the wrong hour.
 */
export function fromDateTimeLocalValue(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function isFutureDateTimeLocal(value, now = Date.now()) {
  const date = value ? new Date(value) : null
  return Boolean(date) && !Number.isNaN(date.getTime()) && date.getTime() > now
}

/** An https URL with a host: the only link the API accepts for an online interview. */
export function isHttpsUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return false
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && Boolean(url.hostname)
  } catch {
    return false
  }
}

/**
 * The applicant's language, as the API resolves it (App\Support\PlatformLocale::
 * normalize): the language frozen into the case at submit, else the profile's,
 * and English for anything that is not Arabic.
 */
export function applicantLanguage(application) {
  const value = application?.profile_snapshot?.personal?.preferred_locale
    || application?.user?.preferred_locale
    || application?.applicant?.preferred_locale
    || ''
  return String(value).trim().toLowerCase().split(/[-_,;]/)[0] === 'ar' ? 'ar' : 'en'
}

/** The office address setting in one language, trimmed; '' when there is none. */
export function officeAddressIn(address, language) {
  const value = address && typeof address === 'object' ? address[language] : null
  return typeof value === 'string' ? value.trim() : ''
}

/** The decision snapshot's figure, only for a screen that completed and kept one. */
export function snapshotFigureText(snapshot, screeningText) {
  if (!['completed', 'stale'].includes(snapshot?.state)) return null
  const percent = Number(snapshot?.fake_likelihood_percent)
  if (snapshot?.fake_likelihood_percent == null || !Number.isFinite(percent)) return null
  const score = snapshot?.score_out_of_10 == null ? null : Number(snapshot.score_out_of_10)
  return score == null || !Number.isFinite(score)
    ? fill(screeningText.figureNoScore, { percent })
    : fill(screeningText.figure, { percent, score })
}
