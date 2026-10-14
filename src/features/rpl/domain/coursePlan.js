import { PROFESSIONAL_LEVELS, localize } from './rpl'

/*
 * THE GOVERNED COURSE PLAN (owner flow of 12 Oct 2026, plan 4.7 and 5.4-5.7, P5).
 *
 * After the entry quiz is marked, Gemini proposes the client's course list from
 * the evaluation of the answers; staff add and remove courses, each with a
 * written reason, and approve it. What the platform shows, and what it must
 * never lead staff to believe:
 *
 *   - The per-level minimum (rpl_course_plan_minimums, seeded practitioner 5,
 *     advanced practitioner 7, expert 10, editable) is a FLOOR for Gemini, never
 *     a target or a cap (D13(b)). Staff may approve fewer only with a written
 *     reason, so a shortage in the library never blocks a case.
 *   - It binds only a client whose entry quiz PASSED. A failed client gets a
 *     gap-closing plan with no minimum and no certificate from that quiz (7.1
 *     D11; F1 of the build spec).
 *   - Every plan version freezes the minimum it used; editing the setting changes
 *     only plans generated after it.
 *   - The count is distinct programmes proposed or approved on the plan. Whether
 *     each can be bought now is shown beside the count and never subtracted from
 *     it (F3).
 *   - The server is the authority. What may be done comes from its `can` flags;
 *     every write sends the plan's lock_version and a stale one answers 409.
 *   - The client sees a plan only once it is approved, and never sees Gemini's
 *     reasons, the purposes or any staff reason.
 *
 * Arabic and English only (owner, 13 Oct 2026). Every lookup falls back to
 * English, so any other value renders English rather than "undefined".
 */

export const COURSE_PLAN_PERMISSIONS = Object.freeze({ view: 'rpl.applications.view', manage: 'rpl.course_plans.manage' })

/** The API's bounds for every staff reason on the plan (RplCoursePlanService MIN_REASON / MAX_REASON). */
export const COURSE_PLAN_LIMITS = Object.freeze({ reasonMin: 10, reasonMax: 2000 })

export const COURSE_PLAN_MINIMUMS_KEY = 'rpl_course_plan_minimums'
export const COURSE_PLAN_MINIMUM_MIN = 0
export const COURSE_PLAN_MINIMUM_MAX = 50

/** The order the API returns the minimums in (RplSettings::COURSE_PLAN_LEVEL_ORDER). */
export const COURSE_PLAN_LEVEL_ORDER = Object.freeze(['practitioner', 'advanced_practitioner', 'expert'])

/*
 * The case statuses in which a course plan can still change. Anything else is
 * read-only on the screen: quality review or later, or a closed case (the API's
 * post-decision guard answers 422 case_status there anyway).
 */
export const COURSE_PLAN_LIVE_STATUSES = Object.freeze(['assessment_in_progress', 'course_plan_review', 'course_plan_active'])

/** Item statuses that count towards the plan. P6 adds purchased and completed. */
export const COURSE_PLAN_ACTIVE_ITEM_STATUSES = Object.freeze(['proposed', 'approved', 'purchased', 'completed'])

export const COURSE_PLAN_COPY = {
  ar: {
    tab: 'خطة الدورات',
    title: 'خطة الدورات',
    hint: 'يقترح Gemini الدورات، ويضيف الموظفون دورات أو يحذفونها ثم يعتمدون الخطة. لا يرى العميل الخطة إلا بعد اعتمادها، ولا يرى أبدًا أسباب Gemini.',
    loading: 'جارٍ تحميل خطة الدورات…',
    loadError: 'تعذّر تحميل خطة الدورات.',
    retry: 'إعادة المحاولة',
    none: 'لا توجد خطة دورات لهذا الطلب بعد.',
    generate: 'إنشاء خطة الدورات بواسطة Gemini',
    generateHint: 'يقرأ Gemini الإجابات والوثائق والمستوى المستهدف ويقترح الدورات: الحد الأدنى لهذا المستوى على الأقل بعد اجتياز اختبار الدخول، ودورات سد الفجوات فقط بعد عدم اجتيازه. قد يستغرق ذلك بضع دقائق، وينتقل الطلب إلى مراجعة خطة الدورات.',
    regenerate: 'إنشاء اقتراح جديد',
    regenerateConfirm: 'سيُنشئ Gemini اقتراحًا جديدًا بالإصدار {next} بالحد الأدنى المضبوط الآن. تُنقل الدورات التي أضافها الموظفون، وتبقى التعديلات الأخرى في سجل الإصدار {version}.',
    regenerateSubmit: 'أنشئ الاقتراح الجديد',
    regenerated: 'اقترح Gemini الإصدار {version}. راجعه قبل الاعتماد.',
    generating: 'يُعدّ Gemini الاقتراح…',
    generated: 'اقترح Gemini الإصدار {version}. راجعه قبل الاعتماد.',
    blocked: {
      case_status: 'الطلب ليس في مرحلة التقييم.',
      plan_exists: 'توجد خطة دورات لهذا الطلب بالفعل.',
      no_entry_quiz: 'لا يوجد لهذا الطلب اختبار دخول خاضع لحد النجاح، فيبقى على المسار السابق.',
      entry_quiz_not_scored: 'لا توجد نتيجة لاختبار الدخول بعد.',
      entry_quiz_referred: 'أُحيل اختبار الدخول إلى الموظفين ولا نتيجة له.',
      entry_quiz_ambiguous: 'لهذا الطلب أكثر من اختبار دخول؛ يجب أن يحسم الموظفون ذلك أولًا.',
      minimum_setting_missing: 'الحد الأدنى لعدد الدورات غير مضبوط في الإعدادات.',
    },
    quizPassed: 'اجتاز العميل اختبار الدخول: {percent}٪ (حد النجاح: أكثر من {mark}٪). بعد الدورات المعتمدة ينتقل الطلب إلى شهادة المستوى المستهدف عبر المراجعة المعتادة (قرار المالك، 12 أكتوبر 2026).',
    quizFailed: 'لم يجتز العميل اختبار الدخول: {percent}٪ (حد النجاح: أكثر من {mark}٪). محاولة واحدة فقط، ولا شهادة من هذا الطلب؛ تسد الخطة الفجوات التي وجدها Gemini دون حد أدنى لعدد الدورات (قرار المالك، 12 أكتوبر 2026).',
    noMinimum: 'لا يسري حد أدنى: لم يجتز العميل اختبار الدخول، فتقتصر الخطة على سد الفجوات (قرار المالك، 12 أكتوبر 2026).',
    version: 'الإصدار {version}',
    planStatus: {
      draft: 'مسودة',
      approved: 'معتمدة',
      superseded: 'مستبدلة',
      discarded: 'ملغاة',
    },
    planSource: {
      final_evaluation: 'اقتراح Gemini من تقييم الإجابات المسجَّل',
      model_call: 'اقتراح Gemini',
      amendment: 'تعديل',
    },
    amendmentHeader: 'مسودة التعديل بالإصدار {next}: يبقى الإصدار {version} ساريًا حتى تُعتمد.',
    inForceTitle: 'الإصدار {version} الساري',
    counter: '{count} من الحد الأدنى {minimum} للمستوى {level}',
    buyableCount: '{count} متاحة للشراء',
    minimumChanged: 'أُنشئ هذا الإصدار بحد أدنى {minimum}، والإعداد الآن {current}. أنشئ اقتراحًا جديدًا لتطبيقه.',
    belowMinimum: 'أقل من الحد الأدنى: {count} من {minimum}.',
    below: {
      catalogue_shortfall: 'تضم المكتبة لهذا المسار دورات أقل من الحد الأدنى.',
      model_reported_shortfall: 'أفاد Gemini بأن المكتبة لا تضم ما يكفي من الدورات المناسبة.',
      model_returned_fewer: 'أعاد Gemini عددًا من الدورات أقل من الحد الأدنى.',
      staff_removed: 'حذف الموظفون دورات فأصبح العدد أقل من الحد الأدنى.',
    },
    shortfallReason: 'ما قاله Gemini عن المكتبة: {reason}',
    shortfallNeverBlocks: 'نقص المكتبة لا يوقف الطلب أبدًا: اعتمد الخطة مع سبب مكتوب، أو أضف دورات من المكتبة.',
    purpose: {
      gap_closure: 'تسد فجوة',
      minimum_completion: 'لاستكمال الحد الأدنى',
      staff_added: 'أضافها الموظفون',
    },
    purposeInferred: 'لم يذكر Gemini الغرض، فعُدّت دورة تسد فجوة.',
    claimsNoGap: 'لا تدّعي وجود فجوة',
    topUpWithoutMinimum: 'وُسمت {count} من هذه الدورات بأنها لاستكمال الحد الأدنى، لكن لا يسري حد أدنى على هذه الخطة: أبقِ كل دورة منها فقط إن كانت تسد فجوة لدى العميل، واحذف الباقي مع ذكر السبب.',
    origin: {
      gemini: 'اقترحها Gemini',
      staff: 'أضافها الموظفون',
    },
    itemStatus: {
      proposed: 'مقترحة',
      approved: 'معتمدة',
      removed: 'محذوفة',
      purchased: 'مشتراة',
      completed: 'مكتملة',
      refunded: 'مستردة',
    },
    geminiReason: 'لماذا اقترحها Gemini',
    staffReason: 'لماذا أضافها الموظفون',
    addedBy: 'أضافها {name}',
    competencies: 'الكفاءات',
    evidenceConsidered: 'الأدلة التي نظر فيها',
    buyable: 'متاحة للشراء',
    notBuyable: 'غير متاحة للشراء بعد (مسودة أو غير مفعّلة أو بلا سعر)',
    add: 'إضافة دورة',
    addTitle: 'إضافة دورة من المكتبة',
    addHint: 'تظهر فقط دورات مكتبة سد الفجوات الخاصة بمسار هذا الطلب، ولا تظهر الدورات الموجودة في الخطة.',
    catalogueLoading: 'جارٍ تحميل المكتبة…',
    catalogueError: 'تعذّر تحميل المكتبة.',
    catalogueEmpty: 'كل دورات مكتبة هذا المسار موجودة في الخطة بالفعل.',
    reason: 'السبب (للموظفين فقط)',
    reasonHint: 'من 10 إلى 2000 حرف. يُحفظ في السجل، ولا يراه العميل أبدًا.',
    reasonInvalid: 'اكتب ما بين 10 و2000 حرف.',
    addSubmit: 'إضافة إلى الخطة',
    added: 'أُضيفت الدورة.',
    remove: 'حذف',
    removeSubmit: 'حذف من الخطة',
    removed: 'حُذفت الدورة.',
    removedList: 'الدورات المحذوفة',
    removedBy: 'حذفها {name} في {at}: {reason}',
    lockedPurchased: 'اشتراها العميل: تبقى في كل تعديل.',
    lockedCompleted: 'أكملها العميل: تبقى في كل تعديل.',
    cancel: 'إلغاء',
    approve: 'اعتماد الخطة',
    approveTitle: 'اعتماد الإصدار {version}',
    approveSummary: '{count} دورة، منها {buyable} متاحة للشراء. سيرى العميل هذه الخطة.',
    approveBelow: 'تضم هذه الخطة {count} دورة، والحد الأدنى للمستوى {level} هو {minimum}.',
    belowMinimumReason: 'سبب اعتماد عدد أقل من الحد الأدنى (للموظفين فقط)',
    belowMinimumReasonHint: 'مطلوب، من 10 إلى 2000 حرف. يُحفظ في السجل، ولا يراه العميل أبدًا (قرار المالك، 12 أكتوبر 2026).',
    belowMinimumReasonRecorded: 'سبب اعتماد عدد أقل من الحد الأدنى: {reason}',
    approveNotBuyable: '{count} من هذه الدورات غير متاحة للشراء بعد، وسيراها العميل «غير متاحة بعد».',
    approveSubmit: 'اعتماد الخطة وإظهارها للعميل',
    approved: 'اعتُمدت الخطة: الإصدار {version} ساري.',
    emptyPlan: 'تحتاج الخطة إلى دورة واحدة على الأقل: أضف دورة، أو ألغِ المسودة.',
    amend: 'تعديل الخطة المعتمدة',
    amendHint: 'يُنشئ الإصدار {next} مسودةً. يبقى الإصدار {version} ساريًا حتى يُعتمد التعديل، وتبقى الدورات التي اشتراها العميل أو أكملها في كل إصدار.',
    amendSubmit: 'أنشئ مسودة التعديل',
    amended: 'أُنشئت مسودة التعديل بالإصدار {version}.',
    discard: 'إلغاء المسودة',
    discardHint: 'تُغلق المسودة ويعود الطلب إلى «قيد التقييم». تبقى المسودة في السجل.',
    discardAmendmentHint: 'تُغلق مسودة التعديل، ويبقى الإصدار {version} ساريًا. تبقى المسودة في السجل.',
    discardSubmit: 'تأكيد إلغاء المسودة',
    discarded: 'أُلغيت المسودة.',
    creationReason: 'سبب هذا الإصدار: {reason}',
    readOnly: 'لم يعد ممكنًا تعديل الخطة: تجاوز الطلب مرحلة التعلم.',
    conflict: 'غيّر موظف آخر هذه الخطة أثناء عملك عليها. أُعيد تحميلها: راجعها ثم أعد المحاولة. لم يُحفظ شيء مما أرسلته.',
    history: 'سجل الإصدارات',
    historyEmpty: 'لا توجد إصدارات سابقة.',
    view: 'عرض',
    hide: 'إخفاء',
    versionLoading: 'جارٍ تحميل الإصدار…',
    versionCourses: '{count} دورة',
    generatedBy: 'Gemini ({model}) في {at}',
    createdBy: 'أنشأه {name} في {at}',
    approvedBy: 'اعتمده {name} في {at}',
    discardedBy: 'ألغاه {name} في {at}',
    provenance: 'المصدر',
    minimumSent: 'الحد الأدنى المرسل إلى Gemini: {minimum}',
    settingsSnapshot: 'إعداد الحد الأدنى عند الإنشاء: {value}',
    awaitingPlan: 'ينتظر هذا الطلب خطة الدورات.',
    awaitingApproval: 'تنتظر خطة الدورات الاعتماد (الإصدار {version}).',
    inForce: 'الإصدار {version} من خطة الدورات ساري.',
    openPlan: 'فتح خطة الدورات',
    // The hint under the disabled next-status select in each course-plan status: the act is on the course plan tab, not in P3's decision, interview or decline.
    noTransitionsReview: 'لا توجد حالة أخرى يمكن تعيينها من هنا. استخدم تبويب خطة الدورات: اعتمد المسودة أو ألغِها.',
    noTransitionsActive: 'لا توجد حالة أخرى يمكن تعيينها من هنا. خطة الدورات سارية، وأي تغيير فيها يكون بتعديلها من تبويب خطة الدورات.',
    someone: 'أحد الموظفين',
    failed: 'تعذّر إكمال الإجراء.',
    demonstrated: 'فجوة مثبتة',
    conditional: 'مشروطة — تحتاج إلى تأكيد بالتقييم المحكوم',
    groundedIn: 'مبنية على',
    ground_evidence_documents: 'ملفات المتقدم',
    ground_answered_assessment: 'إجابات التقييم',
    ground_assessor_findings: 'قرارات المقيّم',
    ground_evidence_metadata: 'بيانات الأدلة الوصفية',
  },
  en: {
    tab: 'Course plan',
    title: 'Course plan',
    hint: 'Gemini proposes the courses; staff add or remove them and approve the plan. The client sees the plan only once it is approved, and never sees Gemini\'s reasons.',
    loading: 'Loading the course plan…',
    loadError: 'Unable to load the course plan.',
    retry: 'Try again',
    none: 'No course plan exists for this case yet.',
    generate: 'Generate the course plan with Gemini',
    generateHint: 'Gemini reads the answers, the documents and the target level and proposes the courses: at least the minimum for this level after a passed entry quiz, the gap-closing courses only after a failed one. This can take a few minutes. The case moves to course plan review.',
    regenerate: 'Generate a new proposal',
    regenerateConfirm: 'Gemini makes a new proposal as version {next}, using the minimum set now. Courses staff added are carried over; every other edit stays in version {version}\'s history.',
    regenerateSubmit: 'Make the new proposal',
    regenerated: 'Gemini proposed version {version}. Review it before approving.',
    generating: 'Gemini is preparing the proposal…',
    generated: 'Gemini proposed version {version}. Review it before approving.',
    blocked: {
      case_status: 'The case is not at the assessment stage.',
      plan_exists: 'A course plan already exists for this case.',
      no_entry_quiz: 'This case has no entry quiz under the pass mark, so it keeps the earlier route.',
      entry_quiz_not_scored: 'The entry quiz has no result yet.',
      entry_quiz_referred: 'The entry quiz was referred to staff and has no result.',
      entry_quiz_ambiguous: 'This case has more than one entry quiz; staff must resolve it first.',
      minimum_setting_missing: 'The minimum number of courses is not set in the settings.',
    },
    quizPassed: 'Entry quiz passed: {percent}% (pass mark: more than {mark}%). After the approved courses, the case goes on to the certificate at the target level through the usual review (owner decision, 12 Oct 2026).',
    quizFailed: 'Entry quiz not passed: {percent}% (pass mark: more than {mark}%). One attempt only, and no certificate follows this request; the plan closes the gaps Gemini found, with no minimum number of courses (owner decision, 12 Oct 2026).',
    noMinimum: 'No minimum applies: the entry quiz was not passed, so the plan closes the gaps only (owner decision, 12 Oct 2026).',
    version: 'Version {version}',
    planStatus: {
      draft: 'Draft',
      approved: 'Approved',
      superseded: 'Superseded',
      discarded: 'Discarded',
    },
    planSource: {
      final_evaluation: 'Gemini proposal, from the recorded answer evaluation',
      model_call: 'Gemini proposal',
      amendment: 'Amendment',
    },
    amendmentHeader: 'Amendment draft version {next}: version {version} stays in force until this one is approved.',
    inForceTitle: 'Version {version} in force',
    counter: '{count} of the minimum {minimum} for {level}',
    buyableCount: '{count} available to buy',
    minimumChanged: 'This version was generated with the minimum {minimum}; the setting is now {current}. Generate a new proposal to apply it.',
    belowMinimum: 'Below the minimum: {count} of {minimum}.',
    below: {
      catalogue_shortfall: 'The library holds fewer courses for this pathway than the minimum.',
      model_reported_shortfall: 'Gemini reported that the library holds too few suitable courses.',
      model_returned_fewer: 'Gemini returned fewer courses than the minimum.',
      staff_removed: 'Staff removed courses below the minimum.',
    },
    shortfallReason: 'What Gemini said about the library: {reason}',
    shortfallNeverBlocks: 'A shortage in the library never blocks a case: approve with a written reason, or add courses from the library.',
    purpose: {
      gap_closure: 'Closes a gap',
      minimum_completion: 'Brings the plan to the minimum',
      staff_added: 'Added by staff',
    },
    purposeInferred: 'Gemini gave no purpose, so it is read as closing a gap.',
    claimsNoGap: 'Claims no gap',
    topUpWithoutMinimum: '{count} of these courses are labelled as bringing the plan to a minimum, but no minimum applies to this plan: keep each one only if it closes a gap the client has, and remove the rest with a reason.',
    origin: {
      gemini: 'Proposed by Gemini',
      staff: 'Added by staff',
    },
    itemStatus: {
      proposed: 'Proposed',
      approved: 'Approved',
      removed: 'Removed',
      purchased: 'Purchased',
      completed: 'Completed',
      refunded: 'Refunded',
    },
    geminiReason: 'Why Gemini proposed it',
    staffReason: 'Why staff added it',
    addedBy: 'Added by {name}',
    competencies: 'Competencies',
    evidenceConsidered: 'Evidence considered',
    buyable: 'Available to buy',
    notBuyable: 'Not available to buy yet (draft, inactive or not priced)',
    add: 'Add a course',
    addTitle: 'Add a course from the library',
    addHint: 'Only this pathway\'s gap-library courses are listed; courses already in the plan are left out.',
    catalogueLoading: 'Loading the library…',
    catalogueError: 'Unable to load the library.',
    catalogueEmpty: 'Every course in this pathway\'s library is already in the plan.',
    reason: 'Reason (staff only)',
    reasonHint: '10 to 2,000 characters. Kept on the record; the client never sees it.',
    reasonInvalid: 'Write between 10 and 2,000 characters.',
    addSubmit: 'Add to the plan',
    added: 'Course added.',
    remove: 'Remove',
    removeSubmit: 'Remove from the plan',
    removed: 'Course removed.',
    removedList: 'Removed courses',
    removedBy: 'Removed by {name} on {at}: {reason}',
    lockedPurchased: 'Bought by the client: kept in every amendment.',
    lockedCompleted: 'Completed by the client: kept in every amendment.',
    cancel: 'Cancel',
    approve: 'Approve the plan',
    approveTitle: 'Approve version {version}',
    approveSummary: '{count} courses, {buyable} of them available to buy. The client will see this plan.',
    approveBelow: 'This plan has {count} courses; the minimum for {level} is {minimum}.',
    belowMinimumReason: 'Why approve fewer than the minimum (staff only)',
    belowMinimumReasonHint: 'Required, 10 to 2,000 characters. Kept on the record; the client never sees it (owner decision, 12 Oct 2026).',
    belowMinimumReasonRecorded: 'Why fewer than the minimum were approved: {reason}',
    approveNotBuyable: '{count} of these courses cannot be bought yet; the client will see them as not available yet.',
    approveSubmit: 'Approve and show it to the client',
    approved: 'Plan approved: version {version} is in force.',
    emptyPlan: 'A plan needs at least one course: add one, or discard the draft.',
    amend: 'Amend the approved plan',
    amendHint: 'Creates version {next} as a draft. Version {version} stays in force until the amendment is approved, and courses the client bought or completed stay in every version.',
    amendSubmit: 'Create the amendment draft',
    amended: 'Amendment draft version {version} created.',
    discard: 'Discard the draft',
    discardHint: 'The draft is closed and the case returns to "Assessment in progress". The draft stays in the history.',
    discardAmendmentHint: 'The amendment draft is closed and version {version} stays in force. The draft stays in the history.',
    discardSubmit: 'Confirm the discard',
    discarded: 'Draft discarded.',
    creationReason: 'Reason for this version: {reason}',
    readOnly: 'The plan can no longer change: the case has moved past the learning stage.',
    conflict: 'Someone else changed this plan while you were working on it. It has been reloaded: check it and try again. Nothing you sent was saved.',
    history: 'Version history',
    historyEmpty: 'No earlier versions.',
    view: 'View',
    hide: 'Hide',
    versionLoading: 'Loading the version…',
    versionCourses: '{count} courses',
    generatedBy: 'Gemini ({model}) on {at}',
    createdBy: 'By {name} on {at}',
    approvedBy: 'Approved by {name} on {at}',
    discardedBy: 'Discarded by {name} on {at}',
    provenance: 'Provenance',
    minimumSent: 'Minimum sent to Gemini: {minimum}',
    settingsSnapshot: 'Minimums setting when generated: {value}',
    awaitingPlan: 'This case awaits its course plan.',
    awaitingApproval: 'The course plan awaits approval (version {version}).',
    inForce: 'Course plan version {version} is in force.',
    openPlan: 'Open the course plan',
    noTransitionsReview: 'No other status can be set from here. Use the course plan tab: approve or discard the draft.',
    noTransitionsActive: 'No other status can be set from here. The course plan is in force; any change is an amendment on the course plan tab.',
    someone: 'a staff member',
    failed: 'The action could not be completed.',
    demonstrated: 'Demonstrated gap',
    conditional: 'Conditional — needs the governed assessment to confirm it',
    groundedIn: 'Grounded in',
    ground_evidence_documents: 'applicant documents',
    ground_answered_assessment: 'assessment answers',
    ground_assessor_findings: 'assessor findings',
    ground_evidence_metadata: 'evidence metadata',
  },
}

export const COURSE_PLAN_MINIMUMS_COPY = {
  ar: {
    title: 'الحد الأدنى لعدد الدورات لكل مستوى',
    hint: 'إعداد محكوم يقرره المالك (12 أكتوبر 2026)، ولا قيمة افتراضية له في الشيفرة. بعد اجتياز اختبار الدخول يجب أن يقترح Gemini هذا العدد من الدورات على الأقل للعميل الذي يستهدف هذا المستوى، ويُكتب العدد في التعليمات المرسلة إليه عند كل إنشاء. تحتفظ كل خطة بالحد الأدنى الذي أُنشئت به، فيسري التعديل على الخطط التي تُنشأ بعده. ولا يعتمد الموظفون عددًا أقل إلا بسبب مكتوب، فلا يوقف نقصُ الدورات في المكتبة أي طلب. أما العميل الذي لم يجتز الاختبار فيحصل على دورات سد الفجوات فقط.',
    label: '{level} (من 0 إلى 50)',
    ownerValues: 'قيم المالك: ممارس 5، ممارس متقدم 7، خبير 10. وكل منها حد أدنى، لا عدد ثابت.',
    invalid: 'أدخل عددًا صحيحًا من 0 إلى 50.',
    missing: 'غير مضبوط: لا يمكن إنشاء خطط الدورات حتى يُحدَّد حد أدنى لكل مستوى.',
    reasonRule: 'اعتماد خطة أقل من الحد الأدنى يتطلب دائمًا سببًا مكتوبًا.',
    noLevels: 'لا توجد مستويات مهنية مفعّلة لضبط حد أدنى لها.',
  },
  en: {
    title: 'Minimum number of courses per level',
    hint: 'A governed setting the owner decides (12 Oct 2026); the code holds no default. After a passed entry quiz Gemini must propose at least this many courses for a client aiming at that level, and the number is written into the prompt on every generation. Each plan keeps the minimum it was generated with, so a change applies to plans generated after it. Staff may approve fewer only with a written reason, so a shortage in the library never blocks a case. A client who did not pass gets the gap-closing courses only.',
    label: '{level} (0 to 50)',
    ownerValues: 'The owner\'s values: practitioner 5, advanced practitioner 7, expert 10. Each is a minimum, not an exact count.',
    invalid: 'Enter a whole number from 0 to 50.',
    missing: 'Not set: course plans cannot be generated until every level has a minimum.',
    reasonRule: 'Approving a plan below the minimum always needs a written reason.',
    noLevels: 'No active professional level exists to set a minimum for.',
  },
}

function pick(table, language) {
  return table[language === 'ar' ? 'ar' : 'en']
}

export function coursePlanCopy(language) {
  return pick(COURSE_PLAN_COPY, language)
}

export function coursePlanMinimumsCopy(language) {
  return pick(COURSE_PLAN_MINIMUMS_COPY, language)
}

/** A staff reason the API accepts: 10 to 2000 characters after trimming. */
export function isCoursePlanReasonValid(value) {
  const length = String(value ?? '').trim().length
  return length >= COURSE_PLAN_LIMITS.reasonMin && length <= COURSE_PLAN_LIMITS.reasonMax
}

/** The plan changed under the writer: 409 with the plan's own code, never any other conflict. */
export function isStaleConflict(error) {
  return Number(error?.response?.status) === 409 && error?.response?.data?.code === 'rpl_course_plan_stale'
}

/**
 * Generate and regenerate answer 503 rpl_setting_missing while the minimums are
 * missing or unusable (R15). That is a setting to fix, not an outage, so it must
 * never read as "the service is temporarily unavailable".
 */
export function isMinimumSettingMissing(error) {
  return Number(error?.response?.status) === 503 && error?.response?.data?.code === 'rpl_setting_missing'
}

/*
 * A 422 that means the screen is out of date, not that the input is wrong: the
 * case or the plan moved on (case_status, plan_exists, plan_not_editable,
 * regenerate), or the minimum changed while Gemini answered (minimum_changed).
 * The editor shows the server's sentence and reloads, so it never keeps
 * offering an act that can no longer succeed.
 */
export const COURSE_PLAN_STATE_REFUSALS = Object.freeze(['case_status', 'plan_exists', 'plan_not_editable', 'regenerate', 'minimum_changed'])

export function isCoursePlanStateRefusal(error) {
  if (Number(error?.response?.status) !== 422) return false
  const errors = error?.response?.data?.errors
  return Boolean(errors) && typeof errors === 'object' && COURSE_PLAN_STATE_REFUSALS.some((key) => Object.prototype.hasOwnProperty.call(errors, key))
}

/** The locale the API accepts for a generation (ar or en); anything else is English. */
export function coursePlanLocale(language) {
  return language === 'ar' ? 'ar' : 'en'
}

/**
 * Only a PROPOSED item on an editable draft can be removed. An approved item is
 * changed only by an amendment, and P6's purchased and completed items never.
 */
export function isItemRemovable(item, editable) {
  return Boolean(editable) && item?.status === 'proposed'
}

/** True once the case has moved past the learning stage (quality review or later, or closed). */
export function isCoursePlanReadOnly(status) {
  return Boolean(status) && !COURSE_PLAN_LIVE_STATUSES.includes(status)
}

export function activePlanItems(plan) {
  return (Array.isArray(plan?.items) ? plan.items : []).filter((item) => COURSE_PLAN_ACTIVE_ITEM_STATUSES.includes(item?.status))
}

export function removedPlanItems(plan) {
  return (Array.isArray(plan?.items) ? plan.items : []).filter((item) => item?.status === 'removed')
}

/*
 * F1 and a ZERO minimum: a plan with no minimum closes gaps only, so a course
 * Gemini labelled minimum_completion has no place on it (the FAILED and ZERO
 * rules forbid that purpose). The API keeps such a course for staff to judge and
 * never relabels it as a gap; the editor counts the ones still on the plan.
 */
export function topUpsWithoutMinimum(plan) {
  if (plan?.minimum_required == null || Number(plan.minimum_required) !== 0) return 0
  return activePlanItems(plan).filter((item) => item?.purpose === 'minimum_completion').length
}

/**
 * The overview after a write: the plan the server sent back takes its slot, and
 * the case status is the one the server reports. The `can` flags and the
 * version list are the server's to recompute, so the editor reloads them.
 */
export function applyCoursePlanWrite(overview, plan, applicationStatus) {
  if (!overview) return overview
  const next = { ...overview }
  if (applicationStatus) next.application = { ...(overview.application || {}), status: applicationStatus }
  if (!plan || typeof plan !== 'object') return next

  const same = (other) => Boolean(other?.public_id) && other.public_id === plan.public_id
  if (plan.status === 'draft' && plan.is_live !== false) {
    next.draft = plan
  } else if (plan.status === 'approved' && plan.is_live !== false) {
    next.approved = plan
    if (same(overview.draft)) next.draft = null
  } else if (same(overview.draft)) {
    next.draft = null
  } else if (same(overview.approved)) {
    next.approved = null
  }

  return next
}

/** The minimums as one readable line, in the order given (the API sends rank order). */
export function minimumsText(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  return Object.entries(value).map(([code, minimum]) => `${code} ${minimum}`).join(' · ')
}

/*
 * THE MINIMUMS SETTING (rpl_course_plan_minimums) on the RPL controls tab.
 *
 * A JSON map {level_code: whole number 0..50}. The API accepts exactly the codes
 * of the active levels on the two professional pathways, which are the levels
 * the reference data lists, so the form shows one input per distinct code there,
 * ordered by rank. It is governed with no default (R15): an absent key is never
 * written with values nobody chose, the owner's 5 / 7 / 10 appear as a hint and
 * are never prefilled, and once the key is written it carries every level.
 */

/** One entry per level code, keeping the lowest rank, sorted by rank. */
export function minimumLevels(referenceLevels) {
  const byCode = new Map()
  for (const level of Array.isArray(referenceLevels) ? referenceLevels : []) {
    if (!level?.code) continue
    const rank = Number.isFinite(Number(level.rank)) ? Number(level.rank) : Number.MAX_SAFE_INTEGER
    const known = byCode.get(level.code)
    if (!known || rank < known.rank) byCode.set(level.code, { ...level, rank })
  }
  return [...byCode.values()].sort((left, right) => left.rank - right.rank || String(left.code).localeCompare(String(right.code)))
}

/** A level's name from the reference data, then the platform's own labels, then its code. */
export function minimumLevelLabel(level, language) {
  const code = typeof level === 'string' ? level : level?.code
  const named = typeof level === 'object' ? localize(level?.name, language) : ''
  if (named) return named
  const known = PROFESSIONAL_LEVELS.find((candidate) => candidate.code === code)
  return localize(known?.labels, language) || code || ''
}

function storedMinimums(raw) {
  let stored = raw?.[COURSE_PLAN_MINIMUMS_KEY]
  if (typeof stored === 'string') {
    try {
      stored = JSON.parse(stored)
    } catch {
      stored = null
    }
  }
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : null
}

function orderedStoredCodes(stored) {
  const codes = Object.keys(stored || {})
  const known = COURSE_PLAN_LEVEL_ORDER.filter((code) => codes.includes(code))
  return [...known, ...codes.filter((code) => !known.includes(code)).sort()]
}

/**
 * The form state: { codes, values: {code: string}, include, errors: {general, levels} }.
 * `include` is true only when the server holds the key; typing sets it.
 * The codes are the reference levels; with none loaded, the stored codes.
 */
export function readCoursePlanMinimumsSetting(raw, levels) {
  const held = raw?.[COURSE_PLAN_MINIMUMS_KEY] != null && raw?.[COURSE_PLAN_MINIMUMS_KEY] !== ''
  const stored = storedMinimums(raw)
  const levelCodes = (Array.isArray(levels) ? levels : []).map((level) => (typeof level === 'string' ? level : level?.code)).filter(Boolean)
  const codes = levelCodes.length ? [...new Set(levelCodes)] : orderedStoredCodes(stored)
  const values = Object.fromEntries(codes.map((code) => [code, stored?.[code] != null && stored[code] !== '' ? String(stored[code]) : '']))
  return { codes, values, include: held, errors: { general: '', levels: {} } }
}

/** One level typed: the key is now written, and that level's server line is cleared. */
export function changeCoursePlanMinimum(state, code, value) {
  const { [code]: _cleared, ...levels } = state?.errors?.levels || {}
  return {
    ...state,
    values: { ...(state?.values || {}), [code]: value },
    include: true,
    errors: { general: '', levels },
  }
}

export function isCoursePlanMinimumValid(value) {
  const text = String(value ?? '').trim()
  if (!/^\d{1,2}$/.test(text)) return false
  const minimum = Number(text)
  return minimum >= COURSE_PLAN_MINIMUM_MIN && minimum <= COURSE_PLAN_MINIMUM_MAX
}

/** Ready to save: either not written, or every level holds a whole number from 0 to 50. */
export function isCoursePlanMinimumsReady(state) {
  if (!state?.include) return true
  const codes = Array.isArray(state.codes) ? state.codes : []
  return codes.length > 0 && codes.every((code) => isCoursePlanMinimumValid(state.values?.[code]))
}

/** The whole map, as integers in level order, only when the server holds the key or someone typed. */
export function coursePlanMinimumsPayload(state) {
  if (!state?.include) return {}
  const codes = Array.isArray(state.codes) ? state.codes : []
  return { [COURSE_PLAN_MINIMUMS_KEY]: Object.fromEntries(codes.map((code) => [code, Number(String(state.values?.[code] ?? '').trim())])) }
}

/**
 * The server's 422 lines: `rpl_course_plan_minimums` (a missing or unknown level,
 * or a list) as the general line, `rpl_course_plan_minimums.{code}` under that level.
 */
export function coursePlanMinimumsFieldErrors(error) {
  const errors = error?.response?.data?.errors
  const collected = { general: [], levels: {} }
  if (errors && typeof errors === 'object') {
    for (const [field, messages] of Object.entries(errors)) {
      const lines = [].concat(messages).filter((line) => typeof line === 'string' && line.trim() !== '')
      if (field === COURSE_PLAN_MINIMUMS_KEY) collected.general.push(...lines)
      else if (field.startsWith(`${COURSE_PLAN_MINIMUMS_KEY}.`)) {
        const code = field.slice(COURSE_PLAN_MINIMUMS_KEY.length + 1).split('.')[0]
        collected.levels[code] = [...(collected.levels[code] || []), ...lines]
      }
    }
  }
  return {
    general: [...new Set(collected.general)].join('\n'),
    levels: Object.fromEntries(Object.entries(collected.levels).map(([code, lines]) => [code, [...new Set(lines)].join('\n')])),
  }
}
