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
 *
 * ACTIVITIES CARRY NO MARKS (owner, 17 Oct 2026): an activity is optional
 * practice the client does to improve themselves. It has no maximum or pass
 * score, nobody grades it, and it never holds back progress, the final quiz or
 * the certificate. So the editor has no score fields and sends none, each
 * activity says so where it is edited, and a course or unit without activities
 * is not flagged — having none is a valid choice, not a gap.
 *
 * WHO SEES AN ACTIVITY is its `is_active` switch: clients see only the active
 * ones in their lesson. It is also the only way to withdraw an activity clients
 * have already submitted work to, because deleting that one is refused
 * (ACTIVITY_HAS_SUBMISSIONS: "deactivate it instead"). So the editor shows the
 * switch and saves it, a hidden activity says so, and a new activity is created
 * hidden: a placeholder titled "New activity" with no instructions must not
 * reach clients before anyone has written it.
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
    optional: 'اختياري — بدون علامات، للتطوير الذاتي للعميل',
    shown: 'ظاهر للعملاء (مُفعَّل)',
    hidden: 'مخفي عن العملاء',
    save: 'حفظ النشاط', saving: 'جارٍ الحفظ…', saved: 'حُفظ.',
    chars: 'حرفًا', empty: 'فارغ', thin: 'قصير',
    activityNote: 'الأنشطة تمارين اختيارية بلا علامات: لا تُصحَّح، ولا توقف تقدّم العميل ولا الاختبار النهائي ولا الشهادة. يبقى النشاط الجديد مخفيًا عن العملاء حتى تفعّل «ظاهر للعملاء» وتحفظه.',
    addActivity: 'إضافة نشاط',
    deleteActivity: 'حذف',
    deleteActivityConfirm: 'حذف هذا النشاط؟ يُرفض الحذف إذا كان المتدربون قد سلّموا عملًا فيه، حفاظًا على العمل المسلَّم.',
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
    optional: "Optional - no marks, for the client's own development",
    shown: 'Shown to clients (active)',
    hidden: 'Hidden from clients',
    save: 'Save activity', saving: 'Saving…', saved: 'Saved.',
    chars: 'characters', empty: 'empty', thin: 'thin',
    activityNote: 'Activities are optional practice with no marks: nobody grades them, and they never hold back the client\'s progress, the final quiz or the certificate. A new activity stays hidden from clients until you tick "Shown to clients" and save it.',
    addActivity: 'Add activity',
    deleteActivity: 'Delete',
    deleteActivityConfirm: 'Delete this activity? Refused if learners have already submitted work to it, so that submitted work is kept.',
    newActivityTitle: 'New activity',
  },
}

/** Body length is a review signal: a 200-character "lesson" is not a lesson. */
function lengthBadge(chars, copy) {
  if (!chars) return { variant: 'danger', label: copy.empty }
  if (chars < 800) return { variant: 'warning', label: `${chars} ${copy.chars} · ${copy.thin}` }

  return { variant: 'neutral', label: `${chars} ${copy.chars}` }
}

/*
 * The editor holds the two platform languages and nothing else. Loading the stored
 * object whole re-sent every key it carried on each save, including a Dutch one
 * (Dutch was removed on 13 Oct 2026).
 */
function arEn(value) {
  return { en: value?.en ?? '', ar: value?.ar ?? '' }
}

/*
 * Title, instructions and whether clients see it. A score an older server still
 * returns on the activity is not read, not shown and not sent back: activities
 * carry no marks. An activity whose payload does not say is treated as shown,
 * which is the server's default, so saving it never hides it by accident.
 */
function ActivityEditor({ activity, copy, language, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    title: arEn(activity.title),
    instructions: arEn(activity.instructions),
    is_active: activity.is_active !== false,
  })
  // The stored state, not the unsaved tick: the badge says what clients see now.
  const hidden = activity.is_active === false
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
        is_active: form.is_active,
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
      // ACTIVITY_HAS_SUBMISSIONS carries the count of submitted work — show it
      // verbatim, because the refusal only means something with the number.
      setError(readApiError(deleteError))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted,transparent)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{copy.optional}</Badge>
        {hidden ? <Badge variant="info">{copy.hidden}</Badge> : null}
      </div>
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
      <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
        />
        {copy.shown}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={busy} onClick={save}>
          {busy
            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.saving}</>
            : <><Save className="h-4 w-4" aria-hidden="true" /> {copy.save}</>}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={remove}>
          <Trash2 className="h-4 w-4" aria-hidden="true" /> {copy.deleteActivity}
        </Button>
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
   * A new activity is created with a placeholder title, HIDDEN from clients,
   * and nothing else — no marks, because activities carry none — then edited
   * inline like any other and switched on when it is ready. Asking for a title
   * in a modal first would put a dialog between the reviewer and a field that
   * is already on the page.
   */
  const addActivityTo = async (lessonId) => {
    setAddingTo(lessonId)
    setError('')
    try {
      await createActivity({
        lesson_id: lessonId,
        title: { [language]: copy.newActivityTitle },
        is_active: false,
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
              {/* Neutral even at zero: activities are optional, so none is not a gap. */}
              <Badge variant="neutral"><Zap className="h-4 w-4" aria-hidden="true" /> {copy.activities}: {totals.activities}</Badge>
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
                    <Badge variant="neutral">{copy.activities}: {unit.activity_count}</Badge>
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
