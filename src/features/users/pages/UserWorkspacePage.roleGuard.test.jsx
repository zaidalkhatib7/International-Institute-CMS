import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UserWorkspacePage, { copyByLanguage } from './UserWorkspacePage'
import { createAuthorization } from '../../auth/authorization'
import { roleUser } from '../../../test/roleFixtures'
import { ROLE_GUARD_COPY } from '../domain/roleGuard'

/*
 * A STAFF MEMBER'S PAGE UNDER THE ROLE GUARD (owner report of 24 Oct 2026: an
 * administrator could make themselves super administrator).
 *
 * The server refuses to change one's own roles, and to change the roles of,
 * edit, delete or erase an account that holds a permission the caller lacks
 * (the owner's included). The page mirrors the answer the roles panel gets for
 * this account, and when it did not know, the server's refusal is shown in its
 * own words, in the reader's language.
 */

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
const auth = vi.hoisted(() => ({ user: null }))
const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../../../services/http', () => ({ http }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))
vi.mock('../../auth/context/useAuthorization', () => ({ useAuthorization: () => createAuthorization(auth.user) }))

const en = copyByLanguage.en
const ar = copyByLanguage.ar

const OUTRANKS = { ar: 'يملك هذا الحساب صلاحيات لا تملكها (من الخادم)', en: 'This account holds permissions you do not hold (from the server).' }

function staffMember(id, slugs) {
  return {
    id,
    name: 'Owner Example',
    role: 'admin',
    roles: slugs.map((slug) => ({ slug })),
    registration_channel: 'online',
    email: 'owner@example.test',
    created_at: '2026-10-01T09:00:00+00:00',
    qualifications: [],
    work_experiences: [],
    rpl_applications: [],
  }
}

const ROLES = [
  { id: 1, slug: 'super-admin', name: { en: 'Super administrator', ar: 'المدير الأعلى' }, permissions: [], grantable: false, grant_refusal: null },
  { id: 2, slug: 'admin', name: { en: 'Administrator', ar: 'مدير' }, permissions: [], grantable: true, grant_refusal: null },
]

let world

function serve() {
  http.get.mockImplementation(async (url, config) => {
    if (url === `/admin/users/${world.user.id}`) return { data: { data: world.user } }
    if (url === `/admin/users/${world.user.id}/professional-qualification-eligibility`) return { data: { data: {} } }
    if (url === `/admin/users/${world.user.id}/wallet/transactions`) return { data: { data: [], current_page: 1, last_page: 1, total: 0 } }
    switch (url) {
      case '/admin/rpl/reference-data':
        return { data: { data: { pathways: [] } } }
      case '/admin/programs':
        return { data: { data: [] } }
      case '/academic-rpl/reference-data':
        return { data: { data: { tracks: [] } } }
      case '/admin/roles':
        expect(config).toEqual({ params: { user_id: world.user.id } })
        if (world.rolesError) throw world.rolesError
        return { data: { message: 'Roles fetched.', data: world.roles, assignment: world.assignment } }
      default:
        throw new Error(`unexpected GET ${url}`)
    }
  })
}

function renderStaff(id) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: `/users/${id}`, state: { navFrom: '/users' } }]}>
      <Routes><Route path="/users/:userId" element={<UserWorkspacePage />} /></Routes>
    </MemoryRouter>,
  )
}

function refusal(status, reasonCode, label, key = 'user') {
  return Object.assign(new Error('refused'), {
    response: {
      status,
      data: { message: label.en, message_label: label, reason_code: reasonCode, refused_roles: [], missing_permissions: [], errors: { [key]: [label.en] } },
    },
  })
}

const FORBIDDEN = Object.assign(new Error('forbidden'), { response: { status: 403, data: { message: 'This action is unauthorized.' } } })

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  auth.user = roleUser('admin')
  window.scrollTo = vi.fn()
  world = {
    user: staffMember(7, ['super-admin']),
    roles: ROLES,
    assignment: { actor_is_super_admin: false, target_user_id: 7, target_editable: true, target_refusal: null },
    rolesError: null,
  }
  serve()
})

afterEach(() => vi.restoreAllMocks())

describe('an account that holds a permission the caller lacks (the owner\'s)', () => {
  beforeEach(() => {
    world.assignment = {
      actor_is_super_admin: false,
      target_user_id: 7,
      target_editable: false,
      target_refusal: { reason_code: 'account_holds_permission_actor_lacks', message: OUTRANKS, missing_permissions: ['rpl.certificate_wording.approve'] },
    }
  })

  it('offers no edit, no role change, no delete and no erase, and says why', async () => {
    renderStaff(7)
    expect(await screen.findByTestId('account-locked')).toHaveTextContent(OUTRANKS.en)
    expect(screen.getByRole('button', { name: en.edit })).toBeDisabled()
    expect(screen.getByRole('button', { name: en.deleteAccount })).toBeDisabled()
    expect(screen.getByRole('button', { name: en.purge })).toBeDisabled()
    expect(screen.getByTestId('roles-locked')).toHaveTextContent(OUTRANKS.en)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('says it in Arabic', async () => {
    language.current = 'ar'
    renderStaff(7)
    expect(await screen.findByTestId('account-locked')).toHaveTextContent(OUTRANKS.ar)
    expect(screen.getByRole('button', { name: ar.edit })).toBeDisabled()
  })
})

describe('one\'s own account', () => {
  it('keeps the roles closed with a short explanation, and the profile editable', async () => {
    world.user = staffMember(1, ['admin'])
    world.assignment = {
      actor_is_super_admin: false,
      target_user_id: 1,
      target_editable: false,
      target_refusal: { reason_code: 'role_change_own_account', message: { ar: ROLE_GUARD_COPY.ar.role_change_own_account, en: ROLE_GUARD_COPY.en.role_change_own_account }, missing_permissions: [] },
    }
    renderStaff(1)
    expect(await screen.findByTestId('roles-locked')).toHaveTextContent(ROLE_GUARD_COPY.en.role_change_own_account)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryByTestId('account-locked')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: en.edit })).toBeEnabled()
  })
})

describe('a refusal the page did not foresee', () => {
  it('editing: the server\'s sentence in Arabic, not the generic line', async () => {
    language.current = 'ar'
    world.rolesError = FORBIDDEN
    http.put.mockRejectedValueOnce(refusal(403, 'account_holds_permission_actor_lacks', OUTRANKS))
    renderStaff(7)
    fireEvent.click(await screen.findByRole('button', { name: ar.edit }))
    fireEvent.click(screen.getByRole('button', { name: ar.save }))
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/users/7', expect.any(Object)))
    expect(await screen.findByRole('alert')).toHaveTextContent(OUTRANKS.ar)
    expect(screen.queryByText(ar.updateFailed)).not.toBeInTheDocument()
  })

  it('deleting the last super administrator: the server\'s sentence, not "check the data"', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const label = { ar: 'هذا آخر مدير أعلى (من الخادم)', en: 'This is the last super administrator (from the server).' }
    http.delete.mockRejectedValueOnce(refusal(422, 'last_super_admin', label))
    renderStaff(7)
    fireEvent.click(await screen.findByRole('button', { name: en.deleteAccount }))
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/admin/users/7'))
    const banner = await screen.findByText(label.en)
    expect(banner).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Check the data and requirements/)
  })

  it('erasing: the server\'s sentence in Arabic', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    language.current = 'ar'
    http.delete.mockRejectedValueOnce(refusal(403, 'account_holds_permission_actor_lacks', OUTRANKS))
    renderStaff(7)
    fireEvent.click(await screen.findByRole('button', { name: ar.purge }))
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/admin/users/7/purge'))
    expect(await screen.findByText(OUTRANKS.ar)).toBeInTheDocument()
  })
})
