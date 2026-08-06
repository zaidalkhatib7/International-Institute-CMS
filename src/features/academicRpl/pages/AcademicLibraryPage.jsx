import { useCallback, useEffect, useState } from 'react'
import { BookMarked, CheckCircle2, Layers3, Loader2, Plus, Send, Trash2, TriangleAlert } from 'lucide-react'
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, PageHeader, Select, Textarea,
} from '../../../components/ui'
import { readApiError } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { localize } from '../../rpl/domain/rpl'
import {
  approveAcademicSchool, createAcademicModule, createAcademicSchool, deleteAcademicModule,
  fetchAcademicLibrary, publishAcademicModule, setAcademicModuleCompetencies,
} from '../services/academicRplService'

/*
 * مكتبة الفجوات الأكاديمية — authoring the academic gap library.
 *
 * This screen decides what every future gap plan is ABLE to recommend. A module
 * the engine cannot see is a module no applicant will ever be offered, so the
 * screen is organised around the one field that determines visibility: which
 * competencies a module primarily closes.
 *
 * THE CAUTIONARY TALE IS ON THE OTHER PATHWAY. 93 of the 100 professional CGP
 * packages declare no competencies, so its gap engine finds almost nothing and
 * every plan looks broken for a reason nobody can see from the plan itself. So
 * here:
 *   - "declares nothing" is counted at the top, not discovered case by case
 *   - a module cannot be published until it declares something
 *   - competencies with no module at all are listed, because that is the other
 *     half of the same problem and it is invisible from the module list
 *
 * primary vs supporting is a real distinction, not a nicety: set-cover counts
 * primary only. Treating a passing mention as closure produces a plan that is
 * untrue, and the applicant discovers it after finishing the module.
 */

const COPY = {
  ar: {
    title: 'مكتبة سد الفجوات الأكاديمية',
    subtitle: 'الوحدات التي تُغلق الفجوات الأكاديمية. ما لا تُعلنه الوحدة لا يراه المحرك، ولن يُقترح على أي متقدم.',
    schools: 'المدارس المعرفية',
    schoolsHint: 'كل وحدة تنتمي إلى مدرسة معرفية واحدة (المادة السابعة).',
    modules: 'وحدات المكتبة',
    addSchool: 'أضف مدرسة معرفية',
    addModule: 'أضف وحدة',
    code: 'الرمز',
    name: 'الاسم',
    title_: 'العنوان',
    school: 'المدرسة المعرفية',
    track: 'المسار (اتركه فارغًا ليخدم كل المسارات)',
    hours: 'الساعات المعتمدة',
    anyTrack: 'كل المسارات',
    noSchool: 'بدون مدرسة',
    draft: 'مسودة',
    approved: 'معتمدة',
    published: 'منشورة',
    approve: 'اعتماد',
    publish: 'نشر',
    remove: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    closes: 'الكفاءات التي تُغلقها',
    coverage: 'نوع التغطية',
    primary: 'تُغلق الفجوة',
    supporting: 'تدعم فقط',
    none: 'لا شيء',
    declaresNothing: 'لا تُعلن أي كفاءة — غير مرئية للمحرك',
    saveCoverage: 'حفظ التغطية',
    basis: 'مسوّغ الاعتماد',
    basisPlaceholder: 'على أي أساس تُعتمد هذه المدرسة المعرفية؟ (20 حرفًا على الأقل)',
    readiness: 'جاهزية المكتبة',
    schoolsApproved: 'مدرسة معتمدة من',
    modulesPublished: 'وحدة منشورة من',
    modulesSilent: 'وحدة لا تُعلن شيئًا',
    orphanCompetencies: 'كفاءات لا تُعلّمها أي وحدة',
    emptyLibrary: 'المكتبة فارغة. لا يمكن اقتراح أي وحدة حتى تُؤلَّف.',
    supportingNote: 'المحرك يحتسب «تُغلق الفجوة» فقط. اعتبار الدعم إغلاقًا يجعل الخطة غير صحيحة.',
    publishedLocked: 'الوحدة منشورة وقد تظهر في خطة يعمل عليها متقدم.',
  },
  en: {
    title: 'Academic gap library',
    subtitle: 'The units that close academic gaps. What a module does not declare, the engine cannot see — and no applicant will ever be offered it.',
    schools: 'Knowledge schools',
    schoolsHint: 'Every module belongs to exactly one knowledge school (article 7).',
    modules: 'Library modules',
    addSchool: 'Add a knowledge school',
    addModule: 'Add a module',
    code: 'Code',
    name: 'Name',
    title_: 'Title',
    school: 'Knowledge school',
    track: 'Track (leave empty to serve all)',
    hours: 'Notional hours',
    anyTrack: 'All tracks',
    noSchool: 'No school',
    draft: 'Draft',
    approved: 'Approved',
    published: 'Published',
    approve: 'Approve',
    publish: 'Publish',
    remove: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    closes: 'Competencies it closes',
    coverage: 'Coverage',
    primary: 'Closes the gap',
    supporting: 'Supports only',
    none: 'None',
    declaresNothing: 'Declares nothing — invisible to the engine',
    saveCoverage: 'Save coverage',
    basis: 'Basis for approval',
    basisPlaceholder: 'On what basis is this knowledge school approved? (at least 20 characters)',
    readiness: 'Library readiness',
    schoolsApproved: 'schools approved of',
    modulesPublished: 'modules published of',
    modulesSilent: 'modules declare nothing',
    orphanCompetencies: 'Competencies no module teaches',
    emptyLibrary: 'The library is empty. Nothing can be recommended until it is authored.',
    supportingNote: 'Set-cover counts “closes the gap” only. Treating support as closure makes the plan untrue.',
    publishedLocked: 'Published, and may already appear in a plan an applicant is working through.',
  },
  nl: {
    title: 'Academische hiatenbibliotheek',
    subtitle: 'De eenheden die academische hiaten sluiten. Wat een module niet verklaart, ziet de engine niet.',
    schools: 'Kennisscholen',
    schoolsHint: 'Elke module hoort bij één kennisschool (artikel 7).',
    modules: 'Bibliotheekmodules',
    addSchool: 'Kennisschool toevoegen',
    addModule: 'Module toevoegen',
    code: 'Code',
    name: 'Naam',
    title_: 'Titel',
    school: 'Kennisschool',
    track: 'Traject (leeg = alle)',
    hours: 'Studielast',
    anyTrack: 'Alle trajecten',
    noSchool: 'Geen school',
    draft: 'Concept',
    approved: 'Goedgekeurd',
    published: 'Gepubliceerd',
    approve: 'Goedkeuren',
    publish: 'Publiceren',
    remove: 'Verwijderen',
    save: 'Opslaan',
    cancel: 'Annuleren',
    closes: 'Competenties die het sluit',
    coverage: 'Dekking',
    primary: 'Sluit het hiaat',
    supporting: 'Ondersteunt alleen',
    none: 'Geen',
    declaresNothing: 'Verklaart niets — onzichtbaar voor de engine',
    saveCoverage: 'Dekking opslaan',
    basis: 'Grondslag voor goedkeuring',
    basisPlaceholder: 'Op welke grondslag wordt deze kennisschool goedgekeurd? (minimaal 20 tekens)',
    readiness: 'Gereedheid van de bibliotheek',
    schoolsApproved: 'scholen goedgekeurd van',
    modulesPublished: 'modules gepubliceerd van',
    modulesSilent: 'modules verklaren niets',
    orphanCompetencies: 'Competenties die geen module onderwijst',
    emptyLibrary: 'De bibliotheek is leeg.',
    supportingNote: 'Set-cover telt alleen “sluit het hiaat”.',
    publishedLocked: 'Gepubliceerd en mogelijk al in gebruik.',
  },
}

export default function AcademicLibraryPage() {
  const language = getAdminLanguage()
  const copy = COPY[language] || COPY.en

  const [state, setState] = useState({ loading: true, error: '', data: null })
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [schoolDraft, setSchoolDraft] = useState(null)
  const [moduleDraft, setModuleDraft] = useState(null)
  const [approving, setApproving] = useState({})
  const [coverage, setCoverage] = useState({})

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const payload = await fetchAcademicLibrary()
      setState({ loading: false, error: '', data: payload?.data || null })
    } catch (error) {
      setState({ loading: false, error: readApiError(error), data: null })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function run(request) {
    setBusy(true)
    setNotice('')
    try {
      await request()
      await load()
      return true
    } catch (error) {
      setNotice(readApiError(error))
      return false
    } finally {
      setBusy(false)
    }
  }

  const data = state.data
  const readiness = data?.readiness

  return (
    <div className="space-y-6">
      <PageHeader title={copy.title} description={copy.subtitle} />

      {state.loading ? (
        <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      ) : null}
      {notice ? (
        <p className="whitespace-pre-line rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {notice}
        </p>
      ) : null}

      {/* The numbers that explain a thin gap plan, surfaced where somebody can
          act on them rather than discovered one case at a time. */}
      {readiness ? (
        <Card>
          <CardHeader className="border-b border-[var(--color-border)]">
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-5 w-5" aria-hidden="true" /> {copy.readiness}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-6 text-sm">
            <p>{readiness.schools_approved} / {readiness.schools_total} {copy.schoolsApproved}</p>
            <p>{readiness.modules_published} / {readiness.modules_total} {copy.modulesPublished}</p>
            <p className={readiness.modules_declaring_none > 0 ? 'text-amber-700' : ''}>
              {readiness.modules_declaring_none} {copy.modulesSilent}
            </p>
            {readiness.competencies_with_no_module?.length ? (
              // The other half of the same problem, and invisible from the
              // module list: a competency nothing teaches can never be closed.
              <p className="text-amber-700">
                {copy.orphanCompetencies}:{' '}
                <span className="font-mono text-xs"><bdi>{readiness.competencies_with_no_module.join(', ')}</bdi></span>
              </p>
            ) : null}
            {readiness.modules_total === 0 ? (
              <p className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-amber-900">
                <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" /> {copy.emptyLibrary}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* SCHOOLS — article 7. */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <BookMarked className="h-5 w-5" aria-hidden="true" /> {copy.schools} ({data?.schools?.length || 0})
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSchoolDraft({ code: '', name: { en: '' } })}
              disabled={busy}
            >
              <Plus size={16} /> {copy.addSchool}
            </Button>
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.schoolsHint}</p>
        </CardHeader>
        <CardContent className="space-y-3 p-6">
          {schoolDraft ? (
            <div className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-[var(--color-text-muted)]">
                  {copy.code}
                  <Input
                    value={schoolDraft.code}
                    onChange={(event) => setSchoolDraft((c) => ({ ...c, code: event.target.value.toUpperCase() }))}
                  />
                </label>
                <label className="text-xs text-[var(--color-text-muted)]">
                  {copy.name}
                  <Input
                    value={schoolDraft.name.en}
                    onChange={(event) => setSchoolDraft((c) => ({ ...c, name: { ...c.name, en: event.target.value } }))}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy || !schoolDraft.code || !schoolDraft.name.en}
                  onClick={async () => {
                    if (await run(() => createAcademicSchool(schoolDraft))) setSchoolDraft(null)
                  }}
                >
                  {copy.save}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSchoolDraft(null)}>{copy.cancel}</Button>
              </div>
            </div>
          ) : null}

          {(data?.schools || []).map((school) => (
            <div key={school.id} className="space-y-2 rounded-xl border border-[var(--color-border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs"><bdi>{school.code}</bdi></span>
                  <span className="font-semibold">{localize(school.name, language)}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{school.modules_count} · {copy.modules}</span>
                </span>
                <Badge variant={school.status === 'approved' ? 'success' : 'warning'}>
                  {school.status === 'approved' ? copy.approved : copy.draft}
                </Badge>
              </div>

              {school.status !== 'approved' ? (
                <div className="space-y-2">
                  <Textarea
                    rows={2}
                    placeholder={copy.basisPlaceholder}
                    value={approving[school.id] || ''}
                    onChange={(event) => setApproving((c) => ({ ...c, [school.id]: event.target.value }))}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || (approving[school.id] || '').trim().length < 20}
                    onClick={() => run(() => approveAcademicSchool(school.id, { basis: approving[school.id].trim() }))}
                  >
                    <CheckCircle2 size={16} /> {copy.approve}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* MODULES — article 8. */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{copy.modules} ({data?.modules?.length || 0})</CardTitle>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setModuleDraft({ official_code: '', title: { en: '' } })}
            >
              <Plus size={16} /> {copy.addModule}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-6">
          {moduleDraft ? (
            <div className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs text-[var(--color-text-muted)]">
                  {copy.code}
                  <Input
                    value={moduleDraft.official_code}
                    onChange={(event) =>
                      setModuleDraft((c) => ({ ...c, official_code: event.target.value.toUpperCase() }))
                    }
                  />
                </label>
                <label className="text-xs text-[var(--color-text-muted)]">
                  {copy.title_}
                  <Input
                    value={moduleDraft.title.en}
                    onChange={(event) =>
                      setModuleDraft((c) => ({ ...c, title: { ...c.title, en: event.target.value } }))
                    }
                  />
                </label>
                <label className="text-xs text-[var(--color-text-muted)]">
                  {copy.school}
                  <Select
                    value={moduleDraft.academic_rpl_school_id || ''}
                    onChange={(event) =>
                      setModuleDraft((c) => ({ ...c, academic_rpl_school_id: event.target.value || null }))
                    }
                  >
                    <option value="">{copy.noSchool}</option>
                    {(data?.schools || []).map((school) => (
                      <option key={school.id} value={school.id}>{localize(school.name, language)}</option>
                    ))}
                  </Select>
                </label>
                <label className="text-xs text-[var(--color-text-muted)]">
                  {copy.track}
                  <Select
                    value={moduleDraft.academic_rpl_track_id || ''}
                    onChange={(event) =>
                      setModuleDraft((c) => ({ ...c, academic_rpl_track_id: event.target.value || null }))
                    }
                  >
                    <option value="">{copy.anyTrack}</option>
                    {(data?.tracks || []).map((track) => (
                      <option key={track.id} value={track.id}>{localize(track.name, language)}</option>
                    ))}
                  </Select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy || !moduleDraft.official_code || !moduleDraft.title.en}
                  onClick={async () => {
                    if (await run(() => createAcademicModule(moduleDraft))) setModuleDraft(null)
                  }}
                >
                  {copy.save}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setModuleDraft(null)}>{copy.cancel}</Button>
              </div>
            </div>
          ) : null}

          {(data?.modules || []).map((module) => {
            const declared = module.competencies || []
            const declaresNothing = declared.length === 0
            const isPublished = module.content_status === 'published'
            const pending = coverage[module.id]

            return (
              <div key={module.id} className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{localize(module.title, language)}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span className="font-mono"><bdi>{module.official_code}</bdi></span>
                      <span>{module.school ? localize(module.school.name, language) : copy.noSchool}</span>
                      <span>{module.track ? localize(module.track.name, language) : copy.anyTrack}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* The single most consequential fact about a module. */}
                    {declaresNothing ? (
                      <Badge variant="danger">{copy.declaresNothing}</Badge>
                    ) : null}
                    <Badge variant={isPublished ? 'success' : 'warning'}>
                      {isPublished ? copy.published : copy.draft}
                    </Badge>
                  </div>
                </div>

                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">{copy.closes}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(data?.competencies || []).map((competency) => {
                      const current =
                        pending?.[competency.id] ??
                        declared.find((d) => d.id === competency.id)?.pivot?.coverage ??
                        ''
                      return (
                        <label
                          key={competency.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-sm"
                        >
                          <span>
                            <span className="font-mono text-xs"><bdi>{competency.code}</bdi></span>{' '}
                            {localize(competency.name, language)}
                          </span>
                          <Select
                            value={current}
                            disabled={isPublished}
                            onChange={(event) =>
                              setCoverage((c) => ({
                                ...c,
                                [module.id]: { ...(c[module.id] || {}), [competency.id]: event.target.value },
                              }))
                            }
                          >
                            <option value="">{copy.none}</option>
                            <option value="primary">{copy.primary}</option>
                            <option value="supporting">{copy.supporting}</option>
                          </Select>
                        </label>
                      )
                    })}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">{copy.supportingNote}</p>

                  {!isPublished && pending ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={async () => {
                        const merged = { ...Object.fromEntries(
                          declared.map((d) => [d.id, d.pivot.coverage]),
                        ), ...pending }
                        const payload = Object.entries(merged)
                          .filter(([, value]) => value === 'primary' || value === 'supporting')
                          .map(([id, value]) => ({ id: Number(id), coverage: value }))
                        if (await run(() => setAcademicModuleCompetencies(module.id, payload))) {
                          setCoverage((c) => ({ ...c, [module.id]: undefined }))
                        }
                      }}
                    >
                      {copy.saveCoverage}
                    </Button>
                  ) : null}
                </section>

                {isPublished ? (
                  <p className="text-xs text-[var(--color-text-muted)]">{copy.publishedLocked}</p>
                ) : (
                  <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => run(() => publishAcademicModule(module.id))}
                    >
                      <Send size={16} /> {copy.publish}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => run(() => deleteAcademicModule(module.id))}
                    >
                      <Trash2 size={16} /> {copy.remove}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
