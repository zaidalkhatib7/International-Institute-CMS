import { useState } from 'react'
import { BookPlus, Loader2, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea } from '../../../components/ui'
import {
  createProfessionalCompetency,
  deleteProfessionalCompetency,
} from '../services/competencyFrameworkService'
import { readApiError } from '../../../services/apiResponse'
import { localize } from '../../rpl/domain/rpl'

/*
 * AUTHORING THE PROFESSIONAL COMPETENCY DICTIONARY.
 *
 * No seeder and no console command creates a ProfessionalCompetency, so
 * POST /admin/professional-competencies is the only way one can ever exist —
 * and nothing in the CMS called it. The consequences compound:
 *
 *   - the seed-pack panel tells the admin "if one is missing, add it to the
 *     competency framework first", an action the product could not perform
 *   - it hard-disables "Add competency mapping" when the dictionary is empty
 *   - so packages ship declaring nothing, and the gap engine cannot see them
 *
 * That is a direct cause of 93 of the 100 CGP packages declaring no
 * competencies, which is why every gap plan comes back thin.
 *
 * Deliberately minimal: code, name, definition, family and group. The Master
 * Template's richer blocks — performance criteria, observable indicators,
 * evidence guidance, proficiency descriptors — are governance-owned prose and
 * belong in a considered authoring flow, not a quick-add box. Creating the
 * entry is what unblocks the mapping.
 */

const COPY = {
  ar: {
    title: 'قاموس الكفاءات المهنية',
    subtitle: 'إنشاء كفاءة هو الشرط المسبق لربط الحقائب بها. بدون مدخلات هنا لا يستطيع محرك الفجوات رؤية أي حقيبة.',
    add: 'أضف كفاءة',
    code: 'الرمز',
    codeHint: 'أحرف كبيرة وأرقام، مثل PC-QA-01',
    name: 'الاسم',
    definition: 'التعريف',
    family: 'العائلة',
    group: 'مجموعة الفجوات',
    noGroup: 'بدون مجموعة',
    save: 'حفظ',
    saving: 'جارٍ الحفظ…',
    cancel: 'إلغاء',
    created: 'أُنشئت الكفاءة.',
    deleted: 'حُذفت الكفاءة.',
    remove: 'حذف',
    confirmDelete: 'حذف هذه الكفاءة؟ يُرفض الحذف إذا كانت مرتبطة ببرنامج أو كفاءة RPL.',
    empty: 'القاموس فارغ. لا يمكن ربط أي حقيبة بكفاءة قبل إنشاء مدخلات هنا.',
    count: 'كفاءة في القاموس',
  },
  en: {
    title: 'Professional competency dictionary',
    subtitle: 'Creating a competency is the prerequisite for mapping packages to it. With no entries here the gap engine cannot see any package.',
    add: 'Add a competency',
    code: 'Code',
    codeHint: 'Uppercase and digits, e.g. PC-QA-01',
    name: 'Name',
    definition: 'Definition',
    family: 'Family',
    group: 'Gap group',
    noGroup: 'No group',
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    created: 'Competency created.',
    deleted: 'Competency deleted.',
    remove: 'Delete',
    confirmDelete: 'Delete this competency? Deletion is refused if a programme or RPL competency still references it.',
    empty: 'The dictionary is empty. No package can declare a competency until entries exist here.',
    count: 'competencies in the dictionary',
  },
  nl: {
    title: 'Professioneel competentiewoordenboek',
    subtitle: 'Een competentie aanmaken is de voorwaarde om pakketten eraan te koppelen.',
    add: 'Competentie toevoegen',
    code: 'Code',
    codeHint: 'Hoofdletters en cijfers, bijv. PC-QA-01',
    name: 'Naam',
    definition: 'Definitie',
    family: 'Familie',
    group: 'Hiatengroep',
    noGroup: 'Geen groep',
    save: 'Opslaan',
    saving: 'Opslaan…',
    cancel: 'Annuleren',
    created: 'Competentie aangemaakt.',
    deleted: 'Competentie verwijderd.',
    remove: 'Verwijderen',
    confirmDelete: 'Deze competentie verwijderen? Wordt geweigerd als een programma ernaar verwijst.',
    empty: 'Het woordenboek is leeg.',
    count: 'competenties in het woordenboek',
  },
}

const FAMILIES = ['general', 'technical', 'leadership', 'ethics', 'digital']

const emptyDraft = () => ({
  code: '',
  name_en: '',
  definition_en: '',
  family: 'general',
  competency_gap_group_id: '',
})

export default function CompetencyDictionaryAuthoring({
  competencies = [],
  groups = [],
  language = 'en',
  onChanged,
}) {
  const copy = COPY[language] || COPY.en

  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function run(request, message) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await request()
      setNotice(message)
      if (onChanged) onChanged()
      return true
    } catch (requestError) {
      // The delete refusal names what still references it. Show it verbatim.
      setError(readApiError(requestError))
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <BookPlus className="h-5 w-5" aria-hidden="true" /> {copy.title}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={competencies.length ? 'neutral' : 'warning'}>
              {competencies.length} {copy.count}
            </Badge>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setDraft(emptyDraft())}>
              <Plus size={16} /> {copy.add}
            </Button>
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">{copy.subtitle}</p>
      </CardHeader>

      <CardContent className="space-y-3 p-6">
        {error ? (
          <p className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {notice}
          </p>
        ) : null}

        {draft ? (
          <div className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-[var(--color-text-muted)]">
                {copy.code}
                <Input
                  value={draft.code}
                  placeholder={copy.codeHint}
                  onChange={(event) =>
                    setDraft((c) => ({ ...c, code: event.target.value.toUpperCase() }))
                  }
                />
              </label>
              <label className="text-xs text-[var(--color-text-muted)]">
                {copy.name}
                <Input
                  value={draft.name_en}
                  onChange={(event) => setDraft((c) => ({ ...c, name_en: event.target.value }))}
                />
              </label>
              <label className="text-xs text-[var(--color-text-muted)]">
                {copy.family}
                <Select
                  value={draft.family}
                  onChange={(event) => setDraft((c) => ({ ...c, family: event.target.value }))}
                >
                  {FAMILIES.map((family) => (
                    <option key={family} value={family}>{family}</option>
                  ))}
                </Select>
              </label>
              <label className="text-xs text-[var(--color-text-muted)]">
                {copy.group}
                <Select
                  value={draft.competency_gap_group_id}
                  onChange={(event) =>
                    setDraft((c) => ({ ...c, competency_gap_group_id: event.target.value }))
                  }
                >
                  <option value="">{copy.noGroup}</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {localize(group.name, language) || group.code}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <Textarea
              rows={3}
              label={copy.definition}
              value={draft.definition_en}
              onChange={(event) => setDraft((c) => ({ ...c, definition_en: event.target.value }))}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busy || !draft.code || !draft.name_en || !draft.definition_en}
                onClick={async () => {
                  const ok = await run(
                    () => createProfessionalCompetency({
                      code: draft.code,
                      name: { en: draft.name_en },
                      definition: { en: draft.definition_en },
                      family: draft.family,
                      ...(draft.competency_gap_group_id
                        ? { competency_gap_group_id: Number(draft.competency_gap_group_id) }
                        : {}),
                    }),
                    copy.created,
                  )
                  if (ok) setDraft(null)
                }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {busy ? copy.saving : copy.save}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>{copy.cancel}</Button>
            </div>
          </div>
        ) : null}

        {competencies.length === 0 ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{copy.empty}</p>
        ) : (
          <ul className="space-y-2">
            {competencies.map((competency) => (
              <li
                key={competency.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-mono text-xs"><bdi>{competency.code}</bdi></span>{' '}
                  <span className="font-semibold">{localize(competency.name, language)}</span>
                  {competency.family ? (
                    <span className="ms-2 text-xs text-[var(--color-text-muted)]">{competency.family}</span>
                  ) : null}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(copy.confirmDelete)) return
                    run(() => deleteProfessionalCompetency(competency.id), copy.deleted)
                  }}
                >
                  <Trash2 size={16} /> {copy.remove}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
