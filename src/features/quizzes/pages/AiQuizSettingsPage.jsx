import { useEffect, useState } from 'react'
import { Bot, CheckCircle2, KeyRound, Save, ShieldCheck, TriangleAlert } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  Textarea,
} from '../../../components/ui'
import { readApiError } from '../../../services/apiResponse'
import { fetchAiQuizSettings, updateAiQuizSettings } from '../services/aiQuizSettingsService'

function unwrap(payload) {
  return payload?.data?.data || payload?.data || payload
}

export default function AiQuizSettingsPage() {
  const [settings, setSettings] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = unwrap(await fetchAiQuizSettings())
        setSettings(data)
        setPrompt(data?.prompt || '')
      } catch (err) {
        setError(readApiError(err, 'Could not load AI quiz settings.'))
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const handleSave = async () => {
    setError('')
    setNotice('')

    if (prompt.trim().length < 50) {
      setError('The prompt must contain at least 50 characters.')
      return
    }

    setIsSaving(true)
    try {
      const data = unwrap(await updateAiQuizSettings(prompt.trim()))
      setSettings(data)
      setPrompt(data.prompt)
      setNotice('The PDF question-generation prompt was saved.')
    } catch (err) {
      setError(readApiError(err, 'Could not save AI quiz settings.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="AI Question Bank Settings"
        description="Control how Gemini turns teaching PDFs into reviewable multilingual question-bank drafts."
      />

      {notice ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <TriangleAlert size={18} />
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Bot size={22} className="text-[var(--color-accent)]" />
              Generation prompt
            </CardTitle>
            <CardDescription>
              This instruction is applied to every PDF import. Keep {'{{question_count}}'} where the requested number of questions should appear.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-[var(--color-text-muted)]">Loading settings...</div>
            ) : (
              <>
                <Textarea
                  rows={18}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  inputClassName="font-mono text-sm leading-6"
                  hint={`${prompt.length.toLocaleString()} / 10,000 characters`}
                />
                <div className="mt-5 flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save size={18} />
                    {isSaving ? 'Saving...' : 'Save prompt'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <KeyRound size={21} className="text-[var(--color-accent)]" />
                Backend connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--color-text-muted)]">Status</span>
                <Badge variant={settings?.is_configured ? 'success' : 'danger'}>
                  {settings?.is_configured ? 'Configured' : 'API key missing'}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--color-text-muted)]">Model</span>
                <span className="text-sm font-semibold text-[var(--color-text)]">{settings?.model || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--color-text-muted)]">PDF limit</span>
                <span className="text-sm font-semibold text-[var(--color-text)]">{settings?.max_pdf_size_mb || '—'} MB</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <ShieldCheck size={21} className="text-[var(--color-success)]" />
                Secret-key safety
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-[var(--color-text-muted)]">
                The API key is read only by Laravel from GEMINI_API_KEY. It is never returned to this CMS. Change or rotate it in the backend environment, then restart Herd.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
