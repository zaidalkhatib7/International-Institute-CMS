import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BookOpenCheck, CheckCircle2, Edit3, RefreshCw, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '../../../components/ui'
import { readApiError } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { formatLocalizedList, formatLocalizedNumber, pickText } from '../../../utils/localization'
import { updateAdminProgram } from '../../programs/services/programsService'
import { fetchRplSourceOfTruth } from '../../rpl/services/rplService'
import { fetchCompetencyFramework, fetchCompetencyGapPrograms } from '../services/competencyFrameworkService'

const copyByLanguage = {
  ar: {
    eyebrow: 'التعلم القائم على الكفاءات', title: 'المكتبة الدولية لبرامج سد فجوات الكفاءات',
    description: 'مصدر الإدارة المعتمد لمراجعة المجموعات والبرامج المئة واستكمالها قبل النشر.',
    refresh: 'تحديث البيانات', groups: 'المجموعات الفعالة', programs: 'برامج الإصدار الأول', drafts: 'مسودات محمية', ready: 'جاهزة للنشر',
    sourceNotice: 'تم استيراد النص العربي الأصلي كما ورد. لا تُفعّل البرامج قبل إضافة المادة العلمية وبنك الأسئلة وربط الكفاءات واستكمال الترجمات.',
    search: 'ابحث بالرمز أو اسم البرنامج...', allStatuses: 'كل حالات المحتوى', allGroups: 'كل المجموعات',
    draft: 'مسودة', review: 'قيد المراجعة', readyStatus: 'جاهز', published: 'منشور', archived: 'مؤرشف',
    program: 'البرنامج', level: 'المستوى والساعات', completeness: 'اكتمال النشر', status: 'الحالة', actions: 'الإجراءات', edit: 'مراجعة واستكمال',
    noPrograms: 'لا توجد برامج مطابقة.', missing: 'متبقٍ للنشر', complete: 'مكتمل', of: 'من', checks: 'متطلبًا',
    editorTitle: 'مراجعة بيانات البرنامج', editorDescription: 'احفظ التعديلات كمسودة تدريجيًا. يمنع الخادم النشر أو التفعيل ما دام أي متطلب ناقصًا.',
    save: 'حفظ التعديلات', saving: 'جارٍ الحفظ...', close: 'إغلاق', saved: 'تم حفظ البرنامج بنجاح.',
    language: 'لغة التحرير', titleField: 'اسم البرنامج', summary: 'الوصف المختصر', objective: 'الهدف العام', knowledge: 'المعرفة', skills: 'المهارات',
    behaviours: 'السلوكيات المهنية', abilities: 'القدرات', indicators: 'مؤشرات الأداء', outcomes: 'مخرجات البرنامج', contentStatus: 'حالة المحتوى',
    governedIdentity: 'الهوية المحكومة', officialCode: 'الرمز الرسمي', group: 'المجموعة', accreditedHours: 'الساعات المعتمدة', hours: 'ساعة',
    learningMaterial: 'إدارة المادة العلمية', questionBank: 'إدارة بنك الأسئلة', loadError: 'تعذر تحميل مكتبة سد فجوات الكفاءات.',
    rplPathways: 'مسارات RPL المسموح بها', rplPathwaysHint: 'حدد بدقة من يمكن أن يوصيه Gemini بهذا البرنامج. اختر المسارين فقط إذا كان البرنامج مناسبًا فعليًا لكليهما.', noPathway: 'لن يصل إلى Gemini حتى تحديد مسار RPL.',
  },
  en: {
    eyebrow: 'Competency-based learning', title: 'International Competency Gap Learning Library',
    description: 'The governed administration source for reviewing and completing all ten groups and one hundred programmes before publication.',
    refresh: 'Refresh data', groups: 'Active groups', programs: 'Version-one programmes', drafts: 'Protected drafts', ready: 'Ready to publish',
    sourceNotice: 'The authoritative Arabic source was imported verbatim. Programmes stay unavailable until learning material, question banks, competency mappings, and translations are complete.',
    search: 'Search by code or programme name...', allStatuses: 'All content statuses', allGroups: 'All groups',
    draft: 'Draft', review: 'In review', readyStatus: 'Ready', published: 'Published', archived: 'Archived',
    program: 'Programme', level: 'Level & hours', completeness: 'Publication readiness', status: 'Status', actions: 'Actions', edit: 'Review & complete',
    noPrograms: 'No matching programmes.', missing: 'Still required', complete: 'Complete', of: 'of', checks: 'requirements',
    editorTitle: 'Review programme data', editorDescription: 'Save incremental draft work. The server blocks publication or activation while any governed requirement is missing.',
    save: 'Save changes', saving: 'Saving...', close: 'Close', saved: 'Programme saved successfully.',
    language: 'Editing language', titleField: 'Programme name', summary: 'Short description', objective: 'General objective', knowledge: 'Knowledge', skills: 'Skills',
    behaviours: 'Professional behaviours', abilities: 'Abilities', indicators: 'Performance indicators', outcomes: 'Programme outcomes', contentStatus: 'Content status',
    governedIdentity: 'Governed identity', officialCode: 'Official code', group: 'Group', accreditedHours: 'Accredited hours', hours: 'hours',
    learningMaterial: 'Manage learning material', questionBank: 'Manage question bank', loadError: 'Unable to load the competency gap library.',
    rplPathways: 'Allowed RPL pathways', rplPathwaysHint: 'Choose exactly which applicants Gemini may recommend this programme to. Select both only when it genuinely fits both pathways.', noPathway: 'Unavailable to Gemini until an RPL pathway is mapped.',
  },
  nl: {
    eyebrow: 'Competentiegericht leren', title: 'Internationale leerbibliotheek voor competentiekloven',
    description: 'De beheerde administratiebron voor controle en voltooiing van tien groepen en honderd programma’s vóór publicatie.',
    refresh: 'Gegevens vernieuwen', groups: 'Actieve groepen', programs: 'Programma’s versie één', drafts: 'Beschermde concepten', ready: 'Klaar voor publicatie',
    sourceNotice: 'De gezaghebbende Arabische bron is letterlijk geïmporteerd. Programma’s blijven niet beschikbaar totdat materiaal, vragenbank, competentiekoppelingen en vertalingen compleet zijn.',
    search: 'Zoek op code of programmanaam...', allStatuses: 'Alle inhoudsstatussen', allGroups: 'Alle groepen',
    draft: 'Concept', review: 'In beoordeling', readyStatus: 'Gereed', published: 'Gepubliceerd', archived: 'Gearchiveerd',
    program: 'Programma', level: 'Niveau en uren', completeness: 'Publicatiegereedheid', status: 'Status', actions: 'Acties', edit: 'Controleren en voltooien',
    noPrograms: 'Geen overeenkomende programma’s.', missing: 'Nog vereist', complete: 'Voltooid', of: 'van', checks: 'vereisten',
    editorTitle: 'Programmagegevens controleren', editorDescription: 'Sla conceptwerk stapsgewijs op. De server blokkeert publicatie en activatie zolang een vereiste ontbreekt.',
    save: 'Wijzigingen opslaan', saving: 'Opslaan...', close: 'Sluiten', saved: 'Programma succesvol opgeslagen.',
    language: 'Bewerkingstaal', titleField: 'Programmanaam', summary: 'Korte beschrijving', objective: 'Algemene doelstelling', knowledge: 'Kennis', skills: 'Vaardigheden',
    behaviours: 'Professioneel gedrag', abilities: 'Vermogens', indicators: 'Prestatie-indicatoren', outcomes: 'Programma-uitkomsten', contentStatus: 'Inhoudsstatus',
    governedIdentity: 'Beheerde identiteit', officialCode: 'Officiële code', group: 'Groep', accreditedHours: 'Geaccrediteerde uren', hours: 'uur',
    learningMaterial: 'Leermateriaal beheren', questionBank: 'Vragenbank beheren', loadError: 'De bibliotheek voor competentiekloven kan niet worden geladen.',
    rplPathways: 'Toegestane RPL-trajecten', rplPathwaysHint: 'Bepaal voor welke aanvragers Gemini dit programma mag aanbevelen. Selecteer beide alleen als het echt voor beide past.', noPathway: 'Niet beschikbaar voor Gemini tot een RPL-traject is gekoppeld.',
  },
}

const missingLabels = {
  ar: { classification: 'التصنيف والرمز', title_translations: 'ترجمة الاسم', summary_translations: 'ترجمة الوصف', objective_translations: 'ترجمة الهدف', knowledge: 'المعرفة', skills: 'المهارات', professional_behaviours: 'السلوكيات المهنية', abilities: 'القدرات', performance_indicators: 'مؤشرات الأداء', outcomes: 'المخرجات', scientific_material: 'المادة العلمية', question_bank: 'بنك الأسئلة', passing_score: 'درجة النجاح', competency_mapping: 'ربط الكفاءات', rpl_pathway_mapping: 'تحديد مسار RPL' },
  en: { classification: 'Classification', title_translations: 'Title translations', summary_translations: 'Summary translations', objective_translations: 'Objective translations', knowledge: 'Knowledge', skills: 'Skills', professional_behaviours: 'Professional behaviours', abilities: 'Abilities', performance_indicators: 'Performance indicators', outcomes: 'Outcomes', scientific_material: 'Learning material', question_bank: 'Question bank', passing_score: 'Passing score', competency_mapping: 'Competency mapping', rpl_pathway_mapping: 'RPL pathway mapping' },
  nl: { classification: 'Classificatie', title_translations: 'Titelvertalingen', summary_translations: 'Samenvattingsvertalingen', objective_translations: 'Doelvertalingen', knowledge: 'Kennis', skills: 'Vaardigheden', professional_behaviours: 'Professioneel gedrag', abilities: 'Vermogens', performance_indicators: 'Prestatie-indicatoren', outcomes: 'Uitkomsten', scientific_material: 'Leermateriaal', question_bank: 'Vragenbank', passing_score: 'Slaagscore', competency_mapping: 'Competentiekoppeling', rpl_pathway_mapping: 'RPL-trajectkoppeling' },
}

const localizedFields = ['title', 'short_description', 'objective', 'knowledge', 'skills', 'professional_behaviours', 'abilities', 'performance_indicators', 'outcomes']

function statusLabel(status, copy) {
  return ({ draft: copy.draft, review: copy.review, ready: copy.readyStatus, published: copy.published, archived: copy.archived })[status] || status
}

function statusVariant(status) {
  return ({ draft: 'neutral', review: 'warning', ready: 'info', published: 'success', archived: 'danger' })[status] || 'neutral'
}

function buildForm(program) {
  return localizedFields.reduce((result, field) => ({ ...result, [field]: { en: program?.[field]?.en || '', ar: program?.[field]?.ar || '', nl: program?.[field]?.nl || '' } }), { content_status: program?.content_status || 'draft', rpl_pathway_ids: (program?.rpl_pathways || []).map((pathway) => Number(pathway.id)) })
}

function buildPayload(program, form) {
  const payload = {
    category_id: Number(program.program_category_id || program.category?.id),
    competency_gap_group_id: Number(program.competency_gap_group_id),
    professional_program_level_id: Number(program.professional_program_level_id),
    official_code: program.official_code,
    content_status: form.content_status,
    rpl_pathway_ids: form.rpl_pathway_ids,
    title: form.title,
    short_description: form.short_description,
    overview: program.overview || {},
    objective: form.objective,
    knowledge: form.knowledge,
    skills: form.skills,
    professional_behaviours: form.professional_behaviours,
    abilities: form.abilities,
    performance_indicators: form.performance_indicators,
    outcomes: form.outcomes,
    target_audience: program.target_audience || {}, entry_requirements: program.entry_requirements || {}, duration: program.duration || {},
    fees: Number(program.fees || 0), currency: program.currency || 'EUR', price_points: Number(program.price_points || 0),
    featured_image: program.featured_image || '', intro_video_url: program.intro_video_url || '', intro_text: program.intro_text || {},
    is_featured: Boolean(program.is_featured), is_active: Boolean(program.is_active), is_free: Boolean(program.is_free), application_required: Boolean(program.application_required),
    program_type: program.program_type || 'short_course', audience_type: program.audience_type || 'individual', seo: program.seo || {},
  }
  if (program.final_quiz_title) payload.final_quiz_title = program.final_quiz_title
  if (program.final_quiz_pass_percentage != null) payload.final_quiz_pass_percentage = Number(program.final_quiz_pass_percentage)
  if (program.final_quiz_duration_minutes != null) payload.final_quiz_duration_minutes = Number(program.final_quiz_duration_minutes)
  return payload
}

function Readiness({ readiness, copy, language }) {
  const percentage = readiness?.percentage || 0
  const missing = readiness?.missing || []
  return <div className="min-w-[220px] space-y-2">
    <div className="flex items-center justify-between text-sm"><b>{formatLocalizedNumber(percentage, language)}%</b><span className="text-[var(--color-text-muted)]">{formatLocalizedNumber(readiness?.completed_count || 0, language)} {copy.of} {formatLocalizedNumber(readiness?.total_count || 15, language)}</span></div>
    <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"><div className="h-full rounded-full bg-[var(--color-info,#1699d6)]" style={{ width: `${percentage}%` }} /></div>
    {missing.length ? <p className="line-clamp-2 text-xs text-[var(--color-text-muted)]">{copy.missing}: {formatLocalizedList(missing.slice(0, 3).map((item) => missingLabels[language]?.[item] || item), language)}{missing.length > 3 ? ` +${formatLocalizedNumber(missing.length - 3, language)}` : ''}</p> : <p className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 size={14} />{copy.complete}</p>}
  </div>
}

export default function CompetencyGapLibraryPage() {
  const language = getAdminLanguage(); const copy = copyByLanguage[language] || copyByLanguage.en; const navigate = useNavigate()
  const [state, setState] = useState({ loading: true, error: '', groups: [], programs: [], pathways: [] })
  const [filters, setFilters] = useState({ group: 'all', status: 'all', search: '' })
  const [editor, setEditor] = useState(null); const [form, setForm] = useState(null); const [editLanguage, setEditLanguage] = useState('ar')
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const [framework, programs, rplSource] = await Promise.all([fetchCompetencyFramework(), fetchCompetencyGapPrograms(), fetchRplSourceOfTruth()])
      setState({ loading: false, error: '', groups: (framework?.groups || []).filter((group) => group.is_active), programs: (Array.isArray(programs) ? programs : []).filter((program) => program.official_code), pathways: rplSource?.pathways || [] })
    } catch (error) { setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.loadError) })) }
  }, [copy.loadError])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => state.programs.filter((program) => {
    if (filters.group !== 'all' && String(program.competency_gap_group_id) !== filters.group) return false
    if (filters.status !== 'all' && program.content_status !== filters.status) return false
    const haystack = [program.official_code, ...Object.values(program.title || {})].join(' ').toLowerCase()
    return haystack.includes(filters.search.trim().toLowerCase())
  }), [filters, state.programs])

  const openEditor = (program) => { setEditor(program); setForm(buildForm(program)); setEditLanguage('ar'); setMessage('') }
  const updateLocalized = (field, value) => setForm((current) => ({ ...current, [field]: { ...current[field], [editLanguage]: value } }))
  const save = async () => {
    setSaving(true); setMessage('')
    try { await updateAdminProgram(editor.id, buildPayload(editor, form)); await load(); setEditor(null); setForm(null); setMessage(copy.saved) }
    catch (error) { setMessage(readApiError(error, copy.loadError)) }
    finally { setSaving(false) }
  }

  const stats = { groups: state.groups.length, programs: state.programs.length, drafts: state.programs.filter((p) => p.content_status === 'draft').length, ready: state.programs.filter((p) => p.catalog_readiness?.is_ready).length }

  return <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="space-y-8">
    <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} actions={<Button variant="outline" onClick={load} disabled={state.loading}><RefreshCw size={18} />{copy.refresh}</Button>} />
    <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-5 text-amber-900"><AlertTriangle className="mt-0.5 shrink-0" size={20} /><p>{copy.sourceNotice}</p></div>
    {message && !editor ? <div className="rounded-[var(--radius-lg)] border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{message}</div> : null}
    {state.error ? <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 p-5 text-red-700">{state.error}</div> : null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[[copy.groups, stats.groups],[copy.programs, stats.programs],[copy.drafts, stats.drafts],[copy.ready, stats.ready]].map(([label,value]) => <Card key={label}><CardContent className="p-6"><p className="text-sm font-semibold text-[var(--color-text-muted)]">{label}</p><p className="mt-2 text-4xl font-bold text-[var(--color-primary)]">{formatLocalizedNumber(value, language)}</p></CardContent></Card>)}</div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{state.groups.map((group) => { const count=state.programs.filter((p)=>p.competency_gap_group_id===group.id).length; return <button key={group.id} type="button" onClick={()=>setFilters((f)=>({...f,group:String(group.id)}))} className={`rounded-2xl border p-4 text-start transition ${filters.group===String(group.id)?'border-[var(--color-primary)] bg-[var(--color-primary)] text-white':'border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]'}`}><bdi className="text-xs font-bold tracking-wider">{group.code}</bdi><p className="mt-2 font-semibold">{pickText(group.name,language)}</p><p className={`mt-2 text-xs ${filters.group===String(group.id)?'text-white/75':'text-[var(--color-text-muted)]'}`}>{formatLocalizedNumber(count, language)} {copy.programs}</p></button>})}</div>
    <Card><CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_240px_240px]">
      <Input value={filters.search} onChange={(e)=>setFilters((f)=>({...f,search:e.target.value}))} placeholder={copy.search} leftIcon={<Search size={18} />} />
      <Select value={filters.group} onChange={(e)=>setFilters((f)=>({...f,group:e.target.value}))}><option value="all">{copy.allGroups}</option>{state.groups.map((group)=><option key={group.id} value={group.id}>{group.code} — {pickText(group.name,language)}</option>)}</Select>
      <Select value={filters.status} onChange={(e)=>setFilters((f)=>({...f,status:e.target.value}))}><option value="all">{copy.allStatuses}</option>{['draft','review','ready','published','archived'].map((status)=><option key={status} value={status}>{statusLabel(status,copy)}</option>)}</Select>
    </CardContent></Card>
    <Card><div className="overflow-x-auto"><table className="w-full min-w-[980px]"><thead className="bg-[var(--color-surface-muted)] text-start text-xs uppercase tracking-wider text-[var(--color-text-muted)]"><tr>{[copy.program,copy.level,copy.completeness,copy.status,copy.actions].map((h)=><th key={h} className="px-6 py-4 text-start">{h}</th>)}</tr></thead><tbody>{filtered.map((program)=><tr key={program.id} className="border-t border-[var(--color-border)]"><td className="px-6 py-5"><bdi className="font-mono text-xs font-bold text-[var(--color-primary)]">{program.official_code}</bdi><p className="mt-1 max-w-md font-semibold">{pickText(program.title,language)}</p></td><td className="px-6 py-5"><p>{pickText(program.professional_level?.name,language)}</p><p className="text-sm text-[var(--color-text-muted)]">{formatLocalizedNumber(program.accredited_hours, language)} {copy.hours}</p></td><td className="px-6 py-5"><Readiness readiness={program.catalog_readiness} copy={copy} language={language} /></td><td className="px-6 py-5"><Badge variant={statusVariant(program.content_status)}>{statusLabel(program.content_status,copy)}</Badge></td><td className="px-6 py-5"><Button size="sm" variant="outline" onClick={()=>openEditor(program)}><Edit3 size={16}/>{copy.edit}</Button></td></tr>)}{!filtered.length?<tr><td colSpan="5" className="p-10 text-center text-[var(--color-text-muted)]">{copy.noPrograms}</td></tr>:null}</tbody></table></div></Card>
    {editor && form ? <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/45" role="dialog" aria-modal="true"><div className="h-full w-full max-w-3xl overflow-y-auto bg-[var(--color-background)] shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--color-border)] bg-white p-6"><div><h2 className="text-2xl font-bold">{copy.editorTitle}</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">{copy.editorDescription}</p></div><Button size="icon" variant="ghost" onClick={()=>setEditor(null)} aria-label={copy.close}><X/></Button></div><div className="space-y-6 p-6">
      <Card><CardHeader><CardTitle>{copy.governedIdentity}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-[var(--color-text-muted)]">{copy.officialCode}</p><b>{editor.official_code}</b></div><div><p className="text-xs text-[var(--color-text-muted)]">{copy.group}</p><b>{editor.competency_gap_group?.code}</b></div><div><p className="text-xs text-[var(--color-text-muted)]">{copy.accreditedHours}</p><b>{editor.accredited_hours} {copy.hours}</b></div></CardContent></Card>
      <Card><CardContent className="space-y-5 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><b>{copy.language}</b><div className="flex rounded-xl bg-[var(--color-surface-muted)] p-1">{['ar','en','nl'].map((locale)=><button key={locale} type="button" onClick={()=>setEditLanguage(locale)} className={`rounded-lg px-4 py-2 text-sm font-bold uppercase ${editLanguage===locale?'bg-white shadow-sm':''}`}>{locale}</button>)}</div></div>{[['title',copy.titleField,1],['short_description',copy.summary,3],['objective',copy.objective,3],['knowledge',copy.knowledge,4],['skills',copy.skills,4],['professional_behaviours',copy.behaviours,4],['abilities',copy.abilities,4],['performance_indicators',copy.indicators,4],['outcomes',copy.outcomes,4]].map(([field,label,rows])=><div key={field}>{rows===1?<Input dir={editLanguage === 'ar' ? 'rtl' : 'ltr'} label={label} value={form[field][editLanguage]} onChange={(e)=>updateLocalized(field,e.target.value)} />:<Textarea dir={editLanguage === 'ar' ? 'rtl' : 'ltr'} label={label} rows={rows} value={form[field][editLanguage]} onChange={(e)=>updateLocalized(field,e.target.value)} />}</div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>{copy.rplPathways}</CardTitle><p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.rplPathwaysHint}</p></CardHeader><CardContent className="grid gap-3 p-6 pt-0 sm:grid-cols-2">{state.pathways.map((pathway)=><label key={pathway.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${form.rpl_pathway_ids.includes(Number(pathway.id))?'border-sky-400 bg-sky-50':'border-[var(--color-border)]'}`}><input type="checkbox" className="mt-1" checked={form.rpl_pathway_ids.includes(Number(pathway.id))} onChange={(event)=>setForm((current)=>({...current,rpl_pathway_ids:event.target.checked?[...current.rpl_pathway_ids,Number(pathway.id)]:current.rpl_pathway_ids.filter((id)=>id!==Number(pathway.id))}))}/><span><b>{pickText(pathway.name,language)}</b><small className="mt-1 block text-[var(--color-text-muted)]">{pathway.code}</small></span></label>)}{!form.rpl_pathway_ids.length?<p className="text-sm font-semibold text-amber-700 sm:col-span-2">{copy.noPathway}</p>:null}</CardContent></Card>
      <Card><CardContent className="space-y-4 p-6"><Select label={copy.contentStatus} value={form.content_status} onChange={(e)=>setForm((f)=>({...f,content_status:e.target.value}))}><option value="draft">{copy.draft}</option><option value="review">{copy.review}</option><option value="ready">{copy.readyStatus}</option><option value="published" disabled={!editor.catalog_readiness?.is_ready}>{copy.published}</option><option value="archived">{copy.archived}</option></Select><Readiness readiness={editor.catalog_readiness} copy={copy} language={language}/><div className="flex flex-wrap gap-3"><Button variant="outline" onClick={()=>navigate(`/sections?program_id=${editor.id}`)}><BookOpenCheck size={17}/>{copy.learningMaterial}</Button><Button variant="outline" onClick={()=>navigate(`/quizzes?program_id=${editor.id}`)}>{copy.questionBank}</Button></div></CardContent></Card>
      {message?<div className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm">{message}</div>:null}<div className="flex justify-end gap-3"><Button variant="outline" onClick={()=>setEditor(null)}>{copy.close}</Button><Button onClick={save} disabled={saving}>{saving?copy.saving:copy.save}</Button></div>
    </div></div></div>:null}
  </div>
}
