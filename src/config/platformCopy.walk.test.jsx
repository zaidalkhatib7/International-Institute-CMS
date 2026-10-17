import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getBrandText } from './branding'
import { getPlatformArchitecture } from './platformArchitecture'
import { DOCUMENT_TITLES, applyDocumentLanguage, setAdminLanguage } from '../services/languageStorage'
import { readApiError } from '../services/apiResponse'
import { COPY as RPL_CONFIGURATION_COPY } from '../features/rpl/pages/RplConfigurationPage'

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
      expect(text).toMatch(/اختبار تثبيت الخبرة/)
      expect(text).toMatch(/خطة الدورات/)
      expect(text).toMatch(/الاختبار النهائي/)
    } else {
      expect(text).toMatch(/Experience confirmation quiz/)
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
