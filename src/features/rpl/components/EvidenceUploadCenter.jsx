import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  ExternalLink,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileUp,
  FileVideo,
  History,
  Link2,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea } from '../../../components/ui'
import { readApiError, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import {
  bytesToSize,
  EVIDENCE_CATEGORIES,
  EVIDENCE_EXTENSIONS,
  EVIDENCE_STATUS,
  evidencePreviewKind,
  getCategory,
  localize,
  validateEvidenceFile,
} from '../domain/rpl'
import {
  createRplLinkEvidence,
  deleteRplEvidence,
  fetchRplEvidenceHistory,
  reviewRplEvidence,
  saveRplDeclaration,
  uploadRplEvidence,
} from '../services/rplService'
import CompletenessMeter from './CompletenessMeter'
import EvidencePreview from './EvidencePreview'
import RplStatusBadge from './RplStatusBadge'
import { useModalDialog } from '../../../hooks/useModalDialog'

const copyByLanguage = {
  ar: {
    title: 'مركز رفع الأدلة والتحقق', subtitle: 'ارفع عدة ملفات، أكمل بياناتها، ثم أرسلها للمراجعة ضمن ملف RPL.',
    dropTitle: 'اسحب الملفات وأفلتها هنا', dropHint: 'أو اختر الملفات من جهازك. يمكن رفع عدة ملفات دفعة واحدة.',
    choose: 'اختيار الملفات', formats: 'PDF، JPG، PNG، DOCX، XLSX، PPTX، MP4، MP3 — بحد أقصى 50 MB لكل ملف.',
    category: 'فئة الدليل', examples: 'أمثلة', queue: 'قائمة الرفع', uploadAll: 'رفع الملفات الجاهزة', uploading: 'جارٍ الرفع',
    titleField: 'عنوان الدليل', issuer: 'الجهة المصدرة', issuedOn: 'تاريخ الإصدار', expiresOn: 'تاريخ الانتهاء',
    documentNumber: 'رقم الوثيقة', verificationUrl: 'رابط التحقق', description: 'وصف مختصر', competency: 'المجال أو الكفاءة المثبتة',
    details: 'بيانات الدليل', hideDetails: 'إخفاء البيانات', remove: 'إزالة', retry: 'إعادة المحاولة', pending: 'جاهز للرفع',
    complete: 'تم الرفع', failed: 'تعذر الرفع', invalidType: 'نوع الملف غير مدعوم.', tooLarge: 'يتجاوز الملف الحد الأقصى 50 MB.',
    savedEvidence: 'الأدلة المحفوظة', empty: 'لا توجد أدلة في هذا الملف حتى الآن.', preview: 'معاينة', history: 'السجل', delete: 'حذف',
    review: 'مراجعة الدليل', reason: 'سبب القرار أو الملاحظة', saveReview: 'حفظ نتيجة المراجعة', reviewSaved: 'تم حفظ نتيجة التحقق.',
    deleteConfirm: 'هل تريد حذف هذا الدليل؟ يحتفظ النظام بسجل العملية.', deleted: 'تم حذف الدليل.',
    linkTitle: 'إضافة دليل إلكتروني', linkHint: 'LinkedIn أو ORCID أو Google Scholar أو GitHub أو YouTube أو صفحة مشروع.',
    link: 'الرابط الإلكتروني', addLink: 'إضافة الرابط', linkSaved: 'تمت إضافة الرابط المهني.',
    declarationTitle: 'الإقرار النهائي', declarationText: 'أقر بأن جميع الوثائق والمعلومات المرفوعة صحيحة، وأوافق على قيام جهة الاعتماد بالتحقق منها والتواصل مع الجهات المصدرة عند الحاجة.',
    declarationMethod: 'طريقة توثيق الموافقة', inPerson: 'حضوريًا', signedDocument: 'وثيقة موقعة', remoteConfirmation: 'تأكيد مسجل عن بعد', attestationReference: 'مرجع إثبات الموافقة',
    declarationSave: 'حفظ الإقرار', declarationSaved: 'تم حفظ الإقرار النهائي.', selectApplication: 'اختر طلب RPL أولاً لرفع الأدلة أو حفظ الإقرار.',
    statusHistory: 'سجل حالة الدليل', noHistory: 'لا توجد تغييرات حالة مسجلة.', loadingHistory: 'جارٍ تحميل السجل...',
    noCategories: 'لا توجد فئات أدلة مفعّلة لهذا المعيار. يجب إعداد المعيار قبل رفع الملفات.',
  },
  en: {
    title: 'Evidence & Verification Upload Center', subtitle: 'Upload multiple files, complete their metadata, and submit them for review in the RPL case.',
    dropTitle: 'Drag and drop files here', dropHint: 'Or choose files from your device. Multiple files are supported.',
    choose: 'Choose files', formats: 'PDF, JPG, PNG, DOCX, XLSX, PPTX, MP4, MP3 — maximum 50 MB per file.',
    category: 'Evidence category', examples: 'Examples', queue: 'Upload queue', uploadAll: 'Upload ready files', uploading: 'Uploading',
    titleField: 'Evidence title', issuer: 'Issuing organisation', issuedOn: 'Issue date', expiresOn: 'Expiry date',
    documentNumber: 'Document number', verificationUrl: 'Verification URL', description: 'Short description', competency: 'Field or competency demonstrated',
    details: 'Evidence metadata', hideDetails: 'Hide metadata', remove: 'Remove', retry: 'Retry', pending: 'Ready to upload',
    complete: 'Uploaded', failed: 'Upload failed', invalidType: 'Unsupported file type.', tooLarge: 'The file exceeds the 50 MB limit.',
    savedEvidence: 'Saved evidence', empty: 'No evidence has been added to this case yet.', preview: 'Preview', history: 'History', delete: 'Delete',
    review: 'Review evidence', reason: 'Decision reason or review note', saveReview: 'Save review result', reviewSaved: 'Verification result saved.',
    deleteConfirm: 'Delete this evidence? The action remains in the audit history.', deleted: 'Evidence deleted.',
    linkTitle: 'Add electronic evidence', linkHint: 'LinkedIn, ORCID, Google Scholar, GitHub, YouTube, or a project page.',
    link: 'Electronic link', addLink: 'Add link', linkSaved: 'Professional link added.',
    declarationTitle: 'Final declaration', declarationText: 'I declare that all attached documents and information are correct, and I consent to the accreditation body verifying them and contacting issuing organisations when needed.',
    declarationMethod: 'Consent recording method', inPerson: 'In person', signedDocument: 'Signed document', remoteConfirmation: 'Recorded remote confirmation', attestationReference: 'Consent evidence reference',
    declarationSave: 'Save declaration', declarationSaved: 'Final declaration saved.', selectApplication: 'Select an RPL application before uploading evidence or saving the declaration.',
    statusHistory: 'Evidence status history', noHistory: 'No status changes are recorded.', loadingHistory: 'Loading history...',
    noCategories: 'No evidence categories are enabled for this standard. Configure the standard before uploading files.',
  },
  nl: {
    title: 'Uploadcentrum Bewijs & Verificatie', subtitle: 'Upload meerdere bestanden, vul de metadata in en dien ze in voor beoordeling in het RPL-dossier.',
    dropTitle: 'Sleep bestanden hierheen', dropHint: 'Of kies bestanden op uw apparaat. Meerdere bestanden worden ondersteund.',
    choose: 'Bestanden kiezen', formats: 'PDF, JPG, PNG, DOCX, XLSX, PPTX, MP4, MP3 — maximaal 50 MB per bestand.',
    category: 'Bewijscategorie', examples: 'Voorbeelden', queue: 'Uploadwachtrij', uploadAll: 'Gereedstaande bestanden uploaden', uploading: 'Uploaden',
    titleField: 'Bewijstitel', issuer: 'Uitgevende organisatie', issuedOn: 'Uitgiftedatum', expiresOn: 'Vervaldatum',
    documentNumber: 'Documentnummer', verificationUrl: 'Verificatielink', description: 'Korte beschrijving', competency: 'Aangetoond vakgebied of competentie',
    details: 'Bewijsmetadata', hideDetails: 'Metadata verbergen', remove: 'Verwijderen', retry: 'Opnieuw', pending: 'Gereed voor upload',
    complete: 'Geüpload', failed: 'Upload mislukt', invalidType: 'Niet-ondersteund bestandstype.', tooLarge: 'Het bestand is groter dan 50 MB.',
    savedEvidence: 'Opgeslagen bewijs', empty: 'Er is nog geen bewijs aan dit dossier toegevoegd.', preview: 'Voorbeeld', history: 'Geschiedenis', delete: 'Verwijderen',
    review: 'Bewijs beoordelen', reason: 'Reden of beoordelingsnotitie', saveReview: 'Beoordeling opslaan', reviewSaved: 'Verificatieresultaat opgeslagen.',
    deleteConfirm: 'Dit bewijs verwijderen? De actie blijft in de auditgeschiedenis.', deleted: 'Bewijs verwijderd.',
    linkTitle: 'Online bewijs toevoegen', linkHint: 'LinkedIn, ORCID, Google Scholar, GitHub, YouTube of een projectpagina.',
    link: 'Online link', addLink: 'Link toevoegen', linkSaved: 'Professionele link toegevoegd.',
    declarationTitle: 'Slotverklaring', declarationText: 'Ik verklaar dat alle bijgevoegde documenten en informatie correct zijn en stem ermee in dat de accreditatie-instantie deze verifieert en indien nodig contact opneemt met uitgevende organisaties.',
    declarationMethod: 'Methode toestemmingsregistratie', inPerson: 'Persoonlijk', signedDocument: 'Ondertekend document', remoteConfirmation: 'Opgenomen bevestiging op afstand', attestationReference: 'Referentie toestemmingsbewijs',
    declarationSave: 'Verklaring opslaan', declarationSaved: 'Slotverklaring opgeslagen.', selectApplication: 'Selecteer eerst een RPL-aanvraag om bewijs te uploaden of de verklaring op te slaan.',
    statusHistory: 'Statusgeschiedenis', noHistory: 'Er zijn geen statuswijzigingen geregistreerd.', loadingHistory: 'Geschiedenis laden...',
    noCategories: 'Voor deze norm zijn geen bewijscategorieën ingeschakeld. Configureer de norm voordat u bestanden uploadt.',
  },
}

function queueId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeCategories(categories) {
  if (Array.isArray(categories)) return categories
  const rows = unwrapCollection(categories)
  return rows.length ? rows : EVIDENCE_CATEGORIES
}

function buildQueueItem(file, defaultCategory) {
  const validation = validateEvidenceFile(file)
  return {
    id: queueId(), file, previewUrl: URL.createObjectURL(file), validation,
    categoryId: defaultCategory?.id || '', categoryCode: defaultCategory?.code || 'identity',
    title: file.name.replace(/\.[^/.]+$/, ''), issuer: '', issuedOn: '', expiresOn: '',
    documentNumber: '', verificationUrl: '', description: '', competencyClaim: '',
    progress: 0, state: validation.valid ? 'pending' : 'invalid', error: '', expanded: false,
  }
}

function FileTypeIcon({ item, size = 22 }) {
  const kind = evidencePreviewKind(item.file?.type || item.media?.mime_type, item.file?.name || item.media?.original_name)
  if (kind === 'image') return <FileImage size={size} />
  if (kind === 'video') return <FileVideo size={size} />
  if (kind === 'audio') return <FileAudio size={size} />
  if ((item.file?.name || item.media?.original_name || '').toLowerCase().endsWith('.xlsx')) return <FileSpreadsheet size={size} />
  return <FileText size={size} />
}

function validationMessage(item, text) {
  if (item.validation?.code === 'too_large') return text.tooLarge
  if (item.validation?.code === 'unsupported_type') return text.invalidType
  return item.error || ''
}

function QueueItem({ item, categories, language, text, onChange, onRemove, onUpload }) {
  const category = getCategory(item.categoryCode, categories)
  const isBusy = item.state === 'uploading'
  const statusLabel = item.state === 'complete' ? text.complete : item.state === 'error' ? text.failed : item.state === 'uploading' ? `${text.uploading} ${item.progress}%` : item.state === 'invalid' ? validationMessage(item, text) : text.pending

  return (
    <article className={`rounded-2xl border bg-white p-4 ${item.state === 'invalid' || item.state === 'error' ? 'border-red-200' : 'border-[var(--color-border)]'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
          {evidencePreviewKind(item.file.type, item.file.name) === 'image' ? <img src={item.previewUrl} alt="" className="h-full w-full object-cover" /> : <FileTypeIcon item={item} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--color-text)]">{item.file.name}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{bytesToSize(item.file.size, language)} · {localize(category?.labels || category?.name, language)}</p>
            </div>
            <Badge variant={item.state === 'complete' ? 'success' : item.state === 'invalid' || item.state === 'error' ? 'danger' : item.state === 'uploading' ? 'warning' : 'info'}>{statusLabel}</Badge>
          </div>
          {isBusy || item.progress > 0 ? (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={item.progress}>
              <div className="h-full rounded-full bg-[var(--color-accent)] transition-[width]" style={{ width: `${item.progress}%` }} />
            </div>
          ) : null}
          {item.error ? <p className="mt-2 text-sm text-red-600">{item.error}</p> : null}
        </div>
        <div className="flex shrink-0 gap-2">
          {(item.state === 'pending' || item.state === 'error') && item.validation.valid ? (
            <Button size="sm" variant="outline" onClick={() => onUpload(item.id)} disabled={isBusy} aria-label={item.state === 'error' ? text.retry : text.uploadAll}>
              {item.state === 'error' ? <RotateCcw size={16} /> : <FileUp size={16} />}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => onChange(item.id, 'expanded', !item.expanded)} aria-expanded={item.expanded}>
            {item.expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            <span className="hidden md:inline">{item.expanded ? text.hideDetails : text.details}</span>
          </Button>
          {item.state !== 'uploading' ? (
            <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)} aria-label={text.remove}><Trash2 size={17} /></Button>
          ) : null}
        </div>
      </div>

      {item.expanded ? (
        <div className="mt-5 grid gap-4 border-t border-[var(--color-border)] pt-5 md:grid-cols-2 xl:grid-cols-3">
          <Select label={text.category} value={item.categoryId || item.categoryCode} onChange={(event) => {
            const selected = categories.find((entry) => String(entry.id || entry.code) === event.target.value)
            onChange(item.id, 'categoryId', selected?.id || '')
            onChange(item.id, 'categoryCode', selected?.code || event.target.value)
          }} disabled={isBusy || item.state === 'complete'}>
            {categories.filter((entry) => entry.code !== 'electronic_link').map((entry) => <option key={entry.id || entry.code} value={entry.id || entry.code}>{localize(entry.labels || entry.name, language)}</option>)}
          </Select>
          <Input label={text.titleField} value={item.title} onChange={(event) => onChange(item.id, 'title', event.target.value)} disabled={isBusy || item.state === 'complete'} />
          <Input label={text.issuer} value={item.issuer} onChange={(event) => onChange(item.id, 'issuer', event.target.value)} disabled={isBusy || item.state === 'complete'} />
          <Input type="date" label={text.issuedOn} value={item.issuedOn} onChange={(event) => onChange(item.id, 'issuedOn', event.target.value)} disabled={isBusy || item.state === 'complete'} />
          <Input type="date" label={text.expiresOn} value={item.expiresOn} onChange={(event) => onChange(item.id, 'expiresOn', event.target.value)} disabled={isBusy || item.state === 'complete'} />
          <Input label={text.documentNumber} value={item.documentNumber} onChange={(event) => onChange(item.id, 'documentNumber', event.target.value)} disabled={isBusy || item.state === 'complete'} />
          <Input type="url" label={text.verificationUrl} value={item.verificationUrl} onChange={(event) => onChange(item.id, 'verificationUrl', event.target.value)} disabled={isBusy || item.state === 'complete'} />
          <Input label={text.competency} value={item.competencyClaim} onChange={(event) => onChange(item.id, 'competencyClaim', event.target.value)} disabled={isBusy || item.state === 'complete'} />
          <Textarea className="md:col-span-2 xl:col-span-1" rows={3} label={text.description} value={item.description} onChange={(event) => onChange(item.id, 'description', event.target.value)} disabled={isBusy || item.state === 'complete'} />
        </div>
      ) : null}
    </article>
  )
}

function SavedEvidenceCard({ evidence, language, text, categories, canReview, onPreview, onDeleted, onChanged, onRefreshRequested }) {
  const [review, setReview] = useState({ status: evidence.status || 'new', reason: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState({ open: false, loading: false, rows: [], error: '' })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const confirmDialogRef = useModalDialog(confirmOpen, () => setConfirmOpen(false))
  const media = evidence.media || evidence.file || {}
  const category = evidence.category || getCategory(evidence.category_code, categories)
  const evidenceKey = evidence.public_id || evidence.id

  async function saveReview() {
    setBusy(true); setMessage('')
    try {
      const response = unwrapApiData(await reviewRplEvidence(evidenceKey, review))
      onChanged?.(response?.evidence || response || { ...evidence, ...review }, response?.completeness)
      if (!response?.completeness) onRefreshRequested?.()
      setMessage(text.reviewSaved)
    } catch (error) { setMessage(readApiError(error)) } finally { setBusy(false) }
  }

  async function remove() {
    setBusy(true); setMessage('')
    try {
      const response = unwrapApiData(await deleteRplEvidence(evidenceKey))
      setConfirmOpen(false)
      onDeleted(evidenceKey, response?.completeness)
    } catch (error) { setMessage(readApiError(error)) } finally { setBusy(false) }
  }

  async function toggleHistory() {
    if (history.open) { setHistory((current) => ({ ...current, open: false })); return }
    setHistory((current) => ({ ...current, open: true, loading: true, error: '' }))
    try {
      const rows = unwrapCollection(await fetchRplEvidenceHistory(evidenceKey))
      setHistory({ open: true, loading: false, rows, error: '' })
    } catch (error) { setHistory({ open: true, loading: false, rows: [], error: readApiError(error) }) }
  }

  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-primary)]"><FileTypeIcon item={evidence} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-[var(--color-text)]">{evidence.title || media.original_name || evidence.external_url}</h3>
            <RplStatusBadge status={evidence.status} domain="evidence" language={language} />
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{localize(category?.labels || category?.name, language)}{evidence.issuer ? ` · ${evidence.issuer}` : ''}{media.size ? ` · ${bytesToSize(media.size, language)}` : ''}</p>
          {evidence.competency_claim ? <p className="mt-2 text-sm text-[var(--color-text)]">{evidence.competency_claim}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onPreview(evidence)}>{evidence.kind === 'url' ? <ExternalLink size={16} /> : <FileText size={16} />}{text.preview}</Button>
          <Button size="sm" variant="ghost" onClick={toggleHistory}><History size={16} />{text.history}</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(true)} disabled={busy}><Trash2 size={16} /><span className="sr-only">{text.delete}</span></Button>
        </div>
      </div>

      {canReview ? (
        <div className="mt-5 grid gap-3 border-t border-[var(--color-border)] pt-5 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-end">
          <Select label={text.review} value={review.status} onChange={(event) => setReview((current) => ({ ...current, status: event.target.value }))}>
            {Object.entries(EVIDENCE_STATUS).map(([value, definition]) => <option key={value} value={value}>{localize(definition.labels, language)}</option>)}
          </Select>
          <Input label={text.reason} value={review.reason} onChange={(event) => setReview((current) => ({ ...current, reason: event.target.value }))} />
          <Button onClick={saveReview} disabled={busy || (['clarification_required', 'rejected', 'unverifiable'].includes(review.status) && !review.reason.trim())}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : <ShieldCheck size={17} />}{text.saveReview}</Button>
        </div>
      ) : null}
      {message ? <p className={`mt-3 text-sm ${message === text.reviewSaved ? 'text-green-700' : 'text-red-600'}`}>{message}</p> : null}
      {history.open ? (
        <div className="mt-5 rounded-xl bg-[var(--color-surface-muted)] p-4">
          <h4 className="font-semibold text-[var(--color-text)]">{text.statusHistory}</h4>
          {history.loading ? <p className="mt-3 text-sm text-[var(--color-text-muted)]">{text.loadingHistory}</p> : history.error ? <p className="mt-3 text-sm text-red-600">{history.error}</p> : history.rows.length ? (
            <ol className="mt-3 space-y-3">
              {history.rows.map((entry, index) => <li key={entry.id || index} className="border-s-2 border-[var(--color-accent)] ps-3 text-sm"><RplStatusBadge status={entry.status || entry.to_status} domain="evidence" language={language} /> <span className="ms-2 text-[var(--color-text-muted)]">{entry.reason || entry.created_at || ''}</span></li>)}
            </ol>
          ) : <p className="mt-3 text-sm text-[var(--color-text-muted)]">{text.noHistory}</p>}
        </div>
      ) : null}
      {confirmOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#031C2C]/65 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmOpen(false) }}>
          <div ref={confirmDialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby={`delete-evidence-${evidenceKey}`} className="w-full max-w-md outline-none">
          <Card className="w-full">
            <CardContent className="p-6">
              <h3 id={`delete-evidence-${evidenceKey}`} className="text-xl font-bold text-[var(--color-text)]">{text.delete}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{text.deleteConfirm}</p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>{text.remove}</Button>
                <Button variant="danger" onClick={remove} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}{text.delete}</Button>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      ) : null}
    </article>
  )
}

export default function EvidenceUploadCenter({ applicationId, evidence: sourceEvidence, categories: sourceCategories, completeness: sourceCompleteness = null, declarationAccepted = false, language = 'en', canReview = true, onEvidenceChange, onCompletenessChange, onDeclarationChange, onRefreshRequested }) {
  const text = copyByLanguage[language] || copyByLanguage.en
  const isArabic = language === 'ar'
  const inputRef = useRef(null)
  const queueRef = useRef([])
  const [categories, setCategories] = useState(() => normalizeCategories(sourceCategories || EVIDENCE_CATEGORIES))
  const [evidence, setEvidence] = useState(sourceEvidence || [])
  const [queue, setQueue] = useState([])
  const [dragging, setDragging] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(() => normalizeCategories(sourceCategories || EVIDENCE_CATEGORIES).find((category) => category.code !== 'electronic_link' && category.accepts_files !== false)?.code || '')
  const [preview, setPreview] = useState(null)
  const [notice, setNotice] = useState({ type: '', text: '' })
  const [linkForm, setLinkForm] = useState({ title: '', external_url: '', description: '', competency_claim: '' })
  const [declaration, setDeclaration] = useState(Boolean(declarationAccepted))
  const [completeness, setCompleteness] = useState(sourceCompleteness)
  const [attestation, setAttestation] = useState({ acceptance_method: 'in_person', attestation_reference: '' })
  const [busy, setBusy] = useState({ link: false, declaration: false, uploads: false })

  useEffect(() => { setEvidence(sourceEvidence || []) }, [sourceEvidence])
  useEffect(() => { setDeclaration(Boolean(declarationAccepted)) }, [declarationAccepted])
  useEffect(() => { setCompleteness(sourceCompleteness) }, [sourceCompleteness])
  useEffect(() => {
    const next = normalizeCategories(sourceCategories ?? EVIDENCE_CATEGORIES)
    setCategories(next)
    setSelectedCategory((current) => next.some((category) => category.code === current && category.code !== 'electronic_link' && category.accepts_files !== false)
      ? current
      : next.find((category) => category.code !== 'electronic_link' && category.accepts_files !== false)?.code || '')
  }, [sourceCategories])
  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => () => { queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)) }, [])

  const uploadCategories = useMemo(() => categories.filter((entry) => entry.code !== 'electronic_link' && entry.accepts_files !== false), [categories])
  const selectedCategoryRecord = useMemo(() => uploadCategories.find((entry) => entry.code === selectedCategory) || uploadCategories[0], [selectedCategory, uploadCategories])
  const linkCategory = useMemo(() => categories.find((entry) => entry.code === 'electronic_link' && entry.accepts_urls !== false), [categories])
  const hasReady = queue.some((item) => item.validation.valid && ['pending', 'error'].includes(item.state))

  function applyCompleteness(next) {
    if (!next || typeof next !== 'object') return
    setCompleteness(next)
    onCompletenessChange?.(next)
  }

  function addFiles(fileList) {
    if (!selectedCategoryRecord) {
      setNotice({ type: 'error', text: text.noCategories })
      return
    }
    const files = Array.from(fileList || [])
    if (!files.length) return
    setQueue((current) => [...current, ...files.map((file) => buildQueueItem(file, selectedCategoryRecord))])
    setNotice({ type: '', text: '' })
  }

  function updateQueue(id, field, value) {
    setQueue((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item))
  }

  function removeQueue(id) {
    setQueue((current) => {
      const target = current.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((item) => item.id !== id)
    })
  }

  async function uploadOne(id) {
    const item = queue.find((entry) => entry.id === id)
    if (!applicationId || !item?.validation.valid) {
      if (!applicationId) setNotice({ type: 'error', text: text.selectApplication })
      return
    }
    updateQueue(id, 'state', 'uploading'); updateQueue(id, 'error', ''); updateQueue(id, 'progress', 1)
    const selected = categories.find((entry) => String(entry.id || entry.code) === String(item.categoryId || item.categoryCode)) || getCategory(item.categoryCode, categories)
    try {
      const response = unwrapApiData(await uploadRplEvidence(applicationId, {
        kind: 'file', file: item.file, category_id: selected?.id || item.categoryId,
        category_code: selected?.code || item.categoryCode, title: item.title, issuer: item.issuer,
        issued_on: item.issuedOn, expires_on: item.expiresOn, document_number: item.documentNumber,
        verification_url: item.verificationUrl, description: item.description, competency_claim: item.competencyClaim,
      }, (event) => updateQueue(id, 'progress', event.total ? Math.round((event.loaded * 100) / event.total) : 50)))
      updateQueue(id, 'state', 'complete'); updateQueue(id, 'progress', 100)
      const created = response?.evidence || response
      applyCompleteness(response?.completeness)
      if (created?.public_id || created?.id) {
        setEvidence((current) => {
          const next = [created, ...current]
          onEvidenceChange?.(next)
          return next
        })
      }
    } catch (error) {
      updateQueue(id, 'state', 'error'); updateQueue(id, 'error', readApiError(error)); updateQueue(id, 'progress', 0)
    }
  }

  async function uploadAll() {
    if (!applicationId) { setNotice({ type: 'error', text: text.selectApplication }); return }
    setBusy((current) => ({ ...current, uploads: true }))
    const ids = queue.filter((item) => item.validation.valid && ['pending', 'error'].includes(item.state)).map((item) => item.id)
    await Promise.all(ids.map(uploadOne))
    setBusy((current) => ({ ...current, uploads: false }))
  }

  async function addLink() {
    if (!applicationId) { setNotice({ type: 'error', text: text.selectApplication }); return }
    if (!linkCategory) { setNotice({ type: 'error', text: text.noCategories }); return }
    setBusy((current) => ({ ...current, link: true })); setNotice({ type: '', text: '' })
    try {
      const response = unwrapApiData(await createRplLinkEvidence(applicationId, {
        category_id: linkCategory?.id, category_code: 'electronic_link', kind: 'url', ...linkForm,
      }))
      const created = response?.evidence || response
      applyCompleteness(response?.completeness)
      setEvidence((current) => {
        const next = [created, ...current]
        onEvidenceChange?.(next)
        return next
      }); setLinkForm({ title: '', external_url: '', description: '', competency_claim: '' })
      setNotice({ type: 'success', text: text.linkSaved })
    } catch (error) { setNotice({ type: 'error', text: readApiError(error) }) } finally { setBusy((current) => ({ ...current, link: false })) }
  }

  async function saveDeclaration() {
    if (!applicationId) { setNotice({ type: 'error', text: text.selectApplication }); return }
    setBusy((current) => ({ ...current, declaration: true })); setNotice({ type: '', text: '' })
    try {
      const response = unwrapApiData(await saveRplDeclaration(applicationId, { accepted: true, ...attestation }))
      applyCompleteness(response?.completeness)
      setDeclaration(true)
      setNotice({ type: 'success', text: text.declarationSaved }); onDeclarationChange?.(true, response?.consent)
    } catch (error) { setNotice({ type: 'error', text: readApiError(error) }) } finally { setBusy((current) => ({ ...current, declaration: false })) }
  }

  function removeSaved(id, nextCompleteness) {
    const remaining = evidence.filter((item) => (item.public_id || item.id) !== id)
    setEvidence(remaining); onEvidenceChange?.(remaining)
    applyCompleteness(nextCompleteness)
    setNotice({ type: 'success', text: text.deleted })
  }

  function changeSaved(updated, nextCompleteness) {
    setEvidence((current) => {
      const next = current.map((item) => (item.public_id || item.id) === (updated.public_id || updated.id) ? { ...item, ...updated } : item)
      onEvidenceChange?.(next)
      return next
    })
    applyCompleteness(nextCompleteness)
  }

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-6" aria-labelledby="evidence-upload-title">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 id="evidence-upload-title" className="text-2xl font-bold text-[var(--color-text)]">{text.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{text.subtitle}</p>
        </div>
        <CompletenessMeter value={completeness} categories={uploadCategories} language={language} />
      </div>

      {notice.text ? <div role="alert" className={`rounded-2xl border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.text}</div> : null}

      <Card>
        <CardContent className="p-5 sm:p-7">
          <div className="mb-5 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-end">
            <Select label={text.category} value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              {uploadCategories.map((category) => <option key={category.id || category.code} value={category.code}>{localize(category.labels || category.name, language)}</option>)}
            </Select>
            <p className="rounded-xl bg-[var(--color-surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]"><strong className="text-[var(--color-text)]">{text.examples}: </strong>{(selectedCategoryRecord?.examples?.[language] || selectedCategoryRecord?.examples?.en || []).join(' · ')}</p>
          </div>

          <div
            className={`flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-[var(--color-accent)] bg-[#FFF8E8]' : 'border-[var(--color-border)] bg-[var(--color-surface-muted)]'}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
            onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
            onDragLeave={(event) => { event.preventDefault(); setDragging(false) }}
            onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files) }}
            aria-disabled={!uploadCategories.length}
          >
            <UploadCloud size={42} className="text-[var(--color-primary)]" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-bold text-[var(--color-text)]">{text.dropTitle}</h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{text.dropHint}</p>
            <input ref={inputRef} type="file" multiple accept={EVIDENCE_EXTENSIONS.map((extension) => `.${extension}`).join(',')} className="sr-only" onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
            <Button className="mt-5" variant="secondary" onClick={() => inputRef.current?.click()} disabled={!uploadCategories.length}><FileUp size={18} />{text.choose}</Button>
            <p className="mt-4 max-w-2xl text-xs leading-5 text-[var(--color-text-muted)]">{text.formats}</p>
            {!uploadCategories.length ? <p className="mt-3 max-w-2xl text-sm font-semibold text-amber-700">{text.noCategories}</p> : null}
          </div>
        </CardContent>
      </Card>

      {queue.length ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)]">
            <div><CardTitle>{text.queue}</CardTitle><p className="mt-1 text-sm text-[var(--color-text-muted)]">{queue.length} · {bytesToSize(queue.reduce((sum, item) => sum + item.file.size, 0), language)}</p></div>
            <Button onClick={uploadAll} disabled={!hasReady || busy.uploads || !applicationId}>{busy.uploads ? <LoaderCircle className="animate-spin" size={18} /> : <UploadCloud size={18} />}{text.uploadAll}</Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {queue.map((item) => <QueueItem key={item.id} item={item} categories={categories} language={language} text={text} onChange={updateQueue} onRemove={removeQueue} onUpload={uploadOne} />)}
          </CardContent>
        </Card>
      ) : null}

      {linkCategory ? <Card>
        <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{text.linkTitle}</CardTitle><p className="mt-2 text-sm text-[var(--color-text-muted)]">{text.linkHint}</p></CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Input label={text.titleField} value={linkForm.title} onChange={(event) => setLinkForm((current) => ({ ...current, title: event.target.value }))} />
            <Input type="url" leftIcon={<Link2 size={17} />} label={text.link} value={linkForm.external_url} onChange={(event) => setLinkForm((current) => ({ ...current, external_url: event.target.value }))} />
            <Input label={text.competency} value={linkForm.competency_claim} onChange={(event) => setLinkForm((current) => ({ ...current, competency_claim: event.target.value }))} />
            <Textarea rows={3} label={text.description} value={linkForm.description} onChange={(event) => setLinkForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="mt-5 flex justify-end"><Button onClick={addLink} disabled={busy.link || !linkForm.title || !linkForm.external_url}>{busy.link ? <LoaderCircle className="animate-spin" size={18} /> : <ExternalLink size={18} />}{text.addLink}</Button></div>
        </CardContent>
      </Card> : null}

      <Card>
        <CardContent className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <input id={`rpl-declaration-${applicationId || 'none'}`} type="checkbox" checked={declaration} onChange={(event) => setDeclaration(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-primary)]" />
            <label htmlFor={`rpl-declaration-${applicationId || 'none'}`} className="cursor-pointer"><span className="block font-bold text-[var(--color-text)]">{text.declarationTitle}</span><span className="mt-2 block text-sm leading-7 text-[var(--color-text-muted)]">{text.declarationText}</span></label>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2"><Select label={text.declarationMethod} value={attestation.acceptance_method} onChange={(event) => setAttestation((current) => ({ ...current, acceptance_method: event.target.value }))}><option value="in_person">{text.inPerson}</option><option value="signed_document">{text.signedDocument}</option><option value="recorded_remote_confirmation">{text.remoteConfirmation}</option></Select><Input label={text.attestationReference} value={attestation.attestation_reference} onChange={(event) => setAttestation((current) => ({ ...current, attestation_reference: event.target.value }))} /></div>
          <div className="mt-5 flex justify-end"><Button onClick={saveDeclaration} disabled={!applicationId || !declaration || !attestation.attestation_reference.trim() || busy.declaration}>{busy.declaration ? <LoaderCircle className="animate-spin" size={18} /> : <Check size={18} />}{text.declarationSave}</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{text.savedEvidence}</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-6">
          {evidence.length ? evidence.map((item) => <SavedEvidenceCard key={item.public_id || item.id} evidence={item} language={language} text={text} categories={categories} canReview={canReview} onPreview={setPreview} onDeleted={removeSaved} onChanged={changeSaved} onRefreshRequested={onRefreshRequested} />) : <div className="flex min-h-36 flex-col items-center justify-center gap-3 text-center text-[var(--color-text-muted)]"><CircleAlert size={30} /><p>{text.empty}</p></div>}
        </CardContent>
      </Card>

      {preview ? <EvidencePreview evidence={preview} language={language} onClose={() => setPreview(null)} /> : null}
    </section>
  )
}
