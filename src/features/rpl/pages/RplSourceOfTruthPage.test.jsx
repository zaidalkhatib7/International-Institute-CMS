import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplSourceOfTruthPage from './RplSourceOfTruthPage'

const mocks = vi.hoisted(() => ({ fetchRplSourceOfTruth: vi.fn() }))

vi.mock('../services/rplService', () => ({ fetchRplSourceOfTruth: mocks.fetchRplSourceOfTruth }))

function source() {
  return { data: {
    schema_version: 'rpl-source-v2', source_hash: 'abc123',
    pathways: [{ id: 1, code: 'rpl_without_secondary', name: { ar: 'مسار دون الثانوية العامة', en: 'Without secondary certificate', nl: 'Zonder middelbareschooldiploma' }, description: { ar: 'مسار الخبرة', en: 'Experience route', nl: 'Ervaringstraject' }, levels: [{ id: 1, code: 'practitioner', name: { ar: 'ممارس', en: 'Practitioner', nl: 'Beoefenaar' } }] }],
    published_standards: [{ id: 1, code: 'STD-1', name: { ar: 'المعيار العام', en: 'General standard', nl: 'Algemene norm' } }],
    published_rubrics: [{ id: 1 }], approved_outcomes: [{ id: 1 }], evidence_policy: { categories: [{ id: 1 }] },
    programme_governance: { available_to_gemini: 1, unmapped_library_programs: 99 },
    rpl_course_catalogue: { rpl_without_secondary: [{ program_id: 2, official_code: 'CGP-ETH-001', title: { ar: 'أخلاقيات العمل المهني', en: 'Professional ethics', nl: 'Beroepsethiek' }, short_description: { ar: 'برنامج معتمد', en: 'Governed programme', nl: 'Beheerd programma' }, accredited_hours: 20 }] },
    gemini_governance: { enabled: true, model: 'gemini-flash', configured_prompt: 'Approved prompt', effective_prompt: 'Approved prompt\n\nIMMUTABLE RPL SOURCE-OF-TRUTH RULES' },
  } }
}

describe('RplSourceOfTruthPage', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.fetchRplSourceOfTruth.mockResolvedValue(source()) })

  it('shows the strict Arabic service boundary and the exact governed Gemini programme', async () => {
    localStorage.setItem('icpc_admin_language', 'ar')
    render(<MemoryRouter><RplSourceOfTruthPage /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'مصدر الحقيقة المعتمد لـ RPL وGemini' })).toBeInTheDocument()
    expect(screen.getByText('لا يحمل شهادة ثانوية عامة')).toBeInTheDocument()
    expect(screen.getByText('المؤهلات المهنية')).toBeInTheDocument()
    expect(screen.getByText(/CGP-ETH-001/)).toBeInTheDocument()
    expect(screen.getByText(/المدير وحده/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/[ØÙÃÂ]/)
  })

  it('renders correct Dutch governance text', async () => {
    localStorage.setItem('icpc_admin_language', 'nl')
    render(<MemoryRouter><RplSourceOfTruthPage /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'RPL- en Gemini-bron van waarheid' })).toBeInTheDocument()
    /*
     * This used to assert "volledig apart academisch traject" — a completely
     * separate academic route. That was the green card, on the page the CMS
     * calls its source of truth, contradicting the very payload the page
     * renders (`prior_academic_degree_auto_excludes_from_rpl => false`).
     *
     * Now it asserts the opposite, and that the page never says a degree
     * excludes anyone, so the claim cannot come back.
     */
    expect(screen.getByText(/sluit RPL niet uit/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/volledig apart academisch traject/)
    expect(document.body.textContent).not.toMatch(/nemen niet deel aan RPL/)
    expect(screen.getByText(/CGP-ETH-001/)).toBeInTheDocument()
    // Mojibake guard: Dutch and Arabic must survive the render intact.
    expect(document.body.textContent).not.toMatch(/[ØÙÃÂ]/)
  })
})
