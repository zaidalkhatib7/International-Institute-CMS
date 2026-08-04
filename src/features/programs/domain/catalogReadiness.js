/*
 * PUBLICATION READINESS — one source of truth for the fifteen checks.
 *
 * The server computes these on every programme fetch and returns them as
 * `catalog_readiness`. A gap programme cannot be activated until all fifteen
 * pass AND content_status is 'published'.
 *
 * These labels used to live inside CompetencyGapLibraryPage, so the programme
 * editor — the screen where you actually fix any of this — could not name them.
 * Activation failed there with "Complete and publish the programme content
 * before activation. (and 4 more errors)": Laravel's top-level `message` is the
 * first error plus a count, and the four it dropped were the ones that said
 * WHAT was missing.
 *
 * Keys must match ProgramCatalogReadinessService::evaluate() exactly. A key
 * with no label falls back to the raw key, which is ugly but never silent.
 */

export const READINESS_LABELS = {
  ar: {
    classification: "التصنيف والرمز",
    title_translations: "ترجمة الاسم",
    summary_translations: "ترجمة الوصف",
    objective_translations: "ترجمة الهدف",
    knowledge: "المعرفة",
    skills: "المهارات",
    professional_behaviours: "السلوكيات المهنية",
    abilities: "القدرات",
    performance_indicators: "مؤشرات الأداء",
    outcomes: "المخرجات",
    scientific_material: "المادة العلمية",
    question_bank: "بنك الأسئلة",
    passing_score: "درجة النجاح",
    competency_mapping: "ربط الكفاءات",
    rpl_pathway_mapping: "تحديد مسار RPL",
  },
  en: {
    classification: "Classification",
    title_translations: "Title translations",
    summary_translations: "Summary translations",
    objective_translations: "Objective translations",
    knowledge: "Knowledge",
    skills: "Skills",
    professional_behaviours: "Professional behaviours",
    abilities: "Abilities",
    performance_indicators: "Performance indicators",
    outcomes: "Outcomes",
    scientific_material: "Learning material",
    question_bank: "Question bank",
    passing_score: "Passing score",
    competency_mapping: "Competency mapping",
    rpl_pathway_mapping: "RPL pathway mapping",
  },
  nl: {
    classification: "Classificatie",
    title_translations: "Titelvertalingen",
    summary_translations: "Samenvattingsvertalingen",
    objective_translations: "Doelvertalingen",
    knowledge: "Kennis",
    skills: "Vaardigheden",
    professional_behaviours: "Professioneel gedrag",
    abilities: "Vermogens",
    performance_indicators: "Prestatie-indicatoren",
    outcomes: "Uitkomsten",
    scientific_material: "Leermateriaal",
    question_bank: "Vragenbank",
    passing_score: "Slaagscore",
    competency_mapping: "Competentiekoppeling",
    rpl_pathway_mapping: "RPL-trajectkoppeling",
  },
};

/*
 * Where to go to fix each one. A checklist that says "question bank: missing"
 * and leaves you to guess which screen owns it is only half an answer.
 *
 * `tab` is a tab on this same editor; `route` is a different screen. Verified
 * against the code rather than assumed, and two of them are NOT on this editor
 * at all:
 *
 *   - the six academic fields are written by the seed-pack panel on the AI tab,
 *     not by any field on the content tab;
 *   - rpl_pathway_ids and content_status are editable ONLY in the competency-gap
 *     library. The programme editor cannot publish a gap programme by itself,
 *     which is exactly why activation kept failing here with no way forward.
 */
export const READINESS_FIX = {
  classification: { tab: "basic-info" },
  title_translations: { tab: "basic-info" },
  summary_translations: { tab: "basic-info" },
  objective_translations: { tab: "basic-info" },
  knowledge: { tab: "ai-package" },
  skills: { tab: "ai-package" },
  professional_behaviours: { tab: "ai-package" },
  abilities: { tab: "ai-package" },
  performance_indicators: { tab: "ai-package" },
  outcomes: { tab: "ai-package" },
  scientific_material: { route: () => "/content/course" },
  question_bank: { route: () => "/quizzes" },
  passing_score: { tab: "final-quiz" },
  competency_mapping: { tab: "ai-package" },
  rpl_pathway_mapping: { route: () => "/competency-gap-library" },
};

/*
 * content_status is a separate gate, and it is NOT a dropdown you can set.
 *
 * The gap library offers "published" in its status select, but for a governed
 * package the API refuses it — assertPublishableContent throws
 * PACKAGE_PUBLICATION_REQUIRES_QUALITY_GATES on any ordinary edit that moves a
 * CGP programme into 'published'. The only route is
 * POST /admin/programs/{id}/publish-package, which verifies human question
 * review, complete taxonomy, learning-outcome coverage and the MCQ standard,
 * then sets the column itself.
 *
 * That button is on the AI package tab. Sending someone to the library select
 * would send them somewhere that says no.
 */
export const CONTENT_STATUS_FIX_TAB = "ai-package";

export function readinessLabel(key, language) {
  return READINESS_LABELS[language]?.[key] || READINESS_LABELS.en[key] || key;
}
