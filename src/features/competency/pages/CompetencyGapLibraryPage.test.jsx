import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CompetencyGapLibraryPage from './CompetencyGapLibraryPage'

const mocks = vi.hoisted(() => ({
  fetchCompetencyFramework: vi.fn(),
  fetchCompetencyGapPrograms: vi.fn(),
  updateAdminProgram: vi.fn(),
  fetchRplSourceOfTruth: vi.fn(),
}))

vi.mock('../services/competencyFrameworkService', () => ({
  fetchCompetencyFramework: mocks.fetchCompetencyFramework,
  fetchCompetencyGapPrograms: mocks.fetchCompetencyGapPrograms,
}))

vi.mock('../../programs/services/programsService', () => ({
  updateAdminProgram: mocks.updateAdminProgram,
}))

vi.mock('../../rpl/services/rplService', () => ({
  fetchRplSourceOfTruth: mocks.fetchRplSourceOfTruth,
}))

describe('CompetencyGapLibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('icpc_admin_language', 'ar')
    mocks.fetchCompetencyFramework.mockResolvedValue({
      groups: [{ id: 1, code: 'CGP-ETH', name: { ar: 'الأخلاقيات والسلوك المهني' }, is_active: true }],
    })
    mocks.fetchRplSourceOfTruth.mockResolvedValue({ pathways: [{ id: 10, code: 'rpl_without_secondary', name: { ar: 'دون الثانوية' } }] })
    mocks.fetchCompetencyGapPrograms.mockResolvedValue([{
      id: 1,
      official_code: 'CGP-ETH-001',
      competency_gap_group_id: 1,
      title: { ar: 'أخلاقيات العمل المهني' },
      professional_level: { name: { ar: 'ممارس مهني' } },
      accredited_hours: 20,
      content_status: 'draft',
      is_active: false,
      rpl_pathways: [],
      catalog_readiness: { percentage: 20, completed_count: 3, total_count: 15, is_ready: false, missing: ['scientific_material', 'question_bank', 'rpl_pathway_mapping'] },
    }])
  })

  it('shows the governed Arabic source and explicitly lists what remains before publication', async () => {
    render(<MemoryRouter><CompetencyGapLibraryPage /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'المكتبة الدولية لبرامج سد فجوات الكفاءات' })).toBeInTheDocument()
    expect(screen.getByText('CGP-ETH-001')).toBeInTheDocument()
    expect(screen.getByText('أخلاقيات العمل المهني')).toBeInTheDocument()
    expect(screen.getAllByText(/المادة العلمية/).length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toMatch(/[ÃØÙ]{2,}/)
  })
})
