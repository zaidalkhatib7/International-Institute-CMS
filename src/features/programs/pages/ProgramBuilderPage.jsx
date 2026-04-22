import { useEffect, useMemo, useState } from 'react'
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
  Select,
  Textarea,
} from '../../../components/ui'
import {
  createAdminProgram,
  fetchAdminCategories,
  fetchAdminProgramById,
  toggleAdminProgramActive,
  updateAdminProgram,
} from '../services/programsService'
import { getCurrentLanguage, readLocalizedValue } from '../../../utils/localization'

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

function normalizeProgramPayload(payload) {
  return payload?.data?.data || payload?.data || payload
}

function hasAnyLocalizedValue(value) {
  if (!value || typeof value !== 'object') return false
  return Object.values(value).some((entry) => String(entry || '').trim())
}

function mapProgramToFormData(program) {
  return {
    category_id: program?.category_id
      ? String(program.category_id)
      : program?.category?.id
      ? String(program.category.id)
      : '',
    title: {
      en: readLocalized(program?.title),
      ar: program?.title?.ar || '',
      nl: program?.title?.nl || '',
    },
    short_description: {
      en: readLocalized(program?.short_description),
      ar: program?.short_description?.ar || '',
      nl: program?.short_description?.nl || '',
    },
    overview: {
      en: readLocalized(program?.overview),
      ar: program?.overview?.ar || '',
      nl: program?.overview?.nl || '',
    },
    outcomes: {
      en: readLocalized(program?.outcomes),
      ar: program?.outcomes?.ar || '',
      nl: program?.outcomes?.nl || '',
    },
    target_audience: {
      en: readLocalized(program?.target_audience),
      ar: program?.target_audience?.ar || '',
      nl: program?.target_audience?.nl || '',
    },
    entry_requirements: {
      en: readLocalized(program?.entry_requirements),
      ar: program?.entry_requirements?.ar || '',
      nl: program?.entry_requirements?.nl || '',
    },
    duration: {
      en: sanitizeLocalizedValue(readLocalized(program?.duration)),
      ar: sanitizeLocalizedValue(program?.duration?.ar),
      nl: sanitizeLocalizedValue(program?.duration?.nl),
    },
    fees: program?.fees ?? '',
    currency: program?.currency || 'EUR',
    price_points: program?.price_points ?? '',
    featured_image: program?.featured_image || '',
    intro_video_url: program?.intro_video_url || '',
    intro_text: {
      en: readLocalized(program?.intro_text),
      ar: program?.intro_text?.ar || '',
      nl: program?.intro_text?.nl || '',
    },
    final_quiz_title: {
      en: readLocalized(program?.final_quiz_title),
      ar: program?.final_quiz_title?.ar || '',
      nl: program?.final_quiz_title?.nl || '',
    },
    final_quiz_pass_percentage:
      program?.final_quiz_pass_percentage != null ? String(program.final_quiz_pass_percentage) : '',
    is_featured: Boolean(program?.is_featured),
    is_active: Boolean(program?.is_active),
    category_name:
      program?.category?.name?.en ||
      program?.category?.name?.ar ||
      program?.category?.name?.nl ||
      program?.category?.name ||
      titleFromSlug(program?.category?.slug) ||
      '',
  }
}

function buildProgramPayload(formData) {
  const finalQuizTitle = {
    en: formData.final_quiz_title?.en || '',
    ar: formData.final_quiz_title?.ar || '',
    nl: formData.final_quiz_title?.nl || '',
  }
  const finalQuizPassPercentage =
    formData.final_quiz_pass_percentage === ''
      ? null
      : Number(formData.final_quiz_pass_percentage)

  return {
    category_id: formData.category_id ? Number(formData.category_id) : null,
    title: {
      en: formData.title?.en || '',
      ar: formData.title?.ar || '',
      nl: formData.title?.nl || '',
    },
    short_description: {
      en: formData.short_description?.en || '',
      ar: formData.short_description?.ar || '',
      nl: formData.short_description?.nl || '',
    },
    overview: {
      en: formData.overview?.en || '',
      ar: formData.overview?.ar || '',
      nl: formData.overview?.nl || '',
    },
    outcomes: {
      en: formData.outcomes?.en || '',
      ar: formData.outcomes?.ar || '',
      nl: formData.outcomes?.nl || '',
    },
    target_audience: {
      en: formData.target_audience?.en || '',
      ar: formData.target_audience?.ar || '',
      nl: formData.target_audience?.nl || '',
    },
    entry_requirements: {
      en: formData.entry_requirements?.en || '',
      ar: formData.entry_requirements?.ar || '',
      nl: formData.entry_requirements?.nl || '',
    },
    duration: {
      en: sanitizeLocalizedValue(formData.duration?.en),
      ar: sanitizeLocalizedValue(formData.duration?.ar),
      nl: sanitizeLocalizedValue(formData.duration?.nl),
    },
    fees: formData.fees === '' ? 0 : Number(formData.fees),
    currency: formData.currency || 'EUR',
    price_points: formData.price_points === '' ? 0 : Number(formData.price_points),
    featured_image: formData.featured_image || '',
    intro_video_url: formData.intro_video_url || '',
    intro_text: {
      en: formData.intro_text?.en || '',
      ar: formData.intro_text?.ar || '',
      nl: formData.intro_text?.nl || '',
    },
    ...(hasAnyLocalizedValue(finalQuizTitle) ? { final_quiz_title: finalQuizTitle } : {}),
    ...(finalQuizPassPercentage != null
      ? { final_quiz_pass_percentage: finalQuizPassPercentage }
      : {}),
    is_featured: Boolean(formData.is_featured),
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

function PreviewCard({ formData, activeLanguage, copy }) {
  const title =
    formData.title?.[activeLanguage] || formData.title?.en || copy.untitledProgram
  const category = formData.category_name || copy.programCategory
  const points = formData.price_points || '0'

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
            {points}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-accent-dark,#765A1F)]">{copy.iiPoints}</p>
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

function PricingSnapshotCard({ formData, copy }) {
  const finalQuizTitle =
    formData.final_quiz_title?.en || formData.final_quiz_title?.ar || formData.final_quiz_title?.nl

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
          {copy.settingsSnapshot}
        </h3>

        <div className="mt-8 space-y-5 text-lg">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">{copy.fees}</span>
            <span className="font-medium text-[var(--color-text)]">{formData.fees || copy.notAvailable}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">{copy.currency}</span>
            <span className="font-medium text-[var(--color-text)]">
              {formData.currency || copy.notAvailable}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">{copy.pricePoints}</span>
            <span className="font-medium text-[var(--color-accent-dark,#765A1F)]">
              {formData.price_points || copy.notAvailable}
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

function PricingContent({
  formData,
  activeLanguage,
  setActiveLanguage,
  updateField,
  updateLocalizedField,
  copy,
}) {
  return (
    <div className="space-y-8">
      <SectionCard icon={<Wallet size={24} />} title={copy.tuitionAndCurrency}>
        <div className="grid gap-6 md:grid-cols-2">
          <Input
            label={copy.feesRequired}
            placeholder={copy.feesPlaceholder}
            value={formData.fees}
            onChange={(e) => updateField('fees', e.target.value)}
          />

          <Select
            label={copy.currencyRequired}
            value={formData.currency}
            onChange={(e) => updateField('currency', e.target.value)}
          >
            <option value="EUR">{copy.currencyEuro}</option>
            <option value="USD">{copy.currencyUsd}</option>
            <option value="GBP">{copy.currencyGbp}</option>
          </Select>
        </div>
      </SectionCard>

      <SectionCard icon={<Wallet size={24} />} title={copy.internalPointsPricing}>
        <div className="space-y-6">
          <Input
            label={copy.pricePointsRequired}
            placeholder={copy.pricePointsPlaceholder}
            value={formData.price_points}
            onChange={(e) => updateField('price_points', e.target.value)}
          />

          <p className="text-sm text-[var(--color-text-muted)]">
            {copy.pointsPricingHint}
          </p>

          <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  {copy.currencyPrice}
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--color-text)]">
                  {formData.currency || 'EUR'} {formData.fees || '0'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  {copy.pointsPrice}
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--color-accent-dark,#765A1F)]">
                  {formData.price_points || '0'} {copy.iiPoints}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

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

          <p className="text-sm text-[var(--color-text-muted)]">{copy.finalQuizSettingsHint}</p>
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
        pageSubtitle: 'إدارة المحتوى الأكاديمي والتسعير والوسائط وإعدادات النشر.',
        backToPrograms: 'العودة إلى البرامج',
        saving: 'جارٍ الحفظ...',
        saveChanges: 'حفظ التغييرات',
        saveAndPublish: 'حفظ ونشر',
        createAndPublish: 'إنشاء ونشر',
        loadingProgramDetails: 'جارٍ تحميل تفاصيل البرنامج...',
        loadProgramError: 'فشل تحميل تفاصيل البرنامج.',
        createNoIdError: 'تم إنشاء البرنامج ولكن لم يتم إرجاع معرف البرنامج.',
        persistPublicationError: 'تعذر حفظ حالة النشر. حاول مرة أخرى.',
        persistFeaturedError: 'تعذر حفظ حالة التمييز. حاول مرة أخرى.',
        saveFailed: 'فشل حفظ تغييرات البرنامج.',
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
        iiPoints: 'نقاط II',
        settingsSnapshot: 'ملخص الإعدادات',
        stateSnapshot: 'ملخص الحالة',
        lastEdited: 'آخر تعديل',
        todayTime: 'اليوم، 14:22',
        visibility: 'الظهور',
        draft: 'مسودة',
        fees: 'الرسوم',
        currency: 'العملة',
        pricePoints: 'نقاط السعر',
        status: 'الحالة',
        loaded: 'محمل',
        notAvailable: '-',
        pricing: 'التسعير',
        media: 'الوسائط',
        programIdentity: 'هوية البرنامج',
        category: 'التصنيف',
        selectCategory: 'اختر تصنيفًا',
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
        programNarrative: 'السرد الأكاديمي',
        overviewRequired: 'نظرة عامة *',
        overviewPlaceholder: 'اكتب نظرة شاملة عن البرنامج...',
        learningOutcomesRequired: 'مخرجات التعلم *',
        learningOutcomesPlaceholder: 'حدّد النتائج الأساسية التي سيحققها الطلاب...',
        learnerFit: 'ملاءمة المتعلم',
        targetAudienceRequired: 'الفئة المستهدفة *',
        targetAudiencePlaceholder: 'صف الملف المثالي للمتقدم...',
        entryRequirementsRequired: 'متطلبات القبول *',
        entryRequirementsPlaceholder: 'حدّد المتطلبات الأكاديمية والوثائق المطلوبة...',
        tuitionAndCurrency: 'الرسوم والعملة',
        feesRequired: 'الرسوم *',
        feesPlaceholder: '499.00',
        currencyRequired: 'العملة *',
        currencyEuro: 'EUR - يورو',
        currencyUsd: 'USD - دولار أمريكي',
        currencyGbp: 'GBP - جنيه إسترليني',
        internalPointsPricing: 'التسعير بالنقاط الداخلية',
        pricePointsRequired: 'نقاط السعر *',
        pricePointsPlaceholder: '500',
        pointsPricingHint: 'يمكن تسعير البرامج بنقاط المؤسسة بجانب العملة.',
        finalQuizSettings: 'إعدادات الاختبار النهائي',
        finalQuizTitle: 'عنوان الاختبار النهائي',
        finalQuizTitlePlaceholder: 'Strategic Leadership Final Assessment',
        finalQuizPassPercentage: 'نسبة نجاح الاختبار النهائي',
        finalQuizPassPercentagePlaceholder: '70',
        finalQuizSettingsHint:
          'يحدد البرنامج عنوان الاختبار النهائي ونسبة النجاح، بينما تحدد بنوك الأسئلة عدد الأسئلة المساهمة من كل قسم.',
        currencyPrice: 'السعر بالعملة',
        pointsPrice: 'السعر بالنقاط',
        pricingGuidance: 'إرشادات التسعير',
        pricingGuidanceBody:
          'يعتمد المعهد نموذج تسعير مزدوج. يمكن للطلاب الدفع بالعملة أو باستخدام النقاط المؤسسية (نقاط II).',
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
        videoTip: 'الفيديوهات ترفع تفاعل الطلاب. يفضل أن تكون المقدمة أقل من دقيقتين.',
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
        footerCopyright: '© 2024 International Institute for Studies Netherlands',
        tabs: [
          { key: 'basic-info', label: 'معلومات أساسية' },
          { key: 'academic-content', label: 'المحتوى الأكاديمي' },
          { key: 'pricing', label: 'التسعير' },
          { key: 'media', label: 'الوسائط' },
          { key: 'publish', label: 'النشر' },
        ],
      }
    }
    if (language === 'nl') {
      return {
        editProgram: 'Programma bewerken',
        createProgram: 'Programma maken',
        breadcrumbAdmin: 'Beheer',
        breadcrumbPrograms: 'Programma\'s',
        pageSubtitle: 'Beheer academische inhoud, prijzen, media en publicatie-instellingen.',
        backToPrograms: 'Terug naar programma\'s',
        saving: 'Opslaan...',
        saveChanges: 'Wijzigingen opslaan',
        saveAndPublish: 'Opslaan en publiceren',
        createAndPublish: 'Maken en publiceren',
        loadingProgramDetails: 'Programmadata laden...',
        loadProgramError: 'Programmadata laden mislukt.',
        createNoIdError: 'Programma is aangemaakt maar er is geen ID teruggekomen.',
        persistPublicationError: 'Publicatiestatus kon niet worden opgeslagen. Probeer opnieuw.',
        persistFeaturedError: 'Uitgelichte status kon niet worden opgeslagen. Probeer opnieuw.',
        saveFailed: 'Programmawijzigingen opslaan mislukt.',
        savedSuccess: 'Programmawijzigingen succesvol opgeslagen.',
        createdSuccess: 'Programma succesvol aangemaakt.',
        publishUpdatedSuccess:
          'Programma succesvol opgeslagen en gepubliceerd (Actief en Uitgelicht).',
        publishCreatedSuccess:
          'Programma succesvol aangemaakt en gepubliceerd (Actief en Uitgelicht).',
        untitledProgram: 'Programma zonder titel',
        programCategory: 'Programmacategorie',
        featured: 'Uitgelicht',
        standard: 'Standaard',
        active: 'Actief',
        inactive: 'Inactief',
        yes: 'Ja',
        no: 'Nee',
        iiPoints: 'II-punten',
        settingsSnapshot: 'Instellingenoverzicht',
        stateSnapshot: 'Statusoverzicht',
        lastEdited: 'Laatst bewerkt',
        todayTime: 'Vandaag, 14:22',
        visibility: 'Zichtbaarheid',
        draft: 'Concept',
        fees: 'Kosten',
        currency: 'Valuta',
        pricePoints: 'Prijspunten',
        status: 'Status',
        loaded: 'Geladen',
        notAvailable: '-',
        pricing: 'Prijzen',
        media: 'Media',
        programIdentity: 'Programma-identiteit',
        category: 'Categorie',
        selectCategory: 'Selecteer categorie',
        categoryFallbackPrefix: 'Categorie',
        programTitleRequired: 'Programmatitel *',
        programTitlePlaceholder: 'bijv. Master of Advanced Fiqh Studies',
        shortDescription: 'Korte omschrijving',
        shortDescriptionPlaceholder: 'Geef een korte samenvatting van de programmalijnen...',
        introDetails: 'Introductiedetails',
        duration: 'Duur',
        durationPlaceholder: 'bijv. 24 maanden / voltijd',
        introText: 'Introductietekst',
        introTextPlaceholder: 'Geef meer details over het programma...',
        programNarrative: 'Programma-inhoud',
        overviewRequired: 'Overzicht *',
        overviewPlaceholder: 'Geef een uitgebreid programmaoverzicht...',
        learningOutcomesRequired: 'Leerdoelen *',
        learningOutcomesPlaceholder: 'Beschrijf de belangrijkste leerresultaten...',
        learnerFit: 'Doelgroepfit',
        targetAudienceRequired: 'Doelgroep *',
        targetAudiencePlaceholder: 'Beschrijf het ideale profiel van de deelnemer...',
        entryRequirementsRequired: 'Toelatingseisen *',
        entryRequirementsPlaceholder: 'Specificeer vereisten en benodigde documenten...',
        tuitionAndCurrency: 'Collegegeld en valuta',
        feesRequired: 'Kosten *',
        feesPlaceholder: '499.00',
        currencyRequired: 'Valuta *',
        currencyEuro: 'EUR - Euro',
        currencyUsd: 'USD - Amerikaanse dollar',
        currencyGbp: 'GBP - Britse pond',
        internalPointsPricing: 'Interne puntenprijzen',
        pricePointsRequired: 'Prijspunten *',
        pricePointsPlaceholder: '500',
        pointsPricingHint: 'Programma\'s kunnen geprijsd worden in institutionele punten naast valuta.',
        finalQuizSettings: 'Eindquizinstellingen',
        finalQuizTitle: 'Titel eindquiz',
        finalQuizTitlePlaceholder: 'Strategic Leadership Final Assessment',
        finalQuizPassPercentage: 'Slaagpercentage eindquiz',
        finalQuizPassPercentagePlaceholder: '70',
        finalQuizSettingsHint:
          'Het programma bepaalt de titel en slaaggrens van de eindquiz. De vraagbanken per sectie bepalen hoeveel vragen per poging worden bijgedragen.',
        currencyPrice: 'Prijs in valuta',
        pointsPrice: 'Prijs in punten',
        pricingGuidance: 'Prijsrichtlijn',
        pricingGuidanceBody:
          'Het instituut werkt met een dubbel prijsmodel: betaling via valuta of via institutionele punten (II-punten).',
        featuredImage: 'Uitgelichte afbeelding',
        recommended: 'Aanbevolen',
        imageResolution: '1920×1080',
        imageUrlSource: 'Afbeelding-URL',
        imageUrlPlaceholder: 'https://images.unsplash.com/photo-...',
        replace: 'Vervangen',
        remove: 'Verwijderen',
        introVideo: 'Introvideo',
        previewVideo: 'Videovoorbeeld',
        introVideoUrl: 'Introvideo-URL',
        introVideoUrlPlaceholder: 'https://youtube.com/...',
        videoTip: 'Video verhoogt betrokkenheid. Houd de intro bij voorkeur korter dan 2 minuten.',
        mediaCurationTips: 'Mediatips',
        mediaTipOne: 'Gebruik hoge resolutie beelden met een professionele uitstraling.',
        mediaTipTwo: 'Vermijd generieke of lage kwaliteit stockfoto\'s.',
        mediaTipThree: 'Zorg waar nodig voor ondertiteling of toelichting bij video.',
        featuredProgram: 'Uitgelicht programma',
        featuredProgramDescription:
          'Uitgelichte programma\'s krijgen voorrang in prominente catalogusblokken.',
        publicationStatus: 'Publicatiestatus',
        activeProgram: 'Actief programma',
        activeProgramDescription:
          'Inactieve programma\'s blijven zichtbaar in de admin en zijn verborgen voor publieke weergave.',
        publicationSummary: 'Publicatieoverzicht',
        loadedFromApi: 'Geladen uit API',
        readyToPublish: 'Klaar om te publiceren',
        publishFootnote:
          'Inactieve programma\'s blijven zichtbaar in de admin en kunnen later opnieuw worden geactiveerd.',
        documentation: 'Documentatie',
        support: 'Support',
        systemStatus: 'Systeemstatus',
        footerCopyright: '© 2024 International Institute for Studies Netherlands',
        tabs: [
          { key: 'basic-info', label: 'Basisinfo' },
          { key: 'academic-content', label: 'Academische inhoud' },
          { key: 'pricing', label: 'Prijzen' },
          { key: 'media', label: 'Media' },
          { key: 'publish', label: 'Publiceren' },
        ],
      }
    }
    return {
      editProgram: 'Edit Program',
      createProgram: 'Create Program',
      breadcrumbAdmin: 'Admin',
      breadcrumbPrograms: 'Programs',
      pageSubtitle: 'Manage academic content, pricing, media, and publication settings.',
      backToPrograms: 'Back to Programs',
      saving: 'Saving...',
      saveChanges: 'Save Changes',
      saveAndPublish: 'Save & Publish',
      createAndPublish: 'Create & Publish',
      loadingProgramDetails: 'Loading program details...',
      loadProgramError: 'Failed to load program details.',
      createNoIdError: 'Program was created but no program ID was returned.',
      persistPublicationError: 'Publication status could not be persisted. Please try again.',
      persistFeaturedError: 'Featured status could not be persisted. Please try again.',
      saveFailed: 'Failed to save program changes.',
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
      iiPoints: 'II Points',
      settingsSnapshot: 'Settings Snapshot',
      stateSnapshot: 'State Snapshot',
      lastEdited: 'Last Edited',
      todayTime: 'Today, 14:22',
      visibility: 'Visibility',
      draft: 'Draft',
      fees: 'Fees',
      currency: 'Currency',
      pricePoints: 'Price Points',
      status: 'Status',
      loaded: 'Loaded',
      notAvailable: '-',
      pricing: 'Pricing',
      media: 'Media',
      programIdentity: 'Program Identity',
      category: 'Category',
      selectCategory: 'Select category',
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
      learningOutcomesPlaceholder: 'Define the key outcomes students will achieve...',
      learnerFit: 'Learner Fit',
      targetAudienceRequired: 'Target Audience *',
      targetAudiencePlaceholder: 'Describe the ideal candidate profile...',
      entryRequirementsRequired: 'Entry Requirements *',
      entryRequirementsPlaceholder: 'Specify academic prerequisites and documents...',
      tuitionAndCurrency: 'Tuition & Currency',
      feesRequired: 'Fees *',
      feesPlaceholder: '499.00',
      currencyRequired: 'Currency *',
      currencyEuro: 'EUR - Euro',
      currencyUsd: 'USD - US Dollar',
      currencyGbp: 'GBP - British Pound',
      internalPointsPricing: 'Internal Points Pricing',
      pricePointsRequired: 'Price Points *',
      pricePointsPlaceholder: '500',
      pointsPricingHint: 'Programs can be priced in institutional points alongside currency.',
      finalQuizSettings: 'Final Quiz Settings',
      finalQuizTitle: 'Final Quiz Title',
      finalQuizTitlePlaceholder: 'e.g. Strategic Leadership Final Assessment',
      finalQuizPassPercentage: 'Final Quiz Pass Percentage',
      finalQuizPassPercentagePlaceholder: '70',
      finalQuizSettingsHint:
        'Programs now own the learner-facing final quiz title and pass percentage. Section question banks control how many questions they contribute per attempt.',
      currencyPrice: 'Currency Price',
      pointsPrice: 'Points Price',
      pricingGuidance: 'Pricing Guidance',
      pricingGuidanceBody:
        'The International Institute operates a dual-pricing model. Students can choose to pay via standard currency or through accumulated Institutional Points (II Points).',
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
      footerCopyright: '© 2024 International Institute for Studies Netherlands',
      tabs: [
        { key: 'basic-info', label: 'Basic Info' },
        { key: 'academic-content', label: 'Academic Content' },
        { key: 'pricing', label: 'Pricing' },
        { key: 'media', label: 'Media' },
        { key: 'publish', label: 'Publish' },
      ],
    }
  }, [language])

  const [activeLanguage, setActiveLanguage] = useState(
    language === 'ar' || language === 'nl' ? language : 'en'
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [categories, setCategories] = useState([])

  const [formData, setFormData] = useState({
    category_id: '',
    category_name: '',
    title: { en: '', ar: '', nl: '' },
    short_description: { en: '', ar: '', nl: '' },
    overview: { en: '', ar: '', nl: '' },
    outcomes: { en: '', ar: '', nl: '' },
    target_audience: { en: '', ar: '', nl: '' },
    entry_requirements: { en: '', ar: '', nl: '' },
    duration: { en: '', ar: '', nl: '' },
    fees: '',
    currency: 'EUR',
    price_points: '',
    featured_image: '',
    intro_video_url: '',
    intro_text: { en: '', ar: '', nl: '' },
    final_quiz_title: { en: '', ar: '', nl: '' },
    final_quiz_pass_percentage: '',
    is_featured: false,
    is_active: false,
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
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          copy.loadProgramError

        setError(message)
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
    setIsSaving(true)
    setSaveError('')
    setSaveMessage('')

    try {
      const wasEditMode = Boolean(programId)
      const desiredFeatured = publish ? true : Boolean(formData.is_featured)
      const desiredActive = publish ? true : Boolean(formData.is_active)
      const payload = buildProgramPayload({
        ...formData,
        is_featured: desiredFeatured,
      })
      let targetProgramId = programId

      if (targetProgramId) {
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
      const message =
        err?.response?.data?.message ||
        err?.message ||
        copy.saveFailed

      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

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
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm text-[var(--color-text-muted)]">
            {copy.breadcrumbAdmin} &nbsp;›&nbsp; {copy.breadcrumbPrograms} &nbsp;›&nbsp;
            <span className="font-semibold text-[var(--color-accent-dark,#765A1F)]">
              {isEditMode ? copy.editProgram : copy.createProgram}
            </span>
          </p>

          <h1 className="mt-4 text-6xl font-bold text-[var(--color-text)]">
            {titleText}
          </h1>
          <p className="mt-3 max-w-3xl text-2xl text-[var(--color-text-muted)]">
            {copy.pageSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="!h-16 !rounded-[20px] !px-8 !text-lg"
            onClick={() => navigate('/programs')}
          >
            {copy.backToPrograms}
          </Button>

          <Button
            variant="secondary"
            className="!h-16 !rounded-[20px] !px-8 !text-lg"
            onClick={() => handleSave()}
            disabled={isSaving}
          >
            {isSaving ? copy.saving : isEditMode ? copy.saveChanges : copy.createProgram}
          </Button>

          <Button
            className="!h-16 !rounded-[20px] !px-8 !text-lg"
            onClick={() => handleSave({ publish: true })}
            disabled={isSaving}
          >
            {isSaving ? copy.saving : isEditMode ? copy.saveAndPublish : copy.createAndPublish}
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

        <BuilderTabs activeTab={activeTab} onTabChange={handleTabChange} tabs={copy.tabs} />
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
            <PreviewCard formData={formData} activeLanguage={activeLanguage} copy={copy} />
            {activeTab === 'pricing' ? (
              <PricingSnapshotCard formData={formData} copy={copy} />
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
