import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplConfigurationPage, { COPY } from './RplConfigurationPage'
import { AuthorizationContext } from '../../auth/context/authorizationContext'
import { createAuthorization } from '../../auth/authorization'
import { permissionsUser, roleUser } from '../../../test/roleFixtures'

/*
 * THE PROFESSIONAL PATH'S SETTINGS IN ONE PLACE (owner, 18 Oct 2026;
 * PLATFORM-JOURNEY-SPEC §4.6, §9.1 item 10).
 *
 * Five sections, the journey rules first; ?tab= opens a tab ("Committees" landed
 * on the wrong tab before); the journey rules are cards in the order a case meets
 * them, with anchors and a save bar that stays in view and says when something
 * is not saved; the levels table names each level's pathway; and the header links
 * the rules reference and the exchange rate for whoever may open them.
 */

const mocks = vi.hoisted(() => ({
  fetchRplSettings: vi.fn(),
  updateRplSettings: vi.fn(),
  fetchRplConfiguration: vi.fn(),
  fetchRplReferenceData: vi.fn(),
  createRplConfiguration: vi.fn(),
  updateRplConfiguration: vi.fn(),
  deleteRplConfiguration: vi.fn(),
  fetchRplCertificateWordings: vi.fn(),
}))
const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/rplService', () => mocks)
vi.mock('../../users/services/usersService', () => ({ fetchUsers: vi.fn().mockResolvedValue({ data: [] }) }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

const longPrompt = 'Governed advisory instruction. '.repeat(20)
const PATHWAYS = [
  { id: 1, code: 'rpl_with_secondary', name: { en: 'With secondary', ar: 'مع الثانوية' }, levels: [{ id: 11, code: 'practitioner', rank: 1, rpl_pathway_id: 1, name: { en: 'Practitioner', ar: 'ممارس مهني' } }] },
  { id: 2, code: 'rpl_without_secondary', name: { en: 'Without secondary', ar: 'دون الثانوية' }, levels: [{ id: 21, code: 'practitioner', rank: 1, rpl_pathway_id: 2, name: { en: 'Practitioner', ar: 'ممارس مهني' } }] },
]

function Probe() {
  const location = useLocation()
  return <p data-testid="probe">{location.search}</p>
}

function renderSettings(entry = '/rpl/configuration', user = roleUser('admin')) {
  return render(
    <AuthorizationContext.Provider value={createAuthorization(user)}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes><Route path="/rpl/configuration" element={<><RplConfigurationPage /><Probe /></>} /></Routes>
      </MemoryRouter>
    </AuthorizationContext.Provider>,
  )
}

const sections = () => screen.getByRole('navigation', { name: COPY.en.sectionsLabel })

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  mocks.fetchRplConfiguration.mockResolvedValue({ data: [] })
  mocks.fetchRplReferenceData.mockResolvedValue({ data: { pathways: PATHWAYS } })
  mocks.updateRplSettings.mockResolvedValue({ data: {} })
  mocks.fetchRplCertificateWordings.mockResolvedValue({ data: [] })
  mocks.fetchRplSettings.mockResolvedValue({
    data: {
      appeal_window_days: 15,
      require_verified_evidence_for_assessment: true,
      gemini_advisory_model: 'gemini-3.5-flash',
      gemini_advisory_prompt: longPrompt,
      rpl_advisory_include_evidence_documents: true,
      rpl_reapply_cooldown_days: 7,
      rpl_reapply_cooldown_scope: 'all_rejections',
      rpl_quiz_pass_mark: 50,
    },
  })
})

describe('the sections and ?tab=', () => {
  it('opens on the journey rules', async () => {
    renderSettings()
    expect(await within(sections()).findByRole('button', { name: COPY.en.workflow })).toHaveAttribute('aria-current', 'page')
    expect(within(sections()).getAllByRole('button').map((button) => button.textContent)).toEqual(['Journey rules', 'Fees', 'Certificate wording', 'Levels & standards', 'Pre-flow committee'])
    await waitFor(() => expect(mocks.fetchRplSettings).toHaveBeenCalled())
    expect(screen.queryByRole('navigation', { name: COPY.en.tabsLabel })).not.toBeInTheDocument()
  })

  it.each([
    ['fees', 'Fees', 'fee-schedules'],
    ['committees', 'Pre-flow committee', 'committees'],
    ['levels', 'Levels & standards', 'levels'],
  ])('?tab=%s opens that tab under its section', async (key, section, resource) => {
    renderSettings(`/rpl/configuration?tab=${key}`)
    expect(await within(sections()).findByRole('button', { name: section })).toHaveAttribute('aria-current', 'page')
    await waitFor(() => expect(mocks.fetchRplConfiguration).toHaveBeenCalledWith(resource))
    if (key !== 'fees') expect(within(screen.getByRole('navigation', { name: COPY.en.tabsLabel })).getByRole('button', { name: COPY.en[key] })).toHaveAttribute('aria-current', 'page')
  })

  it('falls back to the journey rules for an unknown tab', async () => {
    renderSettings('/rpl/configuration?tab=nonsense')
    expect(await within(sections()).findByRole('button', { name: 'Journey rules' })).toHaveAttribute('aria-current', 'page')
  })

  it('opens a section on its first tab, shows its sub-row, and writes ?tab= to the URL', async () => {
    renderSettings()
    fireEvent.click(await within(sections()).findByRole('button', { name: 'Levels & standards' }))
    const pages = screen.getByRole('navigation', { name: COPY.en.tabsLabel })
    expect(within(pages).getAllByRole('button').map((button) => button.textContent)).toEqual(['Pathways', 'Levels', 'Standards', 'Competencies', 'Evidence categories', 'Declarations'])
    expect(screen.getByTestId('probe')).toHaveTextContent('?tab=pathways')
    fireEvent.click(within(pages).getByRole('button', { name: 'Levels' }))
    expect(screen.getByTestId('probe')).toHaveTextContent('?tab=levels')
  })
})

describe('the journey rules', () => {
  it('shows the cards in the order a case meets them, with a chip for each', async () => {
    const { container } = renderSettings()
    await screen.findByRole('heading', { name: 'Intake & cooldown' })
    const ids = [...container.querySelectorAll('[id^="settings-"]')].map((element) => element.id)
    expect(ids).toEqual(['settings-intake', 'settings-screening', 'settings-interview', 'settings-entry-quiz', 'settings-course-plan', 'settings-after-quiz', 'settings-preflow', 'settings-statuses'])
    const chips = screen.getByRole('navigation', { name: COPY.en.jumpTo })
    expect(within(chips).getAllByRole('button').map((button) => button.textContent)).toEqual(['Intake', 'Document screening', 'Interview', 'Entry quiz', 'Course plan', 'After the quiz', 'Committee path', 'Status reference'])
    expect(container.querySelector('#settings-statuses').tagName).toBe('DETAILS')
  })

  it('keeps the save in a sticky bar, says when something is unsaved, and saves the same payload', async () => {
    renderSettings()
    const bar = await screen.findByTestId('settings-save-bar')
    expect(bar).toHaveStyle({ position: 'sticky', bottom: '0px' })
    await waitFor(() => expect(within(bar).getByRole('button', { name: COPY.en.saveSettings })).toBeEnabled())
    expect(within(bar).queryByText(COPY.en.unsaved)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(COPY.en.cooldownDays), { target: { value: '8' } })
    expect(within(bar).getByText(COPY.en.unsaved)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(COPY.en.cooldownDays), { target: { value: '7' } })
    expect(within(bar).queryByText(COPY.en.unsaved)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(COPY.en.cooldownDays), { target: { value: '8' } })
    fireEvent.click(within(bar).getByRole('button', { name: COPY.en.saveSettings }))
    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    expect(mocks.updateRplSettings.mock.calls[0][0]).toMatchObject({ appeal_window_days: 15, rpl_reapply_cooldown_days: 8, rpl_reapply_cooldown_scope: 'all_rejections', gemini_advisory_prompt: longPrompt.trim(), rpl_advisory_include_evidence_documents: true })
    await waitFor(() => expect(within(bar).queryByText(COPY.en.unsaved)).not.toBeInTheDocument())
  })

  it('names the Gemini documents switch as the owner reads it', async () => {
    renderSettings()
    expect(await screen.findByRole('checkbox', { name: /Send documents to Gemini/ })).toBeChecked()
    expect(screen.getByText(COPY.en.geminiOnAssessment)).toBeInTheDocument()
  })
})

describe('the levels table', () => {
  it('names each level\'s pathway, and status codes as words', async () => {
    mocks.fetchRplConfiguration.mockResolvedValue({ data: [{ id: 11, code: 'practitioner', rpl_pathway_id: 1, name: { en: 'Practitioner' }, is_active: true }, { id: 21, code: 'practitioner', rpl_pathway_id: 2, name: { en: 'Practitioner' }, status: 'published' }] })
    renderSettings('/rpl/configuration?tab=levels')
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['System code', 'Name', 'Pathway', 'Status', 'Actions'])
    await within(table).findByText('With secondary')
    expect(within(table).getByText('Without secondary')).toBeInTheDocument()
    expect(within(table).getByText('Published')).toBeInTheDocument()
    expect(within(table).queryByText('published')).not.toBeInTheDocument()
  })
})

describe('the header links', () => {
  it('links the rules reference and the exchange rate inside Finance for an administrator', async () => {
    renderSettings()
    expect(await screen.findByRole('link', { name: /Rules reference/ })).toHaveAttribute('href', '/rpl/source-of-truth')
    expect(screen.getByRole('link', { name: /Exchange rate/ })).toHaveAttribute('href', '/finance?tab=exchange_rate')
  })

  it('shows no exchange rate link to a settings manager without a finance or payment permission', async () => {
    renderSettings('/rpl/configuration', permissionsUser(['rpl.settings.manage']))
    expect(await screen.findByRole('link', { name: /Rules reference/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Exchange rate/ })).not.toBeInTheDocument()
  })
})

describe('in Arabic', () => {
  it('names the page and its sections without RPL', async () => {
    language.current = 'ar'
    renderSettings()
    expect(await screen.findByRole('heading', { level: 1, name: 'إعدادات المسار المهني' })).toBeInTheDocument()
    const names = within(screen.getByRole('navigation', { name: COPY.ar.sectionsLabel })).getAllByRole('button').map((button) => button.textContent)
    expect(names).toEqual(['قواعد الرحلة', 'الرسوم', 'صيغة الشهادة', 'المستويات والمعايير', 'مسار اللجنة السابق'])
    for (const label of [COPY.ar.title, COPY.ar.description, ...Object.values(COPY.ar.cards), ...Object.values(COPY.ar.anchors), COPY.ar.geminiOnAssessment]) expect(label).not.toMatch(/RPL|API|CMS/)
    expect(document.body.textContent).not.toContain('undefined')
  })
})
