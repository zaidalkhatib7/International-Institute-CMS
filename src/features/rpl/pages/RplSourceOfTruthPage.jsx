import { createElement, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpenCheck,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
  LockKeyhole,
  RefreshCw,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
} from '../../../components/ui'
import { readApiError, unwrapApiData } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import RplPageState from '../components/RplPageState'
import { localize } from '../domain/rpl'
import { fetchRplSourceOfTruth } from '../services/rplService'
import { formatLocalizedNumber } from '../../../utils/localization'

const copyByLanguage = {
  ar: {
    title: 'مصدر الحقيقة المعتمد لـ RPL وGemini',
    description: 'المرجع الحي نفسه الذي تقرؤه الإدارة ويُرسل إلى Gemini عند إنشاء مسودة التقييم.',
    refresh: 'تحديث المصدر', live: 'مرجع حي من قاعدة البيانات', sourceVersion: 'إصدار البنية', sourceHash: 'بصمة المصدر',
    strictTitle: 'حدود الخدمة الصارمة', strictHint: 'لا يجوز لـGemini أو للمدير المنح عبر السلطتين: نتيجة RPL والمؤهل التدريبي يُقرَّران منفصلين. الربط بين الحالتين مسموح ومُدقَّق.',
    rpl: 'الاعتراف بالخبرات المهنية RPL', rplHint: 'تقييم الخبرة والأدلة ثم تحديد مستوى الاعتماد وبرامج سد الفجوات المناسبة.',
    qualifications: 'المؤهلات المهنية', qualificationsHint: 'المسار التدريبي المؤدي إلى نفس المؤهلات المهنية الثلاثة التي يقيّمها المسار الأكاديمي المهني. البكالوريوس أو ما يعادله يُوجِّه ولا يستبعد من RPL.',
    withoutSecondary: 'لا يحمل شهادة ثانوية عامة', withSecondary: 'يحمل شهادة ثانوية عامة موثقة',
    noSecondaryLearning: 'برامج تأسيسية + برامج سد فجوات الكفاءة', secondaryLearning: 'برامج سد فجوات الكفاءة',
    levelSequence: 'ممارس ← ممارس متقدم ← خبير',
    levels: 'المستويات المهنية', pathwayPrograms: 'البرامج المتاحة لهذا المسار', publishedStandards: 'المعايير المنشورة',
    professionalDiploma: 'بكالوريوس/ليسانس ← دبلوم مهني', professionalMaster: 'بكالوريوس + دبلوم أكاديمي ← ماجستير مهني',
    professionalDoctorate: 'بكالوريوس + دبلوم أكاديمي + ماجستير أكاديمي ← دكتوراه مهنية',
    activePathways: 'مسارات RPL الفعالة', rubrics: 'نماذج التقييم المنشورة', geminiCourses: 'برامج متاحة لـGemini', unmapped: 'برامج تنتظر تحديد المسار',
    pathwayGovernance: 'مسارات RPL وربط البرامج', pathwayGovernanceHint: 'لا يصل البرنامج إلى Gemini إلا إذا كان منشورًا وفعالًا ومربوطًا صراحةً بمسار الطلب الحالي.',
    noPrograms: 'لا توجد برامج منشورة ومربوطة بهذا المسار حتى الآن.', hours: 'ساعة',
    geminiTitle: 'ما الذي يراه Gemini بالضبط؟', enabled: 'مفعّل', disabled: 'غير مفعّل', model: 'النموذج', prompt: 'الـPrompt التشغيلي المعتمد',
    safeguards: 'ضوابط غير قابلة للتجاوز', adminOnly: 'المدير وحده ينشئ المسودة ويراجعها ويعدلها بعد Gemini.',
    noRawFiles: 'لا تُرسل الملفات الخام؛ تُرسل بيانات الأدلة وحالة التحقق فقط.', noDecision: 'Gemini استشاري ولا يتحقق من الأدلة ولا يمنح اعتمادًا ولا يصدر قرار لجنة.',
    eligibleOnly: 'توصيات البرامج محصورة في الكتالوج المسموح لمسار المتقدم، وأي برنامج مخترع يُحذف من النتيجة.',
    settings: 'تحرير إعدادات Gemini', library: 'إدارة مكتبة سد الفجوات',
    warningTitle: 'هناك برامج غير مربوطة بمسار RPL', warningText: 'تبقى هذه البرامج خارج مصدر Gemini حتى يحدد المدير هل تخص مسار مع الثانوية أو دون الثانوية أو كليهما.',
    standardsTitle: 'المعايير ونماذج التقييم الفعالة', outcomes: 'نتائج الاعتماد المعتمدة', evidence: 'فئات الأدلة',
    automatic: 'مزامنة تلقائية', automaticHint: 'إنشاء البرنامج أو تعديله أو تعطيله أو تغيير ربطه ينعكس في طلب Gemini التالي دون نسخ يدوي.',
    loadError: 'تعذر تحميل مصدر الحقيقة المعتمد لـRPL.',
  },
  en: {
    title: 'RPL & Gemini source of truth', description: 'The same live governed source is shown to administrators and supplied to Gemini for every evaluation draft.',
    refresh: 'Refresh source', live: 'Live database source', sourceVersion: 'Schema version', sourceHash: 'Source fingerprint',
    strictTitle: 'Strict service boundary', strictHint: 'Neither Gemini nor an administrator may award across the two authorities: an RPL outcome and a taught qualification are decided separately. Linking a case between them is permitted and audited.',
    rpl: 'Recognition of Prior Learning (RPL)', rplHint: 'Assess experience and evidence, then determine the accreditation level and governed gap programmes.',
    qualifications: 'Professional Qualifications', qualificationsHint: 'The taught route to the same three professional qualifications the Professional Academic RPL pathway assesses toward. A bachelor or equivalent routes an applicant there; it does not exclude them from RPL.',
    withoutSecondary: 'No secondary certificate', withSecondary: 'Verified secondary certificate', noSecondaryLearning: 'Foundation + competency-gap programmes', secondaryLearning: 'Competency-gap programmes',
    levelSequence: 'Practitioner → Advanced Practitioner → Expert',
    levels: 'Professional levels', pathwayPrograms: 'Programmes available to this pathway', publishedStandards: 'Published standards',
    professionalDiploma: 'Bachelor/licence → Professional Diploma', professionalMaster: 'Bachelor + academic diploma → Professional Master’s', professionalDoctorate: 'Bachelor + academic diploma + academic master → Professional Doctorate',
    activePathways: 'Active RPL pathways', rubrics: 'Published rubrics', geminiCourses: 'Programmes available to Gemini', unmapped: 'Programmes awaiting pathway mapping',
    pathwayGovernance: 'RPL pathways and programme mapping', pathwayGovernanceHint: 'A programme reaches Gemini only when published, active, and explicitly mapped to the current application pathway.',
    noPrograms: 'No published programmes are mapped to this pathway yet.', hours: 'hours',
    geminiTitle: 'What exactly does Gemini see?', enabled: 'Enabled', disabled: 'Disabled', model: 'Model', prompt: 'Approved operational prompt',
    safeguards: 'Non-bypassable safeguards', adminOnly: 'Only an administrator generates, reviews, and edits the draft after Gemini.', noRawFiles: 'Raw files are never sent; only evidence metadata and verification state are supplied.',
    noDecision: 'Gemini is advisory: it cannot verify evidence, grant accreditation, or make a committee decision.', eligibleOnly: 'Recommendations are limited to the applicant pathway catalogue; invented programme IDs are removed server-side.',
    settings: 'Edit Gemini settings', library: 'Manage gap library', warningTitle: 'Some programmes have no RPL pathway mapping', warningText: 'They remain outside Gemini until an administrator maps them to the with-secondary pathway, the without-secondary pathway, or both.',
    standardsTitle: 'Active standards and rubrics', outcomes: 'Approved outcomes', evidence: 'Evidence categories', automatic: 'Automatic synchronisation', automaticHint: 'Create, edit, deactivate, or remap a programme and the next Gemini request reflects it without manual copying.',
    loadError: 'Unable to load the governed RPL source of truth.',
  },
  nl: {
    title: 'RPL- en Gemini-bron van waarheid', description: 'Dezelfde actuele beheerde bron wordt aan beheerders getoond en bij elk beoordelingsconcept aan Gemini geleverd.',
    refresh: 'Bron vernieuwen', live: 'Live databasebron', sourceVersion: 'Schemaversie', sourceHash: 'Bronvingerafdruk',
    strictTitle: 'Strikte dienstgrens', strictHint: 'Gemini en beheerders mogen niet over beide bevoegdheden heen toekennen: een RPL-uitkomst en een opleidingskwalificatie worden apart besloten. Een dossier koppelen mag en wordt vastgelegd.',
    rpl: 'Erkenning van eerder leren (RPL)', rplHint: 'Beoordeel ervaring en bewijs en bepaal daarna het accreditatieniveau en de beheerde tekortprogramma’s.',
    qualifications: 'Professionele kwalificaties', qualificationsHint: 'De opleidingsroute naar dezelfde drie professionele kwalificaties die het Professioneel Academisch RPL beoordeelt. Een bachelor of gelijkwaardig stuurt door, het sluit RPL niet uit.',
    withoutSecondary: 'Geen middelbareschooldiploma', withSecondary: 'Geverifieerd middelbareschooldiploma', noSecondaryLearning: 'Basis- en competentietekortprogramma’s', secondaryLearning: 'Competentietekortprogramma’s',
    levelSequence: 'Beoefenaar → Gevorderd beoefenaar → Expert',
    levels: 'Professionele niveaus', pathwayPrograms: 'Programma’s voor dit traject', publishedStandards: 'Gepubliceerde normen',
    professionalDiploma: 'Bachelor/licence → Professioneel diploma', professionalMaster: 'Bachelor + academisch diploma → Professionele master', professionalDoctorate: 'Bachelor + academisch diploma + academische master → Professioneel doctoraat',
    activePathways: 'Actieve RPL-trajecten', rubrics: 'Gepubliceerde rubrics', geminiCourses: 'Programma’s voor Gemini', unmapped: 'Programma’s zonder trajectkoppeling',
    pathwayGovernance: 'RPL-trajecten en programmakoppeling', pathwayGovernanceHint: 'Een programma bereikt Gemini alleen als het gepubliceerd, actief en expliciet aan het huidige traject gekoppeld is.',
    noPrograms: 'Er zijn nog geen gepubliceerde programma’s aan dit traject gekoppeld.', hours: 'uur',
    geminiTitle: 'Wat ziet Gemini precies?', enabled: 'Ingeschakeld', disabled: 'Uitgeschakeld', model: 'Model', prompt: 'Goedgekeurde operationele prompt',
    safeguards: 'Niet-omzeilbare waarborgen', adminOnly: 'Alleen een beheerder maakt, beoordeelt en bewerkt het concept na Gemini.', noRawFiles: 'Ruwe bestanden worden nooit verzonden; alleen bewijsmetadata en verificatiestatus.',
    noDecision: 'Gemini is adviserend en kan geen bewijs verifiëren, accreditatie verlenen of commissiebesluiten nemen.', eligibleOnly: 'Aanbevelingen zijn beperkt tot de trajectcatalogus; verzonnen programma-ID’s worden server-side verwijderd.',
    settings: 'Gemini-instellingen bewerken', library: 'Tekortbibliotheek beheren', warningTitle: 'Sommige programma’s hebben geen RPL-trajectkoppeling', warningText: 'Deze blijven buiten Gemini totdat een beheerder ze aan één of beide RPL-trajecten koppelt.',
    standardsTitle: 'Actieve normen en rubrics', outcomes: 'Goedgekeurde uitkomsten', evidence: 'Bewijscategorieën', automatic: 'Automatische synchronisatie', automaticHint: 'Aanmaken, bewerken, deactiveren of opnieuw koppelen is zonder handmatig kopiëren zichtbaar in het volgende Gemini-verzoek.',
    loadError: 'De beheerde RPL-bron van waarheid kan niet worden geladen.',
  },
}

function MetricCard({ icon, label, value, language, tone = 'primary' }) {
  const toneClass = tone === 'warning' ? 'text-amber-700 bg-amber-50' : 'text-[var(--color-primary)] bg-sky-50'
  return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm font-semibold text-[var(--color-text-muted)]">{label}</p><p className="mt-2 text-3xl font-bold text-[var(--color-text)]">{formatLocalizedNumber(value, language)}</p></div><span className={`rounded-2xl p-3 ${toneClass}`}>{createElement(icon, { size: 24 })}</span></CardContent></Card>
}

function RuleLine({ icon = CheckCircle2, children }) {
  return <li className="flex items-start gap-3">{createElement(icon, { size: 18, className: 'mt-0.5 shrink-0 text-emerald-600' })}<span>{children}</span></li>
}

export default function RplSourceOfTruthPage() {
  const navigate = useNavigate()
  const language = getAdminLanguage()
  const copy = copyByLanguage[language] || copyByLanguage.en
  const [state, setState] = useState({ loading: true, error: '', source: null })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const response = await fetchRplSourceOfTruth()
      setState({ loading: false, error: '', source: unwrapApiData(response) || {} })
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.loadError) }))
    }
  }, [copy.loadError])

  useEffect(() => { load() }, [load])

  const source = state.source || {}
  const pathways = source.pathways || []
  const catalogue = source.rpl_course_catalogue || {}
  const programmeGovernance = source.programme_governance || {}
  const gemini = source.gemini_governance || {}
  const totalCourses = new Set(Object.values(catalogue).flat().map((program) => program.program_id)).size

  return (
    <section dir={language === 'ar' ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader title={copy.title} description={copy.description} actions={<Button variant="outline" onClick={load} disabled={state.loading}><RefreshCw size={17} className={state.loading ? 'animate-spin' : ''} />{copy.refresh}</Button>} />
      <RplPageState loading={state.loading} error={state.error} onRetry={load} language={language}>
        <>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3"><ShieldCheck size={22} /><div><strong>{copy.live}</strong><p className="mt-1 text-sm">{copy.automaticHint}</p></div></div>
              <Badge variant="success">{copy.automatic}</Badge>
            </div>
            <div className="mt-4 grid gap-2 border-t border-emerald-200 pt-4 text-xs sm:grid-cols-2">
              <span><strong>{copy.sourceVersion}:</strong> <bdi>{source.schema_version || '—'}</bdi></span>
              <span className="break-all"><strong>{copy.sourceHash}:</strong> <bdi className="font-mono">{source.source_hash || '—'}</bdi></span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Route} label={copy.activePathways} value={pathways.length} language={language} />
            <MetricCard icon={Scale} label={copy.rubrics} value={(source.published_rubrics || []).length} language={language} />
            <MetricCard icon={BookOpenCheck} label={copy.geminiCourses} value={totalCourses} language={language} />
            <MetricCard icon={TriangleAlert} label={copy.unmapped} value={programmeGovernance.unmapped_library_programs || 0} language={language} tone="warning" />
          </div>

          <Card className="border-sky-200">
            <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.strictTitle}</CardTitle><p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.strictHint}</p></CardHeader>
            <CardContent className="grid gap-5 p-6 xl:grid-cols-2">
              <article className="rounded-2xl border-2 border-sky-200 bg-sky-50/70 p-5">
                <div className="flex items-center gap-3"><Route className="text-[var(--color-primary)]" /><h3 className="text-xl font-bold">{copy.rpl}</h3></div>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{copy.rplHint}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-4"><strong>{copy.withoutSecondary}</strong><p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.noSecondaryLearning}</p></div>
                  <div className="rounded-xl bg-white p-4"><strong>{copy.withSecondary}</strong><p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.secondaryLearning}</p></div>
                </div>
                <p className="mt-4 text-sm"><strong>{copy.levels}:</strong> {copy.levelSequence}</p>
              </article>
              <article className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-5">
                <div className="flex items-center gap-3"><GraduationCap className="text-amber-700" /><h3 className="text-xl font-bold">{copy.qualifications}</h3></div>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{copy.qualificationsHint}</p>
                <ul className="mt-5 space-y-3 text-sm"><RuleLine icon={LockKeyhole}>{copy.professionalDiploma}</RuleLine><RuleLine icon={LockKeyhole}>{copy.professionalMaster}</RuleLine><RuleLine icon={LockKeyhole}>{copy.professionalDoctorate}</RuleLine></ul>
              </article>
            </CardContent>
          </Card>

          {Number(programmeGovernance.unmapped_library_programs || 0) > 0 ? <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950"><TriangleAlert className="mt-0.5 shrink-0" size={21} /><div><strong>{copy.warningTitle}</strong><p className="mt-1 text-sm leading-6">{copy.warningText}</p></div></div> : null}

          <Card>
            <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.pathwayGovernance}</CardTitle><p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.pathwayGovernanceHint}</p></CardHeader>
            <CardContent className="grid gap-5 p-6 xl:grid-cols-2">
              {pathways.map((pathway) => {
                const programs = catalogue[pathway.code] || []
                return <article key={pathway.id || pathway.code} className="rounded-2xl border border-[var(--color-border)] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><Badge variant="neutral"><bdi>{pathway.code}</bdi></Badge><h3 className="mt-3 text-lg font-bold">{localize(pathway.name, language)}</h3><p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{localize(pathway.description, language)}</p></div><span className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-[var(--color-primary)]">{formatLocalizedNumber(programs.length, language)} {copy.pathwayPrograms}</span></div>
                  <div className="mt-4 flex flex-wrap gap-2">{(pathway.levels || []).map((level) => <Badge key={level.id || level.code} variant="neutral">{localize(level.name, language)}</Badge>)}</div>
                  <div className="mt-5 space-y-3">{programs.length ? programs.map((program) => <div key={program.program_id} className="rounded-xl bg-[var(--color-surface-muted)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{program.official_code ? <><bdi>{program.official_code}</bdi><span> · </span></> : null}{localize(program.title, language)}</strong>{program.accredited_hours ? <Badge variant="success">{formatLocalizedNumber(program.accredited_hours, language)} {copy.hours}</Badge> : null}</div><p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{localize(program.short_description, language) || '—'}</p></div>) : <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">{copy.noPrograms}</p>}</div>
                </article>
              })}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-amber-200">
              <CardHeader className="border-b border-[var(--color-border)]"><div className="flex items-center gap-2"><Sparkles className="text-amber-600" size={20} /><CardTitle>{copy.geminiTitle}</CardTitle></div></CardHeader>
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-wrap items-center gap-3"><Badge variant={gemini.enabled ? 'success' : 'neutral'}>{gemini.enabled ? copy.enabled : copy.disabled}</Badge><span className="text-sm"><strong>{copy.model}:</strong> <bdi>{gemini.model || '—'}</bdi></span></div>
                <div><h3 className="font-bold">{copy.safeguards}</h3><ul className="mt-3 space-y-3 text-sm leading-6"><RuleLine>{copy.adminOnly}</RuleLine><RuleLine>{copy.noRawFiles}</RuleLine><RuleLine>{copy.noDecision}</RuleLine><RuleLine>{copy.eligibleOnly}</RuleLine></ul></div>
                <div><p className="mb-2 text-sm font-bold">{copy.prompt}</p><pre dir="ltr" className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--color-surface-muted)] p-4 text-left text-xs leading-6 text-[var(--color-text-muted)]">{gemini.effective_prompt || gemini.configured_prompt || '—'}</pre></div>
                <div className="flex flex-wrap gap-3"><Button onClick={() => navigate('/rpl/configuration')} variant="outline">{copy.settings}</Button><Button onClick={() => navigate('/competency-gap-library')}>{copy.library}</Button></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.standardsTitle}</CardTitle></CardHeader>
              <CardContent className="space-y-5 p-6">
                <div><p className="mb-3 text-sm font-bold">{copy.publishedStandards}</p><div className="space-y-2">{(source.published_standards || []).map((standard) => <div key={standard.id} className="rounded-xl border border-[var(--color-border)] p-3 text-sm"><strong>{standard.code}</strong><span className="mx-2">·</span>{localize(standard.name, language)}</div>)}</div></div>
                <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-sky-50 p-4"><FileCheck2 className="text-[var(--color-primary)]" /><p className="mt-2 text-sm font-semibold">{copy.evidence}</p><p className="mt-1 text-2xl font-bold">{formatLocalizedNumber(source.evidence_policy?.categories?.length || 0, language)}</p></div><div className="rounded-xl bg-emerald-50 p-4"><ShieldCheck className="text-emerald-700" /><p className="mt-2 text-sm font-semibold">{copy.outcomes}</p><p className="mt-1 text-2xl font-bold">{formatLocalizedNumber(source.approved_outcomes?.length || 0, language)}</p></div></div>
              </CardContent>
            </Card>
          </div>
        </>
      </RplPageState>
    </section>
  )
}
