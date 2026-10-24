import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RoleAssignmentPanel from './RoleAssignmentPanel'
import { ROLE_GUARD_COPY } from '../domain/roleGuard'

/*
 * THE ROLES PANEL MIRRORS THE ROLE GUARD (owner report of 24 Oct 2026: an
 * administrator could make themselves super administrator, then approve what
 * only the owner's role may approve).
 *
 * The server decides; the panel asks it for this account (GET /admin/roles with
 * user_id) and offers only what it may grant. Pinned: a role the caller may not
 * grant is not offered; a role the account holds and the caller may not remove
 * stays ticked, locked and sent, so the sync never strips it; one's own roles
 * and a more privileged account are shown but not editable, with the server's
 * sentence; and a refusal on save is the server's sentence in the reader's
 * language, never the generic "no permission" line.
 *
 * The HTTP client is mocked rather than the service module, so the real URL and
 * the real body are pinned.
 */

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock('../../../services/http', () => ({ http }))

const permissions = (...slugs) => slugs.map((slug, index) => ({ id: index + 1, slug, name: slug }))

const SERVER = {
  superAdminOnly: { ar: 'المدير الأعلى فقط (من الخادم)', en: 'Only a super administrator (from the server).' },
  exceeds: { ar: 'دور يتجاوز صلاحياتك (من الخادم)', en: 'This role carries a permission you lack (from the server).' },
  own: { ar: 'أدوارك ليست لك (من الخادم)', en: 'Not your own roles (from the server).' },
  outranks: { ar: 'حساب يملك ما لا تملك (من الخادم)', en: 'This account outranks you (from the server).' },
}

function roles() {
  return [
    {
      id: 1, slug: 'super-admin', name: { en: 'Super administrator', ar: 'المدير الأعلى' }, permissions: permissions('rpl.certificate_wording.approve', 'finance.exchange_rates.manage'),
      grantable: false, grant_refusal: { reason_code: 'super_admin_role_needs_super_admin', message: SERVER.superAdminOnly, missing_permissions: [] },
    },
    { id: 2, slug: 'admin', name: { en: 'Administrator', ar: 'مدير' }, permissions: permissions('users.manage', 'roles.manage'), grantable: true, grant_refusal: null },
    { id: 3, slug: 'assessor', name: { en: 'Assessor', ar: 'مقيّم' }, permissions: permissions('rpl.assessments.perform'), grantable: true, grant_refusal: null },
    {
      id: 4, slug: 'finance-operator', name: { en: 'Finance operator', ar: 'مشغّل مالي' }, permissions: permissions('finance.manage', 'finance.exchange_rates.manage'),
      grantable: false, grant_refusal: { reason_code: 'role_carries_permission_actor_lacks', message: SERVER.exceeds, missing_permissions: ['finance.exchange_rates.manage'] },
    },
  ]
}

const OPEN = { actor_is_super_admin: false, target_user_id: 12, target_editable: true, target_refusal: null }

let answer

beforeEach(() => {
  vi.clearAllMocks()
  answer = { message: 'Roles fetched.', data: roles(), assignment: OPEN }
  http.get.mockImplementation(async (url) => {
    if (url === '/admin/roles') return { data: answer }
    throw new Error(`unexpected GET ${url}`)
  })
  http.put.mockResolvedValue({ data: { message: 'User roles updated.', data: { id: 12 } } })
})

const staff = (slugs = ['assessor'], id = 12) => ({ id, name: 'Staff Example', role: 'user', roles: slugs.map((slug) => ({ slug })) })

// A slug shows on its row and, when held, as a badge: the row is the one inside a label.
function checkbox(slug) {
  const row = screen.getAllByText(slug).map((element) => element.closest('label')).find(Boolean)
  return row.querySelector('input[type="checkbox"]')
}

const ready = () => screen.findAllByRole('checkbox')

describe('the roles a caller may grant', () => {
  it('are asked of the server for this account', async () => {
    render(<RoleAssignmentPanel user={staff()} language="en" />)
    await ready()
    expect(http.get).toHaveBeenCalledWith('/admin/roles', { params: { user_id: 12 } })
  })

  it('are the only ones offered: super administrator and a role beyond the caller are not', async () => {
    render(<RoleAssignmentPanel user={staff()} language="en" />)
    await ready()
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.queryByText('super-admin')).not.toBeInTheDocument()
    expect(screen.queryByText('finance-operator')).not.toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(checkbox('assessor')).toBeChecked()
    expect(checkbox('assessor')).toBeEnabled()
  })

  it('keep a held role the caller may not remove ticked and locked, with the reason, and send it on save', async () => {
    render(<RoleAssignmentPanel user={staff(['finance-operator'])} language="en" />)
    await ready()
    expect(checkbox('finance-operator')).toBeChecked()
    expect(checkbox('finance-operator')).toBeDisabled()
    expect(screen.getByText(SERVER.exceeds.en)).toBeInTheDocument()

    fireEvent.click(checkbox('finance-operator'))
    expect(checkbox('finance-operator')).toBeChecked()

    fireEvent.click(checkbox('assessor'))
    fireEvent.click(screen.getByRole('button', { name: 'Save roles' }))
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/users/12/roles', { roles: ['finance-operator', 'assessor'] }))
    expect(await screen.findByText('Roles updated.')).toBeInTheDocument()
    // What the caller may change can move with the change: the answer is asked again.
    await waitFor(() => expect(http.get.mock.calls.filter(([url]) => url === '/admin/roles')).toHaveLength(2))
  })

  it('say the reason in Arabic', async () => {
    render(<RoleAssignmentPanel user={staff(['finance-operator'])} language="ar" />)
    expect(await screen.findByText(SERVER.exceeds.ar)).toBeInTheDocument()
    expect(screen.getByText('تظهر هنا الأدوار التي يمكنك منحها فقط. الخادم يتحقق من كل تغيير.')).toBeInTheDocument()
  })
})

describe('an account whose roles the caller may not change', () => {
  it('is one\'s own: shown, not editable, with the server\'s sentence', async () => {
    answer.assignment = { ...OPEN, target_editable: false, target_refusal: { reason_code: 'role_change_own_account', message: SERVER.own, missing_permissions: [] } }
    answer.data = answer.data.map((role) => ({ ...role, grantable: false, grant_refusal: answer.assignment.target_refusal }))
    render(<RoleAssignmentPanel user={staff(['admin'])} language="en" actorId={12} />)
    expect(await screen.findByText(SERVER.own.en)).toBeInTheDocument()
    expect(screen.getByText('You cannot change the roles of this account')).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Save roles' })).not.toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('is one\'s own even when an older server says nothing about it', async () => {
    const older = roles().map((role) => {
      const copy = { ...role }
      delete copy.grantable
      delete copy.grant_refusal
      return copy
    })
    answer = { message: 'Roles fetched.', data: older }
    render(<RoleAssignmentPanel user={staff(['admin'], 5)} language="ar" actorId={5} />)
    expect(await screen.findByText(ROLE_GUARD_COPY.ar.role_change_own_account)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'حفظ الأدوار' })).not.toBeInTheDocument()
  })

  it('holds a permission the caller lacks: locked, and the page is told', async () => {
    const assignment = { ...OPEN, target_editable: false, target_refusal: { reason_code: 'account_holds_permission_actor_lacks', message: SERVER.outranks, missing_permissions: ['rpl.certificate_wording.approve'] } }
    answer.assignment = assignment
    const onAssignment = vi.fn()
    render(<RoleAssignmentPanel user={staff(['super-admin'])} language="ar" onAssignment={onAssignment} />)
    expect(await screen.findByText(SERVER.outranks.ar)).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(onAssignment).toHaveBeenCalledWith(assignment)
  })
})

describe('a refusal on save', () => {
  function refusal(status, reasonCode, label) {
    return Object.assign(new Error('refused'), {
      response: {
        status,
        data: { message: label.en, message_label: label, reason_code: reasonCode, refused_roles: ['admin'], missing_permissions: [], errors: { roles: [label.en] } },
      },
    })
  }

  it('is the server\'s sentence in Arabic, never the generic no-permission line', async () => {
    http.put.mockRejectedValueOnce(refusal(403, 'super_admin_role_needs_super_admin', SERVER.superAdminOnly))
    render(<RoleAssignmentPanel user={staff()} language="ar" />)
    await ready()
    fireEvent.click(checkbox('admin'))
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الأدوار' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(SERVER.superAdminOnly.ar)
    expect(screen.queryByText('ليست لديك صلاحية تنفيذ هذا الإجراء.')).not.toBeInTheDocument()
  })

  it('names the last super administrator, not "check the data"', async () => {
    const label = { ar: 'هذا آخر مدير أعلى (من الخادم)', en: 'This is the last super administrator (from the server).' }
    http.put.mockRejectedValueOnce(refusal(422, 'last_super_admin', label))
    render(<RoleAssignmentPanel user={staff()} language="en" />)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Save roles' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(label.en)
    expect(screen.getByRole('alert').textContent).not.toMatch(/Check the data/)
  })
})

describe('a caller without roles.manage', () => {
  it('sees no panel at all, as before', async () => {
    http.get.mockRejectedValue(Object.assign(new Error('forbidden'), { response: { status: 403, data: { message: 'This action is unauthorized.' } } }))
    const { container } = render(<RoleAssignmentPanel user={staff()} language="en" />)
    await waitFor(() => expect(http.get).toHaveBeenCalled())
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
