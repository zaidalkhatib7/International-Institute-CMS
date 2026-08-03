import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, CheckCircle2, Download, ExternalLink, KeyRound, Loader2, RefreshCw, ShieldAlert, Sparkles, Trash2, UploadCloud } from 'lucide-react'
import { Badge, Button, Card, CardContent, Select, Textarea } from '../../../components/ui'
import {
  authorizeGeneration,
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
    sourceVerdict: 'حكم المصدر (قرار بشري صريح)',
    sourceVerdictPlaceholder: '— اختر الحكم —',
    verdictApproved: 'موثَّق ومعتمد (VERIFIED_APPROVED)',
    verdictRejected: 'مرفوض (REJECTED) — يمنع النشر',
    verdictSuperseded: 'مُستبدَل بمرجع أدق (SUPERSEDED)',
    sourceNotes: 'أساس الحكم (إلزامي)',
    sourceNotesHint: 'ما الذي تحققتَ منه بالضبط: العنوان، الجهة، السنة، المعرّف — أو ما تعذّر التحقق منه.',
    recordVerdict: 'تسجيل الحكم',
    recordedTitle: 'أحكام مصادر مسجَّلة — قابلة لإعادة المراجعة',
    recordedHint: 'حتى 25 يوليو 2026 كان الخادم يعتمد المصدر تلقائيًا عند غياب حكم صريح؛ لذلك قد لا يعكس حكم مسجَّل هنا قرارًا بشريًا فعليًا. إعادة التقييم لا تحذف السجل السابق، بل تضيف قرارًا جديدًا إلى الأثر التدقيقي.',
    previouslyRecorded: 'حكم سابق مسجَّل',
    recordedBy: 'سجّله',
    previousNotes: 'أساس الحكم السابق',
    noPreviousNotes: '— لم يُسجَّل أي أساس —',
    reReview: 'إعادة تقييم الحكم',
    supersededWarning: 'تنبيه: SUPERSEDED يرفع منع النشر تمامًا مثل الاعتماد. لا تسجّله إلا بعد تعديل المحتوى فعلًا إلى المرجع الأحدث.',
    reject: 'رفض المسودة بالكامل',
    rejectConfirm: 'سيُحذف المحتوى الذي أنشأه الذكاء الاصطناعي لهذه المسودة (يبقى السجل التدقيقي). متابعة؟',
    publish: 'نشر الحقيبة (إصدار مجمّد)',
    newVersion: 'فتح إصدار جديد',
    newVersionPrompt: 'رقم الإصدار الجديد (مثال 2.0):',
    publishedNote: 'هذا الإصدار منشور ومجمّد — التوصيات تعيد استخدامه ولا يُعاد توليده أبدًا. لأي تعديل افتح إصدارًا جديدًا.',
    failed: 'فشل التوليد — يمكن الاستئناف من نقطة التوقف بإعادة المحاولة.',
    govTitle: 'بوابات التوليد',
    govReady: 'جاهزية الحوكمة: مستوفاة',
    govNotReady: 'جاهزية الحوكمة: غير مستوفاة — اعتمد حزمة الانطلاق أولًا',
    govCounts: 'ربط كفايات معتمد: {c} · مخرجات تعلّم فعّالة: {o}',
    govAuthorized: 'تصريح التوليد: مُسجَّل',
    govNotAuthorized: 'تصريح التوليد: غير مُسجَّل',
    govTwoKey: 'مفتاحان: جهة الحوكمة (rpl.settings.manage) تسجّل التصريح لهذا الإصدار، ثم تبدأ صلاحية إدارة البرامج التوليد. التصريح لإصدار واحد ويُستهلك بعد استخدامه.',
    govNote: 'أساس التصريح',
    govNotePlaceholder: 'من صرّح بذلك ولماذا هذا الإصدار جاهز للتأليف.',
    govNoteHint: 'يُحفظ مع اسمك في السجل التدقيقي. هذه البوابة موجودة لأن التوليد بدأ مرتين على برامج غير محكومة.',
    govAuthorize: 'تسجيل تصريح التوليد',
    govAuthorizing: 'جارٍ التسجيل…',
    govConfirm: 'سيُسجَّل تصريح لهذا الإصدار باسمك. متابعة؟',
    govBy: 'سجّله',
    govExpires: 'ينتهي',
    govConsumed: 'استُهلك',
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
    sourceVerdict: 'Source verdict (explicit human decision)',
    sourceVerdictPlaceholder: '— choose a verdict —',
    verdictApproved: 'Verified and approved (VERIFIED_APPROVED)',
    verdictRejected: 'Rejected (REJECTED) — blocks publication',
    verdictSuperseded: 'Replaced by a precise reference (SUPERSEDED)',
    sourceNotes: 'Basis of the verdict (required)',
    sourceNotesHint: 'Exactly what you verified: title, issuer, year, identifier — or what could not be verified.',
    recordVerdict: 'Record verdict',
    recordedTitle: 'Recorded source verdicts — eligible for re-review',
    recordedHint: 'Until 25 Jul 2026 the server approved a source automatically when no explicit verdict was sent, so a verdict recorded here may not reflect an actual human decision. Re-reviewing never deletes the earlier record; it appends a new decision to the audit trail.',
    previouslyRecorded: 'Previously recorded',
    recordedBy: 'Recorded by',
    previousNotes: 'Previous basis',
    noPreviousNotes: '— no basis was recorded —',
    reReview: 'Re-review verdict',
    supersededWarning: 'Warning: SUPERSEDED lifts the publication block exactly as approval does. Do not record it until the content actually cites the newer reference.',
    reject: 'Reject entire draft',
    rejectConfirm: 'AI-generated content for this draft will be removed (audit history is kept). Continue?',
    publish: 'Publish package (frozen version)',
    newVersion: 'Open new version',
    newVersionPrompt: 'New version number (e.g. 2.0):',
    publishedNote: 'This version is published and frozen — recommendations reuse it and it is never regenerated. Open a new version to change anything.',
    failed: 'Generation failed — retrying resumes from the checkpoint.',
    govTitle: 'Generation gates',
    govReady: 'Governance readiness: satisfied',
    govNotReady: 'Governance readiness: not satisfied — approve a seed pack first',
    govCounts: 'Approved competency mappings: {c} · Active learning outcomes: {o}',
    govAuthorized: 'Generation authorization: recorded',
    govNotAuthorized: 'Generation authorization: not recorded',
    govTwoKey: 'Two keys: the governance tier (rpl.settings.manage) records that this version may be authored, then programme management starts the run. An authorization covers one version and is consumed when used.',
    govNote: 'Basis for the authorization',
    govNotePlaceholder: 'Who authorised this, and why this version is ready to be authored.',
    govNoteHint: 'Stored with your name in the audit trail. This gate exists because generation was twice started on ungoverned programmes.',
    govAuthorize: 'Record generation authorization',
    govAuthorizing: 'Recording…',
    govConfirm: 'An authorization for this version will be recorded against your name. Continue?',
    govBy: 'Recorded by',
    govExpires: 'Expires',
    govConsumed: 'Consumed',
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
    sourceVerdict: 'Bronoordeel (expliciet menselijk besluit)',
    sourceVerdictPlaceholder: '— kies een oordeel —',
    verdictApproved: 'Geverifieerd en goedgekeurd (VERIFIED_APPROVED)',
    verdictRejected: 'Afgewezen (REJECTED) — blokkeert publicatie',
    verdictSuperseded: 'Vervangen door een preciezere bron (SUPERSEDED)',
    sourceNotes: 'Onderbouwing van het oordeel (verplicht)',
    sourceNotesHint: 'Wat u precies heeft geverifieerd: titel, uitgever, jaar, identificatie — of wat niet verifieerbaar was.',
    recordVerdict: 'Oordeel vastleggen',
    recordedTitle: 'Vastgelegde bronoordelen — herbeoordeling mogelijk',
    recordedHint: 'Tot 25 juli 2026 keurde de server een bron automatisch goed als er geen expliciet oordeel werd meegestuurd. Herbeoordelen verwijdert het eerdere record niet; het voegt een nieuw besluit toe aan het auditspoor.',
    previouslyRecorded: 'Eerder vastgelegd',
    recordedBy: 'Vastgelegd door',
    previousNotes: 'Eerdere onderbouwing',
    noPreviousNotes: '— geen onderbouwing vastgelegd —',
    reReview: 'Oordeel herbeoordelen',
    supersededWarning: 'Let op: SUPERSEDED heft de publicatieblokkade op, net als goedkeuring. Leg het pas vast nadat de inhoud daadwerkelijk de nieuwere bron citeert.',
    reject: 'Volledig concept afwijzen',
    rejectConfirm: 'AI-inhoud van dit concept wordt verwijderd (auditgeschiedenis blijft). Doorgaan?',
    publish: 'Pakket publiceren (bevroren versie)',
    newVersion: 'Nieuwe versie openen',
    newVersionPrompt: 'Nieuw versienummer (bijv. 2.0):',
    publishedNote: 'Deze versie is gepubliceerd en bevroren — aanbevelingen hergebruiken haar; er wordt nooit opnieuw gegenereerd.',
    failed: 'Generatie mislukt — opnieuw proberen hervat vanaf het checkpoint.',
    govTitle: 'Generatiepoorten',
    govReady: 'Governance-gereedheid: voldaan',
    govNotReady: 'Governance-gereedheid: niet voldaan — keur eerst een startpakket goed',
    govCounts: 'Goedgekeurde competentiekoppelingen: {c} · Actieve leeruitkomsten: {o}',
    govAuthorized: 'Generatietoestemming: vastgelegd',
    govNotAuthorized: 'Generatietoestemming: niet vastgelegd',
    govTwoKey: 'Twee sleutels: de governance-laag (rpl.settings.manage) legt vast dat deze versie geschreven mag worden, daarna start programmabeheer de run. Een toestemming geldt voor één versie en wordt bij gebruik verbruikt.',
    govNote: 'Onderbouwing van de toestemming',
    govNotePlaceholder: 'Wie dit heeft toegestaan en waarom deze versie gereed is.',
    govNoteHint: 'Wordt met uw naam in het auditspoor bewaard. Deze poort bestaat omdat generatie twee keer op ongereguleerde programmas is gestart.',
    govAuthorize: 'Generatietoestemming vastleggen',
    govAuthorizing: 'Bezig met vastleggen…',
    govConfirm: 'Er wordt een toestemming voor deze versie op uw naam vastgelegd. Doorgaan?',
    govBy: 'Vastgelegd door',
    govExpires: 'Verloopt',
    govConsumed: 'Verbruikt',
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

const VERDICT_VARIANT = {
  VERIFIED_APPROVED: 'success',
  REJECTED: 'danger',
  SUPERSEDED: 'warning',
  SOURCE_REVIEW_REQUIRED: 'warning',
}

const TREE_COPY = {
  ar: { title: 'محتوى الحقيبة المولّدة — راجعه درسًا درسًا', hint: 'افتح أي درس من شاشة الأقسام والدروس المعتادة للمراجعة والتحرير؛ ما تعدّله يبقى محفوظًا، وإعادة التوليد الجزئي متاحة أدناه.', questions: 'سؤالًا', progressTitle: 'تقدم التوليد المباشر', rationale: 'تغطية تبرير الإجابة (مؤشر جودة معلوماتي — التبرير اختياري ولا يمنع الاعتماد أو النشر)' },
  en: { title: 'Generated package content — review lesson by lesson', hint: 'Open any lesson in the usual Sections & Lessons screens to review/edit; edits persist, and per-component regeneration is available below.', questions: 'questions', progressTitle: 'Live generation progress', rationale: 'Answer-rationale coverage (informational quality metric — rationale is optional and never blocks approval or publication)' },
  nl: { title: 'Gegenereerde pakketinhoud — les voor les beoordelen', hint: 'Open elke les in de gebruikelijke schermen om te beoordelen/bewerken.', questions: 'vragen', progressTitle: 'Live generatievoortgang', rationale: 'Dekking van antwoordmotivering (informatief — optioneel, blokkeert nooit)' },
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
  // Per-citation verdict draft: nothing is sent until the reviewer picks a
  // verdict AND writes its basis (fail-closed source governance).
  const [sourceVerdicts, setSourceVerdicts] = useState({})
  // Written basis for a generation authorization. Kept out of the request until
  // the reviewer has actually typed one: see the note in the block that uses it.
  const [authorizationNote, setAuthorizationNote] = useState('')
  const pollRef = useRef(null)

  const patchSourceVerdict = useCallback((key, patch) => {
    setSourceVerdicts((prev) => ({ ...prev, [key]: { verification_status: '', review_notes: '', ...(prev[key] || {}), ...patch } }))
  }, [])

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
  // Every flag is listed, open or already decided. A verdict recorded before the
  // fail-closed fix may not reflect a real human decision, and a flag the screen
  // hides is a flag no reviewer can correct.
  const allFlags = useMemo(
    () =>
      artifacts.flatMap((artifact) =>
        (artifact.source_flags || []).map((flag) => ({ artifact, flag })),
      ),
    [artifacts],
  )
  const unresolvedFlags = useMemo(() => allFlags.filter(({ flag }) => !flag.resolved), [allFlags])
  const recordedFlags = useMemo(() => allFlags.filter(({ flag }) => flag.resolved), [allFlags])
  // Which recorded verdicts the reviewer has opened for re-review.
  const [reopened, setReopened] = useState({})

  const flagOrigin = (artifact) =>
    `${(TYPE_LABELS[language] || TYPE_LABELS.en)[artifact.component_type] || artifact.component_type}${
      artifact.ref_title ? ' — ' + locText(artifact.ref_title, language) : ''
    }`

  // FAIL-CLOSED: a verdict is recorded only with an explicit choice and a written
  // basis of at least 10 characters — the same rule the server enforces. Used for
  // a first review and for a re-review alike; both post to the one audited endpoint.
  const renderVerdictForm = (artifact, flag) => {
    const key = `${artifact.id}::${flag.citation}`
    const draft = sourceVerdicts[key] || { verification_status: '', review_notes: '' }
    const ready = draft.verification_status && draft.review_notes.trim().length >= 10
    return (
      <>
        <Select
          label={copy.sourceVerdict}
          value={draft.verification_status}
          onChange={(e) => patchSourceVerdict(key, { verification_status: e.target.value })}
        >
          <option value="">{copy.sourceVerdictPlaceholder}</option>
          <option value="VERIFIED_APPROVED">{copy.verdictApproved}</option>
          <option value="REJECTED">{copy.verdictRejected}</option>
          <option value="SUPERSEDED">{copy.verdictSuperseded}</option>
        </Select>
        {draft.verification_status === 'SUPERSEDED' ? (
          <p className="text-xs font-semibold text-amber-700">{copy.supersededWarning}</p>
        ) : null}
        <Textarea
          label={copy.sourceNotes}
          rows={2}
          value={draft.review_notes}
          onChange={(e) => patchSourceVerdict(key, { review_notes: e.target.value })}
          placeholder={copy.sourceNotesHint}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || !ready}
          onClick={() =>
            withBusy(async () => {
              await resolveAiPackageSource(
                programId,
                artifact.id,
                flag.citation,
                draft.verification_status,
                draft.review_notes,
              )
              setReopened((prev) => ({ ...prev, [key]: false }))
              setSourceVerdicts((prev) => ({ ...prev, [key]: { verification_status: '', review_notes: '' } }))
            })
          }
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {copy.recordVerdict}
        </Button>
      </>
    )
  }

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
  const governance = status?.governance
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

          {/*
            WHICH GATE IS CLOSED, AND THE DOOR THROUGH IT.

            Generation passes R2 (governance readiness) and then the authorization
            window. The endpoint for the second one has existed since the
            auth-window work but the CMS never exposed it, so a refusal arrived as
            untranslated server text naming an HTTP route the reader cannot call.

            Showing the state does not weaken the gate. Recording an authorization
            is still a deliberate act, still needs rpl.settings.manage, and is still
            written to the audit trail against the person who does it.
          */}
          {!isPublished && governance ? (
            <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <KeyRound className="h-4 w-4" aria-hidden="true" /> {copy.govTitle}
              </h4>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={governance.ready ? 'success' : 'warning'}>
                  {governance.ready ? copy.govReady : copy.govNotReady}
                </Badge>
                <Badge variant={governance.authorized ? 'success' : 'warning'}>
                  {governance.authorized ? copy.govAuthorized : copy.govNotAuthorized}
                </Badge>
              </div>

              <p className="text-xs text-[var(--color-text-muted)]">
                {copy.govCounts
                  .replace('{c}', governance.approved_competency_mappings ?? 0)
                  .replace('{o}', governance.active_learning_outcomes ?? 0)}
              </p>

              {governance.active_authorization ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  {copy.govBy}: {governance.active_authorization.authorized_by || '—'}
                  {governance.active_authorization.note
                    ? ` — ${governance.active_authorization.note}`
                    : ''}
                </p>
              ) : null}

              {/*
                Offered only once the programme is genuinely ready. The server
                refuses an authorization before readiness anyway; showing the form
                earlier would invite an attempt that can only fail.
              */}
              {governance.ready && !governance.authorized ? (
                <>
                  <p className="text-xs text-[var(--color-text-muted)]">{copy.govTwoKey}</p>
                  <Textarea
                    label={copy.govNote}
                    rows={2}
                    value={authorizationNote}
                    placeholder={copy.govNotePlaceholder}
                    hint={copy.govNoteHint}
                    onChange={(event) => setAuthorizationNote(event.target.value)}
                  />
                  {/*
                    The server accepts a null note. This screen does not: an
                    authorization with no recorded reason is indistinguishable, six
                    months later, from the two premature runs this gate was built to
                    stop. Ten characters is the same floor the source-verdict form uses.
                  */}
                  <Button
                    disabled={busy || authorizationNote.trim().length < 10}
                    onClick={() => {
                      if (!window.confirm(copy.govConfirm)) return
                      withBusy(
                        () => authorizeGeneration(programId, authorizationNote.trim()),
                      ).then(() => setAuthorizationNote(''))
                    }}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.govAuthorizing}
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" aria-hidden="true" /> {copy.govAuthorize}
                      </>
                    )}
                  </Button>
                </>
              ) : null}
            </div>
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
                key={`${artifact.id}::${flag.citation}`}
                className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"
              >
                <span className="block">
                  <strong>{flag.citation}</strong>
                  <span className="mt-0.5 block text-xs text-amber-700">
                    {flagOrigin(artifact)} · {copy.sourceReview}
                  </span>
                </span>
                {renderVerdictForm(artifact, flag)}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Verdicts already on record. They are shown — not hidden — because a
          verdict stored before the fail-closed fix may never have been a human
          decision, and a hidden record is one no reviewer can correct. The old
          record is never edited here: re-reviewing appends a new audited decision. */}
      {recordedFlags.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
              <ShieldAlert className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
              {copy.recordedTitle}
            </h4>
            <p className="text-xs text-[var(--color-text-muted)]">{copy.recordedHint}</p>
            {recordedFlags.map(({ artifact, flag }) => {
              const key = `${artifact.id}::${flag.citation}`
              const isOpen = Boolean(reopened[key])
              return (
                <div key={key} className="space-y-2 rounded-lg border border-[var(--color-border)] p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="block">
                      <strong>{flag.citation}</strong>
                      <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                        {flagOrigin(artifact)}
                      </span>
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={VERDICT_VARIANT[flag.verification_status] || 'neutral'}>
                        {flag.verification_status || '—'}
                      </Badge>
                      <span className="text-[11px] text-[var(--color-text-muted)]">{copy.previouslyRecorded}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {copy.recordedBy}: {flag.reviewed_by_name || (flag.reviewed_by ? `#${flag.reviewed_by}` : '—')}
                    {flag.reviewed_at ? ` · ${new Date(flag.reviewed_at).toLocaleString()}` : ''}
                  </p>
                  <p className="rounded bg-[var(--color-surface-muted)] p-2 text-xs leading-5">
                    <span className="font-semibold">{copy.previousNotes}: </span>
                    {flag.review_notes || copy.noPreviousNotes}
                  </p>
                  {isOpen ? (
                    renderVerdictForm(artifact, flag)
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setReopened((prev) => ({ ...prev, [key]: true }))}
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" /> {copy.reReview}
                    </Button>
                  )}
                </div>
              )
            })}
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
            {status?.rationale_coverage?.questions ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                {(TREE_COPY[language] || TREE_COPY.en).rationale}:{' '}
                {status.rationale_coverage.with_rationale}/{status.rationale_coverage.questions} ({status.rationale_coverage.coverage_percent}%)
              </p>
            ) : null}
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
