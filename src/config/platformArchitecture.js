const text = {
  ar: {
    accreditationLevels: ['ممارس مهني', 'ممارس مهني متقدم', 'خبير مهني'],
    trainingProgramTypes: ['دورات قصيرة', 'حقائب تدريبية', 'دبلومات مهنية', 'ماجستير مهني', 'دكتوراه مهنية', 'برامج تجسير', 'برامج المؤسسات والوزارات', 'حقائب سد الفجوات', 'برامج تنفيذية', 'برامج مخصصة'],
    // The professional RPL journey as it runs today (owner flow of 12 Oct and model of 15 Oct 2026; UI-11).
    rplWorkflowStages: [
      ['application', 'الطلب والوثائق', 'يختار العميل مسار الاعتراف المهني (مع شهادة ثانوية أو دونها) والمستوى: ممارس مهني أو ممارس مهني متقدم أو خبير مهني، ويرفع وثائقه.'],
      ['screening', 'الفرز والقرار', 'يفحص Gemini أصالة الوثائق ويتحقق من جهات العمل، ثم يقرر الموظفون: اختبار الدخول، أو مقابلة عبر الإنترنت أو في المكتب، أو الرفض مع إمكانية طلب جديد بعد مهلة الانتظار.'],
      ['entry_quiz', 'اختبار تثبيت الخبرة', 'من ينجح يمكنه شراء شهادة تثبيت الخبرة والتوقف أو المتابعة؛ ومن يتابع أو لا ينجح ينتقل إلى خطة دورات يقترحها Gemini ويعتمدها الموظفون، بالحد الأدنى للمستوى.'],
      ['course_plan', 'خطة الدورات والتعلّم', 'يشتري العميل الدورات المعتمدة في خطته فقط، ويجتاز اختبار كل دورة.'],
      ['final_exam', 'الاختبار النهائي وشهادة المستوى', 'اختبار نهائي في الدورات التي درسها بثلاث محاولات، ثم انتظار وإعادة مدفوعة؛ وعند النجاح تصدر شهادة المستوى المختار تلقائيًا، بعد رسوم الشهادة إن وُجدت.'],
    ],
    publicSiteArchitecture: [
      ['home', 'الصفحة الرئيسية'],
      ['about', 'من نحن', ['عن ICPC', 'الحوكمة المؤسسية']],
      [
        'methodology',
        'منهجية RPL',
        ['مفهوم الاعتراف بالتعلم والخبرة السابقة', 'الإطار المؤسسي للمنهجية', 'مراحل التطبيق'],
      ],
      ['training-programs', 'البرامج التدريبية', ['الدورات القصيرة', 'الحقائب التدريبية', 'الدبلومات المهنية', 'برامج المؤسسات والوزارات']],
      ['rpl-service', 'الاعتراف بالخبرة (RPL)', ['عن الخدمة', 'خطوات التقديم', 'الأسئلة الشائعة']],
      ['professional-accreditation', 'الاعتماد المهني والشهادات', ['مستويات الاعتماد', 'التحقق من الشهادة']],
      ['experts-network', 'شبكة الخبراء', ['المقيّمون المعتمدون', 'المدربون المعتمدون']],
      ['news', 'الأخبار', ['الأخبار والمنشورات']],
      ['contact-login', 'تواصل معنا / تسجيل الدخول', ['تواصل معنا', 'تسجيل الدخول']],
    ],
    workspaces: [
      ['applicant', 'لوحة المتقدم', 'رحلة المتقدم من الملف المهني وطلب RPL حتى الاعتماد والتجديد.', 'applicant', ['الملف المهني الإلكتروني', 'طلبات الاعتراف بالخبرة', 'الأدلة المهنية', 'التقييم', 'تحليل فجوات الكفاءة', 'خطة الاستكمال المهني']],
      ['assessor', 'لوحة المقيّم', 'مراجعة الأدلة وتغطية المعايير وإدارة المقابلات وتقارير التقييم.', 'assessor', ['الملفات المحالة إليّ', 'مراجعة الأدلة', 'نموذج التقييم الرقمي', 'جدولة المقابلات']],
      ['trainer', 'لوحة المدرّب', 'تنفيذ برامج الاستكمال ومتابعة التقدم وتقييم مخرجات التعلم.', 'trainer', ['برامج الاستكمال', 'تقدم المتقدمين', 'تقييم مخرجات التعلم']],
      ['committee', 'لوحة لجنة الاعتماد', 'المراجعة النهائية للملفات وتقارير المقيّمين وإصدار القرار.', 'committee', ['الملفات المكتملة', 'تقارير المقيّمين', 'إصدار القرار', 'توثيق الأسباب']],
      ['quality', 'الحوكمة وضمان الجودة', 'التدقيق والتظلمات ومؤشرات الجودة والتقارير الدورية.', 'quality', ['التدقيق الداخلي', 'إدارة التظلمات', 'مؤشرات الجودة', 'تقارير الجودة']],
      ['finance', 'النظام المالي', 'الفواتير والمدفوعات والاشتراكات والكوبونات والتقارير المالية.', 'finance', ['الفواتير', 'المدفوعات', 'الاشتراكات', 'الكوبونات', 'التقارير المالية']],
      ['administration', 'الإدارة', 'إدارة المنصة والمرجعيات والصلاحيات والبرامج واللجان والتقارير.', 'administration', ['المستخدمون والصلاحيات', 'إدارة الشهادات', 'المكتبة الرقمية', 'الدعم والاتصالات', 'اللجان', 'إعدادات النظام']],
    ],
    quickActions: [
      ['users', 'المستخدمون والصلاحيات', 'فتح مساحة الحسابات والأدوار الحالية.', '/users', 'users'],
      ['programs', 'البرامج والحقائب', 'إدارة كتالوج البرامج والمحتوى التدريبي.', '/programs', 'programs'],
      ['assessments', 'بنوك الأسئلة', 'فتح أدوات الاختبارات وبنوك الأسئلة المتاحة.', '/quizzes', 'assessments'],
      ['certificates', 'إدارة الشهادات', 'إصدار الشهادات وإدارة القوالب ودورة حياة الاعتماد.', '/certificates', 'certificates'],
      ['library', 'المكتبة الرقمية', 'إدارة المصادر والتصنيفات والإصدارات المحكومة.', '/library', 'library'],
      ['support', 'الدعم والاتصالات', 'إدارة التذاكر والأسئلة الشائعة والإعلانات.', '/support', 'support'],
      ['finance', 'العمليات المالية', 'إدارة المنتجات والأسعار والخصومات والاشتراكات.', '/finance', 'finance'],
      ['settings', 'إعدادات النظام', 'إدارة اللغة والجلسة وإعدادات المنصة.', '/settings', 'settings'],
    ],
  },
  en: {
    accreditationLevels: ['Professional Practitioner', 'Advanced Professional Practitioner', 'Professional Expert'],
    trainingProgramTypes: ['Short courses', 'Training kits', 'Professional diplomas', 'Professional masters', 'Professional doctorates', 'Bridging programmes', 'Institution and ministry programs', 'Competency gap packages', 'Executive programmes', 'Custom programmes'],
    rplWorkflowStages: [
      ['application', 'Request and documents', 'The client chooses the professional RPL pathway (with or without a secondary certificate) and the level — Professional Practitioner, Advanced Professional Practitioner or Professional Expert — and uploads the documents.'],
      ['screening', 'Screening and decision', 'Gemini screens the documents for authenticity and checks the employers; staff then decide: the entry quiz, an interview online or at the office, or a decline, with a new request allowed after the waiting period.'],
      ['entry_quiz', 'Experience confirmation quiz', 'A client who passes may buy the Experience Confirmation Certificate and stop, or continue; a client who continues or does not pass moves to a course plan that Gemini proposes and staff approve, with the level\'s minimum.'],
      ['course_plan', 'Course plan and learning', 'The client buys only the approved courses on the plan and passes each course quiz.'],
      ['final_exam', 'Final exam and level certificate', 'A final exam over the studied courses, with three tries, then a wait and a paid retake; on a pass the certificate of the chosen level is issued automatically, after the certification fee when one is set.'],
    ],
    publicSiteArchitecture: [
      ['home', 'Home'],
      ['about', 'About us', ['About ICPC', 'Corporate governance']],
      ['methodology', 'RPL methodology', ['Recognition of prior learning and experience', 'Institutional framework', 'Implementation stages']],
      ['training-programs', 'Training programs', ['Short courses', 'Training kits', 'Professional diplomas', 'Institution and ministry programs']],
      ['rpl-service', 'Experience recognition (RPL)', ['About the service', 'Application steps', 'FAQ']],
      ['professional-accreditation', 'Professional accreditation and certificates', ['Accreditation levels', 'Certificate verification']],
      ['experts-network', 'Expert network', ['Certified assessors', 'Certified trainers']],
      ['news', 'News', ['News and publications']],
      ['contact-login', 'Contact us / Login', ['Contact us', 'Login']],
    ],
    workspaces: [
      ['applicant', 'Applicant Dashboard', 'Applicant journey from profile and RPL request through accreditation and renewal.', 'applicant', ['Professional profile', 'RPL applications', 'Evidence portfolio', 'Assessment', 'Gap analysis', 'Completion plan']],
      ['assessor', 'Assessor Dashboard', 'Evidence review, criteria coverage, interviews, and assessment reports.', 'assessor', ['Assigned files', 'Evidence review', 'Digital rubric', 'Interview scheduling']],
      ['trainer', 'Trainer Dashboard', 'Completion programs, applicant progress, and learning outcome evaluation.', 'trainer', ['Completion programs', 'Applicant progress', 'Learning outcomes']],
      ['committee', 'Accreditation Committee', 'Final review of completed files, assessor reports, and decisions.', 'committee', ['Completed files', 'Assessor reports', 'Decision issuing', 'Decision reasons']],
      ['quality', 'Governance & Quality', 'Internal audit, appeals, quality indicators, and periodic reports.', 'quality', ['Internal audit', 'Appeals', 'Quality indicators', 'Quality reports']],
      ['finance', 'Finance System', 'Invoices, payments, subscriptions, coupons, and financial reports.', 'finance', ['Invoices', 'Payments', 'Subscriptions', 'Coupons', 'Financial reports']],
      ['administration', 'Administration', 'Platform references, permissions, programs, committees, reports, and settings.', 'administration', ['Users and permissions', 'Certificate administration', 'Digital library', 'Support and communications', 'Committees', 'System settings']],
    ],
    quickActions: [
      ['users', 'Users & permissions', 'Open current accounts and roles.', '/users', 'users'],
      ['programs', 'Programs & packages', 'Manage program catalog and learning content.', '/programs', 'programs'],
      ['assessments', 'Question banks', 'Open quizzes and available question banks.', '/quizzes', 'assessments'],
      ['certificates', 'Certificate administration', 'Issue credentials and govern templates and lifecycle actions.', '/certificates', 'certificates'],
      ['library', 'Digital library', 'Manage resources, categories, and governed versions.', '/library', 'library'],
      ['support', 'Support & communications', 'Operate tickets, FAQs, and institutional announcements.', '/support', 'support'],
      ['finance', 'Finance operations', 'Manage products, pricing, coupons, and subscriptions.', '/finance', 'finance'],
      ['settings', 'System settings', 'Manage language, session, and platform settings.', '/settings', 'settings'],
    ],
  },
}

function toStage([id, title, description]) {
  return { id, title, description }
}

function toSiteItem([id, title, children]) {
  return { id, title, children }
}

function toWorkspace([id, title, description, icon, modules, optional]) {
  return {
    id,
    title,
    description,
    icon,
    optional: Boolean(optional),
    modules: modules.map((title) => ({ title })),
  }
}

function toQuickAction([id, label, description, href, icon]) {
  return { id, label, description, href, icon }
}

export function getPlatformArchitecture(language = 'ar') {
  const source = text[language] || text.ar
  const rplWorkflowStages = source.rplWorkflowStages.map(toStage)
  const publicSiteArchitecture = source.publicSiteArchitecture.map(toSiteItem)
  const workspaceDefinitions = source.workspaces.map(toWorkspace)
  const dashboardQuickActions = source.quickActions.map(toQuickAction)

  return {
    accreditationLevels: source.accreditationLevels,
    trainingProgramTypes: source.trainingProgramTypes,
    rplWorkflowStages,
    publicSiteArchitecture,
    workspaceDefinitions,
    dashboardQuickActions,
    platformStructuralStats: [
      {
        id: 'workspaces',
        label: language === 'ar' ? 'مساحات العمل' : 'Workspaces',
        value: workspaceDefinitions.length,
        hint: language === 'ar' ? 'لوحات أدوار وأنظمة ضمن المخطط' : 'Role and system dashboards',
        icon: 'workspaces',
      },
      {
        id: 'levels',
        label: language === 'ar' ? 'مستويات الاعتماد' : 'Accreditation levels',
        value: source.accreditationLevels.length,
        hint: source.accreditationLevels.join(' / '),
        icon: 'levels',
      },
      {
        id: 'stages',
        label: language === 'ar' ? 'مراحل رحلة RPL' : 'RPL stages',
        value: rplWorkflowStages.length,
        hint: language === 'ar' ? 'من الطلب إلى شهادة المستوى' : 'From the request to the level certificate',
        icon: 'stages',
      },
      {
        id: 'program-types',
        label: language === 'ar' ? 'أنواع البرامج التدريبية' : 'Program types',
        value: source.trainingProgramTypes.length,
        hint: source.trainingProgramTypes.join(' / '),
        icon: 'programs',
      },
    ],
    administrationModules: workspaceDefinitions.find((workspace) => workspace.id === 'administration')?.modules || [],
  }
}

const defaultArchitecture = getPlatformArchitecture('ar')

export const accreditationLevels = defaultArchitecture.accreditationLevels
export const trainingProgramTypes = defaultArchitecture.trainingProgramTypes
export const rplWorkflowStages = defaultArchitecture.rplWorkflowStages
export const publicSiteArchitecture = defaultArchitecture.publicSiteArchitecture
export const workspaceDefinitions = defaultArchitecture.workspaceDefinitions
export const administrationModules = defaultArchitecture.administrationModules
export const platformStructuralStats = defaultArchitecture.platformStructuralStats
export const dashboardQuickActions = defaultArchitecture.dashboardQuickActions

export default defaultArchitecture
