const text = {
  ar: {
    accreditationLevels: ['ممارس مهني', 'ممارس مهني متقدم', 'خبير مهني'],
    trainingProgramTypes: ['دورات قصيرة', 'حقائب تدريبية', 'دبلومات مهنية', 'ماجستير مهني', 'دكتوراه مهنية', 'برامج تجسير', 'برامج المؤسسات والوزارات', 'حقائب سد الفجوات', 'برامج تنفيذية', 'برامج مخصصة'],
    // The professional RPL journey as it runs today (owner flow of 12 Oct and model of 15 Oct 2026; UI-11).
    rplWorkflowStages: [
      ['application', 'الطلب والوثائق', 'يختار العميل مسار الاعتراف المهني (مع شهادة ثانوية أو دونها) والمستوى: ممارس مهني أو ممارس مهني متقدم أو خبير مهني، ويرفع وثائقه.'],
      ['screening', 'الفرز والقرار', 'يفحص Gemini أصالة الوثائق ويتحقق من جهات العمل، ثم يقرر الموظفون: اختبار الدخول، أو مقابلة عبر الإنترنت أو في المكتب، أو الرفض مع إمكانية طلب جديد بعد مهلة الانتظار.'],
      ['entry_quiz', 'اختبار الدخول', 'يثبّت اختبارُ الدخول خبرةَ العميل؛ من ينجح يمكنه شراء شهادة تثبيت الخبرة والتوقف أو المتابعة، ومن يتابع أو لا ينجح ينتقل إلى خطة دورات يقترحها Gemini ويعتمدها الموظفون، بالحد الأدنى للمستوى.'],
      ['course_plan', 'خطة الدورات والتعلّم', 'يشتري العميل الدورات المعتمدة في خطته فقط، ويجتاز اختبار كل دورة.'],
      ['final_exam', 'الاختبار النهائي وشهادة المستوى', 'اختبار نهائي في الدورات التي درسها بثلاث محاولات، ثم انتظار وإعادة مدفوعة؛ وعند النجاح تصدر شهادة المستوى المختار تلقائيًا، بعد رسوم الشهادة إن وُجدت.'],
    ],
  },
  en: {
    accreditationLevels: ['Professional Practitioner', 'Advanced Professional Practitioner', 'Professional Expert'],
    trainingProgramTypes: ['Short courses', 'Training kits', 'Professional diplomas', 'Professional masters', 'Professional doctorates', 'Bridging programmes', 'Institution and ministry programs', 'Competency gap packages', 'Executive programmes', 'Custom programmes'],
    rplWorkflowStages: [
      ['application', 'The request and documents', 'The client chooses the professional RPL pathway (with or without a secondary certificate) and the level — Professional Practitioner, Advanced Professional Practitioner or Professional Expert — and uploads the documents.'],
      ['screening', 'Screening and decision', 'Gemini screens the documents for authenticity and checks the employers; staff then decide: the entry quiz, an interview online or at the office, or a decline, with a new request allowed after the waiting period.'],
      ['entry_quiz', 'The entry quiz', 'The entry quiz confirms the client\'s experience; a client who passes may buy the Experience Confirmation Certificate and stop, or continue, and a client who continues or does not pass moves to a course plan that Gemini proposes and staff approve, with the level\'s minimum.'],
      ['course_plan', 'Course plan and learning', 'The client buys only the approved courses on the plan and passes each course quiz.'],
      ['final_exam', 'Final exam and level certificate', 'A final exam over the studied courses, with three tries, then a wait and a paid retake; on a pass the certificate of the chosen level is issued automatically, after the certification fee when one is set.'],
    ],
  },
}

function toStage([id, title, description]) {
  return { id, title, description }
}

/*
 * What the platform says about itself (18 Oct 2026: the developer maps of the
 * public website, the role workspaces and the dashboard quick actions were removed
 * with the screens that showed them; PLATFORM-JOURNEY-SPEC §3.2). The journey
 * stages feed the "How the path runs" block on Today.
 */
export function getPlatformArchitecture(language = 'ar') {
  const source = text[language] || text.ar

  return {
    accreditationLevels: source.accreditationLevels,
    trainingProgramTypes: source.trainingProgramTypes,
    rplWorkflowStages: source.rplWorkflowStages.map(toStage),
  }
}

const defaultArchitecture = getPlatformArchitecture('ar')

export const accreditationLevels = defaultArchitecture.accreditationLevels
export const trainingProgramTypes = defaultArchitecture.trainingProgramTypes
export const rplWorkflowStages = defaultArchitecture.rplWorkflowStages

export default defaultArchitecture
