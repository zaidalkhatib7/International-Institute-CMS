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
import { getAdminLanguage } from '../../../services/languageStorage'
import { formatLocalizedNumber } from '../../../utils/localization'
import { fetchAiQuizSettings, updateAiQuizSettings } from '../services/aiQuizSettingsService'

function unwrap(payload) {
  return payload?.data?.data || payload?.data || payload
}

const copyByLanguage = {
  ar: {
    title: 'إعدادات بنك الأسئلة بالذكاء الاصطناعي', description: 'تحكم في طريقة تحويل Gemini لملفات PDF التعليمية إلى مسودات بنوك أسئلة متعددة اللغات وقابلة للمراجعة.',
    loadError: 'تعذر تحميل إعدادات بنك الأسئلة بالذكاء الاصطناعي.', promptMinimum: 'يجب ألا تقل تعليمات التوليد عن 50 حرفًا.', saved: 'تم حفظ تعليمات توليد الأسئلة من PDF.', saveError: 'تعذر حفظ إعدادات بنك الأسئلة بالذكاء الاصطناعي.',
    promptTitle: 'تعليمات التوليد', promptDescription: 'تُطبق هذه التعليمات على كل عملية استيراد من PDF. أبقِ المتغير {token} في الموضع الذي يجب أن يظهر فيه عدد الأسئلة المطلوب.', loading: 'جارٍ تحميل الإعدادات...', characters: 'حرف', saving: 'جارٍ الحفظ...', save: 'حفظ التعليمات',
    connection: 'اتصال الخادم', status: 'الحالة', configured: 'مهيأ', missingKey: 'مفتاح API غير موجود', model: 'النموذج', pdfLimit: 'حد ملف PDF', keySafety: 'حماية المفتاح السري', keySafetyDescription: 'يقرأ Laravel المفتاح من GEMINI_API_KEY داخل بيئة الخادم فقط، ولا يُعاد إلى واجهة CMS مطلقًا. غيّر المفتاح أو دوّره في بيئة الخادم ثم أعد تشغيل Herd.',
  },
  en: {
    title: 'AI Question Bank Settings', description: 'Control how Gemini turns teaching PDFs into reviewable multilingual question-bank drafts.',
    loadError: 'Could not load AI quiz settings.', promptMinimum: 'The generation prompt must contain at least 50 characters.', saved: 'The PDF question-generation prompt was saved.', saveError: 'Could not save AI quiz settings.',
    promptTitle: 'Generation prompt', promptDescription: 'This instruction is applied to every PDF import. Keep {token} where the requested number of questions should appear.', loading: 'Loading settings...', characters: 'characters', saving: 'Saving...', save: 'Save prompt',
    connection: 'Backend connection', status: 'Status', configured: 'Configured', missingKey: 'API key missing', model: 'Model', pdfLimit: 'PDF limit', keySafety: 'Secret-key safety', keySafetyDescription: 'Laravel reads the key only from GEMINI_API_KEY in the backend environment. It is never returned to this CMS. Change or rotate it in the backend environment, then restart Herd.',
  },
  nl: {
    title: 'AI-instellingen voor de vragenbank', description: 'Bepaal hoe Gemini onderwijs-pdf’s omzet in controleerbare, meertalige vragenbankconcepten.',
    loadError: 'De AI-instellingen voor toetsen konden niet worden geladen.', promptMinimum: 'De generatieprompt moet minimaal 50 tekens bevatten.', saved: 'De prompt voor het genereren van vragen uit pdf is opgeslagen.', saveError: 'De AI-instellingen voor toetsen konden niet worden opgeslagen.',
    promptTitle: 'Generatieprompt', promptDescription: 'Deze instructie geldt voor elke pdf-import. Behoud {token} op de plaats waar het gevraagde aantal vragen moet verschijnen.', loading: 'Instellingen worden geladen...', characters: 'tekens', saving: 'Opslaan...', save: 'Prompt opslaan',
    connection: 'Backendverbinding', status: 'Status', configured: 'Geconfigureerd', missingKey: 'API-sleutel ontbreekt', model: 'Model', pdfLimit: 'Pdf-limiet', keySafety: 'Beveiliging van de geheime sleutel', keySafetyDescription: 'Laravel leest de sleutel uitsluitend uit GEMINI_API_KEY in de backendomgeving. De sleutel wordt nooit aan dit CMS teruggestuurd. Wijzig of roteer hem in de backendomgeving en start Herd daarna opnieuw.',
  },
}

export default function AiQuizSettingsPage() {
  const language = getAdminLanguage()
  const copy = copyByLanguage[language] || copyByLanguage.en
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
        setError(readApiError(err, copy.loadError))
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [copy.loadError])

  const handleSave = async () => {
    setError('')
    setNotice('')

    if (prompt.trim().length < 50) {
      setError(copy.promptMinimum)
      return
    }

    setIsSaving(true)
    try {
      const data = unwrap(await updateAiQuizSettings(prompt.trim()))
      setSettings(data)
      setPrompt(data.prompt)
      setNotice(copy.saved)
    } catch (err) {
      setError(readApiError(err, copy.saveError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader
        title={copy.title}
        description={copy.description}
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
              {copy.promptTitle}
            </CardTitle>
            <CardDescription>
              {copy.promptDescription.split('{token}')[0]}<bdi className="font-mono">{'{{question_count}}'}</bdi>{copy.promptDescription.split('{token}')[1]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-[var(--color-text-muted)]">{copy.loading}</div>
            ) : (
              <>
                <Textarea
                  rows={18}
                  dir="auto"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  inputClassName="font-mono text-sm leading-6"
                  hint={`${formatLocalizedNumber(prompt.length, language)} / ${formatLocalizedNumber(10000, language)} ${copy.characters}`}
                />
                <div className="mt-5 flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save size={18} />
                    {isSaving ? copy.saving : copy.save}
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
                {copy.connection}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--color-text-muted)]">{copy.status}</span>
                <Badge variant={settings?.is_configured ? 'success' : 'danger'}>
                  {settings?.is_configured ? copy.configured : copy.missingKey}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--color-text-muted)]">{copy.model}</span>
                <bdi className="text-sm font-semibold text-[var(--color-text)]">{settings?.model || '—'}</bdi>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--color-text-muted)]">{copy.pdfLimit}</span>
                <span className="text-sm font-semibold text-[var(--color-text)]">{settings?.max_pdf_size_mb ? formatLocalizedNumber(settings.max_pdf_size_mb, language) : '—'} MB</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <ShieldCheck size={21} className="text-[var(--color-success)]" />
                {copy.keySafety}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-[var(--color-text-muted)]">
                {copy.keySafetyDescription}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
