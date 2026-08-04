import { useCallback, useEffect, useMemo, useState } from 'react'
import { Library, Loader2, Search } from 'lucide-react'
import { Badge, Card, CardContent, CoursePicker, Input, PageHeader, Select } from '../../../components/ui'
import { fetchProgramQuestionBank } from '../services/quizzesService'
import { fetchAdminPrograms } from '../../programs/services/programsService'
import { unwrapApiData, unwrapCollection, readApiError, readLocalized } from '../../../services/apiResponse'
import { getCurrentLanguage } from '../../../utils/localization'

/*
 * ONE BANK PER COURSE.
 *
 * The old screen made you pick a unit and showed that unit's questions, so an
 * eight-unit course had eight banks and no way to see its questions as one set —
 * which is how anyone reviewing them actually thinks, and how the exam engine
 * already behaves (it selects across every quiz in the programme).
 *
 * So: pick a course, get all of its questions. The unit becomes a column and a
 * filter, never a container.
 *
 * The totals come from the server. A screen that counts "how many are approved"
 * for itself will eventually disagree with the publication gates, and that
 * disagreement is exactly the kind nobody notices until a package will not
 * publish and no one can say why.
 */

const COPY = {
  ar: {
    title: 'بنك أسئلة البرنامج',
    subtitle: 'كل أسئلة الدورة في بنك واحد — الوحدة عمود للتصفية، لا حاوية منفصلة.',
    program: 'الدورة',
    choose: '— اختر دورة —',
    search: 'ابحث في نص السؤال',
    unit: 'الوحدة',
    allUnits: 'كل الوحدات',
    status: 'حالة المراجعة',
    allStatuses: 'كل الحالات',
    total: 'إجمالي الأسئلة',
    showing: 'المعروض',
    empty: 'لا توجد أسئلة في هذه الدورة بعد.',
    noMatch: 'لا يوجد سؤال مطابق للتصفية.',
    loading: 'جارٍ التحميل…',
    demand: 'المستوى المعرفي',
    difficulty: 'الصعوبة',
    outcome: 'المخرج',
    correct: 'الإجابة الصحيحة',
    pickFirst: 'اختر دورة لعرض بنك أسئلتها.',
  },
  en: {
    title: 'Programme question bank',
    subtitle: 'Every question in the course, in one bank — the unit is a column to filter by, not a separate container.',
    program: 'Course',
    choose: '— choose a course —',
    search: 'Search question text',
    unit: 'Unit',
    allUnits: 'All units',
    status: 'Review status',
    allStatuses: 'All statuses',
    total: 'Questions in bank',
    showing: 'Showing',
    empty: 'This course has no questions yet.',
    noMatch: 'No question matches the filter.',
    loading: 'Loading…',
    demand: 'Cognitive demand',
    difficulty: 'Difficulty',
    outcome: 'Outcome',
    correct: 'Correct answer',
    pickFirst: 'Choose a course to see its question bank.',
  },
  nl: {
    title: 'Vragenbank van het programma',
    subtitle: 'Alle vragen van de cursus in één bank — de eenheid is een filterkolom, geen aparte container.',
    program: 'Cursus',
    choose: '— kies een cursus —',
    search: 'Zoek in vraagtekst',
    unit: 'Eenheid',
    allUnits: 'Alle eenheden',
    status: 'Reviewstatus',
    allStatuses: 'Alle statussen',
    total: 'Vragen in de bank',
    showing: 'Getoond',
    empty: 'Deze cursus heeft nog geen vragen.',
    noMatch: 'Geen vraag voldoet aan het filter.',
    loading: 'Laden…',
    demand: 'Cognitief niveau',
    difficulty: 'Moeilijkheid',
    outcome: 'Uitkomst',
    correct: 'Juiste antwoord',
    pickFirst: 'Kies een cursus om de vragenbank te zien.',
  },
}

const STATUS_VARIANT = {
  approved: 'success',
  rejected: 'danger',
  pending_review: 'warning',
  ai_draft: 'neutral',
  superseded: 'neutral',
}

export default function ProgramQuestionBankPage() {
  const language = getCurrentLanguage()
  const copy = COPY[language] || COPY.en

  const [programs, setPrograms] = useState([])
  const [programId, setProgramId] = useState('')
  const [bank, setBank] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchAdminPrograms({ per_page: 200 })
      .then((payload) => setPrograms(unwrapCollection(payload)))
      .catch((e) => setError(readApiError(e)))
  }, [])

  const load = useCallback(async (id) => {
    if (!id) {
      setBank(null)

      return
    }
    setLoading(true)
    setError('')
    try {
      setBank(unwrapApiData(await fetchProgramQuestionBank(id)))
    } catch (loadError) {
      setError(readApiError(loadError))
      setBank(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(programId)
  }, [programId, load])

  const questions = useMemo(() => bank?.questions || [], [bank])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return questions.filter((q) => {
      if (unitFilter && String(q.unit_id) !== String(unitFilter)) return false
      if (statusFilter && q.review_status !== statusFilter) return false
      if (needle && !readLocalized(q.question_text, language).toLowerCase().includes(needle)) return false

      return true
    })
  }, [questions, search, unitFilter, statusFilter, language])

  const statuses = useMemo(
    () => Object.keys(bank?.by_review_status || {}).filter(Boolean),
    [bank],
  )

  return (
    <div className="space-y-6">
      <PageHeader title={copy.title} description={copy.subtitle} />

      <Card>
        <CardContent className="space-y-4 p-6">
          <CoursePicker programs={programs} value={programId} onChange={setProgramId} />

          <CoursePicker programs={programs} value={programId} onChange={setProgramId} />

          {/* Filters only matter once a course is chosen — showing them before
              that is three disabled boxes pretending to be a workspace. */}
          {bank ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label={copy.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
              />

              <Select label={copy.unit} value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
                <option value="">{copy.allUnits}</option>
                {(bank.units || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {readLocalized(u.title, language)} ({bank.by_unit?.[u.id] ?? 0})
                  </option>
                ))}
              </Select>

              <Select label={copy.status} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">{copy.allStatuses}</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s} ({bank.by_review_status?.[s] ?? 0})
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {error ? <p className="whitespace-pre-line text-sm text-red-600">{error}</p> : null}

          {bank ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">
                <Library className="h-4 w-4" aria-hidden="true" /> {copy.total}: {bank.total}
              </Badge>
              <Badge variant="neutral">{copy.showing}: {visible.length}</Badge>
              {Object.entries(bank.by_review_status || {}).map(([s, n]) => (
                <Badge key={s} variant={STATUS_VARIANT[s] || 'neutral'}>{s}: {n}</Badge>
              ))}
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

      {!loading && bank && questions.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-[var(--color-text-muted)]">{copy.empty}</CardContent></Card>
      ) : null}

      {!loading && bank && questions.length > 0 && visible.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-[var(--color-text-muted)]">{copy.noMatch}</CardContent></Card>
      ) : null}

      <div className="space-y-3">
        {visible.map((q, index) => (
          <Card key={q.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-3xl text-sm font-medium text-[var(--color-text)]">
                  {index + 1}. {readLocalized(q.question_text, language)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[q.review_status] || 'neutral'}>{q.review_status || '—'}</Badge>
                  {/* The unit as a label on the row — the whole point of this screen. */}
                  <Badge variant="neutral">{readLocalized(q.unit_title, language) || '—'}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                <span>{copy.difficulty}: {q.difficulty || '—'}</span>
                <span>{copy.demand}: {q.cognitive_demand || '—'}</span>
                {q.learning_outcome_code ? <span>{copy.outcome}: {q.learning_outcome_code}</span> : null}
              </div>

              {(q.options || []).length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {q.options.map((o) => (
                    <li
                      key={o.id}
                      className={o.is_correct
                        ? 'font-medium text-emerald-700'
                        : 'text-[var(--color-text-muted)]'}
                    >
                      {o.is_correct ? '✓ ' : '• '}{readLocalized(o.text, language)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
