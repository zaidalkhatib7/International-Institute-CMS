import { useEffect, useMemo, useState } from 'react'
import { CircleCheckBig, FileQuestion, FileUp, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, CardContent, Input, Select, Textarea } from '../../../components/ui'
import { fetchAdminSections } from '../../sections/services/sectionsService'
import {
  approveQuestion,
  createAdminQuiz,
  fetchQuizPdfImport,
  fetchAdminQuizById,
  importQuizQuestionsFromPdf,
  rejectQuestion,
  updateAdminQuiz,
  updateQuestionReview,
} from '../services/quizzesService'

// B1 canonical taxonomy — independent dimensions, mirrored from the backend enums.
const TAXONOMY = {
  format: ['MCQ_SINGLE', 'MCQ_MULTIPLE', 'SHORT_ANSWER', 'CONSTRUCTED_RESPONSE', 'PRACTICAL_TASK'],
  context: ['DIRECT', 'SCENARIO_BASED', 'CASE_BASED', 'DATA_BASED', 'DOCUMENT_BASED'],
  cognitive_demand: ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'],
  difficulty: ['foundational', 'intermediate', 'advanced'],
}

const TAXONOMY_LABELS = {
  format: 'الصيغة',
  context: 'السياق',
  cognitive_demand: 'الطلب المعرفي',
  difficulty: 'الصعوبة',
}

const REVIEW_STATUS_META = {
  ai_draft: { label: 'مسودة AI', variant: 'warning' },
  pending_review: { label: 'بانتظار المراجعة', variant: 'warning' },
  approved: { label: 'معتمد', variant: 'success' },
  rejected: { label: 'مرفوض', variant: 'danger' },
  superseded: { label: 'استُبدل', variant: 'neutral' },
}
import { getCurrentLanguage, readLocalizedValue } from '../../../utils/localization'
import { readApiError } from '../../../services/apiResponse'

function readLocalized(value) {
  return readLocalizedValue(value)
}

function normalizePayload(payload) {
  return payload?.data?.data || payload?.data || payload
}

function getSectionTitle(section) {
  return readLocalized(section?.title) || (section?.id ? `#${section.id}` : '—')
}

function getQuizSectionId(quiz) {
  return quiz?.section_id ?? quiz?.course_section_id ?? ''
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
    section_id: getQuizSectionId(quiz) ? String(getQuizSectionId(quiz)) : '',
    questions_per_attempt:
      quiz?.questions_per_attempt != null ? String(quiz.questions_per_attempt) : '0',
    title: {
      en: readLocalized(quiz?.title),
      ar: quiz?.title?.ar || '',
      nl: quiz?.title?.nl || '',
    },
    questions: Array.isArray(quiz?.questions) && quiz.questions.length
      ? quiz.questions.map((question, questionIndex) => ({
          id: question?.id,
          question_text: {
            en: readLocalized(question?.question_text),
            ar: question?.question_text?.ar || '',
            nl: question?.question_text?.nl || '',
          },
          sort_order: question?.sort_order ?? questionIndex + 1,
          // Read-only AI-authoring review metadata (preserved server-side on save).
          difficulty: question?.difficulty || null,
          format: question?.format || null,
          context: question?.context || null,
          cognitive_demand: question?.cognitive_demand || null,
          review_status: question?.review_status || null,
          question_type: question?.question_type || null,
          answer_rationale: question?.answer_rationale || null,
          authoring_meta: question?.authoring_meta || null,
          options:
            Array.isArray(question?.options) && question.options.length
              ? question.options.map((option, optionIndex) => ({
                  id: option?.id,
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
    questions_per_attempt:
      formData.questions_per_attempt === '' ? 0 : Number(formData.questions_per_attempt),
    questions: (formData.questions || []).map((question, questionIndex) => ({
      ...(question?.id ? { id: question.id } : {}),
      question_text: {
        en: question?.question_text?.en || '',
        ar: question?.question_text?.ar || '',
        nl: question?.question_text?.nl || '',
      },
      sort_order: question?.sort_order ?? questionIndex + 1,
      options: (question?.options || []).map((option, optionIndex) => ({
        ...(option?.id ? { id: option.id } : {}),
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
        passPercentage: 'عدد الأسئلة في المحاولة',
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
        editQuiz: 'Vraagbank bewerken',
        createQuiz: 'Vraagbank maken',
        breadcrumbAdmin: 'Beheer',
        breadcrumbQuizzes: 'Vraagbanken',
        subtitle: 'Beheer de vraagbank van een sectie en hoeveel vragen die per poging bijdraagt.',
        backToQuizzes: 'Terug naar vraagbanken',
        saveQuiz: 'Vraagbank opslaan',
        saving: 'Opslaan...',
        loadingQuiz: 'Vraagbank laden...',
        quizBasics: 'Vraagbankbasis',
        section: 'Sectie',
        selectSection: 'Selecteer sectie',
        passPercentage: 'Vragen per poging',
        quizTitle: 'Titel vraagbank',
        quizTitlePlaceholder: 'bijv. Leadership Foundations Question Bank',
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
        passRequired: 'Vragen per poging is verplicht.',
        atLeastOneQuestion: 'Minimaal een vraag is verplicht.',
        atLeastTwoOptions: 'Minimaal twee opties zijn verplicht.',
        exactlyOneCorrect: 'Precies een correcte optie is verplicht.',
        englishTextRequired: 'Engelse tekst is verplicht.',
        updated: 'Vraagbank succesvol bijgewerkt.',
        created: 'Vraagbank succesvol aangemaakt.',
        loadError: 'Vraagbank laden mislukt.',
        saveError: 'Vraagbank opslaan mislukt.',
      }
    }
    return {
      editQuiz: 'Edit Question Bank',
      createQuiz: 'Create Question Bank',
      breadcrumbAdmin: 'Admin',
      breadcrumbQuizzes: 'Question Banks',
      subtitle: 'Manage the section question bank and how many questions it contributes per attempt.',
      backToQuizzes: 'Back to Question Banks',
      saveQuiz: 'Save Question Bank',
      saving: 'Saving...',
      loadingQuiz: 'Loading question bank...',
      quizBasics: 'Question Bank Basics',
      section: 'Section',
      selectSection: 'Select section',
      passPercentage: 'Questions Per Attempt',
      quizTitle: 'Question Bank Title',
      quizTitlePlaceholder: 'e.g. Leadership Foundations Question Bank',
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
      passRequired: 'Questions per attempt is required.',
      atLeastOneQuestion: 'At least one question is required.',
      atLeastTwoOptions: 'At least two options are required.',
      exactlyOneCorrect: 'Exactly one correct option is required.',
      englishTextRequired: 'English text is required.',
      updated: 'Question bank updated successfully.',
      created: 'Question bank created successfully.',
      loadError: 'Failed to load question bank.',
      saveError: 'Failed to save question bank.',
    }
  }, [language])

  const aiCopy = useMemo(() => ({
    en: {
      title: 'Generate questions from PDF',
      description: 'Gemini reads the document and adds a reviewable draft. Questions are not saved until you save this bank.',
      file: 'PDF document',
      count: 'Number of questions',
      mode: 'Import behavior',
      replace: 'Replace current draft',
      append: 'Add to current questions',
      action: 'Generate draft',
      working: 'Reading PDF...',
      required: 'Choose a PDF document first.',
      invalidCount: 'Choose between 1 and 1,000 questions.',
      progress: 'Generated {processed} of {total} questions',
      page: 'Page {current} of {total}',
      previous: 'Previous',
      next: 'Next',
      success: 'Gemini generated {count} questions. Review every answer before saving.',
      error: 'Could not generate questions from this PDF.',
    },
    ar: {
      title: 'إنشاء أسئلة من ملف PDF',
      description: 'يقرأ Gemini المستند ويضيف مسودة قابلة للمراجعة. لن تُحفظ الأسئلة حتى تحفظ بنك الأسئلة.',
      file: 'مستند PDF',
      count: 'عدد الأسئلة',
      mode: 'طريقة الاستيراد',
      replace: 'استبدال المسودة الحالية',
      append: 'إضافة إلى الأسئلة الحالية',
      action: 'إنشاء المسودة',
      working: 'جارٍ قراءة الملف...',
      required: 'اختر مستند PDF أولاً.',
      invalidCount: 'اختر عدداً بين 1 و1000.',
      progress: 'تم إنشاء {processed} من أصل {total} سؤال',
      page: 'الصفحة {current} من {total}',
      previous: 'السابق',
      next: 'التالي',
      success: 'أنشأ Gemini عدد {count} من الأسئلة. راجع كل إجابة قبل الحفظ.',
      error: 'تعذر إنشاء الأسئلة من هذا الملف.',
    },
    nl: {
      title: 'Vragen genereren uit PDF',
      description: 'Gemini leest het document en voegt een controleerbaar concept toe. Vragen worden pas opgeslagen wanneer u deze bank opslaat.',
      file: 'PDF-document',
      count: 'Aantal vragen',
      mode: 'Importgedrag',
      replace: 'Huidig concept vervangen',
      append: 'Aan huidige vragen toevoegen',
      action: 'Concept genereren',
      working: 'PDF wordt gelezen...',
      required: 'Kies eerst een PDF-document.',
      invalidCount: 'Kies tussen 1 en 1.000 vragen.',
      progress: '{processed} van {total} vragen gegenereerd',
      page: 'Pagina {current} van {total}',
      previous: 'Vorige',
      next: 'Volgende',
      success: 'Gemini heeft {count} vragen gegenereerd. Controleer elk antwoord voordat u opslaat.',
      error: 'Kon geen vragen uit deze PDF genereren.',
    },
  })[language] || null, [language])

  const [sections, setSections] = useState([])
  const [activeLanguage, setActiveLanguage] = useState('en')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [reviewBusyId, setReviewBusyId] = useState(null)
  const [reviewError, setReviewError] = useState('')
  const [reviewErrorId, setReviewErrorId] = useState(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [importCount, setImportCount] = useState('10')
  const [importMode, setImportMode] = useState('replace')
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(null)
  const [questionPage, setQuestionPage] = useState(1)

  const [formData, setFormData] = useState({
    section_id: '',
    questions_per_attempt: '0',
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

  const patchQuestionInState = (questionIndex, patch) => {
    setFormData((prev) => {
      const nextQuestions = [...prev.questions]
      nextQuestions[questionIndex] = { ...nextQuestions[questionIndex], ...patch }
      return { ...prev, questions: nextQuestions }
    })
  }

  const runReviewAction = async (questionIndex, action) => {
    const target = formData.questions[questionIndex]
    if (!target?.id) return
    setReviewBusyId(target.id)
    setReviewError('')
    setReviewErrorId(null)
    try {
      const response = await action(target)
      const fresh = response?.data || {}
      patchQuestionInState(questionIndex, {
        format: fresh.format ?? target.format,
        context: fresh.context ?? target.context,
        cognitive_demand: fresh.cognitive_demand ?? target.cognitive_demand,
        difficulty: fresh.difficulty ?? target.difficulty,
        review_status: fresh.review_status ?? target.review_status,
      })
    } catch (actionError) {
      // The error must outlive the busy flag, otherwise a refused approval
      // (e.g. a governed question with no rationale text) fails silently.
      setReviewError(readApiError(actionError))
      setReviewErrorId(target.id)
    } finally {
      setReviewBusyId(null)
    }
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
    setQuestionPage(Math.ceil((formData.questions.length + 1) / 25))
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
    if (formData.questions_per_attempt === '') return copy.passRequired
    if (!formData.questions.length) return copy.atLeastOneQuestion

    const questionsPerAttempt = Number(formData.questions_per_attempt)
    if (Number.isNaN(questionsPerAttempt) || questionsPerAttempt < 0) {
      return 'Questions per attempt must be 0 or greater.'
    }
    if (questionsPerAttempt > formData.questions.length) {
      return 'Questions per attempt cannot exceed the current question count.'
    }

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

  const handlePdfImport = async () => {
    setSaveError('')
    setSaveMessage('')

    if (!pdfFile) {
      setSaveError(aiCopy.required)
      return
    }

    const requestedCount = Number(importCount)
    if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 1000) {
      setSaveError(aiCopy.invalidCount)
      return
    }

    setIsImporting(true)
    setImportProgress(null)
    try {
      const response = await importQuizQuestionsFromPdf(pdfFile, requestedCount)
      let generated = normalizePayload(response)

      if (generated?.id && generated?.status) {
        let importStatus = generated
        setImportProgress(importStatus)

        for (let poll = 0; poll < 3600; poll += 1) {
          if (importStatus.status === 'completed') {
            generated = importStatus.result
            break
          }
          if (importStatus.status === 'failed') {
            throw new Error(importStatus.error_message || aiCopy.error)
          }

          await new Promise((resolve) => window.setTimeout(resolve, 2000))
          importStatus = normalizePayload(await fetchQuizPdfImport(importStatus.id))
          setImportProgress(importStatus)
        }

        if (!generated?.questions) {
          throw new Error('The background import did not finish in time. It will continue on the server.')
        }
      }

      const importedQuestions = (generated?.questions || []).map((question, questionIndex) => ({
        question_text: {
          en: question?.question_text?.en || '',
          ar: question?.question_text?.ar || '',
          nl: question?.question_text?.nl || '',
        },
        options: (question?.options || []).map((option, optionIndex) => ({
          option_text: {
            en: option?.option_text?.en || '',
            ar: option?.option_text?.ar || '',
            nl: option?.option_text?.nl || '',
          },
          is_correct: Boolean(option?.is_correct),
          sort_order: optionIndex + 1,
        })),
        sort_order: questionIndex + 1,
      }))

      setFormData((current) => {
        const questions = importMode === 'append'
          ? [...current.questions, ...importedQuestions]
          : importedQuestions
        const normalizedQuestions = questions.map((question, index) => ({
          ...question,
          sort_order: index + 1,
        }))

        return {
          ...current,
          title: importMode === 'replace' && generated?.suggested_title
            ? generated.suggested_title
            : current.title,
          questions: normalizedQuestions,
          questions_per_attempt: Number(current.questions_per_attempt) > 0
            ? String(Math.min(Number(current.questions_per_attempt), normalizedQuestions.length))
            : String(normalizedQuestions.length),
        }
      })
      setSaveMessage(aiCopy.success.replace('{count}', String(importedQuestions.length)))
      setActiveLanguage('en')
      setQuestionPage(1)
    } catch (err) {
      setSaveError(err?.response?.data?.message || err?.message || aiCopy.error)
    } finally {
      setIsImporting(false)
    }
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

  const questionPageSize = 25
  const questionPageCount = Math.max(1, Math.ceil(formData.questions.length / questionPageSize))
  const activeQuestionPage = Math.min(questionPage, questionPageCount)
  const questionPageStart = (activeQuestionPage - 1) * questionPageSize
  const visibleQuestions = formData.questions
    .slice(questionPageStart, questionPageStart + questionPageSize)
    .map((question, offset) => ({ question, questionIndex: questionPageStart + offset }))

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-[var(--color-text-muted)]">
            {copy.breadcrumbAdmin} &nbsp;&gt;&nbsp; {copy.breadcrumbQuizzes} &nbsp;&gt;&nbsp;
            <span className="font-semibold text-[var(--color-accent-dark,#765A1F)]">
              {isEditMode ? copy.editQuiz : copy.createQuiz}
            </span>
          </p>

          <h1 className="mt-4 break-words text-3xl font-bold leading-tight text-[var(--color-text)] sm:text-4xl lg:text-5xl">{titleText}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--color-text-muted)] sm:text-lg">
            {copy.subtitle}
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 xl:flex xl:w-auto xl:items-center">
          <Button
            variant="outline"
            className="w-full !h-12 !rounded-xl !px-5 !text-base xl:w-auto"
            onClick={() => navigate('/quizzes')}
          >
            {copy.backToQuizzes}
          </Button>

          <Button
            className="w-full !h-12 !rounded-xl !px-5 !text-base xl:w-auto"
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
          <Card className="border-dashed border-[var(--color-accent)]">
            <CardContent className="p-5 sm:p-8">
              <div className="mb-6 flex items-start gap-4">
                <div className="rounded-2xl bg-[var(--color-secondary)] p-3 text-[var(--color-primary)]">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[var(--color-text)]">{aiCopy.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
                    {aiCopy.description}
                  </p>
                </div>
              </div>

              <div className="grid items-end gap-5 xl:grid-cols-[minmax(0,2fr)_180px_240px_auto]">
                <Input
                  label={aiCopy.file}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
                  inputClassName="file:me-4 file:rounded-lg file:border-0 file:bg-[var(--color-surface-muted)] file:px-3 file:py-1 file:font-semibold"
                />
                <Input
                  label={aiCopy.count}
                  type="number"
                  min="1"
                  max="1000"
                  value={importCount}
                  onChange={(event) => setImportCount(event.target.value)}
                />
                <Select
                  label={aiCopy.mode}
                  value={importMode}
                  onChange={(event) => setImportMode(event.target.value)}
                >
                  <option value="replace">{aiCopy.replace}</option>
                  <option value="append">{aiCopy.append}</option>
                </Select>
                <Button onClick={handlePdfImport} disabled={isImporting} className="whitespace-nowrap">
                  <FileUp size={18} />
                  {isImporting ? aiCopy.working : aiCopy.action}
                </Button>
              </div>

              {isImporting && importProgress ? (
                <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold text-[var(--color-text)]">
                    <span>
                      {aiCopy.progress
                        .replace('{processed}', String(importProgress.processed_questions || 0))
                        .replace('{total}', String(importProgress.question_count || importCount))}
                    </span>
                    <span>{importProgress.progress || 0}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                      style={{ width: `${importProgress.progress || 0}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 sm:p-8">
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
                  max={Math.max(formData.questions.length, 0)}
                  value={formData.questions_per_attempt}
                  onChange={(e) => updateField('questions_per_attempt', e.target.value)}
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
            {visibleQuestions.map(({ question, questionIndex }) => (
              <Card key={`question-${questionIndex}`}>
                <CardContent className="p-5 sm:p-8">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-2xl font-bold text-[var(--color-text)]">
                      {copy.question} {questionIndex + 1}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
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
                    {question.review_status || question.question_type || question.difficulty || question.answer_rationale ? (
                      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {question.review_status ? (
                              <Badge variant={REVIEW_STATUS_META[question.review_status]?.variant || 'neutral'}>
                                {REVIEW_STATUS_META[question.review_status]?.label || question.review_status}
                              </Badge>
                            ) : (
                              <Badge variant="neutral">سؤال يدوي (خارج دورة AI)</Badge>
                            )}
                            {question.question_type ? (
                              <Badge variant="info">
                                {{ mcq: 'اختيار من متعدد', scenario: 'سيناريو', analytical: 'تحليلي', case_study: 'حالة دراسية', short_answer: 'إجابة قصيرة', practical_task: 'مهمة عملية' }[question.question_type] || question.question_type}
                              </Badge>
                            ) : null}
                          </div>
                          {question.review_status && question.id ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={reviewBusyId === question.id}
                                onClick={() =>
                                  runReviewAction(questionIndex, (target) =>
                                    updateQuestionReview(target.id, {
                                      format: target.format,
                                      context: target.context,
                                      cognitive_demand: target.cognitive_demand,
                                      difficulty: target.difficulty,
                                      ...(target.answer_rationale ? { answer_rationale: target.answer_rationale } : {}),
                                    }),
                                  )
                                }
                              >
                                حفظ التصنيف
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={reviewBusyId === question.id || question.review_status === 'approved'}
                                onClick={() => runReviewAction(questionIndex, (target) => approveQuestion(target.id))}
                              >
                                <CircleCheckBig size={15} /> اعتماد
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={reviewBusyId === question.id || question.review_status === 'rejected'}
                                onClick={() => runReviewAction(questionIndex, (target) => rejectQuestion(target.id))}
                              >
                                رفض
                              </Button>
                            </div>
                          ) : null}
                        </div>
                        {reviewErrorId === question.id && reviewError ? (
                          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{reviewError}</p>
                        ) : null}
                        {question.review_status ? (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {Object.keys(TAXONOMY).map((dimension) => (
                              <Select
                                key={dimension}
                                label={TAXONOMY_LABELS[dimension]}
                                value={question[dimension] || ''}
                                onChange={(e) => patchQuestionInState(questionIndex, { [dimension]: e.target.value || null })}
                              >
                                <option value="">— غير مصنف —</option>
                                {TAXONOMY[dimension].map((value) => (
                                  <option key={value} value={value}>{value}</option>
                                ))}
                              </Select>
                            ))}
                          </div>
                        ) : null}
                        {question.review_status && question.authoring_meta?.suggested_taxonomy && !question.format ? (
                          <p className="mt-2 text-xs text-amber-700">
                            اقتراح آلي (يتطلب تأكيدك): {question.authoring_meta.suggested_taxonomy.format} / {question.authoring_meta.suggested_taxonomy.context} / {question.authoring_meta.suggested_taxonomy.cognitive_demand} — اختر القيم ثم «حفظ التصنيف».
                          </p>
                        ) : null}
                        {question.review_status ? (
                          <div className="mt-3">
                            <Textarea
                              label={`تبرير الإجابة (${activeLanguage.toUpperCase()}) — اختياري`}
                              rows={3}
                              value={question.answer_rationale?.[activeLanguage] || ''}
                              onChange={(e) =>
                                patchQuestionInState(questionIndex, {
                                  answer_rationale: { ...(question.answer_rationale || {}), [activeLanguage]: e.target.value },
                                })
                              }
                              placeholder="لماذا الإجابة الصحيحة صحيحة، ولماذا البدائل أضعف مهنيًا — بلا مبالغة في الاستنتاج."
                            />
                            {/* سياسة التبرير الاختياري: تنبيه معلوماتي فقط — لا يمنع الاعتماد. */}
                            {!String(question.answer_rationale?.[activeLanguage] || '').trim() ? (
                              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                التبرير اختياري ولا يمنع الاعتماد. كتابته تدعم التأليف والمراجعة الأكاديمية والتغذية الراجعة للمتعلم.
                              </p>
                            ) : null}
                          </div>
                        ) : question.answer_rationale ? (
                          <p className="mt-3 text-sm leading-6 text-[var(--color-text)]">
                            <span className="font-semibold">تبرير الإجابة: </span>
                            {question.answer_rationale?.[activeLanguage] || readLocalized(question.answer_rationale)}
                          </p>
                        ) : null}
                        {question.authoring_meta?.expected_answer_characteristics ? (
                          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                            <span className="font-semibold">مواصفات الإجابة المتوقعة: </span>
                            {question.authoring_meta.expected_answer_characteristics}
                          </p>
                        ) : null}
                        {question.authoring_meta?.rubric_draft ? (
                          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                            <span className="font-semibold">مسودة معيار التصحيح: </span>
                            {question.authoring_meta.rubric_draft}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
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

          {questionPageCount > 1 ? (
            <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-4">
              <Button
                variant="outline"
                onClick={() => setQuestionPage(Math.max(1, activeQuestionPage - 1))}
                disabled={activeQuestionPage === 1}
              >
                {aiCopy.previous}
              </Button>
              <span className="min-w-40 text-center text-sm font-semibold text-[var(--color-text)]">
                {aiCopy.page
                  .replace('{current}', String(activeQuestionPage))
                  .replace('{total}', String(questionPageCount))}
              </span>
              <Button
                variant="outline"
                onClick={() => setQuestionPage(Math.min(questionPageCount, activeQuestionPage + 1))}
                disabled={activeQuestionPage === questionPageCount}
              >
                {aiCopy.next}
              </Button>
            </div>
          ) : null}

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
