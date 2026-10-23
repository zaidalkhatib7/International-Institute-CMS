import { http } from '../../../services/http'

function readLocalized(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  // English only: re-saving a programme must not write its Arabic text under `en`.
  return value.en || ''
}

function normalizeProgramPayload(payload) {
  return payload?.data?.data || payload?.data || payload
}

function buildLocalizedField(value) {
  const localized = {
    en: readLocalized(value),
    ar: value?.ar || '',
  }

  return Object.values(localized).some((entry) => String(entry || '').trim()) ? localized : null
}

function buildProgramPayloadForUpdate(program, featuredValue) {
  const finalQuizTitle = buildLocalizedField(program?.final_quiz_title)
  const finalQuizPassPercentage =
    program?.final_quiz_pass_percentage === '' || program?.final_quiz_pass_percentage == null
      ? null
      : Number(program.final_quiz_pass_percentage)
  const finalQuizDurationMinutes =
    program?.final_quiz_duration_minutes === '' || program?.final_quiz_duration_minutes == null
      ? null
      : Number(program.final_quiz_duration_minutes)

  return {
    category_id: program?.category_id
      ? Number(program.category_id)
      : program?.category?.id
      ? Number(program.category.id)
      : null,
    title: {
      en: readLocalized(program?.title),
      ar: program?.title?.ar || '',
    },
    short_description: {
      en: readLocalized(program?.short_description),
      ar: program?.short_description?.ar || '',
    },
    overview: {
      en: readLocalized(program?.overview),
      ar: program?.overview?.ar || '',
    },
    outcomes: {
      en: readLocalized(program?.outcomes),
      ar: program?.outcomes?.ar || '',
    },
    target_audience: {
      en: readLocalized(program?.target_audience),
      ar: program?.target_audience?.ar || '',
    },
    entry_requirements: {
      en: readLocalized(program?.entry_requirements),
      ar: program?.entry_requirements?.ar || '',
    },
    duration: {
      en: readLocalized(program?.duration),
      ar: program?.duration?.ar || '',
    },
    // The one price, in US cents (owner, 17 Oct 2026), re-sent exactly as stored; never fees, currency or price_points.
    ...(Number.isSafeInteger(program?.price_usd_minor) ? { price_usd_minor: program.price_usd_minor } : {}),
    featured_image: program?.featured_image || '',
    intro_video_url: program?.intro_video_url || '',
    intro_text: {
      en: readLocalized(program?.intro_text),
      ar: program?.intro_text?.ar || '',
    },
    ...(finalQuizTitle ? { final_quiz_title: finalQuizTitle } : {}),
    ...(finalQuizPassPercentage != null
      ? { final_quiz_pass_percentage: finalQuizPassPercentage }
      : {}),
    ...(finalQuizDurationMinutes != null
      ? { final_quiz_duration_minutes: finalQuizDurationMinutes }
      : {}),
    is_featured: Boolean(featuredValue),
  }
}

export async function fetchAdminPrograms(params = {}) {
  const response = await http.get('/admin/programs', {
    params,
  })

  return response.data
}

export async function fetchAdminProgramById(id) {
  const response = await http.get(`/admin/programs/${id}`)
  return response.data
}

export async function updateAdminProgram(id, payload) {
  const response = await http.put(`/admin/programs/${id}`, payload)
  return response.data
}

/** The price alone, published package or not (PB-06): PUT /admin/programs/{id}/price, audited by the API. */
export async function updateAdminProgramPrice(id, payload) {
  const response = await http.put(`/admin/programs/${id}/price`, payload)
  return response.data
}

export async function createAdminProgram(payload) {
  const response = await http.post('/admin/programs', payload)
  return response.data
}

export async function toggleAdminProgramActive(id) {
  const response = await http.post(`/admin/programs/${id}/toggle-active`)
  return response.data
}

export async function setAdminProgramFeatured(id, isFeatured) {
  const detailResponse = await fetchAdminProgramById(id)
  const program = normalizeProgramPayload(detailResponse)
  const payload = buildProgramPayloadForUpdate(program, isFeatured)

  const response = await http.put(`/admin/programs/${id}`, payload)
  return response.data
}

export async function fetchAdminCategories() {
  const response = await http.get('/admin/categories')
  return response.data
}

// --- Seed pack: Gemini drafts the governed input, a person approves it ---
//
// Two calls, deliberately separate. propose() writes nothing — the draft lives in
// this browser until someone approves it. approve() is the accountable act, and
// it is what turns a draft into the standard the course is assessed against.

// The 15s default belongs to CRUD calls, where a slow response means something is
// wrong. This one waits on a model: a real proposal measured ~34s against
// gemini-3.1-pro, and the request holds the connection for the whole generation.
// At the default it timed out every time and read as a server fault.
const SEED_PACK_PROPOSE_TIMEOUT_MS = 180000

export async function proposeSeedPack(programId, locale) {
  const response = await http.post(
    `/admin/programs/${programId}/seed-pack/propose`,
    { locale },
    { timeout: SEED_PACK_PROPOSE_TIMEOUT_MS },
  )
  return response.data
}

export async function approveSeedPack(programId, competencies, learningOutcomes, academicIdentity, origin = null) {
  const response = await http.post(`/admin/programs/${programId}/seed-pack/approve`, {
    competencies,
    learning_outcomes: learningOutcomes,
    // The six academic fields. An omitted one leaves whatever the programme
    // already has — approving a seed pack never blanks metadata someone typed.
    academic_identity: academicIdentity || {},
    /*
     * Where the draft came from (AI resilience, Release G, §5.3): `ai` with the
     * propose answer's ai_provenance echoed back, or `manual` for a draft written
     * by hand. Informative for the audit, never authority: the values above are
     * re-checked as always.
     */
    ...(origin?.source ? { draft_source: origin.source } : {}),
    ...(origin?.provenance ? { draft_provenance: origin.provenance } : {}),
  })
  return response.data
}

// --- One-time AI package authoring (admin-triggered only) ---

export async function fetchAiPackageStatus(programId) {
  const response = await http.get(`/admin/programs/${programId}/ai-package`)
  return response.data
}

export async function generateAiPackage(programId, locale) {
  const response = await http.post(`/admin/programs/${programId}/ai-package`, { locale })
  return response.data
}

export async function regenerateAiPackageComponent(programId, component, refId) {
  const response = await http.post(`/admin/programs/${programId}/ai-package/regenerate`, {
    component,
    ref_id: refId,
  })
  return response.data
}

// The verdict and its written basis are mandatory server-side: a source is
// never approved by omission, so both are explicit arguments here.
export async function resolveAiPackageSource(programId, artifactId, citation, verificationStatus, reviewNotes) {
  const response = await http.post(`/admin/programs/${programId}/ai-package/resolve-source`, {
    artifact_id: artifactId,
    citation,
    verification_status: verificationStatus,
    review_notes: reviewNotes,
  })
  return response.data
}

// The two-key gate: someone holding rpl.settings.manage records that package
// vN.N may be authored, and only then may someone holding programs.manage start
// the run. The endpoint has existed since the auth-window work; the CMS never
// exposed it, so the refusal was a wall with no door.
export async function authorizeGeneration(programId, note) {
  const response = await http.post(`/admin/programs/${programId}/authorize-generation`, { note })
  return response.data
}

/**
 * Withdraw a generation authorization before it is spent.
 *
 * The route's own comment says "an authorization that cannot be withdrawn is
 * not governed" — and the CMS wired only the grant. The only way out was to
 * spend it, i.e. run the generation you wanted to stop. The CMS also never
 * sends expires_at, so a grant never lapses on its own.
 */
export async function revokeGenerationAuthorization(programId, reason) {
  const response = await http.post(`/admin/programs/${programId}/revoke-generation-authorization`, { reason })
  return response.data
}

export async function rejectAiPackage(programId) {
  const response = await http.delete(`/admin/programs/${programId}/ai-package`)
  return response.data
}

export async function downloadPackagePdf(programId, filename = 'package.pdf') {
  const response = await http.get(`/admin/programs/${programId}/package-pdf`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function publishTrainingPackage(programId) {
  const response = await http.post(`/admin/programs/${programId}/publish-package`)
  return response.data
}

export async function openNewPackageVersion(programId, version) {
  const response = await http.post(`/admin/programs/${programId}/new-version`, { version })
  return response.data
}

/*
 * THE LAST TWO PUBLICATION GATES.
 *
 * publish-package refuses without an APPROVED learning-time allocation and an
 * APPROVED assessment blueprint. These four endpoints have existed since B2/B3
 * and had no caller in this app, so the gates could never be satisfied from the
 * CMS and no governed package was ever publishable.
 *
 * Propose and approve are deliberately separate calls on the server. They stay
 * separate here: approval is the accountable act and is recorded against the
 * person who made it.
 */
export async function proposeLearningTime(programId, allocation) {
  const response = await http.put(`/admin/programs/${programId}/learning-time`, {
    allocation,
    proposed_by: 'human',
  })
  return response.data
}

export async function approveLearningTime(programId) {
  const response = await http.post(`/admin/programs/${programId}/learning-time/approve`)
  return response.data
}

export async function proposeAssessmentBlueprint(programId, payload) {
  const response = await http.put(`/admin/programs/${programId}/assessment-blueprint`, payload)
  return response.data
}

export async function approveAssessmentBlueprint(programId) {
  const response = await http.post(`/admin/programs/${programId}/assessment-blueprint/approve`)
  return response.data
}
