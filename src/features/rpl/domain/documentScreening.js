import { getLocaleForLanguage } from '../../../utils/localization'

/*
 * DOCUMENT SCREENING (owner flow of 12 Oct 2026, plan 4.3 and 5.1-5.3, P2).
 *
 * An advisory AI screen of a case's documents, plus an online presence check of
 * the employers the applicant named. What staff see here, and what they must
 * never be led to believe:
 *
 *   - ONE figure (D1(a)): the case percentage is the server's figure, and the
 *     /10 is that percentage divided by ten. Shown as "authenticity risk", never
 *     as a verdict. Only a COMPLETED run has a figure; a refused or failed run
 *     shows why, never a percentage and never a zero.
 *   - The server's figure (owner report of 18 Oct 2026, rpl-risk-v1): each
 *     document's model reading combined with the platform's identity signals (a
 *     generic or unnamed issuer or employer, missing issuer details on an
 *     experience letter), each signal raising what is left; the case the highest
 *     document, combined the same way with the case-level signals. Such a run
 *     carries risk_breakdown, and the panel shows its band and how the figure was
 *     reached. A run on older instructions (rpl-screen-v1, v2) keeps the figure
 *     it stored, the maximum of the model's readings, and renders as it always
 *     did; the platform never recomputes it.
 *   - A document that was not read is "not screened". Having no figure says
 *     nothing about it.
 *   - Identity documents are read for names and dates only (D20(c)) and never
 *     carry a figure.
 *   - "Not found online" never means "does not exist". "Cannot be identified"
 *     means the name singles out no organisation: the claim is unverified,
 *     never that the organisation does not exist.
 *   - Confidence in the claim is the platform's reading of the employer search,
 *     never above Medium: an employer online does not show employment. The
 *     model's own confidence is in its classification, and stays in the details.
 *   - Only administrators and evidence reviewers see any of it (D17(a)); the
 *     applicant never does.
 *
 * Arabic and English only (owner, 13 Oct 2026). Every lookup falls back to
 * English, so any other value renders English rather than "undefined".
 */

export const SCREENING_PERMISSIONS = Object.freeze({ view: 'rpl.screening.view', run: 'rpl.screening.run' })

/** The five settings on GET/PUT /admin/rpl/settings, in the order the form shows them. */
export const SCREENING_SETTING_KEYS = Object.freeze([
  'rpl_document_screening_enabled',
  'rpl_document_screening_web_search_enabled',
  'rpl_document_screening_model',
  'rpl_document_screening_excluded_categories',
  'rpl_document_screening_extraction_only_categories',
])

export const SCREENING_MODEL_MAX_LENGTH = 100

export const SCREENING_COPY = {
  ar: {
    tab: 'فرز الوثائق',
    title: 'فرز الوثائق',
    disclaimer: 'استشاري فقط. مؤشر خطر الأصالة مؤشر من الذكاء الاصطناعي يساعد الموظفين على تحديد ما يستحق التدقيق. ليس حكمًا على العميل، ولا يغيّر حالة أي دليل، ولا ينقل الطلب. القرار للموظفين.',
    audience: 'يظهر للمديرين ومراجعي الأدلة فقط، ولا يظهر للعميل أو المقيّمين أو اللجنة، ولا يُضمَّن في التصدير.',
    refresh: 'تحديث',
    loading: 'جارٍ تحميل فرز الوثائق…',
    loadError: 'تعذّر تحميل فرز الوثائق.',
    retry: 'إعادة المحاولة',
    empty: 'لم يُشغَّل أي فرز على هذا الطلب بعد. يعمل تلقائيًا مرة واحدة عند تقديم الطلب.',
    figure: 'مؤشر خطر الأصالة {percent}٪ ({score}/10)',
    figureNoScore: 'مؤشر خطر الأصالة {percent}٪',
    documentPercent: '{percent}٪',
    partial: 'فرز جزئي',
    partialHint: 'لم تُفحص بعض الوثائق، فالمؤشر يغطي الوثائق المفحوصة فقط.',
    coverage: 'قُرئت {read} من {total|وثيقة واحدة|وثيقتين|وثائق|وثيقة}.',
    completedNoFigure: 'اكتمل دون مؤشر: لم تُقيَّم أي وثيقة يمكن أن تحمل مؤشرًا (انظر «لم تُفحص» أدناه). وثائق الفئات المخصصة للاتساق، كالهوية، لا تحمل مؤشرًا أبدًا.',
    statusLabel: 'الحالة',
    trigger: 'سبب التشغيل',
    triggerAuto: 'تلقائي عند التقديم',
    triggerStaff: 'أُعيد تشغيله بواسطة {name}',
    someone: 'أحد الموظفين',
    model: 'النموذج',
    modelAnswered: '{requested}، وأجاب {responding}',
    promptVersion: 'نسخة التعليمات',
    requestedAt: 'وقت الطلب',
    completedAt: 'وقت الاكتمال',
    webSearch: 'البحث عن جهات العمل على الإنترنت',
    webSearchUsed: 'استُخدم',
    webSearchNotUsed: 'لم يُستخدم',
    staleTitle: 'تغيّرت الأدلة بعد تشغيل هذا الفرز',
    staleBody: 'يصف المؤشر الوثائق كما كانت حينها. لا يُعاد تشغيله تلقائيًا؛ اضغط «إعادة تشغيل الفرز» لفرز الأدلة الحالية.',
    staleSince: 'منذ {since}',
    acknowledge: 'تسجيل الاطلاع',
    acknowledgeHint: 'يسجّل أنك اطّلعت على هذا الفرز، ولا يغيّر شيئًا في الطلب.',
    acknowledged: 'اطّلع عليه {name} في {at}',
    acknowledgedDone: 'تم تسجيل الاطلاع.',
    rerun: 'إعادة تشغيل الفرز',
    rerunHint: 'خمسة تشغيلات كحد أقصى لكل طلب في اليوم.',
    rerunBusy: 'يوجد فرز في الانتظار أو قيد التنفيذ.',
    rerunStalled: 'توقف آخر تشغيل منذ أكثر من {minutes} دقيقة. إعادة التشغيل تغلقه بوصفه فاشلًا وتضيف تشغيلًا جديدًا إلى قائمة الانتظار.',
    rerunQueued: 'أُضيف فرز جديد إلى قائمة الانتظار.',
    rerunRefused: 'رُفض التشغيل الجديد؛ السبب موضح أدناه.',
    rerunLimited: 'بلغ هذا الطلب الحد الأقصى لإعادة تشغيل الفرز.',
    rerunFailed: 'تعذّر طلب فرز جديد.',
    acknowledgeFailed: 'تعذّر تسجيل الاطلاع.',
    instructionsTitle: 'نص في الوثائق موجّه إلى الذكاء الاصطناعي',
    instructionsHint: 'تجاهل الفرز هذه النصوص بوصفها تعليمات، وتُعرض ليرى الموظفون ما حاولت الوثيقة قوله للنموذج.',
    excludedCategories: 'فئات مستبعدة من القراءة',
    extractionOnlyCategories: 'فئات تُقرأ للاتساق فقط (دون مؤشر)',
    documentsTitle: 'الوثائق',
    columnDocument: 'الوثيقة',
    columnRead: 'القراءة',
    columnFigure: 'مؤشر خطر الأصالة',
    columnConfidence: 'درجة الثقة',
    // rpl-risk-v1: beside the combined figure, the model's confidence is in its own reading only.
    columnModelConfidence: 'ثقة النموذج في قراءته',
    columnConsistency: 'الاتساق مع الادعاء',
    flags: 'ما رصده الفرز',
    signals: 'فحوص المنصة (دون ذكاء اصطناعي)',
    caseSignalsTitle: 'فحوص المنصة على فترات العمل المصرّح بها (دون ذكاء اصطناعي)',
    caseSignalsHint: 'محسوبة من الخبرات التي صرّح بها العميل عند تقديم الطلب، وأُرسلت إلى الفرز رموزًا فقط. تُعرض بجانب المؤشر ولا تدخل فيه.',
    caseSignalCodes: {
      employment_concurrent_overlap: 'وظائف كثيرة مصرّح بها في الوقت نفسه',
      employment_starts_in_the_future: 'وظيفة تبدأ بعد تاريخ تقديم الطلب',
      employment_ends_before_it_starts: 'وظيفة تنتهي قبل أن تبدأ',
    },
    extracted: 'البيانات المستخرجة',
    rationale: 'التعليل',
    page: 'صفحة {page}',
    extractionOnly: 'استخراج وفحص اتساق فقط، دون مؤشر',
    noDocuments: 'لا توجد وثائق في هذا التشغيل.',
    untitled: 'دليل بلا عنوان',
    notScreenedTitle: 'لم تُفحص ({count})',
    notScreenedHint: 'لم تُفحص هذه الوثائق في هذا التشغيل: بعضها لم يُرسل، وبعضها أُرسل ولم يُقيَّم. لا مؤشر لها، وغيابه لا يعني شيئًا عنها.',
    employersTitle: 'فحص جهات العمل',
    employersHint: 'بُحث عن كل جهة عمل على الإنترنت بالاسم والموقع فقط، دون إرسال أي وثيقة أو بيانات شخصية. العثور على الجهة على الإنترنت لا يؤكد أن العميل عمل فيها.',
    employersNone: 'لم تُفحص أي جهة عمل في هذا التشغيل.',
    columnEmployer: 'جهة العمل',
    columnLocation: 'الموقع',
    columnResult: 'النتيجة',
    columnMethod: 'الطريقة',
    columnSources: 'المصادر',
    searchQueries: 'عمليات البحث المنفذة',
    searchSuggestions: 'اقتراحات بحث Google',
    noSources: 'لا مصادر',
    history: 'التشغيلات',
    latest: 'الأحدث',
    yes: 'نعم',
    no: 'لا',
    status: { queued: 'في الانتظار', running: 'قيد التنفيذ', completed: 'مكتمل', failed: 'فشل', refused: 'لم يُنفَّذ' },
    statusExplanation: {
      queued: 'في الانتظار. يعمل الفرز في الخلفية وينتهي عادةً خلال دقائق. حدّث الصفحة لرؤية النتيجة.',
      running: 'قيد التنفيذ الآن. حدّث الصفحة بعد دقيقة لرؤية النتيجة.',
      failed: 'توقف هذا التشغيل قبل أن ينتج نتيجة، فلا مؤشر له، ولا يقول شيئًا عن الوثائق. أعد تشغيله.',
      stalled: 'متوقف: هذا التشغيل في الانتظار، أو في محاولته الحالية، منذ أكثر من {minutes} دقيقة. قد يكون عامل الفرز على الخادم متوقفًا أو منشغلًا بتشغيلات أخرى. لا مؤشر له. أعد التشغيل لاستبداله، وأبلغ المسؤول التقني إن تكرر ذلك.',
    },
    refusal: {
      screening_disabled: 'لم يُنفَّذ: فرز الوثائق موقوف في ضوابط RPL. لا يوجد مؤشر، وغيابه لا يعني شيئًا عن الوثائق.',
      reading_disabled: 'لم يُنفَّذ: إرسال ملفات العميل إلى Gemini موقوف، فلم يستطع الفرز قراءة أي شيء. لا يوجد مؤشر، وغيابه لا يعني شيئًا عن الوثائق.',
      declaration_predates_screening: 'لم يُنفَّذ: قُدِّم هذا الطلب بموجب إقرار أقدم من النسخة 2، ولم يكن ذلك الإقرار يُعلم العميل بفرز الوثائق. يقرر الموظفون هذا الطلب دونه.',
      nothing_readable: 'لم يُنفَّذ: في الطلب ملفات، لكن لا يوجد بينها ملف بصيغة أو حجم يستطيع الفرز قراءته. لا يوجد مؤشر، وغيابه لا يعني شيئًا عن الوثائق.',
      provider_error: 'لم يُنفَّذ: لم يستجب مزوّد الذكاء الاصطناعي. لا يوجد مؤشر. أعد التشغيل لاحقًا.',
      // No Gemini key on the server (UI-14): a re-run cannot work until it is configured, and none was spent.
      provider_not_configured: 'لم يُنفَّذ: Gemini غير مُعَدّ على الخادم (لا يوجد مفتاح). لا يوجد مؤشر، ولن تنجح إعادة التشغيل قبل أن يُعِدّه مسؤول الخادم. لم يُحتسب هذا التشغيل من الحد اليومي.',
      unknown: 'لم يُنفَّذ ({code}). لا يوجد مؤشر.',
    },
    staleReasons: {
      evidence_added: 'أُضيف دليل',
      evidence_removed: 'حُذف دليل',
      evidence_edited: 'عدّل العميل دليلًا',
      evidence_corrected_by_staff: 'صحّح أحد الموظفين بيانات دليل',
    },
    readStatus: { read: 'مقروءة', withheld: 'لم تُفحص', excluded: 'لم تُفحص (فئة مستبعدة)' },
    withheldReasons: {
      no_uploaded_file: 'لا يوجد ملف مرفوع (رابط خارجي أو إقرار فقط)',
      unsupported_format: 'الصيغة غير قابلة للقراءة',
      file_too_large: 'الملف يتجاوز الحد الأقصى لحجم المستند الواحد (4 ميغابايت)',
      document_limit_reached: 'بلغ التشغيل الحد الأقصى لعدد المستندات',
      request_size_limit_reached: 'بلغ التشغيل الحد الأقصى لحجمه الكلي',
      file_unreadable: 'تعذّرت قراءة الملف المخزَّن',
      category_excluded: 'الفئة مستبعدة في ضوابط الفرز',
      docx_text_not_extractable: 'تعذّر استخراج نص ملف Word',
      not_read: 'لم يقرأ الفرز هذا الملف',
      not_assessed_by_model: 'أُرسلت إلى النموذج، لكن رده لم يتضمن تقييمًا لها',
      not_assessable: 'أُرسلت إلى النموذج، وأفاد بأنه لا يستطيع فحصها (السبب في التعليل)',
      no_supported_figure: 'أُرسلت وفُحصت، لكن الرد لم يتضمن نسبة تستند إلى ملاحظة مرصودة، فلم يُحتفظ بنسبة',
      run_failed: 'توقف التشغيل قبل أن ينتج نتيجة',
      screening_disabled: 'لم يُنفَّذ التشغيل: فرز الوثائق موقوف',
      reading_disabled: 'لم يُنفَّذ التشغيل: إرسال ملفات العميل إلى Gemini موقوف',
      declaration_predates_screening: 'لم يُنفَّذ التشغيل: الطلب مقدَّم بموجب إقرار أقدم من النسخة 2',
      nothing_readable: 'لم يُنفَّذ التشغيل: لا يوجد ملف قابل للقراءة',
      provider_error: 'لم يُنفَّذ التشغيل: لم يستجب مزوّد الذكاء الاصطناعي بنتيجة قابلة للحفظ',
      provider_not_configured: 'لم يُنفَّذ التشغيل: Gemini غير مُعَدّ على الخادم',
    },
    confidence: { low: 'منخفضة', medium: 'متوسطة', high: 'مرتفعة' },
    consistency: { consistent: 'متسق', inconsistent: 'غير متسق', unclear: 'غير واضح' },
    severity: { hard: 'إشارة حاسمة', indicator: 'إشارة للانتباه' },
    flagCodes: {
      date_inconsistency: 'تواريخ غير متسقة',
      name_mismatch: 'اختلاف الاسم بين الوثائق',
      issuer_mismatch: 'جهة الإصدار تختلف عن الادعاء',
      template_anomaly: 'تنسيق غير معتاد لهذا النوع من الوثائق',
      visual_edit_suspected: 'احتمال تعديل بصري',
      missing_expected_element: 'عنصر متوقع غير موجود',
      low_quality_unassessable: 'الجودة لا تسمح بالتقييم',
      duplicate_content: 'محتوى مكرر من وثيقة أخرى',
      implausible_timeline: 'تسلسل زمني غير معقول',
      claim_mismatch: 'يختلف عن ادعاء العميل',
      embedded_instructions: 'يحتوي نصًا موجّهًا إلى الذكاء الاصطناعي',
    },
    extractionOnlyFlagDetails: {
      name_mismatch: 'يختلف اسم في هذه الوثيقة عن اسم في وثيقة أخرى أو في ادعاءات العميل؛ قارن الاسم المستخرج.',
      date_inconsistency: 'يختلف تاريخ في هذه الوثيقة عن تاريخ في وثيقة أخرى أو في ادعاءات العميل؛ قارن التواريخ المستخرجة.',
      embedded_instructions: 'تحتوي هذه الوثيقة نصًا موجّهًا إلى الفرز، وهو مدرج ضمن النصوص الموجّهة إلى الذكاء الاصطناعي في الوثائق.',
    },
    extractedFields: {
      holder_name: 'صاحب الوثيقة',
      issuer: 'جهة الإصدار',
      issue_date: 'تاريخ الإصدار',
      document_number: 'رقم الوثيقة',
      employer_names: 'جهات العمل المذكورة',
      job_titles: 'المسميات الوظيفية',
      period: 'الفترة',
    },
    employerResult: {
      found_consistent: 'عُثر عليها على الإنترنت، ومتسقة مع الادعاء',
      found_inconsistent: 'عُثر عليها على الإنترنت، لكن التفاصيل تختلف عن الادعاء',
      not_found_online: 'لم يُعثر على حضور عام لها على الإنترنت. هذا لا يعني أن الجهة غير موجودة.',
      not_identifiable: 'لا يمكن تحديد هويتها: اسمها لا يميّز منشأة واحدة عن غيرها، فلا يمكن التحقق من الادعاء. تعامل معه بوصفه غير مُتحقَّق منه.',
      ambiguous: 'غير حاسم: تعذّرت مطابقة النتائج بثقة',
      not_checked: 'لم تُفحص',
    },
    employerMethod: {
      web_search: 'بحث Google',
      url_context: 'موقع الجهة',
      model_knowledge: 'معرفة النموذج فقط (دون بحث)',
      none: 'دون فحص',
    },
    claimSource: { profile: 'مصرّح بها في الملف', evidence: 'مذكورة في وثيقة' },
    employerFlags: {
      privacy_query_breach: 'تضمّن أحد استعلامات البحث جزءًا من اسم العميل. أبلغ مسؤول حماية البيانات.',
      ungrounded_sources_dropped: 'حُذفت مصادر ذكرها النموذج لأن البحث لم يُرجعها؛ المصادر المعروضة هي ما أرجعه البحث فقط.',
      sources_unattributable: 'لم تُعرض صفحات موقع ذكره النموذج: أرجع البحث صفحات من هذا الموقع، لكن لم يمكن ربط أي منها بهذه الجهة دون غيرها.',
      result_capped_without_grounded_source: 'خُفّضت النتيجة إلى «غير حاسم»: قال النموذج إنه عثر على الجهة، لكن البحث لم يُرجع أي مصدر يدعم ذلك.',
      result_capped_without_search: 'خُفّضت النتيجة إلى «غير حاسم»: لم يُنفَّذ أي بحث، فلا يمكن القول إن الجهة غير موجودة على الإنترنت.',
      employer_search_failed: 'تعذّر إكمال البحث عن هذه الجهة، فلم يُعثر على شيء ولم يُستنتج شيء. افحصها يدويًا.',
      not_searched_names_applicant: 'لم يُبحث عنها: اسم الجهة يتضمن اسم العميل أو بيانات التواصل معه، ولا يُرسل البحث أي بيانات عن العميل. افحصها يدويًا.',
      website_not_sent_names_applicant: 'لم يُرسل الموقع الإلكتروني لأنه يتضمن اسم العميل؛ بُحث عنها بالاسم والموقع فقط.',
      name_generic_platform_check: 'وجد فحص المنصة للكلمات (دون ذكاء اصطناعي) أن الاسم كلمات نشاط وشكل قانوني فقط.',
      result_set_by_generic_name_rule: 'صنّف البحث هذه الجهة تصنيفًا آخر، لكن المنصة اعتمدت «لا يمكن تحديد هويتها» لأن فحصها للكلمات وجد أن اسمها لا يميّز منشأة بعينها.',
      name_not_identifiable_document_reading: 'رأت قراءة الوثائق أن هذا الاسم لا يحدد منشأة بعينها.',
      generic_name_found_by_search: 'قال البحث إنه عثر على هذه الجهة، وربط بها الصفحات المعروضة في المصادر. اعتمدت المنصة «لا يمكن تحديد هويتها» لأن الاسم كلمات نشاط وشكل قانوني فقط. افتح الصفحات: إن كانت صفحات هذه الجهة نفسها فالاسم يحدّدها، والقرار للموظفين.',
      name_not_identifiable_search_only: 'رأى البحث وحده أن هذا الاسم لا يحدد منشأة بعينها؛ لم يجد فحص المنصة للكلمات ذلك، ولم تره قراءة الوثائق كذلك. قارنه بالوثائق قبل الاعتماد عليه.',
    },

    // Owner report of 18 Oct 2026 (rpl-risk-v1): shown only on a run that carries risk_breakdown.
    listSeparator: '، ',
    employersHintIdentity: 'الاسم الذي يجده فحص المنصة للكلمات عامًّا يُسجَّل «لا يمكن تحديد هويتها» مهما أرجع البحث. والاسم الذي رأت قراءة الوثائق أو البحث وحده أنه لا يحدد منشأة بعينها يبقى بنتيجة البحث مع إشارة توضّح ذلك. وفي الحالتين تكون الثقة بالادعاء «منخفضة».',
    columnClaimConfidence: 'الثقة بالادعاء',
    claimConfidence: { medium: 'متوسطة', undetermined: 'غير محسومة', low: 'منخفضة' },
    claimConfidenceHint: 'الثقة بالادعاء تقدير المنصة لما يعنيه البحث للادعاء نفسه، ولا ترتفع فوق «متوسطة» أبدًا: وجود الجهة على الإنترنت لا يثبت أن العميل عمل فيها.',
    modelConfidence: 'ثقة النموذج في هذا التصنيف: {value}',
    sourcesNotThisEmployer: 'صفحات أرجعها البحث، ولا تخص هذه الجهة تحديدًا:',
    namedIn: 'مذكورة في: {documents}',
    riskBand: { none: 'لا مؤشر خطر', low: 'منخفض', attention: 'يستحق الانتباه', high: 'انتباه مرتفع', very_high: 'انتباه مرتفع جدًا' },
    riskNone: 'لم يُرصد مؤشر خطر في الوثائق المقروءة. هذا لا يعني أنها تحققت؛ القرار للموظفين.',
    riskHeadlineReason: 'أكثر ما رفع المؤشر: {reason}',
    riskHeadlineModel: 'قراءة النموذج لـ«{document}»: {percent}٪',
    olderRules: 'شُغّل هذا الفرز بنسخة تعليمات أقدم ({version}) لا تفحص هوية جهة الإصدار ولا بيانات خطابات الخبرة. أعد تشغيل الفرز لتطبيق الفحص الحالي.',
    riskTitle: 'كيف حُسب المؤشر',
    riskCombination: 'يُحسب مؤشر كل وثيقة من قراءة النموذج وإشارات المنصة معًا: كل إشارة ترفع ما تبقّى، فلا يتجاوز المجموع 100٪. مؤشر الطلب أعلى مؤشر وثيقة، وتُضاف إليه إشارات الطلب بالطريقة نفسها.',
    riskModelPart: 'قراءة النموذج للوثيقة: {percent}٪',
    riskModelDropped: 'لم يُحتفظ بنسبة النموذج لهذه الوثيقة لأنها لم تستند إلى ملاحظة مرصودة؛ مؤشرها من إشارات المنصة وحدها.',
    riskDocumentFigure: 'مؤشر الوثيقة: {percent}٪',
    riskWeight: 'وزنها {weight}٪: لو كانت وحدها لكان مؤشر الوثيقة {weight}٪.',
    riskCaseWeight: 'وزنها {weight}٪ على مستوى الطلب.',
    riskSources: 'رصدها: {sources}',
    riskSource: { platform_word_check: 'فحص المنصة للكلمات (دون ذكاء اصطناعي)', document_reading: 'قراءة الوثائق', employer_search: 'البحث عن جهة العمل' },
    riskCaseComponentsTitle: 'إشارات على مستوى الطلب',
    riskCaseLine: 'مؤشر الطلب: أعلى مؤشر وثيقة ({max}٪){withCase}، أي {percent}٪.',
    riskCaseLineWith: '، مع إشارات الطلب',
    riskNoteDetailsNotReported: 'لم تُرجع قراءة الوثيقة بيانات جهة الإصدار، فلم تُفحص.',
    riskCaseNoFigure: 'لا مؤشر للطلب لأنه لم تُقيَّم أي وثيقة تحمل مؤشرًا؛ إشارات الطلب معروضة للاطلاع.',
    riskComponents: {
      organisation_name_generic: {
        title: 'اسم الجهة لا يحدد منشأة بعينها',
        reason: '«{names}» في «{document}» لا يميّز منشأة واحدة عن غيرها، فلا يمكن معرفة الجهة ولا التحقق مما تشهد به الوثيقة. تعامل معه بوصفه غير مُتحقَّق منه.',
      },
      issuer_not_named: {
        title: 'الخطاب لا يذكر الجهة التي أصدرته',
        reason: 'لا يظهر في «{document}» اسم أي جهة، فلا يمكن معرفة من أصدره ولا التحقق منه.',
      },
      issuer_details_missing: {
        title: 'بيانات جهة الإصدار ناقصة',
        reason: 'الناقص: {missing}.',
      },
      claimed_employer_name_generic: {
        title: 'جهة عمل مصرّح بها لا يحدد اسمها منشأة بعينها',
        reason: '«{names}» لا يميّز منشأة واحدة، ولا تحمل أي وثيقة مقروءة ما يعرّف بها. الادعاء غير مُتحقَّق منه.',
      },
    },
    riskDetailsLevel: {
      several: 'تنقص {count} من 9 بيانات تعرّف بجهة الإصدار، لكن في الخطاب وسيلة للتواصل معها أو التحقق منها.',
      most: 'تنقص {count} من 9 بيانات تعرّف بجهة الإصدار، ولا يبقى إلا القليل للتواصل معها أو التحقق منها.',
      no_contact_route: 'لا رقم سجل ولا عنوان ولا هاتف أو بريد أو موقع: لا سبيل للتواصل مع جهة الإصدار أو التحقق منها ({count} من 9 ناقصة).',
      nearly_all: 'لا يكاد الخطاب يحمل ما يعرّف بجهة الإصدار: لا سبيل للتواصل معها أو التحقق منها، و{count} من 9 بيانات ناقصة.',
    },
    issuerChecklist: {
      registration_number: 'رقم السجل التجاري أو الترخيص',
      address: 'العنوان',
      contact: 'هاتف أو بريد إلكتروني أو موقع',
      signatory_name: 'اسم الموقّع',
      signatory_title: 'صفة الموقّع',
      signature: 'التوقيع',
      stamp_or_seal: 'الختم',
      letterhead: 'الترويسة',
      issue_date: 'تاريخ الإصدار',
    },
    issuerTitle: 'بيانات جهة الإصدار كما في الوثيقة',
    issuerFields: {
      legal_name: 'الاسم الكامل للجهة',
      registration_number: 'رقم السجل أو الترخيص',
      address: 'العنوان',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      website: 'الموقع الإلكتروني',
      signatory_name: 'اسم الموقّع',
      signatory_title: 'صفة الموقّع',
      signature: 'التوقيع',
      stamp_or_seal: 'الختم',
      letterhead: 'الترويسة',
    },
    presence: { present: 'موجود', absent: 'غير موجود', unclear: 'غير واضح' },
    notShown: 'لا يظهر',
    issuerIdentifiable: { yes: 'الاسم يحدد منشأة بعينها', no: 'الاسم لا يحدد منشأة بعينها', unclear: 'تعذّر الحكم على الاسم' },
  },
  en: {
    tab: 'Screening',
    title: 'Document screening',
    disclaimer: 'Advisory only. The authenticity risk figure is an AI indicator to help staff decide where to look. It is not a finding about the applicant, it never changes an evidence status and it never moves the case. Staff decide.',
    audience: 'Visible to administrators and evidence reviewers only. Never shown to the applicant, assessors or the committee, and left out of exports.',
    refresh: 'Refresh',
    loading: 'Loading the document screening…',
    loadError: 'Unable to load the document screening.',
    retry: 'Try again',
    empty: 'No screen has run on this case yet. It runs once automatically when the case is submitted.',
    figure: 'Authenticity risk {percent}% ({score}/10)',
    figureNoScore: 'Authenticity risk {percent}%',
    documentPercent: '{percent}%',
    partial: 'Partial screen',
    partialHint: 'Some documents were not screened, so the figure covers only the documents that were.',
    coverage: 'Read {read} of {total|document|documents}.',
    completedNoFigure: 'Completed without a figure: no document that can carry one was assessed (see "Not screened" below). Consistency-only categories such as identity never carry a figure.',
    statusLabel: 'Status',
    trigger: 'Started',
    triggerAuto: 'Automatically, at submission',
    triggerStaff: 'Re-run by {name}',
    someone: 'a staff member',
    model: 'Model',
    modelAnswered: '{requested}, answered by {responding}',
    promptVersion: 'Prompt version',
    requestedAt: 'Requested',
    completedAt: 'Completed',
    webSearch: 'Online employer check',
    webSearchUsed: 'Used',
    webSearchNotUsed: 'Not used',
    staleTitle: 'Evidence changed after this screen ran',
    staleBody: 'The figure describes the documents as they were then. It is not re-run automatically; press "Re-run screen" to screen the current evidence.',
    staleSince: 'Since {since}',
    acknowledge: 'Acknowledge',
    acknowledgeHint: 'Records that you have read this screen. It changes nothing on the case.',
    acknowledged: 'Acknowledged by {name} on {at}',
    acknowledgedDone: 'Acknowledged.',
    rerun: 'Re-run screen',
    rerunHint: 'At most 5 runs per case per day.',
    rerunBusy: 'A screen is already queued or running.',
    rerunStalled: 'The latest run has been stuck for more than {minutes} minutes. Re-running closes it as failed and queues a new one.',
    rerunQueued: 'A new screen is queued.',
    rerunRefused: 'The new run was refused; the reason is shown below.',
    rerunLimited: 'The re-run limit for this case has been reached.',
    rerunFailed: 'A new screen could not be requested.',
    acknowledgeFailed: 'The acknowledgement could not be recorded.',
    instructionsTitle: 'Text in the documents addressed to the AI',
    instructionsHint: 'The screen ignored these as instructions. They are shown so staff can see what a document tried to tell the model.',
    excludedCategories: 'Categories excluded from reading',
    extractionOnlyCategories: 'Categories read for consistency only (no figure)',
    documentsTitle: 'Documents',
    columnDocument: 'Document',
    columnRead: 'Read',
    columnFigure: 'Authenticity risk',
    columnConfidence: 'Confidence',
    // rpl-risk-v1: beside the combined figure, the model's confidence is in its own reading only.
    columnModelConfidence: "Model's confidence in its reading",
    columnConsistency: 'Consistency with the claim',
    flags: 'What the screen noticed',
    signals: 'Platform checks (no AI)',
    caseSignalsTitle: 'Platform checks on the claimed employment periods (no AI)',
    caseSignalsHint: 'Computed from the experience the applicant claimed at submission and sent to the screen as codes only. Shown beside the figure, never blended into it.',
    caseSignalCodes: {
      employment_concurrent_overlap: 'Too many positions claimed at the same time',
      employment_starts_in_the_future: 'A position starts after the claim was made',
      employment_ends_before_it_starts: 'A position ends before it starts',
    },
    extracted: 'Extracted',
    rationale: 'Rationale',
    page: 'page {page}',
    extractionOnly: 'Extraction and consistency only, no figure',
    noDocuments: 'This run has no documents.',
    untitled: 'untitled evidence',
    notScreenedTitle: 'Not screened ({count})',
    notScreenedHint: 'These documents were not screened in this run: some were never sent, and some were sent but not assessed. They have no figure, and having none says nothing about them.',
    employersTitle: 'Employer checks',
    employersHint: 'Each employer was looked up online by name and location only: no documents and no personal details were sent. Finding a company online does not confirm that the applicant worked there.',
    employersNone: 'No employer was checked in this run.',
    columnEmployer: 'Employer',
    columnLocation: 'Location',
    columnResult: 'Result',
    columnMethod: 'Method',
    columnSources: 'Sources',
    searchQueries: 'Searches run',
    searchSuggestions: 'Google Search suggestions',
    noSources: 'No sources',
    history: 'Runs',
    latest: 'Latest',
    yes: 'Yes',
    no: 'No',
    status: { queued: 'Queued', running: 'Running', completed: 'Completed', failed: 'Failed', refused: 'Not run' },
    statusExplanation: {
      queued: 'Queued. The screen runs in the background and usually finishes within a few minutes. Refresh to see the result.',
      running: 'Running now. Refresh in a minute to see the result.',
      failed: 'This run stopped before producing a result, so it has no figure and says nothing about the documents. Re-run it.',
      stalled: 'Stuck: this run has been queued, or on its current attempt, for more than {minutes} minutes. The screening worker on the server may be stopped or backed up. It has no figure. Re-run to replace it, and tell the technical administrator if it happens again.',
    },
    refusal: {
      screening_disabled: 'Not run: document screening is switched off in the RPL controls. No figure exists, and its absence says nothing about the documents.',
      reading_disabled: 'Not run: sending applicant documents to Gemini is switched off, so the screen could not read anything. No figure exists, and its absence says nothing about the documents.',
      declaration_predates_screening: 'Not run: this case was submitted under a declaration older than version 2, which did not tell the applicant about document screening. Staff decide this case without it.',
      nothing_readable: 'Not run: the case has files, but none is in a format or size the screen can read. No figure exists, and its absence says nothing about the documents.',
      provider_error: 'Not run: the AI provider did not answer. No figure exists. Re-run it later.',
      provider_not_configured: 'Not run: Gemini is not configured on the server (no key). No figure exists, and a re-run cannot succeed until the server is configured. This run did not count against the daily limit.',
      unknown: 'Not run ({code}). No figure exists.',
    },
    staleReasons: {
      evidence_added: 'evidence was added',
      evidence_removed: 'evidence was removed',
      evidence_edited: 'the applicant edited evidence',
      evidence_corrected_by_staff: 'a staff member corrected evidence details',
    },
    readStatus: { read: 'Read', withheld: 'Not screened', excluded: 'Not screened (category excluded)' },
    withheldReasons: {
      no_uploaded_file: 'no file was uploaded (external link or declaration only)',
      unsupported_format: 'the format cannot be read',
      file_too_large: 'the file is over the 4 MB per-document limit',
      document_limit_reached: 'the per-run document limit was reached',
      request_size_limit_reached: 'the total size limit for one run was reached',
      file_unreadable: 'the stored file could not be read',
      category_excluded: 'the category is excluded in the screening controls',
      docx_text_not_extractable: 'the text of the Word file could not be extracted',
      not_read: 'the screen did not read this file',
      not_assessed_by_model: 'sent to the model, but its reply held no assessment of it',
      not_assessable: 'sent to the model, which said it could not examine it (the reason is in the rationale)',
      no_supported_figure: 'sent and examined, but the reply gave no percentage resting on an observed flag, so none was kept',
      run_failed: 'the run stopped before producing a result',
      screening_disabled: 'the run was not carried out: document screening is switched off',
      reading_disabled: 'the run was not carried out: sending applicant documents to Gemini is switched off',
      declaration_predates_screening: 'the run was not carried out: the case was submitted under a declaration older than version 2',
      nothing_readable: 'the run was not carried out: no file could be read',
      provider_error: 'the run was not carried out: the AI provider gave no answer that could be stored',
      provider_not_configured: 'the run was not carried out: Gemini is not configured on the server',
    },
    confidence: { low: 'Low', medium: 'Medium', high: 'High' },
    consistency: { consistent: 'Consistent', inconsistent: 'Inconsistent', unclear: 'Unclear' },
    severity: { hard: 'Hard signal', indicator: 'Indicator' },
    flagCodes: {
      date_inconsistency: 'Dates do not agree',
      name_mismatch: 'Name differs between documents',
      issuer_mismatch: 'Issuer differs from the claim',
      template_anomaly: 'Unusual layout for this kind of document',
      visual_edit_suspected: 'Possible visual editing',
      missing_expected_element: 'An expected element is missing',
      low_quality_unassessable: 'Quality too low to assess',
      duplicate_content: 'Content repeats another document',
      implausible_timeline: 'Implausible timeline',
      claim_mismatch: "Differs from the applicant's claim",
      embedded_instructions: 'Contains text addressed to the AI',
    },
    // GeminiRplDocumentScreeningService::EXTRACTION_ONLY_FLAG_DETAILS, word for word.
    extractionOnlyFlagDetails: {
      name_mismatch: 'A name on this document differs from a name on another document or in the claims; compare the extracted name.',
      date_inconsistency: 'A date on this document differs from a date on another document or in the claims; compare the extracted dates.',
      embedded_instructions: 'This document carries text addressed to the screen; it is listed under the instructions found in documents.',
    },
    extractedFields: {
      holder_name: 'Holder',
      issuer: 'Issuer',
      issue_date: 'Issue date',
      document_number: 'Document number',
      employer_names: 'Employers named',
      job_titles: 'Job titles',
      period: 'Period',
    },
    employerResult: {
      found_consistent: 'Found online, consistent with the claim',
      found_inconsistent: 'Found online, but details differ from the claim',
      not_found_online: 'No public online presence found. This does not mean the company does not exist.',
      not_identifiable: 'Cannot be identified: the name does not single out any one organisation, so the claim cannot be verified. Treat it as unverified.',
      ambiguous: 'Ambiguous: the results could not be matched with confidence',
      not_checked: 'Not checked',
    },
    employerMethod: {
      web_search: 'Google Search',
      url_context: "The company's website",
      model_knowledge: 'Model knowledge only (no search)',
      none: 'Not checked',
    },
    claimSource: { profile: 'Declared in the profile', evidence: 'Named in a document' },
    employerFlags: {
      privacy_query_breach: "A search query contained part of the applicant's name. Report this to the data-protection lead.",
      ungrounded_sources_dropped: 'Sources the model named but the search never returned were removed; only sources the search returned are shown.',
      sources_unattributable: 'Pages of a site the model cited are not shown: the search returned pages from that site, but none could be tied to this employer rather than another.',
      result_capped_without_grounded_source: 'Lowered to "ambiguous": the model said it found the employer, but the search returned no source for it.',
      result_capped_without_search: 'Lowered to "ambiguous": no search ran, so nothing says the employer has no online presence.',
      employer_search_failed: 'The search for this employer could not be completed, so nothing was found or concluded. Check it by hand.',
      not_searched_names_applicant: "Not searched: the employer's name carries the applicant's own name or contact details, and the search is never sent the applicant. Check it by hand.",
      website_not_sent_names_applicant: "The website was not sent because it names the applicant; the employer was searched by name and location only.",
      name_generic_platform_check: "The platform's word check (no AI) found the name is only activity words and a legal form.",
      result_set_by_generic_name_rule: 'The search classified this employer otherwise, but the platform recorded "cannot be identified" because its word check found that the name singles out no organisation.',
      name_not_identifiable_document_reading: 'The document reading judged that this name identifies no one organisation.',
      generic_name_found_by_search: 'The search said it found this employer and tied the pages listed under sources to it. The platform still recorded "cannot be identified" because the name is only activity words and a legal form. Open the pages: if they are this employer\'s own, the name does identify it; staff decide.',
      name_not_identifiable_search_only: "Only the employer search judged that this name identifies no one organisation; the platform's word check did not find it so, and neither did the document reading. Compare it with the documents before relying on it.",
    },

    // Owner report of 18 Oct 2026 (rpl-risk-v1): shown only on a run that carries risk_breakdown.
    listSeparator: ', ',
    employersHintIdentity: 'A name the platform\'s word check finds generic is recorded as "cannot be identified", whatever the search returns. A name only the document reading or the search judged unidentifiable keeps the search\'s result and is flagged. Either way, the confidence in the claim is Low.',
    columnClaimConfidence: 'Confidence in the claim',
    claimConfidence: { medium: 'Medium', undetermined: 'Undetermined', low: 'Low' },
    claimConfidenceHint: "Confidence in the claim is the platform's reading of what the search means for the claim itself. It is never above Medium: an employer's presence online does not show that the applicant worked there.",
    modelConfidence: "The model's confidence in this classification: {value}",
    sourcesNotThisEmployer: "Pages the search returned; none is this employer's own:",
    namedIn: 'Named in: {documents}',
    riskBand: { none: 'No risk indicator', low: 'Low', attention: 'Worth attention', high: 'High attention', very_high: 'Very high attention' },
    riskNone: 'No risk indicator was found in the documents read. This does not mean they were verified; staff decide.',
    riskHeadlineReason: 'What raised it most: {reason}',
    riskHeadlineModel: 'The model\'s reading of "{document}": {percent}%',
    olderRules: "This screen ran on older instructions ({version}), which did not check the issuer's identity or the details of experience letters. Re-run the screen to apply the current checks.",
    riskTitle: 'How the figure was reached',
    riskCombination: "Each document's figure combines the model's reading with the platform's signals: each signal raises what is left, so the total never passes 100%. The case figure is the highest document figure, with the case-level signals added the same way.",
    riskModelPart: "The model's reading of the document: {percent}%",
    riskModelDropped: "The model's percentage for this document was not kept because it rested on no observed flag; its figure comes from the platform's signals alone.",
    riskDocumentFigure: 'Document figure: {percent}%',
    riskWeight: 'Weight {weight}%: on its own it would put the document at {weight}%.',
    riskCaseWeight: 'Weight {weight}% at case level.',
    riskSources: 'Raised by: {sources}',
    riskSource: { platform_word_check: "the platform's word check (no AI)", document_reading: 'the document reading', employer_search: 'the employer search' },
    riskCaseComponentsTitle: 'Case-level signals',
    riskCaseLine: 'Case figure: the highest document figure ({max}%){withCase}, giving {percent}%.',
    riskCaseLineWith: ', with the case-level signals',
    riskNoteDetailsNotReported: 'The document reading returned no issuer details, so they were not checked.',
    riskCaseNoFigure: 'The case has no figure because no document that can carry one was assessed; the case-level signals are shown for reference.',
    riskComponents: {
      organisation_name_generic: {
        title: "The organisation's name identifies no one organisation",
        reason: '"{names}" on "{document}" does not single out one organisation, so the organisation cannot be identified and what the document attests cannot be verified. Treat it as unverified.',
      },
      issuer_not_named: {
        title: 'The letter does not name its issuer',
        reason: 'No organisation is named on "{document}", so who issued it cannot be known or checked.',
      },
      issuer_details_missing: {
        title: 'Issuer details are missing',
        reason: 'Missing: {missing}.',
      },
      claimed_employer_name_generic: {
        title: "A claimed employer's name identifies no one organisation",
        reason: '"{names}" does not single out one organisation, and no document read identifies it. The claim is unverified.',
      },
    },
    riskDetailsLevel: {
      several: '{count} of 9 details that identify the issuer are missing, but the letter gives a way to contact or check it.',
      most: '{count} of 9 details that identify the issuer are missing; little is left to contact or check it.',
      no_contact_route: 'No registration number, address, phone, email or website: there is no way to contact or check the issuer ({count} of 9 missing).',
      nearly_all: 'The letter carries almost nothing that identifies its issuer: there is no way to contact or check it, and {count} of 9 details are missing.',
    },
    issuerChecklist: {
      registration_number: 'registration or licence number',
      address: 'address',
      contact: 'phone, email or website',
      signatory_name: "signatory's name",
      signatory_title: "signatory's title",
      signature: 'signature',
      stamp_or_seal: 'stamp or seal',
      letterhead: 'letterhead',
      issue_date: 'issue date',
    },
    issuerTitle: 'Issuer details as the document shows them',
    issuerFields: {
      legal_name: 'Legal name',
      registration_number: 'Registration or licence number',
      address: 'Address',
      phone: 'Phone',
      email: 'Email',
      website: 'Website',
      signatory_name: "Signatory's name",
      signatory_title: "Signatory's title",
      signature: 'Signature',
      stamp_or_seal: 'Stamp or seal',
      letterhead: 'Letterhead',
    },
    presence: { present: 'Present', absent: 'Absent', unclear: 'Unclear' },
    notShown: 'Not shown',
    issuerIdentifiable: { yes: 'The name identifies one organisation', no: 'The name identifies no one organisation', unclear: 'The name could not be judged' },
  },
}

export const SCREENING_SETTINGS_COPY = {
  ar: {
    title: 'فرز الوثائق وجهات العمل',
    hint: 'فرز استشاري بالذكاء الاصطناعي لوثائق العميل لصالح الموظفين. يعمل تلقائيًا مرة واحدة عند التقديم، ويمكن للموظفين إعادة تشغيله. لا يغيّر مؤشره حالة أي دليل ولا ينقل أي طلب.',
    enabled: 'تفعيل فرز وثائق العميل',
    enabledHint: 'عند الإيقاف يُسجَّل كل تشغيل بأنه لم يُنفَّذ، ولا يُعرض أبدًا كنتيجة.',
    readingOff: 'إرسال ملفات العميل إلى Gemini موقوف (أعلاه)، فسيُرفض كل فرز حتى يُفعَّل.',
    webSearch: 'فحص جهات العمل على الإنترنت (بحث Google)',
    webSearchHint: 'يرسل أسماء جهات العمل مع بلدها ومدينتها فقط إلى بحث Google، كما ينص إقرار العميل (النسخة 2: الاسم والموقع)، ولا يرسل موقعها الإلكتروني ولا أي وثيقة ولا اسم العميل أو بيانات التواصل معه. يرفض الخادم تفعيله ما دام الإقرار النشط للعملاء أقدم من النسخة 2، ويُفحص كل طلب أيضًا وفق الإقرار الذي قُدِّم بموجبه.',
    model: 'نموذج الفرز',
    modelHint: 'نموذج واحد لكل تشغيل دون نموذج بديل، لتبقى المؤشرات قابلة للمقارنة.',
    modelRequired: 'مطلوب، وبحد أقصى 100 حرف.',
    excluded: 'فئات لا يقرؤها الفرز',
    excludedHint: 'لا تُرسل وثائق هذه الفئات إلى Gemini إطلاقًا، وتُدرج بوصفها لم تُفحص.',
    extractionOnly: 'فئات تُقرأ للاتساق فقط',
    extractionOnlyHint: 'تُقرأ لاستخراج الأسماء والتواريخ ومقارنتها بالوثائق الأخرى، ولا تحصل أبدًا على مؤشر. مكان وثائق الهوية هنا: فالصورة الممسوحة لا تُظهر عناصر الأمان في جواز السفر.',
    identityLocked: 'تبقى وثائق الهوية في إحدى القائمتين دائمًا (مستبعدة أو للاتساق فقط)، كما يُبلَّغ العميل في الإقرار. لنقلها، حدّدها في القائمة الأخرى أولًا.',
    inactiveCategory: 'ليست فئة فعّالة؛ سيرفضها الخادم، ألغِ تحديدها',
    noCategories: 'تعذّر تحميل فئات الأدلة.',
  },
  en: {
    title: 'Document and employer screening',
    hint: "An advisory AI screen of the applicant's documents for staff. It runs once automatically at submission, and staff may re-run it. Its figure never changes an evidence status or moves a case.",
    enabled: 'Screen applicant documents',
    enabledHint: 'While off, every run is recorded as not run, never as a result.',
    readingOff: 'Sending applicant documents to Gemini is off (above), so every screen will be refused until it is on.',
    webSearch: 'Check employers online (Google Search)',
    webSearchHint: "Sends employer names with their country and city only to Google Search, as the applicant declaration says (version 2: name and location): never the employer's website, never documents, and never the applicant's name or contact details. The server refuses to switch this on while the active applicant declaration is below version 2, and each case is also checked against the declaration it was submitted under.",
    model: 'Screening model',
    modelHint: 'One model for every run, with no fallback, so figures stay comparable.',
    modelRequired: 'Required, at most 100 characters.',
    excluded: 'Categories never read by the screen',
    excludedHint: 'Documents in these categories are not sent to Gemini at all and are listed as not screened.',
    extractionOnly: 'Categories read for consistency only',
    extractionOnlyHint: "Read for names and dates and compared with the other documents; they never get a figure. Identity documents belong here: a scan cannot show a passport's security features.",
    identityLocked: 'Identity documents always stay in one of the two lists (excluded, or consistency only), as the applicant declaration tells applicants. To move them, tick them in the other list first.',
    inactiveCategory: 'not an active category; the server will refuse it, untick it',
    noCategories: 'The evidence categories could not be loaded.',
  },
}

export const CLAIMED_EMPLOYERS_COPY = {
  ar: {
    title: 'جهات العمل المصرّح بها',
    snapshotHint: 'كما صرّح بها العميل عند التقديم، ومثبّتة مع الطلب.',
    profileHint: 'من الملف الحالي للعميل؛ لم يُثبَّت شيء مع الطلب بعد، فقد تتغير.',
    empty: 'لا توجد خبرة عمل مسجلة.',
    jobTitle: 'المسمى الوظيفي',
    period: 'الفترة',
    country: 'البلد',
    city: 'المدينة',
    website: 'الموقع الإلكتروني',
    registrationNumber: 'رقم السجل التجاري',
    present: 'حتى الآن',
  },
  en: {
    title: 'Claimed employers',
    snapshotHint: 'As the applicant declared them at submission, frozen with the case.',
    profileHint: "From the applicant's current profile. Nothing is frozen with the case yet, so this can still change.",
    empty: 'No work experience is recorded.',
    jobTitle: 'Job title',
    period: 'Period',
    country: 'Country',
    city: 'City',
    website: 'Website',
    registrationNumber: 'Registration number',
    present: 'present',
  },
}

/** The copy for a language; anything but Arabic reads English (NL was removed, 13 Oct 2026). */
function pick(table, language) {
  return table[language] || table.en
}

export function screeningCopy(language) {
  return pick(SCREENING_COPY, language)
}

export function screeningSettingsCopy(language) {
  return pick(SCREENING_SETTINGS_COPY, language)
}

export function claimedEmployersCopy(language) {
  return pick(CLAIMED_EMPLOYERS_COPY, language)
}

/*
 * A COUNT AND ITS NOUN AGREE (platform walk, 17 Oct 2026, UI-16).
 *
 * "{count|f1|f2|…}" is a count with its noun. Two forms are English: "1 try",
 * "3 tries". Four or five are Arabic, whose noun depends on the number: one and
 * two are whole phrases without the figure ("محاولة واحدة", "محاولتان"); 3 to 10
 * take the plural ("3 محاولات"); 11 to 99 the singular ("11 محاولة", "سؤالًا"
 * where the accusative shows); the rest (0, 100, 101, …) the fifth form, or the
 * fourth when none is given. The old templates used one form for every count:
 * "قُرئت 3 من 3 وثيقة", "5 دورة", "1 محاولات".
 */
export function countPhrase(value, forms) {
  const n = Number(value)
  if (value == null || value === '' || !Number.isFinite(n) || !Array.isArray(forms) || forms.length < 2) return value == null ? '' : String(value)
  if (forms.length === 2) return `${value} ${Math.abs(n) === 1 ? forms[0] : forms[1]}`
  const [one, two, few, many, other = many] = forms
  if (n === 1) return one
  if (n === 2) return two
  const hundreds = Math.abs(n) % 100
  if (hundreds >= 3 && hundreds <= 10) return `${value} ${few}`
  if (hundreds >= 11 && hundreds <= 99) return `${value} ${many}`
  return `${value} ${other}`
}

/** "{name}" placeholders, filled from values, and "{count|forms}" counts (countPhrase). A missing value leaves an empty string, never "undefined". */
export function fill(template, values = {}) {
  return String(template ?? '').replace(/\{(\w+)((?:\|[^|{}]*)*)\}/g, (_, key, forms) => {
    if (values[key] == null) return ''
    return forms ? countPhrase(values[key], forms.slice(1).split('|')) : String(values[key])
  })
}

/*
 * THE RATIONALE THE API WRITES ITSELF (platform walk, 17 Oct 2026, UI-13).
 *
 * For an extraction-only document (the identity document) the rationale is not
 * the model's: the API writes one fixed English sentence
 * (GeminiRplDocumentScreeningService::EXTRACTION_ONLY_RATIONALE). It is shown in
 * the screen's language; a rationale the model wrote is shown as written.
 */
export const EXTRACTION_ONLY_RATIONALE = {
  en: 'Read only to extract names and dates and compare them with the other documents and the claims. No judgement of whether this document is genuine is made or kept for this category; any disagreement found is listed in the flags.',
  ar: 'قُرئت هذه الوثيقة لاستخراج الأسماء والتواريخ ومقارنتها بالوثائق الأخرى وبما صرّح به العميل فقط. لا يُصدَر أي حكم على أصالة وثائق هذه الفئة ولا يُحفظ؛ وأي اختلاف يُرصد مذكور فيما رصده الفرز.',
}

export function screeningRationaleText(rationale, language = 'en') {
  if (typeof rationale !== 'string') return rationale ?? ''
  return rationale.trim() === EXTRACTION_ONLY_RATIONALE.en ? EXTRACTION_ONLY_RATIONALE[language === 'ar' ? 'ar' : 'en'] : rationale
}

/** A machine code as words, for a code this copy does not know yet. Shown rather than hidden. */
export function humanizeCode(code) {
  return String(code ?? '').replaceAll('_', ' ').trim()
}

/** A label from one of the copy maps, or the code itself in words. */
export function labelFor(map, code) {
  if (code == null || code === '') return ''
  return map?.[code] || humanizeCode(code)
}

/*
 * The API closes a queued or running run as abandoned once it has waited this
 * long, when staff ask for a new one (RplDocumentScreeningService::
 * IN_PROGRESS_ABANDONED_AFTER_MINUTES): far longer than one attempt may run.
 * Past it, a re-run is offered to replace the stalled run instead of being held.
 */
export const SCREENING_STALLED_AFTER_MINUTES = 30

/** The identity category: always excluded or extraction-only (D20(c)); the server refuses a save that leaves it in neither list. */
export const SCREENING_IDENTITY_CATEGORY = 'identity'

/**
 * A run stuck in the queue or the worker: queued since its request, or running
 * its current attempt since that attempt started, for longer than the API
 * allows. The same clocks the API uses: attempt_started_at, not started_at, for
 * a retried run waits behind other jobs for its second attempt and may be
 * working on it long after its first started (started_at for a row without one).
 */
export function isStalledRun(screening, now = Date.now()) {
  const status = screening?.status
  const since = status === 'running'
    ? screening.attempt_started_at || screening.started_at || screening.created_at
    : status === 'queued' ? screening.created_at : null
  const at = since ? Date.parse(since) : NaN
  return Number.isFinite(at) && now - at > SCREENING_STALLED_AFTER_MINUTES * 60 * 1000
}

/** Fewer documents read than the case holds: the figure covers only part of it. */
export function isPartialScreen(screening) {
  const total = Number(screening?.coverage?.documents_total)
  const read = Number(screening?.coverage?.read)
  return Number.isFinite(total) && Number.isFinite(read) && read < total
}

function scoreText(value) {
  const number = Number(value)
  return Number.isFinite(number) ? String(number) : null
}

/**
 * The case figure as one line, or null when there is none to show.
 *
 * Only a COMPLETED run has a figure. A refused, failed, queued or running run
 * returns null whatever its payload holds, so a refusal can never read as 0%.
 */
export function caseFigureText(screening, copy) {
  if (screening?.status !== 'completed') return null
  const percent = screening?.fake_likelihood_percent
  if (percent == null || !Number.isFinite(Number(percent))) return null
  const score = screening?.score_out_of_10 == null ? null : scoreText(screening.score_out_of_10)

  return score == null
    ? fill(copy.figureNoScore, { percent: Number(percent) })
    : fill(copy.figure, { percent: Number(percent), score })
}

/** The explanation of a run that has no figure, in plain words; null for a completed run with one. */
export function statusExplanation(screening, copy, now = Date.now()) {
  const status = screening?.status
  if (status === 'refused') {
    const code = screening?.refusal_code
    return copy.refusal[code] || fill(copy.refusal.unknown, { code: humanizeCode(code) || '—' })
  }
  if (status === 'completed') return caseFigureText(screening, copy) ? null : copy.completedNoFigure
  // A run past the API's window is stuck, not "usually done within minutes".
  if (isStalledRun(screening, now)) return fill(copy.statusExplanation.stalled, { minutes: SCREENING_STALLED_AFTER_MINUTES })
  return copy.statusExplanation[status] || null
}

/**
 * An http(s) URL safe to put in an href, or null.
 *
 * Applicant-typed websites and model-relayed source URIs both end up here; a
 * javascript: or data: URI must never become a clickable link.
 */
export function safeExternalUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

/** An ISO 3166-1 alpha-2 code as "Jordan (JO)", or the value as given when it is not one. */
export function regionName(code, language) {
  if (typeof code !== 'string' || !/^[A-Za-z]{2}$/.test(code.trim())) return code || ''
  const upper = code.trim().toUpperCase()
  try {
    const name = new Intl.DisplayNames([getLocaleForLanguage(language)], { type: 'region' }).of(upper)
    return name && name !== upper ? `${name} (${upper})` : upper
  } catch {
    return upper
  }
}

/**
 * The employers the applicant claims, and where the list was read from.
 *
 * A submitted case reads the copy frozen into profile_snapshot at submit, so a
 * later profile edit cannot change what the case claimed. A draft has no
 * snapshot yet and reads the live profile, labelled as such.
 */
export function readClaimedEmployers(application) {
  const frozen = application?.profile_snapshot?.work_experiences
  if (Array.isArray(frozen)) return { source: 'snapshot', items: frozen }

  const live = application?.user?.work_experiences ?? application?.applicant?.work_experiences
  if (Array.isArray(live)) return { source: 'profile', items: live }

  return { source: null, items: [] }
}

/*
 * HOW THE FIGURE WAS REACHED (owner report of 18 Oct 2026, rpl-risk-v1).
 *
 * A letter from "Tourism Company" read 0%: nothing in it contradicted anything,
 * and the name identifies no one. Since rpl-screen-v3 the server combines each
 * document's model reading with the platform's identity components and stores
 * the arithmetic as risk_breakdown. The platform only shows it: it never
 * recomputes a figure, and a run without the breakdown (rpl-screen-v1, v2)
 * renders as it always did.
 */

/** The closed list of component codes, in the order the panel lists them (RplScreeningRiskCalculator::COMPONENTS). */
export const RISK_COMPONENTS = Object.freeze(['organisation_name_generic', 'issuer_not_named', 'issuer_details_missing', 'claimed_employer_name_generic'])

/** The one case-level component: a generic employer no assessed document names. */
export const CASE_RISK_COMPONENTS = Object.freeze(['claimed_employer_name_generic'])

/** The nine issuer details an experience letter is read for (RplScreeningRiskCalculator::CHECKLIST). */
export const ISSUER_CHECKLIST = Object.freeze(['registration_number', 'address', 'contact', 'signatory_name', 'signatory_title', 'signature', 'stamp_or_seal', 'letterhead', 'issue_date'])

/** The issuer details as the document shows them: eight copied values, then three presences. */
export const ISSUER_TEXT_FIELDS = Object.freeze(['legal_name', 'registration_number', 'address', 'phone', 'email', 'website', 'signatory_name', 'signatory_title'])
export const ISSUER_PRESENCE_FIELDS = Object.freeze(['signature', 'stamp_or_seal', 'letterhead'])
/** The three ways to reach the issuer; the checklist counts them as one item, "contact". */
export const ISSUER_CONTACT_FIELDS = Object.freeze(['phone', 'email', 'website'])

/** The band beside the figure. Never green: a low figure is not a clearance. */
export const RISK_BAND_VARIANT = Object.freeze({ none: 'neutral', low: 'neutral', attention: 'warning', high: 'danger', very_high: 'danger' })

/** Prompt versions that did not check the issuer's identity; their runs offer a re-run under the current rules. */
export const OLDER_PROMPT_VERSIONS = Object.freeze(['rpl-screen-v1', 'rpl-screen-v2'])

/** The two results whose search pages are never the employer's own. */
export const RESULTS_WITHOUT_OWN_SOURCES = Object.freeze(['not_identifiable', 'not_found_online'])

/** The components whose reason quotes the names that raised them; without a name, the title speaks alone. */
const NAMED_RISK_COMPONENTS = Object.freeze(['organisation_name_generic', 'claimed_employer_name_generic'])

const RISK_NOTE_COPY = Object.freeze({ issuer_details_not_reported: 'riskNoteDetailsNotReported' })

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function objects(value) {
  return Array.isArray(value) ? value.filter(isPlainObject) : []
}

function componentRank(code) {
  const index = RISK_COMPONENTS.indexOf(code)
  return index === -1 ? RISK_COMPONENTS.length : index
}

function wholeNumber(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

/** A run whose figure the server reached with rpl-risk-v1: it carries risk_breakdown. */
export function isRiskModelRun(screening) {
  return isPlainObject(screening?.risk_breakdown)
}

/** The band of a completed rpl-risk-v1 run in words, or null (an older run, or a run without a figure). */
export function riskBandLabel(screening, copy) {
  if (screening?.status !== 'completed' || !isRiskModelRun(screening)) return null
  const band = screening.risk_breakdown.band
  return typeof band === 'string' && band !== '' ? labelFor(copy.riskBand, band) : null
}

/** The components sorted into the order of RISK_COMPONENTS; an unknown code goes last, as sent. */
export function sortRiskComponents(components) {
  return objects(components).map((component, index) => ({ component, index })).sort((a, b) => componentRank(a.component.code) - componentRank(b.component.code) || a.index - b.index).map(({ component }) => component)
}

/** The title of the run's document with this public id, as the applicant gave it. */
export function screeningDocumentTitle(screening, publicId, copy) {
  const item = objects(screening?.items).find((entry) => publicId != null && entry.evidence_public_id === publicId)
  return item?.evidence_snapshot?.title || copy.untitled
}

/** The checklist items a letter lacks, in words, joined for the page's language. */
export function missingChecklistText(missing, copy) {
  return (Array.isArray(missing) ? missing : []).filter(Boolean).map((key) => labelFor(copy.issuerChecklist, key)).join(copy.listSeparator)
}

/**
 * One component in words: its title, the reason filled with the names and the
 * document, its weight line and who raised it. A case-level component's weight
 * reads "at case level"; an unknown code still shows, in words.
 */
export function riskComponentText(component, { documentTitle = null, caseLevel } = {}, copy) {
  const code = component?.code
  const words = copy.riskComponents?.[code]
  const isCase = caseLevel ?? CASE_RISK_COMPONENTS.includes(code)
  const names = (Array.isArray(component?.names) ? component.names : []).filter(Boolean).join(copy.listSeparator)

  let reason = ''
  if (code === 'issuer_details_missing') {
    const missing = Array.isArray(component?.missing) ? component.missing.filter(Boolean) : []
    const level = copy.riskDetailsLevel?.[component?.level]
    reason = [
      level ? fill(level, { count: wholeNumber(component?.missing_count) ?? missing.length }) : null,
      missing.length && words ? fill(words.reason, { missing: missingChecklistText(missing, copy) }) : null,
    ].filter(Boolean).join(' ')
  } else if (words && (names || !NAMED_RISK_COMPONENTS.includes(code))) {
    // A name component with no name would read «» / "": its title says it alone.
    reason = fill(words.reason, { names, document: documentTitle || copy.untitled })
  }

  const weight = wholeNumber(component?.weight)
  const sources = (Array.isArray(component?.sources) ? component.sources : []).filter(Boolean)

  return {
    title: words?.title || humanizeCode(code),
    reason,
    weight: weight == null ? null : fill(isCase ? copy.riskCaseWeight : copy.riskWeight, { weight }),
    sources: sources.length ? fill(copy.riskSources, { sources: sources.map((source) => labelFor(copy.riskSource, source)).join(copy.listSeparator) }) : null,
  }
}

/** A breakdown note in words; a note this copy does not know yet is shown in words, not hidden. */
export function riskNoteText(note, copy) {
  const key = RISK_NOTE_COPY[note]
  return key ? copy[key] : humanizeCode(note)
}

/**
 * The one line under the figure: what raised it most.
 *
 * Only what set the case figure counts: the document whose figure is the
 * highest (highest_document_percent; every document when the run does not say)
 * and the case-level components. A component on another document did not
 * raise the case figure, so it is never named here (review of 18 Oct 2026).
 * Among those, the heaviest of the components and the model's own reading of
 * that document (above 0, and kept); a tie goes to a component before the
 * model's reading, a document's component before the case's, then by
 * RISK_COMPONENTS order, then by the order sent. For the band "none", the
 * sentence that says no indicator is not a verification. Null on an older run.
 */
export function topRiskReason(screening, copy) {
  if (!isRiskModelRun(screening)) return null
  const breakdown = screening.risk_breakdown
  const documents = objects(breakdown.documents)
  const highest = wholeNumber(breakdown.highest_document_percent)
  const leading = highest == null ? documents : documents.filter((entry) => wholeNumber(entry.document_percent) === highest)

  const candidates = [
    ...leading.flatMap((entry) => objects(entry.components).map((component) => ({ component, entry, weight: wholeNumber(component.weight) }))),
    ...objects(breakdown.case_components).map((component) => ({ component, entry: null, weight: wholeNumber(component.weight) })),
    ...leading.map((entry) => ({ component: null, entry, weight: entry.model_percent_unsupported ? null : wholeNumber(entry.model_percent) })),
  ]
    .map((candidate, index) => ({ ...candidate, index }))
    .filter((candidate) => candidate.weight != null && candidate.weight > 0)

  candidates.sort((a, b) => b.weight - a.weight
    || (a.component ? 0 : 1) - (b.component ? 0 : 1)
    || (a.entry ? 0 : 1) - (b.entry ? 0 : 1)
    || componentRank(a.component?.code) - componentRank(b.component?.code)
    || a.index - b.index)

  const top = candidates[0]
  if (top?.component) {
    const text = riskComponentText(top.component, {
      documentTitle: top.entry ? screeningDocumentTitle(screening, top.entry.evidence_public_id, copy) : null,
      caseLevel: !top.entry,
    }, copy)
    return fill(copy.riskHeadlineReason, { reason: text.reason || text.title })
  }
  if (top) {
    return fill(copy.riskHeadlineReason, {
      reason: fill(copy.riskHeadlineModel, { document: screeningDocumentTitle(screening, top.entry.evidence_public_id, copy), percent: top.weight }),
    })
  }

  return breakdown.band === 'none' ? copy.riskNone : null
}

/** The platform's confidence in an employer claim, in words; null for a row from an older run, which has none. */
export function claimConfidenceLabel(check, copy) {
  const value = check?.claim_confidence
  return typeof value === 'string' && value !== '' ? labelFor(copy.claimConfidence, value) : null
}

/**
 * Whether the search's pages on this row are said not to be the employer's own:
 * its result says none was, unless the search tied pages to it and the platform
 * overrode a "found" only because of the name (generic_name_found_by_search).
 */
export function sourcesAreNotOwn(check) {
  const flags = Array.isArray(check?.flags) ? check.flags : []
  return RESULTS_WITHOUT_OWN_SOURCES.includes(check?.result) && !flags.includes('generic_name_found_by_search')
}

/** "Named in: …", the titles of the documents that name this employer; null when none is known. */
export function namedInText(check, screening, copy) {
  const ids = (Array.isArray(check?.evidence_public_ids) ? check.evidence_public_ids : []).filter(Boolean)
  if (!ids.length) return null
  const titles = [...new Set(ids.map((id) => screeningDocumentTitle(screening, id, copy)))]
  return fill(copy.namedIn, { documents: titles.join(copy.listSeparator) })
}

/** A completed run on instructions that did not check the issuer's identity: a re-run applies the current checks. */
export function isOlderRulesRun(screening) {
  return screening?.status === 'completed' && OLDER_PROMPT_VERSIONS.includes(screening?.prompt_version)
}
