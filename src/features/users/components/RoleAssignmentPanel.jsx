import { useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '../../../components/ui'
import { assignUserRoles, fetchRoles } from '../services/usersService'
import { readApiError } from '../../../services/apiResponse'
import { localize } from '../../rpl/domain/rpl'

/*
 * GRANTING A STAFF MEMBER A ROLE.
 *
 * `GET /admin/roles` and `PUT /admin/users/{id}/roles` were implemented and
 * audited from the start, and nothing in the CMS called either. Account
 * creation accepts only student, trainer and admin, so eight of the eleven
 * seeded roles — assessor, quality-reviewer, committee-member, appeal-reviewer,
 * finance-operator, support-agent, content-admin, expert — could not be granted
 * anywhere in the product. Those are the roles the whole RPL governance chain
 * runs on: without them nobody can be made an assessor, and the separation of
 * duties the platform enforces has no way to be set up.
 *
 * The endpoint SYNCS: it replaces the user's roles with what is sent. So this
 * panel always submits the complete set, and unticking is how a role is
 * removed. Saying that on screen matters — an operator who expects "add only"
 * would silently strip the rest.
 */

const COPY = {
  ar: {
    title: 'الأدوار والصلاحيات',
    subtitle: 'الأدوار تحدد ما يمكن لهذا الحساب فعله. التعديل يُسجَّل باسمك في سجل التدقيق.',
    save: 'حفظ الأدوار',
    saving: 'جارٍ الحفظ…',
    saved: 'تم تحديث الأدوار.',
    replaceWarning: 'الحفظ يستبدل الأدوار بالكامل: ما لا تختاره يُزال.',
    none: 'لا توجد أدوار مُسندة.',
    permissions: 'صلاحية',
  },
  en: {
    title: 'Roles and permissions',
    subtitle: 'Roles decide what this account can do. Every change is recorded in the audit trail under your name.',
    save: 'Save roles',
    saving: 'Saving…',
    saved: 'Roles updated.',
    replaceWarning: 'Saving replaces the roles entirely: anything left unticked is removed.',
    none: 'No roles assigned.',
    permissions: 'permissions',
  },
  nl: {
    title: 'Rollen en rechten',
    subtitle: 'Rollen bepalen wat dit account mag. Elke wijziging wordt op uw naam vastgelegd.',
    save: 'Rollen opslaan',
    saving: 'Opslaan…',
    saved: 'Rollen bijgewerkt.',
    replaceWarning: 'Opslaan vervangt de rollen volledig: wat niet is aangevinkt, wordt verwijderd.',
    none: 'Geen rollen toegewezen.',
    permissions: 'rechten',
  },
}

export default function RoleAssignmentPanel({ user, language = 'en', onSaved }) {
  const copy = COPY[language] || COPY.en

  const [roles, setRoles] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await fetchRoles()
      setRoles(payload?.data || [])
      setError('')
    } catch (loadError) {
      // A 403 here is normal for an operator without roles.manage — the panel
      // simply does not render rather than showing them a failure.
      setError(readApiError(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setSelected((user?.roles || []).map((role) => role.slug))
  }, [user])

  if (!user) return null
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </CardContent>
      </Card>
    )
  }
  if (error && roles.length === 0) return null

  function toggle(slug) {
    setSelected((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    )
  }

  async function save() {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await assignUserRoles(user.id, selected)
      setSuccess(copy.saved)
      if (onSaved) onSaved()
    } catch (saveError) {
      setError(readApiError(saveError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" /> {copy.title}
        </CardTitle>
        <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">{copy.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3 p-6">
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : null}
        {success ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {success}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((role) => (
            <label
              key={role.slug}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border)] p-3 text-sm"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.includes(role.slug)}
                onChange={() => toggle(role.slug)}
              />
              <span className="flex-1">
                <span className="font-semibold">{localize(role.name, language) || role.slug}</span>
                <span className="ms-2 font-mono text-xs text-[var(--color-text-muted)]">
                  <bdi>{role.slug}</bdi>
                </span>
                {role.permissions?.length ? (
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                    {role.permissions.length} {copy.permissions}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>

        {selected.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">{copy.none}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selected.map((slug) => (
              <Badge key={slug} variant="neutral">{slug}</Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck size={16} />}
            {busy ? copy.saving : copy.save}
          </Button>
          {/* Sync semantics, stated. An operator expecting "add only" would
              silently strip every role they did not think to tick. */}
          <span className="text-xs text-amber-800">{copy.replaceWarning}</span>
        </div>
      </CardContent>
    </Card>
  )
}
