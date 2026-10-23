import { http } from '../../../services/http'
import { retryTargetOf } from './aiState'

/*
 * THE AI SERVICE STATUS (AI-RESILIENCE-SPEC §6.4). Both reads sit under the
 * admin group and answer every member of staff, never a client. The status is
 * cached on the server for 60 s and holds no client data.
 *
 *   GET /admin/ai/status                    the families, their chains, the open incidents, the work waiting
 *   GET /admin/ai/status/history?days=7     per model per hour, and the incidents of the period (1 to 30 days)
 */

export async function fetchAiServiceStatus() {
  const response = await http.get('/admin/ai/status')
  return response.data
}

export async function fetchAiServiceHistory(days = 7) {
  const response = await http.get('/admin/ai/status/history', { params: { days } })
  return response.data
}

/*
 * RETRY NOW (§5.2) is the server's own route, never the step's start request
 * (fix review of 23 Oct 2026: a start request sent while a run waits is refused,
 * generation_in_progress). The run names itself: its `kind` and `subject_id`, as
 * every generation state the server sends carries them.
 *
 *   POST /admin/ai/generations/{kind}/{subject}/retry-now   no body; 202 with the run
 *
 * The server gives the waiting run a new run id, sets it back to queued and
 * queues a fresh job; the job it replaces wakes later and makes no call. It is
 * not a new run: it counts against no limit, and a second click is refused.
 */
export async function retryAiGenerationNow(run) {
  const target = retryTargetOf(run)
  if (!target) throw new Error('This AI run does not name its kind and subject, so it cannot be queued again from here.')
  const response = await http.post(`/admin/ai/generations/${encodeURIComponent(target.kind)}/${encodeURIComponent(target.subjectId)}/retry-now`)
  return response.data
}
