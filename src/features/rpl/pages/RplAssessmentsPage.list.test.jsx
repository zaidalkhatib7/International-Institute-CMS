import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplAssessmentsPage from './RplAssessmentsPage'
import { createAuthorization } from '../../auth/authorization'
import { roleUser } from '../../../test/roleFixtures'

/*
 * THE PRE-FLOW ASSESSMENTS LIST (PLATFORM-JOURNEY-SPEC §4.4): named for what it
 * holds (the current path's entry quiz is run inside the case), the assessors one
 * link away for whoever assigns them, and an empty list that points to the cases.
 */

const mocks = vi.hoisted(() => ({ fetchRplAssessments: vi.fn() }))
const auth = vi.hoisted(() => ({ user: null }))
const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/rplService', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.fromEntries(Object.keys(actual).map((key) => [key, key === 'fetchRplAssessments' ? mocks.fetchRplAssessments : vi.fn().mockResolvedValue({ data: [] })]))
})
vi.mock('../../auth/context/useAuthorization', () => ({ useAuthorization: () => createAuthorization(auth.user) }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

function Probe() {
  const location = useLocation()
  return <p data-testid="probe">{location.pathname}</p>
}

function renderList() {
  return render(
    <MemoryRouter initialEntries={['/rpl/assessments']}>
      <Routes>
        <Route path="/rpl/assessments" element={<RplAssessmentsPage />} />
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  auth.user = roleUser('admin')
  mocks.fetchRplAssessments.mockResolvedValue({ data: [] })
})

describe('the assessments list', () => {
  it('names itself for the pre-flow path and points an empty list to the professional cases', async () => {
    renderList()
    expect(await screen.findByRole('heading', { level: 1, name: 'Assessments' })).toBeInTheDocument()
    expect(screen.getAllByText(/The current path's entry quiz is run from inside the case/).length).toBeGreaterThan(0)
    expect(await screen.findByText('No assessments.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Professional cases' }))
    expect(screen.getByTestId('probe')).toHaveTextContent('/rpl/applications')
  })

  it('links the assessors for whoever assigns them, and not for an assessor', async () => {
    const { unmount } = renderList()
    fireEvent.click(await screen.findByRole('button', { name: /Assessors/ }))
    expect(screen.getByTestId('probe')).toHaveTextContent('/assessors')
    unmount()

    auth.user = roleUser('assessor')
    renderList()
    await screen.findByRole('heading', { level: 1, name: 'Assessments' })
    expect(screen.queryByRole('button', { name: /^Assessors$/ })).not.toBeInTheDocument()
  })

  it('reads in Arabic without the old workbench name', async () => {
    language.current = 'ar'
    renderList()
    expect(await screen.findByRole('heading', { level: 1, name: 'التقييمات' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/لوحة المقيّم|undefined/)
  })
})
