import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  /*
   * The editor's save re-sends the whole programme. Since the owner decisions of
   * 17 Oct 2026 its one price is price_usd_minor, re-sent exactly as stored: a
   * save here never resets the price, and never sends fees, currency or the
   * retired price_points, which the API refuses.
   */
  it('re-sends the stored price_usd_minor untouched, and never fees, currency or price_points', async () => {
    mocks.fetchCompetencyGapPrograms.mockResolvedValue([{
      id: 1,
      official_code: 'CGP-ETH-001',
      competency_gap_group_id: 1,
      program_category_id: 4,
      professional_program_level_id: 2,
      title: { ar: 'أخلاقيات العمل المهني' },
      content_status: 'draft',
      is_active: false,
      rpl_pathways: [],
      price_usd_minor: 12000,
      catalog_readiness: { percentage: 20, completed_count: 3, total_count: 15, is_ready: false, missing: [] },
    }])
    mocks.updateAdminProgram.mockResolvedValue({ data: {} })
    render(<MemoryRouter><CompetencyGapLibraryPage /></MemoryRouter>)

    fireEvent.click(await screen.findByRole('button', { name: /مراجعة واستكمال/ }))
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))

    await waitFor(() => expect(mocks.updateAdminProgram).toHaveBeenCalledTimes(1))
    const [id, payload] = mocks.updateAdminProgram.mock.calls[0]
    expect(id).toBe(1)
    expect(payload.price_usd_minor).toBe(12000)
    for (const key of ['price_points', 'fees', 'currency']) expect(payload).not.toHaveProperty(key)
  })

  /*
   * D1 (18 Oct 2026): the content admin holds programs.manage but not
   * rpl.settings.manage, so the rules reference answers 403. The library still
   * loads, the pathways card reads only, and a save keeps the programme's
   * pathways exactly as stored.
   */
  it('loads without the rules reference, reads the pathways only, and keeps rpl_pathway_ids on save', async () => {
    mocks.fetchRplSourceOfTruth.mockRejectedValue({ response: { status: 403, data: { message: 'This action is unauthorized.' } } })
    mocks.fetchCompetencyGapPrograms.mockResolvedValue([{
      id: 1,
      official_code: 'CGP-ETH-001',
      competency_gap_group_id: 1,
      title: { ar: 'أخلاقيات العمل المهني' },
      content_status: 'draft',
      is_active: false,
      rpl_pathway_ids: [10],
      rpl_pathways: [{ id: 10 }],
      catalog_readiness: { percentage: 20, completed_count: 3, total_count: 15, is_ready: false, missing: [] },
    }])
    mocks.updateAdminProgram.mockResolvedValue({ data: {} })
    render(<MemoryRouter><CompetencyGapLibraryPage /></MemoryRouter>)

    fireEvent.click(await screen.findByRole('button', { name: /مراجعة واستكمال/ }))
    expect(screen.getByText('يحدّد المسارات من يدير إعدادات المسار.')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByText(/This action is unauthorized/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))

    await waitFor(() => expect(mocks.updateAdminProgram).toHaveBeenCalledTimes(1))
    expect(mocks.updateAdminProgram.mock.calls[0][1].rpl_pathway_ids).toEqual([10])
  })

  // Review of 18 Oct 2026: a read that failed is not a missing permission.
  it('says the pathways could not be loaded, with a retry, when the read fails for a viewer who may make it', async () => {
    mocks.fetchRplSourceOfTruth.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Server Error' } } })
    render(<MemoryRouter><CompetencyGapLibraryPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /مراجعة واستكمال/ }))
    expect(screen.getByText('تعذّر تحميل المسارات.')).toBeInTheDocument()
    expect(screen.queryByText('يحدّد المسارات من يدير إعدادات المسار.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    await waitFor(() => expect(mocks.fetchRplSourceOfTruth).toHaveBeenCalledTimes(2))
  })
})
