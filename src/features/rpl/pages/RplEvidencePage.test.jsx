import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplEvidencePage from './RplEvidencePage'

/*
 * THE EVIDENCE CENTRE NAMES WHAT A CASE COUNTS (review round 2, 17 Oct 2026).
 *
 * A case counts what it froze at submit: a CV beside the experience letter, even
 * once staff untick the CV on the standard and deactivate it. The centre loads
 * the full reference list (inactive categories too) and hands it to the meter,
 * so an Arabic screen names the CV in Arabic, never by its English code.
 */

const mocks = vi.hoisted(() => ({
  fetchRplApplications: vi.fn(),
  fetchRplEvidence: vi.fn(),
  fetchRplReferenceData: vi.fn(),
  fetchRplApplication: vi.fn(),
}))
const language = vi.hoisted(() => ({ current: 'ar' }))

vi.mock('../services/rplService', async (importOriginal) => ({ ...(await importOriginal()), ...mocks }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

const CASE = {
  id: 41,
  public_id: 'case-41',
  case_reference: 'RPL-2026-FROZEN',
  status: 'administrative_review',
  user: { name: 'Applicant Example' },
  standard: { id: 9, evidence_categories: [{ id: 1, code: 'identity' }, { id: 3, code: 'professional_experience' }] },
  completeness: {
    percentage: 75,
    categories: [{ category_id: 1, code: 'identity', required: 1, provided: 1, complete: true }],
    evidence_groups: [{ code: 'experience_document', complete: false, any_of: [
      { category_id: 2, code: 'curriculum_vitae', required: 1, provided: 0, complete: false },
      { category_id: 3, code: 'professional_experience', required: 1, provided: 0, complete: false },
    ] }],
    declaration: { accepted: true },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'ar'
  mocks.fetchRplApplications.mockResolvedValue({ data: [CASE] })
  mocks.fetchRplEvidence.mockResolvedValue({ data: [] })
  mocks.fetchRplApplication.mockResolvedValue({ data: CASE })
  mocks.fetchRplReferenceData.mockResolvedValue({ data: { evidence_categories: [
    { id: 1, code: 'identity', name: { en: 'Personal identity', ar: 'الهوية الشخصية' }, is_active: true },
    { id: 2, code: 'curriculum_vitae', name: { en: 'Curriculum vitae', ar: 'السيرة الذاتية' }, is_active: false },
    { id: 3, code: 'professional_experience', name: { en: 'Professional experience', ar: 'الخبرة المهنية' }, is_active: true },
  ] } })
})

describe('the evidence centre', () => {
  it('names a frozen group member the standard no longer lists from the reference list', async () => {
    render(<MemoryRouter><RplEvidencePage /></MemoryRouter>)

    const select = await screen.findByRole('combobox', { name: 'ملف RPL' })
    fireEvent.change(select, { target: { value: 'case-41' } })

    expect((await screen.findAllByText('السيرة الذاتية أو الخبرة المهنية')).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Curriculum Vitae/)).not.toBeInTheDocument()
    expect(mocks.fetchRplApplication).toHaveBeenCalledWith('case-41')
  })
})
