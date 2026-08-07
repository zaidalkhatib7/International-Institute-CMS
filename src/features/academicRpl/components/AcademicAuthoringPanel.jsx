import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot, CheckCircle2, KeyRound, Loader2, RefreshCw, ShieldAlert, ShieldOff, Sparkles, Trash2,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, Input, Select, Textarea } from '../../../components/ui'
import { readApiError } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { localize } from '../../rpl/domain/rpl'
import {
  authorizeAcademicPackageGeneration,
  fetchAcademicPackageAuthoring,
  regenerateAcademicPackageComponent,
  rejectAcademicPackageDraft,
  resolveAcademicPackageSourceFlag,
  revokeAcademicPackageGeneration,
  startAcademicPackageAuthoring,
} from '../services/academicRplService'

/*
 * AI PACKAGE AUTHORING FOR THE ACADEMIC LIBRARY — the mirror of AiPackagePanel.
 *
 * Same shape as the professional panel and deliberately so: authorize, start,
 * watch, review the artifacts, regenerate one component, resolve one source
 * flag, reject. Anyone who has governed a CGP package can govern an academic one
 * without learning a second screen.
 *
 * THE ONE PLACE IT IS NOT THE SAME, AND WHY.
 *
 * Where the professional panel shows programme metadata, this shows the SCHOOL
 * SPECIFICATION SLOT — and with it the SIBLING BOUNDARY. That table is what the
 * model was told NOT to cover ("this belongs to LD-002"), and it is the single
 * reason twelve packages in one school do not come back reading the same. A
 * reviewer asked whether this package stayed inside its scope cannot answer that
 * without seeing the boundary it was given, so the boundary is on the screen
 * beside the draft rather than buried in an input snapshot.
 *
 * AND THE BOUNDARY IS CHECKED, NOT JUST DISPLAYED. Once a run exists the panel
 * compares the school's CURRENT siblings against the codes the run's manifest
 * says were actually injected. A package created after the run shows as one the
 * model was never told about — which is exactly the case where a draft can
 * innocently swallow a sibling's scope, and it is invisible from the draft
 * itself.
 *
 * NOTHING HERE PUBLISHES. Publication is the library screen's governed action
 * and has its own refusals; this panel produces a draft and shows what still
 * stands between that draft and being publishable.
 */

/* eslint-disable-next-line react-refresh/only-export-components -- exported so the
   test can prove all three language blocks expose the same key set. Copy lookup is
   a WHOLE-OBJECT fallback (COPY[language] || COPY.en) with no per-key rescue, so a
   key present in en and missing in nl renders the string "undefined". */
export const COPY = {
  ar: {
    title: 'تأليف الحقيبة الأكاديمية بالذكاء الاصطناعي',
    subtitle:
      'يؤلّف النموذج مسودة واحدة تحت المراجعة البشرية، وتدخل عبر المستورد المحكوم كمسودة دائمًا. لا اعتماد ولا نشر هنا.',
    saveFirst: 'احفظ الحقيبة أولًا، ثم عد إلى هذه اللوحة.',

    slotTitle: 'خانة الحقيبة في مواصفة المدرسة — المُدخل المحكوم',
    slotHint: 'هذا ما أُعطي للنموذج. كل ما هنا مؤلَّف بشريًا، ولا يملك النموذج أن يضيف إليه.',
    slotCode: 'الرمز',
    slotVersion: 'الإصدار',
    slotStatus: 'الحالة',
    slotSchool: 'المدرسة المعرفية',
    slotCompetencies: 'الكفاءات المطلوبة ومستوى كل منها',
    slotNoCompetencies: 'لا تُعلن هذه الحقيبة أي كفاءة، فلا يوجد مُدخل محكوم يُبنى عليه.',

    siblingTitle: 'حدّ الحقائب الشقيقة — ما قيل للنموذج ألّا يغطّيه',
    siblingHint:
      'كل حقيبة أخرى في المدرسة تُرسل مع الطلب بوصفها حدًّا صريحًا: «لا تغطِّ هذا، فهو يخص LD-0NN». هذه الجدولة وحدها هي ما يمنع اثنتي عشرة حقيبة من الخروج متشابهة، وهي المرجع الذي تحكم به على التزام المسودة بنطاقها.',
    siblingNone: 'لا توجد حقيبة أخرى في هذه المدرسة بعد، فلم يُعطَ النموذج أي حدّ نطاق.',
    siblingInjected: 'أُرسلت مع الطلب',
    siblingMissing: 'لم تُرسل',
    siblingMissingHint:
      'حقائب أُنشئت بعد هذا التوليد. لم يُخبَر النموذج بوجودها، فقد تكون المسودة غطّت نطاقها دون أن يظهر ذلك في المسودة نفسها.',
    siblingGone: 'أُرسلت في حينه ولم تعد موجودة',
    siblingGoneHint: 'رموز يذكرها بيان التوليد ولم تعد ضمن المدرسة اليوم — حُذفت أو نُقلت بعد التوليد.',

    govTitle: 'بوابتا التوليد',
    govReady: 'جاهزية الحوكمة: مستوفاة',
    govNotReady: 'جاهزية الحوكمة: غير مستوفاة — أعلن الكفاءات المطلوبة أولًا',
    govDeclared: 'كفاءات معلنة',
    govPlaceholders: 'كفاءات نائبة (9xx)',
    govPlaceholderHint:
      'الكفاءة النائبة تنوب عن إطار لم يؤلّفه أحد. التصريح بالتوليد عليها يُنتج حقيبة تبدو محكومة وليست كذلك، والخادم يرفضه.',
    govAuthorized: 'تصريح التوليد: مُسجَّل',
    govNotAuthorized: 'تصريح التوليد: غير مُسجَّل',
    govTwoKey:
      'مفتاحان: جهة حوكمة الكتالوج (rpl.settings.manage) تسجّل التصريح لهذا الإصدار، ثم تبدأ صلاحية إدارة البرامج التوليد. التصريح لإصدار واحد ويُستهلك عند استخدامه، ولا يجوز أن يكون المُصرِّح هو المُشغِّل.',
    govNote: 'أساس التصريح',
    govNotePlaceholder: 'من صرّح بذلك، ولماذا هذه الخانة جاهزة للتأليف.',
    govNoteHint: 'يُحفظ مع اسمك في السجل التدقيقي.',
    govExpiry: 'انتهاء صلاحية التصريح (اختياري)',
    govExpiryHint:
      'الخادم لا يفرض مدة افتراضية، لأن مدة مخترَعة سياسةٌ لم يقرّرها أحد. اتركه فارغًا ليبقى التصريح قائمًا حتى يُستهلك أو يُسحب.',
    govAuthorize: 'تسجيل تصريح التوليد',
    govAuthorizing: 'جارٍ التسجيل…',
    govConfirm: 'سيُسجَّل تصريح لهذا الإصدار باسمك. متابعة؟',
    govBy: 'سجّله',
    govGrantedAt: 'سُجِّل في',
    govExpires: 'ينتهي',
    govNoExpiry: 'بلا تاريخ انتهاء',
    govConsumed: 'استُهلك',
    govRevoked: 'مسحوب',
    govUnusable: 'سبب عدم الصلاحية',
    govRevoke: 'سحب التصريح',
    govRevokePlaceholder: 'لماذا يُسحب التصريح؟ (10 أحرف على الأقل)',
    govRevokeConfirm: 'سيُسحب تصريح التوليد لهذا الإصدار ويُسجَّل باسمك. متابعة؟',

    runTitle: 'التوليد',
    moduleCount: 'عدد الوحدات التعليمية',
    moduleCountHint:
      'إلزامي، ولا تضع المنصة له قيمة افتراضية: الوحدة أصغر وحدة قابلة للتقييم، فهذا العدد يقرّر دقة تقييم الحقيبة — وهو حكم أكاديمي.',
    locale: 'لغة المحتوى',
    localeValue: 'العربية',
    localeHint:
      'الإصدار الأول يؤلّف بالعربية فقط. مواصفة GPS تُلزم بنص عربي في كل حقل، وتوليد الإنجليزية داخل الخانة العربية يسجّل ترجمة لا وجود لها.',
    generate: 'بدء التوليد',
    generating: 'جارٍ التوليد…',
    currentStep: 'الخطوة الحالية',
    alreadyDrafted: 'توجد مسودة قائمة لهذا الإصدار. راجعها، أو أعد توليد مكوّن منها، أو ارفضها قبل توليد جديد.',
    failed: 'فشل التوليد — إعادة المحاولة تستأنف من نقطة التوقف ولا تبدأ من الصفر.',
    runError: 'نص الخطأ',
    requestedBy: 'طلب التوليد',
    startedAt: 'بدأ في',
    aiRun: 'سجل التشغيل المحكوم',
    model: 'النموذج',
    promptVersion: 'إصدار المُوجّه',
    fallbackTitle: 'أجاب نموذج غير المطلوب',
    fallbackHint:
      'استُخدم النموذج الاحتياطي في مكوّن واحد على الأقل. المسجَّل هو النموذج الذي أجاب فعلًا، لا الذي طُلب — والفارق معروض هنا لأن التبديل الصامت ممنوع.',

    progressTitle: 'تقدم التوليد',
    modulesProgress: 'وحدات أُنشئت',
    mcqProgress: 'أسئلة اختيار من متعدد',

    validation: 'نتائج الفحص البنيوي',
    reviewTitle: 'ما تبقّى قبل إمكان النشر',
    blockingFlags: 'مراجع تمنع النشر',
    mcqItems: 'أسئلة (الإجمالي / مسودة / منشورة)',
    modulesDraft: 'وحدات ما زالت مسودة',
    reviewHint: 'معروض للعلم فقط؛ النشر له بوابته في شاشة المكتبة.',

    artifacts: 'سجل مخرجات التوليد (يُحفظ الأصل دائمًا)',
    artifactsHint:
      'إعادة توليد مكوّن تُنشئ مخرجًا جديدًا وتُشير من القديم إليه، ولا تكتب فوقه أبدًا — فيبقى تاريخ إعادة التوليد قابلًا للقراءة.',
    regenerate: 'إعادة توليد',
    superseded: 'استُبدل',
    provenanceLegacy: 'بلا بيانات مصدر',
    provenanceDerived: 'مشتق من الأصل',

    sourceReview: 'مرجع يتطلب مراجعة بشرية',
    sourceVerdict: 'حكم المصدر (قرار بشري صريح)',
    sourceVerdictPlaceholder: '— اختر الحكم —',
    verdictApproved: 'موثَّق ومعتمد (VERIFIED_APPROVED)',
    verdictRejected: 'مرفوض (REJECTED) — يمنع النشر',
    verdictSuperseded: 'مُستبدَل بمرجع أدق (SUPERSEDED)',
    supersededWarning:
      'تنبيه: SUPERSEDED يرفع منع النشر تمامًا مثل الاعتماد. لا تسجّله إلا بعد تعديل المحتوى فعلًا إلى المرجع الأحدث.',
    sourceNotes: 'أساس الحكم (إلزامي)',
    sourceNotesHint: 'ما الذي تحققتَ منه بالضبط: العنوان، الجهة، السنة، المعرّف — أو ما تعذّر التحقق منه.',
    recordVerdict: 'تسجيل الحكم',
    recordedTitle: 'أحكام مصادر مسجَّلة — قابلة لإعادة المراجعة',
    recordedHint: 'إعادة التقييم لا تحذف السجل السابق، بل تضيف قرارًا جديدًا إلى الأثر التدقيقي.',
    previouslyRecorded: 'حكم سابق مسجَّل',
    recordedBy: 'سجّله',
    previousNotes: 'أساس الحكم السابق',
    noPreviousNotes: '— لم يُسجَّل أي أساس —',
    reReview: 'إعادة تقييم الحكم',
    blocksPublication: 'يمنع النشر',

    reject: 'رفض المسودة بالكامل',
    rejectConfirm:
      'سيُحذف ما أنشأه الذكاء الاصطناعي وتعود الخانة كما ألّفها الأكاديمي. يبقى سجل التوليد كاملًا للتدقيق. متابعة؟',

    statuses: { draft: 'مسودة', approved: 'معتمدة', published: 'منشورة', archived: 'مؤرشفة', retired: 'متقاعدة' },
    runStatuses: {
      queued: 'في الانتظار',
      generating: 'قيد التوليد',
      ai_draft: 'مسودة بانتظار المراجعة',
      failed: 'فشل',
      superseded: 'استُبدل',
      archived: 'مؤرشف',
    },
    aiStatuses: {
      not_generated: 'لم يولَّد بعد',
      ai_generating: 'قيد التوليد',
      ai_draft: 'مسودة AI بانتظار المراجعة',
      generation_failed: 'فشل التوليد',
    },
    stages: {
      outline: 'المخطط',
      modules: 'الوحدات',
      lessons: 'المحتوى العلمي',
      question_bank: 'بنك الأسئلة',
      assessment_policy: 'سياسة التقييم',
      import: 'الاستيراد المحكوم',
      question_bank_ingest: 'إدخال بنك الأسئلة',
    },
    types: {
      outline: 'مخطط الحقيبة',
      module: 'وحدة تعليمية',
      content: 'محتوى علمي',
      question_batch: 'دفعة أسئلة',
      assessment_policy: 'سياسة التقييم',
    },
    levels: {
      professional_diploma: 'الدبلوم المهني',
      professional_master: 'الماجستير المهني',
      professional_doctorate: 'الدكتوراه المهنية',
    },
  },

  en: {
    title: 'AI authoring for this academic package',
    subtitle:
      'The model drafts once under human review, and the draft enters through the governed importer as a draft every time. Nothing here approves or publishes.',
    saveFirst: 'Save the package first, then come back to this panel.',

    slotTitle: 'The School Specification slot — the governed input',
    slotHint: 'This is what the model was given. Everything here is human-authored, and the model may not add to it.',
    slotCode: 'Code',
    slotVersion: 'Version',
    slotStatus: 'Status',
    slotSchool: 'Knowledge school',
    slotCompetencies: 'Required competencies and the level of each',
    slotNoCompetencies: 'This package declares no competencies, so there is no governed input to author against.',

    siblingTitle: 'Sibling boundary — what the model was told NOT to cover',
    siblingHint:
      'Every other package in the school travels with the request as an explicit prohibition: “do not cover this, it belongs to LD-0NN”. That table alone is what stops twelve packages coming back reading the same, and it is the reference you judge this draft against when asking whether it stayed inside its scope.',
    siblingNone: 'No other package exists in this school yet, so the model was given no scope boundary at all.',
    siblingInjected: 'Sent with the request',
    siblingMissing: 'Not sent',
    siblingMissingHint:
      'Packages created after this run. The model was never told they exist, so the draft may have covered their scope — and that is invisible from the draft itself.',
    siblingGone: 'Sent then, absent now',
    siblingGoneHint:
      'Codes the run manifest names that are no longer in this school — deleted or moved since the run.',

    govTitle: 'The two generation gates',
    govReady: 'Governance readiness: satisfied',
    govNotReady: 'Governance readiness: not satisfied — declare the required competencies first',
    govDeclared: 'Declared competencies',
    govPlaceholders: 'Placeholder competencies (9xx)',
    govPlaceholderHint:
      'A placeholder stands in for framework nobody has authored. Authorizing generation against one produces a package that looks governed and is not, and the server refuses it.',
    govAuthorized: 'Generation authorization: recorded',
    govNotAuthorized: 'Generation authorization: not recorded',
    govTwoKey:
      'Two keys: catalogue governance (rpl.settings.manage) records that this version may be authored, then programme management starts the run. An authorization covers one version, is consumed when used, and the person who granted it may not be the one who spends it.',
    govNote: 'Basis for the authorization',
    govNotePlaceholder: 'Who authorised this, and why this slot is ready to be authored.',
    govNoteHint: 'Stored with your name in the audit trail.',
    govExpiry: 'Authorization expiry (optional)',
    govExpiryHint:
      'The server invents no default window, because an invented window is policy nobody decided. Leave it empty and the grant stands until it is spent or withdrawn.',
    govAuthorize: 'Record generation authorization',
    govAuthorizing: 'Recording…',
    govConfirm: 'An authorization for this version will be recorded against your name. Continue?',
    govBy: 'Recorded by',
    govGrantedAt: 'Recorded at',
    govExpires: 'Expires',
    govNoExpiry: 'No expiry set',
    govConsumed: 'Consumed',
    govRevoked: 'Withdrawn',
    govUnusable: 'Why it cannot be used',
    govRevoke: 'Withdraw the authorization',
    govRevokePlaceholder: 'Why is the authorization withdrawn? (at least 10 characters)',
    govRevokeConfirm: 'The generation authorization for this version will be withdrawn against your name. Continue?',

    runTitle: 'Generation',
    moduleCount: 'Number of learning modules',
    moduleCountHint:
      'Required, and the platform sets no default: the module is the smallest assessable unit, so this number decides how finely the package is assessed — an academic judgement, not a generation knob.',
    locale: 'Content language',
    localeValue: 'Arabic',
    localeHint:
      'v1 authors in Arabic only. GPS requires Arabic text in every localized field, and generating English into the Arabic slot would record a translation that does not exist.',
    generate: 'Start generation',
    generating: 'Generating…',
    currentStep: 'Current step',
    alreadyDrafted:
      'A draft already exists for this version. Review it, regenerate a component of it, or reject it before generating again.',
    failed: 'Generation failed — retrying resumes from the checkpoint rather than starting over.',
    runError: 'Error text',
    requestedBy: 'Requested by',
    startedAt: 'Started',
    aiRun: 'Governed run record',
    model: 'Model',
    promptVersion: 'Prompt version',
    fallbackTitle: 'A model other than the one requested answered',
    fallbackHint:
      'The fallback model answered at least one component. What is recorded is the model that actually answered, not the one requested — the difference is shown here because a silent substitution is forbidden.',

    progressTitle: 'Generation progress',
    modulesProgress: 'Modules created',
    mcqProgress: 'MCQ items',

    validation: 'Structural validation results',
    reviewTitle: 'What still stands between this draft and publication',
    blockingFlags: 'References blocking publication',
    mcqItems: 'MCQ items (total / draft / published)',
    modulesDraft: 'Modules still in draft',
    reviewHint: 'Reported for information; publication has its own gate on the library screen.',

    artifacts: 'Generation artifact history (originals always preserved)',
    artifactsHint:
      'Regenerating a component creates a NEW artifact and points the old one at it. Nothing is overwritten, so the regeneration history stays readable.',
    regenerate: 'Regenerate',
    superseded: 'Superseded',
    provenanceLegacy: 'No provenance recorded',
    provenanceDerived: 'Derived from parent',

    sourceReview: 'Reference requires human review',
    sourceVerdict: 'Source verdict (explicit human decision)',
    sourceVerdictPlaceholder: '— choose a verdict —',
    verdictApproved: 'Verified and approved (VERIFIED_APPROVED)',
    verdictRejected: 'Rejected (REJECTED) — blocks publication',
    verdictSuperseded: 'Replaced by a precise reference (SUPERSEDED)',
    supersededWarning:
      'Warning: SUPERSEDED lifts the publication block exactly as approval does. Do not record it until the content actually cites the newer reference.',
    sourceNotes: 'Basis of the verdict (required)',
    sourceNotesHint: 'Exactly what you verified: title, issuer, year, identifier — or what could not be verified.',
    recordVerdict: 'Record verdict',
    recordedTitle: 'Recorded source verdicts — eligible for re-review',
    recordedHint: 'Re-reviewing never deletes the earlier record; it appends a new decision to the audit trail.',
    previouslyRecorded: 'Previously recorded',
    recordedBy: 'Recorded by',
    previousNotes: 'Previous basis',
    noPreviousNotes: '— no basis was recorded —',
    reReview: 'Re-review verdict',
    blocksPublication: 'Blocks publication',

    reject: 'Reject entire draft',
    rejectConfirm:
      'AI-generated content is removed and the slot goes back to what the academic authored. The full generation history is kept for audit. Continue?',

    statuses: { draft: 'Draft', approved: 'Approved', published: 'Published', archived: 'Archived', retired: 'Retired' },
    runStatuses: {
      queued: 'Queued',
      generating: 'Generating',
      ai_draft: 'Draft awaiting review',
      failed: 'Failed',
      superseded: 'Superseded',
      archived: 'Archived',
    },
    aiStatuses: {
      not_generated: 'Not generated yet',
      ai_generating: 'Generating',
      ai_draft: 'AI draft awaiting review',
      generation_failed: 'Generation failed',
    },
    stages: {
      outline: 'Outline',
      modules: 'Modules',
      lessons: 'Scientific content',
      question_bank: 'Question bank',
      assessment_policy: 'Assessment policy',
      import: 'Governed import',
      question_bank_ingest: 'Question bank ingest',
    },
    types: {
      outline: 'Package outline',
      module: 'Learning module',
      content: 'Scientific content',
      question_batch: 'Question batch',
      assessment_policy: 'Assessment policy',
    },
    levels: {
      professional_diploma: 'Professional Diploma',
      professional_master: 'Professional Master',
      professional_doctorate: 'Professional Doctorate',
    },
  },

  nl: {
    title: 'AI-ontwikkeling voor dit academische pakket',
    subtitle:
      'Het model schrijft één concept onder menselijke review, en dat concept komt telkens als concept binnen via de beheerde importer. Hier wordt niets goedgekeurd of gepubliceerd.',
    saveFirst: 'Sla het pakket eerst op en keer daarna terug naar dit paneel.',

    slotTitle: 'De plek in de schoolspecificatie — de beheerde invoer',
    slotHint:
      'Dit is wat het model heeft gekregen. Alles hier is door mensen geschreven, en het model mag er niets aan toevoegen.',
    slotCode: 'Code',
    slotVersion: 'Versie',
    slotStatus: 'Status',
    slotSchool: 'Kennisschool',
    slotCompetencies: 'Vereiste competenties en het niveau van elk',
    slotNoCompetencies:
      'Dit pakket verklaart geen competenties, dus er is geen beheerde invoer om tegen te schrijven.',

    siblingTitle: 'Zustergrens — wat het model NIET mocht behandelen',
    siblingHint:
      'Elk ander pakket in de school reist mee met het verzoek als een expliciet verbod: “behandel dit niet, het hoort bij LD-0NN”. Alleen die tabel voorkomt dat twaalf pakketten hetzelfde gaan lezen, en het is de maatstaf waaraan u beoordeelt of dit concept binnen zijn bereik is gebleven.',
    siblingNone: 'Er bestaat nog geen ander pakket in deze school, dus het model kreeg geen enkele bereikgrens.',
    siblingInjected: 'Meegestuurd',
    siblingMissing: 'Niet meegestuurd',
    siblingMissingHint:
      'Pakketten die ná deze run zijn aangemaakt. Het model wist niet dat ze bestaan, dus het concept kan hun bereik hebben overgenomen — en dat is aan het concept zelf niet te zien.',
    siblingGone: 'Toen meegestuurd, nu afwezig',
    siblingGoneHint:
      'Codes die het runmanifest noemt maar die niet meer in deze school zitten — sinds de run verwijderd of verplaatst.',

    govTitle: 'De twee generatiepoorten',
    govReady: 'Governance-gereedheid: voldaan',
    govNotReady: 'Governance-gereedheid: niet voldaan — verklaar eerst de vereiste competenties',
    govDeclared: 'Verklaarde competenties',
    govPlaceholders: 'Placeholder-competenties (9xx)',
    govPlaceholderHint:
      'Een placeholder staat voor kaderinhoud die niemand heeft geschreven. Generatie daartegen toestaan levert een pakket op dat beheerd lijkt en het niet is; de server weigert het.',
    govAuthorized: 'Generatietoestemming: vastgelegd',
    govNotAuthorized: 'Generatietoestemming: niet vastgelegd',
    govTwoKey:
      'Twee sleutels: catalogusgovernance (rpl.settings.manage) legt vast dat deze versie geschreven mag worden, daarna start programmabeheer de run. Een toestemming geldt voor één versie, wordt bij gebruik verbruikt, en wie haar verleent mag haar niet zelf besteden.',
    govNote: 'Onderbouwing van de toestemming',
    govNotePlaceholder: 'Wie dit heeft toegestaan en waarom deze plek gereed is.',
    govNoteHint: 'Wordt met uw naam in het auditspoor bewaard.',
    govExpiry: 'Vervaldatum van de toestemming (optioneel)',
    govExpiryHint:
      'De server verzint geen standaardtermijn, want een verzonnen termijn is beleid dat niemand heeft vastgesteld. Laat het leeg en de toestemming blijft staan tot zij wordt besteed of ingetrokken.',
    govAuthorize: 'Generatietoestemming vastleggen',
    govAuthorizing: 'Bezig met vastleggen…',
    govConfirm: 'Er wordt een toestemming voor deze versie op uw naam vastgelegd. Doorgaan?',
    govBy: 'Vastgelegd door',
    govGrantedAt: 'Vastgelegd op',
    govExpires: 'Verloopt',
    govNoExpiry: 'Geen vervaldatum',
    govConsumed: 'Verbruikt',
    govRevoked: 'Ingetrokken',
    govUnusable: 'Waarom zij niet bruikbaar is',
    govRevoke: 'Toestemming intrekken',
    govRevokePlaceholder: 'Waarom wordt de toestemming ingetrokken? (minimaal 10 tekens)',
    govRevokeConfirm: 'De generatietoestemming voor deze versie wordt op uw naam ingetrokken. Doorgaan?',

    runTitle: 'Generatie',
    moduleCount: 'Aantal leermodules',
    moduleCountHint:
      'Verplicht, en het platform kiest geen standaard: de module is de kleinste toetsbare eenheid, dus dit getal bepaalt hoe fijn het pakket wordt getoetst — een academisch oordeel, geen instelknop.',
    locale: 'Inhoudstaal',
    localeValue: 'Arabisch',
    localeHint:
      'v1 schrijft alleen in het Arabisch. GPS vereist Arabische tekst in elk gelokaliseerd veld, en Engels in het Arabische veld genereren legt een vertaling vast die niet bestaat.',
    generate: 'Generatie starten',
    generating: 'Genereren…',
    currentStep: 'Huidige stap',
    alreadyDrafted:
      'Er bestaat al een concept voor deze versie. Beoordeel het, genereer er een component van opnieuw, of wijs het af voordat u opnieuw genereert.',
    failed: 'Generatie mislukt — opnieuw proberen hervat vanaf het checkpoint in plaats van opnieuw te beginnen.',
    runError: 'Fouttekst',
    requestedBy: 'Aangevraagd door',
    startedAt: 'Gestart',
    aiRun: 'Beheerd runrecord',
    model: 'Model',
    promptVersion: 'Promptversie',
    fallbackTitle: 'Een ander model dan gevraagd heeft geantwoord',
    fallbackHint:
      'Het terugvalmodel heeft ten minste één component beantwoord. Vastgelegd wordt het model dat werkelijk antwoordde, niet het gevraagde — het verschil staat hier omdat een stille vervanging verboden is.',

    progressTitle: 'Generatievoortgang',
    modulesProgress: 'Aangemaakte modules',
    mcqProgress: 'Meerkeuzevragen',

    validation: 'Structurele validatie',
    reviewTitle: 'Wat er nog tussen dit concept en publicatie staat',
    blockingFlags: 'Bronnen die publicatie blokkeren',
    mcqItems: 'Meerkeuzevragen (totaal / concept / gepubliceerd)',
    modulesDraft: 'Modules nog in concept',
    reviewHint: 'Ter informatie; publicatie heeft haar eigen poort op het bibliotheekscherm.',

    artifacts: 'Generatiegeschiedenis (origineel blijft bewaard)',
    artifactsHint:
      'Een component opnieuw genereren maakt een NIEUW artefact en laat het oude ernaar wijzen. Er wordt niets overschreven, dus de geschiedenis blijft leesbaar.',
    regenerate: 'Opnieuw genereren',
    superseded: 'Vervangen',
    provenanceLegacy: 'Geen herkomst vastgelegd',
    provenanceDerived: 'Afgeleid van origineel',

    sourceReview: 'Bron vereist menselijke review',
    sourceVerdict: 'Bronoordeel (expliciet menselijk besluit)',
    sourceVerdictPlaceholder: '— kies een oordeel —',
    verdictApproved: 'Geverifieerd en goedgekeurd (VERIFIED_APPROVED)',
    verdictRejected: 'Afgewezen (REJECTED) — blokkeert publicatie',
    verdictSuperseded: 'Vervangen door een preciezere bron (SUPERSEDED)',
    supersededWarning:
      'Let op: SUPERSEDED heft de publicatieblokkade op, net als goedkeuring. Leg het pas vast nadat de inhoud daadwerkelijk de nieuwere bron citeert.',
    sourceNotes: 'Onderbouwing van het oordeel (verplicht)',
    sourceNotesHint: 'Wat u precies heeft geverifieerd: titel, uitgever, jaar, identificatie — of wat niet lukte.',
    recordVerdict: 'Oordeel vastleggen',
    recordedTitle: 'Vastgelegde bronoordelen — herbeoordeling mogelijk',
    recordedHint: 'Herbeoordelen verwijdert het eerdere record niet; het voegt een nieuw besluit toe aan het auditspoor.',
    previouslyRecorded: 'Eerder vastgelegd',
    recordedBy: 'Vastgelegd door',
    previousNotes: 'Eerdere onderbouwing',
    noPreviousNotes: '— geen onderbouwing vastgelegd —',
    reReview: 'Oordeel herbeoordelen',
    blocksPublication: 'Blokkeert publicatie',

    reject: 'Volledig concept afwijzen',
    rejectConfirm:
      'AI-inhoud wordt verwijderd en de plek keert terug naar wat de academicus schreef. De volledige generatiegeschiedenis blijft bewaard voor audit. Doorgaan?',

    statuses: {
      draft: 'Concept',
      approved: 'Goedgekeurd',
      published: 'Gepubliceerd',
      archived: 'Gearchiveerd',
      retired: 'Uitgefaseerd',
    },
    runStatuses: {
      queued: 'In wachtrij',
      generating: 'Bezig met genereren',
      ai_draft: 'Concept wacht op review',
      failed: 'Mislukt',
      superseded: 'Vervangen',
      archived: 'Gearchiveerd',
    },
    aiStatuses: {
      not_generated: 'Nog niet gegenereerd',
      ai_generating: 'Bezig met genereren',
      ai_draft: 'AI-concept wacht op review',
      generation_failed: 'Generatie mislukt',
    },
    stages: {
      outline: 'Overzicht',
      modules: 'Modules',
      lessons: 'Wetenschappelijke inhoud',
      question_bank: 'Vragenbank',
      assessment_policy: 'Toetsbeleid',
      import: 'Beheerde import',
      question_bank_ingest: 'Vragenbank inlezen',
    },
    types: {
      outline: 'Pakketoverzicht',
      module: 'Leermodule',
      content: 'Wetenschappelijke inhoud',
      question_batch: 'Vragenreeks',
      assessment_policy: 'Toetsbeleid',
    },
    levels: {
      professional_diploma: 'Professioneel diploma',
      professional_master: 'Professionele master',
      professional_doctorate: 'Professioneel doctoraat',
    },
  },
}

/*
 * Which artifact types can be regenerated, and under what name the endpoint
 * knows them. `question_batch` is stored per module and regenerated as
 * `question_bank`; the outline is absent on purpose, because regenerating it
 * would change the shape every other artifact was produced against.
 */
const REGENERATABLE = {
  module: 'module',
  content: 'content',
  question_batch: 'question_bank',
  assessment_policy: 'assessment_policy',
}

const VERDICT_VARIANT = {
  VERIFIED_APPROVED: 'success',
  REJECTED: 'danger',
  SUPERSEDED: 'warning',
  SOURCE_REVIEW_REQUIRED: 'warning',
}

const ACTIVE_RUN_STATUSES = ['queued', 'generating']

/** The module CODE after the colon (module:LD-001-M01), which is what the endpoint binds on. */
function refCode(componentRef) {
  const parts = String(componentRef || '').split(':')
  return parts.length > 1 ? parts.slice(1).join(':') : ''
}

function whenText(value) {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString()
}

export default function AcademicAuthoringPanel({ packageCode, siblings = [], onChanged }) {
  const language = getAdminLanguage()
  const copy = COPY[language] || COPY.en

  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [authorizationNote, setAuthorizationNote] = useState('')
  const [authorizationExpiry, setAuthorizationExpiry] = useState('')
  const [revokeReason, setRevokeReason] = useState('')
  const [moduleCount, setModuleCount] = useState('')
  // Per-citation verdict draft: nothing is sent until the reviewer picks a
  // verdict AND writes its basis. Absence of a decision must never read as one.
  const [sourceVerdicts, setSourceVerdicts] = useState({})
  const [reopened, setReopened] = useState({})

  const pollRef = useRef(null)

  const load = useCallback(async () => {
    if (!packageCode) return
    try {
      const response = await fetchAcademicPackageAuthoring(packageCode)
      setStatus(response?.data || null)
    } catch (loadError) {
      setError(readApiError(loadError))
    }
  }, [packageCode])

  useEffect(() => {
    load()
  }, [load])

  const run = status?.run
  const isRunning = Boolean(run && ACTIVE_RUN_STATUSES.includes(run.status))

  useEffect(() => {
    if (isRunning && !pollRef.current) {
      pollRef.current = setInterval(load, 5000)
    }
    if (!isRunning && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [isRunning, load])

  const withBusy = useCallback(
    async (action, successMessage = '') => {
      setBusy(true)
      setError('')
      setNotice('')
      try {
        await action()
        if (successMessage) setNotice(successMessage)
        await load()
        if (onChanged) await onChanged()
        return true
      } catch (actionError) {
        setError(readApiError(actionError))
        return false
      } finally {
        setBusy(false)
      }
    },
    [load, onChanged],
  )

  const artifacts = useMemo(() => run?.artifacts || [], [run])

  // Every flag is listed, open or already decided: a verdict a screen hides is
  // a verdict no reviewer can revisit.
  const allFlags = useMemo(
    () => artifacts.flatMap((artifact) => (artifact.source_flags || []).map((flag) => ({ artifact, flag }))),
    [artifacts],
  )
  const unresolvedFlags = useMemo(() => allFlags.filter(({ flag }) => !flag.resolved), [allFlags])
  const recordedFlags = useMemo(() => allFlags.filter(({ flag }) => flag.resolved), [allFlags])

  const usedFallback = useMemo(
    () => artifacts.some((artifact) => artifact.used_fallback_model),
    [artifacts],
  )

  /*
   * D1 — the boundary, checked rather than merely displayed.
   *
   * `injectedCodes` is what the run's manifest says actually travelled with the
   * request. Before any run there is nothing to compare against, so every
   * sibling is shown plainly; afterwards each one is marked sent or not sent.
   */
  const injectedCodes = run?.governed_input_manifest?.sibling_package_codes || null
  const siblingRows = useMemo(
    () =>
      (siblings || []).map((sibling) => ({
        ...sibling,
        injected: injectedCodes ? injectedCodes.includes(sibling.code) : null,
      })),
    [siblings, injectedCodes],
  )
  const siblingsGone = useMemo(
    () => (injectedCodes || []).filter((code) => !(siblings || []).some((sibling) => sibling.code === code)),
    [injectedCodes, siblings],
  )

  const patchSourceVerdict = useCallback((key, patch) => {
    setSourceVerdicts((prev) => ({
      ...prev,
      [key]: { verification_status: '', review_notes: '', ...(prev[key] || {}), ...patch },
    }))
  }, [])

  const flagOrigin = (artifact) =>
    `${copy.types[artifact.component_type] || artifact.component_type}${
      refCode(artifact.component_ref) ? ' — ' + refCode(artifact.component_ref) : ''
    }`

  /*
   * FAIL-CLOSED, the same rule the server enforces: a verdict is recorded only
   * with an explicit choice AND a written basis of at least ten characters. The
   * professional pathway once shipped a "mark reviewed" button that approved by
   * omission; the same form serves a first review and a re-review so there is
   * only one way to record a decision.
   */
  const renderVerdictForm = (artifact, flag) => {
    const key = `${artifact.id}::${flag.flag_id || flag.citation}`
    const draft = sourceVerdicts[key] || { verification_status: '', review_notes: '' }
    const ready = draft.verification_status && draft.review_notes.trim().length >= 10

    return (
      <>
        <Select
          label={copy.sourceVerdict}
          value={draft.verification_status}
          onChange={(event) => patchSourceVerdict(key, { verification_status: event.target.value })}
        >
          <option value="">{copy.sourceVerdictPlaceholder}</option>
          <option value="VERIFIED_APPROVED">{copy.verdictApproved}</option>
          <option value="REJECTED">{copy.verdictRejected}</option>
          <option value="SUPERSEDED">{copy.verdictSuperseded}</option>
        </Select>
        {draft.verification_status === 'SUPERSEDED' ? (
          <p className="text-xs font-semibold text-amber-700">{copy.supersededWarning}</p>
        ) : null}
        <Textarea
          label={copy.sourceNotes}
          rows={2}
          value={draft.review_notes}
          placeholder={copy.sourceNotesHint}
          onChange={(event) => patchSourceVerdict(key, { review_notes: event.target.value })}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || !ready}
          onClick={() =>
            withBusy(async () => {
              await resolveAcademicPackageSourceFlag(packageCode, {
                artifact_id: artifact.id,
                citation: flag.citation,
                // Preferred, stable identity; the server falls back to the
                // citation string only when a flag carries no id.
                ...(flag.flag_id ? { flag_id: flag.flag_id } : {}),
                verification_status: draft.verification_status,
                review_notes: draft.review_notes.trim(),
              })
              setReopened((prev) => ({ ...prev, [key]: false }))
              setSourceVerdicts((prev) => ({ ...prev, [key]: { verification_status: '', review_notes: '' } }))
            })
          }
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {copy.recordVerdict}
        </Button>
      </>
    )
  }

  if (!packageCode) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-[var(--color-text-muted)]">{copy.saveFirst}</CardContent>
      </Card>
    )
  }

  const governance = status?.governance
  const review = status?.review
  const progress = status?.progress
  const aiStatus = status?.ai_authoring_status || 'not_generated'
  const bounds = governance?.module_count_bounds || { min: 1, max: 24 }
  const authorization = governance?.active_authorization || governance?.latest_authorization || null
  const packageLocked = ['approved', 'published', 'retired'].includes(status?.package_status)
  const isDraftRun = run?.status === 'ai_draft'
  const moduleCountValid =
    String(moduleCount).trim() !== ''
    && Number.isInteger(Number(moduleCount))
    && Number(moduleCount) >= bounds.min
    && Number(moduleCount) <= bounds.max
  const canGenerate = Boolean(governance?.authorized) && !isRunning && !isDraftRun && !packageLocked

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text)]">
                <Bot className="h-5 w-5" aria-hidden="true" /> {copy.title}
              </h3>
              <p className="mt-1 max-w-3xl text-sm text-[var(--color-text-muted)]">{copy.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {copy.slotVersion}: {status?.package_version || '—'}
              </Badge>
              <Badge variant={aiStatus === 'generation_failed' ? 'danger' : 'neutral'}>
                {copy.aiStatuses[aiStatus] || aiStatus}
              </Badge>
            </div>
          </div>

          {error ? (
            <p className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}

          {/* THE GOVERNED INPUT — the slot as an academic authored it. */}
          <section className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
            <h4 className="text-sm font-semibold text-[var(--color-text)]">{copy.slotTitle}</h4>
            <p className="text-xs text-[var(--color-text-muted)]">{copy.slotHint}</p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>
                {copy.slotCode}: <span className="font-mono text-xs"><bdi>{status?.package_code || packageCode}</bdi></span>
              </span>
              <span>{localize(status?.package_name, language)}</span>
              <span>
                {copy.slotSchool}: <span className="font-mono text-xs"><bdi>{status?.school_code || '—'}</bdi></span>
              </span>
              <span>
                {copy.slotStatus}: {copy.statuses[status?.package_status] || status?.package_status || '—'}
              </span>
            </p>

            <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">{copy.slotCompetencies}</p>
            {(governance?.competencies || []).length === 0 ? (
              <p className="text-sm text-amber-700">{copy.slotNoCompetencies}</p>
            ) : (
              <ul className="flex flex-wrap gap-2 text-xs">
                {governance.competencies.map((competency) => (
                  <li
                    key={competency.code}
                    className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1"
                  >
                    <span className="font-mono"><bdi>{competency.code}</bdi></span>
                    {competency.required_level
                      ? ` — ${copy.levels[competency.required_level] || competency.required_level}`
                      : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/*
            D1 — THE SIBLING BOUNDARY.

            Not decoration and not debug output: it is the only way a reviewer
            can tell whether this draft stayed in its lane, because the scope it
            was forbidden appears nowhere in the draft itself.
          */}
          <section className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
            <h4 className="text-sm font-semibold text-[var(--color-text)]">{copy.siblingTitle}</h4>
            <p className="text-xs text-[var(--color-text-muted)]">{copy.siblingHint}</p>

            {siblingRows.length === 0 ? (
              <p className="text-sm text-amber-700">{copy.siblingNone}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {siblingRows.map((sibling) => (
                  <li key={sibling.code} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs"><bdi>{sibling.code}</bdi></span>
                    <span>{localize(sibling.name, language)}</span>
                    {sibling.injected === null ? null : (
                      <Badge variant={sibling.injected ? 'neutral' : 'warning'}>
                        {sibling.injected ? copy.siblingInjected : copy.siblingMissing}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {siblingRows.some((sibling) => sibling.injected === false) ? (
              <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{copy.siblingMissingHint}</p>
            ) : null}

            {siblingsGone.length > 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                {copy.siblingGone}: <span className="font-mono"><bdi>{siblingsGone.join(', ')}</bdi></span>
                <span className="block">{copy.siblingGoneHint}</span>
              </p>
            ) : null}
          </section>

          {/* THE TWO GATES. */}
          {governance ? (
            <section className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <KeyRound className="h-4 w-4" aria-hidden="true" /> {copy.govTitle}
              </h4>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={governance.ready ? 'success' : 'warning'}>
                  {governance.ready ? copy.govReady : copy.govNotReady}
                </Badge>
                <Badge variant={governance.authorized ? 'success' : 'warning'}>
                  {governance.authorized ? copy.govAuthorized : copy.govNotAuthorized}
                </Badge>
                <Badge variant="neutral">
                  {copy.govDeclared}: {governance.declared_competencies ?? 0}
                </Badge>
              </div>

              {(governance.placeholder_competencies || []).length > 0 ? (
                <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                  <p>
                    {copy.govPlaceholders}:{' '}
                    <span className="font-mono"><bdi>{governance.placeholder_competencies.join(', ')}</bdi></span>
                  </p>
                  <p className="mt-1">{copy.govPlaceholderHint}</p>
                </div>
              ) : null}

              {/*
                THE EXPIRY IS ON THE SCREEN, not only in the database. A grant
                whose lapse nobody can see is a grant nobody can plan around,
                and the professional panel never sent or displayed one at all.
              */}
              {authorization ? (
                <div className="space-y-1 rounded-lg bg-[var(--color-surface-muted)] p-3 text-xs">
                  <p>
                    {copy.govBy}: {authorization.authorized_by || '—'}
                    {authorization.note ? ` — ${authorization.note}` : ''}
                  </p>
                  <p>
                    {copy.govGrantedAt}: {whenText(authorization.authorized_at) || '—'}
                  </p>
                  <p className={authorization.expires_at ? 'font-semibold' : ''}>
                    {copy.govExpires}: {authorization.expires_at ? whenText(authorization.expires_at) : copy.govNoExpiry}
                  </p>
                  {authorization.consumed_at ? (
                    <p>{copy.govConsumed}: {whenText(authorization.consumed_at)}</p>
                  ) : null}
                  {authorization.revoked_at ? (
                    <p>
                      {copy.govRevoked}: {whenText(authorization.revoked_at)}
                      {authorization.revoked_reason ? ` — ${authorization.revoked_reason}` : ''}
                    </p>
                  ) : null}
                  {authorization.unusable_reason ? (
                    <p className="text-amber-800">
                      {copy.govUnusable}: {authorization.unusable_reason}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Withdrawal is offered only while a grant is still live: a
                  consumed one cannot be withdrawn, because the generation it
                  permitted already happened. */}
              {governance.active_authorization ? (
                <div className="space-y-2 rounded-xl border border-[var(--color-border)] p-3">
                  <Textarea
                    label={copy.govRevoke}
                    rows={2}
                    value={revokeReason}
                    placeholder={copy.govRevokePlaceholder}
                    onChange={(event) => setRevokeReason(event.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || revokeReason.trim().length < 10}
                    onClick={async () => {
                      if (!window.confirm(copy.govRevokeConfirm)) return
                      const done = await withBusy(() =>
                        revokeAcademicPackageGeneration(packageCode, { reason: revokeReason.trim() }),
                      )
                      if (done) setRevokeReason('')
                    }}
                  >
                    <ShieldOff size={16} /> {copy.govRevoke}
                  </Button>
                </div>
              ) : null}

              {/* Offered only once the slot is genuinely ready. The server
                  refuses an authorization before readiness anyway, and showing
                  the form earlier invites an attempt that can only fail. */}
              {governance.ready && !governance.authorized ? (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--color-text-muted)]">{copy.govTwoKey}</p>
                  <Textarea
                    label={copy.govNote}
                    rows={2}
                    value={authorizationNote}
                    placeholder={copy.govNotePlaceholder}
                    hint={copy.govNoteHint}
                    onChange={(event) => setAuthorizationNote(event.target.value)}
                  />
                  <Input
                    type="datetime-local"
                    label={copy.govExpiry}
                    hint={copy.govExpiryHint}
                    value={authorizationExpiry}
                    onChange={(event) => setAuthorizationExpiry(event.target.value)}
                  />
                  {/*
                    The server accepts a null note. This screen does not: an
                    authorization with no recorded reason is indistinguishable,
                    six months later, from one nobody thought about.
                  */}
                  <Button
                    disabled={busy || authorizationNote.trim().length < 10}
                    onClick={async () => {
                      if (!window.confirm(copy.govConfirm)) return
                      const done = await withBusy(() =>
                        authorizeAcademicPackageGeneration(packageCode, {
                          note: authorizationNote.trim(),
                          ...(authorizationExpiry ? { expires_at: authorizationExpiry } : {}),
                        }),
                      )
                      if (done) {
                        setAuthorizationNote('')
                        setAuthorizationExpiry('')
                      }
                    }}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.govAuthorizing}
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" aria-hidden="true" /> {copy.govAuthorize}
                      </>
                    )}
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* STARTING THE RUN. */}
          <section className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
            <h4 className="text-sm font-semibold text-[var(--color-text)]">{copy.runTitle}</h4>

            {aiStatus === 'generation_failed' ? <p className="text-sm text-amber-700">{copy.failed}</p> : null}
            {isDraftRun ? <p className="text-sm text-[var(--color-text-muted)]">{copy.alreadyDrafted}</p> : null}
            {run?.error ? (
              <p className="whitespace-pre-line rounded-lg bg-red-50 p-2 text-xs text-red-700">
                {copy.runError}: {run.error}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="number"
                min={bounds.min}
                max={bounds.max}
                label={`${copy.moduleCount} (${bounds.min}–${bounds.max})`}
                hint={copy.moduleCountHint}
                value={moduleCount}
                onChange={(event) => setModuleCount(event.target.value)}
              />
              {/*
                Not a picker. The server validates `in:ar` and says why, so a
                three-language dropdown here would offer two choices that can
                only be refused.
              */}
              <div className="text-sm">
                <p className="font-medium text-[var(--color-text)]">{copy.locale}</p>
                <p className="mt-1">{copy.localeValue}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{copy.localeHint}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={busy || !canGenerate || !moduleCountValid}
                onClick={() =>
                  withBusy(() =>
                    startAcademicPackageAuthoring(packageCode, {
                      module_count: Number(moduleCount),
                      locale: 'ar',
                    }),
                  )
                }
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.generating}
                    {run?.current_step ? ` (${copy.currentStep}: ${copy.stages[run.current_step] || run.current_step})` : ''}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden="true" /> {copy.generate}
                  </>
                )}
              </Button>

              {isDraftRun ? (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(copy.rejectConfirm)) return
                    withBusy(() => rejectAcademicPackageDraft(packageCode))
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> {copy.reject}
                </Button>
              ) : null}
            </div>

            {run ? (
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
                <span>{copy.runStatuses[run.status] || run.status}</span>
                {run.requester?.name ? <span>{copy.requestedBy}: {run.requester.name}</span> : null}
                {run.started_at ? <span>{copy.startedAt}: {whenText(run.started_at)}</span> : null}
                {run.ai_model ? <span>{copy.model}: {run.ai_model}</span> : null}
                {run.prompt_version ? <span>{copy.promptVersion}: {run.prompt_version}</span> : null}
                {run.ai_run_id ? <span>{copy.aiRun}: <bdi>{run.ai_run_id}</bdi></span> : null}
              </p>
            ) : null}

            {/* D3 — a substitution that is recorded but not shown is still a
                silent one from where the reviewer is sitting. */}
            {usedFallback ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">{copy.fallbackTitle}</p>
                <p className="mt-1">{copy.fallbackHint}</p>
              </div>
            ) : null}
          </section>

          {progress ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 text-sm">
              <p className="mb-2 font-semibold text-[var(--color-text)]">{copy.progressTitle}</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {(progress.stages || []).map((stage) => {
                  const done = (progress.completed_steps || []).includes(stage)
                  const active = progress.current_step === stage
                  return (
                    <Badge key={stage} variant={done ? 'success' : active ? 'secondary' : 'neutral'}>
                      {done ? '✓ ' : active ? '⏳ ' : ''}
                      {copy.stages[stage] || stage}
                    </Badge>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">
                  {copy.modulesProgress}: {progress.modules_created ?? 0}
                  {progress.modules_planned ? ` / ${progress.modules_planned}` : ''}
                </Badge>
                <Badge variant="neutral">
                  {copy.mcqProgress}: {progress.mcq_items_created ?? 0}
                </Badge>
              </div>
            </section>
          ) : null}

          {run?.validation_results ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 text-sm">
              <p className="mb-2 font-semibold text-[var(--color-text)]">{copy.validation}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(run.validation_results).map(([key, value]) => (
                  <Badge key={key} variant="neutral">
                    {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {review ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 text-sm">
              <p className="mb-2 font-semibold text-[var(--color-text)]">{copy.reviewTitle}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={review.blocking_source_flags > 0 ? 'danger' : 'neutral'}>
                  {copy.blockingFlags}: {review.blocking_source_flags ?? 0}
                </Badge>
                <Badge variant="neutral">
                  {copy.mcqItems}: {review.mcq_items?.total ?? 0} / {review.mcq_items?.draft ?? 0} /{' '}
                  {review.mcq_items?.published ?? 0}
                </Badge>
                <Badge variant="neutral">
                  {copy.modulesDraft}: {review.modules_still_draft ?? 0}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">{copy.reviewHint}</p>
            </section>
          ) : null}
        </CardContent>
      </Card>

      {unresolvedFlags.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" /> SOURCE_REVIEW_REQUIRED
            </h4>
            {unresolvedFlags.map(({ artifact, flag }) => (
              <div
                key={`${artifact.id}::${flag.flag_id || flag.citation}`}
                className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"
              >
                <span className="block">
                  <strong>{flag.citation}</strong>
                  <span className="mt-0.5 block text-xs text-amber-700">
                    {flagOrigin(artifact)} · {copy.sourceReview}
                    {flag.blocks_publication ? ` · ${copy.blocksPublication}` : ''}
                  </span>
                </span>
                {renderVerdictForm(artifact, flag)}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {recordedFlags.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
              <ShieldAlert className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
              {copy.recordedTitle}
            </h4>
            <p className="text-xs text-[var(--color-text-muted)]">{copy.recordedHint}</p>
            {recordedFlags.map(({ artifact, flag }) => {
              const key = `${artifact.id}::${flag.flag_id || flag.citation}`
              const isOpen = Boolean(reopened[key])
              return (
                <div key={key} className="space-y-2 rounded-lg border border-[var(--color-border)] p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="block">
                      <strong>{flag.citation}</strong>
                      <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">{flagOrigin(artifact)}</span>
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={VERDICT_VARIANT[flag.verification_status] || 'neutral'}>
                        {flag.verification_status || '—'}
                      </Badge>
                      <span className="text-[11px] text-[var(--color-text-muted)]">{copy.previouslyRecorded}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {copy.recordedBy}: {flag.reviewed_by_name || (flag.reviewed_by ? `#${flag.reviewed_by}` : '—')}
                    {flag.reviewed_at ? ` · ${whenText(flag.reviewed_at)}` : ''}
                  </p>
                  <p className="rounded bg-[var(--color-surface-muted)] p-2 text-xs leading-5">
                    <span className="font-semibold">{copy.previousNotes}: </span>
                    {flag.review_notes || copy.noPreviousNotes}
                  </p>
                  {isOpen ? (
                    renderVerdictForm(artifact, flag)
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setReopened((prev) => ({ ...prev, [key]: true }))}
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" /> {copy.reReview}
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {artifacts.length > 0 ? (
        <Card>
          <CardContent className="space-y-2 p-6">
            <h4 className="text-sm font-semibold text-[var(--color-text)]">{copy.artifacts}</h4>
            <p className="text-xs text-[var(--color-text-muted)]">{copy.artifactsHint}</p>
            <div className="divide-y divide-[var(--color-border)]">
              {artifacts.map((artifact) => {
                const component = REGENERATABLE[artifact.component_type]
                const ref = refCode(artifact.component_ref)
                const canRegenerate =
                  isDraftRun
                  && !packageLocked
                  && !artifact.superseded_by
                  && Boolean(component)
                  && (component === 'assessment_policy' || ref !== '')

                return (
                  <div key={artifact.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">{copy.types[artifact.component_type] || artifact.component_type}</Badge>
                      <span className="font-mono text-xs text-[var(--color-text)]"><bdi>{ref || '—'}</bdi></span>
                      {artifact.sequence > 1 ? (
                        <span className="text-xs text-[var(--color-text-muted)]">v{artifact.sequence}</span>
                      ) : null}
                      {artifact.superseded_by ? <Badge variant="secondary">{copy.superseded}</Badge> : null}
                      {artifact.used_fallback_model ? (
                        <Badge variant="warning">{artifact.responding_model || copy.fallbackTitle}</Badge>
                      ) : null}
                      {artifact.provenance_state === 'LEGACY_PRE_2D' ? (
                        <Badge variant="warning">{copy.provenanceLegacy}</Badge>
                      ) : null}
                      {artifact.provenance_state === 'DERIVED_FROM_PARENT' ? (
                        <Badge variant="neutral">{copy.provenanceDerived}</Badge>
                      ) : null}
                    </div>
                    {canRegenerate ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          withBusy(() =>
                            regenerateAcademicPackageComponent(packageCode, {
                              component,
                              // The policy is package-level and carries no ref;
                              // everything else is addressed by module CODE.
                              ...(component === 'assessment_policy' ? {} : { ref }),
                            }),
                          )
                        }
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" /> {copy.regenerate}
                      </Button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
