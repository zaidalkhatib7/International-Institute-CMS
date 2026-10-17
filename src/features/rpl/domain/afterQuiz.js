import { localize } from './rpl'
import {
  MAX_PRICE_USD_MINOR,
  MIN_PRICE_USD_MINOR,
  amountMinorOf,
  exchangeRateText,
  formatMoneyInline,
  fromMinor,
  isMoney,
  toMinor,
} from '../../../utils/money'

/*
 * AFTER THE ENTRY QUIZ (owner model of 15 Oct 2026, P6).
 *
 * What the platform shows once the entry quiz is marked, and what it must never
 * lead staff to believe:
 *
 *   - A client whose entry quiz PASSED may buy the Experience Confirmation
 *     Certificate (شهادة تثبيت الخبرة), then close the case with it ("stop") or
 *     go on to the course plan ("continue"). One member of staff approves its
 *     issue after payment. It confirms the assessed experience and is never the
 *     level certificate. A FAILED client never gets it.
 *   - Its wording is a versioned record: a draft is approved by the owner's role
 *     only (super-admin, rpl.certificate_wording.approve), an approved version
 *     never changes, and nothing is sold or issued while no version is approved.
 *   - After every course of the approved plan, ONE final exam: three tries a
 *     round, then a wait and a paid retake. The platform marks it in PHP. A pass
 *     issues the level certificate automatically, with no staff approval,
 *     assessor report, quality review or committee. When the level's
 *     certification fee (the Fees tab) is above 0, a certification-fee charge
 *     must be paid first and the certificate is then issued automatically on
 *     payment (owner, 15 Oct 2026).
 *   - Every price is ONE price in US dollars (owner, 17 Oct 2026). The client
 *     pays it from his dollar or pound balance, or outside the platform. A pound
 *     amount is the dollar price x the owner's exchange rate, rounded half up to
 *     the whole pound, at the moment he pays from his balance or asks to pay
 *     outside, and it is frozen then on the charge with the dollar price and the
 *     rate. Staff confirm an outside payment only for that exact amount, in that
 *     currency. A charge written before 17 Oct 2026 keeps its points as history.
 *   - The server is the authority: what may be done comes from its `can` flags
 *     and the viewer's permission; every staff write sends the row's
 *     lock_version, and a stale one answers 409 with the row's own code.
 *
 * Arabic and English only (owner, 13 Oct 2026). Every lookup falls back to
 * English, so any other language renders English rather than "undefined".
 */

export const AFTER_QUIZ_PERMISSIONS = Object.freeze({
  view: 'rpl.applications.view',
  reconcile: 'rpl.payments.reconcile',
  approve: 'rpl.experience_certificates.approve',
  refund: 'finance.manage',
  wordingApprove: 'rpl.certificate_wording.approve',
  manage: 'rpl.applications.manage',
  settings: 'rpl.settings.manage',
})

/** The API's bounds for every staff text on these acts (2.5). */
export const AFTER_QUIZ_LIMITS = Object.freeze({
  reasonMin: 10,
  reasonMax: 2000,
  referenceMin: 3,
  referenceMax: 255,
  notesMax: 2000,
  titleMax: 200,
  bodyMax: 4000,
})

// certification_fee: the level's certification fee on the final-exam path (owner, 15 Oct 2026).
export const CHARGE_TYPES = Object.freeze(['experience_certificate', 'final_exam_retake', 'certification_fee'])
export const CHARGE_STATUSES = Object.freeze(['pending', 'paid', 'cancelled', 'refunded'])
// Syriatel Cash and MTN Cash are the owner's words (17 Oct 2026); the API's RplCharge::OFFLINE_METHODS.
export const OFFLINE_METHODS = Object.freeze(['bank_transfer', 'cash', 'syriatel_cash', 'mtn_cash', 'external_gateway', 'manual_reconciliation'])
// exchange_rate_outdated: a pending request in Syrian pounds whose rate is stale; the client asks again (M12).
export const STAFF_CANCEL_CATEGORIES = Object.freeze(['payment_not_found', 'amount_mismatch', 'reference_already_used', 'exchange_rate_outdated', 'other'])
export const REFUSAL_CATEGORIES = Object.freeze(['payment_not_verified', 'not_eligible', 'other'])
export const EXPERIENCE_CERTIFICATE_STATUSES = Object.freeze(['requested', 'approved', 'issued', 'refused', 'cancelled'])
export const WORDING_CODE = 'rpl_experience_confirmation'
/** Certificate templates the generic editor never changes (2.5, X7). */
export const RESERVED_TEMPLATE_CODES = Object.freeze(['rpl-experience-confirmation'])

/*
 * THE FIVE SETTINGS (2.2). Governed, no code default: an absent or null value is
 * a missing setting the API refuses on (503), never a value the form invents.
 * Only the pass mark is seeded (50) and required; the other four may be emptied,
 * which clears them (the owner can withdraw a price).
 *
 * The two prices are US dollars (owner, 17 Oct 2026; contract 2.8): the server
 * holds them as whole US cents (100 = $1.00), the form shows and takes dollars
 * with cents, and the payload sends the integer of cents (`kind: 'usd'`). The
 * bounds of a 'usd' setting are in cents. The three others are whole numbers.
 */
export const AFTER_QUIZ_SETTINGS = Object.freeze([
  Object.freeze({ id: 'price', key: 'rpl_experience_certificate_price_usd_minor', kind: 'usd', min: MIN_PRICE_USD_MINOR, max: MAX_PRICE_USD_MINOR, nullable: true }),
  Object.freeze({ id: 'passMark', key: 'rpl_final_exam_pass_mark_percent', kind: 'int', min: 1, max: 99, nullable: false }),
  Object.freeze({ id: 'questionsPerCourse', key: 'rpl_final_exam_questions_per_course', kind: 'int', min: 1, max: 50, nullable: true }),
  Object.freeze({ id: 'waitDays', key: 'rpl_final_exam_retake_wait_days', kind: 'int', min: 0, max: 365, nullable: true }),
  Object.freeze({ id: 'retakeFee', key: 'rpl_final_exam_retake_fee_usd_minor', kind: 'usd', min: MIN_PRICE_USD_MINOR, max: MAX_PRICE_USD_MINOR, nullable: true }),
])

export const AFTER_QUIZ_SETTING_KEYS = Object.freeze(AFTER_QUIZ_SETTINGS.map((setting) => setting.key))

export const AFTER_QUIZ_COPY = {
  ar: {
    common: {
      loading: 'جارٍ التحميل…',
      loadError: 'تعذّر التحميل.',
      retry: 'إعادة المحاولة',
      failed: 'تعذّر إكمال الإجراء.',
      cancel: 'إلغاء',
      notSet: 'غير مضبوط',
      someone: 'أحد الموظفين',
      reason: 'السبب (للموظفين فقط)',
      reasonHint: 'من 10 إلى 2000 حرف. يُحفظ في سجل التدقيق.',
      reasonInvalid: 'اكتب ما بين 10 و2000 حرف.',
      settingMissing: 'إعداد لازم لهذا الإجراء غير مضبوط: {setting}. اضبطه في إعدادات RPL ثم أعد المحاولة.',
      ownCase: 'لا يؤكد الموظف دفعة ولا يعتمد شهادة ولا يرفضها في طلبه الشخصي.',
      noRate: 'لم يُضبط سعر صرف: لا يمكن لأحد الدفع بالليرة السورية حتى يُضبط. ولا يتأثر الدفع بالدولار.',
      by: '{name} في {at}',
      paidIn: {
        USD: 'بالدولار الأمريكي',
        SYP: 'بالليرة السورية',
        legacy: 'بالنقاط (سجل سابق)',
      },
    },
    chargeTypes: {
      experience_certificate: 'شهادة تثبيت الخبرة',
      final_exam_retake: 'إعادة الاختبار النهائي',
      certification_fee: 'رسوم شهادة المستوى',
    },
    chargeStatuses: {
      pending: 'بانتظار التأكيد',
      paid: 'مدفوعة',
      cancelled: 'ملغاة',
      refunded: 'مستردة',
    },
    routes: {
      wallet: 'المحفظة',
      walletUsd: 'المحفظة، رصيد الدولار',
      walletSyp: 'المحفظة، رصيد الليرة',
      offline: 'دفع خارج المنصة',
    },
    methods: {
      bank_transfer: 'حوالة بنكية',
      cash: 'نقدًا',
      syriatel_cash: 'سيريتل كاش',
      mtn_cash: 'MTN كاش',
      external_gateway: 'بوابة دفع خارجية',
      manual_reconciliation: 'تسوية يدوية',
    },
    cancelCategories: {
      payment_not_found: 'لم نتمكن من العثور على هذه الدفعة.',
      amount_mismatch: 'المبلغ المدفوع لا يطابق السعر.',
      reference_already_used: 'مرجع الدفع هذا مستخدم من قبل.',
      exchange_rate_outdated: 'مبلغ الليرة السورية لم يعد صالحًا',
      other: 'لم تتمكن المؤسسة من تأكيد هذه الدفعة.',
      client_cancelled: 'ألغى العميل طلب الدفع.',
      case_closed: 'أُلغي لأن الطلب اكتمل.',
    },
    charges: {
      title: 'المدفوعات بعد اختبار الدخول',
      hint: 'يدفع العميل السعر بالدولار من رصيده بالدولار أو بالليرة، أو خارج المنصة. ويُحسب المبلغ بالليرة من السعر بالدولار مضروبًا في سعر الصرف لحظة الدفع من الرصيد أو لحظة طلب الدفع الخارجي، ويُثبَّت عندها.',
      empty: 'لا توجد مدفوعات لهذا الطلب بعد.',
      cycle: 'الجولة {cycle}',
      amount: 'المبلغ',
      route: 'طريقة الدفع',
      invoice: 'الفاتورة: {number}',
      payerReference: 'مرجع العميل: {reference}',
      requestedAt: 'طُلب في {at}',
      paidAt: 'دُفع في {at}',
      confirmedBy: 'أكّده {name} في {at}',
      offlineEvidence: 'استُلم خارج المنصة: {amount} · {method} · المرجع {reference}',
      staffNotes: 'ملاحظات الموظفين: {notes}',
      consumed: 'استُخدم في {at}',
      cancelledBy: 'ألغاه {name} في {at}',
      cancelReason: 'السبب: {reason}',
      refundedBy: 'أعاده {name} في {at}',
      refundReason: 'سبب الإعادة: {reason}',
      confirm: 'تأكيد الدفع',
      confirmTitle: 'تأكيد دفعة مستلمة خارج المنصة',
      confirmHint: 'أكّد فقط المبالغ التي استلمتها المؤسسة. يجب أن يكون المرجع فريدًا.',
      method: 'وسيلة الدفع',
      reference: 'المرجع (من 3 إلى 255 حرفًا)',
      referenceInvalid: 'اكتب مرجعًا من 3 إلى 255 حرفًا.',
      paidOn: 'تاريخ الدفع',
      paidOnInvalid: 'اختر تاريخًا لا يتجاوز اليوم.',
      amountDue: 'المبلغ المستحق: {amount}',
      amountReceived: 'المبلغ المستلم',
      amountInvalidUsd: 'أدخل مبلغًا بالدولار الأمريكي بخانتين عشريتين على الأكثر، مثل 49.99.',
      amountInvalidSyp: 'أدخل عددًا صحيحًا من الليرات السورية، مثل 125000.',
      amountMustMatch: 'يجب أن يساوي المبلغ المستلم المبلغ المستحق. إن دفع العميل مبلغًا مختلفًا فلا تؤكد: ألغِ الطلب بفئة "المبلغ المدفوع لا يطابق السعر".',
      evidenceHint: 'أكّد فقط المبلغ المستحق نفسه وبعملة الطلب: المبلغ والعملة مثبّتان عليه. وتُحفظ الوسيلة والمرجع دليلًا.',
      notConfirmable: 'طلب دفع بالنقاط من النظام السابق لا يُؤكَّد: ألغِه، ويطلب العميل الدفع من جديد بالدولار أو بالليرة.',
      notes: 'ملاحظات (اختيارية، للموظفين فقط)',
      notesInvalid: 'بحد أقصى 2000 حرف.',
      confirmSubmit: 'تأكيد الدفع',
      confirmed: 'تم تأكيد الدفع.',
      slotTaken: 'توجد دفعة مدفوعة لهذا البند بالفعل. تحقّق قبل تأكيد دفعة ثانية.',
      cancel: 'إلغاء طلب الدفع',
      cancelTitle: 'إلغاء طلب دفع لم يُؤكَّد',
      cancelHint: 'لا يرى العميل إلا الفئة، ولا يرى السبب الذي تكتبه.',
      category: 'الفئة التي يراها العميل',
      cancelSubmit: 'إلغاء طلب الدفع',
      cancelled: 'أُلغي طلب الدفع.',
      refund: 'إعادة المبلغ',
      refundTitle: 'إعادة مبلغ مدفوع',
      refundHint: 'تُعاد فقط دفعة مدفوعة لم تُستخدم بعد. دفعة المحفظة تعود إلى الرصيد الذي دُفعت منه، بالعملة والمبلغ نفسيهما، والدفعة الخارجية تُسجَّل كمبلغ أُعيد خارج المنصة. ودفعة بالنقاط قبل 17 أكتوبر 2026 تعود بالعدد نفسه من الدولارات.',
      refundSubmit: 'إعادة المبلغ',
      refunded: 'أُعيد المبلغ.',
      stale: 'غيّر موظف آخر هذه الدفعة أثناء عملك عليها. أُعيد تحميلها: راجعها ثم أعد المحاولة. لم يُحفظ شيء مما أرسلته، وبقي ما كتبته.',
      certificationFeeNote: 'رسوم شهادة المستوى (قرار المالك، 15 أكتوبر 2026) تُضبط لكل مسار ومستوى في تبويب الرسوم. عند صفر تصدر شهادة المستوى تلقائيًا عند اجتياز الاختبار النهائي، وفوق الصفر تصدر تلقائيًا بعد دفع هذا البند.',
    },
    experience: {
      title: 'شهادة تثبيت الخبرة',
      hint: 'تؤكد الخبرة التي قُيّمت في الطلب، وليست شهادة المستوى. يشتريها فقط من اجتاز اختبار الدخول.',
      approveHint: 'يعتمد موظف واحد بعد الدفع (قرار المالك، 15 أكتوبر 2026). تصدر الشهادة بالصيغة المعتمدة، ومع خيار "الإنهاء" يُغلق الطلب.',
      refuseHint: 'يؤدي الرفض إلى إعادة المبلغ. لا يرى العميل إلا الفئة، ولا يرى السبب الذي تكتبه.',
      states: {
        not_eligible: 'غير مؤهل',
        unavailable: 'غير متاحة',
        available: 'متاحة للشراء',
        awaiting_payment: 'بانتظار الدفع',
        awaiting_issue: 'بانتظار الإصدار',
        issued: 'صدرت',
      },
      notEligible: {
        no_entry_quiz: 'لا يوجد لهذا الطلب اختبار دخول خاضع لحد النجاح، فلا تُعرض عليه الشهادة.',
        entry_quiz_not_passed: 'لم يجتز العميل اختبار الدخول (أو لم يُصحَّح)، فلا تُعرض عليه شهادة تثبيت الخبرة أبدًا.',
      },
      unavailable: {
        case_status: 'لا تُباع الشهادة في هذه المرحلة من الطلب.',
        price_not_set: 'سعر الشهادة غير مضبوط في الإعدادات، فلا تُعرض.',
        wording_not_approved: 'لا توجد صيغة معتمدة للشهادة، فلا تُباع ولا تصدر.',
      },
      livePrice: 'السعر الحالي: {price}',
      priceNotSet: 'السعر غير مضبوط.',
      liveWording: 'الصيغة المعتمدة: الإصدار {version}',
      noLiveWording: 'لا توجد صيغة معتمدة.',
      statuses: {
        requested: 'مطلوبة',
        approved: 'معتمدة وقيد الإصدار',
        issued: 'صدرت',
        refused: 'مرفوضة',
        cancelled: 'ملغاة',
      },
      choice: 'اختيار العميل',
      choices: {
        stop: 'الإنهاء: يُغلق الطلب عند صدور الشهادة',
        continue: 'المتابعة: خطة الدورات ثم الاختبار النهائي وشهادة المستوى',
      },
      choiceChanged: 'غيّر العميل اختياره في {at}',
      entryQuiz: 'اختبار الدخول: {percent}٪ (حد النجاح: أكثر من {mark}٪)',
      charge: 'الدفع: {amount} · {route} · {status}',
      frozenWording: 'الصيغة المثبتة عند الاعتماد: الإصدار {version} · {sha}',
      certificate: 'الشهادة {number}، صدرت في {at}',
      openCertificates: 'فتح سجل الشهادات',
      approvedBy: 'اعتمدها {name} في {at}',
      refusedBy: 'رفضها {name} في {at}',
      refusalReason: 'السبب (للموظفين): {reason}',
      refusalCategories: {
        payment_not_verified: 'تعذّر التحقق من الدفعة، فلم تصدر الشهادة، وأُعيد المبلغ.',
        not_eligible: 'هذا الطلب غير مؤهل للشهادة، وأُعيد المبلغ.',
        other: 'تعذّر إصدار الشهادة، وأُعيد المبلغ. يُرجى التواصل مع المؤسسة.',
      },
      caseClosed: 'أُغلق الطلب بهذه الشهادة في {at}.',
      stopNotApplied: {
        case_already_at_level_certificate: 'اختار العميل الإنهاء، لكن الطلب كان قد بلغ شهادة المستوى، فلم يُغلق بهذه الشهادة.',
        case_not_in_stop_status: 'اختار العميل الإنهاء، لكن الطلب لم يكن في مرحلة يُغلق فيها بهذه الشهادة.',
      },
      approve: 'اعتماد الإصدار',
      approveSubmit: 'اعتمد وأصدر الشهادة',
      approved: 'اعتُمدت شهادة تثبيت الخبرة، وجارٍ إصدارها.',
      refuse: 'رفض',
      refuseTitle: 'رفض الشهادة وإعادة المبلغ',
      refuseSubmit: 'ارفض وأعد المبلغ',
      refused: 'رُفضت الشهادة وأُعيد المبلغ.',
      category: 'الفئة التي يراها العميل',
      history: 'الطلبات السابقة',
      stale: 'غيّر موظف آخر هذا الطلب أثناء عملك عليه. أُعيد تحميله: راجعه ثم أعد المحاولة. لم يُحفظ شيء مما أرسلته، وبقي ما كتبته.',
    },
    finalExam: {
      tab: 'الاختبار النهائي',
      title: 'الاختبار النهائي',
      autoIssue: 'تُصدر المحاولة الناجحة شهادة المستوى تلقائيًا: دون اعتماد موظف أو تقرير مقيّم أو مراجعة جودة أو لجنة (قرار المالك، 15 أكتوبر 2026). وإذا كانت رسوم شهادة المستوى أكبر من صفر، تصدر الشهادة تلقائيًا بعد دفعها.',
      states: {
        not_yet: 'لم يبدأ بعد',
        available: 'متاح',
        in_progress: 'محاولة جارية',
        waiting: 'فترة انتظار',
        retake_due: 'رسوم الإعادة مستحقة',
        blocked: 'متوقف',
        passed: 'ناجح',
        closed: 'مغلق',
      },
      blocked: {
        question_bank_short: 'تضم {course} أسئلة معتمدة أقل مما يسحبه الاختبار النهائي.',
        course_on_hold: '{course} موقوفة بقرار حوكمة عن التقييمات الجديدة.',
        setting_missing: 'أحد إعدادات الاختبار النهائي غير مضبوط.',
        try_referred: 'أُحيلت محاولة إلى الموظفين بسبب خلل في المنصة: ألغِها أدناه ليبدأ العميل محاولة جديدة لا تُحتسب عليه.',
        no_courses: 'لا توجد دورات مكتملة في الخطة المغلقة.',
      },
      plan: 'الخطة المغلقة: الإصدار {version}، أُغلقت في {at}',
      courses: 'الدورات المدروسة',
      course: '{code} · التسجيل رقم {enrollment} · إصدار الحقيبة {version} · اكتملت في {at}',
      eligible: '{count} سؤالًا معتمدًا مؤهلًا للسحب',
      eligibleShort: '{count} سؤالًا معتمدًا مؤهلًا، والسحب {k}: أقل من المطلوب.',
      settings: 'الإعدادات الحالية',
      passMark: 'حد النجاح: أكثر من {value}٪',
      questionsPerCourse: 'الأسئلة لكل دورة: {value}',
      waitDays: 'أيام الانتظار قبل الإعادة: {value}',
      retakeFee: 'رسوم الإعادة: {value}',
      rounds: 'الجولات والمحاولات',
      noRounds: 'لم تُفتح أي جولة بعد.',
      round: 'الجولة {number}',
      kinds: {
        included: 'مشمولة',
        paid: 'مدفوعة',
      },
      roundStatuses: {
        open: 'مفتوحة',
        exhausted: 'استُنفدت',
        passed: 'ناجحة',
        closed: 'مغلقة',
      },
      triesAllowed: '{count} محاولات',
      exhaustedAt: 'استُنفدت في {at}',
      waitApplied: 'الانتظار المطبَّق: {days} يومًا',
      eligibleFrom: 'تبدأ الجولة التالية اعتبارًا من {at}',
      passedAt: 'نجح في {at}',
      tryLabel: 'المحاولة {number}',
      tryStatuses: {
        issued: 'مُرسلة',
        answered: 'مُجاب عنها',
        assessed: 'مُقيَّمة',
        cancelled: 'ملغاة (لا تُحتسب)',
        draft: 'مسودة',
      },
      results: {
        passed: 'ناجحة',
        failed: 'غير ناجحة',
        referred: 'محالة إلى الموظفين',
      },
      openedAt: 'فُتحت في {at}',
      dueAt: 'تنتهي في {at}',
      scoredAt: 'صُحّحت في {at}',
      percent: '{percent}٪ (حد النجاح المطبَّق: أكثر من {mark}٪)',
      closedByTimer: 'أُغلقت بانتهاء الوقت؛ تُحتسب الأسئلة التي بلا إجابة خاطئة',
      referral: 'سبب الإحالة: {reason}',
      snapshot: 'بصمة الأسئلة المرسلة: {sha}',
      manifest: 'السحب',
      seed: 'البذرة: {seed}',
      perCourse: 'البرنامج {program}: سُحب {k} من {eligible} مؤهلًا',
      excluded: 'المستبعد: {list}',
      items: 'التصحيح لكل سؤال (للموظفين فقط)',
      item: 'السؤال {ref} (برنامج {program})',
      marks: {
        correct: 'صحيحة',
        incorrect: 'خاطئة',
        unanswered: 'بلا إجابة',
      },
      void: 'إلغاء المحاولة المحالة',
      voidHint: 'المحاولة المحالة خلل في المنصة: يلغيها الموظفون فلا تُحتسب على العميل، ويمكنه بدء محاولة جديدة. تبقى كل بياناتها في السجل.',
      voidSubmit: 'ألغِ المحاولة',
      voided: 'أُلغيت المحاولة، ولا تُحتسب على العميل.',
      reopen: 'إعادة فتح بعد عطل تقني',
      reopenHint: 'فقط لمحاولة فُتحت ولم تُصحَّح بعد، بعد عطل تقني موثّق مثل انقطاع الاتصال. يُجدَّد الوقت وتبقى كل الإجابات.',
      reopenSubmit: 'أعد فتح المحاولة',
      reopened: 'أُعيد فتح المحاولة بوقت جديد، وبقيت الإجابات.',
      level: {
        title: 'شهادة المستوى',
        states: {
          not_due: 'غير مستحقة بعد',
          queued: 'قيد الإصدار',
          fee_unusable: 'الرسوم غير قابلة للتحصيل',
          held: 'موقوفة بقرار حوكمة',
          awaiting_fee: 'بانتظار رسوم الشهادة',
          issued: 'صدرت',
        },
        held: 'تنتظر شهادة المستوى رفع إيقاف حوكمة، وتصدر بعد رفعه.',
        feeDue: 'رسوم شهادة هذا المستوى أكبر من صفر: تصدر الشهادة تلقائيًا بعد دفعها (قرار المالك، 15 أكتوبر 2026).',
        feeUnusable: 'اجتاز العميل الاختبار النهائي، لكن رسوم الشهادة في تبويب الرسوم لهذا المسار والمستوى ليست بالدولار الأمريكي. تبقى الحالة في الاختبار النهائي حتى تُدخَل الرسوم بالدولار أو تُجعل صفرًا.',
        feeFrozen: 'رسوم الشهادة المثبتة عند الاجتياز: {amount}',
        hold: 'الإيقاف رقم {id}: {program} الإصدار {version}',
        outbox: 'مهمة الإصدار: {status}، {attempts} محاولات',
        lastError: 'آخر خطأ: {error}',
        availableAt: 'المحاولة التالية في {at}',
        certificate: 'الشهادة {number}، صدرت في {at}',
        charge: 'رسوم الشهادة: {amount} · {status}',
      },
      noTransitions: 'لا توجد حالة أخرى يمكن تعيينها من هنا. يعرض تبويب الاختبار النهائي المحاولات، وتُصدر المحاولة الناجحة شهادة المستوى تلقائيًا.',
    },
    settings: {
      title: 'بعد اختبار الدخول',
      hint: 'إعدادات محكومة يقررها المالك (15 أكتوبر 2026)، ولا قيمة افتراضية لها في الشيفرة. كل قيمة تُثبَّت حيث تُستخدم: يحتفظ كل شراء بسعره، وتحتفظ كل محاولة بحد نجاحها.',
      fields: {
        price: { label: 'سعر شهادة تثبيت الخبرة (بالدولار الأمريكي، من 1.00 إلى 1,000,000.00)', hint: 'بالدولار الأمريكي، وتُقبل السنتات. فارغ: الشهادة غير معروضة.' },
        passMark: { label: 'حد النجاح في الاختبار النهائي (٪، من 1 إلى 99)', hint: 'تنجح المحاولة فقط فوق هذه الدرجة، على الكسر الدقيق (قرار المالك، 15 أكتوبر 2026؛ القيمة الأولية 50).' },
        questionsPerCourse: { label: 'عدد الأسئلة لكل دورة مدروسة (من 1 إلى 50)', hint: 'عدد الأسئلة المسحوبة من كل دورة مدروسة. فارغ: لا يبدأ أي اختبار نهائي.' },
        waitDays: { label: 'أيام الانتظار قبل الإعادة (من 0 إلى 365)', hint: 'الأيام بعد المحاولة الثالثة الفاشلة قبل ثلاث محاولات جديدة. فارغ: لا تبدأ أي إعادة.' },
        retakeFee: { label: 'رسوم إعادة الاختبار النهائي (بالدولار الأمريكي، من 1.00 إلى 1,000,000.00)', hint: 'بالدولار الأمريكي، وتُقبل السنتات. فارغ: لا تُباع أي إعادة.' },
      },
      invalid: 'أدخل عددًا صحيحًا من {min} إلى {max}.',
      usdInvalid: 'أدخل مبلغًا بالدولار الأمريكي من 1.00 إلى 1,000,000.00 بخانتين عشريتين على الأكثر، مثل 49.99.',
      atTodaysRate: '{syp} بسعر اليوم',
      passMarkRequired: 'لا يمكن ترك حد النجاح فارغًا: أدخل عددًا صحيحًا من 1 إلى 99.',
      notSet: 'غير مضبوط.',
    },
    wording: {
      tab: 'صيغة الشهادة',
      title: 'صيغة شهادة تثبيت الخبرة',
      hint: 'صيغة محكومة ومؤرّخة بإصدارات (قرار المالك، 15 أكتوبر 2026). يعتمد دور المالك وحده (super-admin) إصدارًا، ويُسجَّل الاعتماد في سجل التدقيق. لا يتغير إصدار معتمد أبدًا: التعديل يُنشئ مسودة جديدة تحتاج إلى اعتماد من جديد. لا تُباع الشهادة ولا تصدر ما دام لا يوجد إصدار معتمد.',
      notApproved: 'غير معتمدة: لا يمكن بيع شهادة تثبيت الخبرة ولا إصدارها حتى يعتمد المالك هذه الصيغة.',
      empty: 'لا توجد صيغة بعد.',
      version: 'الإصدار {version}',
      statuses: {
        draft: 'مسودة',
        approved: 'معتمدة',
        retired: 'متقاعدة',
      },
      sha: 'البصمة: {sha}',
      titleLabel: 'العنوان',
      bodyLabel: 'النص',
      titleAr: 'العنوان بالعربية',
      titleEn: 'العنوان بالإنجليزية',
      bodyAr: 'النص بالعربية',
      bodyEn: 'النص بالإنجليزية',
      titleInvalid: 'مطلوب، بحد أقصى 200 حرف.',
      bodyInvalid: 'مطلوب، بحد أقصى 4000 حرف.',
      createdBy: 'أنشأه {name} في {at}',
      approvedBy: 'اعتمده {name} في {at}',
      approvalNoteRecorded: 'ملاحظة الاعتماد: {note}',
      retiredAt: 'تقاعد في {at}',
      readOnly: 'إصدار معتمد أو متقاعد: لا يتغير أبدًا.',
      edit: 'تعديل المسودة',
      save: 'حفظ المسودة',
      saved: 'حُفظت المسودة.',
      newDraft: 'مسودة جديدة من الإصدار المعتمد',
      newEmptyDraft: 'مسودة جديدة',
      draftSubmit: 'أنشئ المسودة',
      drafted: 'أُنشئت مسودة جديدة.',
      approve: 'اعتماد هذا الإصدار',
      approveHint: 'يصبح هذا الإصدار الصيغة المطبوعة على كل شهادة تثبيت خبرة تصدر من الآن، ويتقاعد الإصدار المعتمد السابق.',
      approvalNote: 'ملاحظة الاعتماد (من 10 إلى 2000 حرف)',
      approveSubmit: 'اعتمد الصيغة',
      approved: 'اعتُمدت الصيغة.',
      approverOnly: 'يعتمد دور المالك وحده (super-admin) الصيغة.',
      stale: 'غيّر موظف آخر هذه الصيغة أثناء عملك عليها. أُعيد تحميلها: راجعها ثم أعد المحاولة. لم يُحفظ شيء مما أرسلته، وبقي ما كتبته.',
    },
    queue: {
      payments: {
        title: 'مدفوعات بانتظار التأكيد',
        description: 'الدفعات خارج المنصة التي تنتظر تأكيد الموظفين: شهادة تثبيت الخبرة، وإعادة الاختبار النهائي، ورسوم شهادة المستوى. يُؤكَّد كل منها من ملف الطلب.',
        empty: 'لا توجد مدفوعات مطابقة.',
      },
      experience_certificates: {
        title: 'شهادات تثبيت الخبرة',
        description: 'الشهادات المدفوعة التي تنتظر اعتماد موظف واحد، وسجل ما سبق.',
        empty: 'لا توجد شهادات مطابقة.',
      },
      attention: {
        title: 'متابعة ما بعد اختبار الدخول',
        description: 'ما يحتاج إلى تدخل الموظفين: اختبارات نهائية متوقفة، وشهادات مستوى موقوفة أو تنتظر تصحيح رسومها، ومدفوعات على طلبات مغلقة.',
        blocked: 'اختبارات نهائية متوقفة',
        held: 'شهادات مستوى موقوفة بقرار حوكمة',
        feeUnusable: 'شهادات مستوى تنتظر تصحيح رسوم الشهادة',
        paidClosed: 'مدفوعات غير مستخدمة على طلبات مغلقة',
        empty: 'لا شيء هنا.',
      },
      status: 'الحالة',
      type: 'النوع',
      all: 'الكل',
      awaitingApproval: 'بانتظار الاعتماد',
      refresh: 'تحديث',
      case: 'الطلب',
      client: 'العميل',
      amount: 'المبلغ',
      paidIn: 'العملة المدفوعة',
      route: 'طريقة الدفع',
      requested: 'تاريخ الطلب',
      choice: 'اختيار العميل',
      entryQuiz: 'اختبار الدخول',
      charge: 'الدفع',
      program: 'البرنامج',
      reason: 'السبب',
      holds: 'الإيقافات',
      action: 'الإجراء',
      open: 'فتح الطلب',
    },
  },
  en: {
    common: {
      loading: 'Loading…',
      loadError: 'Unable to load.',
      retry: 'Try again',
      failed: 'The action could not be completed.',
      cancel: 'Cancel',
      notSet: 'Not set',
      someone: 'a staff member',
      reason: 'Reason (staff only)',
      reasonHint: '10 to 2,000 characters. Kept in the audit trail.',
      reasonInvalid: 'Write between 10 and 2,000 characters.',
      settingMissing: 'A setting this act needs is not set: {setting}. Set it in the RPL settings, then try again.',
      ownCase: 'Staff cannot confirm, approve or refuse a payment or certificate on their own case.',
      noRate: 'No exchange rate is set: nobody can pay in Syrian pounds until one is set. Dollar payments are not affected.',
      by: '{name} on {at}',
      paidIn: {
        USD: 'US dollars',
        SYP: 'Syrian pounds',
        legacy: 'Points (earlier record)',
      },
    },
    chargeTypes: {
      experience_certificate: 'Experience Confirmation Certificate',
      final_exam_retake: 'Final-exam retake',
      certification_fee: 'Level certification fee',
    },
    chargeStatuses: {
      pending: 'Awaiting confirmation',
      paid: 'Paid',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
    },
    routes: {
      wallet: 'Wallet',
      walletUsd: 'Wallet, dollar balance',
      walletSyp: 'Wallet, pound balance',
      offline: 'Paid outside the platform',
    },
    methods: {
      bank_transfer: 'Bank transfer',
      cash: 'Cash',
      syriatel_cash: 'Syriatel Cash',
      mtn_cash: 'MTN Cash',
      external_gateway: 'External gateway',
      manual_reconciliation: 'Manual reconciliation',
    },
    cancelCategories: {
      payment_not_found: 'We could not find this payment.',
      amount_mismatch: 'The amount paid does not match the price.',
      reference_already_used: 'This payment reference was already used.',
      exchange_rate_outdated: 'Syrian-pound amount out of date',
      other: 'The institute could not confirm this payment.',
      client_cancelled: 'The client cancelled this payment request.',
      case_closed: 'Cancelled because the request is complete.',
    },
    charges: {
      title: 'Payments after the entry quiz',
      hint: 'The client pays the dollar price from his dollar or pound balance, or outside the platform. A pound amount is the dollar price × the rate at the moment he pays from his balance or asks to pay outside, and it is frozen then.',
      empty: 'No payments exist for this case yet.',
      cycle: 'round {cycle}',
      amount: 'Amount',
      route: 'Route',
      invoice: 'Invoice: {number}',
      payerReference: 'Client reference: {reference}',
      requestedAt: 'Requested on {at}',
      paidAt: 'Paid on {at}',
      confirmedBy: 'Confirmed by {name} on {at}',
      offlineEvidence: 'Received outside: {amount} · {method} · reference {reference}',
      staffNotes: 'Staff notes: {notes}',
      consumed: 'Used on {at}',
      cancelledBy: 'Cancelled by {name} on {at}',
      cancelReason: 'Reason: {reason}',
      refundedBy: 'Refunded by {name} on {at}',
      refundReason: 'Refund reason: {reason}',
      confirm: 'Confirm payment',
      confirmTitle: 'Confirm a payment received outside the platform',
      confirmHint: 'Confirm only money the institute has received. The reference must be unique.',
      method: 'Method',
      reference: 'Reference (3 to 255 characters)',
      referenceInvalid: 'Write a reference of 3 to 255 characters.',
      paidOn: 'Date paid',
      paidOnInvalid: 'Choose a date no later than today.',
      amountDue: 'Amount due: {amount}',
      amountReceived: 'Amount received',
      amountInvalidUsd: 'Enter an amount in US dollars with at most two decimals, such as 49.99.',
      amountInvalidSyp: 'Enter a whole number of Syrian pounds, such as 125000.',
      amountMustMatch: 'The amount received must equal the amount due. If the client paid a different amount, do not confirm: cancel the request with "The amount paid does not match the price".',
      evidenceHint: 'Confirm only the exact amount due, in the currency of the request: both are frozen on it. The method and the reference are kept as evidence.',
      notConfirmable: 'A payment request in points from the former system cannot be confirmed: cancel it, and the client asks again in US dollars or Syrian pounds.',
      notes: 'Notes (optional, staff only)',
      notesInvalid: 'At most 2,000 characters.',
      confirmSubmit: 'Confirm the payment',
      confirmed: 'Payment confirmed.',
      slotTaken: 'A paid charge already exists for this slot. Check before confirming a second payment.',
      cancel: 'Cancel the request',
      cancelTitle: 'Cancel an unconfirmed payment request',
      cancelHint: 'The client sees only the category, never your reason.',
      category: 'Category the client sees',
      cancelSubmit: 'Cancel the payment request',
      cancelled: 'Payment request cancelled.',
      refund: 'Refund',
      refundTitle: 'Refund a paid charge',
      refundHint: 'Only a paid charge that has not been used is refunded. A wallet payment returns to the balance it was paid from, in the same currency and amount; an outside payment is recorded as returned outside the platform. A payment in points made before 17 Oct 2026 returns as the same number of US dollars.',
      refundSubmit: 'Refund the payment',
      refunded: 'Payment refunded.',
      stale: 'Someone else changed this payment while you were working on it. It has been reloaded: check it and try again. Nothing you sent was saved, and what you typed is kept.',
      certificationFeeNote: 'The level certification fee (owner decision, 15 Oct 2026) is set per pathway and level on the Fees tab. At 0 the level certificate is issued automatically when the final exam is passed; above 0 it is issued automatically once this charge is paid.',
    },
    experience: {
      title: 'Experience Confirmation Certificate',
      hint: 'It confirms the experience assessed in the request and is not the level certificate. Only a client whose entry quiz passed may buy it.',
      approveHint: 'One member of staff approves after payment (owner decision, 15 Oct 2026). The certificate is issued with the approved wording, and with "stop" the case closes.',
      refuseHint: 'Refusing returns the payment. The client sees only the category, never your reason.',
      states: {
        not_eligible: 'Not eligible',
        unavailable: 'Not available',
        available: 'Available to buy',
        awaiting_payment: 'Awaiting payment',
        awaiting_issue: 'Awaiting issue',
        issued: 'Issued',
      },
      notEligible: {
        no_entry_quiz: 'This case has no entry quiz under the pass mark, so the certificate is not offered.',
        entry_quiz_not_passed: 'The client did not pass the entry quiz (or it is not marked), so the Experience Confirmation Certificate is never offered.',
      },
      unavailable: {
        case_status: 'The certificate is not sold at this stage of the case.',
        price_not_set: 'The certificate price is not set in the settings, so it is not offered.',
        wording_not_approved: 'No wording is approved, so the certificate cannot be sold or issued.',
      },
      livePrice: 'Current price: {price}',
      priceNotSet: 'The price is not set.',
      liveWording: 'Approved wording: version {version}',
      noLiveWording: 'No wording is approved.',
      statuses: {
        requested: 'Requested',
        approved: 'Approved, being issued',
        issued: 'Issued',
        refused: 'Refused',
        cancelled: 'Cancelled',
      },
      choice: 'The client\'s choice',
      choices: {
        stop: 'Stop: the case closes when the certificate is issued',
        continue: 'Continue: the course plan, then the final exam and the level certificate',
      },
      choiceChanged: 'The client changed the choice on {at}',
      entryQuiz: 'Entry quiz: {percent}% (pass mark: more than {mark}%)',
      charge: 'Payment: {amount} · {route} · {status}',
      frozenWording: 'Wording frozen at approval: version {version} · {sha}',
      certificate: 'Certificate {number}, issued on {at}',
      openCertificates: 'Open the certificate registry',
      approvedBy: 'Approved by {name} on {at}',
      refusedBy: 'Refused by {name} on {at}',
      refusalReason: 'Reason (staff only): {reason}',
      refusalCategories: {
        payment_not_verified: 'The payment could not be verified, so the certificate was not issued. The payment was returned.',
        not_eligible: 'This request is not eligible for the certificate. The payment was returned.',
        other: 'The certificate could not be issued. The payment was returned. Please contact the institute.',
      },
      caseClosed: 'The case closed with this certificate on {at}.',
      stopNotApplied: {
        case_already_at_level_certificate: 'The client chose to stop, but the case had already reached the level certificate, so it did not close with this certificate.',
        case_not_in_stop_status: 'The client chose to stop, but the case was not at a stage where this certificate closes it.',
      },
      approve: 'Approve the issue',
      approveSubmit: 'Approve and issue the certificate',
      approved: 'Experience confirmation certificate approved; it is being issued.',
      refuse: 'Refuse',
      refuseTitle: 'Refuse the certificate and return the payment',
      refuseSubmit: 'Refuse and return the payment',
      refused: 'Experience confirmation certificate refused; the payment is returned.',
      category: 'Category the client sees',
      history: 'Earlier requests',
      stale: 'Someone else changed this request while you were working on it. It has been reloaded: check it and try again. Nothing you sent was saved, and what you typed is kept.',
    },
    finalExam: {
      tab: 'Final exam',
      title: 'Final exam',
      autoIssue: 'A passed try issues the level certificate automatically: no staff approval, assessor report, quality review or committee (owner decision, 15 Oct 2026). When the level\'s certification fee is above 0, the certificate is issued automatically once that fee is paid.',
      states: {
        not_yet: 'Not started yet',
        available: 'Available',
        in_progress: 'Try in progress',
        waiting: 'Waiting period',
        retake_due: 'Retake fee due',
        blocked: 'Blocked',
        passed: 'Passed',
        closed: 'Closed',
      },
      blocked: {
        question_bank_short: '{course} has fewer approved questions than the final exam draws.',
        course_on_hold: '{course} is on a governance hold for new assessments.',
        setting_missing: 'A final-exam setting is not set.',
        try_referred: 'A try was referred to staff because of a platform fault: void it below so the client can start a new try that is not counted against them.',
        no_courses: 'The closed plan holds no completed course.',
      },
      plan: 'Closed plan: version {version}, closed on {at}',
      courses: 'Studied courses',
      course: '{code} · enrolment #{enrollment} · package version {version} · completed on {at}',
      eligible: '{count} approved questions eligible for the draw',
      eligibleShort: '{count} approved questions eligible, and the draw takes {k}: too few.',
      settings: 'Current settings',
      passMark: 'Pass mark: more than {value}%',
      questionsPerCourse: 'Questions per course: {value}',
      waitDays: 'Waiting days before a retake: {value}',
      retakeFee: 'Retake fee: {value}',
      rounds: 'Rounds and tries',
      noRounds: 'No round has opened yet.',
      round: 'Round {number}',
      kinds: {
        included: 'Included',
        paid: 'Paid',
      },
      roundStatuses: {
        open: 'Open',
        exhausted: 'Exhausted',
        passed: 'Passed',
        closed: 'Closed',
      },
      triesAllowed: '{count} tries',
      exhaustedAt: 'Exhausted on {at}',
      waitApplied: 'Waiting period applied: {days} days',
      eligibleFrom: 'The next round may start from {at}',
      passedAt: 'Passed on {at}',
      tryLabel: 'Try {number}',
      tryStatuses: {
        issued: 'Sent',
        answered: 'Answered',
        assessed: 'Assessed',
        cancelled: 'Voided (not counted)',
        draft: 'Draft',
      },
      results: {
        passed: 'Passed',
        failed: 'Not passed',
        referred: 'Referred to staff',
      },
      openedAt: 'Opened on {at}',
      dueAt: 'Due on {at}',
      scoredAt: 'Marked on {at}',
      percent: '{percent}% (pass mark applied: more than {mark}%)',
      closedByTimer: 'Closed by the timer; unanswered questions count as wrong',
      referral: 'Why referred: {reason}',
      snapshot: 'Fingerprint of the questions sent: {sha}',
      manifest: 'The draw',
      seed: 'Seed: {seed}',
      perCourse: 'Programme {program}: {k} drawn of {eligible} eligible',
      excluded: 'Excluded: {list}',
      items: 'Marks per question (staff only)',
      item: 'Question {ref} (programme {program})',
      marks: {
        correct: 'Correct',
        incorrect: 'Incorrect',
        unanswered: 'Unanswered',
      },
      void: 'Void the referred try',
      voidHint: 'A referred try is a platform fault: staff void it so it is never counted against the client, who may then start a new try. Everything it holds stays on the record.',
      voidSubmit: 'Void the try',
      voided: 'The try was voided and is not counted against the client.',
      reopen: 'Reopen after a technical failure',
      reopenHint: 'Only for a try that was opened and is not marked yet, after a documented technical failure such as a lost connection. The time restarts and every answer is kept.',
      reopenSubmit: 'Reopen the try',
      reopened: 'The try was reopened with a new time limit; its answers are kept.',
      level: {
        title: 'Level certificate',
        states: {
          not_due: 'Not due yet',
          queued: 'Being issued',
          fee_unusable: 'Fee cannot be charged',
          held: 'On governance hold',
          awaiting_fee: 'Awaiting the certification fee',
          issued: 'Issued',
        },
        held: 'The level certificate waits on a governance hold. It is issued once the hold is lifted.',
        feeDue: 'This level\'s certification fee is above 0: the certificate is issued automatically once it is paid (owner decision, 15 Oct 2026).',
        feeUnusable: 'The client passed the final exam, but the Fees tab\'s certification fee for this pathway and level is not in US dollars. The case stays in the final exam until the fee is entered in dollars or set to 0.',
        feeFrozen: 'Certification fee frozen at the pass: {amount}',
        hold: 'Hold #{id}: {program} version {version}',
        outbox: 'Issuance job: {status}, {attempts} attempts',
        lastError: 'Last error: {error}',
        availableAt: 'Next attempt at {at}',
        certificate: 'Certificate {number}, issued on {at}',
        charge: 'Certification fee: {amount} · {status}',
      },
      noTransitions: 'No other status can be set from here. The final exam tab shows the tries; a passed try issues the level certificate automatically.',
    },
    settings: {
      title: 'After the entry quiz',
      hint: 'Governed settings the owner decides (15 Oct 2026); the code holds no default. Each value is frozen where it is used: a purchase keeps its price, and a try keeps its pass mark.',
      fields: {
        price: { label: 'Experience Confirmation Certificate price (US dollars, 1.00 to 1,000,000.00)', hint: 'In US dollars, cents allowed. Empty: the certificate is not offered.' },
        passMark: { label: 'Final-exam pass mark (%, 1 to 99)', hint: 'A try passes only above this mark, on the exact fraction (owner decision, 15 Oct 2026; seeded 50).' },
        questionsPerCourse: { label: 'Questions per studied course (1 to 50)', hint: 'Questions drawn from each studied course. Empty: no final exam can start.' },
        waitDays: { label: 'Retake waiting days (0 to 365)', hint: 'Days after the third failed try before three new tries. Empty: no retake can start.' },
        retakeFee: { label: 'Final-exam retake fee (US dollars, 1.00 to 1,000,000.00)', hint: 'In US dollars, cents allowed. Empty: no retake is sold.' },
      },
      invalid: 'Enter a whole number from {min} to {max}.',
      usdInvalid: 'Enter an amount in US dollars from 1.00 to 1,000,000.00 with at most two decimals, such as 49.99.',
      atTodaysRate: '{syp} at today\'s rate',
      passMarkRequired: 'The final-exam pass mark cannot be empty: enter a whole number from 1 to 99.',
      notSet: 'Not set.',
    },
    wording: {
      tab: 'Certificate wording',
      title: 'Experience Confirmation Certificate wording',
      hint: 'A governed, versioned wording (owner decision, 15 Oct 2026). Only the owner\'s role (super-admin) approves a version, and the approval is recorded in the audit trail. An approved version never changes: editing makes a new draft that needs approval again. The certificate is not sold or issued while no version is approved.',
      notApproved: 'Not approved: the Experience Confirmation Certificate cannot be sold or issued until the owner approves this wording.',
      empty: 'No wording exists yet.',
      version: 'Version {version}',
      statuses: {
        draft: 'Draft',
        approved: 'Approved',
        retired: 'Retired',
      },
      sha: 'Fingerprint: {sha}',
      titleLabel: 'Title',
      bodyLabel: 'Body',
      titleAr: 'Title in Arabic',
      titleEn: 'Title in English',
      bodyAr: 'Body in Arabic',
      bodyEn: 'Body in English',
      titleInvalid: 'Required, at most 200 characters.',
      bodyInvalid: 'Required, at most 4,000 characters.',
      createdBy: 'Created by {name} on {at}',
      approvedBy: 'Approved by {name} on {at}',
      approvalNoteRecorded: 'Approval note: {note}',
      retiredAt: 'Retired on {at}',
      readOnly: 'An approved or retired version never changes.',
      edit: 'Edit the draft',
      save: 'Save the draft',
      saved: 'Draft saved.',
      newDraft: 'New draft from the approved version',
      newEmptyDraft: 'New draft',
      draftSubmit: 'Create the draft',
      drafted: 'A new draft was created.',
      approve: 'Approve this version',
      approveHint: 'This version becomes the wording printed on every Experience Confirmation Certificate issued from now on, and the previous approved version is retired.',
      approvalNote: 'Approval note (10 to 2,000 characters)',
      approveSubmit: 'Approve the wording',
      approved: 'Wording approved.',
      approverOnly: 'Only the owner\'s role (super-admin) approves the wording.',
      stale: 'Someone else changed this wording while you were working on it. It has been reloaded: check it and try again. Nothing you sent was saved, and what you typed is kept.',
    },
    queue: {
      payments: {
        title: 'Payments to confirm',
        description: 'Payments made outside the platform that wait for staff to confirm them: the Experience Confirmation Certificate, a final-exam retake and the level certification fee. Each is confirmed on its case.',
        empty: 'No payments match.',
      },
      experience_certificates: {
        title: 'Experience Confirmation Certificates',
        description: 'Paid certificates waiting for one member of staff to approve their issue, and the earlier ones.',
        empty: 'No certificates match.',
      },
      attention: {
        title: 'After-quiz attention',
        description: 'What needs staff: blocked final exams, level certificates on hold or waiting for their fee to be corrected, and paid charges on closed cases.',
        blocked: 'Blocked final exams',
        held: 'Level certificates on governance hold',
        feeUnusable: 'Level certificates waiting for the certification fee to be corrected',
        paidClosed: 'Unused paid charges on closed cases',
        empty: 'Nothing here.',
      },
      status: 'Status',
      type: 'Type',
      all: 'All',
      awaitingApproval: 'Awaiting approval',
      refresh: 'Refresh',
      case: 'Case',
      client: 'Client',
      amount: 'Amount',
      paidIn: 'Paid in',
      route: 'Route',
      requested: 'Requested',
      choice: 'Client\'s choice',
      entryQuiz: 'Entry quiz',
      charge: 'Payment',
      program: 'Programme',
      reason: 'Reason',
      holds: 'Holds',
      action: 'Action',
      open: 'Open the case',
    },
  },
}

export function afterQuizCopy(language) {
  return AFTER_QUIZ_COPY[language === 'ar' ? 'ar' : 'en']
}

function labelFrom(map, code) {
  if (code == null || code === '') return ''
  return map?.[code] || String(code).replaceAll('_', ' ')
}

export function chargeStatusLabel(status, language) {
  return labelFrom(afterQuizCopy(language).chargeStatuses, status)
}

export function chargeTypeLabel(type, language) {
  return labelFrom(afterQuizCopy(language).chargeTypes, type)
}

export function experienceStateLabel(state, language) {
  return labelFrom(afterQuizCopy(language).experience.states, state)
}

export function finalExamStateLabel(state, language) {
  return labelFrom(afterQuizCopy(language).finalExam.states, state)
}

export function levelCertificateStateLabel(state, language) {
  return labelFrom(afterQuizCopy(language).finalExam.level.states, state)
}

/*
 * A CHARGE'S AMOUNT IN ONE LINE (contract 2.6: amount is a Money, frozen when the
 * client paid from his balance or asked to pay outside, with price_usd and the
 * exchange_rate used):
 *   dollars                 "$ 49.99"
 *   pounds                  "649,870 SYP ($ 49.99 at 1 USD = 13,000 SYP)"
 *   points (before 17 Oct)  "1,500 points (earlier record)"
 */
export function chargePriceLine(charge, language) {
  const amount = charge?.amount
  if (!isMoney(amount)) return '—'
  const ar = language === 'ar'
  const text = formatMoneyInline(amount, language)
  if (amount.currency !== 'SYP' || !isMoney(charge?.price_usd)) return text
  const usd = formatMoneyInline(charge.price_usd, language)
  if (!charge?.exchange_rate) return `${text} (${usd})`
  const rate = exchangeRateText(charge.exchange_rate, language)
  return ar ? `${text} (${usd} بسعر \u2068${rate}\u2069)` : `${text} (${usd} at ${rate})`
}

/** How a charge was or will be paid: from which balance, or outside the platform. */
export function chargeRouteLabel(charge, language) {
  const routes = afterQuizCopy(language).routes
  if (charge?.route === 'offline') return routes.offline
  if (charge?.route === 'wallet') {
    const currency = charge?.amount?.currency
    return currency === 'USD' ? routes.walletUsd : currency === 'SYP' ? routes.walletSyp : routes.wallet
  }
  return charge?.route || '—'
}

/** The currency a charge is in, in words ("US dollars", "Syrian pounds", or the earlier points), or "—". */
export function chargePaidInLabel(charge, language) {
  const paidIn = afterQuizCopy(language).common.paidIn
  const currency = charge?.amount?.currency
  if (!currency) return '—'
  return paidIn[currency] || paidIn.legacy
}

/** The categories staff may cancel this charge with: an out-of-date rate applies only to a request in Syrian pounds. */
export function cancelCategoriesFor(charge) {
  return STAFF_CANCEL_CATEGORIES.filter((category) => category !== 'exchange_rate_outdated' || charge?.amount?.currency === 'SYP')
}

/** The 503 refusal while no exchange rate is set: nothing is charged in Syrian pounds (fail closed). */
export function rateMissing(error) {
  return Number(error?.response?.status) === 503 && error?.response?.data?.code === 'exchange_rate_missing'
}

/*
 * What stops a Fees-tab schedule from saving, as the API checks it (contract
 * S14), or null. Every fee is in US dollars (owner, 17 Oct 2026):
 *   - legacy_currency: a row in any other currency (POINTS or money from before),
 *     shown but never saved as it is: staff re-enter it in dollars;
 *   - amount: not 0 and not $1.00 to $1,000,000.00 with at most two decimals.
 */
export function feeScheduleFormError(form) {
  const currency = String(form?.currency ?? '').trim().toUpperCase()
  if (currency !== 'USD') return 'legacy_currency'
  const minor = toMinor(form?.amount, 'USD')
  if (minor == null) return 'amount'
  if (minor !== 0 && (minor < MIN_PRICE_USD_MINOR || minor > MAX_PRICE_USD_MINOR)) return 'amount'
  return null
}

/** A Fees-tab amount typed in dollars, as the integer of US cents the API takes (amount_minor). */
export function feeScheduleAmountMinor(form) {
  return toMinor(form?.amount, 'USD')
}

/** A charge in one line: its type, and the round it opens for a retake. */
export function chargeTitle(charge, language) {
  const copy = afterQuizCopy(language)
  const type = chargeTypeLabel(charge?.type, language)
  return charge?.type === 'final_exam_retake' && charge?.cycle != null ? `${type} · ${copy.charges.cycle.replace('{cycle}', String(charge.cycle))}` : type
}

/** The row changed under the writer: 409 carrying exactly this code, and nothing else. */
export function isStaleConflict(error, code) {
  return Number(error?.response?.status) === 409 && Boolean(code) && error?.response?.data?.code === code
}

/** A governed setting the act needs is unset: a setting to fix, never "temporarily unavailable". */
export function settingMissingName(error) {
  if (Number(error?.response?.status) !== 503 || error?.response?.data?.code !== 'rpl_setting_missing') return null
  return error?.response?.data?.setting || ''
}

/** A staff reason the API accepts: 10 to 2000 characters after trimming. */
export function isAfterQuizReasonValid(value) {
  const length = String(value ?? '').trim().length
  return length >= AFTER_QUIZ_LIMITS.reasonMin && length <= AFTER_QUIZ_LIMITS.reasonMax
}

/** The server's flag when it sends one, else the fallback the status allows. */
export function serverAllows(row, flag, fallback) {
  const value = row?.can?.[flag]
  return typeof value === 'boolean' ? value : Boolean(fallback)
}

/*
 * Approving the wording is the owner's act (K12): super-admin only. The platform's
 * hasPermission() answers true for every administrator, so it cannot tell an
 * admin from a super-admin here; this reads the role or the permission itself.
 */
export function canApproveWording(authorization) {
  if (!authorization) return false
  const roles = Array.isArray(authorization.roles) ? authorization.roles : []
  const permissions = Array.isArray(authorization.permissions) ? authorization.permissions : []
  return roles.includes('super-admin') || permissions.includes(AFTER_QUIZ_PERMISSIONS.wordingApprove)
}

/*
 * THE CONFIRM FORM (S15). Every field is validated the way the API validates it,
 * and the body carries exactly the API's keys. The currency is the charge's own
 * (shown, never chosen) and the amount received must equal the charge's frozen
 * amount in it, in minor units (M12): a client who paid another amount or in the
 * other currency is not confirmed; staff cancel and top up what was received.
 */
export function emptyConfirmForm() {
  return { method: 'bank_transfer', reference: '', paid_at: '', amount_received: '', notes: '' }
}

export function todayIso(now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Whether staff can confirm an outside payment of this charge at all: only one in US dollars or Syrian pounds. */
export function isConfirmableCharge(charge) {
  const currency = charge?.amount?.currency
  return (currency === 'USD' || currency === 'SYP') && amountMinorOf(charge.amount) != null
}

/*
 * The errors by field: '' when valid. amount_received is 'amount_received' when
 * the text is not an amount in the charge's currency, 'amount_mismatch' when it
 * is one but not the amount due, and 'legacy_currency' on a charge in points.
 */
export function confirmFormErrors(form, today = todayIso(), charge = null) {
  const reference = String(form?.reference ?? '').trim()
  const paidAt = String(form?.paid_at ?? '').trim()
  const currency = charge?.amount?.currency
  let amount = ''
  if (!isConfirmableCharge(charge)) amount = 'legacy_currency'
  else {
    const minor = toMinor(form?.amount_received, currency)
    if (minor == null) amount = 'amount_received'
    else if (minor !== charge.amount.amount_minor) amount = 'amount_mismatch'
  }
  return {
    method: OFFLINE_METHODS.includes(form?.method) ? '' : 'method',
    reference: reference.length >= AFTER_QUIZ_LIMITS.referenceMin && reference.length <= AFTER_QUIZ_LIMITS.referenceMax ? '' : 'reference',
    paid_at: /^\d{4}-\d{2}-\d{2}$/.test(paidAt) && paidAt <= today ? '' : 'paid_at',
    amount_received: amount,
    notes: String(form?.notes ?? '').length <= AFTER_QUIZ_LIMITS.notesMax ? '' : 'notes',
  }
}

export function isConfirmFormValid(form, today = todayIso(), charge = null) {
  return Object.values(confirmFormErrors(form, today, charge)).every((value) => value === '')
}

/** The S15 body: the charge's lock_version, and the amount received in minor units of the charge's currency. */
export function confirmPayload(form, charge) {
  const notes = String(form?.notes ?? '').trim()
  const currency = charge?.amount?.currency
  return {
    lock_version: charge?.lock_version,
    method: form.method,
    reference: String(form.reference).trim(),
    paid_at: String(form.paid_at).trim(),
    amount_received_minor: toMinor(form.amount_received, currency),
    currency_received: currency,
    ...(notes ? { notes } : {}),
  }
}

/** Another charge of the same type and round is already paid: warn before a second confirmation. */
export function hasPaidChargeForSlot(charges, charge) {
  return (Array.isArray(charges) ? charges : []).some((other) => other && other !== charge && other.public_id !== charge?.public_id && other.type === charge?.type && Number(other.cycle) === Number(charge?.cycle) && other.status === 'paid')
}

/*
 * THE SETTINGS FORM (2.2). A key is sent ONLY when the server holds a value for
 * it or someone typed in it; emptying a nullable key sends null, which clears it
 * (the owner withdraws a price). The pass mark is the one required key. Nothing
 * is prefilled: what shows is what the server holds.
 */
function heldValue(raw, key) {
  const value = raw?.[key]
  return value != null && value !== '' && typeof value !== 'object' && typeof value !== 'boolean'
}

/** A held value as the form shows it: a 'usd' setting's whole cents as dollars ("150000" gives "1500.00"). */
function shownValue(definition, value) {
  const text = String(value).trim()
  if (definition.kind === 'usd' && /^\d+$/.test(text)) return fromMinor(text, 'USD')
  return text
}

export function readAfterQuizSettings(raw) {
  const values = {}
  const include = {}
  for (const definition of AFTER_QUIZ_SETTINGS) {
    const { key } = definition
    const held = heldValue(raw, key)
    values[key] = held ? shownValue(definition, raw[key]) : ''
    include[key] = held
  }
  return { values, include, errors: {} }
}

export function changeAfterQuizSetting(state, key, value) {
  const { [key]: _cleared, ...errors } = state?.errors || {}
  return {
    values: { ...(state?.values || {}), [key]: value },
    include: { ...(state?.include || {}), [key]: true },
    errors,
  }
}

export function afterQuizSettingDefinition(key) {
  return AFTER_QUIZ_SETTINGS.find((setting) => setting.key === key) || null
}

/** The value a setting's text sends: whole US cents for a 'usd' setting ("5.50" gives 550), a whole number otherwise, or null. */
function settingNumber(definition, text) {
  if (definition.kind === 'usd') return toMinor(text, 'USD')
  return /^\d{1,7}$/.test(text) ? Number.parseInt(text, 10) : null
}

/** '' is valid only on a nullable key (it clears it); otherwise a value within the key's bounds (in cents for a 'usd' key). */
export function isAfterQuizSettingValid(key, value) {
  const definition = afterQuizSettingDefinition(key)
  if (!definition) return false
  const text = String(value ?? '').trim()
  if (text === '') return definition.nullable
  const number = settingNumber(definition, text)
  return number != null && number >= definition.min && number <= definition.max
}

export function isAfterQuizSettingsReady(state) {
  return AFTER_QUIZ_SETTINGS.every(({ key }) => !state?.include?.[key] || isAfterQuizSettingValid(key, state?.values?.[key]))
}

/** The keys held or typed, each as the API takes it: a JSON integer (US cents for a price), or null to clear it. */
export function afterQuizSettingsPayload(state) {
  const payload = {}
  for (const definition of AFTER_QUIZ_SETTINGS) {
    const { key } = definition
    if (!state?.include?.[key]) continue
    const text = String(state?.values?.[key] ?? '').trim()
    payload[key] = text === '' ? null : settingNumber(definition, text)
  }
  return payload
}

/** The server's 422 lines for each of the five keys, one per line, by key. */
export function afterQuizSettingsFieldErrors(error) {
  const errors = error?.response?.data?.errors
  if (!errors || typeof errors !== 'object') return {}
  const collected = {}
  for (const [field, messages] of Object.entries(errors)) {
    const key = AFTER_QUIZ_SETTING_KEYS.find((candidate) => field === candidate || field.startsWith(`${candidate}.`))
    if (!key) continue
    const lines = [].concat(messages).filter((line) => typeof line === 'string' && line.trim() !== '')
    collected[key] = [...new Set([...(collected[key] || []), ...lines])]
  }
  return Object.fromEntries(Object.entries(collected).map(([key, lines]) => [key, lines.join('\n')]))
}

/*
 * THE WORDING FORM (S11, S12). Each of the four texts is trimmed and required;
 * a title holds at most 200 characters and a body 4000.
 */
export function wordingForm(wording) {
  const read = (value, language) => (value && typeof value === 'object' && typeof value[language] === 'string' ? value[language] : '')
  return {
    title: { ar: read(wording?.title, 'ar'), en: read(wording?.title, 'en') },
    body: { ar: read(wording?.body, 'ar'), en: read(wording?.body, 'en') },
  }
}

export function wordingFormErrors(form) {
  const valid = (text, max) => {
    const length = String(text ?? '').trim().length
    return length > 0 && length <= max
  }
  return {
    'title.ar': valid(form?.title?.ar, AFTER_QUIZ_LIMITS.titleMax) ? '' : 'title',
    'title.en': valid(form?.title?.en, AFTER_QUIZ_LIMITS.titleMax) ? '' : 'title',
    'body.ar': valid(form?.body?.ar, AFTER_QUIZ_LIMITS.bodyMax) ? '' : 'body',
    'body.en': valid(form?.body?.en, AFTER_QUIZ_LIMITS.bodyMax) ? '' : 'body',
  }
}

export function isWordingFormValid(form) {
  return Object.values(wordingFormErrors(form)).every((value) => value === '')
}

export function wordingTexts(form) {
  return {
    title: { ar: String(form.title.ar).trim(), en: String(form.title.en).trim() },
    body: { ar: String(form.body.ar).trim(), en: String(form.body.en).trim() },
  }
}

/** The first characters of a sha256, for display; the full value stays in the title attribute. */
export function shortHash(value) {
  return typeof value === 'string' && value.length > 12 ? `${value.slice(0, 12)}…` : value || '—'
}

/*
 * A CERTIFICATE'S KIND, for the registry's kind column and filter. P6 writes it
 * into snapshot.credential.kind (it survives a reissue, which copies only the
 * credential). A committee-path RPL credential from before P6 says so in its
 * channel; a programme certificate carries its programme.
 */
export const CERTIFICATE_KINDS = Object.freeze(['rpl_experience_confirmation', 'rpl_level', 'program', 'other'])

export function certificateKind(certificate) {
  const kind = certificate?.snapshot?.credential?.kind
  if (kind === 'rpl_experience_confirmation' || kind === 'rpl_level') return kind
  const channel = certificate?.metadata?.channel
  if (channel === 'rpl_experience_confirmation') return 'rpl_experience_confirmation'
  if (channel === 'rpl_final_exam' || channel === 'rpl_approval') return 'rpl_level'
  if (channel === 'program_completion' || certificate?.program_id != null || certificate?.program) return 'program'
  return 'other'
}

export const CERTIFICATE_KIND_LABELS = {
  ar: { rpl_experience_confirmation: 'شهادة تثبيت الخبرة', rpl_level: 'شهادة مستوى RPL', program: 'شهادة برنامج', other: 'أخرى' },
  en: { rpl_experience_confirmation: 'Experience Confirmation Certificate', rpl_level: 'RPL level certificate', program: 'Programme certificate', other: 'Other' },
}

export function certificateKindLabel(kind, language) {
  return CERTIFICATE_KIND_LABELS[language === 'ar' ? 'ar' : 'en'][kind] || kind || ''
}

/** A name from the staff payload ({id, name}), or "a staff member". */
export function personName(person, language) {
  return person?.name || afterQuizCopy(language).common.someone
}

/** A programme's title in the screen language, else its official code. */
export function programTitle(program, language) {
  return localize(program?.title, language) || program?.official_code || (program?.id != null ? `#${program.id}` : '—')
}

/** A try that was referred and not yet voided: the only one staff void (S15). */
export function isVoidableTry(attempt) {
  return attempt?.result === 'referred' && attempt?.status !== 'cancelled'
}

/** An opened try the platform has not marked: the only one staff reopen after a technical failure (S16). */
export function isReopenableTry(attempt) {
  return attempt?.status === 'issued' && Boolean(attempt?.opened_at) && !attempt?.quiz_scored_at
}
