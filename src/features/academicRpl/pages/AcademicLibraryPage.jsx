import { useCallback, useEffect, useState } from 'react'
import {
  BookMarked, CheckCircle2, Layers3, Loader2, Plus, RefreshCw, Send, ShieldAlert, Trash2,
  TriangleAlert, UploadCloud,
} from 'lucide-react'
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, PageHeader, Select, Textarea,
} from '../../../components/ui'
import { readApiError } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { localize } from '../../rpl/domain/rpl'
import {
  approveAcademicSchool, createAcademicPackage, createAcademicSchool, deleteAcademicPackage,
  fetchAcademicLibrary, importAcademicCompetencyFile, importAcademicPackageFile,
  inspectAcademicCompetencyFile, inspectAcademicPackageFile, publishAcademicPackage,
  setAcademicPackageCompetencies, updateAcademicPackage,
} from '../services/academicRplService'

/*
 * مكتبة الفجوات الأكاديمية — governing the academic gap library.
 *
 * WHAT THIS SCREEN IS FOR NOW.
 *
 * It used to author module content in forms. It no longer does: owner decision
 * 4 made bulk JSON the official intake, and with twelve schools, ~144 packages
 * and well over a thousand modules ahead, form entry was never going to be it.
 * What is left is the part a person must still decide, and four jobs:
 *
 *   1. SCHOOLS      — create and approve them. A school carries TWO codes and
 *                     they are different codes; see twoCodesBody below.
 *   2. PACKAGES     — identity, the competency mapping, publication, deletion.
 *                     Modules are shown READ-ONLY: they arrive with the JSON.
 *   3. COMPETENCIES — read-only, with placeholders marked, because a placeholder
 *                     cannot carry a published package and the author needs to
 *                     know that before trying.
 *   4. IMPORT       — inspect, read the report, then import.
 *
 * ADDRESSED BY CODE. Packages are LD-001, not #37. That is the identity an
 * academic cites, and it is what the server binds on.
 *
 * WHY THE FIVE PUBLISH REFUSALS EACH GET THEIR OWN SENTENCE. The server answers
 * a refused publish with a machine-readable `error` code precisely so the author
 * can be told what to fix. Collapsing them into one "could not publish" toast
 * throws away the only useful part of the answer and sends somebody hunting.
 *
 * WHY WARNINGS LOOK DIFFERENT FROM ERRORS. A warning never blocks an import. If
 * warnings are painted as failures, authors learn to ignore the whole report —
 * and then they ignore the errors too.
 *
 * THE CAUTIONARY TALE IS ON THE OTHER PATHWAY. 93 of the 100 professional CGP
 * packages declare no competencies, so its gap engine finds almost nothing and
 * every plan looks broken for a reason invisible from the plan. So the counts
 * that explain a thin plan are at the top of this screen, and where a number is
 * zero the readiness panel says what the work is rather than leaving a nought.
 */

/* eslint-disable-next-line react-refresh/only-export-components -- exported so the
   test can prove all three language blocks expose the same key set. Copy lookup
   here is a WHOLE-OBJECT fallback (COPY[language] || COPY.en), with no per-key
   rescue, so a key present in en and missing in nl renders the string
   "undefined" — this codebase has already shipped a blank Dutch card that way. */
export const COPY = {
  ar: {
    title: 'مكتبة سد الفجوات الأكاديمية',
    subtitle:
      'الحقائب التي يمكن لأي خطة سد فجوات أن توصي بها. ما لا تُعلنه الحقيبة لا يراه المحرك، ولن يُقترح على أي متقدم.',

    readiness: 'جاهزية المكتبة',
    schoolsApproved: 'مدرسة معرفية معتمدة من',
    packagesPublished: 'حقيبة منشورة من',
    modulesPublished: 'وحدة تعليمية منشورة من',
    packagesDeclaringNone: 'حقيبة لا تُعلن أي كفاءة',
    orphanCompetencies: 'كفاءات لا تطلبها أي حقيبة',
    workNoSchools: 'لا توجد مدرسة معرفية بعد. أنشئ واحدة أدناه — كل حقيبة تنتمي إلى مدرسة واحدة.',
    workNoSchoolApproved:
      'لا توجد مدرسة معتمدة، فلا يمكن نشر أي حقيبة. اعتمد مدرسة أدناه بمسوّغ مكتوب.',
    workNoPackages: 'المكتبة فارغة. استورد ملف حقيبة GPS أدناه، أو أنشئ مسودة حقيبة يدويًا.',
    workNoPublished:
      'لا شيء منشور، فلا يرى المحرك شيئًا. لا تُنشر الحقيبة إلا بمدرسة معتمدة وربط كفاءات ووحدة تعليمية واحدة على الأقل.',
    workDeclaringNone: 'هذه الحقائب غير مرئية للمحرك حتى تُعلن الكفاءات التي تتطلبها. اربطها أدناه.',
    workNoModules:
      'لا توجد وحدات تعليمية. الوحدات تصل مع ملف JSON للحقيبة — وحقيبة بلا وحدات لا يمكن نشرها.',
    workOrphans: 'لا شيء في الكتالوج قادر على إغلاقها. إمّا أن تطلبها حقيبة، وإمّا ألّا تبقى فعّالة.',

    schools: 'المدارس المعرفية',
    schoolsHint: 'كل حقيبة تنتمي إلى مدرسة معرفية واحدة (المادة السابعة).',
    twoCodesTitle: 'للمدرسة رمزان، وهما ليسا الرمز نفسه',
    twoCodesBody:
      'رمز المدرسة يسبق رموز حقائبها: LD تُنتج LD-001. وبادئة الكفاءات تسبق رموز كفاءاتها: المدرسة نفسها هي LC. يختلف الرمزان في سبع من المدارس الاثنتي عشرة، لذلك لا يُشتق أحدهما من الآخر أبدًا — أدخل الاثنين.',
    addSchool: 'أضف مدرسة معرفية',
    schoolCode: 'رمز المدرسة (يسبق رموز الحقائب)',
    schoolCodeHint: 'مثال: LD — حقائب هذه المدرسة هي LD-001 و LD-002…',
    competencyPrefix: 'بادئة الكفاءات (تسبق رموز الكفاءات)',
    competencyPrefixHint: 'مثال: LC — كفاءات هذه المدرسة هي LC-001 و LC-002… وهي فريدة بين كل المدارس.',
    nameAr: 'الاسم (بالعربية)',
    nameEn: 'الاسم (بالإنجليزية)',
    nameNl: 'الاسم (بالهولندية)',
    packagesCount: 'حقيبة',
    noSchools: 'لم تُنشأ أي مدرسة معرفية بعد.',
    basis: 'مسوّغ الاعتماد',
    basisPlaceholder: 'على أي أساس تُعتمد هذه المدرسة المعرفية، ومن راجعها؟ (20 حرفًا على الأقل)',
    basisHint: 'يُسجَّل في أثر التدقيق باسمك. اعتماد المدرسة هو ما يسمح بنشر حقائبها.',
    approve: 'اعتماد المدرسة',

    packages: 'الحقائب',
    packagesHint:
      'الاستيراد المجمّع بصيغة JSON هو المدخل الرسمي. لا يُؤلَّف محتوى الوحدات هنا؛ هذه الشاشة تحكم الهوية وربط الكفاءات والنشر.',
    addPackage: 'أضف حقيبة',
    editPackage: 'تعديل الهوية',
    packageCode: 'رمز الحقيبة',
    packageCodeHint: 'يجب أن يبدأ برمز مدرسته، مثل LD-001 للمدرسة LD.',
    school: 'المدرسة المعرفية',
    chooseSchool: '— اختر مدرسة —',
    qualificationLevel: 'المستوى المؤهِّل',
    academicPath: 'المسار الأكاديمي',
    notSet: '— غير محدد —',
    version: 'الإصدار',
    creditHours: 'الساعات المعتمدة',
    learningHours: 'ساعات التعلّم',
    sortOrder: 'ترتيب العرض',
    serves: 'تخدم',
    noPackages: 'لم تُؤلَّف أي حقيبة بعد.',
    declaresNothing: 'لا تُعلن أي كفاءة — غير مرئية للمحرك',
    requires: 'تتطلب',
    mapCompetencies: 'ربط الكفاءات',
    hideMapping: 'إغلاق الربط',
    requiredLevel: 'المستوى المطلوب',
    classification: 'التصنيف',
    weight: 'الوزن',
    notRequired: '— غير مطلوبة —',
    saveMapping: 'حفظ الربط',
    mappingHint:
      'المستوى المطلوب إلزامي لكل كفاءة تتطلبها الحقيبة: الكفاءة نفسها معيار مختلف في الدبلوم وفي الدكتوراه. ولم تعد التغطية تُضبط هنا — فهي خاصية للوحدة، والوحدات تصل عبر استيراد JSON.',
    modulesLabel: 'الوحدات التعليمية',
    modulesHint: 'للقراءة فقط. تُؤلَّف الوحدات في ملف JSON للحقيبة وتدخل بالاستيراد، لا بالنموذج.',
    showModules: 'عرض الوحدات',
    hideModules: 'إخفاء الوحدات',
    noModules: 'لا توجد وحدات. لا يمكن نشر هذه الحقيبة حتى يحمل ملفها وحدة واحدة على الأقل.',
    publish: 'نشر',
    publishedOk: 'نُشرت الحقيبة وأصبحت مرئية لمحرك الفجوات.',
    schoolApprovedOk: 'اعتُمدت المدرسة المعرفية، وصار بإمكان حقائبها أن تُنشر.',
    publishedLocked: 'منشورة، وقد تظهر بالفعل في خطة يعمل عليها متقدم.',
    remove: 'حذف',
    removeConfirm: 'حذف هذه الحقيبة وكل وحدة بداخلها؟ لا يمكن التراجع عن ذلك.',
    save: 'حفظ',
    cancel: 'إلغاء',

    levels: {
      professional_diploma: 'الدبلوم المهني',
      professional_master: 'الماجستير المهني',
      professional_doctorate: 'الدكتوراه المهنية',
    },
    classifications: {
      core: 'أساسية',
      supporting: 'مساندة',
      advanced: 'متقدمة',
      elective: 'اختيارية',
    },
    statuses: {
      draft: 'مسودة',
      approved: 'معتمدة',
      published: 'منشورة',
      archived: 'مؤرشفة',
    },
    publishErrors: {
      ACADEMIC_PACKAGE_NO_SCHOOL:
        'هذه الحقيبة بلا مدرسة معرفية. أسندها إلى مدرسة قبل النشر — المادة السابعة تُلزم كل حقيبة بالانتماء إلى واحدة.',
      ACADEMIC_PACKAGE_SCHOOL_NOT_APPROVED:
        'مدرستها المعرفية ما زالت مسودة. اعتمد المدرسة أعلاه بمسوّغ مكتوب، ثم انشر.',
      ACADEMIC_PACKAGE_DECLARES_NOTHING:
        'هذه الحقيبة لا تُعلن أي كفاءة، فلن تصل إليها أي خطة فجوات. سجّل ربط الكفاءات أولًا.',
      ACADEMIC_PACKAGE_PLACEHOLDER_COMPETENCY:
        'تستند إلى كفاءة نائبة أو غير معتمدة. الكفاءة النائبة (9xx) تنوب عن إطار لم يؤلّفه أحد؛ اعتمد الكفاءة الحقيقية، أو اربط الحقيبة بكفاءة معتمدة.',
      ACADEMIC_SCHOOL_ALREADY_APPROVED:
        'هذه المدرسة معتمدة بالفعل. أعد تحميل الصفحة — الشاشة تعرض حالة قديمة.',
      ACADEMIC_PACKAGE_HAS_NO_MODULES:
        'هذه الحقيبة لا تحمل وحدات تعليمية. استورد ملفها ومعه وحدة واحدة على الأقل — الوحدة هي أصغر وحدة قابلة للتقييم.',
    },

    competencies: 'الكفاءات',
    competenciesHint:
      'للقراءة فقط هنا. يُؤلَّف الإطار في شاشة إطار الكفاءات وعبر استيراد حزم الكفاءات.',
    placeholder: 'نائبة',
    placeholderNote:
      'الكفاءة النائبة تنوب عن محتوى إطار لم يؤلّفه أحد. قد تُحتسب في الجاهزية، لكن أي حقيبة تتطلبها لا يمكن نشرها أبدًا.',
    noCompetencies: 'لا توجد كفاءة فعّالة بعد.',

    importTitle: 'الاستيراد المجمّع بصيغة JSON',
    importHint:
      'المدخل الرسمي (قرار المالك الرابع). افحص أولًا: التشغيل التجريبي لا يكتب شيئًا ويُبلِغ عن كل مشكلات الملف دفعة واحدة.',
    importKind: 'نوع الملف',
    kindPackage: 'ملف حقيبة GPS',
    kindCompetency: 'حزمة كفاءات GCS',
    uploadLabel: 'اختر ملف JSON',
    pasteLabel: 'أو الصق محتوى JSON',
    pastePlaceholder: 'الصق هنا محتوى ملف الحقيبة أو حزمة الكفاءات.',
    inspect: 'فحص (لا يكتب شيئًا)',
    inspecting: 'جارٍ الفحص…',
    runImport: 'استيراد',
    importing: 'جارٍ الاستيراد…',
    inspectFirst: 'افحص الملف أولًا. لا يُتاح الاستيراد إلا بعد فحص خالٍ من الأخطاء.',
    invalidJson: 'هذا ليس JSON صالحًا، فلا شيء يمكن فحصه بعد. راجع الملف والصقه من جديد.',
    emptyFile: 'لا شيء لفحصه — الصق محتوى JSON أو اختر ملفًا أولًا.',
    reportTitle: 'تقرير الفحص',
    reportValid: 'لا مشكلات مانعة. يمكن استيراد هذا الملف.',
    reportInvalid: 'لا يمكن استيراد هذا الملف قبل إصلاح المشكلات أدناه.',
    schemaErrors: 'أخطاء المخطط — الملف لا يطابق العقد المنشور',
    referentialErrors: 'أخطاء مرجعية — الملف سليم البنية لكنه يشير إلى شيء غير موجود',
    warnings: 'تنبيهات — قابل للاستيراد، لكنها تستحق الاطلاع',
    warningsNote: 'التنبيهات لا تمنع الاستيراد أبدًا. تُعرض كي لا يمر شيء دون انتباه، لا لإيقافك.',
    summary: 'الخلاصة',
    importRefused: 'رُفض الاستيراد ولم يُكتب أي شيء. التقرير الكامل أدناه.',
    importDone: 'استُورد كمسودة. النشر خطوة منفصلة ومحكومة.',
  },

  en: {
    title: 'Academic gap library',
    subtitle:
      'The packages every academic gap plan is able to recommend. What a package does not declare, the engine cannot see — and no applicant will ever be offered it.',

    readiness: 'Library readiness',
    schoolsApproved: 'knowledge schools approved of',
    packagesPublished: 'packages published of',
    modulesPublished: 'learning modules published of',
    packagesDeclaringNone: 'packages declare no competencies',
    orphanCompetencies: 'Competencies no package requires',
    workNoSchools: 'No knowledge school exists yet. Create one below — every package must belong to one.',
    workNoSchoolApproved:
      'No school is approved yet, so no package can be published. Approve one below with a written basis.',
    workNoPackages: 'The library is empty. Import a GPS package file below, or create a draft package by hand.',
    workNoPublished:
      'Nothing is published, so the gap engine can see nothing. A package publishes only with an approved school, a competency mapping and at least one module.',
    workDeclaringNone:
      'These packages are invisible to the engine until they declare the competencies they require. Map them below.',
    workNoModules:
      'No learning modules exist. Modules arrive with the package JSON — a package carrying none cannot be published.',
    workOrphans:
      'Nothing in the catalogue can close these. Either a package must require them, or they should not be active.',

    schools: 'Knowledge schools',
    schoolsHint: 'Every package belongs to exactly one knowledge school (article 7).',
    twoCodesTitle: 'A school has two codes, and they are not the same code',
    twoCodesBody:
      'The school code prefixes its PACKAGE codes: LD gives LD-001. The competency prefix prefixes its COMPETENCY codes: the same school is LC. They differ in seven of the twelve schools, so neither is ever derived from the other — enter both.',
    addSchool: 'Add a knowledge school',
    schoolCode: 'School code (prefixes package codes)',
    schoolCodeHint: 'Example: LD — this school’s packages are LD-001, LD-002…',
    competencyPrefix: 'Competency prefix (prefixes competency codes)',
    competencyPrefixHint:
      'Example: LC — this school’s competencies are LC-001, LC-002… Unique across every school.',
    nameAr: 'Name (Arabic)',
    nameEn: 'Name (English)',
    nameNl: 'Name (Dutch)',
    packagesCount: 'packages',
    noSchools: 'No knowledge school has been created yet.',
    basis: 'Basis for approval',
    basisPlaceholder:
      'On what basis is this knowledge school approved, and who reviewed it? (at least 20 characters)',
    basisHint:
      'Recorded in the audit trail under your name. An approved school is what allows its packages to be published.',
    approve: 'Approve school',

    packages: 'Packages',
    packagesHint:
      'Bulk JSON import is the official intake. Module content is not authored here; this screen governs identity, competency mapping and publication.',
    addPackage: 'Add a package',
    editPackage: 'Edit identity',
    packageCode: 'Package code',
    packageCodeHint: 'Must begin with its school’s code, e.g. LD-001 for school LD.',
    school: 'Knowledge school',
    chooseSchool: '— choose a school —',
    qualificationLevel: 'Qualification level',
    academicPath: 'Academic path',
    notSet: '— not set —',
    version: 'Version',
    creditHours: 'Credit hours',
    learningHours: 'Learning hours',
    sortOrder: 'Sort order',
    serves: 'Serves',
    noPackages: 'No package has been authored yet.',
    declaresNothing: 'Declares no competencies — invisible to the engine',
    requires: 'Requires',
    mapCompetencies: 'Map competencies',
    hideMapping: 'Close mapping',
    requiredLevel: 'Required level',
    classification: 'Classification',
    weight: 'Weight',
    notRequired: '— not required —',
    saveMapping: 'Save mapping',
    mappingHint:
      'A required level is mandatory for every competency the package requires: the same competency is a different bar at diploma and at doctorate. Coverage is no longer set here — it belongs to the module, and modules arrive by JSON import.',
    modulesLabel: 'Learning modules',
    modulesHint: 'Read-only. Modules are authored in the package JSON and enter by import, never by form.',
    showModules: 'Show modules',
    hideModules: 'Hide modules',
    noModules: 'No modules. This package cannot be published until its JSON carries at least one.',
    publish: 'Publish',
    publishedOk: 'Package published and now visible to the gap engine.',
    schoolApprovedOk: 'Knowledge school approved. Its packages can now be published.',
    publishedLocked: 'Published, and may already appear in a plan an applicant is working through.',
    remove: 'Delete',
    removeConfirm: 'Delete this package and every module inside it? This cannot be undone.',
    save: 'Save',
    cancel: 'Cancel',

    levels: {
      professional_diploma: 'Professional Diploma',
      professional_master: 'Professional Master',
      professional_doctorate: 'Professional Doctorate',
    },
    classifications: {
      core: 'Core',
      supporting: 'Supporting',
      advanced: 'Advanced',
      elective: 'Elective',
    },
    statuses: {
      draft: 'Draft',
      approved: 'Approved',
      published: 'Published',
      archived: 'Archived',
    },
    publishErrors: {
      ACADEMIC_PACKAGE_NO_SCHOOL:
        'This package has no knowledge school. Assign one before publishing — article 7 requires every package to belong to a school.',
      ACADEMIC_PACKAGE_SCHOOL_NOT_APPROVED:
        'Its knowledge school is still a draft. Approve the school above, with a written basis, and then publish.',
      ACADEMIC_PACKAGE_DECLARES_NOTHING:
        'This package declares no competencies, so no gap plan could ever reach it. Record its competency mapping first.',
      ACADEMIC_PACKAGE_PLACEHOLDER_COMPETENCY:
        'It rests on a placeholder or unapproved competency. A reserved 9xx placeholder stands in for framework nobody has authored — approve the real competency, or map this package to one that is approved.',
      ACADEMIC_SCHOOL_ALREADY_APPROVED:
        'This school is already approved. Reload the page — this screen is showing a stale state.',
      ACADEMIC_PACKAGE_HAS_NO_MODULES:
        'This package carries no learning modules. Import its JSON with at least one module — the module is the smallest assessable unit.',
    },

    competencies: 'Competencies',
    competenciesHint:
      'Read-only here. The framework is authored on the competency framework screen and by competency bundle import.',
    placeholder: 'Placeholder',
    placeholderNote:
      'A placeholder stands in for framework content nobody has authored. Readiness may score against it, but a package that requires one can never be published.',
    noCompetencies: 'No active competency exists yet.',

    importTitle: 'Bulk JSON import',
    importHint:
      'The official intake (owner decision 4). Inspect first: the dry run writes nothing and reports every problem in the file at once.',
    importKind: 'File type',
    kindPackage: 'GPS package file',
    kindCompetency: 'GCS competency bundle',
    uploadLabel: 'Choose a JSON file',
    pasteLabel: 'Or paste the JSON',
    pastePlaceholder: 'Paste the contents of the package or competency bundle JSON here.',
    inspect: 'Inspect (writes nothing)',
    inspecting: 'Inspecting…',
    runImport: 'Import',
    importing: 'Importing…',
    inspectFirst: 'Inspect the file first. Import is offered only once an inspection came back clean.',
    invalidJson: 'That is not valid JSON, so there is nothing to inspect yet. Check the file and paste it again.',
    emptyFile: 'Nothing to inspect — paste the JSON or choose a file first.',
    reportTitle: 'Inspection report',
    reportValid: 'No blocking problems. This file can be imported.',
    reportInvalid: 'This file cannot be imported until the problems below are fixed.',
    schemaErrors: 'Schema errors — the file does not match the published contract',
    referentialErrors: 'Referential errors — the file is well-formed but points at something that is not there',
    warnings: 'Warnings — importable, but worth seeing',
    warningsNote:
      'Warnings never block an import. They are listed so nothing passes unnoticed, not to stop you.',
    summary: 'Summary',
    importRefused: 'The import was refused and nothing was written. The full report is below.',
    importDone: 'Imported as a draft. Publishing it is a separate, governed step.',
  },

  nl: {
    title: 'Academische hiatenbibliotheek',
    subtitle:
      'De pakketten die elk academisch hiatenplan kan aanbevelen. Wat een pakket niet verklaart, ziet de engine niet — en wordt nooit aan een kandidaat aangeboden.',

    readiness: 'Gereedheid van de bibliotheek',
    schoolsApproved: 'kennisscholen goedgekeurd van',
    packagesPublished: 'pakketten gepubliceerd van',
    modulesPublished: 'leermodules gepubliceerd van',
    packagesDeclaringNone: 'pakketten verklaren geen enkele competentie',
    orphanCompetencies: 'Competenties die geen enkel pakket vereist',
    workNoSchools: 'Er bestaat nog geen kennisschool. Maak er hieronder een — elk pakket hoort bij één school.',
    workNoSchoolApproved:
      'Geen enkele school is goedgekeurd, dus geen enkel pakket kan worden gepubliceerd. Keur er hieronder een goed met een schriftelijke grondslag.',
    workNoPackages:
      'De bibliotheek is leeg. Importeer hieronder een GPS-pakketbestand of maak handmatig een conceptpakket.',
    workNoPublished:
      'Er is niets gepubliceerd, dus de engine ziet niets. Een pakket publiceert alleen met een goedgekeurde school, een competentiekoppeling en ten minste één module.',
    workDeclaringNone:
      'Deze pakketten zijn onzichtbaar voor de engine totdat zij verklaren welke competenties zij vereisen. Koppel ze hieronder.',
    workNoModules:
      'Er bestaan geen leermodules. Modules komen mee met de pakket-JSON — een pakket zonder modules kan niet worden gepubliceerd.',
    workOrphans:
      'Niets in de catalogus kan deze sluiten. Ofwel moet een pakket ze vereisen, ofwel horen ze niet actief te zijn.',

    schools: 'Kennisscholen',
    schoolsHint: 'Elk pakket hoort bij precies één kennisschool (artikel 7).',
    twoCodesTitle: 'Een school heeft twee codes, en dat is niet dezelfde code',
    twoCodesBody:
      'De schoolcode gaat vooraf aan haar PAKKETcodes: LD geeft LD-001. Het competentievoorvoegsel gaat vooraf aan haar COMPETENTIEcodes: dezelfde school is LC. Zij verschillen in zeven van de twaalf scholen, dus de een wordt nooit uit de ander afgeleid — voer beide in.',
    addSchool: 'Kennisschool toevoegen',
    schoolCode: 'Schoolcode (gaat vooraf aan pakketcodes)',
    schoolCodeHint: 'Voorbeeld: LD — de pakketten van deze school zijn LD-001, LD-002…',
    competencyPrefix: 'Competentievoorvoegsel (gaat vooraf aan competentiecodes)',
    competencyPrefixHint:
      'Voorbeeld: LC — de competenties van deze school zijn LC-001, LC-002… Uniek over alle scholen.',
    nameAr: 'Naam (Arabisch)',
    nameEn: 'Naam (Engels)',
    nameNl: 'Naam (Nederlands)',
    packagesCount: 'pakketten',
    noSchools: 'Er is nog geen kennisschool aangemaakt.',
    basis: 'Grondslag voor goedkeuring',
    basisPlaceholder:
      'Op welke grondslag wordt deze kennisschool goedgekeurd, en wie heeft haar beoordeeld? (minimaal 20 tekens)',
    basisHint:
      'Wordt op uw naam vastgelegd in het audittraject. Een goedgekeurde school is wat publicatie van haar pakketten mogelijk maakt.',
    approve: 'School goedkeuren',

    packages: 'Pakketten',
    packagesHint:
      'Bulk-JSON-import is de officiële invoerweg. Modulinhoud wordt hier niet geschreven; dit scherm beheert identiteit, competentiekoppeling en publicatie.',
    addPackage: 'Pakket toevoegen',
    editPackage: 'Identiteit bewerken',
    packageCode: 'Pakketcode',
    packageCodeHint: 'Moet beginnen met de code van de school, bijv. LD-001 voor school LD.',
    school: 'Kennisschool',
    chooseSchool: '— kies een school —',
    qualificationLevel: 'Kwalificatieniveau',
    academicPath: 'Academisch traject',
    notSet: '— niet ingesteld —',
    version: 'Versie',
    creditHours: 'Studiepunturen',
    learningHours: 'Leeruren',
    sortOrder: 'Sorteervolgorde',
    serves: 'Bedient',
    noPackages: 'Er is nog geen pakket geschreven.',
    declaresNothing: 'Verklaart geen competenties — onzichtbaar voor de engine',
    requires: 'Vereist',
    mapCompetencies: 'Competenties koppelen',
    hideMapping: 'Koppeling sluiten',
    requiredLevel: 'Vereist niveau',
    classification: 'Classificatie',
    weight: 'Weging',
    notRequired: '— niet vereist —',
    saveMapping: 'Koppeling opslaan',
    mappingHint:
      'Een vereist niveau is verplicht voor elke competentie die het pakket vereist: dezelfde competentie is een andere lat bij diploma en bij doctoraat. Dekking wordt hier niet meer ingesteld — die hoort bij de module, en modules komen binnen via JSON-import.',
    modulesLabel: 'Leermodules',
    modulesHint:
      'Alleen-lezen. Modules worden in de pakket-JSON geschreven en komen binnen via import, nooit via een formulier.',
    showModules: 'Modules tonen',
    hideModules: 'Modules verbergen',
    noModules: 'Geen modules. Dit pakket kan niet worden gepubliceerd tot de JSON er ten minste één bevat.',
    publish: 'Publiceren',
    publishedOk: 'Pakket gepubliceerd en nu zichtbaar voor de hiatenengine.',
    schoolApprovedOk: 'Kennisschool goedgekeurd. Haar pakketten kunnen nu worden gepubliceerd.',
    publishedLocked: 'Gepubliceerd, en mogelijk al onderdeel van een plan waaraan een kandidaat werkt.',
    remove: 'Verwijderen',
    removeConfirm: 'Dit pakket en elke module erin verwijderen? Dit kan niet ongedaan worden gemaakt.',
    save: 'Opslaan',
    cancel: 'Annuleren',

    levels: {
      professional_diploma: 'Professioneel diploma',
      professional_master: 'Professionele master',
      professional_doctorate: 'Professioneel doctoraat',
    },
    classifications: {
      core: 'Kern',
      supporting: 'Ondersteunend',
      advanced: 'Gevorderd',
      elective: 'Keuze',
    },
    statuses: {
      draft: 'Concept',
      approved: 'Goedgekeurd',
      published: 'Gepubliceerd',
      archived: 'Gearchiveerd',
    },
    publishErrors: {
      ACADEMIC_PACKAGE_NO_SCHOOL:
        'Dit pakket heeft geen kennisschool. Wijs er een toe vóór publicatie — artikel 7 vereist dat elk pakket bij een school hoort.',
      ACADEMIC_PACKAGE_SCHOOL_NOT_APPROVED:
        'De kennisschool is nog een concept. Keur de school hierboven goed met een schriftelijke grondslag en publiceer daarna.',
      ACADEMIC_PACKAGE_DECLARES_NOTHING:
        'Dit pakket verklaart geen competenties, dus geen enkel hiatenplan zou het ooit bereiken. Leg eerst de competentiekoppeling vast.',
      ACADEMIC_PACKAGE_PLACEHOLDER_COMPETENCY:
        'Het steunt op een placeholder of een niet-goedgekeurde competentie. Een gereserveerde 9xx-placeholder staat voor kaderinhoud die niemand heeft geschreven — keur de echte competentie goed, of koppel dit pakket aan een goedgekeurde.',
      ACADEMIC_SCHOOL_ALREADY_APPROVED:
        'Deze school is al goedgekeurd. Herlaad de pagina — dit scherm toont een verouderde staat.',
      ACADEMIC_PACKAGE_HAS_NO_MODULES:
        'Dit pakket bevat geen leermodules. Importeer de JSON met ten minste één module — de module is de kleinste toetsbare eenheid.',
    },

    competencies: 'Competenties',
    competenciesHint:
      'Hier alleen-lezen. Het kader wordt geschreven op het competentiekaderscherm en via import van een competentiebundel.',
    placeholder: 'Placeholder',
    placeholderNote:
      'Een placeholder staat voor kaderinhoud die niemand heeft geschreven. Gereedheid mag ertegen scoren, maar een pakket dat er een vereist kan nooit worden gepubliceerd.',
    noCompetencies: 'Er bestaat nog geen actieve competentie.',

    importTitle: 'Bulk-JSON-import',
    importHint:
      'De officiële invoerweg (eigenaarsbesluit 4). Inspecteer eerst: de proefrun schrijft niets en meldt alle problemen in het bestand tegelijk.',
    importKind: 'Bestandstype',
    kindPackage: 'GPS-pakketbestand',
    kindCompetency: 'GCS-competentiebundel',
    uploadLabel: 'Kies een JSON-bestand',
    pasteLabel: 'Of plak de JSON',
    pastePlaceholder: 'Plak hier de inhoud van het pakket- of competentiebundelbestand.',
    inspect: 'Inspecteren (schrijft niets)',
    inspecting: 'Inspecteren…',
    runImport: 'Importeren',
    importing: 'Importeren…',
    inspectFirst: 'Inspecteer het bestand eerst. Import wordt pas aangeboden na een schone inspectie.',
    invalidJson: 'Dit is geen geldige JSON, dus er valt nog niets te inspecteren. Controleer het bestand en plak het opnieuw.',
    emptyFile: 'Niets te inspecteren — plak de JSON of kies eerst een bestand.',
    reportTitle: 'Inspectierapport',
    reportValid: 'Geen blokkerende problemen. Dit bestand kan worden geïmporteerd.',
    reportInvalid: 'Dit bestand kan niet worden geïmporteerd tot de problemen hieronder zijn opgelost.',
    schemaErrors: 'Schemafouten — het bestand voldoet niet aan het gepubliceerde contract',
    referentialErrors: 'Referentiefouten — het bestand is welgevormd maar verwijst naar iets dat er niet is',
    warnings: 'Waarschuwingen — importeerbaar, maar de moeite van het lezen waard',
    warningsNote:
      'Waarschuwingen blokkeren een import nooit. Ze staan er zodat niets ongemerkt passeert, niet om u tegen te houden.',
    summary: 'Samenvatting',
    importRefused: 'De import is geweigerd en er is niets weggeschreven. Het volledige rapport staat hieronder.',
    importDone: 'Geïmporteerd als concept. Publiceren is een aparte, beheerde stap.',
  },
}

const LEVEL_CODES = ['professional_diploma', 'professional_master', 'professional_doctorate']
const CLASSIFICATION_CODES = ['core', 'supporting', 'advanced', 'elective']

const EMPTY_PACKAGE = {
  editingCode: null,
  code: '',
  academic_rpl_school_id: '',
  name: { ar: '', en: '', nl: '' },
  qualification_level: '',
  academic_path: '',
  version: '',
  credit_hours: '',
  learning_hours: '',
  serves_diploma: false,
  serves_master: false,
  serves_doctorate: false,
  sort_order: '',
}

/** Strips the empties so a blank optional field is absent, not null. */
function packagePayload(draft) {
  const name = {}
  Object.entries(draft.name).forEach(([lang, value]) => {
    if (String(value).trim() !== '') name[lang] = String(value).trim()
  })

  const payload = {
    code: draft.code.trim(),
    academic_rpl_school_id: Number(draft.academic_rpl_school_id),
    name,
    serves_diploma: !!draft.serves_diploma,
    serves_master: !!draft.serves_master,
    serves_doctorate: !!draft.serves_doctorate,
  }

  if (draft.qualification_level) payload.qualification_level = draft.qualification_level
  if (draft.academic_path) payload.academic_path = draft.academic_path
  if (String(draft.version).trim() !== '') payload.version = String(draft.version).trim()
  if (String(draft.credit_hours).trim() !== '') payload.credit_hours = Number(draft.credit_hours)
  if (String(draft.learning_hours).trim() !== '') payload.learning_hours = Number(draft.learning_hours)
  if (String(draft.sort_order).trim() !== '') payload.sort_order = Number(draft.sort_order)

  return payload
}

export default function AcademicLibraryPage() {
  const language = getAdminLanguage()
  const copy = COPY[language] || COPY.en

  const [state, setState] = useState({ loading: true, error: '', data: null })
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  const [schoolDraft, setSchoolDraft] = useState(null)
  const [basisDrafts, setBasisDrafts] = useState({})

  const [packageDraft, setPackageDraft] = useState(null)
  const [mappingFor, setMappingFor] = useState(null)
  const [mapping, setMapping] = useState({})
  const [openModules, setOpenModules] = useState({})
  // Keyed by package code: the refusal belongs beside the package it refused,
  // which is where the author is looking when it happens.
  const [refusals, setRefusals] = useState({})

  const [importKind, setImportKind] = useState('package')
  const [importText, setImportText] = useState('')
  const [report, setReport] = useState(null)
  const [importNotice, setImportNotice] = useState(null)
  const [importBusy, setImportBusy] = useState('')

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const payload = await fetchAcademicLibrary()
      setState({ loading: false, error: '', data: payload?.data || null })
    } catch (error) {
      setState({ loading: false, error: readApiError(error), data: null })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const withBusy = useCallback(
    async (action, successMessage = '') => {
      setBusy(true)
      setNotice(null)
      try {
        await action()
        if (successMessage) setNotice({ tone: 'success', text: successMessage })
        await load()
        return true
      } catch (error) {
        setNotice({ tone: 'error', text: readApiError(error) })
        return false
      } finally {
        setBusy(false)
      }
    },
    [load],
  )

  /*
   * Publish does not go through withBusy, and that is the point of it.
   *
   * The server names its refusal — ACADEMIC_PACKAGE_HAS_NO_MODULES and the four
   * others — so the author can be told which of five different things to fix.
   * readApiError would flatten all five into one sentence, and in Arabic or
   * Dutch into a generic one.
   */
  async function publish(pkg) {
    setBusy(true)
    setNotice(null)
    setRefusals((current) => ({ ...current, [pkg.code]: '' }))
    try {
      await publishAcademicPackage(pkg.code)
      setNotice({ tone: 'success', text: copy.publishedOk })
      await load()
    } catch (error) {
      const code = error?.response?.data?.error
      setRefusals((current) => ({
        ...current,
        [pkg.code]: copy.publishErrors[code] || readApiError(error),
      }))
    } finally {
      setBusy(false)
    }
  }

  /*
   * School approval takes the same route as publish, for the same reason.
   *
   * It refuses with ACADEMIC_SCHOOL_ALREADY_APPROVED, which is a 422 carrying an
   * `error` code and no `errors` bag — the shape readApiError degrades to the
   * raw English message in English and to a generic sentence in Arabic and
   * Dutch. Naming it here keeps the two governed actions on this screen
   * consistent; fixing publish and leaving this one is how the next reader
   * concludes the named-refusal pattern was optional.
   *
   * Keyed under `school:<id>` in the same refusals map rather than a second
   * piece of state, so a refusal cannot be shown against the wrong row.
   */
  async function approveSchool(school) {
    const key = `school:${school.id}`
    setBusy(true)
    setNotice(null)
    setRefusals((current) => ({ ...current, [key]: '' }))
    try {
      await approveAcademicSchool(school.id, { basis: (basisDrafts[school.id] || '').trim() })
      setNotice({ tone: 'success', text: copy.schoolApprovedOk })
      await load()
    } catch (error) {
      const code = error?.response?.data?.error
      setRefusals((current) => ({
        ...current,
        [key]: copy.publishErrors[code] || readApiError(error),
      }))
    } finally {
      setBusy(false)
    }
  }

  function openMapping(pkg) {
    const seed = {}
    ;(pkg.competencies || []).forEach((competency) => {
      seed[competency.id] = {
        required_level: competency.pivot?.required_level || '',
        classification: competency.pivot?.classification || '',
        weight: competency.pivot?.weight ?? '',
      }
    })
    setMapping(seed)
    setMappingFor(pkg.code)
  }

  async function saveMapping(pkg) {
    const rows = Object.entries(mapping)
      .filter(([, row]) => row.required_level)
      .map(([id, row]) => {
        const out = { id: Number(id), required_level: row.required_level }
        if (row.classification) out.classification = row.classification
        if (String(row.weight ?? '').trim() !== '') out.weight = Number(row.weight)
        return out
      })

    if (await withBusy(() => setAcademicPackageCompetencies(pkg.code, rows))) {
      setMappingFor(null)
      setMapping({})
    }
  }

  function readFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImportText(String(reader.result || ''))
      setReport(null)
      setImportNotice(null)
    }
    reader.readAsText(file)
  }

  /** Returns the parsed object, or null having already said why not. */
  function parseImportText() {
    if (importText.trim() === '') {
      setImportNotice({ tone: 'error', text: copy.emptyFile })
      return null
    }
    try {
      const parsed = JSON.parse(importText)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setImportNotice({ tone: 'error', text: copy.invalidJson })
        return null
      }
      return parsed
    } catch {
      setImportNotice({ tone: 'error', text: copy.invalidJson })
      return null
    }
  }

  /*
   * A dry run that finds errors is a SUCCESSFUL inspection.
   *
   * The endpoint answers 200 for a file full of problems precisely so the report
   * reaches the author. Treating "your file has errors" as a failed request
   * would show them nothing, which is the one outcome worse than the errors.
   */
  async function inspect() {
    const payload = parseImportText()
    if (!payload) return

    setImportBusy('inspect')
    setImportNotice(null)
    setReport(null)
    try {
      const response = importKind === 'package'
        ? await inspectAcademicPackageFile(payload)
        : await inspectAcademicCompetencyFile(payload)
      setReport(response?.data || null)
    } catch (error) {
      setImportNotice({ tone: 'error', text: readApiError(error) })
    } finally {
      setImportBusy('')
    }
  }

  async function runImport() {
    const payload = parseImportText()
    if (!payload) return

    setImportBusy('import')
    setImportNotice(null)
    try {
      const response = importKind === 'package'
        ? await importAcademicPackageFile(payload)
        : await importAcademicCompetencyFile(payload)
      setReport(response?.data || null)
      setImportNotice({ tone: 'success', text: copy.importDone })
      await load()
    } catch (error) {
      const body = error?.response?.data
      if (body?.error === 'ACADEMIC_IMPORT_REFUSED') {
        // Nothing was written — the import is transactional — so the report is
        // the whole answer, and the author needs every problem at once.
        setReport(body.report || null)
        setImportNotice({ tone: 'error', text: copy.importRefused })
      } else {
        setImportNotice({ tone: 'error', text: readApiError(error) })
      }
    } finally {
      setImportBusy('')
    }
  }

  const data = state.data
  const readiness = data?.readiness
  const schools = data?.schools || []
  const packages = data?.packages || []
  const competencies = data?.competencies || []

  const schemaErrors = report?.schema_errors || []
  const referentialErrors = report?.referential_errors || []
  const warnings = report?.warnings || []

  return (
    <div className="space-y-6">
      <PageHeader title={copy.title} description={copy.subtitle} />

      {state.loading ? (
        <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      ) : null}

      {notice ? (
        <p
          className={`whitespace-pre-line rounded-xl border p-3 text-sm ${
            notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      {/* READINESS — the numbers that explain a thin gap plan. Where one of them
          is zero the panel says what the work is; a bare "0 / 0" is a fact
          nobody can act on. */}
      {readiness ? (
        <Card>
          <CardHeader className="border-b border-[var(--color-border)]">
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-5 w-5" aria-hidden="true" /> {copy.readiness}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-6 text-sm">
            <p className="tabular-nums">
              {readiness.schools_approved} / {readiness.schools_total} {copy.schoolsApproved}
            </p>
            <p className="tabular-nums">
              {readiness.packages_published} / {readiness.packages_total} {copy.packagesPublished}
            </p>
            <p className="tabular-nums">
              {readiness.modules_published} / {readiness.modules_total} {copy.modulesPublished}
            </p>
            <p className={readiness.packages_declaring_none > 0 ? 'tabular-nums text-amber-700' : 'tabular-nums'}>
              {readiness.packages_declaring_none} {copy.packagesDeclaringNone}
            </p>

            {readiness.schools_total === 0 ? (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-900">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {copy.workNoSchools}
              </p>
            ) : readiness.schools_approved === 0 ? (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-900">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {copy.workNoSchoolApproved}
              </p>
            ) : null}

            {readiness.packages_total === 0 ? (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-900">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {copy.workNoPackages}
              </p>
            ) : readiness.packages_published === 0 ? (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-900">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {copy.workNoPublished}
              </p>
            ) : null}

            {readiness.packages_declaring_none > 0 ? (
              <p className="text-amber-700">{copy.workDeclaringNone}</p>
            ) : null}

            {readiness.modules_total === 0 ? (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-900">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {copy.workNoModules}
              </p>
            ) : null}

            {readiness.competencies_with_no_package?.length ? (
              // The other half of the same problem, and invisible from the
              // package list: a competency nothing requires can never be closed.
              <div className="text-amber-700">
                <p>
                  {copy.orphanCompetencies}:{' '}
                  <span className="font-mono text-xs">
                    <bdi>{readiness.competencies_with_no_package.join(', ')}</bdi>
                  </span>
                </p>
                <p className="mt-1">{copy.workOrphans}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* 1 — SCHOOLS (article 7). */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <BookMarked className="h-5 w-5" aria-hidden="true" /> {copy.schools} ({schools.length})
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                setSchoolDraft({ code: '', competency_prefix: '', name: { ar: '', en: '', nl: '' } })
              }
            >
              <Plus size={16} /> {copy.addSchool}
            </Button>
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.schoolsHint}</p>
        </CardHeader>
        <CardContent className="space-y-3 p-6">
          {schoolDraft ? (
            <div className="space-y-4 rounded-xl border border-[var(--color-border)] p-4">
              {/*
                THE DISTINCTION IS EXPLAINED HERE, NOT IN A COMMENT.
                Two codes, seven of twelve schools where they differ, and no
                derivation. Somebody entering their first school has to be able
                to read that off the screen.
              */}
              <div className="rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm">
                <p className="flex items-start gap-2 font-semibold">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {copy.twoCodesTitle}
                </p>
                <p className="mt-1 text-[var(--color-text-muted)]">{copy.twoCodesBody}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label={copy.schoolCode}
                  hint={copy.schoolCodeHint}
                  value={schoolDraft.code}
                  onChange={(event) =>
                    setSchoolDraft((c) => ({ ...c, code: event.target.value.toUpperCase() }))
                  }
                />
                <Input
                  label={copy.competencyPrefix}
                  hint={copy.competencyPrefixHint}
                  maxLength={8}
                  value={schoolDraft.competency_prefix}
                  onChange={(event) =>
                    setSchoolDraft((c) => ({ ...c, competency_prefix: event.target.value.toUpperCase() }))
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label={copy.nameAr}
                  value={schoolDraft.name.ar}
                  onChange={(event) =>
                    setSchoolDraft((c) => ({ ...c, name: { ...c.name, ar: event.target.value } }))
                  }
                />
                <Input
                  label={copy.nameEn}
                  value={schoolDraft.name.en}
                  onChange={(event) =>
                    setSchoolDraft((c) => ({ ...c, name: { ...c.name, en: event.target.value } }))
                  }
                />
                <Input
                  label={copy.nameNl}
                  value={schoolDraft.name.nl}
                  onChange={(event) =>
                    setSchoolDraft((c) => ({ ...c, name: { ...c.name, nl: event.target.value } }))
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={
                    busy
                    || schoolDraft.code.trim() === ''
                    || schoolDraft.competency_prefix.trim() === ''
                    || schoolDraft.name.en.trim() === ''
                  }
                  onClick={async () => {
                    const name = {}
                    Object.entries(schoolDraft.name).forEach(([lang, value]) => {
                      if (String(value).trim() !== '') name[lang] = String(value).trim()
                    })
                    const created = await withBusy(() =>
                      createAcademicSchool({
                        code: schoolDraft.code.trim(),
                        competency_prefix: schoolDraft.competency_prefix.trim(),
                        name,
                      }),
                    )
                    if (created) setSchoolDraft(null)
                  }}
                >
                  {copy.save}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSchoolDraft(null)}>{copy.cancel}</Button>
              </div>
            </div>
          ) : null}

          {schools.length === 0 && !schoolDraft ? (
            <p className="text-sm text-[var(--color-text-muted)]">{copy.noSchools}</p>
          ) : null}

          {schools.map((school) => (
            <div key={school.id} className="space-y-2 rounded-xl border border-[var(--color-border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs"><bdi>{school.code}</bdi></span>
                  <span className="font-semibold">{localize(school.name, language)}</span>
                  {/* Both codes on the row, so the difference is visible in the
                      list and not only in the create form. */}
                  <span className="font-mono text-xs text-[var(--color-text-muted)]">
                    <bdi>{copy.competencyPrefix}: {school.competency_prefix}</bdi>
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {school.packages_count ?? 0} {copy.packagesCount}
                  </span>
                </span>
                <Badge variant={school.status === 'approved' ? 'success' : 'warning'}>
                  {copy.statuses[school.status] || school.status}
                </Badge>
              </div>

              {school.status !== 'approved' ? (
                <div className="space-y-2">
                  <Textarea
                    label={copy.basis}
                    rows={2}
                    hint={copy.basisHint}
                    placeholder={copy.basisPlaceholder}
                    value={basisDrafts[school.id] || ''}
                    onChange={(event) =>
                      setBasisDrafts((c) => ({ ...c, [school.id]: event.target.value }))
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || (basisDrafts[school.id] || '').trim().length < 20}
                    onClick={() => approveSchool(school)}
                  >
                    <CheckCircle2 size={16} /> {copy.approve}
                  </Button>
                  {refusals[`school:${school.id}`] ? (
                    <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
                      {refusals[`school:${school.id}`]}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 2 — PACKAGES. */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{copy.packages} ({packages.length})</CardTitle>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setPackageDraft({ ...EMPTY_PACKAGE, name: { ar: '', en: '', nl: '' } })}
            >
              <Plus size={16} /> {copy.addPackage}
            </Button>
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.packagesHint}</p>
        </CardHeader>
        <CardContent className="space-y-3 p-6">
          {packageDraft ? (
            <div className="space-y-4 rounded-xl border border-[var(--color-border)] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label={copy.packageCode}
                  hint={copy.packageCodeHint}
                  value={packageDraft.code}
                  onChange={(event) =>
                    setPackageDraft((c) => ({ ...c, code: event.target.value.toUpperCase() }))
                  }
                />
                <Select
                  label={copy.school}
                  value={packageDraft.academic_rpl_school_id}
                  onChange={(event) =>
                    setPackageDraft((c) => ({ ...c, academic_rpl_school_id: event.target.value }))
                  }
                >
                  <option value="">{copy.chooseSchool}</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.code} · {localize(school.name, language)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label={copy.nameAr}
                  value={packageDraft.name.ar}
                  onChange={(event) =>
                    setPackageDraft((c) => ({ ...c, name: { ...c.name, ar: event.target.value } }))
                  }
                />
                <Input
                  label={copy.nameEn}
                  value={packageDraft.name.en}
                  onChange={(event) =>
                    setPackageDraft((c) => ({ ...c, name: { ...c.name, en: event.target.value } }))
                  }
                />
                <Input
                  label={copy.nameNl}
                  value={packageDraft.name.nl}
                  onChange={(event) =>
                    setPackageDraft((c) => ({ ...c, name: { ...c.name, nl: event.target.value } }))
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  label={copy.qualificationLevel}
                  value={packageDraft.qualification_level}
                  onChange={(event) =>
                    setPackageDraft((c) => ({ ...c, qualification_level: event.target.value }))
                  }
                >
                  <option value="">{copy.notSet}</option>
                  {LEVEL_CODES.map((code) => (
                    <option key={code} value={code}>{copy.levels[code]}</option>
                  ))}
                </Select>
                <Select
                  label={copy.academicPath}
                  value={packageDraft.academic_path}
                  onChange={(event) => setPackageDraft((c) => ({ ...c, academic_path: event.target.value }))}
                >
                  <option value="">{copy.notSet}</option>
                  {LEVEL_CODES.map((code) => (
                    <option key={code} value={code}>{copy.levels[code]}</option>
                  ))}
                </Select>
                <Input
                  label={copy.version}
                  value={packageDraft.version}
                  onChange={(event) => setPackageDraft((c) => ({ ...c, version: event.target.value }))}
                />
                <Input
                  label={copy.creditHours}
                  type="number"
                  min="0"
                  value={packageDraft.credit_hours}
                  onChange={(event) => setPackageDraft((c) => ({ ...c, credit_hours: event.target.value }))}
                />
                <Input
                  label={copy.learningHours}
                  type="number"
                  min="0"
                  value={packageDraft.learning_hours}
                  onChange={(event) => setPackageDraft((c) => ({ ...c, learning_hours: event.target.value }))}
                />
                <Input
                  label={copy.sortOrder}
                  type="number"
                  min="0"
                  value={packageDraft.sort_order}
                  onChange={(event) => setPackageDraft((c) => ({ ...c, sort_order: event.target.value }))}
                />
              </div>

              <fieldset className="flex flex-wrap items-center gap-4 text-sm">
                <legend className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                  {copy.serves}
                </legend>
                {LEVEL_CODES.map((code) => {
                  const field = {
                    professional_diploma: 'serves_diploma',
                    professional_master: 'serves_master',
                    professional_doctorate: 'serves_doctorate',
                  }[code]
                  return (
                    <label key={code} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!packageDraft[field]}
                        onChange={(event) =>
                          setPackageDraft((c) => ({ ...c, [field]: event.target.checked }))
                        }
                      />
                      {copy.levels[code]}
                    </label>
                  )
                })}
              </fieldset>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={
                    busy
                    || packageDraft.code.trim() === ''
                    || packageDraft.academic_rpl_school_id === ''
                    || (packageDraft.name.ar.trim() === '' && packageDraft.name.en.trim() === '')
                  }
                  onClick={async () => {
                    const payload = packagePayload(packageDraft)
                    const saved = await withBusy(() =>
                      packageDraft.editingCode
                        ? updateAcademicPackage(packageDraft.editingCode, payload)
                        : createAcademicPackage(payload),
                    )
                    if (saved) setPackageDraft(null)
                  }}
                >
                  {copy.save}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPackageDraft(null)}>{copy.cancel}</Button>
              </div>
            </div>
          ) : null}

          {packages.length === 0 && !packageDraft ? (
            <p className="text-sm text-[var(--color-text-muted)]">{copy.noPackages}</p>
          ) : null}

          {packages.map((pkg) => {
            const declared = pkg.competencies || []
            const isPublished = pkg.status === 'published'
            const modules = pkg.modules || []
            const refusal = refusals[pkg.code]

            return (
              <div key={pkg.code} className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{localize(pkg.name, language)}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span className="font-mono"><bdi>{pkg.code}</bdi></span>
                      <span>{pkg.school ? localize(pkg.school.name, language) : copy.chooseSchool}</span>
                      <span>{copy.levels[pkg.qualification_level] || copy.notSet}</span>
                      <span>{copy.modulesLabel}: {pkg.modules_count ?? modules.length}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {declared.length === 0 ? <Badge variant="danger">{copy.declaresNothing}</Badge> : null}
                    <Badge variant={isPublished ? 'success' : 'warning'}>
                      {copy.statuses[pkg.status] || pkg.status}
                    </Badge>
                  </div>
                </div>

                {declared.length ? (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {copy.requires}:{' '}
                    {declared.map((competency) => (
                      <span key={competency.id} className="me-2">
                        <span className="font-mono"><bdi>{competency.code}</bdi></span>
                        {competency.pivot?.required_level
                          ? ` — ${copy.levels[competency.pivot.required_level] || competency.pivot.required_level}`
                          : ''}
                        {competency.pivot?.classification
                          ? ` / ${copy.classifications[competency.pivot.classification] || competency.pivot.classification}`
                          : ''}
                      </span>
                    ))}
                  </p>
                ) : null}

                {/* MODULES — read-only, because they arrive with the JSON. */}
                <section className="space-y-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setOpenModules((c) => ({ ...c, [pkg.code]: !c[pkg.code] }))}
                  >
                    {openModules[pkg.code] ? copy.hideModules : copy.showModules} ({pkg.modules_count ?? modules.length})
                  </Button>
                  {openModules[pkg.code] ? (
                    <div className="space-y-1 rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm">
                      <p className="text-xs text-[var(--color-text-muted)]">{copy.modulesHint}</p>
                      {modules.length === 0 ? (
                        <p className="text-amber-700">{copy.noModules}</p>
                      ) : (
                        <ol className="space-y-1">
                          {modules.map((module) => (
                            <li key={module.id} className="flex flex-wrap items-center gap-2">
                              <span className="tabular-nums text-xs text-[var(--color-text-muted)]">
                                {module.sequence}
                              </span>
                              <span className="font-mono text-xs"><bdi>{module.code}</bdi></span>
                              <span>{localize(module.name, language)}</span>
                              <Badge variant={module.status === 'published' ? 'success' : 'neutral'}>
                                {copy.statuses[module.status] || module.status}
                              </Badge>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ) : null}
                </section>

                {isPublished ? (
                  <p className="text-xs text-[var(--color-text-muted)]">{copy.publishedLocked}</p>
                ) : (
                  <>
                    {mappingFor === pkg.code ? (
                      <section className="space-y-3 rounded-xl bg-[var(--color-surface-muted)] p-3">
                        <p className="text-xs text-[var(--color-text-muted)]">{copy.mappingHint}</p>
                        {competencies.map((competency) => {
                          const row = mapping[competency.id] || {}
                          return (
                            <div
                              key={competency.id}
                              className="grid gap-2 rounded-lg bg-white p-2 sm:grid-cols-[2fr_1fr_1fr_80px]"
                            >
                              <span className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-mono text-xs"><bdi>{competency.code}</bdi></span>
                                {localize(competency.name, language)}
                                {competency.is_placeholder ? (
                                  <Badge variant="danger">{copy.placeholder}</Badge>
                                ) : null}
                              </span>
                              <Select
                                aria-label={`${copy.requiredLevel} — ${competency.code}`}
                                value={row.required_level || ''}
                                onChange={(event) =>
                                  setMapping((c) => ({
                                    ...c,
                                    [competency.id]: { ...(c[competency.id] || {}), required_level: event.target.value },
                                  }))
                                }
                              >
                                <option value="">{copy.notRequired}</option>
                                {LEVEL_CODES.map((code) => (
                                  <option key={code} value={code}>{copy.levels[code]}</option>
                                ))}
                              </Select>
                              <Select
                                aria-label={`${copy.classification} — ${competency.code}`}
                                value={row.classification || ''}
                                onChange={(event) =>
                                  setMapping((c) => ({
                                    ...c,
                                    [competency.id]: { ...(c[competency.id] || {}), classification: event.target.value },
                                  }))
                                }
                              >
                                <option value="">{copy.notSet}</option>
                                {CLASSIFICATION_CODES.map((code) => (
                                  <option key={code} value={code}>{copy.classifications[code]}</option>
                                ))}
                              </Select>
                              <Input
                                aria-label={`${copy.weight} — ${competency.code}`}
                                type="number"
                                min="0"
                                max="100"
                                value={row.weight ?? ''}
                                onChange={(event) =>
                                  setMapping((c) => ({
                                    ...c,
                                    [competency.id]: { ...(c[competency.id] || {}), weight: event.target.value },
                                  }))
                                }
                              />
                            </div>
                          )
                        })}
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" disabled={busy} onClick={() => saveMapping(pkg)}>
                            {copy.saveMapping}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setMappingFor(null)}>
                            {copy.hideMapping}
                          </Button>
                        </div>
                      </section>
                    ) : null}

                    {/* The refusal sits with the package it refused. */}
                    {refusal ? (
                      <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        {refusal}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
                      {mappingFor === pkg.code ? null : (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => openMapping(pkg)}>
                          <RefreshCw size={16} /> {copy.mapCompetencies}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          setPackageDraft({
                            editingCode: pkg.code,
                            code: pkg.code,
                            academic_rpl_school_id: pkg.school_id ?? pkg.academic_rpl_school_id ?? '',
                            name: {
                              ar: pkg.name?.ar || '',
                              en: pkg.name?.en || '',
                              nl: pkg.name?.nl || '',
                            },
                            qualification_level: pkg.qualification_level || '',
                            academic_path: pkg.academic_path || '',
                            version: pkg.version || '',
                            credit_hours: pkg.credit_hours ?? '',
                            learning_hours: pkg.learning_hours ?? '',
                            serves_diploma: !!pkg.serves_diploma,
                            serves_master: !!pkg.serves_master,
                            serves_doctorate: !!pkg.serves_doctorate,
                            sort_order: pkg.sort_order ?? '',
                          })
                        }
                      >
                        {copy.editPackage}
                      </Button>
                      <Button size="sm" disabled={busy} onClick={() => publish(pkg)}>
                        <Send size={16} /> {copy.publish}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm(copy.removeConfirm)) return
                          withBusy(() => deleteAcademicPackage(pkg.code))
                        }}
                      >
                        <Trash2 size={16} /> {copy.remove}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* 3 — COMPETENCIES, read-only. */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <CardTitle>{copy.competencies} ({competencies.length})</CardTitle>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.competenciesHint}</p>
        </CardHeader>
        <CardContent className="space-y-2 p-6">
          {competencies.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">{copy.noCompetencies}</p>
          ) : null}
          {competencies.map((competency) => (
            <div
              key={competency.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs"><bdi>{competency.code}</bdi></span>
                {localize(competency.name, language)}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {/* Marked before the author tries to publish against it, not
                    after the server refuses. */}
                {competency.is_placeholder ? <Badge variant="danger">{copy.placeholder}</Badge> : null}
                <Badge variant={competency.status === 'approved' ? 'success' : 'warning'}>
                  {copy.statuses[competency.status] || competency.status}
                </Badge>
              </span>
            </div>
          ))}
          {competencies.some((competency) => competency.is_placeholder) ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{copy.placeholderNote}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* 4 — IMPORT. Inspect, read, then import. */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5" aria-hidden="true" /> {copy.importTitle}
          </CardTitle>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.importHint}</p>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label={copy.importKind}
              value={importKind}
              onChange={(event) => {
                setImportKind(event.target.value)
                setReport(null)
                setImportNotice(null)
              }}
            >
              <option value="package">{copy.kindPackage}</option>
              <option value="competencies">{copy.kindCompetency}</option>
            </Select>
            <label className="text-sm">
              <span className="mb-2 block font-medium text-[var(--color-text)]">{copy.uploadLabel}</span>
              <input type="file" accept="application/json,.json" onChange={readFile} />
            </label>
          </div>

          <Textarea
            label={copy.pasteLabel}
            rows={6}
            placeholder={copy.pastePlaceholder}
            value={importText}
            onChange={(event) => {
              setImportText(event.target.value)
              // A changed file invalidates the inspection it was inspected from.
              setReport(null)
              setImportNotice(null)
            }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" disabled={importBusy !== ''} onClick={inspect}>
              {importBusy === 'inspect' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.inspecting}
                </>
              ) : (
                copy.inspect
              )}
            </Button>
            <Button disabled={importBusy !== '' || !report?.valid} onClick={runImport}>
              {importBusy === 'import' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.importing}
                </>
              ) : (
                copy.runImport
              )}
            </Button>
            {!report?.valid ? (
              <span className="text-xs text-[var(--color-text-muted)]">{copy.inspectFirst}</span>
            ) : null}
          </div>

          {importNotice ? (
            <p
              className={`rounded-xl border p-3 text-sm ${
                importNotice.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {importNotice.text}
            </p>
          ) : null}

          {report ? (
            <section className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
              <div>
                <p className="font-semibold">{copy.reportTitle}</p>
                <p
                  className={`mt-1 text-sm ${report.valid ? 'text-emerald-700' : 'text-red-700'}`}
                >
                  {report.valid ? copy.reportValid : copy.reportInvalid}
                </p>
              </div>

              {schemaErrors.length ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p className="font-semibold">{copy.schemaErrors}</p>
                  <ul className="mt-1 space-y-1">
                    {schemaErrors.map((issue, index) => (
                      <li key={`schema-${index}`}>
                        <span className="font-mono text-xs"><bdi>{issue.path}</bdi></span> — {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {referentialErrors.length ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p className="font-semibold">{copy.referentialErrors}</p>
                  <ul className="mt-1 space-y-1">
                    {referentialErrors.map((issue, index) => (
                      <li key={`referential-${index}`}>
                        <span className="font-mono text-xs"><bdi>{issue.path}</bdi></span> — {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/*
                Amber, not red, and it says so in words. A warning that looks
                like a failure teaches authors to ignore the report, and then
                they ignore the errors in it too.
              */}
              {warnings.length ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-semibold">{copy.warnings}</p>
                  <ul className="mt-1 space-y-1">
                    {warnings.map((warning, index) => (
                      <li key={`warning-${index}`}>{warning}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs">{copy.warningsNote}</p>
                </div>
              ) : null}

              {report.summary ? (
                <div className="rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm">
                  <p className="font-semibold">{copy.summary}</p>
                  <dl className="mt-1 grid gap-1 sm:grid-cols-2">
                    {Object.entries(report.summary).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <dt className="font-mono text-xs text-[var(--color-text-muted)]">{key}</dt>
                        <dd><bdi>{String(value)}</bdi></dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </section>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
