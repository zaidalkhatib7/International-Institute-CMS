import { http } from '../../../services/http'

function readLocalized(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value.en || value.ar || value.nl || ''
}

function normalizeProgramPayload(payload) {
  return payload?.data?.data || payload?.data || payload
}

function buildLocalizedField(value) {
  const localized = {
    en: readLocalized(value),
    ar: value?.ar || '',
    nl: value?.nl || '',
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
      nl: program?.title?.nl || '',
    },
    short_description: {
      en: readLocalized(program?.short_description),
      ar: program?.short_description?.ar || '',
      nl: program?.short_description?.nl || '',
    },
    overview: {
      en: readLocalized(program?.overview),
      ar: program?.overview?.ar || '',
      nl: program?.overview?.nl || '',
    },
    outcomes: {
      en: readLocalized(program?.outcomes),
      ar: program?.outcomes?.ar || '',
      nl: program?.outcomes?.nl || '',
    },
    target_audience: {
      en: readLocalized(program?.target_audience),
      ar: program?.target_audience?.ar || '',
      nl: program?.target_audience?.nl || '',
    },
    entry_requirements: {
      en: readLocalized(program?.entry_requirements),
      ar: program?.entry_requirements?.ar || '',
      nl: program?.entry_requirements?.nl || '',
    },
    duration: {
      en: readLocalized(program?.duration),
      ar: program?.duration?.ar || '',
      nl: program?.duration?.nl || '',
    },
    fees: program?.fees === '' || program?.fees == null ? 0 : Number(program.fees),
    currency: program?.currency || 'EUR',
    price_points:
      program?.price_points === '' || program?.price_points == null
        ? 0
        : Number(program.price_points),
    featured_image: program?.featured_image || '',
    intro_video_url: program?.intro_video_url || '',
    intro_text: {
      en: readLocalized(program?.intro_text),
      ar: program?.intro_text?.ar || '',
      nl: program?.intro_text?.nl || '',
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

export async function approveSeedPack(programId, competencies, learningOutcomes) {
  const response = await http.post(`/admin/programs/${programId}/seed-pack/approve`, {
    competencies,
    learning_outcomes: learningOutcomes,
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
