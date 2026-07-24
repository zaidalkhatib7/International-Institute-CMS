import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, CheckCircle2, Download, ExternalLink, Loader2, RefreshCw, ShieldAlert, Sparkles, Trash2, UploadCloud } from 'lucide-react'
import { Badge, Button, Card, CardContent, Select } from '../../../components/ui'
import {
  downloadPackagePdf,
  fetchAiPackageStatus,
  generateAiPackage,
  openNewPackageVersion,
  publishTrainingPackage,
  regenerateAiPackageComponent,
  rejectAiPackage,
  resolveAiPackageSource,
} from '../services/programsService'
import { getCurrentLanguage } from '../../../utils/localization'
import { readApiError } from '../../../services/apiResponse'

const COPY = {
  ar: {
    title: 'تأليف الحقيبة بالذكاء الاصطناعي (لمرة واحدة لكل إصدار)',
    subtitle:
      'Gemini يؤلّف مسودة واحدة تحت المراجعة البشرية. المسودة ليست معتمدة وليست منشورة — النشر قرار بشري فقط.',
    notGoverned: 'هذا البرنامج ليس حقيبة معتمدة ضمن كتالوج CGP، لذا لا ينطبق عليه التأليف بالذكاء الاصطناعي.',
    saveFirst: 'احفظ البرنامج أولًا ثم عد إلى هذا التبويب لبدء التأليف.',
    packageVersion: 'إصدار الحقيبة',
    aiStatus: 'حالة التأليف',
    published: 'منشورة (مجمّدة)',
    draft: 'قيد الإعداد',
    generate: 'توليد الحقيبة بالذكاء الاصطناعي',
    generating: 'جارٍ التوليد…',
    currentStep: 'الخطوة الحالية',
    locale: 'لغة المحتوى',
    validation: 'نتائج الفحص البنيوي',
    sections: 'الوحدات',
    lessons: 'الدروس',
    activities: 'الأنشطة',
    questions: 'الأسئلة',
    uncovered: 'مخرجات غير مغطاة',
    artifacts: 'سجل مخرجات التوليد (يُحفظ الأصل دائمًا)',
    regenerate: 'إعادة توليد',
    superseded: 'استُبدل',
    sourceReview: 'مرجع يتطلب مراجعة بشرية',
    markReviewed: 'تمت مراجعته',
    reject: 'رفض المسودة بالكامل',
    rejectConfirm: 'سيُحذف المحتوى الذي أنشأه الذكاء الاصطناعي لهذه المسودة (يبقى السجل التدقيقي). متابعة؟',
    publish: 'نشر الحقيبة (إصدار مجمّد)',
    newVersion: 'فتح إصدار جديد',
    newVersionPrompt: 'رقم الإصدار الجديد (مثال 2.0):',
    publishedNote: 'هذا الإصدار منشور ومجمّد — التوصيات تعيد استخدامه ولا يُعاد توليده أبدًا. لأي تعديل افتح إصدارًا جديدًا.',
    failed: 'فشل التوليد — يمكن الاستئناف من نقطة التوقف بإعادة المحاولة.',
    statuses: {
      not_generated: 'لم يولَّد بعد',
      ai_generating: 'قيد التوليد',
      ai_draft: 'مسودة AI بانتظار المراجعة',
      generation_failed: 'فشل التوليد',
    },
  },
  en: {
    title: 'AI package authoring (once per package version)',
    subtitle:
      'Gemini drafts once under human review. A draft is never approved nor published — publishing is a human decision only.',
    notGoverned: 'This programme is not a governed CGP catalogue package, so AI authoring does not apply.',
    saveFirst: 'Save the programme first, then return to this tab to start authoring.',
    packageVersion: 'Package version',
    aiStatus: 'Authoring status',
    published: 'Published (frozen)',
    draft: 'In preparation',
    generate: 'Generate package with AI',
    generating: 'Generating…',
    currentStep: 'Current step',
    locale: 'Content language',
    validation: 'Structural validation results',
    sections: 'Modules',
    lessons: 'Lessons',
    activities: 'Activities',
    questions: 'Questions',
    uncovered: 'Uncovered outcomes',
    artifacts: 'Generation artifact history (originals always preserved)',
    regenerate: 'Regenerate',
    superseded: 'Superseded',
    sourceReview: 'Reference requires human review',
    markReviewed: 'Mark reviewed',
    reject: 'Reject entire draft',
    rejectConfirm: 'AI-generated content for this draft will be removed (audit history is kept). Continue?',
    publish: 'Publish package (frozen version)',
    newVersion: 'Open new version',
    newVersionPrompt: 'New version number (e.g. 2.0):',
    publishedNote: 'This version is published and frozen — recommendations reuse it and it is never regenerated. Open a new version to change anything.',
    failed: 'Generation failed — retrying resumes from the checkpoint.',
    statuses: {
      not_generated: 'Not generated yet',
      ai_generating: 'Generating',
      ai_draft: 'AI draft awaiting review',
      generation_failed: 'Generation failed',
    },
  },
  nl: {
    title: 'AI-pakketontwikkeling (één keer per pakketversie)',
    subtitle:
      'Gemini schrijft één concept onder menselijke review. Een concept is nooit goedgekeurd of gepubliceerd — publiceren blijft een menselijke beslissing.',
    notGoverned: 'Dit programma is geen CGP-cataloguspakket; AI-ontwikkeling is niet van toepassing.',
    saveFirst: 'Sla het programma eerst op en keer terug naar dit tabblad.',
    packageVersion: 'Pakketversie',
    aiStatus: 'Ontwikkelstatus',
    published: 'Gepubliceerd (bevroren)',
    draft: 'In voorbereiding',
    generate: 'Pakket genereren met AI',
    generating: 'Genereren…',
    currentStep: 'Huidige stap',
    locale: 'Inhoudstaal',
    validation: 'Structurele validatie',
    sections: 'Modules',
    lessons: 'Lessen',
    activities: 'Opdrachten',
    questions: 'Vragen',
    uncovered: 'Niet-gedekte leeruitkomsten',
    artifacts: 'Generatiegeschiedenis (origineel blijft bewaard)',
    regenerate: 'Opnieuw genereren',
    superseded: 'Vervangen',
    sourceReview: 'Bron vereist menselijke review',
    markReviewed: 'Als gereviewd markeren',
    reject: 'Volledig concept afwijzen',
    rejectConfirm: 'AI-inhoud van dit concept wordt verwijderd (auditgeschiedenis blijft). Doorgaan?',
    publish: 'Pakket publiceren (bevroren versie)',
    newVersion: 'Nieuwe versie openen',
    newVersionPrompt: 'Nieuw versienummer (bijv. 2.0):',
    publishedNote: 'Deze versie is gepubliceerd en bevroren — aanbevelingen hergebruiken haar; er wordt nooit opnieuw gegenereerd.',
    failed: 'Generatie mislukt — opnieuw proberen hervat vanaf het checkpoint.',
    statuses: {
      not_generated: 'Nog niet gegenereerd',
      ai_generating: 'Bezig met genereren',
      ai_draft: 'AI-concept wacht op review',
      generation_failed: 'Generatie mislukt',
    },
  },
}

const REGENERATABLE = {
  lesson: 'lesson',
  module: 'module',
  question_batch: 'question_bank',
}

const TYPE_LABELS = {
  ar: { outline: 'مخطط الحقيبة', module: 'وحدة تدريبية', lesson: 'درس', activities: 'أنشطة تطبيقية', question_batch: 'بنك أسئلة' },
  en: { outline: 'Package outline', module: 'Module', lesson: 'Lesson', activities: 'Activities', question_batch: 'Question bank' },
  nl: { outline: 'Pakketoverzicht', module: 'Module', lesson: 'Les', activities: 'Opdrachten', question_batch: 'Vragenbank' },
}

const STEP_LABELS = {
  ar: { outline: 'المخطط', modules: 'الوحدات', lessons: 'الدروس', activities: 'الأنشطة', question_bank: 'بنك الأسئلة', validate: 'الفحص البنيوي' },
  en: { outline: 'Outline', modules: 'Modules', lessons: 'Lessons', activities: 'Activities', question_bank: 'Question bank', validate: 'Validation' },
  nl: { outline: 'Overzicht', modules: 'Modules', lessons: 'Lessen', activities: 'Opdrachten', question_bank: 'Vragenbank', validate: 'Validatie' },
}

const TREE_COPY = {
  ar: { title: 'محتوى الحقيبة المولّدة — راجعه درسًا درسًا', hint: 'افتح أي درس من شاشة الأقسام والدروس المعتادة للمراجعة والتحرير؛ ما تعدّله يبقى محفوظًا، وإعادة التوليد الجزئي متاحة أدناه.', questions: 'سؤالًا', progressTitle: 'تقدم التوليد المباشر' },
  en: { title: 'Generated package content — review lesson by lesson', hint: 'Open any lesson in the usual Sections & Lessons screens to review/edit; edits persist, and per-component regeneration is available below.', questions: 'questions', progressTitle: 'Live generation progress' },
  nl: { title: 'Gegenereerde pakketinhoud — les voor les beoordelen', hint: 'Open elke les in de gebruikelijke schermen om te beoordelen/bewerken.', questions: 'vragen', progressTitle: 'Live generatievoortgang' },
}

function locText(value, language) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[language] || value.ar || value.en || value.nl || ''
}

function refId(componentRef) {
  const value = Number(String(componentRef || '').split(':')[1])
  return Number.isFinite(value) ? value : null
}

export default function AiPackagePanel({ programId, isGoverned, officialCode = '' }) {
  const navigate = useNavigate()
  const language = getCurrentLanguage()
  const copy = COPY[language] || COPY.en
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [locale, setLocale] = useState(language)
  const pollRef = useRef(null)

  const load = useCallback(async () => {
    if (!programId) return
    try {
      const response = await fetchAiPackageStatus(programId)
      setStatus(response?.data || null)
    } catch (loadError) {
      setError(readApiError(loadError))
    }
  }, [programId])

  useEffect(() => {
    load()
  }, [load])

  const run = status?.run
  const isRunning = run && ['queued', 'generating'].includes(run.status)

  useEffect(() => {
    if (isRunning && !pollRef.current) {
      pollRef.current = setInterval(load, 5000)
    }
    if (!isRunning && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [isRunning, load])

  const withBusy = useCallback(
    async (action, successMessage = '') => {
      setBusy(true)
      setError('')
      setNotice('')
      try {
        await action()
        if (successMessage) setNotice(successMessage)
        await load()
      } catch (actionError) {
        setError(readApiError(actionError))
      } finally {
        setBusy(false)
      }
    },
    [load],
  )

  const artifacts = useMemo(() => run?.artifacts || [], [run])
  const unresolvedFlags = useMemo(
    () =>
      artifacts.flatMap((artifact) =>
        (artifact.source_flags || [])
          .filter((flag) => !flag.resolved)
          .map((flag) => ({ artifact, flag })),
      ),
    [artifacts],
  )

  if (!programId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-[var(--color-text-muted)]">{copy.saveFirst}</CardContent>
      </Card>
    )
  }
  if (!isGoverned) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-[var(--color-text-muted)]">{copy.notGoverned}</CardContent>
      </Card>
    )
  }

  const isPublished = Boolean(status?.package_published_at)
  const aiStatus = status?.ai_authoring_status || 'not_generated'
  const canGenerate = !isPublished && !isRunning && aiStatus !== 'ai_draft'

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text)]">
                <Bot className="h-5 w-5" aria-hidden="true" /> {copy.title}
              </h3>
              <p className="mt-1 max-w-3xl text-sm text-[var(--color-text-muted)]">{copy.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {copy.packageVersion}: {status?.package_version || '1.0'}
              </Badge>
              <Badge variant={isPublished ? 'success' : 'neutral'}>
                {isPublished ? copy.published : copy.draft}
              </Badge>
              <Badge variant={aiStatus === 'generation_failed' ? 'danger' : 'neutral'}>
                {copy.aiStatus}: {copy.statuses[aiStatus] || aiStatus}
              </Badge>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}
          {aiStatus === 'generation_failed' ? (
            <p className="text-sm text-amber-600">{copy.failed}</p>
          ) : null}
          {isPublished ? (
            <p className="text-sm text-[var(--color-text-muted)]">{copy.publishedNote}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                withBusy(() =>
                  downloadPackagePdf(programId, `${officialCode || `program-${programId}`}-package.pdf`),
                )
              }
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {language === 'ar' ? 'تنزيل الحقيبة PDF' : language === 'nl' ? 'Pakket als PDF' : 'Download package PDF'}
            </Button>
            {!isPublished ? (
              <>
                <Select
                  value={locale}
                  onChange={(event) => setLocale(event.target.value)}
                  className="w-36"
                  aria-label={copy.locale}
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                  <option value="nl">Nederlands</option>
                </Select>
                <Button
                  disabled={busy || !canGenerate}
                  onClick={() => withBusy(() => generateAiPackage(programId, locale))}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.generating}
                      {run?.current_step ? ` (${copy.currentStep}: ${run.current_step})` : ''}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden="true" /> {copy.generate}
                    </>
                  )}
                </Button>
                {aiStatus === 'ai_draft' ? (
                  <>
                    <Button
                      variant="secondary"
                      disabled={busy || unresolvedFlags.length > 0}
                      onClick={() => withBusy(() => publishTrainingPackage(programId))}
                    >
                      <UploadCloud className="h-4 w-4" aria-hidden="true" /> {copy.publish}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(copy.rejectConfirm)) {
                          withBusy(() => rejectAiPackage(programId))
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" /> {copy.reject}
                    </Button>
                  </>
                ) : null}
              </>
            ) : (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  const version = window.prompt(copy.newVersionPrompt)
                  if (version) withBusy(() => openNewPackageVersion(programId, version))
                }}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> {copy.newVersion}
              </Button>
            )}
          </div>

          {isRunning && status?.progress ? (
            <div className="rounded-lg border border-[var(--color-border)] p-4 text-sm">
              <p className="mb-2 font-semibold text-[var(--color-text)]">
                {(TREE_COPY[language] || TREE_COPY.en).progressTitle}
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {Object.entries(STEP_LABELS[language] || STEP_LABELS.en).map(([key, label]) => {
                  const done = (status.progress.completed_steps || []).includes(key)
                  const active = status.progress.current_step === key
                  return (
                    <Badge key={key} variant={done ? 'success' : active ? 'secondary' : 'neutral'}>
                      {done ? '✓ ' : active ? '⏳ ' : ''}{label}
                    </Badge>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">{copy.sections}: {status.progress.sections_done}</Badge>
                <Badge variant="neutral">
                  {copy.lessons}: {status.progress.lessons_done}{status.progress.lessons_total ? ` / ${status.progress.lessons_total}` : ''}
                </Badge>
                <Badge variant="neutral">{copy.activities}: {status.progress.assignments_done}</Badge>
                <Badge variant="neutral">
                  {copy.questions}: {status.progress.questions_done}{status.progress.questions_total ? ` / ${status.progress.questions_total}` : ''}
                </Badge>
              </div>
            </div>
          ) : null}

          {run?.validation_results ? (
            <div className="rounded-lg border border-[var(--color-border)] p-4 text-sm">
              <p className="mb-2 font-semibold text-[var(--color-text)]">{copy.validation}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">{copy.sections}: {run.validation_results.sections_created}</Badge>
                <Badge variant="neutral">{copy.lessons}: {run.validation_results.lessons_created}</Badge>
                <Badge variant="neutral">{copy.activities}: {run.validation_results.assignments_created}</Badge>
                <Badge variant="neutral">{copy.questions}: {run.validation_results.questions_created}</Badge>
                <Badge variant="neutral">{run.validation_results.assessment_policy}</Badge>
                {(run.validation_results.uncovered_learning_outcomes || []).length > 0 ? (
                  <Badge variant="danger">
                    {copy.uncovered}: {run.validation_results.uncovered_learning_outcomes.join(', ')}
                  </Badge>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {unresolvedFlags.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" /> SOURCE_REVIEW_REQUIRED
            </h4>
            {unresolvedFlags.map(({ artifact, flag }) => (
              <div
                key={`${artifact.id}-${flag.citation}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"
              >
                <span>
                  <strong>{flag.citation}</strong>
                  <span className="mt-0.5 block text-xs text-amber-700">
                    {(TYPE_LABELS[language] || TYPE_LABELS.en)[artifact.component_type] || artifact.component_type}
                    {artifact.ref_title ? ' — '+locText(artifact.ref_title, language) : ''} · {copy.sourceReview}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    withBusy(() => resolveAiPackageSource(programId, artifact.id, flag.citation))
                  }
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {copy.markReviewed}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {(status?.content_tree || []).length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h4 className="text-sm font-semibold text-[var(--color-text)]">
              {(TREE_COPY[language] || TREE_COPY.en).title}
            </h4>
            <p className="text-xs text-[var(--color-text-muted)]">{(TREE_COPY[language] || TREE_COPY.en).hint}</p>
            {status.content_tree.map((section, index) => (
              <div key={section.section_id} className="rounded-lg border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/sections/edit?id=${section.section_id}`)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    {index + 1}. {locText(section.title, language)}
                    <ExternalLink size={13} aria-hidden="true" />
                  </button>
                  {section.quiz_id ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/quizzes/edit?id=${section.quiz_id}`)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-secondary)]"
                    >
                      {section.question_count} {(TREE_COPY[language] || TREE_COPY.en).questions}
                      <ExternalLink size={11} aria-hidden="true" />
                    </button>
                  ) : (
                    <Badge variant="neutral">
                      {section.question_count} {(TREE_COPY[language] || TREE_COPY.en).questions}
                    </Badge>
                  )}
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {section.lessons.map((lesson, li) => (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/lessons/edit?id=${lesson.id}`)}
                        className="inline-flex items-center gap-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:underline"
                      >
                        {index + 1}.{li + 1} {locText(lesson.title, language)}
                        <ExternalLink size={12} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {artifacts.length > 0 ? (
        <Card>
          <CardContent className="space-y-2 p-6">
            <h4 className="text-sm font-semibold text-[var(--color-text)]">{copy.artifacts}</h4>
            <div className="divide-y divide-[var(--color-border)]">
              {artifacts.map((artifact) => (
                <div key={artifact.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">{(TYPE_LABELS[language] || TYPE_LABELS.en)[artifact.component_type] || artifact.component_type}</Badge>
                    <span className="font-medium text-[var(--color-text)]">
                      {artifact.ref_title ? locText(artifact.ref_title, language) : artifact.component_type === 'outline' ? '—' : artifact.component_ref}
                    </span>
                    {artifact.sequence > 1 ? <span className="text-xs text-[var(--color-text-muted)]">v{artifact.sequence}</span> : null}
                    {artifact.superseded_by ? <Badge variant="secondary">{copy.superseded}</Badge> : null}
                  </div>
                  {!isPublished &&
                  aiStatus === 'ai_draft' &&
                  !artifact.superseded_by &&
                  REGENERATABLE[artifact.component_type] &&
                  refId(artifact.component_ref) ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        withBusy(() =>
                          regenerateAiPackageComponent(
                            programId,
                            REGENERATABLE[artifact.component_type],
                            refId(artifact.component_ref),
                          ),
                        )
                      }
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" /> {copy.regenerate}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
