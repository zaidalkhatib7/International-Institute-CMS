import { useEffect, useMemo, useState } from 'react'
import { FileText, FolderOpen } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, CardContent, Input, Select, Textarea } from '../../../components/ui'
import { fetchAdminPrograms } from '../../programs/services/programsService'
import {
  createAdminSection,
  fetchAdminSectionById,
  updateAdminSection,
} from '../services/sectionsService'
import { getCurrentLanguage, readLocalizedValue } from '../../../utils/localization'

function readLocalized(value) {
  return readLocalizedValue(value)
}

function normalizePayload(payload) {
  return payload?.data?.data || payload?.data || payload
}

function getProgramTitle(program) {
  return readLocalized(program?.title) || program?.slug || `Program ${program?.id ?? ''}`.trim()
}

function mapSectionToFormData(section) {
  return {
    program_id: section?.program_id ? String(section.program_id) : '',
    sort_order: section?.sort_order != null ? String(section.sort_order) : '1',
    title: {
      en: readLocalized(section?.title),
      ar: section?.title?.ar || '',
      nl: section?.title?.nl || '',
    },
    description: {
      en: readLocalized(section?.description),
      ar: section?.description?.ar || '',
      nl: section?.description?.nl || '',
    },
  }
}

function buildSectionPayload(formData) {
  return {
    program_id: formData.program_id ? Number(formData.program_id) : null,
    title: {
      en: formData.title?.en || '',
      ar: formData.title?.ar || '',
      nl: formData.title?.nl || '',
    },
    description: {
      en: formData.description?.en || '',
      ar: formData.description?.ar || '',
      nl: formData.description?.nl || '',
    },
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

export default function SectionBuilderPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionId = searchParams.get('id') || ''
  const isEditMode = Boolean(sectionId)
  const language = getCurrentLanguage()
  const copy = useMemo(() => {
    if (language === 'ar') {
      return {
        editSection: 'تعديل القسم',
        createSection: 'إنشاء قسم',
        breadcrumbAdmin: 'الإدارة',
        breadcrumbSections: 'الأقسام',
        subtitle: 'ضبط بيانات القسم وترتيبه داخل البرنامج.',
        backToSections: 'العودة إلى الأقسام',
        saveSection: 'حفظ القسم',
        saving: 'جاري الحفظ...',
        loadingSection: 'جاري تحميل القسم...',
        sectionIdentity: 'هوية القسم',
        program: 'البرنامج',
        selectProgram: 'اختر برنامجًا',
        sortOrder: 'ترتيب العرض',
        sectionTitle: 'عنوان القسم',
        sectionTitlePlaceholder: 'مثال: أساسيات القيادة',
        sectionDescription: 'وصف القسم',
        description: 'الوصف',
        descriptionPlaceholder: 'اكتب ما يغطيه هذا القسم...',
        sectionSnapshot: 'ملخص القسم',
        programRequired: 'البرنامج مطلوب.',
        englishTitleRequired: 'عنوان القسم (EN) مطلوب.',
        englishDescriptionRequired: 'وصف القسم (EN) مطلوب.',
        sortOrderRequired: 'ترتيب العرض مطلوب.',
        updated: 'تم تحديث القسم بنجاح.',
        created: 'تم إنشاء القسم بنجاح.',
        loadError: 'فشل تحميل القسم.',
        saveError: 'فشل حفظ القسم.',
      }
    }
    if (language === 'nl') {
      return {
        editSection: 'Sectie bewerken',
        createSection: 'Sectie maken',
        breadcrumbAdmin: 'Beheer',
        breadcrumbSections: 'Secties',
        subtitle: 'Configureer sectiemetadata en volgorde binnen een programma.',
        backToSections: 'Terug naar secties',
        saveSection: 'Sectie opslaan',
        saving: 'Opslaan...',
        loadingSection: 'Sectie laden...',
        sectionIdentity: 'Sectie-identiteit',
        program: 'Programma',
        selectProgram: 'Selecteer programma',
        sortOrder: 'Volgorde',
        sectionTitle: 'Sectietitel',
        sectionTitlePlaceholder: 'bijv. Foundations of Leadership',
        sectionDescription: 'Sectiebeschrijving',
        description: 'Beschrijving',
        descriptionPlaceholder: 'Beschrijf wat deze sectie behandelt...',
        sectionSnapshot: 'Sectie-overzicht',
        programRequired: 'Programma is verplicht.',
        englishTitleRequired: 'Engelse sectietitel is verplicht.',
        englishDescriptionRequired: 'Engelse sectiebeschrijving is verplicht.',
        sortOrderRequired: 'Volgorde is verplicht.',
        updated: 'Sectie succesvol bijgewerkt.',
        created: 'Sectie succesvol aangemaakt.',
        loadError: 'Sectie laden mislukt.',
        saveError: 'Sectie opslaan mislukt.',
      }
    }
    return {
      editSection: 'Edit Section',
      createSection: 'Create Section',
      breadcrumbAdmin: 'Admin',
      breadcrumbSections: 'Sections',
      subtitle: 'Configure section metadata and ordering within a program.',
      backToSections: 'Back to Sections',
      saveSection: 'Save Section',
      saving: 'Saving...',
      loadingSection: 'Loading section...',
      sectionIdentity: 'Section Identity',
      program: 'Program',
      selectProgram: 'Select program',
      sortOrder: 'Sort Order',
      sectionTitle: 'Section Title',
      sectionTitlePlaceholder: 'e.g. Foundations of Leadership',
      sectionDescription: 'Section Description',
      description: 'Description',
      descriptionPlaceholder: 'Describe what this section covers...',
      sectionSnapshot: 'Section Snapshot',
      programRequired: 'Program is required.',
      englishTitleRequired: 'English section title is required.',
      englishDescriptionRequired: 'English section description is required.',
      sortOrderRequired: 'Sort order is required.',
      updated: 'Section updated successfully.',
      created: 'Section created successfully.',
      loadError: 'Failed to load section.',
      saveError: 'Failed to save section.',
    }
  }, [language])

  const [programs, setPrograms] = useState([])
  const [activeLanguage, setActiveLanguage] = useState('en')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  const [formData, setFormData] = useState({
    program_id: '',
    sort_order: '1',
    title: { en: '', ar: '', nl: '' },
    description: { en: '', ar: '', nl: '' },
  })

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const result = await fetchAdminPrograms()
        const raw = result?.data?.data || result?.data || []
        setPrograms(Array.isArray(raw) ? raw : [])
      } catch (err) {
        console.error('Failed to load programs', err)
      }
    }

    loadPrograms()
  }, [])

  useEffect(() => {
    const loadSection = async () => {
      if (!sectionId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const result = await fetchAdminSectionById(sectionId)
        const section = normalizePayload(result)
        setFormData(mapSectionToFormData(section))
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || copy.loadError
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadSection()
  }, [sectionId, copy.loadError])

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
    if (!formData.program_id) return copy.programRequired
    if (!formData.title?.en?.trim()) return copy.englishTitleRequired
    if (!formData.description?.en?.trim()) return copy.englishDescriptionRequired
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
      const payload = buildSectionPayload(formData)
      let targetSectionId = sectionId

      if (targetSectionId) {
        await updateAdminSection(targetSectionId, payload)
      } else {
        const createdResult = await createAdminSection(payload)
        const createdSection = normalizePayload(createdResult)
        const createdId = createdSection?.id

        if (!createdId) {
          throw new Error(copy.saveError)
        }

        targetSectionId = String(createdId)
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('id', targetSectionId)
        setSearchParams(nextParams)
      }

      const refreshed = await fetchAdminSectionById(targetSectionId)
      const refreshedSection = normalizePayload(refreshed)
      setFormData(mapSectionToFormData(refreshedSection))
      setSaveMessage(isEditMode ? copy.updated : copy.created)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || copy.saveError
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const titleText = useMemo(() => {
    const defaultTitle = isEditMode ? copy.editSection : copy.createSection
    return formData.title?.[activeLanguage] || formData.title?.en || defaultTitle
  }, [formData.title, activeLanguage, isEditMode, copy.editSection, copy.createSection])

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm text-[var(--color-text-muted)]">
            {copy.breadcrumbAdmin} &nbsp;&gt;&nbsp; {copy.breadcrumbSections} &nbsp;&gt;&nbsp;
            <span className="font-semibold text-[var(--color-accent-dark,#765A1F)]">
              {isEditMode ? copy.editSection : copy.createSection}
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
            onClick={() => navigate('/sections')}
          >
            {copy.backToSections}
          </Button>

          <Button
            className="!h-16 !rounded-[20px] !px-8 !text-lg"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? copy.saving : isEditMode ? copy.saveSection : copy.createSection}
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
          <CardContent className="p-8 text-[var(--color-text-muted)]">{copy.loadingSection}</CardContent>
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
                  <FolderOpen size={24} className="text-[var(--color-accent-dark,#765A1F)]" />
                  <h2 className="text-3xl font-bold text-[var(--color-text)]">{copy.sectionIdentity}</h2>
                </div>

                <div className="space-y-6">
                  <Select
                    label={copy.program}
                    value={formData.program_id}
                    onChange={(e) => updateField('program_id', e.target.value)}
                  >
                    <option value="">{copy.selectProgram}</option>
                    {programs.map((program) => (
                      <option key={program.id} value={String(program.id)}>
                        {getProgramTitle(program)}
                      </option>
                    ))}
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
                        {copy.sectionTitle}
                      </label>
                      <LanguageTabs
                        activeLanguage={activeLanguage}
                        onChange={setActiveLanguage}
                      />
                    </div>
                    <Input
                      placeholder={copy.sectionTitlePlaceholder}
                      value={formData.title?.[activeLanguage] || ''}
                      onChange={(e) =>
                        updateLocalizedField('title', activeLanguage, e.target.value)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <div className="mb-8 flex items-center gap-3">
                  <FileText size={24} className="text-[var(--color-accent-dark,#765A1F)]" />
                  <h2 className="text-3xl font-bold text-[var(--color-text)]">{copy.sectionDescription}</h2>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                      {copy.description}
                    </label>
                    <LanguageTabs activeLanguage={activeLanguage} onChange={setActiveLanguage} />
                  </div>
                  <Textarea
                    rows={8}
                    placeholder={copy.descriptionPlaceholder}
                    value={formData.description?.[activeLanguage] || ''}
                    onChange={(e) =>
                      updateLocalizedField('description', activeLanguage, e.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                  {copy.sectionSnapshot}
                </h3>

                <div className="mt-8 space-y-5 text-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">{copy.program}</span>
                    <span className="max-w-[170px] truncate text-right font-medium text-[var(--color-text)]">
                      {programs.find((item) => String(item.id) === String(formData.program_id))
                        ? getProgramTitle(
                            programs.find(
                              (item) => String(item.id) === String(formData.program_id)
                            )
                          )
                        : '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">{copy.sortOrder}</span>
                    <span className="font-medium text-[var(--color-text)]">
                      {formData.sort_order || '-'}
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
