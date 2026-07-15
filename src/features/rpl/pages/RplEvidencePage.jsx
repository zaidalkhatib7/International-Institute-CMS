import { useCallback, useEffect, useState } from 'react'
import { FileCheck2, Filter, RefreshCw, ShieldCheck } from 'lucide-react'
import { Badge, Button, Card, CardContent, PageHeader, Select, StatCard } from '../../../components/ui'
import { readApiError, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import {
  EVIDENCE_CATEGORIES,
  EVIDENCE_STATUS,
  getApplicationEvidenceCategories,
  readApplicationCompleteness,
  readApplicationDeclarationAccepted,
} from '../domain/rpl'
import { fetchRplApplication, fetchRplApplications, fetchRplEvidence, fetchRplReferenceData } from '../services/rplService'
import EvidenceUploadCenter from '../components/EvidenceUploadCenter'
import RplPageState from '../components/RplPageState'

const copyByLanguage = {
  ar: {
    title: 'التحقق والأدلة', description: 'مركز مركزي لرفع الأدلة المهنية ومعاينتها والتحقق منها لكل ملفات RPL.',
    application: 'ملف RPL', chooseApplication: 'اختر ملفًا لإدارة أدلته', allEvidence: 'كل الأدلة (عرض فقط)', refresh: 'تحديث',
    total: 'إجمالي الأدلة', verified: 'تم التحقق', review: 'قيد المراجعة', clarification: 'تحتاج توضيحًا', loadError: 'تعذر تحميل مركز الأدلة.',
  },
  en: {
    title: 'Evidence & Verification', description: 'A central workspace to upload, preview, and verify professional evidence across RPL cases.',
    application: 'RPL case', chooseApplication: 'Select a case to manage its evidence', allEvidence: 'All evidence (read only)', refresh: 'Refresh',
    total: 'Total evidence', verified: 'Verified', review: 'Under review', clarification: 'Needs clarification', loadError: 'Unable to load the evidence center.',
  },
  nl: {
    title: 'Bewijs & Verificatie', description: 'Een centrale werkruimte voor upload, voorbeeld en verificatie van professioneel bewijs in RPL-dossiers.',
    application: 'RPL-dossier', chooseApplication: 'Selecteer een dossier om bewijs te beheren', allEvidence: 'Al het bewijs (alleen lezen)', refresh: 'Vernieuwen',
    total: 'Totaal bewijs', verified: 'Geverifieerd', review: 'In beoordeling', clarification: 'Toelichting nodig', loadError: 'Kan het bewijscentrum niet laden.',
  },
}

function caseLabel(application) {
  const applicant = application.applicant || application.user || {}
  return `${application.case_reference || application.reference_number || application.case_number || `RPL-${application.id}`} · ${applicant.name || application.applicant_name || applicant.email || ''}`
}

export default function RplEvidencePage() {
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const copy = copyByLanguage[language] || copyByLanguage.en
  const [applicationId, setApplicationId] = useState('')
  const [state, setState] = useState({ loading: true, error: '', applications: [], evidence: [], categories: [], completeness: null, declarationAccepted: false })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const [applicationsResponse, evidenceResponse, referenceResponse, applicationResponse] = await Promise.all([
        fetchRplApplications({ per_page: 100 }),
        fetchRplEvidence({ ...(applicationId ? { application_id: applicationId } : {}), per_page: 100 }),
        fetchRplReferenceData(),
        applicationId ? fetchRplApplication(applicationId) : Promise.resolve(null),
      ])
      const reference = unwrapApiData(referenceResponse) || {}
      const selected = unwrapApiData(applicationResponse) || unwrapCollection(applicationsResponse).find((application) => String(application.public_id || application.id) === String(applicationId))
      const referenceCategories = unwrapCollection(reference.evidence_categories || reference.categories || reference)
      setState({
        loading: false, error: '', applications: unwrapCollection(applicationsResponse), evidence: unwrapCollection(evidenceResponse),
        categories: selected ? getApplicationEvidenceCategories(selected, referenceCategories.length ? referenceCategories : EVIDENCE_CATEGORIES) : [],
        completeness: readApplicationCompleteness(selected),
        declarationAccepted: readApplicationDeclarationAccepted(selected),
      })
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.loadError) }))
    }
  }, [applicationId, copy.loadError])

  useEffect(() => { load() }, [load])

  const counts = Object.fromEntries(Object.keys(EVIDENCE_STATUS).map((status) => [status, state.evidence.filter((item) => item.status === status).length]))

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader title={copy.title} description={copy.description} actions={<Button variant="outline" onClick={load}><RefreshCw size={17} />{copy.refresh}</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard title={copy.total} value={state.evidence.length} icon={<FileCheck2 size={21} />} />
        <StatCard title={copy.verified} value={counts.verified || 0} icon={<ShieldCheck size={21} />} />
        <StatCard title={copy.review} value={counts.under_review || 0} icon={<RefreshCw size={21} />} />
        <StatCard title={copy.clarification} value={counts.clarification_required || 0} icon={<Filter size={21} />} />
      </div>
      <Card>
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <Select label={copy.application} value={applicationId} onChange={(event) => setApplicationId(event.target.value)}>
            <option value="">{copy.allEvidence}</option>
            {state.applications.map((application) => <option key={application.public_id || application.id} value={application.public_id || application.id}>{caseLabel(application)}</option>)}
          </Select>
          <Badge variant={applicationId ? 'success' : 'warning'} className="justify-center px-4 py-3">{applicationId ? caseLabel(state.applications.find((item) => String(item.public_id || item.id) === String(applicationId)) || {}) : copy.chooseApplication}</Badge>
        </CardContent>
      </Card>
      <RplPageState loading={state.loading} error={state.error} onRetry={load} language={language}>
        <EvidenceUploadCenter
          applicationId={applicationId || null}
          evidence={state.evidence}
          categories={state.categories}
          completeness={state.completeness}
          declarationAccepted={state.declarationAccepted}
          language={language}
          canReview
          onEvidenceChange={(evidence) => setState((current) => ({ ...current, evidence }))}
          onCompletenessChange={(completeness) => setState((current) => ({ ...current, completeness }))}
          onDeclarationChange={(accepted) => setState((current) => ({ ...current, declarationAccepted: accepted }))}
          onRefreshRequested={load}
        />
      </RplPageState>
    </section>
  )
}
