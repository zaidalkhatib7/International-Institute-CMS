import { http } from '../../../services/http'

export async function fetchAiQuizSettings() {
  const response = await http.get('/admin/ai/quiz-settings')
  return response.data
}

export async function updateAiQuizSettings(prompt) {
  const response = await http.put('/admin/ai/quiz-settings', { prompt })
  return response.data
}
