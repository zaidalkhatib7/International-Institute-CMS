import { useCallback, useEffect, useState } from 'react'
import { BookOpenCheck, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader, Textarea,
} from '../../../components/ui'
import { approveAcademicCompetency, fetchAcademicReferenceData } from '../services/academicRplService'
import { readApiError } from '../../../services/apiResponse'
import { localize } from '../../rpl/domain/rpl'
import { getAdminLanguage } from '../../../services/languageStorage'

/*
 * THE ACADEMIC COMPETENCY FRAMEWORK — the gate on the entire pathway.
 *
 * The readiness engine ignores draft competencies, so until an academic
 * approves these nothing scores and the diagnostic generator refuses outright.
 * That is deliberate: deciding what a professional doctorate requires is an
 * academic judgement, and the platform should not quietly assume one.
 *
 * WHY APPROVAL IS DELIBERATELY AWKWARD. It needs a written basis of at least
 * twenty characters, it is audited under the approver's name, and it is done
 * one competency at a time. There is no approve-all. A framework waved through
 * in one click is indistinguishable from one nobody read, and every admission
 * recommendation afterwards rests on it.
 *
 * The per-track descriptors are shown side by side because that is where the
 * real judgement sits: the same competency is a different bar at diploma and
 * at doctorate, and approving it means accepting all three readings.
 */

const COPY = {
  ar: {
    title: 'إطار الكفاءات الأكاديمية المهنية',
    subtitle:
      'ما تُقاس عليه جاهزية المتقدم للدبلوم والماجستير والدكتوراه المهنية. لا يُحتسب أي شيء قبل الاعتماد.',
    status: 'حالة الإطار',
    approvedOf: 'كفاءة معتمدة من',
    blocked: 'المسار متوقف: لا تُحتسب أي درجة ولا يمكن توليد اختبار تشخيصي قبل اعتماد الإطار.',
    ready: 'الإطار معتمد. المسار جاهز للعمل.',
    draft: 'مسودة',
    approved: 'معتمدة',
    depth: 'العمق المطلوب لكل مسار',
    critical: 'حرجة',
    weight: 'الوزن',
    approve: 'اعتماد الكفاءة',
    approving: 'جارٍ الاعتماد…',
    basis: 'مسوّغ الاعتماد',
    basisPlaceholder: 'اذكر على أي أساس تُعتمد هذه الكفاءة ومن راجعها أكاديميًا (20 حرفًا على الأقل).',
    basisTooShort: 'المسوّغ قصير جدًا. اكتب 20 حرفًا على الأقل.',
    approvedNote: 'الاعتماد فعل محكوم يُسجَّل باسمك في سجل التدقيق.',
    noApproveAll:
      'لا يوجد اعتماد جماعي عمدًا: إطار يُعتمد بضغطة واحدة لا يختلف عن إطار لم يقرأه أحد.',
    tracks: {
      professional_diploma: 'الدبلوم المهني',
      professional_master: 'الماجستير المهني',
      professional_doctorate: 'الدكتوراه المهنية',
    },
  },
  en: {
    title: 'Professional academic competency framework',
    subtitle:
      'What readiness for the Professional Diploma, Master and Doctorate is measured against. Nothing counts until it is approved.',
    status: 'Framework status',
    approvedOf: 'competencies approved of',
    blocked: 'The pathway is halted: nothing scores and no diagnostic can be generated until the framework is approved.',
    ready: 'The framework is approved. The pathway is operational.',
    draft: 'Draft',
    approved: 'Approved',
    depth: 'Required depth per track',
    critical: 'Critical',
    weight: 'Weight',
    approve: 'Approve competency',
    approving: 'Approving…',
    basis: 'Basis for approval',
    basisPlaceholder: 'State on what basis this competency is approved and who reviewed it academically (at least 20 characters).',
    basisTooShort: 'The basis is too short. Write at least 20 characters.',
    approvedNote: 'Approval is a governed act, recorded in the audit trail under your name.',
    noApproveAll:
      'There is deliberately no approve-all: a framework waved through in one click is indistinguishable from one nobody read.',
    tracks: {
      professional_diploma: 'Professional Diploma',
      professional_master: 'Professional Master',
      professional_doctorate: 'Professional Doctorate',
    },
  },
  nl: {
    title: 'Professioneel academisch competentiekader',
    subtitle: 'Waaraan gereedheid voor diploma, master en doctoraat wordt gemeten. Niets telt vóór goedkeuring.',
    status: 'Status van het kader',
    approvedOf: 'competenties goedgekeurd van',
    blocked: 'Het traject staat stil: er wordt niets gescoord tot het kader is goedgekeurd.',
    ready: 'Het kader is goedgekeurd. Het traject is operationeel.',
    draft: 'Concept',
    approved: 'Goedgekeurd',
    depth: 'Vereiste diepgang per traject',
    critical: 'Kritiek',
    weight: 'Weging',
    approve: 'Competentie goedkeuren',
    approving: 'Goedkeuren…',
    basis: 'Grondslag voor goedkeuring',
    basisPlaceholder: 'Vermeld op welke grondslag deze competentie wordt goedgekeurd (minimaal 20 tekens).',
    basisTooShort: 'De grondslag is te kort. Schrijf minimaal 20 tekens.',
    approvedNote: 'Goedkeuring is een beheerde handeling en wordt op uw naam vastgelegd.',
    noApproveAll: 'Er is bewust geen bulkgoedkeuring.',
    tracks: {
      professional_diploma: 'Professioneel diploma',
      professional_master: 'Professionele master',
      professional_doctorate: 'Professioneel doctoraat',
    },
  },
}

export default function AcademicFrameworkPage() {
  const language = getAdminLanguage()
  const copy = COPY[language] || COPY.en

  const [state, setState] = useState({ loading: true, error: '', data: null })
  const [drafts, setDrafts] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const payload = await fetchAcademicReferenceData()
      setState({ loading: false, error: '', data: payload?.data || null })
    } catch (error) {
      setState({ loading: false, error: readApiError(error), data: null })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function approve(competency) {
    const basis = (drafts[competency.id] || '').trim()
    if (basis.length < 20) {
      setNotice(copy.basisTooShort)
      return
    }
    setBusyId(competency.id)
    setNotice('')
    try {
      await approveAcademicCompetency(competency.id, { basis })
      setDrafts((current) => ({ ...current, [competency.id]: '' }))
      await load()
    } catch (error) {
      setNotice(readApiError(error))
    } finally {
      setBusyId(null)
    }
  }

  const framework = state.data?.framework
  const competencies = state.data?.competencies || []
  const tracks = state.data?.tracks || []

  // Requirements live on the tracks; inverted here so each competency can show
  // where it is critical without the reader cross-referencing three lists.
  const requirementsByCompetency = {}
  tracks.forEach((track) => {
    ;(track.requirements || []).forEach((requirement) => {
      const key = requirement.academic_rpl_competency_id
      requirementsByCompetency[key] = requirementsByCompetency[key] || []
      requirementsByCompetency[key].push({ track, requirement })
    })
  })

  return (
    <div className="space-y-6">
      <PageHeader title={copy.title} description={copy.subtitle} />

      {state.loading ? (
        <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      ) : null}

      {framework ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">{copy.status}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {framework.approved} / {framework.total}{' '}
                  <span className="text-sm font-normal text-[var(--color-text-muted)]">{copy.approvedOf}</span>
                </p>
              </div>
              <Badge variant={framework.ready ? 'success' : 'warning'}>
                {framework.ready ? copy.ready : copy.draft}
              </Badge>
            </div>
            {/* The consequence, stated where it is discovered — not left for
                somebody to work out from an empty readiness screen. */}
            {!framework.ready ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {copy.blocked}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">{copy.noApproveAll}</p>
          </CardContent>
        </Card>
      ) : null}

      {notice ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>
      ) : null}

      <div className="space-y-4">
        {competencies.map((competency) => {
          const isApproved = competency.status === 'approved'
          const usages = requirementsByCompetency[competency.id] || []

          return (
            <Card key={competency.id}>
              <CardHeader className="border-b border-[var(--color-border)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
                    {localize(competency.name, language)}
                    <span className="font-mono text-xs text-[var(--color-text-muted)]">
                      <bdi>{competency.code}</bdi>
                    </span>
                  </CardTitle>
                  <Badge variant={isApproved ? 'success' : 'warning'}>
                    {isApproved ? copy.approved : copy.draft}
                  </Badge>
                </div>
                {competency.definition ? (
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    {localize(competency.definition, language)}
                  </p>
                ) : null}
              </CardHeader>

              <CardContent className="space-y-4 p-6">
                {/* Side by side, because approving this competency means
                    accepting all three readings of it at once. */}
                {competency.level_descriptors ? (
                  <section>
                    <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">{copy.depth}</p>
                    <dl className="mt-2 grid gap-3 lg:grid-cols-3">
                      {Object.entries(competency.level_descriptors).map(([trackCode, descriptor]) => {
                        const usage = usages.find((u) => u.track.code === trackCode)
                        return (
                          <div
                            key={trackCode}
                            className="rounded-xl border border-[var(--color-border)] p-3 text-sm"
                          >
                            <dt className="flex flex-wrap items-center gap-2 font-semibold">
                              {copy.tracks[trackCode] || trackCode}
                              {usage?.requirement?.is_critical ? (
                                <Badge variant="danger">{copy.critical}</Badge>
                              ) : null}
                            </dt>
                            <dd className="mt-1 text-[var(--color-text-muted)]">{descriptor}</dd>
                            {usage ? (
                              <dd className="mt-1 text-xs text-[var(--color-text-muted)]">
                                {copy.weight}: {usage.requirement.weight}
                              </dd>
                            ) : null}
                          </div>
                        )
                      })}
                    </dl>
                  </section>
                ) : null}

                {isApproved ? (
                  <p className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {copy.approved}
                  </p>
                ) : (
                  <section className="space-y-2">
                    <label
                      className="text-xs font-semibold uppercase text-[var(--color-text-muted)]"
                      htmlFor={`basis-${competency.id}`}
                    >
                      {copy.basis}
                    </label>
                    <Textarea
                      id={`basis-${competency.id}`}
                      rows={3}
                      value={drafts[competency.id] || ''}
                      placeholder={copy.basisPlaceholder}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [competency.id]: event.target.value }))
                      }
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <Button onClick={() => approve(competency)} disabled={busyId === competency.id}>
                        {busyId === competency.id ? copy.approving : copy.approve}
                      </Button>
                      <span className="text-xs text-[var(--color-text-muted)]">{copy.approvedNote}</span>
                    </div>
                  </section>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
