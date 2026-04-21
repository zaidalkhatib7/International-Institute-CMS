import { useEffect, useMemo, useState } from 'react'
import { Globe, Play, Type } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  Textarea,
} from '../../../components/ui'
import {
  createAdminLesson,
  fetchAdminLessonById,
  fetchAdminSections,
  updateAdminLesson,
} from '../services/lessonsService'
import { getCurrentLanguage, readLocalizedValue } from '../../../utils/localization'

function readLocalized(value) {
  return readLocalizedValue(value)
}

function normalizePayload(payload) {
  return payload?.data?.data || payload?.data || payload
}

function getSectionTitle(section) {
  return readLocalized(section?.title) || `Section ${section?.id ?? ''}`.trim()
}

function mapLessonToFormData(lesson) {
  return {
    section_id: lesson?.course_section_id ? String(lesson.course_section_id) : '',
    type: lesson?.type || 'text',
    sort_order: lesson?.sort_order != null ? String(lesson.sort_order) : '1',
    title: {
      en: readLocalized(lesson?.title),
      ar: lesson?.title?.ar || '',
      nl: lesson?.title?.nl || '',
    },
    text_content: {
      en: readLocalized(lesson?.text_content),
      ar: lesson?.text_content?.ar || '',
      nl: lesson?.text_content?.nl || '',
    },
    video_url: lesson?.video_url || '',
    video_duration_minutes:
      lesson?.video_duration_minutes != null ? String(lesson.video_duration_minutes) : '',
  }
}

function buildLessonPayload(formData) {
  return {
    section_id: formData.section_id ? Number(formData.section_id) : null,
    title: {
      en: formData.title?.en || '',
      ar: formData.title?.ar || '',
      nl: formData.title?.nl || '',
    },
    type: formData.type || 'text',
    text_content: {
      en: formData.text_content?.en || '',
      ar: formData.text_content?.ar || '',
      nl: formData.text_content?.nl || '',
    },
    video_url: formData.video_url || null,
    video_duration_minutes:
      formData.video_duration_minutes === '' ? null : Number(formData.video_duration_minutes),
    sort_order: formData.sort_order === '' ? 1 : Number(formData.sort_order),
  }
}

function LanguageTabs({ activeLanguage, onChange }) {
  const languages = ['en', 'ar', 'nl']
  return (
    <div className="inline-flex rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1">
      {languages.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold uppercase ${
            activeLanguage === lang
              ? 'bg-white text-[var(--color-text)] shadow-sm'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}

export default function LessonBuilderPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const lessonId = searchParams.get('id') || ''
  const isEditMode = Boolean(lessonId)
  const language = getCurrentLanguage()
  const copy = useMemo(() => {
    if (language === 'ar') {
      return {
        editLesson: 'تعديل الدرس',
        createLesson: 'إنشاء درس',
        breadcrumbAdmin: 'الإدارة',
        breadcrumbLessons: 'الدروس',
        subtitle: 'ضبط محتوى الدرس ونوعه وترتيبه داخل القسم.',
        backToLessons: 'العودة إلى الدروس',
        saveLesson: 'حفظ الدرس',
        saving: 'جاري الحفظ...',
        loadingLesson: 'جاري تحميل الدرس...',
        lessonBasics: 'أساسيات الدرس',
        section: 'القسم',
        selectSection: 'اختر قسمًا',
        lessonType: 'نوع الدرس',
        typeText: 'نصي',
        typeVideo: 'فيديو',
        typeBoth: 'كلاهما',
        sortOrder: 'ترتيب العرض',
        lessonTitle: 'عنوان الدرس',
        lessonTitlePlaceholder: 'مثال: أساسيات القيادة',
        textContent: 'المحتوى النصي',
        lessonBody: 'محتوى الدرس',
        lessonBodyPlaceholder: 'اكتب محتوى الدرس...',
        videoContent: 'محتوى الفيديو',
        videoUrl: 'رابط الفيديو',
        videoDuration: 'مدة الفيديو (دقائق)',
        lessonSnapshot: 'ملخص الدرس',
        type: 'النوع',
        sectionRequired: 'القسم مطلوب.',
        englishTitleRequired: 'عنوان الدرس (EN) مطلوب.',
        lessonTypeRequired: 'نوع الدرس مطلوب.',
        sortOrderRequired: 'ترتيب العرض مطلوب.',
        created: 'تم إنشاء الدرس بنجاح.',
        updated: 'تم تحديث الدرس بنجاح.',
        loadError: 'فشل تحميل الدرس.',
        saveError: 'فشل حفظ الدرس.',
      }
    }
    if (language === 'nl') {
      return {
        editLesson: 'Les bewerken',
        createLesson: 'Les maken',
        breadcrumbAdmin: 'Beheer',
        breadcrumbLessons: 'Lessen',
        subtitle: 'Configureer lesinhoud, type en volgorde binnen de sectie.',
        backToLessons: 'Terug naar lessen',
        saveLesson: 'Les opslaan',
        saving: 'Opslaan...',
        loadingLesson: 'Les laden...',
        lessonBasics: 'Lesbasis',
        section: 'Sectie',
        selectSection: 'Selecteer sectie',
        lessonType: 'Lestype',
        typeText: 'Tekst',
        typeVideo: 'Video',
        typeBoth: 'Beide',
        sortOrder: 'Volgorde',
        lessonTitle: 'Lestitel',
        lessonTitlePlaceholder: 'bijv. Foundations of Leadership',
        textContent: 'Tekstinhoud',
        lessonBody: 'Lesinhoud',
        lessonBodyPlaceholder: 'Schrijf lesinhoud...',
        videoContent: 'Videoinhoud',
        videoUrl: 'Video-URL',
        videoDuration: 'Videoduur (minuten)',
        lessonSnapshot: 'Lesoverzicht',
        type: 'Type',
        sectionRequired: 'Sectie is verplicht.',
        englishTitleRequired: 'Engelse lestitel is verplicht.',
        lessonTypeRequired: 'Lestype is verplicht.',
        sortOrderRequired: 'Volgorde is verplicht.',
        created: 'Les succesvol aangemaakt.',
        updated: 'Les succesvol bijgewerkt.',
        loadError: 'Les laden mislukt.',
        saveError: 'Les opslaan mislukt.',
      }
    }
    return {
      editLesson: 'Edit Lesson',
      createLesson: 'Create Lesson',
      breadcrumbAdmin: 'Admin',
      breadcrumbLessons: 'Lessons',
      subtitle: 'Configure lesson content, type, and ordering within its section.',
      backToLessons: 'Back to Lessons',
      saveLesson: 'Save Lesson',
      saving: 'Saving...',
      loadingLesson: 'Loading lesson...',
      lessonBasics: 'Lesson Basics',
      section: 'Section',
      selectSection: 'Select section',
      lessonType: 'Lesson Type',
      typeText: 'Text',
      typeVideo: 'Video',
      typeBoth: 'Both',
      sortOrder: 'Sort Order',
      lessonTitle: 'Lesson Title',
      lessonTitlePlaceholder: 'e.g. Foundations of Leadership',
      textContent: 'Text Content',
      lessonBody: 'Lesson Body',
      lessonBodyPlaceholder: 'Write lesson content...',
      videoContent: 'Video Content',
      videoUrl: 'Video URL',
      videoDuration: 'Video Duration (minutes)',
      lessonSnapshot: 'Lesson Snapshot',
      type: 'Type',
      sectionRequired: 'Section is required.',
      englishTitleRequired: 'English lesson title is required.',
      lessonTypeRequired: 'Lesson type is required.',
      sortOrderRequired: 'Sort order is required.',
      created: 'Lesson created successfully.',
      updated: 'Lesson updated successfully.',
      loadError: 'Failed to load lesson.',
      saveError: 'Failed to save lesson.',
    }
  }, [language])

  const [sections, setSections] = useState([])
  const [activeLanguage, setActiveLanguage] = useState('en')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  const [formData, setFormData] = useState({
    section_id: '',
    type: 'text',
    sort_order: '1',
    title: { en: '', ar: '', nl: '' },
    text_content: { en: '', ar: '', nl: '' },
    video_url: '',
    video_duration_minutes: '',
  })

  useEffect(() => {
    const loadSections = async () => {
      try {
        const result = await fetchAdminSections()
        const raw = result?.data?.data || result?.data || []
        setSections(Array.isArray(raw) ? raw : [])
      } catch (err) {
        console.error('Failed to load sections', err)
      }
    }

    loadSections()
  }, [])

  useEffect(() => {
    const loadLesson = async () => {
      if (!lessonId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const result = await fetchAdminLessonById(lessonId)
        const lesson = normalizePayload(result)
        setFormData(mapLessonToFormData(lesson))
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || copy.loadError
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadLesson()
  }, [lessonId, copy.loadError])

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const updateLocalizedField = (field, language, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [language]: value,
      },
    }))
  }

  const validateBeforeSave = () => {
    if (!formData.section_id) return copy.sectionRequired
    if (!formData.title?.en?.trim()) return copy.englishTitleRequired
    if (!formData.type) return copy.lessonTypeRequired
    if (!formData.sort_order) return copy.sortOrderRequired
    return ''
  }

  const handleSave = async () => {
    const validationError = validateBeforeSave()
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setIsSaving(true)
    setSaveError('')
    setSaveMessage('')

    try {
      const payload = buildLessonPayload(formData)
      let targetLessonId = lessonId

      if (targetLessonId) {
        await updateAdminLesson(targetLessonId, payload)
      } else {
        const createdResult = await createAdminLesson(payload)
        const createdLesson = normalizePayload(createdResult)
        const createdId = createdLesson?.id

        if (!createdId) {
          throw new Error(copy.saveError)
        }

        targetLessonId = String(createdId)
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('id', targetLessonId)
        setSearchParams(nextParams)
      }

      const refreshed = await fetchAdminLessonById(targetLessonId)
      const refreshedLesson = normalizePayload(refreshed)
      setFormData(mapLessonToFormData(refreshedLesson))
      setSaveMessage(isEditMode ? copy.updated : copy.created)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || copy.saveError
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const titleText = useMemo(() => {
    const defaultTitle = isEditMode ? copy.editLesson : copy.createLesson
    return formData.title?.[activeLanguage] || formData.title?.en || defaultTitle
  }, [formData.title, activeLanguage, isEditMode, copy.editLesson, copy.createLesson])

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm text-[var(--color-text-muted)]">
            {copy.breadcrumbAdmin} &nbsp;&gt;&nbsp; {copy.breadcrumbLessons} &nbsp;&gt;&nbsp;
            <span className="font-semibold text-[var(--color-accent-dark,#765A1F)]">
              {isEditMode ? copy.editLesson : copy.createLesson}
            </span>
          </p>

          <h1 className="mt-4 text-6xl font-bold text-[var(--color-text)]">{titleText}</h1>
          <p className="mt-3 max-w-3xl text-2xl text-[var(--color-text-muted)]">
            {copy.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="!h-16 !rounded-[20px] !px-8 !text-lg"
            onClick={() => navigate('/lessons')}
          >
            {copy.backToLessons}
          </Button>

          <Button
            className="!h-16 !rounded-[20px] !px-8 !text-lg"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? copy.saving : isEditMode ? copy.saveLesson : copy.createLesson}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {saveMessage ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {saveMessage}
          </div>
        ) : null}

        {saveError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
            {saveError}
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-[var(--color-text-muted)]">{copy.loadingLesson}</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-red-600">{error}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[1.8fr_0.9fr]">
          <div className="space-y-8">
            <Card>
              <CardContent className="p-8">
                <div className="mb-8 flex items-center gap-3">
                  <Type size={24} className="text-[var(--color-accent-dark,#765A1F)]" />
                  <h2 className="text-3xl font-bold text-[var(--color-text)]">{copy.lessonBasics}</h2>
                </div>

                <div className="space-y-6">
                  <Select
                    label={copy.section}
                    value={formData.section_id}
                    onChange={(e) => updateField('section_id', e.target.value)}
                  >
                    <option value="">{copy.selectSection}</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {getSectionTitle(section)}
                      </option>
                    ))}
                  </Select>

                  <Select
                    label={copy.lessonType}
                    value={formData.type}
                    onChange={(e) => updateField('type', e.target.value)}
                  >
                    <option value="text">{copy.typeText}</option>
                    <option value="video">{copy.typeVideo}</option>
                    <option value="both">{copy.typeBoth}</option>
                  </Select>

                  <Input
                    label={copy.sortOrder}
                    type="number"
                    min="1"
                    value={formData.sort_order}
                    onChange={(e) => updateField('sort_order', e.target.value)}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <label className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                        {copy.lessonTitle}
                      </label>
                      <LanguageTabs
                        activeLanguage={activeLanguage}
                        onChange={setActiveLanguage}
                      />
                    </div>

                    <Input
                      placeholder={copy.lessonTitlePlaceholder}
                      value={formData.title?.[activeLanguage] || ''}
                      onChange={(e) =>
                        updateLocalizedField('title', activeLanguage, e.target.value)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {formData.type === 'text' || formData.type === 'both' ? (
              <Card>
                <CardContent className="p-8">
                  <div className="mb-8 flex items-center gap-3">
                    <Globe size={24} className="text-[var(--color-accent-dark,#765A1F)]" />
                    <h2 className="text-3xl font-bold text-[var(--color-text)]">{copy.textContent}</h2>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <label className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                        {copy.lessonBody}
                      </label>
                      <LanguageTabs
                        activeLanguage={activeLanguage}
                        onChange={setActiveLanguage}
                      />
                    </div>

                    <Textarea
                      rows={10}
                      placeholder={copy.lessonBodyPlaceholder}
                      value={formData.text_content?.[activeLanguage] || ''}
                      onChange={(e) =>
                        updateLocalizedField('text_content', activeLanguage, e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {formData.type === 'video' || formData.type === 'both' ? (
              <Card>
                <CardContent className="p-8">
                  <div className="mb-8 flex items-center gap-3">
                    <Play size={24} className="text-[var(--color-accent-dark,#765A1F)]" />
                    <h2 className="text-3xl font-bold text-[var(--color-text)]">{copy.videoContent}</h2>
                  </div>

                  <div className="space-y-6">
                    <Input
                      label={copy.videoUrl}
                      placeholder="https://youtube.com/..."
                      value={formData.video_url}
                      onChange={(e) => updateField('video_url', e.target.value)}
                    />

                    <Input
                      label={copy.videoDuration}
                      type="number"
                      min="0"
                      placeholder="10"
                      value={formData.video_duration_minutes}
                      onChange={(e) =>
                        updateField('video_duration_minutes', e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                  {copy.lessonSnapshot}
                </h3>

                <div className="mt-8 space-y-5 text-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">{copy.type}</span>
                    <span className="font-medium text-[var(--color-text)]">
                      {formData.type === 'text'
                        ? copy.typeText
                        : formData.type === 'video'
                        ? copy.typeVideo
                        : copy.typeBoth}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">{copy.sortOrder}</span>
                    <span className="font-medium text-[var(--color-text)]">
                      {formData.sort_order || '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">{copy.section}</span>
                    <span className="max-w-[170px] truncate text-right font-medium text-[var(--color-text)]">
                      {sections.find((item) => String(item.id) === String(formData.section_id))
                        ? getSectionTitle(
                            sections.find(
                              (item) => String(item.id) === String(formData.section_id)
                            )
                          )
                        : '-'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
