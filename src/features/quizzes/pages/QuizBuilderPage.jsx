import { useEffect, useMemo, useState } from 'react'
import { CircleCheckBig, FileQuestion, Plus, Trash2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, CardContent, Input, Select, Textarea } from '../../../components/ui'
import { fetchAdminSections } from '../../sections/services/sectionsService'
import {
  createAdminQuiz,
  fetchAdminQuizById,
  updateAdminQuiz,
} from '../services/quizzesService'
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

function createEmptyOption(sortOrder) {
  return {
    option_text: { en: '', ar: '', nl: '' },
    is_correct: false,
    sort_order: sortOrder,
  }
}

function createEmptyQuestion(sortOrder) {
  return {
    question_text: { en: '', ar: '', nl: '' },
    sort_order: sortOrder,
    options: [
      createEmptyOption(1),
      createEmptyOption(2),
      createEmptyOption(3),
      createEmptyOption(4),
    ],
  }
}

function mapQuizToFormData(quiz) {
  return {
    section_id: quiz?.course_section_id ? String(quiz.course_section_id) : '',
    pass_percentage:
      quiz?.pass_percentage != null ? String(quiz.pass_percentage) : '70',
    title: {
      en: readLocalized(quiz?.title),
      ar: quiz?.title?.ar || '',
      nl: quiz?.title?.nl || '',
    },
    questions: Array.isArray(quiz?.questions) && quiz.questions.length
      ? quiz.questions.map((question, questionIndex) => ({
          question_text: {
            en: readLocalized(question?.question_text),
            ar: question?.question_text?.ar || '',
            nl: question?.question_text?.nl || '',
          },
          sort_order: question?.sort_order ?? questionIndex + 1,
          options:
            Array.isArray(question?.options) && question.options.length
              ? question.options.map((option, optionIndex) => ({
                  option_text: {
                    en: readLocalized(option?.option_text),
                    ar: option?.option_text?.ar || '',
                    nl: option?.option_text?.nl || '',
                  },
                  is_correct: Boolean(option?.is_correct),
                  sort_order: option?.sort_order ?? optionIndex + 1,
                }))
              : [
                  createEmptyOption(1),
                  createEmptyOption(2),
                  createEmptyOption(3),
                  createEmptyOption(4),
                ],
        }))
      : [createEmptyQuestion(1)],
  }
}

function buildQuizPayload(formData) {
  return {
    section_id: formData.section_id ? Number(formData.section_id) : null,
    title: {
      en: formData.title?.en || '',
      ar: formData.title?.ar || '',
      nl: formData.title?.nl || '',
    },
    pass_percentage:
      formData.pass_percentage === '' ? 70 : Number(formData.pass_percentage),
    questions: (formData.questions || []).map((question, questionIndex) => ({
      question_text: {
        en: question?.question_text?.en || '',
        ar: question?.question_text?.ar || '',
        nl: question?.question_text?.nl || '',
      },
      sort_order: question?.sort_order ?? questionIndex + 1,
      options: (question?.options || []).map((option, optionIndex) => ({
        option_text: {
          en: option?.option_text?.en || '',
          ar: option?.option_text?.ar || '',
          nl: option?.option_text?.nl || '',
        },
        is_correct: Boolean(option?.is_correct),
        sort_order: option?.sort_order ?? optionIndex + 1,
      })),
    })),
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

export default function QuizBuilderPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const quizId = searchParams.get('id') || ''
  const isEditMode = Boolean(quizId)
  const language = getCurrentLanguage()
  const copy = useMemo(() => {
    if (language === 'ar') {
      return {
        editQuiz: 'تعديل الاختبار',
        createQuiz: 'إنشاء اختبار',
        breadcrumbAdmin: 'الإدارة',
        breadcrumbQuizzes: 'الاختبارات',
        subtitle: 'إدارة بيانات الاختبار والأسئلة وخيارات الإجابة للقسم.',
        backToQuizzes: 'العودة إلى الاختبارات',
        saveQuiz: 'حفظ الاختبار',
        saving: 'جاري الحفظ...',
        loadingQuiz: 'جاري تحميل الاختبار...',
        quizBasics: 'أساسيات الاختبار',
        section: 'القسم',
        selectSection: 'اختر قسمًا',
        passPercentage: 'نسبة النجاح',
        quizTitle: 'عنوان الاختبار',
        quizTitlePlaceholder: 'مثال: اختبار أساسيات القيادة',
        question: 'السؤال',
        remove: 'إزالة',
        questionText: 'نص السؤال',
        questionPlaceholder: 'اكتب السؤال...',
        option: 'خيار',
        optionPlaceholder: 'نص الخيار...',
        markCorrectTitle: 'تحديد كإجابة صحيحة',
        addQuestion: 'إضافة سؤال',
        sectionRequired: 'القسم مطلوب.',
        englishTitleRequired: 'عنوان الاختبار (EN) مطلوب.',
        passRequired: 'نسبة النجاح مطلوبة.',
        atLeastOneQuestion: 'يجب إضافة سؤال واحد على الأقل.',
        atLeastTwoOptions: 'يجب إضافة خيارين على الأقل.',
        exactlyOneCorrect: 'يجب تحديد إجابة صحيحة واحدة فقط.',
        englishTextRequired: 'النص الإنجليزي مطلوب.',
        updated: 'تم تحديث الاختبار بنجاح.',
        created: 'تم إنشاء الاختبار بنجاح.',
        loadError: 'فشل تحميل الاختبار.',
        saveError: 'فشل حفظ الاختبار.',
      }
    }
    if (language === 'nl') {
      return {
        editQuiz: 'Quiz bewerken',
        createQuiz: 'Quiz maken',
        breadcrumbAdmin: 'Beheer',
        breadcrumbQuizzes: 'Quizzen',
        subtitle: 'Bewerk quizmetadata en vraagopties voor een sectie.',
        backToQuizzes: 'Terug naar quizzen',
        saveQuiz: 'Quiz opslaan',
        saving: 'Opslaan...',
        loadingQuiz: 'Quiz laden...',
        quizBasics: 'Quizbasis',
        section: 'Sectie',
        selectSection: 'Selecteer sectie',
        passPercentage: 'Slagingspercentage',
        quizTitle: 'Quiztitel',
        quizTitlePlaceholder: 'bijv. Leadership Foundations Quiz',
        question: 'Vraag',
        remove: 'Verwijderen',
        questionText: 'Vraagtekst',
        questionPlaceholder: 'Schrijf de vraag...',
        option: 'Optie',
        optionPlaceholder: 'Optietekst...',
        markCorrectTitle: 'Markeer als correct',
        addQuestion: 'Vraag toevoegen',
        sectionRequired: 'Sectie is verplicht.',
        englishTitleRequired: 'Engelse quiztitel is verplicht.',
        passRequired: 'Slagingspercentage is verplicht.',
        atLeastOneQuestion: 'Minimaal een vraag is verplicht.',
        atLeastTwoOptions: 'Minimaal twee opties zijn verplicht.',
        exactlyOneCorrect: 'Precies een correcte optie is verplicht.',
        englishTextRequired: 'Engelse tekst is verplicht.',
        updated: 'Quiz succesvol bijgewerkt.',
        created: 'Quiz succesvol aangemaakt.',
        loadError: 'Quiz laden mislukt.',
        saveError: 'Quiz opslaan mislukt.',
      }
    }
    return {
      editQuiz: 'Edit Quiz',
      createQuiz: 'Create Quiz',
      breadcrumbAdmin: 'Admin',
      breadcrumbQuizzes: 'Quizzes',
      subtitle: 'Build quiz metadata and question options for a section.',
      backToQuizzes: 'Back to Quizzes',
      saveQuiz: 'Save Quiz',
      saving: 'Saving...',
      loadingQuiz: 'Loading quiz...',
      quizBasics: 'Quiz Basics',
      section: 'Section',
      selectSection: 'Select section',
      passPercentage: 'Pass Percentage',
      quizTitle: 'Quiz Title',
      quizTitlePlaceholder: 'e.g. Leadership Foundations Quiz',
      question: 'Question',
      remove: 'Remove',
      questionText: 'Question Text',
      questionPlaceholder: 'Write the question...',
      option: 'Option',
      optionPlaceholder: 'Option text...',
      markCorrectTitle: 'Mark as correct option',
      addQuestion: 'Add Question',
      sectionRequired: 'Section is required.',
      englishTitleRequired: 'English quiz title is required.',
      passRequired: 'Pass percentage is required.',
      atLeastOneQuestion: 'At least one question is required.',
      atLeastTwoOptions: 'At least two options are required.',
      exactlyOneCorrect: 'Exactly one correct option is required.',
      englishTextRequired: 'English text is required.',
      updated: 'Quiz updated successfully.',
      created: 'Quiz created successfully.',
      loadError: 'Failed to load quiz.',
      saveError: 'Failed to save quiz.',
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
    pass_percentage: '70',
    title: { en: '', ar: '', nl: '' },
    questions: [createEmptyQuestion(1)],
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
    const loadQuiz = async () => {
      if (!quizId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const result = await fetchAdminQuizById(quizId)
        const quiz = normalizePayload(result)
        setFormData(mapQuizToFormData(quiz))
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || copy.loadError
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadQuiz()
  }, [quizId, copy.loadError])

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

  const updateQuestionLocalizedField = (questionIndex, language, value) => {
    setFormData((prev) => {
      const nextQuestions = [...prev.questions]
      nextQuestions[questionIndex] = {
        ...nextQuestions[questionIndex],
        question_text: {
          ...nextQuestions[questionIndex].question_text,
          [language]: value,
        },
      }
      return {
        ...prev,
        questions: nextQuestions,
      }
    })
  }

  const updateOptionLocalizedField = (questionIndex, optionIndex, language, value) => {
    setFormData((prev) => {
      const nextQuestions = [...prev.questions]
      const nextOptions = [...nextQuestions[questionIndex].options]
      nextOptions[optionIndex] = {
        ...nextOptions[optionIndex],
        option_text: {
          ...nextOptions[optionIndex].option_text,
          [language]: value,
        },
      }
      nextQuestions[questionIndex] = {
        ...nextQuestions[questionIndex],
        options: nextOptions,
      }
      return {
        ...prev,
        questions: nextQuestions,
      }
    })
  }

  const setCorrectOption = (questionIndex, optionIndex) => {
    setFormData((prev) => {
      const nextQuestions = [...prev.questions]
      const nextOptions = nextQuestions[questionIndex].options.map((option, idx) => ({
        ...option,
        is_correct: idx === optionIndex,
      }))
      nextQuestions[questionIndex] = {
        ...nextQuestions[questionIndex],
        options: nextOptions,
      }
      return {
        ...prev,
        questions: nextQuestions,
      }
    })
  }

  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, createEmptyQuestion(prev.questions.length + 1)],
    }))
  }

  const removeQuestion = (questionIndex) => {
    setFormData((prev) => {
      if (prev.questions.length <= 1) return prev
      const nextQuestions = prev.questions.filter((_, idx) => idx !== questionIndex)
      return {
        ...prev,
        questions: nextQuestions.map((question, idx) => ({
          ...question,
          sort_order: idx + 1,
        })),
      }
    })
  }

  const validateBeforeSave = () => {
    if (!formData.section_id) return copy.sectionRequired
    if (!formData.title?.en?.trim()) return copy.englishTitleRequired
    if (!formData.pass_percentage) return copy.passRequired
    if (!formData.questions.length) return copy.atLeastOneQuestion

    for (let q = 0; q < formData.questions.length; q += 1) {
      const question = formData.questions[q]
      if (!question?.question_text?.en?.trim()) {
        return `${copy.question} ${q + 1}: ${copy.englishTextRequired}`
      }
      if (!Array.isArray(question.options) || question.options.length < 2) {
        return `${copy.question} ${q + 1}: ${copy.atLeastTwoOptions}`
      }
      const correctCount = question.options.filter((option) => option.is_correct).length
      if (correctCount !== 1) {
        return `${copy.question} ${q + 1}: ${copy.exactlyOneCorrect}`
      }
      for (let o = 0; o < question.options.length; o += 1) {
        if (!question.options[o]?.option_text?.en?.trim()) {
          return `${copy.question} ${q + 1}, ${copy.option} ${o + 1}: ${copy.englishTextRequired}`
        }
      }
    }
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
      const payload = buildQuizPayload(formData)
      let targetQuizId = quizId

      if (targetQuizId) {
        await updateAdminQuiz(targetQuizId, payload)
      } else {
        const createdResult = await createAdminQuiz(payload)
        const createdQuiz = normalizePayload(createdResult)
        const createdId = createdQuiz?.id

        if (!createdId) {
          throw new Error(copy.saveError)
        }

        targetQuizId = String(createdId)
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('id', targetQuizId)
        setSearchParams(nextParams)
      }

      const refreshed = await fetchAdminQuizById(targetQuizId)
      const refreshedQuiz = normalizePayload(refreshed)
      setFormData(mapQuizToFormData(refreshedQuiz))
      setSaveMessage(isEditMode ? copy.updated : copy.created)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || copy.saveError
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const titleText = useMemo(() => {
    const defaultTitle = isEditMode ? copy.editQuiz : copy.createQuiz
    return formData.title?.[activeLanguage] || formData.title?.en || defaultTitle
  }, [formData.title, activeLanguage, isEditMode, copy.editQuiz, copy.createQuiz])

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm text-[var(--color-text-muted)]">
            {copy.breadcrumbAdmin} &nbsp;&gt;&nbsp; {copy.breadcrumbQuizzes} &nbsp;&gt;&nbsp;
            <span className="font-semibold text-[var(--color-accent-dark,#765A1F)]">
              {isEditMode ? copy.editQuiz : copy.createQuiz}
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
            onClick={() => navigate('/quizzes')}
          >
            {copy.backToQuizzes}
          </Button>

          <Button
            className="!h-16 !rounded-[20px] !px-8 !text-lg"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? copy.saving : isEditMode ? copy.saveQuiz : copy.createQuiz}
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
          <CardContent className="p-8 text-[var(--color-text-muted)]">{copy.loadingQuiz}</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-red-600">{error}</CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <Card>
            <CardContent className="p-8">
              <div className="mb-8 flex items-center gap-3">
                <FileQuestion size={24} className="text-[var(--color-accent-dark,#765A1F)]" />
                <h2 className="text-3xl font-bold text-[var(--color-text)]">{copy.quizBasics}</h2>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr_1fr]">
                <Select
                  label={copy.section}
                  value={formData.section_id}
                  onChange={(e) => updateField('section_id', e.target.value)}
                >
                  <option value="">{copy.selectSection}</option>
                  {sections.map((section) => (
                    <option key={section.id} value={String(section.id)}>
                      {getSectionTitle(section)}
                    </option>
                  ))}
                </Select>

                <Input
                  label={copy.passPercentage}
                  type="number"
                  min="0"
                  max="100"
                  value={formData.pass_percentage}
                  onChange={(e) => updateField('pass_percentage', e.target.value)}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                      {copy.quizTitle}
                    </label>
                    <LanguageTabs activeLanguage={activeLanguage} onChange={setActiveLanguage} />
                  </div>
                  <Input
                    placeholder={copy.quizTitlePlaceholder}
                    value={formData.title?.[activeLanguage] || ''}
                    onChange={(e) =>
                      updateLocalizedField('title', activeLanguage, e.target.value)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {formData.questions.map((question, questionIndex) => (
              <Card key={`question-${questionIndex}`}>
                <CardContent className="p-8">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-bold text-[var(--color-text)]">
                      {copy.question} {questionIndex + 1}
                    </h3>
                    <div className="flex items-center gap-3">
                      <LanguageTabs
                        activeLanguage={activeLanguage}
                        onChange={setActiveLanguage}
                      />
                      <Button
                        variant="outline"
                        onClick={() => removeQuestion(questionIndex)}
                        disabled={formData.questions.length <= 1}
                      >
                        <Trash2 size={16} />
                        {copy.remove}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <Textarea
                      rows={3}
                      label={`${copy.questionText} (${activeLanguage.toUpperCase()})`}
                      placeholder={copy.questionPlaceholder}
                      value={question?.question_text?.[activeLanguage] || ''}
                      onChange={(e) =>
                        updateQuestionLocalizedField(
                          questionIndex,
                          activeLanguage,
                          e.target.value
                        )
                      }
                    />

                    <div className="space-y-4">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={`q${questionIndex}-opt${optionIndex}`}
                          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setCorrectOption(questionIndex, optionIndex)}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                                option.is_correct
                                  ? 'border-[#16A34A] bg-[#DCFCE7] text-[#166534]'
                                  : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)]'
                              }`}
                              title={copy.markCorrectTitle}
                            >
                              <CircleCheckBig size={16} />
                            </button>

                            <div className="flex-1">
                              <Input
                                label={`${copy.option} ${optionIndex + 1} (${activeLanguage.toUpperCase()})`}
                                placeholder={copy.optionPlaceholder}
                                value={option?.option_text?.[activeLanguage] || ''}
                                onChange={(e) =>
                                  updateOptionLocalizedField(
                                    questionIndex,
                                    optionIndex,
                                    activeLanguage,
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center">
            <Button variant="secondary" className="!h-14 !rounded-[18px] !px-8" onClick={addQuestion}>
              <Plus size={18} />
              {copy.addQuestion}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
