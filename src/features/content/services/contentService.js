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
