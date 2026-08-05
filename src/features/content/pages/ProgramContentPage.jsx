import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, ChevronLeft, FileQuestion, FileText, Layers3, Loader2, PencilLine, Plus, Save, Trash2, Zap,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CoursePicker, Input, PageHeader, Textarea } from '../../../components/ui'
import {
  createActivity,
  deleteActivity,
  fetchProgramContentTree,
  updateActivity,
} from '../services/contentService'
import { fetchAdminPrograms } from '../../programs/services/programsService'
import { unwrapApiData, unwrapCollection, readApiError, readLocalized } from '../../../services/apiResponse'
import { getCurrentLanguage } from '../../../utils/localization'

/*
 * ONE COURSE, ITS WHOLE STRUCTURE.
 *
 * The learning-content screens were organised by TYPE: every unit across every
 * programme on one page, every lesson on another, every question bank on a
 * third. With a hundred programmes that is a filing cabinet — nobody works on
 * "all the units", they work on one course.
 *
 * And the unit list never counted anything, so a unit holding eleven lessons
 * displayed 0 and read as "empty". Content that exists but reports itself absent
 * is the expensive kind of wrong: it invites someone to regenerate work they
 * already have.
 *
 * So: pick a course, expand a unit, and everything in it is here — lessons with
 * their real body length, the activities hanging off those lessons, and the size
 * of the question bank. Each node links to the editor that already exists for
 * it. Activities are the exception and are edited inline, because until now they
 * had no editor at all.
 */

const COPY = {
  ar: {
    title: 'محتوى الدورة',
    subtitle: 'اختر دورة لترى بنيتها كاملة: الوحدات ودروسها وأنشطتها وبنك أسئلتها — كل شيء قابل للفتح والتحرير.',
    program: 'الدورة',
    choose: '— اختر دورة —',
    pickFirst: 'اختر دورة لعرض محتواها.',
    loading: 'جارٍ التحميل…',
    units: 'الوحدات', lessons: 'الدروس', activities: 'الأنشطة', questions: 'الأسئلة',
    editUnit: 'تحرير الوحدة', editLesson: 'تحرير الدرس', openBank: 'فتح بنك الأسئلة',
    noLessons: 'لا توجد دروس في هذه الوحدة.',
    noActivities: 'لا أنشطة على هذا الدرس.',
    activityTitle: 'عنوان النشاط', instructions: 'التعليمات',
    maxScore: 'الدرجة القصوى', passScore: 'درجة النجاح',
    save: 'حفظ النشاط', saving: 'جارٍ الحفظ…', saved: 'حُفظ.',
    chars: 'حرفًا', empty: 'فارغ', thin: 'قصير',
    activityNote: 'الأنشطة لم تكن قابلة للعرض أو التحرير قبل الآن — تُولَّد وتُحسب فقط. تحريرها هنا.',
    addActivity: 'إضافة نشاط',
    deleteActivity: 'حذف',
    deleteActivityConfirm: 'حذف هذا النشاط؟ يُرفض الحذف إذا كان المتدربون قد سلّموا فيه.',
    newActivityTitle: 'نشاط جديد',
  },
  en: {
    title: 'Course content',
    subtitle: 'Pick a course to see its whole structure: units, their lessons, their activities and the size of the question bank — all of it openable and editable.',
    program: 'Course',
    choose: '— choose a course —',
    pickFirst: 'Choose a course to see its content.',
    loading: 'Loading…',
    units: 'Units', lessons: 'Lessons', activities: 'Activities', questions: 'Questions',
    editUnit: 'Edit unit', editLesson: 'Edit lesson', openBank: 'Open question bank',
    noLessons: 'This unit has no lessons.',
    noActivities: 'No activities on this lesson.',
    activityTitle: 'Activity title', instructions: 'Instructions',
    maxScore: 'Max score', passScore: 'Pass score',
    save: 'Save activity', saving: 'Saving…', saved: 'Saved.',
    chars: 'characters', empty: 'empty', thin: 'thin',
    activityNote: 'Activities could not be viewed or edited before now — only generated and counted. Edit them here.',
    addActivity: 'Add activity',
    deleteActivity: 'Delete',
    deleteActivityConfirm: 'Delete this activity? Refused if learners have already submitted to it.',
    newActivityTitle: 'New activity',
  },
  nl: {
    title: 'Cursusinhoud',
    subtitle: 'Kies een cursus om de volledige structuur te zien: eenheden, lessen, opdrachten en de omvang van de vragenbank — alles te openen en te bewerken.',
    program: 'Cursus',
    choose: '— kies een cursus —',
    pickFirst: 'Kies een cursus om de inhoud te zien.',
    loading: 'Laden…',
    units: 'Eenheden', lessons: 'Lessen', activities: 'Opdrachten', questions: 'Vragen',
    editUnit: 'Eenheid bewerken', editLesson: 'Les bewerken', openBank: 'Vragenbank openen',
    noLessons: 'Deze eenheid heeft geen lessen.',
    noActivities: 'Geen opdrachten bij deze les.',
    activityTitle: 'Titel van de opdracht', instructions: 'Instructies',
    maxScore: 'Maximale score', passScore: 'Slaagscore',
    save: 'Opdracht opslaan', saving: 'Opslaan…', saved: 'Opgeslagen.',
    chars: 'tekens', empty: 'leeg', thin: 'dun',
    activityNote: 'Opdrachten waren tot nu toe niet te bekijken of te bewerken — alleen gegenereerd en geteld. Bewerk ze hier.',
    addActivity: 'Opdracht toevoegen',
    deleteActivity: 'Verwijderen',
    deleteActivityConfirm: 'Deze opdracht verwijderen? Geweigerd als cursisten al hebben ingeleverd.',
    newActivityTitle: 'Nieuwe opdracht',
  },
}

/** Body length is a review signal: a 200-character "lesson" is not a lesson. */
function lengthBadge(chars, copy) {
  if (!chars) return { variant: 'danger', label: copy.empty }
  if (chars < 800) return { variant: 'warning', label: `${chars} ${copy.chars} · ${copy.thin}` }

  return { variant: 'neutral', label: `${chars} ${copy.chars}` }
}

function ActivityEditor({ activity, copy, language, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    title: activity.title || {},
    instructions: activity.instructions || {},
    max_score: activity.max_score,
    pass_score: activity.pass_score,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const save = async () => {
    setBusy(true)
    setError('')
    setDone(false)
    try {
      await updateActivity(activity.id, {
        title: form.title,
        instructions: form.instructions,
        max_score: Number(form.max_score),
        pass_score: Number(form.pass_score),
      })
      setDone(true)
      if (onSaved) onSaved()
    } catch (saveError) {
      setError(readApiError(saveError))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(copy.deleteActivityConfirm)) return
    setBusy(true)
    setError('')
    try {
      await deleteActivity(activity.id)
      if (onDeleted) onDeleted()
    } catch (deleteError) {
      // ACTIVITY_HAS_SUBMISSIONS carries the count — show it verbatim, because
      // "deactivate instead" is only actionable if you know how many exist.
      setError(readApiError(deleteError))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted,transparent)] p-4">
      <Input
        label={copy.activityTitle}
        value={readLocalized(form.title, language)}
        onChange={(e) => setForm((f) => ({ ...f, title: { ...f.title, [language]: e.target.value } }))}
      />
      <Textarea
        label={copy.instructions}
        rows={3}
        value={readLocalized(form.instructions, language)}
        onChange={(e) => setForm((f) => ({ ...f, instructions: { ...f.instructions, [language]: e.target.value } }))}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          label={copy.maxScore} type="number" min="1" value={form.max_score}
          onChange={(e) => setForm((f) => ({ ...f, max_score: e.target.value }))}
        />
        <Input
          label={copy.passScore} type="number" min="0" value={form.pass_score}
          onChange={(e) => setForm((f) => ({ ...f, pass_score: e.target.value }))}
        />
        <div className="flex items-end gap-2">
          <Button disabled={busy} onClick={save}>
            {busy
              ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.saving}</>
              : <><Save className="h-4 w-4" aria-hidden="true" /> {copy.save}</>}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={remove}>
            <Trash2 className="h-4 w-4" aria-hidden="true" /> {copy.deleteActivity}
          </Button>
        </div>
      </div>
      {error ? <p className="whitespace-pre-line text-sm text-red-600">{error}</p> : null}
      {done ? <p className="text-sm text-emerald-600">{copy.saved}</p> : null}
    </div>
  )
}

export default function ProgramContentPage() {
  const language = getCurrentLanguage()
  const copy = COPY[language] || COPY.en
  const navigate = useNavigate()

  const [programs, setPrograms] = useState([])
  const [programId, setProgramId] = useState('')
  const [tree, setTree] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState({})
  const [addingTo, setAddingTo] = useState(null)

  useEffect(() => {
    fetchAdminPrograms({ per_page: 200 })
      .then((p) => setPrograms(unwrapCollection(p)))
      .catch((e) => setError(readApiError(e)))
  }, [])

  const load = useCallback(async (id) => {
    if (!id) {
      setTree(null)

      return
    }
    setLoading(true)
    setError('')
    try {
      setTree(unwrapApiData(await fetchProgramContentTree(id)))
    } catch (loadError) {
      setError(readApiError(loadError))
      setTree(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(programId) }, [programId, load])

  /*
   * A new activity is created with a placeholder title and sensible scores, then
   * edited inline like any other. Asking for a title in a modal first would put
   * a dialog between the reviewer and a field that is already on the page.
   */
  const addActivityTo = async (lessonId) => {
    setAddingTo(lessonId)
    setError('')
    try {
      await createActivity({
        lesson_id: lessonId,
        title: { [language]: copy.newActivityTitle },
        max_score: 100,
        pass_score: 60,
      })
      await load(programId)
    } catch (addError) {
      setError(readApiError(addError))
    } finally {
      setAddingTo(null)
    }
  }

  const totals = useMemo(() => tree?.totals || {}, [tree])

  return (
    <div className="space-y-6">
      <PageHeader title={copy.title} description={copy.subtitle} />

      <Card>
        <CardContent className="space-y-4 p-6">
          <CoursePicker programs={programs} value={programId} onChange={setProgramId} />

          {error ? <p className="whitespace-pre-line text-sm text-red-600">{error}</p> : null}

          {tree ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral"><Layers3 className="h-4 w-4" aria-hidden="true" /> {copy.units}: {totals.units}</Badge>
              <Badge variant={totals.lessons ? 'neutral' : 'warning'}><FileText className="h-4 w-4" aria-hidden="true" /> {copy.lessons}: {totals.lessons}</Badge>
              <Badge variant={totals.activities ? 'neutral' : 'warning'}><Zap className="h-4 w-4" aria-hidden="true" /> {copy.activities}: {totals.activities}</Badge>
              <Badge variant={totals.questions ? 'neutral' : 'warning'}><FileQuestion className="h-4 w-4" aria-hidden="true" /> {copy.questions}: {totals.questions}</Badge>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="flex items-center gap-2 p-6 text-sm text-[var(--color-text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.loading}
        </CardContent></Card>
      ) : null}

      {!loading && !programId ? (
        <Card><CardContent className="p-6 text-sm text-[var(--color-text-muted)]">{copy.pickFirst}</CardContent></Card>
      ) : null}

      <div className="space-y-3">
        {(tree?.units || []).map((unit) => {
          const isOpen = open[unit.id] !== false // units start expanded: hiding content is what caused this
          const Chevron = isOpen ? ChevronDown : ChevronLeft

          return (
            <Card key={unit.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    className="flex items-start gap-2 text-start"
                    onClick={() => setOpen((o) => ({ ...o, [unit.id]: !isOpen }))}
                  >
                    <Chevron className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="block text-base font-semibold text-[var(--color-text)]">
                        {unit.sort_order}. {readLocalized(unit.title, language)}
                      </span>
                      <span className="block text-xs text-[var(--color-text-muted)]">
                        {readLocalized(unit.description, language)}
                      </span>
                    </span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={unit.lesson_count ? 'neutral' : 'warning'}>{copy.lessons}: {unit.lesson_count}</Badge>
                    <Badge variant={unit.activity_count ? 'neutral' : 'warning'}>{copy.activities}: {unit.activity_count}</Badge>
                    <Badge variant={unit.question_count ? 'neutral' : 'warning'}>{copy.questions}: {unit.question_count}</Badge>
                    <Button variant="outline" onClick={() => navigate(`/sections/edit?id=${unit.id}`)}>
                      <PencilLine className="h-4 w-4" aria-hidden="true" /> {copy.editUnit}
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(`/quizzes/bank?program=${tree.program_id}`)}>
                      <FileQuestion className="h-4 w-4" aria-hidden="true" /> {copy.openBank}
                    </Button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="space-y-3 border-t border-[var(--color-border)] pt-3">
                    {unit.lessons.length === 0 ? (
                      <p className="text-sm text-amber-600">{copy.noLessons}</p>
                    ) : null}

                    {unit.lessons.map((lesson) => {
                      const badge = lengthBadge(lesson.body_length, copy)

                      return (
                        <div key={lesson.id} className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium text-[var(--color-text)]">
                              {lesson.sort_order}. {readLocalized(lesson.title, language)}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="neutral">{lesson.type}</Badge>
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                              <Button variant="outline" onClick={() => navigate(`/lessons/edit?id=${lesson.id}`)}>
                                <PencilLine className="h-4 w-4" aria-hidden="true" /> {copy.editLesson}
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {lesson.activities.length === 0 ? (
                              <p className="text-xs text-[var(--color-text-muted)]">{copy.noActivities}</p>
                            ) : (
                              <>
                                <p className="text-xs text-[var(--color-text-muted)]">{copy.activityNote}</p>
                                {lesson.activities.map((activity) => (
                                  <ActivityEditor
                                    key={activity.id}
                                    activity={activity}
                                    copy={copy}
                                    language={language}
                                    onSaved={() => load(programId)}
                                    onDeleted={() => load(programId)}
                                  />
                                ))}
                              </>
                            )}

                            {/* Add sits with the lesson, not with the activity list,
                                so it is reachable when the list is empty — which is
                                exactly when it is most needed. */}
                            <Button
                              variant="outline"
                              onClick={() => addActivityTo(lesson.id)}
                              disabled={addingTo === lesson.id}
                            >
                              <Plus className="h-4 w-4" aria-hidden="true" /> {copy.addActivity}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
