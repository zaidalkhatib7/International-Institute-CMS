const text = {
  ar: {
    accreditationLevels: ['ممارس مهني', 'ممارس مهني متقدم', 'خبير مهني'],
    trainingProgramTypes: ['الدورات القصيرة', 'الحقائب التدريبية', 'الدبلومات المهنية', 'برامج المؤسسات والوزارات'],
    rplWorkflowStages: [
      ['application', 'بدء الطلب واختيار المسار', 'إنشاء الطلب وتحديد مجال أو مسار الاعتماد المهني المناسب.'],
      ['evidence', 'بناء ملف الأدلة', 'رفع الأدلة المهنية وتصنيفها وربطها بمعايير الكفاءة.'],
      ['assessment', 'التقييم والتحقق', 'مراجعة الأدلة والمقابلة المهنية والتقييم العملي عند الحاجة.'],
      ['completion', 'تحليل الفجوات والاستكمال', 'تحديد فجوات الكفاءة وبناء خطة الاستكمال المهني.'],
      ['decision', 'القرار وإصدار الاعتماد', 'مراجعة الملف وإصدار القرار والشهادة والسجل المهني.'],
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
    trainingProgramTypes: ['Short courses', 'Training kits', 'Professional diplomas', 'Institution and ministry programs'],
    rplWorkflowStages: [
      ['application', 'Application and pathway selection', 'Create the application and choose the relevant accreditation pathway.'],
      ['evidence', 'Evidence portfolio', 'Upload, classify, and map professional evidence to competency standards.'],
      ['assessment', 'Assessment and verification', 'Review evidence, conduct interviews, and run practical assessment when needed.'],
      ['completion', 'Gap analysis and completion', 'Identify competency gaps and build the professional completion plan.'],
      ['decision', 'Decision and accreditation', 'Review the file, issue the decision, certificate, and professional record.'],
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
  nl: {
    accreditationLevels: ['Professioneel beoefenaar', 'Gevorderd professional', 'Professioneel expert'],
    trainingProgramTypes: ['Korte cursussen', 'Trainingspakketten', 'Professionele diploma’s', 'Programma’s voor instellingen en ministeries'],
    rplWorkflowStages: [
      ['application', 'Aanvraag en trajectkeuze', 'Maak de aanvraag aan en kies het juiste accreditatietraject.'],
      ['evidence', 'Bewijsportfolio', 'Upload, classificeer en koppel professioneel bewijs aan competentiestandaarden.'],
      ['assessment', 'Beoordeling en verificatie', 'Beoordeel bewijs, voer interviews uit en gebruik waar nodig praktische beoordeling.'],
      ['completion', 'Gap-analyse en aanvulling', 'Bepaal competentiegaten en bouw het professionele aanvullingsplan.'],
      ['decision', 'Besluit en accreditatie', 'Beoordeel het dossier en geef besluit, certificaat en professioneel record uit.'],
    ],
    publicSiteArchitecture: [
      ['home', 'Home'],
      ['about', 'Over ons', ['Over ICPC', 'Corporate governance']],
      ['methodology', 'RPL-methodologie', ['Erkenning van eerder leren en ervaring', 'Institutioneel kader', 'Implementatiefasen']],
      ['training-programs', 'Trainingsprogramma’s', ['Korte cursussen', 'Trainingspakketten', 'Professionele diploma’s', 'Programma’s voor instellingen en ministeries']],
      ['rpl-service', 'Erkenning van ervaring (RPL)', ['Over de service', 'Aanvraagstappen', 'Veelgestelde vragen']],
      ['professional-accreditation', 'Professionele accreditatie en certificaten', ['Accreditatieniveaus', 'Certificaatverificatie']],
      ['experts-network', 'Expert-netwerk', ['Gecertificeerde beoordelaars', 'Gecertificeerde trainers']],
      ['news', 'Nieuws', ['Nieuws en publicaties']],
      ['contact-login', 'Contact / Login', ['Contact', 'Login']],
    ],
    workspaces: [
      ['applicant', 'Aanvragersdashboard', 'Traject van profiel en RPL-aanvraag tot accreditatie en verlenging.', 'applicant', ['Professioneel profiel', 'RPL-aanvragen', 'Bewijsportfolio', 'Beoordeling', 'Gap-analyse', 'Aanvullingsplan']],
      ['assessor', 'Beoordelaarsdashboard', 'Bewijsreview, criteriadekking, interviews en beoordelingsrapporten.', 'assessor', ['Toegewezen dossiers', 'Bewijsreview', 'Digitale rubric', 'Interviewplanning']],
      ['trainer', 'Trainerdashboard', 'Aanvullingsprogramma’s, voortgang en evaluatie van leeruitkomsten.', 'trainer', ['Aanvullingsprogramma’s', 'Voortgang', 'Leeruitkomsten']],
      ['committee', 'Accreditatiecommissie', 'Eindbeoordeling van dossiers, rapporten en besluiten.', 'committee', ['Voltooide dossiers', 'Beoordelaarsrapporten', 'Besluiten', 'Redenen']],
      ['quality', 'Governance & Kwaliteit', 'Interne audit, bezwaar, kwaliteitsindicatoren en periodieke rapporten.', 'quality', ['Interne audit', 'Bezwaar', 'Kwaliteitsindicatoren', 'Kwaliteitsrapporten']],
      ['finance', 'Financieel systeem', 'Facturen, betalingen, abonnementen, coupons en financiële rapporten.', 'finance', ['Facturen', 'Betalingen', 'Abonnementen', 'Coupons', 'Financiële rapporten']],
      ['administration', 'Beheer', 'Platformreferenties, rechten, programma’s, commissies, rapporten en instellingen.', 'administration', ['Gebruikers en rechten', 'Certificaatbeheer', 'Digitale bibliotheek', 'Support en communicatie', 'Commissies', 'Systeeminstellingen']],
    ],
    quickActions: [
      ['users', 'Gebruikers & rechten', 'Open huidige accounts en rollen.', '/users', 'users'],
      ['programs', 'Programma’s & pakketten', 'Beheer catalogus en leerinhoud.', '/programs', 'programs'],
      ['assessments', 'Vragenbanken', 'Open toetsen en beschikbare vragenbanken.', '/quizzes', 'assessments'],
      ['certificates', 'Certificaatbeheer', 'Geef certificaten uit en beheer sjablonen en levenscyclusacties.', '/certificates', 'certificates'],
      ['library', 'Digitale bibliotheek', 'Beheer bronnen, categorieën en gecontroleerde versies.', '/library', 'library'],
      ['support', 'Support en communicatie', 'Beheer tickets, FAQ’s en institutionele aankondigingen.', '/support', 'support'],
      ['finance', 'Financiële operaties', 'Beheer producten, prijzen, kortingscodes en abonnementen.', '/finance', 'finance'],
      ['settings', 'Systeeminstellingen', 'Beheer taal, sessie en platforminstellingen.', '/settings', 'settings'],
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
        label: language === 'ar' ? 'مساحات العمل' : language === 'nl' ? 'Werkruimtes' : 'Workspaces',
        value: workspaceDefinitions.length,
        hint: language === 'ar' ? 'لوحات أدوار وأنظمة ضمن المخطط' : language === 'nl' ? 'Rol- en systeemdashboards' : 'Role and system dashboards',
        icon: 'workspaces',
      },
      {
        id: 'levels',
        label: language === 'ar' ? 'مستويات الاعتماد' : language === 'nl' ? 'Accreditatieniveaus' : 'Accreditation levels',
        value: source.accreditationLevels.length,
        hint: source.accreditationLevels.join(' / '),
        icon: 'levels',
      },
      {
        id: 'stages',
        label: language === 'ar' ? 'مراحل رحلة RPL' : language === 'nl' ? 'RPL-fasen' : 'RPL stages',
        value: rplWorkflowStages.length,
        hint: language === 'ar' ? 'من الطلب إلى القرار' : language === 'nl' ? 'Van aanvraag tot besluit' : 'From application to decision',
        icon: 'stages',
      },
      {
        id: 'program-types',
        label: language === 'ar' ? 'أنواع البرامج التدريبية' : language === 'nl' ? 'Programmatypen' : 'Program types',
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
