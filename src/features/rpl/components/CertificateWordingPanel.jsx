import { useCallback, useContext, useEffect, useState } from 'react'
import { BadgeCheck, FilePenLine, FilePlus2, LoaderCircle, Save, ShieldAlert } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from '../../../components/ui'
import { readApiError, unwrapCollection } from '../../../services/apiResponse'
import { formatLocalizedDateTime } from '../../../utils/localization'
import { AuthorizationContext } from '../../auth/context/authorizationContext'
import { fill } from '../domain/documentScreening'
import {
  AFTER_QUIZ_LIMITS,
  AFTER_QUIZ_PERMISSIONS,
  WORDING_CODE,
  afterQuizCopy,
  canApproveWording,
  isAfterQuizReasonValid,
  isStaleConflict,
  isWordingFormValid,
  personName,
  serverAllows,
  shortHash,
  wordingForm,
  wordingFormErrors,
  wordingTexts,
} from '../domain/afterQuiz'
import { approveRplCertificateWording, draftRplCertificateWording, fetchRplCertificateWordings, updateRplCertificateWording } from '../services/rplService'

/*
 * THE EXPERIENCE CONFIRMATION CERTIFICATE WORDING (owner, 15 Oct 2026; K12, O3).
 *
 * An editable, versioned record. Version 1 is seeded as a DRAFT, never active.
 * Staff with rpl.settings.manage edit a draft, or start a new draft from the
 * approved version; only the owner's role (super-admin,
 * rpl.certificate_wording.approve) approves one, with a note, and the act is
 * recorded and audited by the API. An approved version never changes: editing
 * means a new draft that needs approval again, and the approved one stays in
 * force until then. While no version is approved, nothing can be sold or issued.
 * The certificate's visual design is not part of this (later).
 */

const STATUS_VARIANT = { draft: 'warning', approved: 'success', retired: 'neutral' }

function TextBlock({ label, value, dir }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--color-text-muted)]">{label}</p>
      <p dir={dir} lang={dir === 'rtl' ? 'ar' : 'en'} className="mt-1 whitespace-pre-line leading-6">{value || '—'}</p>
    </div>
  )
}

export default function CertificateWordingPanel({ language, canEdit, canApprove }) {
  const copy = afterQuizCopy(language)
  const text = copy.wording
  const authorization = useContext(AuthorizationContext)
  const mayEdit = canEdit ?? Boolean(authorization?.hasPermission?.(AFTER_QUIZ_PERMISSIONS.settings))
  const mayApprove = canApprove ?? canApproveWording(authorization)
  const [state, setState] = useState({ loading: true, error: '', rows: [] })
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState({ error: '', success: '' })
  const [form, setForm] = useState(null)
  const [approval, setApproval] = useState(null)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const rows = unwrapCollection(await fetchRplCertificateWordings(WORDING_CODE))
      setState({ loading: false, error: '', rows: [...rows].sort((left, right) => Number(right?.version ?? 0) - Number(left?.version ?? 0)) })
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.common.loadError, language) }))
    }
  }, [copy.common.loadError, language])

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const rows = state.rows
  const approved = rows.find((row) => row?.status === 'approved') || null
  const draft = rows.find((row) => row?.status === 'draft') || null

  async function act(key, request, successText, reset) {
    setBusy(key)
    setNotice({ error: '', success: '' })
    try {
      await request()
      reset()
      setNotice({ error: '', success: successText })
      load({ silent: true })
    } catch (error) {
      if (isStaleConflict(error, 'rpl_certificate_wording_stale')) {
        // Say what happened, keep what was typed, reload.
        setNotice({ error: text.stale, success: '' })
        load({ silent: true })
      } else {
        setNotice({ error: readApiError(error, copy.common.failed, language), success: '' })
        // wording_not_draft, or a draft that already exists: the screen is out of date.
        if (Number(error?.response?.status) === 422) load({ silent: true })
      }
    } finally {
      setBusy('')
    }
  }

  function save() {
    const texts = wordingTexts(form)
    if (form.mode === 'edit') {
      return act('save', () => updateRplCertificateWording(form.id, { lock_version: form.lockVersion, ...texts }), text.saved, () => setForm(null))
    }
    return act('save', () => draftRplCertificateWording({ code: WORDING_CODE, ...texts }), text.drafted, () => setForm(null))
  }

  function approve() {
    return act('approve', () => approveRplCertificateWording(approval.id, { lock_version: approval.lockVersion, approval_note: approval.note.trim() }), text.approved, () => setApproval(null))
  }

  function renderForm() {
    const errors = wordingFormErrors(form)
    const typed = (path) => {
      const [part, lang] = path.split('.')
      return String(form?.[part]?.[lang] ?? '') !== ''
    }
    const set = (part, lang) => (event) => setForm((current) => ({ ...current, [part]: { ...current[part], [lang]: event.target.value } }))
    const title = form.mode === 'edit' ? text.edit : approved ? text.newDraft : text.newEmptyDraft
    return (
      <section aria-label={title} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
        <strong className="block">{title}</strong>
        <div className="grid gap-3 lg:grid-cols-2">
          <Input id="wording-title-ar" dir="rtl" lang="ar" label={text.titleAr} value={form.title.ar} maxLength={AFTER_QUIZ_LIMITS.titleMax} error={typed('title.ar') && errors['title.ar'] ? text.titleInvalid : undefined} onChange={set('title', 'ar')} />
          <Input id="wording-title-en" dir="ltr" lang="en" label={text.titleEn} value={form.title.en} maxLength={AFTER_QUIZ_LIMITS.titleMax} error={typed('title.en') && errors['title.en'] ? text.titleInvalid : undefined} onChange={set('title', 'en')} />
          <Textarea id="wording-body-ar" dir="rtl" lang="ar" rows={7} label={text.bodyAr} value={form.body.ar} maxLength={AFTER_QUIZ_LIMITS.bodyMax} error={typed('body.ar') && errors['body.ar'] ? text.bodyInvalid : undefined} onChange={set('body', 'ar')} />
          <Textarea id="wording-body-en" dir="ltr" lang="en" rows={7} label={text.bodyEn} value={form.body.en} maxLength={AFTER_QUIZ_LIMITS.bodyMax} error={typed('body.en') && errors['body.en'] ? text.bodyInvalid : undefined} onChange={set('body', 'en')} />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setForm(null)} disabled={busy === 'save'}>{copy.common.cancel}</Button>
          <Button size="sm" onClick={save} disabled={Boolean(busy) || !isWordingFormValid(form)}>{busy === 'save' ? <LoaderCircle className="animate-spin" size={15} /> : <Save size={15} />}{form.mode === 'edit' ? text.save : text.draftSubmit}</Button>
        </div>
      </section>
    )
  }

  function renderApproval() {
    const typed = String(approval.note ?? '').trim() !== ''
    return (
      <section aria-label={text.approve} className="space-y-3 rounded-2xl border border-green-200 bg-green-50/60 p-4 text-sm">
        <strong className="block">{text.approve}</strong>
        <p className="leading-6">{text.approveHint}</p>
        <Textarea id="wording-approval-note" rows={3} label={text.approvalNote} hint={copy.common.reasonHint} value={approval.note} maxLength={AFTER_QUIZ_LIMITS.reasonMax} error={typed && !isAfterQuizReasonValid(approval.note) ? copy.common.reasonInvalid : undefined} disabled={busy === 'approve'} onChange={(event) => setApproval((current) => ({ ...current, note: event.target.value }))} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setApproval(null)} disabled={busy === 'approve'}>{copy.common.cancel}</Button>
          <Button size="sm" onClick={approve} disabled={Boolean(busy) || !isAfterQuizReasonValid(approval.note)}>{busy === 'approve' ? <LoaderCircle className="animate-spin" size={15} /> : <BadgeCheck size={15} />}{text.approveSubmit}</Button>
        </div>
      </section>
    )
  }

  function renderVersion(row) {
    const at = (value) => formatLocalizedDateTime(value, language)
    const isDraft = row.status === 'draft'
    const editable = isDraft && mayEdit && serverAllows(row, 'edit', true)
    const approvable = isDraft && mayApprove && serverAllows(row, 'approve', true)
    const label = fill(text.version, { version: row.version ?? '—' })
    return (
      <article key={row.id} aria-label={label} className="space-y-3 rounded-2xl border border-[var(--color-border)] p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-bold">{label}</h4>
          <Badge variant={STATUS_VARIANT[row.status] || 'neutral'}>{text.statuses[row.status] || row.status}</Badge>
          {row.content_sha256 ? <span className="font-mono text-xs text-[var(--color-text-muted)]" title={row.content_sha256}>{fill(text.sha, { sha: shortHash(row.content_sha256) })}</span> : null}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <TextBlock label={text.titleAr} value={row.title?.ar} dir="rtl" />
          <TextBlock label={text.titleEn} value={row.title?.en} dir="ltr" />
          <TextBlock label={text.bodyAr} value={row.body?.ar} dir="rtl" />
          <TextBlock label={text.bodyEn} value={row.body?.en} dir="ltr" />
        </div>
        <div className="space-y-1 text-xs leading-5 text-[var(--color-text-muted)]">
          {row.created_at ? <p>{fill(text.createdBy, { name: personName(row.created_by, language), at: at(row.created_at) })}</p> : null}
          {row.approved_at ? <p>{fill(text.approvedBy, { name: personName(row.approved_by, language), at: at(row.approved_at) })}</p> : null}
          {row.approval_note ? <p dir="auto">{fill(text.approvalNoteRecorded, { note: row.approval_note })}</p> : null}
          {row.retired_at ? <p>{fill(text.retiredAt, { at: at(row.retired_at) })}</p> : null}
        </div>
        {!isDraft ? <p className="text-xs leading-5 text-[var(--color-text-muted)]">{text.readOnly}</p> : null}
        {isDraft && !mayApprove ? <p className="flex items-center gap-2 text-xs leading-5 text-[var(--color-text-muted)]"><ShieldAlert size={14} aria-hidden="true" />{text.approverOnly}</p> : null}
        {(editable && !form) || (approvable && !approval) ? (
          <div className="flex flex-wrap justify-end gap-2">
            {editable && !form ? <Button size="sm" variant="outline" onClick={() => setForm({ mode: 'edit', id: row.id, lockVersion: row.lock_version, ...wordingForm(row) })} disabled={Boolean(busy)}><FilePenLine size={15} />{text.edit}</Button> : null}
            {approvable && !approval ? <Button size="sm" onClick={() => setApproval({ id: row.id, lockVersion: row.lock_version, note: '' })} disabled={Boolean(busy)}><BadgeCheck size={15} />{text.approve}</Button> : null}
          </div>
        ) : null}
        {approvable && approval?.id === row.id ? renderApproval() : null}
      </article>
    )
  }

  function renderBody() {
    if (state.loading) return <p role="status" className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={16} />{copy.common.loading}</p>
    if (state.error && !rows.length) return <div className="space-y-2"><p className="whitespace-pre-line text-sm text-[var(--color-danger)]">{state.error}</p><Button size="sm" variant="outline" onClick={() => load()}>{copy.common.retry}</Button></div>
    return (
      <div className="space-y-4">
        {!approved ? <p role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">{text.notApproved}</p> : null}
        {mayEdit && !draft && !form ? (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setForm({ mode: 'new', ...wordingForm(approved) })} disabled={Boolean(busy)}><FilePlus2 size={17} />{approved ? text.newDraft : text.newEmptyDraft}</Button>
          </div>
        ) : null}
        {form ? renderForm() : null}
        {!rows.length ? <p className="text-sm text-[var(--color-text-muted)]">{text.empty}</p> : null}
        {rows.map(renderVersion)}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle>{text.title}</CardTitle>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{text.hint}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {notice.error ? <p role="alert" className="whitespace-pre-line [unicode-bidi:plaintext] rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{notice.error}</p> : null}
        {notice.success ? <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice.success}</p> : null}
        {renderBody()}
      </CardContent>
    </Card>
  )
}
