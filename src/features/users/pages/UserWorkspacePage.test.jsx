import { fireEvent, getDefaultNormalizer, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UserWorkspacePage, { copyByLanguage } from './UserWorkspacePage'
import { formatLocalizedDate, formatLocalizedDateTime } from '../../../utils/localization'
import { LEGACY_POINTS } from '../../../utils/money'

/*
 * THE STAFF SIDE OF THE NEW RPL INTAKE (owner flow, 12 Oct 2026).
 *
 * Two rules now stand between staff and "create the RPL case": one open RPL
 * request per client (never overridable), and a waiting period after a declined
 * request, which staff may override with a written reason that the API audits.
 * The workspace also records a client's work experiences for them, which an
 * on-site client may have no way to do; since 17 Oct 2026 a request no longer
 * needs one, but the employer check reads them.
 *
 * The HTTP client is mocked rather than the service module, so these tests pin
 * the real URLs and the real bodies the API contract names, not a function
 * name that could drift away from them.
 */

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../../../services/http', () => ({ http }))
// Partial: utils/localization reads the language metadata off this same module.
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))
vi.mock('../../auth/context/useAuthorization', () => ({
  useAuthorization: () => ({ hasPermission: () => true, canAccess: () => true }),
}))

const REAPPLY_AT = '2026-10-19T10:00:00+00:00'

// Intl puts narrow no-break spaces inside a time ("10:00 AM"); keep them, so the
// rendered moment is compared with the formatter's own output character for character.
const EXACT = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) }

// The waiting period ends at a moment, not on a day: the API refuses until it has
// passed, so the notice must carry the time as well as the date.
function reapplyMoment(locale) {
  const moment = formatLocalizedDateTime(REAPPLY_AT, locale)
  expect(moment).not.toBe(formatLocalizedDate(REAPPLY_AT, locale))
  return moment
}

const pathway = {
  id: 3,
  code: 'rpl_without_secondary',
  levels: [{ id: 11, name: { en: 'Practitioner', ar: 'ممارس مهني', nl: 'Practitioner' } }],
}

const existingExperience = {
  id: 21,
  user_id: 7,
  job_title: 'Site supervisor',
  organization: 'Damascus Builders',
  description: 'Ran two crews.',
  started_on: '2019-03-01T00:00:00.000000Z',
  ended_on: null,
  is_current: true,
  country: 'SY',
  city: 'Damascus',
  website: 'https://builders.example',
  registration_number: 'CR-1234',
}

function client(overrides = {}) {
  return {
    id: 7,
    name: 'Client Example',
    role: 'user',
    roles: [],
    registration_channel: 'onsite',
    created_at: '2026-10-01T09:00:00+00:00',
    qualifications: [
      {
        id: 1,
        title: 'Grade nine',
        qualification_type: 'below_secondary',
        institution: 'Local school',
        is_verified: true,
      },
    ],
    work_experiences: [existingExperience],
    rpl_applications: [],
    ...overrides,
  }
}

function eligibility(intake) {
  return {
    rpl: {
      eligible: true,
      routing_status: 'rpl_without_secondary',
      recommended_pathway_code: 'rpl_without_secondary',
      reason_code: null,
      intake,
    },
    academic_rpl: { eligible: false, reason_code: null },
    professional_qualifications: { eligible_program_types: [] },
  }
}

const OPEN_INTAKE = {
  can_open_case: true,
  reason_code: null,
  reapply_available_at: null,
  open_case_reference: null,
}

let world

function serve() {
  http.get.mockImplementation(async (url) => {
    switch (url) {
      case '/admin/users/7':
        return { data: { data: world.user } }
      case '/admin/users/7/professional-qualification-eligibility':
        return { data: { data: world.eligibility } }
      case '/admin/rpl/reference-data':
        return { data: { data: { pathways: [pathway] } } }
      case '/admin/programs':
        return { data: { data: world.programs || [] } }
      // The staff wallet ledger (contract S5): a Laravel paginator.
      case '/admin/users/7/wallet/transactions':
        return { data: { data: world.ledger || [], current_page: 1, last_page: 1, total: (world.ledger || []).length } }
      case '/academic-rpl/reference-data':
        return { data: { data: { tracks: [] } } }
      default:
        throw new Error(`unexpected GET ${url}`)
    }
  })
}

function renderWorkspace() {
  return render(
    <MemoryRouter initialEntries={['/users/7']}>
      <Routes>
        <Route path="/users/:userId" element={<UserWorkspacePage />} />
        <Route path="/rpl/applications/:applicationId" element={<p>case opened</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function userFetches() {
  return http.get.mock.calls.filter(([url]) => url === '/admin/users/7').length
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  language.current = 'en'
  world = { user: client(), eligibility: eligibility(OPEN_INTAKE) }
  serve()
  http.post.mockResolvedValue({ data: { data: { public_id: 'case-uuid' } } })
  http.put.mockResolvedValue({ data: { data: {} } })
  http.delete.mockResolvedValue({ data: { message: 'Deleted.' } })
})

const en = copyByLanguage.en

async function chooseTargetLevel() {
  const select = await screen.findByLabelText(en.targetLevel)
  fireEvent.change(select, { target: { value: '11' } })
}

function startButton() {
  return screen.getByRole('button', { name: en.startRpl })
}

describe('opening an RPL case: the intake rules', () => {
  it('sends the unchanged payload when nothing restricts intake', async () => {
    renderWorkspace()
    await chooseTargetLevel()

    expect(startButton()).toBeEnabled()
    expect(screen.queryByRole('checkbox', { name: en.overrideCooldown })).toBeNull()
    fireEvent.click(startButton())

    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1))
    const [url, body] = http.post.mock.calls[0]
    expect(url).toBe('/admin/rpl/applications')
    // Exactly these three keys — no override fields when none was asked for.
    expect(body).toEqual({ user_id: 7, pathway_id: 3, requested_level_id: 11 })
    expect(await screen.findByText('case opened')).toBeInTheDocument()
  })

  it('disables Start for a client who already has an open RPL request, with no override offered', async () => {
    world.eligibility = eligibility({
      can_open_case: false,
      reason_code: 'open_rpl_case',
      reapply_available_at: null,
      open_case_reference: 'RPL-2026-OPEN0001',
    })
    renderWorkspace()
    await chooseTargetLevel()

    expect(screen.getByText(en.intakeOpenCase)).toBeInTheDocument()
    expect(screen.getByText('RPL-2026-OPEN0001')).toBeInTheDocument()
    expect(startButton()).toBeDisabled()
    // Never overridable: no checkbox, no reason box.
    expect(screen.queryByRole('checkbox', { name: en.overrideCooldown })).toBeNull()
    expect(screen.queryByLabelText(en.overrideReason)).toBeNull()

    fireEvent.click(startButton())
    expect(http.post).not.toHaveBeenCalled()
  })

  it('disables Start while the waiting period runs and nobody has overridden it', async () => {
    world.eligibility = eligibility({
      can_open_case: false,
      reason_code: 'reapply_cooldown',
      reapply_available_at: REAPPLY_AT,
      open_case_reference: null,
    })
    renderWorkspace()
    await chooseTargetLevel()

    expect(screen.getByText(en.intakeCooldown)).toBeInTheDocument()
    // The date and the time, through the same localized formatter as the page's other dates.
    expect(screen.getByText(reapplyMoment('en'), EXACT)).toBeInTheDocument()
    expect(startButton()).toBeDisabled()

    // A reason alone is not an override: the box has to be ticked.
    fireEvent.change(screen.getByLabelText(en.overrideReason), {
      target: { value: 'Committee agreed to waive the wait.' },
    })
    expect(startButton()).toBeDisabled()
  })

  it('needs a ticked box and a 10-to-2000-character trimmed reason before it overrides', async () => {
    world.eligibility = eligibility({
      can_open_case: false,
      reason_code: 'reapply_cooldown',
      reapply_available_at: REAPPLY_AT,
      open_case_reference: null,
    })
    renderWorkspace()
    await chooseTargetLevel()

    const box = screen.getByRole('checkbox', { name: en.overrideCooldown })
    const reason = screen.getByLabelText(en.overrideReason)

    fireEvent.click(box)
    expect(box).toBeChecked()
    expect(startButton()).toBeDisabled()

    // Nine characters once trimmed — the padding does not count.
    fireEvent.change(reason, { target: { value: '   too short   ' } })
    expect(startButton()).toBeDisabled()

    fireEvent.change(reason, { target: { value: 'x'.repeat(2001) } })
    expect(startButton()).toBeDisabled()

    fireEvent.change(reason, { target: { value: '  Committee agreed to waive the wait.  ' } })
    expect(startButton()).toBeEnabled()

    // Unticking takes the override away again.
    fireEvent.click(box)
    expect(startButton()).toBeDisabled()
    fireEvent.click(box)

    fireEvent.click(startButton())
    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1))
    expect(http.post.mock.calls[0][0]).toBe('/admin/rpl/applications')
    expect(http.post.mock.calls[0][1]).toEqual({
      user_id: 7,
      pathway_id: 3,
      requested_level_id: 11,
      override_reapply_cooldown: true,
      override_reason: 'Committee agreed to waive the wait.',
    })
  })

  it('shows the server refusal under errors.pathway_id when the API still says no', async () => {
    world.eligibility = eligibility({
      can_open_case: false,
      reason_code: 'reapply_cooldown',
      reapply_available_at: REAPPLY_AT,
      open_case_reference: null,
    })
    const refusal =
      "reapply_cooldown: This client's RPL request RPL-2026-DECLINED was declined. A new RPL request can be opened after 2026-10-19T10:00:00+00:00."
    http.post.mockRejectedValue({
      response: {
        status: 422,
        data: {
          message: refusal,
          errors: { pathway_id: [refusal] },
          reapply_available_at: REAPPLY_AT,
        },
      },
    })
    renderWorkspace()
    await chooseTargetLevel()
    fireEvent.click(screen.getByRole('checkbox', { name: en.overrideCooldown }))
    fireEvent.change(screen.getByLabelText(en.overrideReason), {
      target: { value: 'Committee agreed to waive the wait.' },
    })
    fireEvent.click(startButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(refusal)
  })

  it('renders the waiting period in Arabic with a localized date and no undefined copy', async () => {
    language.current = 'ar'
    world.eligibility = eligibility({
      can_open_case: false,
      reason_code: 'reapply_cooldown',
      reapply_available_at: REAPPLY_AT,
      open_case_reference: null,
    })
    renderWorkspace()
    const ar = copyByLanguage.ar

    expect(await screen.findByText(ar.intakeCooldown)).toBeInTheDocument()
    const arabicMoment = reapplyMoment('ar')
    // The Arabic locale, not the English one: Arabic-Indic digits.
    expect(arabicMoment).toMatch(/[٠-٩]/)
    expect(screen.getByText(arabicMoment, EXACT)).toBeInTheDocument()
    expect(screen.getByText(ar.intakeCooldownFrom, { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: ar.overrideCooldown })).toBeInTheDocument()
    expect(screen.getByText(ar.experiencesHint)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/undefined/)
  })

  it.each(['ar', 'en'])('renders every new label in %s, the open experience form included, with no undefined', async (locale) => {
    language.current = locale
    world.eligibility = eligibility({
      can_open_case: false,
      reason_code: 'reapply_cooldown',
      reapply_available_at: REAPPLY_AT,
      open_case_reference: null,
    })
    renderWorkspace()
    const copy = copyByLanguage[locale]

    await screen.findByText(copy.intakeCooldown)
    fireEvent.click(within(screen.getByTestId('work-experiences')).getByRole('button', { name: copy.addExperience }))

    const card = within(screen.getByTestId('work-experiences'))
    ;[copy.jobTitle, copy.organization, copy.country, copy.city, copy.website, copy.registrationNumber].forEach((label) => {
      expect(card.getByLabelText(label)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(copy.overrideReason)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/undefined/)
  })
})

describe('the work experiences panel', () => {
  function panel() {
    return screen.getByTestId('work-experiences')
  }

  it('lists the experiences and says one is required before an RPL request can be submitted', async () => {
    renderWorkspace()
    await screen.findByText(en.experiences)

    const card = within(panel())
    expect(card.getByText(en.experiencesHint)).toBeInTheDocument()
    expect(card.getByText('Site supervisor')).toBeInTheDocument()
    expect(card.getByText(/Damascus Builders/)).toHaveTextContent(new RegExp(`${en.experienceCurrent}.*Damascus, SY`))
  })

  it('says so when the client has none', async () => {
    world.user = client({ work_experiences: [] })
    renderWorkspace()
    await screen.findByText(en.experiences)

    expect(within(panel()).getByText(en.noExperiences)).toBeInTheDocument()
  })

  it('POSTs a new experience to the admin route with exactly the contract fields, country uppercased', async () => {
    world.user = client({ work_experiences: [] })
    renderWorkspace()
    await screen.findByText(en.experiences)

    fireEvent.click(within(panel()).getByRole('button', { name: en.addExperience }))
    const card = within(panel())
    fireEvent.change(card.getByLabelText(en.jobTitle), { target: { value: '  Electrician ' } })
    fireEvent.change(card.getByLabelText(en.organization), { target: { value: 'Aleppo Power' } })
    fireEvent.change(card.getByLabelText(en.experienceStart), { target: { value: '2018-01-15' } })
    fireEvent.change(card.getByLabelText(en.experienceEnd), { target: { value: '2023-06-30' } })
    const country = card.getByLabelText(en.country)
    fireEvent.change(country, { target: { value: 'sy' } })
    expect(country).toHaveValue('SY')
    fireEvent.change(card.getByLabelText(en.city), { target: { value: 'Aleppo' } })
    fireEvent.change(card.getByLabelText(en.website), { target: { value: 'https://power.example' } })
    fireEvent.change(card.getByLabelText(en.registrationNumber), { target: { value: 'REG-77' } })
    fireEvent.change(card.getByLabelText(en.experienceDescription), { target: { value: 'Wiring.' } })

    const fetchesBefore = userFetches()
    fireEvent.click(card.getByRole('button', { name: en.addExperience }))

    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1))
    const [url, body] = http.post.mock.calls[0]
    expect(url).toBe('/admin/users/7/experiences')
    expect(body).toEqual({
      job_title: 'Electrician',
      organization: 'Aleppo Power',
      description: 'Wiring.',
      started_on: '2018-01-15',
      ended_on: '2023-06-30',
      is_current: false,
      country: 'SY',
      city: 'Aleppo',
      website: 'https://power.example',
      registration_number: 'REG-77',
    })
    // Reloaded afterwards, the way the qualification card does it.
    await waitFor(() => expect(userFetches()).toBeGreaterThan(fetchesBefore))
    expect(await screen.findByText(en.experienceSaved)).toBeInTheDocument()
  })

  it('PUTs an edit to /admin/users/{user}/experiences/{experience} and clears blank optional fields', async () => {
    renderWorkspace()
    await screen.findByText(en.experiences)

    fireEvent.click(within(panel()).getByRole('button', { name: en.editExperience }))
    const card = within(panel())
    expect(card.getByLabelText(en.jobTitle)).toHaveValue('Site supervisor')
    expect(card.getByLabelText(en.country)).toHaveValue('SY')
    expect(card.getByLabelText(en.experienceStart)).toHaveValue('2019-03-01')

    fireEvent.change(card.getByLabelText(en.jobTitle), { target: { value: 'Site manager' } })
    fireEvent.change(card.getByLabelText(en.country), { target: { value: 'jo' } })
    fireEvent.change(card.getByLabelText(en.website), { target: { value: '' } })
    fireEvent.click(card.getByRole('button', { name: en.updateExperience }))

    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1))
    const [url, body] = http.put.mock.calls[0]
    expect(url).toBe('/admin/users/7/experiences/21')
    expect(body).toEqual({
      job_title: 'Site manager',
      organization: 'Damascus Builders',
      description: 'Ran two crews.',
      started_on: '2019-03-01',
      ended_on: null,
      is_current: true,
      country: 'JO',
      city: 'Damascus',
      website: null,
      registration_number: 'CR-1234',
    })
    expect(await screen.findByText(en.experienceSaved)).toBeInTheDocument()
  })

  it('DELETEs an experience at /admin/users/{user}/experiences/{experience} after confirmation, then reloads', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderWorkspace()
    await screen.findByText(en.experiences)
    const fetchesBefore = userFetches()

    fireEvent.click(within(panel()).getByRole('button', { name: en.deleteExperience }))

    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/admin/users/7/experiences/21'))
    await waitFor(() => expect(userFetches()).toBeGreaterThan(fetchesBefore))
    expect(await screen.findByText(en.experienceDeleted)).toBeInTheDocument()
  })

  it('does not delete when staff cancel the confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderWorkspace()
    await screen.findByText(en.experiences)

    fireEvent.click(within(panel()).getByRole('button', { name: en.deleteExperience }))

    expect(http.delete).not.toHaveBeenCalled()
  })

  it('keeps Save disabled until job title and organisation are filled and the country is two letters', async () => {
    world.user = client({ work_experiences: [] })
    renderWorkspace()
    await screen.findByText(en.experiences)

    fireEvent.click(within(panel()).getByRole('button', { name: en.addExperience }))
    const card = within(panel())
    const save = card.getByRole('button', { name: en.addExperience })
    expect(save).toBeDisabled()

    fireEvent.change(card.getByLabelText(en.jobTitle), { target: { value: 'Electrician' } })
    fireEvent.change(card.getByLabelText(en.organization), { target: { value: 'Aleppo Power' } })
    expect(save).toBeEnabled()

    // Only Latin letters survive, uppercased; one letter is not a code.
    fireEvent.change(card.getByLabelText(en.country), { target: { value: 's1' } })
    expect(card.getByLabelText(en.country)).toHaveValue('S')
    expect(save).toBeDisabled()
  })
})

describe('the preferred language', () => {
  it('offers Arabic and English only, and saves a stored retired nl as English', async () => {
    world.user = client({ preferred_locale: 'nl' })
    renderWorkspace()

    fireEvent.click(await screen.findByRole('button', { name: en.edit }))
    const select = screen.getByLabelText(en.locale)
    expect([...select.options].map((option) => option.value)).toEqual(['en', 'ar'])
    expect(select).toHaveValue('en')

    fireEvent.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1))
    const [url, body] = http.put.mock.calls[0]
    expect(url).toBe('/admin/users/7')
    expect(body.preferred_locale).toBe('en')
  })
})

/*
 * THE CLIENT'S WALLET AND THE STAFF-ASSISTED ENROLMENT (owner decisions of 17
 * Oct 2026; contract S5, S6, S7). Two balances, never added together; the staff
 * ledger with a filter by currency, the earlier points rows muted under one line
 * that says what became of them; and an enrolment paid from the balance staff
 * choose, the body echoing the amount the screen showed.
 */
const money = (currency, minor, amount) => ({ currency, amount_minor: minor, amount })
const RATE = { id: 7, syp_per_usd: '13000.0000', effective_from: '2026-10-17T09:00:00Z' }
const POINTS = LEGACY_POINTS

function programme(overrides = {}) {
  return {
    id: 31,
    program_type: 'professional_diploma',
    title: { en: 'Professional Diploma in Site Safety', ar: 'الدبلوم المهني في سلامة المواقع' },
    is_active: true,
    is_free: false,
    price_usd_minor: 4999,
    price: { usd: money('USD', 4999, '49.99'), syp: money('SYP', 649870, '649870'), exchange_rate: RATE },
    ...overrides,
  }
}

function withProgrammes(programs) {
  world.programs = programs
  world.eligibility = { ...eligibility(OPEN_INTAKE), professional_qualifications: { eligible_program_types: ['professional_diploma'] } }
}

describe('the wallet card', () => {
  it('shows both balances and the ledger, the earlier points rows muted under one line', async () => {
    world.user = client({ wallet_balances: { usd: money('USD', 25000, '250.00'), syp: money('SYP', 700000, '700000') } })
    world.ledger = [
      { id: 3, created_at: '2026-10-17T10:00:00Z', direction: 'credit', currency: 'SYP', amount: money('SYP', 700000, '700000'), balance_after: money('SYP', 700000, '700000'), kind: 'top_up', method: 'syriatel_cash', reference: 'SY-1', received_on: '2026-10-17', notes: null, description: null, recorded_by: { id: 2, name: 'Finance Officer' }, subject: null },
      { id: 2, created_at: '2026-10-17T00:00:00Z', direction: 'credit', currency: 'USD', amount: money('USD', 25000, '250.00'), balance_after: money('USD', 25000, '250.00'), kind: 'conversion', method: null, reference: null, received_on: null, notes: null, description: null, recorded_by: null, subject: null },
      { id: 1, created_at: '2026-10-01T09:00:00Z', direction: 'credit', currency: POINTS, amount: { currency: POINTS, amount_minor: 250, amount: '250', legacy: true }, balance_after: { currency: POINTS, amount_minor: 250, amount: '250', legacy: true }, kind: null, method: null, reference: null, received_on: null, notes: null, description: 'Credit', recorded_by: null, subject: null },
    ]
    renderWorkspace()

    const ledger = within(await screen.findByRole('table', { name: 'Wallet movements' }))
    expect(screen.getAllByText('$ 250.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('700,000 SYP').length).toBeGreaterThan(0)
    expect(ledger.getByText('Top-up')).toBeInTheDocument()
    expect(ledger.getByText(/Syriatel Cash · SY-1/)).toBeInTheDocument()
    expect(ledger.getByText('Points carried into US dollars')).toBeInTheDocument()
    const legacy = ledger.getAllByText('250 points (earlier record)')[0].closest('tr')
    expect(legacy).toHaveAttribute('data-legacy', 'true')
    expect(screen.getByText(/Until 17 Oct 2026 the wallet held points/)).toBeInTheDocument()
    expect(http.get).toHaveBeenCalledWith('/admin/users/7/wallet/transactions', { params: { page: 1 } })

    fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'legacy' } })
    await waitFor(() => expect(http.get).toHaveBeenCalledWith('/admin/users/7/wallet/transactions', { params: { currency: POINTS, page: 1 } }))
  })

  it('offers Top up and Deduct for the client', async () => {
    renderWorkspace()

    expect(await screen.findByRole('button', { name: 'Top up' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deduct' })).toBeInTheDocument()
  })
})

describe('the staff-assisted enrolment (S7)', () => {
  it('shows the dollar price, offers the balance to pay from, and sends the amount shown', async () => {
    world.user = client({ wallet_balances: { usd: money('USD', 10000, '100.00'), syp: money('SYP', 100000, '100000') } })
    withProgrammes([programme()])
    http.post.mockResolvedValue({ data: { data: { enrollment_id: 5 } } })
    renderWorkspace()

    const select = await screen.findByLabelText(en.selectProgram)
    expect(within(select).getByRole('option', { name: /Professional Diploma in Site Safety · \$ 49\.99/ })).toBeInTheDocument()
    fireEvent.change(select, { target: { value: '31' } })

    const usdChoice = screen.getByRole('radio', { name: /US-dollar balance/ })
    const sypChoice = screen.getByRole('radio', { name: /Syrian-pound balance/ })
    expect(usdChoice).toBeEnabled()
    // 649,870 pounds are due at today's rate and the client holds 100,000: too low.
    expect(sypChoice).toBeDisabled()
    expect(screen.getByText('balance too low')).toBeInTheDocument()
    const enrol = screen.getByRole('button', { name: 'Enrol and pay from the US-dollar balance' })
    expect(enrol).toBeDisabled()
    fireEvent.click(usdChoice)
    fireEvent.click(enrol)

    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/users/7/enrollments', { program_id: 31, currency: 'USD', expected_amount_minor: 4999 }))
  })

  it('offers no Syrian-pound payment while no exchange rate is set', async () => {
    world.user = client({ wallet_balances: { usd: money('USD', 0, '0.00'), syp: money('SYP', 9000000, '9000000') } })
    withProgrammes([programme({ price: { usd: money('USD', 4999, '49.99'), syp: null, exchange_rate: null } })])
    renderWorkspace()

    fireEvent.change(await screen.findByLabelText(en.selectProgram), { target: { value: '31' } })
    expect(screen.getByRole('radio', { name: /Syrian-pound balance/ })).toBeDisabled()
    expect(screen.getByText(/No exchange rate is set/)).toBeInTheDocument()
  })

  it('on 409 price_changed charges nothing, reads the price again and keeps the choice', async () => {
    world.user = client({ wallet_balances: { usd: money('USD', 10000, '100.00'), syp: money('SYP', 0, '0') } })
    withProgrammes([programme()])
    http.post.mockRejectedValue({ response: { status: 409, data: { message: 'The price changed since it was shown.', code: 'price_changed', current_amount: money('USD', 5999, '59.99'), current_price: { usd: money('USD', 5999, '59.99'), syp: null, exchange_rate: null } } } })
    renderWorkspace()

    fireEvent.change(await screen.findByLabelText(en.selectProgram), { target: { value: '31' } })
    fireEvent.click(screen.getByRole('radio', { name: /US-dollar balance/ }))
    const fetchesBefore = userFetches()
    world.programs = [programme({ price_usd_minor: 5999, price: { usd: money('USD', 5999, '59.99'), syp: null, exchange_rate: null } })]
    fireEvent.click(screen.getByRole('button', { name: 'Enrol and pay from the US-dollar balance' }))

    expect(await screen.findByText('The price changed since it was shown: it is now $ 59.99. Nothing was charged; check it and enrol again.')).toBeInTheDocument()
    await waitFor(() => expect(userFetches()).toBeGreaterThan(fetchesBefore))
    expect(await screen.findByText('pays $ 59.99')).toBeInTheDocument()
    expect(screen.getByLabelText(en.selectProgram)).toHaveValue('31')
    expect(screen.getByRole('radio', { name: /US-dollar balance/ })).toBeChecked()
  })

  it('enrols a free programme with the programme alone', async () => {
    withProgrammes([programme({ is_free: true, price_usd_minor: 0, price: null })])
    http.post.mockResolvedValue({ data: { data: { enrollment_id: 6 } } })
    renderWorkspace()

    fireEvent.change(await screen.findByLabelText(en.selectProgram), { target: { value: '31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enrol (free)' }))

    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/users/7/enrollments', { program_id: 31 }))
  })
})
