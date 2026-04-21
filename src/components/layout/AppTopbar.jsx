import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Globe, LogOut, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '../ui'
import { clearAdminToken } from '../../services/tokenStorage'
import {
  getAdminLanguage,
  getSupportedAdminLanguages,
  setAdminLanguage,
} from '../../services/languageStorage'
import { fetchAdminPrograms } from '../../features/programs/services/programsService'

function normalizeProgramsResponse(result) {
  if (Array.isArray(result?.data?.data)) return result.data.data
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result)) return result
  return []
}

export default function AppTopbar() {
  const navigate = useNavigate()
  const [language, setLanguage] = useState(getAdminLanguage())
  const [inactiveProgramsCount, setInactiveProgramsCount] = useState(0)
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const languageMenuRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const loadInactiveProgramsCount = async () => {
      try {
        const result = await fetchAdminPrograms()
        const programs = normalizeProgramsResponse(result)
        const inactiveCount = programs.filter((program) => !program?.is_active).length
        if (!cancelled) {
          setInactiveProgramsCount(inactiveCount)
        }
      } catch {
        if (!cancelled) {
          setInactiveProgramsCount(0)
        }
      }
    }

    loadInactiveProgramsCount()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!languageMenuRef.current) return
      if (!languageMenuRef.current.contains(event.target)) {
        setIsLanguageMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsLanguageMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const notificationBadgeText = useMemo(() => {
    if (inactiveProgramsCount <= 0) return ''
    return inactiveProgramsCount > 9 ? '9+' : String(inactiveProgramsCount)
  }, [inactiveProgramsCount])

  const languageOptions = useMemo(() => {
    const labels = {
      en: 'English',
      ar: 'العربية',
      nl: 'Nederlands',
    }
    return getSupportedAdminLanguages().map((code) => ({
      code,
      label: labels[code] || code.toUpperCase(),
    }))
  }, [])

  const copy = useMemo(() => {
    if (language === 'ar') {
      return {
        searchPlaceholder:
          'ابحث في البرامج والمستخدمين والتصنيفات والأقسام والدروس والاختبارات...',
        reviewInactivePrograms: 'مراجعة البرامج غير النشطة',
        languageTitle: `اللغة: ${language.toUpperCase()}`,
        role: 'مشرف عام',
        logout: 'تسجيل الخروج',
      }
    }
    if (language === 'nl') {
      return {
        searchPlaceholder:
          'Zoek in programma\'s, gebruikers, categorieen, secties, lessen of quizzen...',
        reviewInactivePrograms: 'Inactieve programma\'s bekijken',
        languageTitle: `Taal: ${language.toUpperCase()}`,
        role: 'Super Admin',
        logout: 'Uitloggen',
      }
    }
    return {
      searchPlaceholder:
        'Search programs, users, categories, sections, lessons, or quizzes...',
      reviewInactivePrograms: 'Review inactive programs',
      languageTitle: `Language: ${language.toUpperCase()}`,
      role: 'Super Admin',
      logout: 'Logout',
    }
  }, [language])

  const handleOpenReviewQueue = () => {
    navigate('/programs?visibility=inactive')
  }

  const handleLanguageSelect = (nextLanguage) => {
    setAdminLanguage(nextLanguage)
    setLanguage(nextLanguage)
    setIsLanguageMenuOpen(false)
    window.location.reload()
  }

  return (
    <header className="sticky top-0 z-30 flex h-24 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-10">
      <div className="flex w-full max-w-2xl items-center gap-4">
        <div className="relative w-full">
          <Input
            placeholder={copy.searchPlaceholder}
            className="h-14 w-full !rounded-[20px] bg-[var(--color-surface-muted)] !pl-14 !text-lg transition-all focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            size={22}
          />
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3 border-r border-[var(--color-border)] pr-8">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-11 w-11 !rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-white hover:shadow-sm"
            title={copy.reviewInactivePrograms}
            onClick={handleOpenReviewQueue}
          >
            <Bell size={21} />
            {inactiveProgramsCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold text-white ring-2 ring-[var(--color-surface)]">
                {notificationBadgeText}
              </span>
            ) : null}
          </Button>

          <div className="relative" ref={languageMenuRef}>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 !rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-white hover:shadow-sm"
              title={copy.languageTitle}
              onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
            >
              <Globe size={21} />
            </Button>

            {isLanguageMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-40 min-w-[170px] rounded-xl border border-[var(--color-border)] bg-white p-1 shadow-[var(--shadow-card)]">
                {languageOptions.map((option) => {
                  const isActive = option.code === language
                  return (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => handleLanguageSelect(option.code)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-[var(--color-surface-muted)] font-semibold text-[var(--color-text)]'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      <span>{option.label}</span>
                      <span className="text-xs uppercase tracking-[0.08em]">{option.code}</span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-lg font-bold text-[var(--color-text)] leading-tight">
              Dr. Alaa
            </p>
            <p className="text-sm font-medium text-[var(--color-accent-dark,#765A1F)]">
              {copy.role}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white">
              DA
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 !rounded-xl border-[var(--color-border)] text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              onClick={() => {
                clearAdminToken()
                navigate('/login')
              }}
              title={copy.logout}
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
