import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Lock, ShieldCheck } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '../../../components/ui'
import { assignUserRoles, fetchRoles } from '../services/usersService'
import { readApiError } from '../../../services/apiResponse'
import { localize } from '../../rpl/domain/rpl'
import { assignmentLock, isGrantable, readUserActionError, refusalText } from '../domain/roleGuard'

/*
 * GRANTING A STAFF MEMBER A ROLE.
 *
 * `GET /admin/roles` and `PUT /admin/users/{id}/roles` were implemented and
 * audited from the start, and nothing in the platform called either. Account
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
 *
 * THE ROLE GUARD (owner report of 24 Oct 2026: an administrator could make
 * themselves super administrator). The server decides; this panel mirrors its
 * answer for this account (GET /admin/roles?user_id=):
 *   - only the roles the caller may grant are offered; a role the account holds
 *     and the caller may not remove stays ticked and locked, with the reason, so
 *     the sync keeps it;
 *   - one's own roles, and an account that holds a permission the caller lacks,
 *     are shown and not editable, with the server's sentence;
 *   - a refusal on save is the server's sentence in the reader's language.
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
    onlyGrantable: 'تظهر هنا الأدوار التي يمكنك منحها فقط. الخادم يتحقق من كل تغيير.',
    lockedTitle: 'لا يمكنك تغيير أدوار هذا الحساب',
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
    onlyGrantable: 'Only the roles you may grant are listed. The server checks every change.',
    lockedTitle: 'You cannot change the roles of this account',
  },
}

export default function RoleAssignmentPanel({ user, language = 'en', onSaved, actorId, onAssignment }) {
  const copy = COPY[language] || COPY.en
  const userId = user?.id

  const [roles, setRoles] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [selected, setSelected] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // The page's callback, read at call time so a new function each render does not reload the roles.
  const onAssignmentRef = useRef(onAssignment)
  useEffect(() => {
    onAssignmentRef.current = onAssignment
  }, [onAssignment])

  const load = useCallback(async () => {
    if (userId == null) return
    setLoading(true)
    try {
      const payload = await fetchRoles(userId)
      setRoles(payload?.data || [])
      setAssignment(payload?.assignment || null)
      setError('')
      setLoaded(true)
      if (onAssignmentRef.current) onAssignmentRef.current(payload?.assignment || null)
    } catch (loadError) {
      // A 403 here is normal for an operator without roles.manage — the panel
      // simply does not render rather than showing them a failure.
      setError(readApiError(loadError, undefined, language))
    } finally {
      setLoading(false)
    }
  }, [userId, language])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setSelected((user?.roles || []).map((role) => role.slug))
  }, [user])

  if (!user) return null
  if (loading && !loaded) {
    return (
      <Card>
        <CardContent className="p-6">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </CardContent>
      </Card>
    )
  }
  if (error && roles.length === 0) return null

  const ownAccount = actorId != null && String(actorId) === String(user.id)
  const lock = assignmentLock({ assignment, ownAccount, language })
  // Offered: what the caller may grant, and what the account already holds (locked when the caller may not remove it).
  const shown = roles.filter((role) => isGrantable(role) || selected.includes(role.slug))
  const held = selected.length === 0 ? (
    <p className="text-sm text-[var(--color-text-muted)]">{copy.none}</p>
  ) : (
    <div className="flex flex-wrap gap-2">
      {selected.map((slug) => (
        <Badge key={slug} variant="neutral">{slug}</Badge>
      ))}
    </div>
  )

  function toggle(role) {
    if (!isGrantable(role)) return
    setSelected((current) =>
      current.includes(role.slug) ? current.filter((s) => s !== role.slug) : [...current, role.slug],
    )
  }

  async function save() {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await assignUserRoles(user.id, selected)
      setSuccess(copy.saved)
      // What the caller may change can move with the change (the last super administrator, a demotion).
      await load()
      if (onSaved) onSaved()
    } catch (saveError) {
      setError(readUserActionError(saveError, undefined, language))
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
          <p role="alert" className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : null}
        {success ? (
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {success}
          </p>
        ) : null}

        {lock ? (
          <>
            <div
              data-testid="roles-locked"
              className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
            >
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="block font-semibold">{copy.lockedTitle}</span>
                {lock}
              </span>
            </div>
            {held}
          </>
        ) : (
          <>
            <p className="text-xs text-[var(--color-text-muted)]">{copy.onlyGrantable}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {shown.map((role) => {
                const grantable = isGrantable(role)
                const reason = grantable ? '' : refusalText(role.grant_refusal, language)
                return (
                  <label
                    key={role.slug}
                    className={`flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-3 text-sm ${grantable ? 'cursor-pointer' : 'cursor-not-allowed bg-[var(--color-surface-muted)]'}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.includes(role.slug)}
                      disabled={!grantable || busy}
                      onChange={() => toggle(role)}
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
                      {reason ? (
                        <span className="mt-1 flex items-start gap-1 text-xs text-amber-800">
                          <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                          {reason}
                        </span>
                      ) : null}
                    </span>
                  </label>
                )
              })}
            </div>

            {held}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={save} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck size={16} />}
                {busy ? copy.saving : copy.save}
              </Button>
              {/* Sync semantics, stated. An operator expecting "add only"
                  would silently strip every role they did not think to tick. */}
              <span className="text-xs text-amber-800">{copy.replaceWarning}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
