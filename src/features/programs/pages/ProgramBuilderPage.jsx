import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FileText,
  FolderOpen,
  Globe,
  Image,
  Info,
  Send,
  Target,
  Wallet,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  MoneyInput,
  Select,
  Textarea,
} from '../../../components/ui'
import {
  createAdminProgram,
  fetchAdminCategories,
  fetchAdminProgramById,
  toggleAdminProgramActive,
  updateAdminProgram,
  updateAdminProgramPrice,
} from '../services/programsService'
import { getCurrentLanguage, readLocalizedValue, readStoredEnglish } from '../../../utils/localization'
import { MAX_PRICE_USD_MINOR, MIN_PRICE_USD_MINOR, formatMoney, formatMoneyInline, fromMinor, money, sypPreview, toMinor } from '../../../utils/money'
import { readApiError } from '../../../services/apiResponse'
import { useExchangeRate } from '../../finance/hooks/useExchangeRate'
import AiPackagePanel from '../components/AiPackagePanel'
import SeedPackPanel from '../components/SeedPackPanel'
import PublicationReadinessCard from '../components/PublicationReadinessCard'

function readLocalized(value, preferredLanguage = 'en') {
  return readLocalizedValue(value, preferredLanguage)
}

function sanitizeLocalizedValue(value) {
  const normalized = String(value ?? '').replace(/\u200B/g, '').trim()
  if (!normalized) return ''
  return /[A-Za-z0-9\u0600-\u06FF]/.test(normalized) ? normalized : ''
}

function titleFromSlug(slug) {
  if (!slug) return ''
  return String(slug)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

// The standard catalogue categories are admission routes, not decorative
// labels. Keep this mapping in the CMS so the submitted payload is explicit;
// the Laravel API independently enforces the same mapping.
const CATEGORY_PROGRAM_TYPE_BY_SLUG = {
  'short-courses': 'short_course',
  'professional-diplomas': 'professional_diploma',
  'executive-programs': 'executive_program',
  'professional-masters': 'professional_master',
  'professional-doctorate': 'professional_doctorate',
  'training-kits': 'training_kit',
  'trainer-programs': 'trainer_program',
  'organization-programs': 'organization_program',
  'ministry-programs': 'ministry_program',
  'free-programs': 'free_program',
}

function programTypeForCategory(category) {
  return CATEGORY_PROGRAM_TYPE_BY_SLUG[category?.slug] || ''
}

function admissionRuleForCategory(category, copy) {
  return {
    'professional-diplomas': copy.diplomaAdmissionRule,
    'professional-masters': copy.masterAdmissionRule,
    'professional-doctorate': copy.doctorateAdmissionRule,
  }[category?.slug] || copy.generalCatalogueRule
}

function normalizeProgramPayload(payload) {
  return payload?.data?.data || payload?.data || payload
}

function hasAnyLocalizedValue(value) {
  if (!value || typeof value !== 'object') return false
  return Object.values(value).some((entry) => String(entry || '').trim())
}

function mapProgramToFormData(program) {
  return {
    competency_gap_group_id: program?.competency_gap_group_id || null,
    official_code: program?.official_code || '',
    category_id: program?.category_id
      ? String(program.category_id)
      : program?.category?.id
      ? String(program.category.id)
      : '',
    title: {
      en: readStoredEnglish(program?.title),
      ar: program?.title?.ar || '',
    },
    short_description: {
      en: readStoredEnglish(program?.short_description),
      ar: program?.short_description?.ar || '',
    },
    overview: {
      en: readStoredEnglish(program?.overview),
      ar: program?.overview?.ar || '',
    },
    outcomes: {
      en: readStoredEnglish(program?.outcomes),
      ar: program?.outcomes?.ar || '',
    },
    target_audience: {
      en: readStoredEnglish(program?.target_audience),
      ar: program?.target_audience?.ar || '',
    },
    entry_requirements: {
      en: readStoredEnglish(program?.entry_requirements),
      ar: program?.entry_requirements?.ar || '',
    },
    duration: {
      en: sanitizeLocalizedValue(readStoredEnglish(program?.duration)),
      ar: sanitizeLocalizedValue(program?.duration?.ar),
    },
    // One price, in US dollars (owner, 17 Oct 2026): price_usd_minor in cents, shown as dollars. No fallback to the retired points.
    price_usd: Number.isSafeInteger(program?.price_usd_minor) ? fromMinor(program.price_usd_minor, 'USD') : '',
    featured_image: program?.featured_image || '',
    intro_video_url: program?.intro_video_url || '',
    intro_text: {
      en: readStoredEnglish(program?.intro_text),
      ar: program?.intro_text?.ar || '',
    },
    final_quiz_title: {
      en: readStoredEnglish(program?.final_quiz_title),
      ar: program?.final_quiz_title?.ar || '',
    },
    final_quiz_pass_percentage:
      program?.final_quiz_pass_percentage != null ? String(program.final_quiz_pass_percentage) : '',
    final_quiz_duration_minutes:
      program?.final_quiz_duration_minutes != null
        ? String(program.final_quiz_duration_minutes)
        : '',
    is_featured: Boolean(program?.is_featured),
    is_active: Boolean(program?.is_active),
    program_type:
      program?.program_type ||
      programTypeForCategory(program?.category) ||
      '',
    category_name:
      program?.category?.name?.en ||
      program?.category?.name?.ar ||
      program?.category?.name ||
      titleFromSlug(program?.category?.slug) ||
      '',
  }
}

/*
 * The typed price as US cents: 0 when empty (not priced), or $1.00 to
 * $1,000,000.00 (the API's range); null when it is neither, which stops the save.
 */
function programPriceMinor(text) {
  if (String(text ?? '').trim() === '') return 0
  const minor = toMinor(text, 'USD')
  if (minor == null) return null
  if (minor !== 0 && (minor < MIN_PRICE_USD_MINOR || minor > MAX_PRICE_USD_MINOR)) return null
  return minor
}

function buildProgramPayload(formData) {
  const finalQuizTitle = {
    en: formData.final_quiz_title?.en || '',
    ar: formData.final_quiz_title?.ar || '',
  }
  const finalQuizPassPercentage =
    formData.final_quiz_pass_percentage === ''
      ? null
      : Number(formData.final_quiz_pass_percentage)
  const finalQuizDurationMinutes =
    formData.final_quiz_duration_minutes === ''
      ? null
      : Number(formData.final_quiz_duration_minutes)

  return {
    category_id: formData.category_id ? Number(formData.category_id) : null,
    title: {
      en: formData.title?.en || '',
      ar: formData.title?.ar || '',
    },
    short_description: {
      en: formData.short_description?.en || '',
      ar: formData.short_description?.ar || '',
    },
    overview: {
      en: formData.overview?.en || '',
      ar: formData.overview?.ar || '',
    },
    outcomes: {
      en: formData.outcomes?.en || '',
      ar: formData.outcomes?.ar || '',
    },
    target_audience: {
      en: formData.target_audience?.en || '',
      ar: formData.target_audience?.ar || '',
    },
    entry_requirements: {
      en: formData.entry_requirements?.en || '',
      ar: formData.entry_requirements?.ar || '',
    },
    duration: {
      en: sanitizeLocalizedValue(formData.duration?.en),
      ar: sanitizeLocalizedValue(formData.duration?.ar),
    },
    // US cents, built from the typed dollars by string arithmetic; empty is 0 (not priced). fees, currency and price_points are never sent.
    price_usd_minor: programPriceMinor(formData.price_usd) ?? 0,
    featured_image: formData.featured_image || '',
    intro_video_url: formData.intro_video_url || '',
    intro_text: {
      en: formData.intro_text?.en || '',
      ar: formData.intro_text?.ar || '',
    },
    ...(hasAnyLocalizedValue(finalQuizTitle) ? { final_quiz_title: finalQuizTitle } : {}),
    ...(finalQuizPassPercentage != null
      ? { final_quiz_pass_percentage: finalQuizPassPercentage }
      : {}),
    ...(finalQuizDurationMinutes != null
      ? { final_quiz_duration_minutes: finalQuizDurationMinutes }
      : {}),
    is_featured: Boolean(formData.is_featured),
    ...(formData.program_type ? { program_type: formData.program_type } : {}),
  }
}

/*
 * A PUBLISHED PACKAGE'S CONTENT IS FROZEN; ITS PRICE IS NOT (platform walk,
 * 17 Oct 2026, PB-06). The save payload without its price, as one comparable
 * string: built by the same function from the loaded programme and from the
 * form, so "unchanged" means unchanged, whatever the server stores.
 */
function frozenContentOf(payload) {
  const content = { ...payload }
  delete content.price_usd_minor
  return JSON.stringify(content)
}

function isPublishedPackage(program) {
  return Boolean(program?.competency_gap_group_id && program?.package_published_at)
}

function LanguageTabs({ activeLanguage, onChange }) {
  const languages = ['en', 'ar']

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

function BuilderTabs({ activeTab, onTabChange, tabs }) {
  return (
    <div className="flex flex-wrap items-center gap-8 border-b border-[var(--color-border)]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onTabChange(tab.key)}
          className={`relative pb-4 text-xl ${
            activeTab === tab.key
              ? 'font-semibold text-[var(--color-accent-dark,#765A1F)]'
              : 'text-[var(--color-text-body,#43474D)]'
          }`}
        >
          {tab.label}
          {activeTab === tab.key ? (
            <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-[var(--color-accent-dark,#765A1F)]" />
          ) : null}
        </button>
      ))}
    </div>
  )
}

function SectionCard({ icon, title, children }) {
  return (
    <Card>
      <CardContent className="p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="text-[var(--color-accent-dark,#765A1F)]">{icon}</div>
          <h2 className="text-3xl font-bold text-[var(--color-text)]">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

function PreviewCard({ formData, activeLanguage, copy, language }) {
  const title =
    formData.title?.[activeLanguage] || formData.title?.en || copy.untitledProgram
  const category = formData.category_name || copy.programCategory
  const priceMinor = programPriceMinor(formData.price_usd)
  const price = priceMinor != null ? formatMoney(money(priceMinor, 'USD'), language) : copy.notAvailable

  return (
    <Card className="overflow-hidden">
      <div className="h-52 bg-[var(--color-primary)]/20" />

      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          {formData.is_featured ? (
            <Badge variant="secondary">{copy.featured}</Badge>
          ) : (
            <Badge variant="neutral">{copy.standard}</Badge>
          )}
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-dark,#765A1F)]">
          {category}
        </p>

        <h3 className="mt-4 text-4xl font-bold leading-tight text-[var(--color-text)]">
          {title}
        </h3>

        <div className="mt-8 border-t border-[var(--color-border)] pt-6 text-right">
          <p className="text-5xl font-bold text-[var(--color-accent-dark,#765A1F)]">
            <bdi dir="ltr">{price}</bdi>
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-accent-dark,#765A1F)]">{copy.priceUsd}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function SnapshotCard({ copy }) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
          {copy.settingsSnapshot}
        </h3>

        <div className="mt-8 space-y-5 text-lg">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">{copy.lastEdited}</span>
            <span className="font-medium text-[var(--color-text)]">{copy.todayTime}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">{copy.visibility}</span>
            <span className="font-medium text-[var(--color-accent-dark,#765A1F)]">{copy.draft}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PricingSnapshotCard({ formData, copy, language }) {
  const finalQuizTitle =
    formData.final_quiz_title?.en || formData.final_quiz_title?.ar
  const priceMinor = programPriceMinor(formData.price_usd)

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
          {copy.settingsSnapshot}
        </h3>

        <div className="mt-8 space-y-5 text-lg">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">{copy.price}</span>
            <span className="font-medium text-[var(--color-accent-dark,#765A1F)]">
              <bdi dir="ltr">{priceMinor != null && String(formData.price_usd ?? '').trim() !== '' ? formatMoney(money(priceMinor, 'USD'), language) : copy.notAvailable}</bdi>
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--color-text-muted)]">{copy.finalQuizTitle}</span>
            <span className="max-w-[170px] truncate text-right font-medium text-[var(--color-text)]">
              {finalQuizTitle || copy.notAvailable}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">{copy.finalQuizPassPercentage}</span>
            <span className="font-medium text-[var(--color-text)]">
              {formData.final_quiz_pass_percentage || copy.notAvailable}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">
              {copy.finalQuizDurationMinutes || 'Final Quiz Duration'}
            </span>
            <span className="font-medium text-[var(--color-text)]">
              {formData.final_quiz_duration_minutes
                ? `${formData.final_quiz_duration_minutes} ${copy.minutesShort || 'minutes'}`
                : copy.notAvailable}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">{copy.status}</span>
            <span className="font-medium text-[var(--color-text)]">{copy.loaded}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PublishSnapshotCard({ formData, copy }) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
          {copy.stateSnapshot}
        </h3>

        <div className="mt-8 space-y-5 text-lg">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">{copy.featured}</span>
            <span className="font-medium text-[var(--color-text)]">
              {formData.is_featured ? copy.yes : copy.no}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">{copy.active}</span>
            <span className="font-medium text-[var(--color-text)]">
              {formData.is_active ? copy.yes : copy.no}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">{copy.pricing}</span>
            <span className="font-medium text-[#16A34A]">{copy.loaded}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">{copy.media}</span>
            <span className="font-medium text-[#16A34A]">{copy.loaded}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BasicInfoContent({
  formData,
  categories,
  activeLanguage,
  setActiveLanguage,
  updateField,
  updateLocalizedField,
  copy,
  language,
}) {
  const selectedCategory = categories.find(
    (category) => String(category.id) === String(formData.category_id)
  )
  const admissionRule = admissionRuleForCategory(selectedCategory, copy)

  return (
    <div className="space-y-8">
      <SectionCard icon={<FolderOpen size={24} />} title={copy.programIdentity}>
        <div className="space-y-6">
          <Select
            label={copy.category}
            value={formData.category_id}
            onChange={(e) => {
              const selectedId = e.target.value
              const selectedCategory = categories.find(
                (cat) => String(cat.id) === String(selectedId)
              )

              const categoryName =
                readLocalized(selectedCategory?.name, language) ||
                selectedCategory?.name ||
                titleFromSlug(selectedCategory?.slug) ||
                ''

              updateField('category_id', selectedId)
              updateField('category_name', categoryName)
              updateField('program_type', programTypeForCategory(selectedCategory))
            }}
          >
            <option value="">{copy.selectCategory}</option>
            {categories.map((category) => {
              const categoryName =
                readLocalized(category?.name, language) ||
                category?.name ||
                titleFromSlug(category?.slug) ||
                `${copy.categoryFallbackPrefix} ${category.id}`

              return (
                <option key={category.id} value={category.id}>
                  {categoryName}
                </option>
              )
            })}
          </Select>

          <div className="rounded-2xl border border-[#BDE4FF] bg-[#F0F9FF] px-4 py-3 text-sm leading-6 text-[var(--color-text)]" role="status">
            <span className="font-semibold">{copy.admissionRoute}: </span>
            {admissionRule}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                {copy.programTitleRequired}
              </label>
              <LanguageTabs
                activeLanguage={activeLanguage}
                onChange={setActiveLanguage}
              />
            </div>

            <Input
              placeholder={copy.programTitlePlaceholder}
              value={formData.title?.[activeLanguage] || ''}
              onChange={(e) =>
                updateLocalizedField('title', activeLanguage, e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                {copy.shortDescription}
              </label>
              <LanguageTabs
                activeLanguage={activeLanguage}
                onChange={setActiveLanguage}
              />
            </div>

            <Textarea
              rows={4}
              placeholder={copy.shortDescriptionPlaceholder}
              value={formData.short_description?.[activeLanguage] || ''}
              onChange={(e) =>
                updateLocalizedField('short_description', activeLanguage, e.target.value)
              }
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<Info size={24} />} title={copy.introDetails}>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                {copy.duration}
              </label>
              <LanguageTabs
                activeLanguage={activeLanguage}
                onChange={setActiveLanguage}
              />
            </div>

            <Input
              placeholder={copy.durationPlaceholder}
              value={formData.duration?.[activeLanguage] || ''}
              onChange={(e) =>
                updateLocalizedField('duration', activeLanguage, e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                {copy.introText}
              </label>
              <LanguageTabs
                activeLanguage={activeLanguage}
                onChange={setActiveLanguage}
              />
            </div>

            <Textarea
              rows={6}
              placeholder={copy.introTextPlaceholder}
              value={formData.intro_text?.[activeLanguage] || ''}
              onChange={(e) =>
                updateLocalizedField('intro_text', activeLanguage, e.target.value)
              }
            />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function AcademicContentContent({
  formData,
  activeLanguage,
  setActiveLanguage,
  updateLocalizedField,
  copy,
}) {
  return (
    <div className="space-y-8">
      <SectionCard icon={<FileText size={24} />} title={copy.programNarrative}>
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                {copy.overviewRequired}
              </label>
              <LanguageTabs activeLanguage={activeLanguage} onChange={setActiveLanguage} />
            </div>

            <Textarea
              rows={8}
              placeholder={copy.overviewPlaceholder}
              value={formData.overview?.[activeLanguage] || ''}
              onChange={(e) => updateLocalizedField('overview', activeLanguage, e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                {copy.learningOutcomesRequired}
              </label>
              <LanguageTabs activeLanguage={activeLanguage} onChange={setActiveLanguage} />
            </div>

            <Textarea
              rows={7}
              placeholder={copy.learningOutcomesPlaceholder}
              value={formData.outcomes?.[activeLanguage] || ''}
              onChange={(e) => updateLocalizedField('outcomes', activeLanguage, e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<Target size={24} />} title={copy.learnerFit}>
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                {copy.targetAudienceRequired}
              </label>
              <LanguageTabs activeLanguage={activeLanguage} onChange={setActiveLanguage} />
            </div>

            <Textarea
              rows={5}
              placeholder={copy.targetAudiencePlaceholder}
              value={formData.target_audience?.[activeLanguage] || ''}
              onChange={(e) =>
                updateLocalizedField('target_audience', activeLanguage, e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                {copy.entryRequirementsRequired}
              </label>
              <LanguageTabs activeLanguage={activeLanguage} onChange={setActiveLanguage} />
            </div>

            <Textarea
              rows={5}
              placeholder={copy.entryRequirementsPlaceholder}
              value={formData.entry_requirements?.[activeLanguage] || ''}
              onChange={(e) =>
                updateLocalizedField('entry_requirements', activeLanguage, e.target.value)
              }
            />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

/*
 * THE PRICE (owner decisions of 17 Oct 2026): one price, in US dollars, with
 * cents. A client paying in Syrian pounds pays it x the exchange rate when he
 * pays; the preview shows what that is at today's rate, for information only.
 */
function PricingContent({
  formData,
  updateField,
  copy,
  language,
  exchange,
}) {
  const typed = String(formData.price_usd ?? '').trim() !== ''
  const priceMinor = programPriceMinor(formData.price_usd)
  const preview = typed && priceMinor > 0 && exchange.rate ? sypPreview(priceMinor, exchange.rate) : null

  return (
    <div className="space-y-8">
      <SectionCard icon={<Wallet size={24} />} title={copy.price}>
        <div className="space-y-4">
          <MoneyInput
            id="program-price-usd"
            currency="USD"
            language={language}
            label={copy.priceRequired}
            placeholder={copy.pricePlaceholder}
            value={formData.price_usd}
            error={typed && priceMinor == null ? copy.priceInvalid : undefined}
            onChange={(value) => updateField('price_usd', value)}
          />

          <p className="text-sm text-[var(--color-text-muted)]">
            {copy.programPriceHint}
          </p>

          {preview ? (
            <p className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 text-lg font-semibold">
              <bdi>{copy.atTodaysRate.replace('{syp}', formatMoneyInline(preview, language))}</bdi>
            </p>
          ) : typed && priceMinor > 0 && exchange.loaded && !exchange.failed && !exchange.rate ? (
            <p className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
              {copy.noRate}
            </p>
          ) : null}
        </div>
      </SectionCard>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {copy.pricingGuidance}
          </p>

          <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
            {copy.pricingGuidanceBody}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function FinalQuizContent({
  formData,
  activeLanguage,
  setActiveLanguage,
  updateField,
  updateLocalizedField,
  copy,
}) {
  return (
    <div className="space-y-8">
      <SectionCard icon={<Target size={24} />} title={copy.finalQuizSettings}>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                {copy.finalQuizTitle}
              </label>
              <LanguageTabs activeLanguage={activeLanguage} onChange={setActiveLanguage} />
            </div>

            <Input
              placeholder={copy.finalQuizTitlePlaceholder}
              value={formData.final_quiz_title?.[activeLanguage] || ''}
              onChange={(e) =>
                updateLocalizedField('final_quiz_title', activeLanguage, e.target.value)
              }
            />
          </div>

          <Input
            label={copy.finalQuizPassPercentage}
            type="number"
            min="0"
            max="100"
            placeholder={copy.finalQuizPassPercentagePlaceholder}
            value={formData.final_quiz_pass_percentage}
            onChange={(e) => updateField('final_quiz_pass_percentage', e.target.value)}
          />

          <Input
            label={copy.finalQuizDurationMinutes || 'Final Quiz Duration (Minutes)'}
            type="number"
            min="1"
            placeholder={copy.finalQuizDurationMinutesPlaceholder || '30'}
            value={formData.final_quiz_duration_minutes}
            onChange={(e) => updateField('final_quiz_duration_minutes', e.target.value)}
          />

          <p className="text-sm text-[var(--color-text-muted)]">{copy.finalQuizSettingsHint}</p>
        </div>
      </SectionCard>
    </div>
  )
}

function MediaContent({ formData, updateField, copy }) {
  return (
    <div className="space-y-8">
      <SectionCard icon={<Image size={24} />} title={copy.featuredImage}>
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
              {copy.recommended}
            </p>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              {copy.imageResolution}
            </p>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
            <div className="h-[320px] bg-[var(--color-primary)]/15" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.5fr_auto_auto]">
            <Input
              label={copy.imageUrlSource}
              placeholder={copy.imageUrlPlaceholder}
              value={formData.featured_image}
              onChange={(e) => updateField('featured_image', e.target.value)}
            />

            <div className="flex items-end">
              <Button className="w-full xl:w-auto">{copy.replace}</Button>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full text-red-500 xl:w-auto">
                {copy.remove}
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<Image size={24} />} title={copy.introVideo}>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
            <div className="relative h-[240px] bg-[var(--color-primary)]/15">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent-dark,#765A1F)] text-3xl text-white">
                  ▶
                </div>
              </div>
            </div>

            <div className="px-6 py-4 text-center text-lg font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
              {copy.previewVideo}
            </div>
          </div>

          <div className="space-y-6">
            <Input
              label={copy.introVideoUrl}
              placeholder={copy.introVideoUrlPlaceholder}
              value={formData.intro_video_url}
              onChange={(e) => updateField('intro_video_url', e.target.value)}
            />

            <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 text-lg leading-8 text-[var(--color-text-muted)]">
              {copy.videoTip}
            </div>
          </div>
        </div>
      </SectionCard>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-secondarySoft)] text-[var(--color-accent-dark,#765A1F)]">
              💡
            </div>

            <div>
              <p className="text-xl font-bold text-[var(--color-accent-dark,#765A1F)]">
                {copy.mediaCurationTips}
              </p>

              <ul className="mt-4 space-y-3 text-lg text-[var(--color-text-muted)]">
                <li>{copy.mediaTipOne}</li>
                <li>{copy.mediaTipTwo}</li>
                <li>{copy.mediaTipThree}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PublishContent({ formData, updateField, copy }) {
  return (
    <div className="space-y-8">
      <SectionCard icon={<Send size={24} />} title={copy.visibility}>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-2xl font-semibold text-[var(--color-text)]">
                {copy.featuredProgram}
              </p>
              <p className="mt-2 text-lg leading-8 text-[var(--color-text-muted)]">
                {copy.featuredProgramDescription}
              </p>
            </div>

            <button
              type="button"
              onClick={() => updateField('is_featured', !formData.is_featured)}
              className={`flex h-10 w-20 items-center rounded-full px-1 ${
                formData.is_featured
                  ? 'bg-[var(--color-accent-dark,#765A1F)]'
                  : 'bg-[var(--color-surface-muted)]'
              }`}
            >
              <span
                className={`flex h-8 w-8 rounded-full bg-white shadow-sm transition-all ${
                  formData.is_featured ? 'ml-auto' : ''
                }`}
              />
            </button>
          </div>

          <div>
            <Badge variant={formData.is_featured ? 'secondary' : 'neutral'}>
              {formData.is_featured ? copy.featured : copy.standard}
            </Badge>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<Send size={24} />} title={copy.publicationStatus}>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-2xl font-semibold text-[var(--color-text)]">
                {copy.activeProgram}
              </p>
              <p className="mt-2 text-lg leading-8 text-[var(--color-text-muted)]">
                {copy.activeProgramDescription}
              </p>
            </div>

            <button
              type="button"
              onClick={() => updateField('is_active', !formData.is_active)}
              className={`flex h-10 w-20 items-center rounded-full px-1 ${
                formData.is_active
                  ? 'bg-[var(--color-accent-dark,#765A1F)]'
                  : 'bg-[var(--color-surface-muted)]'
              }`}
            >
              <span
                className={`flex h-8 w-8 rounded-full bg-white shadow-sm transition-all ${
                  formData.is_active ? 'ml-auto' : ''
                }`}
              />
            </button>
          </div>

          <div>
            <Badge variant={formData.is_active ? 'success' : 'neutral'}>
              {formData.is_active ? copy.active : copy.inactive}
            </Badge>
          </div>
        </div>
      </SectionCard>

      <Card>
        <CardContent className="p-8">
          <h3 className="text-3xl font-bold text-[var(--color-text)]">
            {copy.publicationSummary}
          </h3>

          <div className="mt-8 space-y-6 text-lg">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <span className="text-[var(--color-text-muted)]">{copy.featured}</span>
              <span className="font-semibold text-[var(--color-text)]">
                {formData.is_featured ? copy.yes : copy.no}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <span className="text-[var(--color-text-muted)]">{copy.active}</span>
              <span className="font-semibold text-[var(--color-text)]">
                {formData.is_active ? copy.yes : copy.no}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <span className="text-[var(--color-text-muted)]">{copy.lastEdited}</span>
              <span className="font-semibold text-[var(--color-text)]">{copy.loadedFromApi}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">{copy.readyToPublish}</span>
              <span className="font-semibold text-[#16A34A]">{copy.yes}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-6 py-5 text-lg leading-8 text-[var(--color-text-muted)]">
        {copy.publishFootnote}
      </div>
    </div>
  )
}

export default function ProgramBuilderPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'basic-info'
  const programId = searchParams.get('id') || ''
  const isEditMode = Boolean(programId)
  const language = getCurrentLanguage()
  const copy = useMemo(() => {
    if (language === 'ar') {
      return {
        editProgram: 'تعديل البرنامج',
        createProgram: 'إنشاء برنامج',
        breadcrumbAdmin: 'الإدارة',
        breadcrumbPrograms: 'البرامج',
        pageSubtitle: 'إدارة المحتوى التدريبي والتسعير والوسائط وإعدادات النشر.',
        backToPrograms: 'العودة إلى البرامج',
        saving: 'جارٍ الحفظ...',
        saveChanges: 'حفظ التغييرات',
        saveAndPublish: 'حفظ ونشر',
        cannotActivate: 'لا يمكن تفعيل حقيبة محكومة من هنا: التفعيل يتطلب حالة محتوى «منشور»، ولا يضبطها إلا «نشر الحزمة» في تبويب حقيبة AI.',
        createAndPublish: 'إنشاء ونشر',
        loadingProgramDetails: 'جارٍ تحميل تفاصيل البرنامج...',
        loadProgramError: 'فشل تحميل تفاصيل البرنامج.',
        createNoIdError: 'تم إنشاء البرنامج ولكن لم يتم إرجاع معرف البرنامج.',
        persistPublicationError: 'تعذر حفظ حالة النشر. حاول مرة أخرى.',
        persistFeaturedError: 'تعذر حفظ حالة التمييز. حاول مرة أخرى.',
        saveFailed: 'فشل حفظ تغييرات البرنامج.',
        publishedFrozen: 'هذا الإصدار من الحقيبة منشور: محتواه ثابت. يمكن تغيير السعر وحده، ويُسجَّل التغيير في سجل التدقيق؛ ولتغيير المحتوى افتح إصدارًا جديدًا من الحقيبة.',
        publishedContentChanged: 'هذا الإصدار من الحقيبة منشور: محتواه ثابت، ولم يُحفظ شيء. أعد المحتوى كما كان واحفظ السعر وحده، أو افتح إصدارًا جديدًا من الحقيبة لتغيير المحتوى.',
        savedSuccess: 'تم حفظ تغييرات البرنامج بنجاح.',
        createdSuccess: 'تم إنشاء البرنامج بنجاح.',
        publishUpdatedSuccess: 'تم حفظ البرنامج ونشره بنجاح (نشط ومميز).',
        publishCreatedSuccess: 'تم إنشاء البرنامج ونشره بنجاح (نشط ومميز).',
        untitledProgram: 'برنامج بدون عنوان',
        programCategory: 'تصنيف البرنامج',
        featured: 'مميز',
        standard: 'عادي',
        active: 'نشط',
        inactive: 'غير نشط',
        yes: 'نعم',
        no: 'لا',
        priceUsd: 'دولار أمريكي',
        settingsSnapshot: 'ملخص الإعدادات',
        stateSnapshot: 'ملخص الحالة',
        lastEdited: 'آخر تعديل',
        todayTime: 'اليوم، 14:22',
        visibility: 'الظهور',
        draft: 'مسودة',
        price: 'السعر',
        status: 'الحالة',
        loaded: 'محمل',
        notAvailable: '-',
        pricing: 'التسعير',
        media: 'الوسائط',
        programIdentity: 'هوية البرنامج',
        category: 'التصنيف',
        selectCategory: 'اختر تصنيفًا',
        admissionRoute: 'مسار القبول',
        diplomaAdmissionRule: 'الدبلوم المهني: متاح فقط بعد التحقق من إجازة جامعية أو ليسانس أو بكالوريوس.',
        masterAdmissionRule: 'الماجستير المهني: متاح فقط بعد التحقق من إجازة جامعية ودبلوم أكاديمي.',
        doctorateAdmissionRule: 'الدكتوراه المهنية: متاحة فقط بعد التحقق من إجازة جامعية ودبلوم أكاديمي وماجستير أكاديمي.',
        generalCatalogueRule: 'يحدد التصنيف نوع البرنامج وجمهوره تلقائيًا. لا يمكن تغيير مسار القبول يدويًا.',
        categoryFallbackPrefix: 'تصنيف',
        programTitleRequired: 'عنوان البرنامج *',
        programTitlePlaceholder: 'مثال: ماجستير الدراسات الفقهية المتقدمة',
        shortDescription: 'وصف مختصر',
        shortDescriptionPlaceholder: 'قدّم نظرة موجزة عن أهداف البرنامج...',
        introDetails: 'تفاصيل المقدمة',
        duration: 'المدة',
        durationPlaceholder: 'مثال: 24 شهرًا / دوام كامل',
        introText: 'نص المقدمة',
        introTextPlaceholder: 'اكتب تفاصيل أعمق عن البرنامج...',
        programNarrative: 'وصف البرنامج',
        overviewRequired: 'نظرة عامة *',
        overviewPlaceholder: 'اكتب نظرة شاملة عن البرنامج...',
        learningOutcomesRequired: 'مخرجات التعلم *',
        learningOutcomesPlaceholder: 'حدّد النتائج الأساسية التي سيحققها المتقدمون...',
        learnerFit: 'ملاءمة المتعلم',
        targetAudienceRequired: 'الفئة المستهدفة *',
        targetAudiencePlaceholder: 'صف الملف المثالي للمتقدم...',
        entryRequirementsRequired: 'متطلبات القبول *',
        entryRequirementsPlaceholder: 'حدّد المتطلبات المهنية ووثائق الخبرة المطلوبة...',
        priceRequired: 'السعر (بالدولار الأمريكي) *',
        pricePlaceholder: '49.99',
        priceInvalid: 'أدخل صفرًا أو سعرًا من 1.00 إلى 1,000,000.00 دولار بخانتين عشريتين على الأكثر، مثل 49.99.',
        programPriceHint: 'سعر واحد بالدولار الأمريكي. يدفعه العميل بالليرة السورية مضروبًا في سعر الصرف عند الدفع، مقرّبًا إلى أقرب ليرة. صفر: البرنامج غير مسعّر ولا يُباع.',
        atTodaysRate: 'بسعر اليوم: {syp}',
        noRate: 'لم يُضبط سعر صرف: لا يمكن لأحد الدفع بالليرة السورية حتى يُضبط. ولا يتأثر الدفع بالدولار.',
        finalQuizSettings: 'إعدادات الاختبار النهائي',
        finalQuizTitle: 'عنوان الاختبار النهائي',
        finalQuizTitlePlaceholder: 'Strategic Leadership Final Assessment',
        finalQuizPassPercentage: 'نسبة نجاح الاختبار النهائي',
        finalQuizPassPercentagePlaceholder: '70',
        finalQuizDurationMinutes: 'مدة الاختبار النهائي (بالدقائق)',
        finalQuizDurationMinutesPlaceholder: '30',
        minutesShort: 'دقيقة',
        finalQuizSettingsHint:
          'يحدد البرنامج عنوان الاختبار النهائي ونسبة النجاح، بينما تحدد بنوك الأسئلة عدد الأسئلة المساهمة من كل قسم.',
        pricingGuidance: 'إرشادات التسعير',
        pricingGuidanceBody:
          'لكل برنامج سعر واحد بالدولار الأمريكي (قرار المالك، 17 أكتوبر 2026). يدفع العميل من رصيده بالدولار، أو من رصيده بالليرة السورية بسعر الصرف عند الدفع، ويُثبَّت ما دفعه على طلبه. لا يغيّر تعديل السعر أي شراء تم.',
        featuredImage: 'الصورة الرئيسية',
        recommended: 'المقاس الموصى به',
        imageResolution: '1920×1080',
        imageUrlSource: 'رابط الصورة',
        imageUrlPlaceholder: 'https://images.unsplash.com/photo-...',
        replace: 'استبدال',
        remove: 'إزالة',
        introVideo: 'فيديو المقدمة',
        previewVideo: 'معاينة الفيديو',
        introVideoUrl: 'رابط فيديو المقدمة',
        introVideoUrlPlaceholder: 'https://youtube.com/...',
        videoTip: 'الفيديوهات ترفع تفاعل المتقدمين. يفضل أن تكون المقدمة أقل من دقيقتين.',
        mediaCurationTips: 'نصائح تنسيق الوسائط',
        mediaTipOne: 'استخدم صورًا عالية الدقة ذات طابع احترافي.',
        mediaTipTwo: 'تجنب الصور العامة جدًا أو قليلة الجودة.',
        mediaTipThree: 'تأكد من توفير ترجمة أو توضيح للفيديو عند الحاجة.',
        featuredProgram: 'برنامج مميز',
        featuredProgramDescription:
          'البرامج المميزة تحصل على أولوية الظهور في مناطق العرض الرئيسية.',
        publicationStatus: 'حالة النشر',
        activeProgram: 'برنامج نشط',
        activeProgramDescription:
          'البرامج غير النشطة تبقى في لوحة الإدارة وتكون مخفية عن العرض العام.',
        publicationSummary: 'ملخص النشر',
        loadedFromApi: 'تم التحميل من الـ API',
        readyToPublish: 'جاهز للنشر',
        publishFootnote:
          'يمكن إبقاء البرنامج غير نشط في الإدارة وإعادة تفعيله في أي وقت.',
        documentation: 'التوثيق',
        support: 'الدعم',
        systemStatus: 'حالة النظام',
        footerCopyright: '© 2026 International Commission for the Protection of Civilians',
        tabs: [
          { key: 'basic-info', label: 'معلومات أساسية' },
          { key: 'academic-content', label: 'المحتوى التدريبي' },
          { key: 'pricing', label: 'التسعير' },
          { key: 'media', label: 'الوسائط' },
          { key: 'publish', label: 'النشر' },
          { key: 'ai-package', label: 'حقيبة AI' },
        ],
      }
    }
    return {
      editProgram: 'Edit Program',
      createProgram: 'Create Program',
      breadcrumbAdmin: 'Admin',
      breadcrumbPrograms: 'Programs',
      pageSubtitle: 'Manage training content, pricing, media, and publication settings.',
      backToPrograms: 'Back to Programs',
      saving: 'Saving...',
      saveChanges: 'Save Changes',
      saveAndPublish: 'Save & Publish',
      cannotActivate: 'A governed package cannot be activated here: activation needs content status "published", and only Publish package on the AI tab sets that.',
      createAndPublish: 'Create & Publish',
      loadingProgramDetails: 'Loading program details...',
      loadProgramError: 'Failed to load program details.',
      createNoIdError: 'Program was created but no program ID was returned.',
      persistPublicationError: 'Publication status could not be persisted. Please try again.',
      persistFeaturedError: 'Featured status could not be persisted. Please try again.',
      saveFailed: 'Failed to save program changes.',
      publishedFrozen: 'This package version is published: its content is frozen. The price alone can change, and the change is audited; open a new package version to change the content.',
      publishedContentChanged: 'This package version is published: its content is frozen, and nothing was saved. Put the content back and save the price alone, or open a new package version to change the content.',
      savedSuccess: 'Program changes saved successfully.',
      createdSuccess: 'Program created successfully.',
      publishUpdatedSuccess:
        'Program saved and published successfully (set to Active and Featured).',
      publishCreatedSuccess:
        'Program created and published successfully (set to Active and Featured).',
      untitledProgram: 'Untitled Program',
      programCategory: 'Program Category',
      featured: 'Featured',
      standard: 'Standard',
      active: 'Active',
      inactive: 'Inactive',
      yes: 'Yes',
      no: 'No',
      priceUsd: 'US dollars',
      settingsSnapshot: 'Settings Snapshot',
      stateSnapshot: 'State Snapshot',
      lastEdited: 'Last Edited',
      todayTime: 'Today, 14:22',
      visibility: 'Visibility',
      draft: 'Draft',
      price: 'Price',
      status: 'Status',
      loaded: 'Loaded',
      notAvailable: '-',
      pricing: 'Pricing',
      media: 'Media',
      programIdentity: 'Program Identity',
      category: 'Category',
      selectCategory: 'Select category',
      admissionRoute: 'Admission route',
      diplomaAdmissionRule: 'Professional Diploma: available only after a bachelor, licence, or equivalent degree has been verified.',
      masterAdmissionRule: 'Professional Master\'s: available only after a bachelor/licence and academic diploma have been verified.',
      doctorateAdmissionRule: 'Professional Doctorate: available only after a bachelor/licence, academic diploma, and academic master have been verified.',
      generalCatalogueRule: 'The category automatically determines the program type and audience. The admission route cannot be changed manually.',
      categoryFallbackPrefix: 'Category',
      programTitleRequired: 'Program Title *',
      programTitlePlaceholder: 'e.g. Master of Advanced Fiqh Studies',
      shortDescription: 'Short Description',
      shortDescriptionPlaceholder: 'Provide a brief overview of the program objectives...',
      introDetails: 'Intro Details',
      duration: 'Duration',
      durationPlaceholder: 'e.g. 24 Months / Full-time',
      introText: 'Intro Text',
      introTextPlaceholder: 'Deep dive into program details...',
      programNarrative: 'Program Narrative',
      overviewRequired: 'Overview *',
      overviewPlaceholder: 'Provide a comprehensive program overview...',
      learningOutcomesRequired: 'Learning Outcomes *',
      learningOutcomesPlaceholder: 'Define the key outcomes participants will achieve...',
      learnerFit: 'Learner Fit',
      targetAudienceRequired: 'Target Audience *',
      targetAudiencePlaceholder: 'Describe the ideal candidate profile...',
      entryRequirementsRequired: 'Entry Requirements *',
      entryRequirementsPlaceholder: 'Specify professional prerequisites and evidence documents...',
      priceRequired: 'Price (US dollars) *',
      pricePlaceholder: '49.99',
      priceInvalid: 'Enter 0, or a price from 1.00 to 1,000,000.00 US dollars with at most two decimals, such as 49.99.',
      programPriceHint: 'One price in US dollars. A client paying in Syrian pounds pays it × the exchange rate when he pays, rounded to the whole pound. 0: the programme is not priced and not sold.',
      atTodaysRate: 'At today\'s rate: {syp}',
      noRate: 'No exchange rate is set: nobody can pay in Syrian pounds until one is set. Dollar payments are not affected.',
      finalQuizSettings: 'Final Quiz Settings',
      finalQuizTitle: 'Final Quiz Title',
      finalQuizTitlePlaceholder: 'e.g. Strategic Leadership Final Assessment',
      finalQuizPassPercentage: 'Final Quiz Pass Percentage',
      finalQuizPassPercentagePlaceholder: '70',
      finalQuizDurationMinutes: 'Final Quiz Duration (Minutes)',
      finalQuizDurationMinutesPlaceholder: '30',
      minutesShort: 'minutes',
      finalQuizSettingsHint:
        'Programs now own the learner-facing final quiz title, pass percentage, and duration timer. Section question banks control how many questions they contribute per attempt.',
      pricingGuidance: 'Pricing Guidance',
      pricingGuidanceBody:
        'Each programme has one price, in US dollars (owner decision, 17 Oct 2026). The client pays from his dollar balance, or from his Syrian-pound balance at the exchange rate when he pays, and what he paid is frozen on his order. Changing the price never changes a purchase already made.',
      featuredImage: 'Featured Image',
      recommended: 'Recommended',
      imageResolution: '1920×1080',
      imageUrlSource: 'Image URL Source',
      imageUrlPlaceholder: 'https://images.unsplash.com/photo-...',
      replace: 'Replace',
      remove: 'Remove',
      introVideo: 'Intro Video',
      previewVideo: 'Preview Video',
      introVideoUrl: 'Intro Video URL',
      introVideoUrlPlaceholder: 'https://youtube.com/...',
      videoTip: 'Videos increase student engagement by up to 64%. Keep your intro under 2 minutes for best results.',
      mediaCurationTips: 'Media Curation Tips',
      mediaTipOne: 'Use high-resolution architecture or nature shots.',
      mediaTipTwo: 'Avoid stock photography with overly generic models.',
      mediaTipThree: 'Ensure video captions are enabled for accessibility.',
      featuredProgram: 'Featured Program',
      featuredProgramDescription:
        'Featured programs receive priority placement in highlighted catalog areas.',
      publicationStatus: 'Publication Status',
      activeProgram: 'Active Program',
      activeProgramDescription:
        'Inactive programs remain in admin and are hidden from public availability.',
      publicationSummary: 'Publication Summary',
      loadedFromApi: 'Loaded from API',
      readyToPublish: 'Ready to Publish',
      publishFootnote:
        'Inactive programs remain visible in admin and can be reactivated at any time.',
      documentation: 'Documentation',
      support: 'Support',
      systemStatus: 'System Status',
      footerCopyright: '© 2026 International Commission for the Protection of Civilians',
      tabs: [
        { key: 'basic-info', label: 'Basic Info' },
        { key: 'academic-content', label: 'Training Content' },
        { key: 'pricing', label: 'Pricing' },
        { key: 'media', label: 'Media' },
        { key: 'publish', label: 'Publish' },
        { key: 'ai-package', label: 'AI Package' },
      ],
    }
  }, [language])

  const builderTabs = useMemo(() => {
    const sourceTabs = Array.isArray(copy.tabs) ? copy.tabs : []
    if (sourceTabs.some((tab) => tab?.key === 'final-quiz')) {
      return sourceTabs
    }

    const insertIndex = sourceTabs.findIndex((tab) => tab?.key === 'media')
    const finalQuizTab = {
      key: 'final-quiz',
      label: copy.finalQuizSettings || 'Final Quiz',
    }

    if (insertIndex < 0) {
      return [...sourceTabs, finalQuizTab]
    }

    return [
      ...sourceTabs.slice(0, insertIndex),
      finalQuizTab,
      ...sourceTabs.slice(insertIndex),
    ]
  }, [copy.tabs, copy.finalQuizSettings])

  const [activeLanguage, setActiveLanguage] = useState(
    language === 'ar' ? language : 'en'
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  // Today's USD -> SYP rate, for the pricing tab's preview only; read once that tab is open.
  const exchange = useExchangeRate({ enabled: activeTab === 'pricing' })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  // The server's publication verdict, returned on every programme fetch.
  const [readiness, setReadiness] = useState(null)
  const [contentStatus, setContentStatus] = useState('')
  // A published package (PB-06): its content as loaded, to tell a price-only save from a content change.
  const [packageFrozen, setPackageFrozen] = useState(false)
  const frozenBaseline = useRef('')
  const [categories, setCategories] = useState([])

  const [formData, setFormData] = useState({
    category_id: '',
    category_name: '',
    title: { en: '', ar: '' },
    short_description: { en: '', ar: '' },
    overview: { en: '', ar: '' },
    outcomes: { en: '', ar: '' },
    target_audience: { en: '', ar: '' },
    entry_requirements: { en: '', ar: '' },
    duration: { en: '', ar: '' },
    price_usd: '',
    featured_image: '',
    intro_video_url: '',
    intro_text: { en: '', ar: '' },
    final_quiz_title: { en: '', ar: '' },
    final_quiz_pass_percentage: '',
    final_quiz_duration_minutes: '',
    is_featured: false,
    is_active: false,
    program_type: '',
  })

  useEffect(() => {
    const loadProgram = async () => {
      if (!programId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const result = await fetchAdminProgramById(programId)
        const program = normalizeProgramPayload(result)
        setFormData(mapProgramToFormData(program))
        // The server sends the publication verdict on every fetch. Keep it —
        // mapProgramToFormData is about editable fields and drops it.
        setReadiness(program?.catalog_readiness || null)
        setContentStatus(program?.content_status || '')
        setPackageFrozen(isPublishedPackage(program))
        frozenBaseline.current = frozenContentOf(buildProgramPayload(mapProgramToFormData(program)))
      } catch (err) {
        setError(readApiError(err, copy.loadProgramError))
      } finally {
        setIsLoading(false)
      }
    }

    loadProgram()
  }, [programId, copy.loadProgramError])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await fetchAdminCategories()
        const raw = result?.data?.data || result?.data || []
        const normalized = Array.isArray(raw) ? raw : []
        setCategories(normalized)
      } catch (err) {
        console.error(copy.loadProgramError, err)
      }
    }

    loadCategories()
  }, [copy.loadProgramError])

  const handleTabChange = (tab) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('tab', tab)
    if (programId) nextParams.set('id', programId)
    setSearchParams(nextParams)
  }

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

  const handleSave = async ({ publish = false } = {}) => {
    // A price the API would refuse is said here, before anything is sent.
    if (programPriceMinor(formData.price_usd) == null) {
      setSaveMessage('')
      setSaveError(copy.priceInvalid)
      return
    }
    const desiredFeatured = publish ? true : Boolean(formData.is_featured)
    const desiredActive = publish ? true : Boolean(formData.is_active)
    const payload = buildProgramPayload({
      ...formData,
      is_featured: desiredFeatured,
    })
    // A published package saves its price alone; any other change is stopped here, in the screen's language (PB-06).
    const priceOnly = Boolean(programId) && packageFrozen
    if (priceOnly && frozenContentOf(payload) !== frozenBaseline.current) {
      setSaveMessage('')
      setSaveError(copy.publishedContentChanged)
      return
    }
    setIsSaving(true)
    setSaveError('')
    setSaveMessage('')

    try {
      const wasEditMode = Boolean(programId)
      let targetProgramId = programId

      if (targetProgramId && priceOnly) {
        await updateAdminProgramPrice(targetProgramId, { price_usd_minor: payload.price_usd_minor })
      } else if (targetProgramId) {
        await updateAdminProgram(targetProgramId, payload)
      } else {
        const createdProgramResult = await createAdminProgram(payload)
        const createdProgram = normalizeProgramPayload(createdProgramResult)
        const createdProgramId = createdProgram?.id

        if (!createdProgramId) {
          throw new Error(copy.createNoIdError)
        }

        targetProgramId = String(createdProgramId)
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('id', targetProgramId)
        nextParams.set('tab', activeTab)
        setSearchParams(nextParams)
      }

      const updatedProgramResult = await fetchAdminProgramById(targetProgramId)
      const updatedProgram = normalizeProgramPayload(updatedProgramResult)
      const updatedIsActive = Boolean(updatedProgram?.is_active)

      let finalProgram = updatedProgram
      if (updatedIsActive !== desiredActive) {
        await toggleAdminProgramActive(targetProgramId)

        const toggledProgramResult = await fetchAdminProgramById(targetProgramId)
        finalProgram = normalizeProgramPayload(toggledProgramResult)
      }

      const persistedIsActive = Boolean(finalProgram?.is_active)
      if (persistedIsActive !== desiredActive) {
        throw new Error(copy.persistPublicationError)
      }

      const persistedIsFeatured = Boolean(finalProgram?.is_featured)
      if (persistedIsFeatured !== desiredFeatured) {
        throw new Error(copy.persistFeaturedError)
      }

      setFormData(mapProgramToFormData(finalProgram))
      setPackageFrozen(isPublishedPackage(finalProgram))
      frozenBaseline.current = frozenContentOf(buildProgramPayload(mapProgramToFormData(finalProgram)))
      // Re-read the verdict after saving, so the checklist reflects what was
      // just fixed instead of the state the page was opened in.
      if (finalProgram?.catalog_readiness) setReadiness(finalProgram.catalog_readiness)
      if (finalProgram?.content_status) setContentStatus(finalProgram.content_status)

      setSaveMessage(
        publish
          ? wasEditMode
            ? copy.publishUpdatedSuccess
            : copy.publishCreatedSuccess
          : wasEditMode
          ? copy.savedSuccess
          : copy.createdSuccess
      )
    } catch (err) {
      /*
       * readApiError flattens `errors` on a 422. The old code read
       * `data.message`, which Laravel renders as the FIRST error plus
       * "(and N more errors)" — so activation failures showed one line and
       * silently dropped the `missing` list that says what to fix.
       */
      setSaveError(readApiError(err, copy.saveFailed))
    } finally {
      setIsSaving(false)
    }
  }

  /*
   * Activation of a governed package is not this screen's to give. toggle-active
   * refuses unless content_status is 'published', and only publish-package can
   * set that — so for a gap programme that is not yet published, Save & Publish
   * can only ever return 422.
   */
  const cannotActivateHere =
    Boolean(formData.competency_gap_group_id) && contentStatus !== 'published'

  const titleText = useMemo(() => {
    const defaultTitle = isEditMode ? copy.editProgram : copy.createProgram
    return formData.title?.[activeLanguage] || formData.title?.en || defaultTitle
  }, [formData.title, activeLanguage, isEditMode, copy.editProgram, copy.createProgram])

  const renderMainContent = () => {
    switch (activeTab) {
      case 'basic-info':
        return (
          <BasicInfoContent
            formData={formData}
            categories={categories}
            activeLanguage={activeLanguage}
            setActiveLanguage={setActiveLanguage}
            updateField={updateField}
            updateLocalizedField={updateLocalizedField}
            copy={copy}
            language={language}
          />
        )
      case 'academic-content':
        return (
          <AcademicContentContent
            formData={formData}
            activeLanguage={activeLanguage}
            setActiveLanguage={setActiveLanguage}
            updateLocalizedField={updateLocalizedField}
            copy={copy}
          />
        )
      case 'pricing':
        return (
          <PricingContent
            formData={formData}
            updateField={updateField}
            copy={copy}
            language={language}
            exchange={exchange}
          />
        )
      case 'final-quiz':
        return (
          <FinalQuizContent
            formData={formData}
            activeLanguage={activeLanguage}
            setActiveLanguage={setActiveLanguage}
            updateField={updateField}
            updateLocalizedField={updateLocalizedField}
            copy={copy}
          />
        )
      case 'media':
        return <MediaContent formData={formData} updateField={updateField} copy={copy} />
      case 'publish':
        return <PublishContent formData={formData} updateField={updateField} copy={copy} />
      case 'ai-package': {
        /*
         * ORDER FOLLOWS WHERE THE PROGRAMME ACTUALLY IS.
         *
         * The seed pack is a PREREQUISITE — without approved competency
         * mappings the generator refuses — so it leads while that is still
         * outstanding. Once it is satisfied the card is a finished step, and
         * leaving it on top pushed the publication gates below the fold on a
         * package whose only remaining work was those gates.
         *
         * competency_mapping is the honest signal: it passes only when the
         * seed pack has been approved.
         */
        const seedPackDone = Boolean(readiness?.checklist?.competency_mapping)
        const seedPack = <SeedPackPanel key="seed" programId={programId} />
        const aiPackage = (
          <AiPackagePanel
            key="ai"
            programId={programId}
            isGoverned={Boolean(formData.competency_gap_group_id || formData.official_code)}
            officialCode={formData.official_code || ''}
          />
        )

        return (
          <div className="space-y-6">
            {seedPackDone ? [aiPackage, seedPack] : [seedPack, aiPackage]}
          </div>
        )
      }
      default:
        return (
          <BasicInfoContent
            formData={formData}
            categories={categories}
            activeLanguage={activeLanguage}
            setActiveLanguage={setActiveLanguage}
            updateField={updateField}
            updateLocalizedField={updateLocalizedField}
            copy={copy}
            language={language}
          />
        )
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-[var(--color-text-muted)]">
            {copy.breadcrumbAdmin} &nbsp;›&nbsp; {copy.breadcrumbPrograms} &nbsp;›&nbsp;
            <span className="font-semibold text-[var(--color-accent-dark,#765A1F)]">
              {isEditMode ? copy.editProgram : copy.createProgram}
            </span>
          </p>

          <h1 className="mt-4 break-words text-3xl font-bold leading-tight text-[var(--color-text)] sm:text-4xl lg:text-5xl">
            {titleText}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--color-text-muted)] sm:text-lg">
            {copy.pageSubtitle}
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-3 xl:flex xl:w-auto xl:items-center">
          <Button
            variant="outline"
            className="w-full !h-12 !rounded-xl !px-5 !text-base xl:w-auto"
            onClick={() => navigate('/programs')}
          >
            {copy.backToPrograms}
          </Button>

          <Button
            variant="secondary"
            className="w-full !h-12 !rounded-xl !px-5 !text-base xl:w-auto"
            onClick={() => handleSave()}
            disabled={isSaving}
          >
            {isSaving ? copy.saving : isEditMode ? copy.saveChanges : copy.createProgram}
          </Button>

          {/*
            A governed CGP package cannot be activated from here at all:
            toggle-active requires content_status 'published', which only
            publish-package sets. Offering the button anyway produced a 422 on
            every click and taught nothing — the fastest way to look broken is
            to keep answering a reasonable action with a refusal.
          */}
          <Button
            className="w-full !h-12 !rounded-xl !px-5 !text-base xl:w-auto"
            onClick={() => handleSave({ publish: true })}
            disabled={isSaving || cannotActivateHere}
            title={cannotActivateHere ? copy.cannotActivate : undefined}
          >
            {isSaving ? copy.saving : isEditMode ? copy.saveAndPublish : copy.createAndPublish}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/*
          Belongs here, not beside the buttons. The header is xl:flex-row, so a
          paragraph placed next to the button grid becomes a third flex item and
          squeezes both the title and the buttons — which is exactly what it did.
          This block is full width and already carries save messages.
        */}
        {cannotActivateHere ? (
          <p className="max-w-3xl text-sm text-[var(--color-text-muted)]">
            {copy.cannotActivate}
          </p>
        ) : null}

        {packageFrozen ? (
          <p role="note" className="max-w-3xl rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">
            {copy.publishedFrozen}
          </p>
        ) : null}

        {saveMessage ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {saveMessage}
          </div>
        ) : null}

        {saveError ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
            {saveError}
          </div>
        ) : null}

        <BuilderTabs activeTab={activeTab} onTabChange={handleTabChange} tabs={builderTabs} />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-[var(--color-text-muted)]">
            {copy.loadingProgramDetails}
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-red-600">{error}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[1.8fr_0.9fr]">
          <div className="space-y-8">{renderMainContent()}</div>

          <div className="space-y-6">
            {/* Above the preview: what stops this programme going live matters
                more than what it will look like when it does. */}
            <PublicationReadinessCard
              readiness={readiness}
              contentStatus={contentStatus}
              language={language}
              onGoToTab={handleTabChange}
            />
            <PreviewCard formData={formData} activeLanguage={activeLanguage} copy={copy} language={language} />
            {activeTab === 'pricing' || activeTab === 'final-quiz' ? (
              <PricingSnapshotCard formData={formData} copy={copy} language={language} />
            ) : activeTab === 'publish' ? (
              <PublishSnapshotCard formData={formData} copy={copy} />
            ) : (
              <SnapshotCard copy={copy} />
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-6 text-sm uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        <div className="flex items-center gap-10">
          <span>{copy.documentation}</span>
          <span>{copy.support}</span>
          <span>{copy.systemStatus}</span>
        </div>

        <div className="flex items-center gap-3">
          <Globe size={16} />
          <span>{copy.footerCopyright}</span>
        </div>
      </div>
    </div>
  )
}
