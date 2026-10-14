import { useState } from 'react'
import { Ban, LoaderCircle } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, Select, Textarea } from '../../../components/ui'
import { readApiError, unwrapApiData } from '../../../services/apiResponse'
import { useModalDialog } from '../../../hooks/useModalDialog'
import { formatLocalizedDateTime } from '../../../utils/localization'
import { DECLINE_CATEGORIES, localize } from '../domain/rpl'
import { fill } from '../domain/documentScreening'
import { DECLINABLE_STATUSES, caseDecisionCopy, declineCopy, isRationaleValid } from '../domain/caseDecision'
import { declineRplApplication } from '../services/rplService'
import { ApplicantCategoryPreview } from './ScreeningDecisionCard'

/*
 * DECLINE THE REQUEST (owner flow of 12 Oct 2026, D6(a) and D8(b)).
 *
 * One staff member declines a case under verification or waiting for its
 * interview, with a written rationale; there is no appeal and the applicant may
 * apply again after the cooldown. The applicant is told one neutral sentence
 * from the fixed category list and the reapply date, which this dialog shows
 * before anything is sent. It is the only way into `rejected` from these two
 * statuses: the generic status change refuses that move.
 */
export default function DeclineApplicationAction({ applicationId, status, canDecide = false, declineCategories = DECLINE_CATEGORIES, language = 'en', onDeclined }) {
  const lang = language === 'ar' ? 'ar' : 'en'
  const copy = declineCopy(lang)
  const decisionText = caseDecisionCopy(lang)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ decline_category: '', rationale: '' })
  const [request, setRequest] = useState({ busy: false, error: '' })
  const close = () => { if (!request.busy) setOpen(false) }
  const dialogRef = useModalDialog(open, close)

  if (!canDecide || !DECLINABLE_STATUSES.includes(status)) return null

  const categories = Array.isArray(declineCategories) && declineCategories.length ? declineCategories : DECLINE_CATEGORIES
  const ready = Boolean(form.decline_category) && isRationaleValid(form.rationale)
  const titleId = `rpl-decline-title-${applicationId}`

  async function submit() {
    setRequest({ busy: true, error: '' })
    try {
      const result = unwrapApiData(await declineRplApplication(applicationId, { decline_category: form.decline_category, rationale: form.rationale.trim() }))
      const date = result?.decline?.reapply_available_at
      setRequest({ busy: false, error: '' })
      setOpen(false)
      setForm({ decline_category: '', rationale: '' })
      onDeclined?.({ result, message: date ? fill(copy.done, { date: formatLocalizedDateTime(date, lang) }) : copy.doneNoDate })
    } catch (error) {
      setRequest({ busy: false, error: readApiError(error, copy.failed, lang) })
    }
  }

  return (
    <>
      <Button fullWidth variant="outline" className="border-red-300 text-red-700" onClick={() => { setRequest({ busy: false, error: '' }); setOpen(true) }}><Ban size={17} />{copy.action}</Button>
      {open ? (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-[#031C2C]/65 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
          <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-full w-full max-w-xl overflow-y-auto outline-none">
            <Card className="w-full">
              <CardHeader className="border-b border-[var(--color-border)]">
                <h3 id={titleId} className="text-xl font-bold text-[var(--color-text)]">{copy.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.hint}</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <Select label={decisionText.category} hint={decisionText.categoryHint} value={form.decline_category} onChange={(event) => setForm((current) => ({ ...current, decline_category: event.target.value }))}>
                  <option value="">—</option>
                  {categories.map((category) => <option key={category.code} value={category.code}>{localize(category.label, lang) || category.code}</option>)}
                </Select>
                <ApplicantCategoryPreview code={form.decline_category} categories={categories} copy={decisionText} />
                <Textarea rows={4} label={decisionText.rationale} hint={decisionText.rationaleHint} error={form.rationale.trim() && !isRationaleValid(form.rationale) ? decisionText.rationaleInvalid : undefined} value={form.rationale} onChange={(event) => setForm((current) => ({ ...current, rationale: event.target.value }))} />
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">{decisionText.confirmDeclineHint}</p>
                {request.error ? <div role="alert" className="whitespace-pre-line [unicode-bidi:plaintext] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{request.error}</div> : null}
                <div className="flex flex-wrap justify-end gap-3">
                  <Button variant="outline" onClick={close} disabled={request.busy}>{copy.cancel}</Button>
                  <Button variant="danger" onClick={submit} disabled={request.busy || !ready}>{request.busy ? <LoaderCircle className="animate-spin" size={17} /> : <Ban size={17} />}{copy.submit}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </>
  )
}
