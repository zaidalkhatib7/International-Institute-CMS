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
