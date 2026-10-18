import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getBrandText } from './branding'
import { getPlatformArchitecture } from './platformArchitecture'
import { DOCUMENT_TITLES, applyDocumentLanguage, setAdminLanguage } from '../services/languageStorage'
import { readApiError } from '../services/apiResponse'
import { COPY as RPL_CONFIGURATION_COPY } from '../features/rpl/pages/RplConfigurationPage'
import { allNavigationLabels, allRouteTitleLabels } from '../routes/navigation'
import { JOURNEY_COPY, NEXT_STEP_COPY, QUEUES, STAGES } from '../features/rpl/domain/journey'
import { AFTER_QUIZ_COPY } from '../features/rpl/domain/afterQuiz'

/*
 * THE PLATFORM'S OWN WORDS (platform walk, 17 Oct 2026).
 *
 *   UI-11  the levels are the pathway's levels (ممارس مهني / ممارس مهني متقدم /
 *          خبير مهني), the RPL journey is today's (entry quiz, course plan, final
 *          exam), and no screen speaks of endpoints, backend or a backend contract;
 *   UI-13  the publish freeze's fixed English line reads in Arabic;
 *   UI-20  the browser tab title follows the interface language.
 */

const LEVELS = {
  ar: ['ممارس مهني', 'ممارس مهني متقدم', 'خبير مهني'],
  en: ['Professional Practitioner', 'Advanced Professional Practitioner', 'Professional Expert'],
}

describe('UI-11: levels and journey', () => {
  it.each(['ar', 'en'])('names the three levels of the pathway in %s, on the login page and in settings', (language) => {
    expect(getBrandText(language).accreditationLevels).toEqual(LEVELS[language])
    expect(getPlatformArchitecture(language).accreditationLevels).toEqual(LEVELS[language])
  })

  it.each(['ar', 'en'])('describes today\'s journey in %s: entry quiz, course plan, final exam and level certificate', (language) => {
    const stages = getPlatformArchitecture(language).rplWorkflowStages
    const text = stages.map((stage) => `${stage.title} ${stage.description}`).join(' ')

    expect(stages.map((stage) => stage.id)).toEqual(['application', 'screening', 'entry_quiz', 'course_plan', 'final_exam'])
    if (language === 'ar') {
      // One name for the quiz (18 Oct 2026): the entry quiz, which confirms the experience.
      expect(text).toMatch(/اختبار الدخول/)
      expect(text).toMatch(/تثبيت الخبرة/)
      expect(text).toMatch(/خطة الدورات/)
      expect(text).toMatch(/الاختبار النهائي/)
    } else {
      expect(text).toMatch(/The entry quiz/)
      expect(text).toMatch(/confirms the client's experience/)
      expect(text).toMatch(/course plan/i)
      expect(text).toMatch(/final exam/i)
    }
    expect(text).not.toMatch(/committee|اللجنة/i)
  })

  it('speaks of no endpoints, backend or backend contract on the settings and configuration screens', async () => {
    const { default: SettingsPage } = await import('../features/settings/pages/SettingsPage')
    localStorage.setItem('icpc_admin_language', 'ar')
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)

    expect(document.body.textContent).not.toMatch(/endpoints|backend|أساسي • متقدم/i)
    for (const language of ['ar', 'en']) expect(RPL_CONFIGURATION_COPY[language].description).not.toMatch(/backend|الواجهات البرمجية/i)
  })
})

describe('UI-13: the publish freeze in Arabic', () => {
  it('words the fixed immutable line in Arabic, and keeps any other server line as written', () => {
    const error = { response: { status: 422, data: { message: 'x', errors: { program: ['Published package v1.0 is immutable. Create a new version to modify content.'], other: ['Something else.'] } } } }
    const text = readApiError(error, '', 'ar')

    expect(text).toMatch(/الإصدار 1\.0 من هذه الحقيبة منشور ومحتواه ثابت/)
    expect(text).not.toMatch(/immutable/)
    expect(text).toMatch(/Something else\./)
    expect(readApiError(error, '', 'en')).toMatch(/Published package v1\.0 is immutable/)
  })
})

describe('UI-20: the browser tab title', () => {
  afterEach(() => vi.restoreAllMocks())

  it('follows the interface language', () => {
    applyDocumentLanguage('ar')
    expect(document.title).toBe(DOCUMENT_TITLES.ar)
    setAdminLanguage('en')
    expect(document.title).toBe('ICPC | Professional Accreditation Management System')
    expect(document.documentElement.lang).toBe('en')
    setAdminLanguage('ar')
    expect(document.title).toBe('ICPC | نظام إدارة الاعتماد المهني')
  })
})

/*
 * THE PLATFORM'S WORDS AFTER THE CLEAN-UP (18 Oct 2026; PLATFORM-JOURNEY-SPEC §6,
 * §9.1 item 15). In Arabic, the sidebar, the stages and queues, the Next step,
 * the queues' headings and the settings' sections never say RPL, API, CMS or
 * endpoint; the one name for the quiz is the entry quiz; owner-decision dates and
 * "super-admin" leave the hints; and no label carries Dutch.
 */
describe('the words of the cleaned-up platform', () => {
  const FORBIDDEN = /RPL|\bAPI\b|CMS|endpoint/i
  const arabic = (labels) => labels.map((label) => label.ar)

  it('keeps RPL, API, CMS and endpoint out of every Arabic label of the journey', () => {
    const queue = AFTER_QUIZ_COPY.ar.queue
    const settings = RPL_CONFIGURATION_COPY.ar
    const texts = [
      ...arabic(allNavigationLabels()),
      ...arabic(allRouteTitleLabels()),
      ...arabic(STAGES.map((stage) => stage.label)),
      ...arabic(QUEUES.flatMap((item) => [item.chip, item.tile, item.clientChip].filter(Boolean))),
      ...arabic(Object.values(NEXT_STEP_COPY.sentences)),
      ...arabic(Object.values(NEXT_STEP_COPY.actors)),
      ...arabic(Object.values(JOURNEY_COPY)),
      queue.eyebrow, queue.payments.title, queue.payments.empty, queue.experience_certificates.title, queue.experience_certificates.empty, queue.attention.title, queue.attention.allEmpty, queue.attention.notIssued,
      settings.title, settings.description, settings.workflow, settings.sectionLevels, settings.sectionPreflow, ...Object.values(settings.cards), ...Object.values(settings.anchors),
    ]
    for (const text of texts) expect(text).not.toMatch(FORBIDDEN)
  })

  it('names the quiz the entry quiz', () => {
    expect(STAGES.find((stage) => stage.key === 'entry_quiz').label).toEqual({ ar: 'اختبار الدخول', en: 'Entry quiz' })
    expect(NEXT_STEP_COPY.tabs.entryQuiz.ar).toMatch(/اختبار الدخول/)
  })

  /*
   * Review of 18 Oct 2026: no visible string on a touched screen cites an owner
   * decision or its date (code comments may). Read from the source, so a new hint
   * on one of these screens is caught too.
   */
  it.each([
    'src/features/rpl/pages/RplConfigurationPage.jsx',
    'src/features/rpl/pages/RplAssessmentsPage.jsx',
    'src/features/rpl/pages/RplCaseWorkspacePage.jsx',
    'src/features/rpl/pages/RplAfterQuizQueuePage.jsx',
    'src/features/rpl/pages/RplApplicationsPage.jsx',
    'src/features/rpl/domain/afterQuiz.js',
    'src/features/rpl/domain/coursePlan.js',
    'src/features/rpl/domain/entryQuiz.js',
    'src/features/rpl/domain/journey.js',
    'src/features/rpl/domain/caseDecision.js',
    'src/features/programs/pages/ProgramBuilderPage.jsx',
    'src/features/users/pages/UserWorkspacePage.jsx',
    'src/features/users/domain/wallet.js',
    'src/features/finance/domain/exchangeRate.js',
    'src/features/dashboard/pages/TodayPage.jsx',
  ])('cites no owner decision in a visible string of %s', (file) => {
    // The code without its comments: block comments (JSX ones included) and line comments.
    const code = readFileSync(resolve(cwd(), file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(/\r?\n/)
      .map((line) => line.replace(/(^|\s)\/\/.*$/, ''))
      .join('\n')
    expect(code).not.toMatch(/قرار المالك|قرارا المالك|owner decisions?[ ,]/)
  })

  it('leaves owner-decision dates and "super-admin" out of the after-quiz hints', () => {
    for (const language of ['ar', 'en']) {
      const copy = AFTER_QUIZ_COPY[language]
      const hints = [copy.charges.certificationFeeNote, copy.experience.approveHint, copy.finalExam.autoIssue, copy.finalExam.level.feeDue, copy.wording.hint, copy.wording.approverOnly, copy.settings.hint]
      for (const hint of hints) {
        expect(hint).not.toMatch(/super-admin|قرار المالك|owner decision|15 Oct|أكتوبر 2026/)
      }
    }
  })
})
