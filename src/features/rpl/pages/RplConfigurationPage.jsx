import { useCallback, useEffect, useState } from 'react'
import { BookOpenCheck, Check, FileCog, Gavel, Layers3, LoaderCircle, Pencil, Plus, Save, Settings2, ShieldCheck, Trash2, X } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, DataTableShell, Input, PageHeader, Select, Textarea } from '../../../components/ui'
import { readApiError, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { fetchUsers } from '../../users/services/usersService'
import { APPLICATION_STATUS, EVIDENCE_EXTENSIONS, localize } from '../domain/rpl'
import {
  createRplConfiguration,
  deleteRplConfiguration,
  fetchRplConfiguration,
  fetchRplReferenceData,
  fetchRplSettings,
  updateRplConfiguration,
  updateRplSettings,
} from '../services/rplService'
import RplPageState from '../components/RplPageState'
import RplStatusBadge from '../components/RplStatusBadge'
import { useModalDialog } from '../../../hooks/useModalDialog'

const tabs = [
  { key: 'pathways', resource: 'pathways', icon: Layers3 },
  { key: 'levels', resource: 'levels', icon: ShieldCheck },
  { key: 'standards', resource: 'standards', icon: BookOpenCheck },
  { key: 'competencies', resource: 'competencies', icon: BookOpenCheck },
  { key: 'categories', resource: 'evidence-categories', icon: FileCog },
  { key: 'rubrics', resource: 'rubrics', icon: Check },
  { key: 'declarations', resource: 'declarations', icon: FileCog, immutable: true },
  { key: 'outcomes', resource: 'outcomes', icon: Check, immutable: true },
  { key: 'actions', resource: 'committee-actions', icon: Gavel, immutable: true },
  { key: 'fees', resource: 'fee-schedules', icon: Settings2 },
  { key: 'committees', resource: 'committees', icon: Gavel },
  { key: 'workflow', settings: true, icon: Settings2 },
]

const copyByLanguage = {
  ar: {
    title: 'إعدادات ومعايير RPL', description: 'إدارة مرجعيات محرك RPL التشغيلية بنماذج مطابقة للواجهات البرمجية.',
    pathways: 'المسارات', levels: 'المستويات', standards: 'المعايير', competencies: 'الكفاءات', categories: 'فئات الأدلة', rubrics: 'نماذج التقييم', declarations: 'الإقرارات', outcomes: 'النتائج', actions: 'إجراءات اللجنة', fees: 'الرسوم', committees: 'اللجان', workflow: 'الضوابط',
    add: 'إضافة سجل', edit: 'تعديل', delete: 'حذف', save: 'حفظ', cancel: 'إلغاء', active: 'فعال', inactive: 'غير فعال', code: 'الرمز', name: 'الاسم', descriptionField: 'الوصف', status: 'الحالة', actionsLabel: 'الإجراءات', empty: 'لا توجد سجلات.',
    pathway: 'المسار', standard: 'المعيار', level: 'المستوى', slug: 'المعرف', rank: 'الرتبة', version: 'النسخة', order: 'الترتيب', behavior: 'السلوك', quorum: 'النصاب', amount: 'المبلغ', currency: 'العملة', effectiveFrom: 'ساري من', effectiveUntil: 'ساري حتى',
    examples: 'أمثلة، كل مثال في سطر', extensions: 'الامتدادات', maxSize: 'الحد الأقصى (MB)', minimum: 'الحد الأدنى', maximum: 'الحد الأقصى', files: 'يقبل ملفات', urls: 'يقبل روابط', requiredDefault: 'مطلوب افتراضيًا',
    criteria: 'معايير النموذج', addCriterion: 'إضافة معيار تقييم', competency: 'الكفاءة', maximumScore: 'النقطة القصوى', passScore: 'نقطة النجاح', required: 'إلزامي', evidenceCategories: 'فئات الأدلة للمعيار', members: 'أعضاء اللجنة', addMember: 'إضافة عضو', member: 'العضو', role: 'الدور',
    draft: 'مسودة', published: 'منشور', retired: 'متقاعد', chair: 'رئيس اللجنة', committeeMember: 'عضو', secretary: 'أمين السر', requiresGapPlan: 'يتطلب خطة لسد الفجوات', credentialEligible: 'مؤهل لإصدار اعتماد',
    achievedBehavior: 'متحقق', developmentRequired: 'يتطلب برنامج تطوير', limitedCompletion: 'يتطلب استكمالًا محدودًا', notAchievedBehavior: 'غير متحقق', approveBehavior: 'موافقة', conditionalBehavior: 'موافقة مشروطة', remediationBehavior: 'استكمال مطلوب', rejectBehavior: 'رفض', reassignBehavior: 'إعادة إسناد',
    saved: 'تم حفظ الإعداد.', deleted: 'تم حذف السجل.', confirmDelete: 'تأكيد الحذف', confirmText: 'سيتم حذف هذا السجل إذا لم يكن مرتبطًا ببيانات تشغيلية.', deactivateHint: 'يحمي النظام السجلات التاريخية؛ قم بتعطيلها بدلًا من حذفها.',
    workflowTitle: 'ضوابط محرك RPL', workflowHint: 'حالة الطلب مستقلة عن حالة الدليل وقرار اللجنة.', appealDays: 'مدة التظلم (يوم)', requireVerified: 'اشتراط دليل متحقق للتقييم', saveSettings: 'حفظ الضوابط', fixedUploadPolicy: 'سياسة الرفع التشغيلية ثابتة', fixedUploadPolicyHint: '50 MiB لكل ملف. الصيغ: PDF، JPG، JPEG، PNG، DOCX، XLSX، PPTX، MP4، MP3. هذه الحدود مطبقة في واجهة CMS وواجهة Laravel.',
    geminiTitle: 'مساعد Gemini لتقييم RPL', geminiHint: 'اختياري وتحت سيطرة المدير فقط. يستقبل نموذج التقييم وبيانات الأدلة دون الملفات الخام؛ ولا يستطيع التحقق من الأدلة أو اعتماد النتيجة أو إصدار قرار اللجنة.', geminiEnable: 'تفعيل مساعد Gemini', geminiModel: 'نموذج Gemini', geminiPrompt: 'Prompt التقييم الاستشاري', geminiGovernance: 'يُحفظ الـPrompt ومصدر الحقيقة والمدخلات والمخرجات مع كل مسودة. راجعه ضمن حوكمة RPL قبل التفعيل.',
  },
  en: {
    title: 'RPL Standards & Configuration', description: 'Manage every operational RPL reference with forms that match the backend contract.',
    pathways: 'Pathways', levels: 'Levels', standards: 'Standards', competencies: 'Competencies', categories: 'Evidence categories', rubrics: 'Rubrics', declarations: 'Declarations', outcomes: 'Outcomes', actions: 'Committee actions', fees: 'Fee schedules', committees: 'Committees', workflow: 'Controls',
    add: 'Add record', edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel', active: 'Active', inactive: 'Inactive', code: 'System code', name: 'Name', descriptionField: 'Description', status: 'Status', actionsLabel: 'Actions', empty: 'No records have been configured.',
    pathway: 'Pathway', standard: 'Standard', level: 'Level', slug: 'Slug', rank: 'Rank', version: 'Version', order: 'Sort order', behavior: 'Behaviour', quorum: 'Quorum', amount: 'Amount', currency: 'Currency', effectiveFrom: 'Effective from', effectiveUntil: 'Effective until',
    examples: 'Examples, one per line', extensions: 'Allowed extensions', maxSize: 'Maximum size (MB)', minimum: 'Minimum items', maximum: 'Maximum items', files: 'Accept files', urls: 'Accept URLs', requiredDefault: 'Required by default',
    criteria: 'Rubric criteria', addCriterion: 'Add criterion', competency: 'Competency', maximumScore: 'Maximum score', passScore: 'Pass score', required: 'Required', evidenceCategories: 'Standard evidence categories', members: 'Committee members', addMember: 'Add member', member: 'Member', role: 'Role',
    draft: 'Draft', published: 'Published', retired: 'Retired', chair: 'Chair', committeeMember: 'Member', secretary: 'Secretary', requiresGapPlan: 'Requires a competency-gap plan', credentialEligible: 'Eligible for credential issuance',
    achievedBehavior: 'Achieved', developmentRequired: 'Development programme required', limitedCompletion: 'Limited completion required', notAchievedBehavior: 'Not achieved', approveBehavior: 'Approve', conditionalBehavior: 'Conditional approval', remediationBehavior: 'Remediation required', rejectBehavior: 'Reject', reassignBehavior: 'Reassign',
    saved: 'Configuration saved.', deleted: 'Record deleted.', confirmDelete: 'Confirm deletion', confirmText: 'This record will be deleted if it is not referenced by operational data.', deactivateHint: 'Historical definitions are protected; deactivate them instead of deleting them.',
    workflowTitle: 'RPL engine controls', workflowHint: 'Application workflow remains separate from evidence state and committee authority.', appealDays: 'Appeal window (days)', requireVerified: 'Require verified evidence for assessment', saveSettings: 'Save controls', fixedUploadPolicy: 'Runtime upload policy is fixed', fixedUploadPolicyHint: '50 MiB per file. Formats: PDF, JPG, JPEG, PNG, DOCX, XLSX, PPTX, MP4, and MP3. These limits are enforced by both the CMS and Laravel endpoint.',
    geminiTitle: 'Gemini RPL evaluation assistant', geminiHint: 'Optional and administrator-controlled only. It receives the rubric and evidence metadata, never raw uploads; it cannot verify evidence, adopt an outcome, or make a committee decision.', geminiEnable: 'Enable Gemini assistant', geminiModel: 'Gemini model', geminiPrompt: 'Advisory evaluation prompt', geminiGovernance: 'The prompt, source of truth, input, and output are snapshotted with every draft. Review them through RPL governance before enabling the feature.',
  },
  nl: {
    title: 'RPL-normen & Configuratie', description: 'Beheer alle operationele RPL-referenties met contractconforme formulieren.',
    pathways: 'Trajecten', levels: 'Niveaus', standards: 'Normen', competencies: 'Competenties', categories: 'Bewijscategorieën', rubrics: 'Rubrics', declarations: 'Verklaringen', outcomes: 'Uitkomsten', actions: 'Commissieacties', fees: 'Tarieven', committees: 'Commissies', workflow: 'Regels',
    add: 'Record toevoegen', edit: 'Bewerken', delete: 'Verwijderen', save: 'Opslaan', cancel: 'Annuleren', active: 'Actief', inactive: 'Inactief', code: 'Systeemcode', name: 'Naam', descriptionField: 'Beschrijving', status: 'Status', actionsLabel: 'Acties', empty: 'Geen records ingesteld.',
    pathway: 'Traject', standard: 'Norm', level: 'Niveau', slug: 'Slug', rank: 'Rang', version: 'Versie', order: 'Volgorde', behavior: 'Gedrag', quorum: 'Quorum', amount: 'Bedrag', currency: 'Valuta', effectiveFrom: 'Geldig vanaf', effectiveUntil: 'Geldig tot',
    examples: 'Voorbeelden, één per regel', extensions: 'Toegestane extensies', maxSize: 'Maximale grootte (MB)', minimum: 'Minimum', maximum: 'Maximum', files: 'Bestanden toestaan', urls: 'Links toestaan', requiredDefault: 'Standaard verplicht',
    criteria: 'Rubriccriteria', addCriterion: 'Criterium toevoegen', competency: 'Competentie', maximumScore: 'Maximumscore', passScore: 'Slaagscore', required: 'Verplicht', evidenceCategories: 'Bewijscategorieën norm', members: 'Commissieleden', addMember: 'Lid toevoegen', member: 'Lid', role: 'Rol',
    draft: 'Concept', published: 'Gepubliceerd', retired: 'Buiten gebruik', chair: 'Voorzitter', committeeMember: 'Lid', secretary: 'Secretaris', requiresGapPlan: 'Vereist een plan voor competentiehiaten', credentialEligible: 'Geschikt voor afgifte van een kwalificatie',
    achievedBehavior: 'Behaald', developmentRequired: 'Ontwikkelprogramma vereist', limitedCompletion: 'Beperkte aanvulling vereist', notAchievedBehavior: 'Niet behaald', approveBehavior: 'Goedkeuren', conditionalBehavior: 'Voorwaardelijk goedkeuren', remediationBehavior: 'Aanvulling vereist', rejectBehavior: 'Afwijzen', reassignBehavior: 'Opnieuw toewijzen',
    saved: 'Configuratie opgeslagen.', deleted: 'Record verwijderd.', confirmDelete: 'Verwijderen bevestigen', confirmText: 'Dit record wordt verwijderd als het niet in gebruik is.', deactivateHint: 'Historische definities zijn beschermd; deactiveer ze in plaats van te verwijderen.',
    workflowTitle: 'RPL-regels', workflowHint: 'Aanvraagstatus staat los van bewijsstatus en commissiebevoegdheid.', appealDays: 'Bezwaarperiode (dagen)', requireVerified: 'Geverifieerd bewijs vereist', saveSettings: 'Regels opslaan', fixedUploadPolicy: 'Het runtime-uploadbeleid staat vast', fixedUploadPolicyHint: '50 MiB per bestand. Formaten: PDF, JPG, JPEG, PNG, DOCX, XLSX, PPTX, MP4 en MP3. Deze limieten worden afgedwongen door het CMS en het Laravel-endpoint.',
    geminiTitle: 'Gemini-assistent voor RPL-beoordeling', geminiHint: 'Optioneel en uitsluitend onder beheer van een beheerder. Ontvangt rubric- en bewijsmetadata, nooit ruwe uploads; kan geen bewijs verifiëren, uitkomst vaststellen of commissiebesluit nemen.', geminiEnable: 'Gemini-assistent inschakelen', geminiModel: 'Gemini-model', geminiPrompt: 'Prompt voor adviserend concept', geminiGovernance: 'Prompt, bron van waarheid, invoer en uitvoer worden bij elk concept vastgelegd. Laat deze vóór activering via RPL-governance beoordelen.',
  },
}

const localized = () => ({ en: '', ar: '', nl: '' })

function emptyForm(resource) {
  return {
    id: null, code: '', slug: '', name: localized(), description: localized(), content: localized(), examples: { en: [], ar: [], nl: [] },
    rpl_pathway_id: '', rpl_standard_id: '', rpl_level_id: '', parent_id: '', rank: 1, version: 1, sort_order: 0,
    status: 'draft', behavior: resource === 'outcomes' ? 'achieved' : 'approve', is_active: true,
    accepts_files: true, accepts_urls: false, is_required_by_default: false, accepted_extensions: [...EVIDENCE_EXTENSIONS], max_size_kb: 51200, minimum_items: 1, maximum_items: '',
    requires_gap_plan: false, is_credential_eligible: false, amount: '', currency: 'USD', effective_from: '', effective_until: '', quorum: 1,
    evidence_categories: [], criteria: [], members: [],
  }
}

function formFrom(resource, row) {
  const base = emptyForm(resource)
  return {
    ...base, ...row,
    name: typeof row.name === 'object' ? row.name : { ...localized(), en: row.name || '' },
    description: typeof row.description === 'object' ? row.description : { ...localized(), en: row.description || '' },
    content: typeof row.content === 'object' ? row.content : { ...localized(), en: row.content || '' },
    examples: typeof row.examples === 'object' ? row.examples : base.examples,
    evidence_categories: (row.evidence_categories || row.evidenceCategories || []).map((item) => ({ category_id: item.pivot?.rpl_evidence_category_id || item.id || item.category_id, is_required: item.pivot?.is_required ?? true, minimum_items: item.pivot?.minimum_items ?? 1, maximum_items: item.pivot?.maximum_items ?? null })),
    criteria: (row.criteria || []).map((item) => ({ competency_id: item.rpl_competency_id || item.competency_id, code: item.code, title: item.title || localized(), description: item.description || localized(), maximum_score: item.maximum_score ?? '', pass_score: item.pass_score ?? '', is_required: item.is_required !== false, sort_order: item.sort_order || 0 })),
    members: (row.members || []).map((item) => ({ user_id: item.user_id, role: item.role || 'member', is_active: item.is_active !== false })),
  }
}

function numeric(value) { return value === '' || value == null ? null : Number(value) }
function cleanDate(value) { return value || null }
function behaviorLabel(value, copy) {
  return {
    achieved: copy.achievedBehavior,
    development_required: copy.developmentRequired,
    limited_completion: copy.limitedCompletion,
    not_achieved: copy.notAchievedBehavior,
    approve: copy.approveBehavior,
    conditional: copy.conditionalBehavior,
    remediation: copy.remediationBehavior,
    reject: copy.rejectBehavior,
    reassign: copy.reassignBehavior,
  }[value] || value
}

function payloadFor(resource, form) {
  const named = { code: form.code, name: form.name, description: form.description, is_active: form.is_active }
  switch (resource) {
    case 'pathways': return { ...named, slug: form.slug, sort_order: Number(form.sort_order || 0) }
    case 'levels': return { ...named, rpl_pathway_id: Number(form.rpl_pathway_id), rank: Number(form.rank) }
    case 'standards': return { ...named, rpl_pathway_id: Number(form.rpl_pathway_id), version: Number(form.version), status: form.status, effective_from: cleanDate(form.effective_from), effective_until: cleanDate(form.effective_until), evidence_categories: form.evidence_categories }
    case 'competencies': return { ...named, rpl_standard_id: Number(form.rpl_standard_id), parent_id: numeric(form.parent_id), sort_order: Number(form.sort_order || 0) }
    case 'evidence-categories': return { ...named, examples: form.examples, accepts_files: form.accepts_files, accepts_urls: form.accepts_urls, is_required_by_default: form.is_required_by_default, minimum_items: Number(form.minimum_items || 0), maximum_items: numeric(form.maximum_items), sort_order: Number(form.sort_order || 0) }
    case 'rubrics': return { ...named, rpl_standard_id: Number(form.rpl_standard_id), rpl_level_id: numeric(form.rpl_level_id), version: Number(form.version), status: form.status, criteria: form.criteria.map((item, index) => ({ ...item, competency_id: Number(item.competency_id), maximum_score: numeric(item.maximum_score), pass_score: numeric(item.pass_score), sort_order: index })) }
    case 'declarations': return { code: form.code || 'applicant_declaration', content: form.content, version: Number(form.version), is_active: form.is_active, effective_from: cleanDate(form.effective_from) }
    case 'outcomes': return { ...named, behavior: form.behavior, requires_gap_plan: form.requires_gap_plan, is_credential_eligible: form.is_credential_eligible, sort_order: Number(form.sort_order || 0) }
    case 'committee-actions': return { ...named, behavior: form.behavior, sort_order: Number(form.sort_order || 0) }
    case 'fee-schedules': return { rpl_pathway_id: Number(form.rpl_pathway_id), rpl_level_id: numeric(form.rpl_level_id), amount: Number(form.amount), currency: form.currency.toUpperCase(), is_active: form.is_active, effective_from: cleanDate(form.effective_from), effective_until: cleanDate(form.effective_until) }
    case 'committees': return { ...named, quorum: Number(form.quorum), members: form.members.map((item) => ({ ...item, user_id: Number(item.user_id) })) }
    default: return form
  }
}

export default function RplConfigurationPage() {
  const language = getAdminLanguage()
  const copy = copyByLanguage[language] || copyByLanguage.en
  const isArabic = language === 'ar'
  const [activeTab, setActiveTab] = useState('pathways')
  const tab = tabs.find((item) => item.key === activeTab) || tabs[0]
  const [state, setState] = useState({ loading: true, error: '', rows: [], reference: {}, users: [] })
  const [settings, setSettings] = useState({ appeal_window_days: 15, require_verified_evidence_for_assessment: true, gemini_advisory_enabled: false, gemini_advisory_model: 'gemini-3.5-flash', gemini_advisory_prompt: '' })
  const [form, setForm] = useState(() => emptyForm(tab.resource))
  const [formOpen, setFormOpen] = useState(false)
  const [formLanguage, setFormLanguage] = useState(language === 'ar' || language === 'nl' ? language : 'en')
  const [action, setAction] = useState({ busy: false, error: '', success: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const deleteDialogRef = useModalDialog(Boolean(deleteTarget), () => setDeleteTarget(null))

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      if (tab.settings) {
        const raw = unwrapApiData(await fetchRplSettings()) || {}
        setSettings({
          appeal_window_days: Number(raw.appeal_window_days || 15),
          require_verified_evidence_for_assessment: raw.require_verified_evidence_for_assessment !== false,
          gemini_advisory_enabled: raw.gemini_advisory_enabled === true,
          gemini_advisory_model: raw.gemini_advisory_model || 'gemini-3.5-flash',
          gemini_advisory_prompt: raw.gemini_advisory_prompt || '',
        })
        setState({ loading: false, error: '', rows: [], reference: {}, users: [] })
        return
      }
      const [records, referenceResponse, usersResponse] = await Promise.all([
        fetchRplConfiguration(tab.resource),
        fetchRplReferenceData(),
        tab.resource === 'committees' ? fetchUsers({ per_page: 100 }) : Promise.resolve([]),
      ])
      setState({ loading: false, error: '', rows: unwrapCollection(records), reference: unwrapApiData(referenceResponse) || {}, users: unwrapCollection(usersResponse) })
    } catch (error) { setState((current) => ({ ...current, loading: false, error: readApiError(error) })) }
  }, [tab.resource, tab.settings])

  useEffect(() => { load() }, [load])

  const pathways = unwrapCollection(state.reference.pathways || [])
  const levels = pathways.flatMap((pathway) => pathway.levels || [])
  const standards = pathways.flatMap((pathway) => pathway.standards || [])
  const competencies = standards.flatMap((standard) => standard.competencies || [])
  const evidenceCategories = unwrapCollection(state.reference.evidence_categories || [])

  function changeTab(key) {
    const next = tabs.find((item) => item.key === key)
    setActiveTab(key); setForm(emptyForm(next?.resource)); setFormOpen(false); setAction({ busy: false, error: '', success: '' })
  }

  function updateLocalized(field, value) {
    setForm((current) => ({ ...current, [field]: { ...current[field], [formLanguage]: value } }))
  }

  function openForm(row = null) {
    setForm(row ? formFrom(tab.resource, row) : emptyForm(tab.resource)); setFormOpen(true); setAction({ busy: false, error: '', success: '' })
  }

  function isValid() {
    if (tab.resource === 'fee-schedules') return form.rpl_pathway_id && Number(form.amount) >= 0 && form.currency.length === 3
    if (tab.resource === 'declarations') return form.content.en && form.content.ar && Number(form.version) >= 1
    if (!form.code || !form.name.en || !form.name.ar) return false
    if (tab.resource === 'pathways') return Boolean(form.slug)
    if (tab.resource === 'levels') return Boolean(form.rpl_pathway_id && Number(form.rank) >= 1)
    if (tab.resource === 'standards') return Boolean(form.rpl_pathway_id && Number(form.version) >= 1)
    if (tab.resource === 'competencies') return Boolean(form.rpl_standard_id)
    if (tab.resource === 'rubrics') return Boolean(form.rpl_standard_id) && form.criteria.every((item) => item.competency_id && item.code && item.title?.en && item.title?.ar)
    if (tab.resource === 'committees') return Number(form.quorum) >= 1 && form.members.every((item) => item.user_id)
    return true
  }

  async function saveRecord() {
    setAction({ busy: true, error: '', success: '' })
    try {
      const payload = payloadFor(tab.resource, form)
      if (form.id) await updateRplConfiguration(tab.resource, form.id, payload)
      else await createRplConfiguration(tab.resource, payload)
      setFormOpen(false); setForm(emptyForm(tab.resource)); setAction({ busy: false, error: '', success: copy.saved }); await load()
    } catch (error) { setAction({ busy: false, error: readApiError(error), success: '' }) }
  }

  async function removeRecord() {
    if (!deleteTarget) return
    setAction({ busy: true, error: '', success: '' })
    try { await deleteRplConfiguration(tab.resource, deleteTarget.id); setDeleteTarget(null); setAction({ busy: false, error: '', success: copy.deleted }); await load() } catch (error) { setDeleteTarget(null); setAction({ busy: false, error: readApiError(error), success: '' }) }
  }

  async function saveSettings() {
    setAction({ busy: true, error: '', success: '' })
    try {
      await updateRplSettings({
        appeal_window_days: Number(settings.appeal_window_days),
        require_verified_evidence_for_assessment: Boolean(settings.require_verified_evidence_for_assessment),
        gemini_advisory_enabled: Boolean(settings.gemini_advisory_enabled),
        gemini_advisory_model: settings.gemini_advisory_model.trim(),
        gemini_advisory_prompt: settings.gemini_advisory_prompt.trim(),
      })
      setAction({ busy: false, error: '', success: copy.saved })
    } catch (error) { setAction({ busy: false, error: readApiError(error), success: '' }) }
  }

  const columns = [
    { key: 'code', label: copy.code, render: (row) => <code className="rounded-lg bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-semibold">{row.code || row.currency || `#${row.id}`}</code> },
    { key: 'name', label: copy.name, render: (row) => <div><span className="font-bold">{localize(row.name || row.content, language) || (row.amount != null ? `${row.amount} ${row.currency}` : '—')}</span><p className="mt-1 max-w-lg text-xs leading-5 text-[var(--color-text-muted)]">{localize(row.description, language)}</p></div> },
    { key: 'status', label: copy.status, render: (row) => row.status ? <Badge variant={row.status === 'published' ? 'success' : 'neutral'}>{row.status}</Badge> : <Badge variant={row.is_active !== false ? 'success' : 'neutral'}>{row.is_active !== false ? copy.active : copy.inactive}</Badge> },
    { key: 'actions', label: copy.actionsLabel, render: (row) => <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openForm(row)}><Pencil size={15} />{copy.edit}</Button>{!tab.immutable ? <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(row)}><Trash2 size={15} /><span className="sr-only">{copy.delete}</span></Button> : null}</div> },
  ]

  function relationFields() {
    return <>
      {['levels', 'standards', 'fees'].includes(activeTab) ? <Select label={copy.pathway} value={form.rpl_pathway_id} onChange={(event) => setForm((current) => ({ ...current, rpl_pathway_id: event.target.value, rpl_level_id: '' }))}><option value="">—</option>{pathways.map((item) => <option key={item.id} value={item.id}>{localize(item.name, language)}</option>)}</Select> : null}
      {['competencies', 'rubrics'].includes(activeTab) ? <Select label={copy.standard} value={form.rpl_standard_id} onChange={(event) => setForm((current) => ({ ...current, rpl_standard_id: event.target.value }))}><option value="">—</option>{standards.map((item) => <option key={item.id} value={item.id}>{localize(item.name, language)} · v{item.version}</option>)}</Select> : null}
      {['rubrics', 'fees'].includes(activeTab) ? <Select label={copy.level} value={form.rpl_level_id} onChange={(event) => setForm((current) => ({ ...current, rpl_level_id: event.target.value }))}><option value="">—</option>{levels.filter((item) => !form.rpl_pathway_id || Number(item.rpl_pathway_id) === Number(form.rpl_pathway_id)).map((item) => <option key={item.id} value={item.id}>{localize(item.name, language)}</option>)}</Select> : null}
    </>
  }

  function resourceFields() {
    if (activeTab === 'pathways') return <><Input label={copy.slug} value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} /><Input type="number" min="0" label={copy.order} value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))} /></>
    if (activeTab === 'levels') return <Input type="number" min="1" label={copy.rank} value={form.rank} onChange={(event) => setForm((current) => ({ ...current, rank: event.target.value }))} />
    if (activeTab === 'standards' || activeTab === 'rubrics') return <><Input type="number" min="1" label={copy.version} value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} /><Select label={copy.status} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="draft">{copy.draft}</option><option value="published">{copy.published}</option><option value="retired">{copy.retired}</option></Select></>
    if (activeTab === 'categories') return <><Textarea dir={formLanguage === 'ar' ? 'rtl' : 'ltr'} rows={4} label={copy.examples} value={(form.examples?.[formLanguage] || []).join('\n')} onChange={(event) => setForm((current) => ({ ...current, examples: { ...current.examples, [formLanguage]: event.target.value.split('\n').filter(Boolean) } }))} /><div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900 lg:col-span-2"><strong className="block">{copy.fixedUploadPolicy}</strong>{copy.fixedUploadPolicyHint}</div><Input type="number" min="0" label={copy.minimum} value={form.minimum_items} onChange={(event) => setForm((current) => ({ ...current, minimum_items: event.target.value }))} /><Input type="number" min="1" label={copy.maximum} value={form.maximum_items} onChange={(event) => setForm((current) => ({ ...current, maximum_items: event.target.value }))} /></>
    if (activeTab === 'declarations') return <><Input type="number" min="1" label={copy.version} value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} /><Input type="date" label={copy.effectiveFrom} value={form.effective_from || ''} onChange={(event) => setForm((current) => ({ ...current, effective_from: event.target.value }))} /></>
    if (activeTab === 'outcomes' || activeTab === 'actions') return <Select label={copy.behavior} value={form.behavior} onChange={(event) => setForm((current) => ({ ...current, behavior: event.target.value }))}>{(activeTab === 'outcomes' ? ['achieved', 'development_required', 'limited_completion', 'not_achieved'] : ['approve', 'conditional', 'remediation', 'reject', 'reassign']).map((value) => <option key={value} value={value}>{behaviorLabel(value, copy)}</option>)}</Select>
    if (activeTab === 'fees') return <><Input type="number" min="0" step="0.01" label={copy.amount} value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} /><Input maxLength="3" label={copy.currency} value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} /><Input type="date" label={copy.effectiveFrom} value={form.effective_from || ''} onChange={(event) => setForm((current) => ({ ...current, effective_from: event.target.value }))} /><Input type="date" label={copy.effectiveUntil} value={form.effective_until || ''} onChange={(event) => setForm((current) => ({ ...current, effective_until: event.target.value }))} /></>
    if (activeTab === 'committees') return <Input type="number" min="1" label={copy.quorum} value={form.quorum} onChange={(event) => setForm((current) => ({ ...current, quorum: event.target.value }))} />
    return <Input type="number" min="0" label={copy.order} value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))} />
  }

  function nestedFields() {
    if (activeTab === 'standards') return <fieldset><legend className="mb-3 font-bold">{copy.evidenceCategories}</legend><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{evidenceCategories.map((category) => { const selected = form.evidence_categories.some((item) => Number(item.category_id) === Number(category.id)); return <label key={category.id} className="flex cursor-pointer gap-2 rounded-xl border border-[var(--color-border)] p-3 text-sm"><input type="checkbox" checked={selected} onChange={() => setForm((current) => ({ ...current, evidence_categories: selected ? current.evidence_categories.filter((item) => Number(item.category_id) !== Number(category.id)) : [...current.evidence_categories, { category_id: category.id, is_required: true, minimum_items: category.minimum_items || 1, maximum_items: category.maximum_items || null }] }))} /><span>{localize(category.name, language)}</span></label> })}</div></fieldset>
    if (activeTab === 'rubrics') return <fieldset><div className="mb-3 flex items-center justify-between gap-3"><legend className="font-bold">{copy.criteria}</legend><Button size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, criteria: [...current.criteria, { competency_id: '', code: '', title: localized(), description: localized(), maximum_score: 100, pass_score: 60, is_required: true, sort_order: current.criteria.length }] }))}><Plus size={15} />{copy.addCriterion}</Button></div><div className="space-y-3">{form.criteria.map((item, index) => <div key={`${item.code}-${index}`} className="grid gap-3 rounded-xl border border-[var(--color-border)] p-4 lg:grid-cols-2"><Select label={copy.competency} value={item.competency_id} onChange={(event) => setForm((current) => ({ ...current, criteria: current.criteria.map((row, rowIndex) => rowIndex === index ? { ...row, competency_id: event.target.value } : row) }))}><option value="">—</option>{competencies.filter((competency) => !form.rpl_standard_id || Number(competency.rpl_standard_id) === Number(form.rpl_standard_id)).map((competency) => <option key={competency.id} value={competency.id}>{localize(competency.name, language)}</option>)}</Select><Input label={copy.code} value={item.code} onChange={(event) => setForm((current) => ({ ...current, criteria: current.criteria.map((row, rowIndex) => rowIndex === index ? { ...row, code: event.target.value } : row) }))} /><Input label={copy.name} value={item.title?.[formLanguage] || ''} onChange={(event) => setForm((current) => ({ ...current, criteria: current.criteria.map((row, rowIndex) => rowIndex === index ? { ...row, title: { ...row.title, [formLanguage]: event.target.value } } : row) }))} /><div className="grid grid-cols-2 gap-3"><Input type="number" label={copy.maximumScore} value={item.maximum_score} onChange={(event) => setForm((current) => ({ ...current, criteria: current.criteria.map((row, rowIndex) => rowIndex === index ? { ...row, maximum_score: event.target.value } : row) }))} /><Input type="number" label={copy.passScore} value={item.pass_score} onChange={(event) => setForm((current) => ({ ...current, criteria: current.criteria.map((row, rowIndex) => rowIndex === index ? { ...row, pass_score: event.target.value } : row) }))} /></div><div className="flex items-center justify-between lg:col-span-2"><label className="flex items-center gap-2"><input type="checkbox" checked={item.is_required} onChange={(event) => setForm((current) => ({ ...current, criteria: current.criteria.map((row, rowIndex) => rowIndex === index ? { ...row, is_required: event.target.checked } : row) }))} />{copy.required}</label><Button size="sm" variant="ghost" onClick={() => setForm((current) => ({ ...current, criteria: current.criteria.filter((_, rowIndex) => rowIndex !== index) }))}><Trash2 size={15} />{copy.delete}</Button></div></div>)}</div></fieldset>
    if (activeTab === 'committees') return <fieldset><div className="mb-3 flex items-center justify-between gap-3"><legend className="font-bold">{copy.members}</legend><Button size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, members: [...current.members, { user_id: '', role: 'member', is_active: true }] }))}><Plus size={15} />{copy.addMember}</Button></div><div className="space-y-3">{form.members.map((item, index) => <div key={index} className="grid gap-3 rounded-xl border border-[var(--color-border)] p-4 sm:grid-cols-[minmax(0,1fr)_180px_auto]"><Select label={copy.member} value={item.user_id} onChange={(event) => setForm((current) => ({ ...current, members: current.members.map((row, rowIndex) => rowIndex === index ? { ...row, user_id: event.target.value } : row) }))}><option value="">—</option>{state.users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</Select><Select label={copy.role} value={item.role} onChange={(event) => setForm((current) => ({ ...current, members: current.members.map((row, rowIndex) => rowIndex === index ? { ...row, role: event.target.value } : row) }))}><option value="chair">{copy.chair}</option><option value="member">{copy.committeeMember}</option><option value="secretary">{copy.secretary}</option></Select><Button className="self-end" size="sm" variant="ghost" onClick={() => setForm((current) => ({ ...current, members: current.members.filter((_, rowIndex) => rowIndex !== index) }))}><Trash2 size={15} /></Button></div>)}</div></fieldset>
    return null
  }

  function renderForm() {
    const contentField = activeTab === 'declarations' ? 'content' : 'name'
    return <Card><CardHeader className="border-b border-[var(--color-border)]"><div className="flex items-center justify-between gap-3"><CardTitle>{form.id ? copy.edit : copy.add}</CardTitle><Button size="sm" variant="ghost" onClick={() => setFormOpen(false)} aria-label={copy.cancel}><X size={17} /></Button></div></CardHeader><CardContent className="space-y-5 pt-6"><div className="flex gap-2">{['en', 'ar', 'nl'].map((locale) => <button key={locale} type="button" onClick={() => setFormLanguage(locale)} className={`rounded-full px-4 py-2 text-sm font-semibold ${formLanguage === locale ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'}`}>{locale.toUpperCase()}</button>)}</div><div className="grid gap-4 lg:grid-cols-2">{activeTab !== 'fees' ? <Input label={copy.code} value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} /> : null}{relationFields()}{activeTab !== 'fees' ? <Input dir={formLanguage === 'ar' ? 'rtl' : 'ltr'} label={activeTab === 'declarations' ? copy.descriptionField : copy.name} value={form[contentField]?.[formLanguage] || ''} onChange={(event) => updateLocalized(contentField, event.target.value)} /> : null}{!['fees', 'declarations'].includes(activeTab) ? <Textarea dir={formLanguage === 'ar' ? 'rtl' : 'ltr'} rows={3} label={copy.descriptionField} value={form.description?.[formLanguage] || ''} onChange={(event) => updateLocalized('description', event.target.value)} /> : null}{resourceFields()}</div>{activeTab === 'categories' ? <div className="grid gap-3 sm:grid-cols-3"><label className="flex items-center gap-2 rounded-xl border p-3"><input type="checkbox" checked={form.accepts_files} onChange={(event) => setForm((current) => ({ ...current, accepts_files: event.target.checked }))} />{copy.files}</label><label className="flex items-center gap-2 rounded-xl border p-3"><input type="checkbox" checked={form.accepts_urls} onChange={(event) => setForm((current) => ({ ...current, accepts_urls: event.target.checked }))} />{copy.urls}</label><label className="flex items-center gap-2 rounded-xl border p-3"><input type="checkbox" checked={form.is_required_by_default} onChange={(event) => setForm((current) => ({ ...current, is_required_by_default: event.target.checked }))} />{copy.requiredDefault}</label></div> : null}{activeTab === 'outcomes' ? <div className="grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-2 rounded-xl border p-3"><input type="checkbox" checked={form.requires_gap_plan} onChange={(event) => setForm((current) => ({ ...current, requires_gap_plan: event.target.checked }))} />{copy.requiresGapPlan}</label><label className="flex items-center gap-2 rounded-xl border p-3"><input type="checkbox" checked={form.is_credential_eligible} onChange={(event) => setForm((current) => ({ ...current, is_credential_eligible: event.target.checked }))} />{copy.credentialEligible}</label></div> : null}{!['standards', 'rubrics'].includes(activeTab) ? <label className="flex w-fit items-center gap-2 rounded-xl border p-3"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />{copy.active}</label> : null}{nestedFields()}<div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setFormOpen(false)}>{copy.cancel}</Button><Button onClick={saveRecord} disabled={action.busy || !isValid()}>{action.busy ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}{copy.save}</Button></div></CardContent></Card>
  }

  function renderSettings() {
    return <div className="space-y-6"><Card><CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.workflowTitle}</CardTitle><p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.workflowHint}</p></CardHeader><CardContent className="pt-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Object.keys(APPLICATION_STATUS).map((status, index) => <div key={status} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-surface-muted)] text-xs font-bold">{index + 1}</span><RplStatusBadge status={status} language={language} /></div>)}</div></CardContent></Card><Card><CardContent className="space-y-5 p-6"><div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-900"><strong className="block text-base">{copy.fixedUploadPolicy}</strong><span>{copy.fixedUploadPolicyHint}</span></div><Input type="number" min="1" max="180" label={copy.appealDays} value={settings.appeal_window_days} onChange={(event) => setSettings((current) => ({ ...current, appeal_window_days: event.target.value }))} /><label className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] p-4"><input type="checkbox" checked={settings.require_verified_evidence_for_assessment} onChange={(event) => setSettings((current) => ({ ...current, require_verified_evidence_for_assessment: event.target.checked }))} />{copy.requireVerified}</label><section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><div><h3 className="font-bold">{copy.geminiTitle}</h3><p className="mt-1 leading-6">{copy.geminiHint}</p></div><label className="flex items-center gap-3"><input type="checkbox" checked={settings.gemini_advisory_enabled} onChange={(event) => setSettings((current) => ({ ...current, gemini_advisory_enabled: event.target.checked }))} />{copy.geminiEnable}</label><Input label={copy.geminiModel} value={settings.gemini_advisory_model} onChange={(event) => setSettings((current) => ({ ...current, gemini_advisory_model: event.target.value }))} /><Textarea rows={14} label={copy.geminiPrompt} value={settings.gemini_advisory_prompt} onChange={(event) => setSettings((current) => ({ ...current, gemini_advisory_prompt: event.target.value }))} /><p className="text-xs leading-5">{copy.geminiGovernance}</p></section><div className="flex justify-end"><Button onClick={saveSettings} disabled={action.busy || Number(settings.appeal_window_days) < 1 || Number(settings.appeal_window_days) > 180 || (settings.gemini_advisory_enabled && settings.gemini_advisory_prompt.trim().length < 200)}><Save size={17} />{copy.saveSettings}</Button></div></CardContent></Card></div>
  }

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader title={copy.title} description={copy.description} />
      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-white p-2">
        <nav className="flex min-w-max gap-1" aria-label={copy.title}>
          {tabs.map((item) => {
            const Icon = item.icon
            const active = item.key === activeTab
            return <button key={item.key} type="button" onClick={() => changeTab(item.key)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${active ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]'}`} aria-current={active ? 'page' : undefined}><Icon size={17} />{copy[item.key]}</button>
          })}
        </nav>
      </div>
      {action.error || action.success ? <div role="alert" className={`rounded-2xl border px-4 py-3 text-sm ${action.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>{action.error || action.success}</div> : null}
      <RplPageState loading={state.loading} error={state.error} onRetry={load} language={language}>
        {tab.settings ? renderSettings() : <div className="space-y-6"><div className="flex items-center justify-between gap-4">{tab.immutable ? <p className="text-sm text-[var(--color-text-muted)]">{copy.deactivateHint}</p> : <span />}<Button onClick={() => openForm()}><Plus size={17} />{copy.add}</Button></div>{formOpen ? renderForm() : null}<DataTableShell title={copy[activeTab]} description={copy.description} columns={columns} rows={state.rows} emptyText={copy.empty} /></div>}
      </RplPageState>
      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#031C2C]/65 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null) }}>
          <div ref={deleteDialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="rpl-delete-title" className="w-full max-w-md outline-none">
            <Card className="w-full">
              <CardContent className="p-6">
                <h2 id="rpl-delete-title" className="text-xl font-bold">{copy.confirmDelete}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{copy.confirmText}</p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setDeleteTarget(null)}>{copy.cancel}</Button>
                  <Button variant="danger" onClick={removeRecord} disabled={action.busy}><Trash2 size={17} />{copy.delete}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </section>
  )
}
