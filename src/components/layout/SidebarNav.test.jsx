import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthorization } from '../../features/auth/authorization'
import { roleUser } from '../../test/roleFixtures'
import SidebarNav, { OPEN_GROUP_KEY } from './SidebarNav'

/*
 * THE SIDEBAR (PLATFORM-JOURNEY-SPEC §2.2, §9.1 item 3): one active row,
 * accordion for the administrators and flat for every smaller role, the open
 * group remembered by key, the pre-flow group's rule, and the badges.
 */

const language = vi.hoisted(() => ({ current: 'en' }))
vi.mock('../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

function renderNav(slug, path = '/dashboard', counts = null) {
  const { canAccess } = createAuthorization(roleUser(slug))
  return render(<MemoryRouter initialEntries={[path]}><SidebarNav canAccess={canAccess} counts={counts} /></MemoryRouter>)
}

const activeRows = (container) => [...container.querySelectorAll('a[aria-current="page"]')]

beforeEach(() => {
  language.current = 'en'
  localStorage.clear()
})

afterEach(() => vi.restoreAllMocks())

describe('exactly one active row', () => {
  it.each([
    ['/users/onsite', 'Clients'],
    ['/users/12', 'Clients'],
    ['/users/7/wallet', 'Clients'],
    ['/users', 'Staff & roles'],
    ['/finance/exchange-rate', 'Finance'],
    ['/rpl/applications/abc', 'Professional cases'],
    ['/rpl/evidence', 'Professional cases'],
    ['/rpl/source-of-truth', 'Professional path settings'],
    ['/quizzes/edit', 'Question banks'],
    ['/assessors', 'Assessments'],
  ])('on %s it is %s', (path, name) => {
    const { container } = renderNav('admin', path)
    const active = activeRows(container)
    expect(active).toHaveLength(1)
    expect(active[0]).toHaveTextContent(name)
    expect(active[0]).toHaveAttribute('data-active', 'true')
  })
})

describe('accordion and flat modes', () => {
  it('keeps one group open for an administrator, the active page\'s group opening by itself', async () => {
    const { container } = renderNav('admin', '/finance')
    expect(container.firstChild).toHaveAttribute('data-mode', 'accordion')
    const finance = await screen.findByRole('button', { name: /Finance & certificates/ })
    expect(finance).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /Courses & content/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: /Question banks/ })).not.toBeInTheDocument()
  })

  it('opens the professional path by default', () => {
    renderNav('admin', '/dashboard')
    expect(screen.getByRole('button', { name: /Professional RPL path/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it.each(['content-admin', 'trainer', 'assessor', 'quality-reviewer', 'finance-operator', 'support-agent', 'committee-member', 'appeal-reviewer'])('shows %s a flat list with captions and no toggles', (slug) => {
    const { container } = renderNav(slug)
    expect(container.firstChild).toHaveAttribute('data-mode', 'flat')
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('shows the assessor its pre-flow assessments under their caption', () => {
    renderNav('assessor')
    const section = screen.getByRole('region', { name: 'Pre-flow committee path' })
    expect(within(section).getByRole('link', { name: /Assessments/ })).toHaveAttribute('href', '/rpl/assessments')
  })
})

describe('the open group is remembered by key', () => {
  it('stores the key, not the label, and reopens it', () => {
    renderNav('admin', '/dashboard')
    fireEvent.click(screen.getByRole('button', { name: /Support & library/ }))
    expect(localStorage.getItem(OPEN_GROUP_KEY)).toBe('support')
  })

  it('ignores the old label-based memory', () => {
    localStorage.setItem('cms.sidebar.openGroup', 'العمليات والخدمات')
    renderNav('admin', '/dashboard')
    expect(screen.getByRole('button', { name: /Professional RPL path/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('still renders when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    renderNav('admin', '/dashboard')
    fireEvent.click(screen.getByRole('button', { name: /Setup/ }))
    expect(screen.getByRole('link', { name: /Professional path settings/ })).toBeInTheDocument()
  })
})

describe('the pre-flow group for an administrator', () => {
  it('hides with no pre-flow work and shows with some', () => {
    const { unmount } = renderNav('admin', '/dashboard', { preflowWork: 0 })
    expect(screen.queryByRole('button', { name: /Pre-flow committee path/ })).not.toBeInTheDocument()
    unmount()
    renderNav('admin', '/dashboard', { preflowWork: 2 })
    expect(screen.getByRole('button', { name: /Pre-flow committee path/ })).toBeInTheDocument()
  })

  it('shows on one of its pages and while filtering', () => {
    const { unmount } = renderNav('admin', '/quality', { preflowWork: 0 })
    expect(screen.getByRole('link', { name: /Quality review/ })).toHaveAttribute('aria-current', 'page')
    unmount()
    renderNav('admin', '/dashboard', { preflowWork: 0 })
    fireEvent.change(screen.getByRole('textbox', { name: 'Find a screen' }), { target: { value: 'appeal' } })
    expect(screen.getByRole('link', { name: /Appeals/ })).toBeInTheDocument()
  })
})

describe('badges', () => {
  it('draws a badge only above 0, with its screen-reader text', () => {
    renderNav('admin', '/rpl/applications', { casesForYou: 4, paymentsToConfirm: 0, experienceToApprove: 1, workTotal: 5 })
    expect(screen.getByRole('link', { name: /Professional cases/ })).toHaveTextContent('4 waiting')
    expect(screen.getByRole('link', { name: /Payments to confirm/ })).not.toHaveTextContent('waiting')
    expect(screen.getByRole('link', { name: /Today/ })).toHaveTextContent('5 waiting')
  })

  it('sums a collapsed group\'s badges on its header, and draws nothing at 0', () => {
    renderNav('admin', '/finance', { casesForYou: 2, paymentsToConfirm: 1, experienceToApprove: 0 })
    expect(screen.getByRole('button', { name: /Professional RPL path/ })).toHaveTextContent('3 waiting')
    expect(screen.getByRole('button', { name: /Support & library/ })).not.toHaveTextContent('waiting')
  })

  it('draws nothing for a count that failed', () => {
    renderNav('admin', '/rpl/applications', { casesForYou: null })
    expect(screen.getByRole('link', { name: /Professional cases/ })).not.toHaveTextContent('waiting')
  })

  it('reads in Arabic', () => {
    language.current = 'ar'
    renderNav('admin', '/rpl/applications', { casesForYou: 3 })
    expect(screen.getByRole('link', { name: /طلبات المسار المهني/ })).toHaveTextContent('بانتظار الإجراء')
    expect(screen.getByRole('button', { name: /مسار الاعتراف المهني بالتعلم السابق/ })).toBeInTheDocument()
  })
})
