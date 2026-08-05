import { http } from '../../../services/http'

/**
 * A course's whole structure in one request.
 *
 * The old screens were organised by type — every unit across every programme on
 * one page, every lesson on another — which is a filing cabinet, not a
 * workspace. And the unit list never counted anything, so units full of lessons
 * reported zero and read as empty.
 */
export async function fetchProgramContentTree(programId) {
  const response = await http.get(`/admin/programs/${programId}/content-tree`)
  return response.data
}

/**
 * Activities had no read or write path at all: generated, counted, and
 * unreachable. They reach learners, so they belong in the review chain.
 */
export async function updateActivity(activityId, payload) {
  const response = await http.put(`/admin/activities/${activityId}`, payload)
  return response.data
}

/*
 * Activities had UPDATE and nothing else — the generator made them and the
 * interface could only edit what it happened to produce. A reviewer who
 * decided a lesson needed one more, or one fewer, had no way to say so.
 *
 * Delete is refused by the server when learners have already submitted
 * (ACTIVITY_HAS_SUBMISSIONS); deactivate instead. The refusal carries the
 * count, so it is worth showing verbatim.
 */
export async function createActivity(payload) {
  const response = await http.post('/admin/activities', payload)
  return response.data
}

export async function deleteActivity(activityId) {
  const response = await http.delete(`/admin/activities/${activityId}`)
  return response.data
}
