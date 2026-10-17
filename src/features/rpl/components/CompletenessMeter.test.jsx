import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CompletenessMeter from './CompletenessMeter'

describe('CompletenessMeter', () => {
  it('shows the precise next missing requirement instead of only a percentage', () => {
    render(
      <CompletenessMeter
        language="en"
        categories={[{ id: 1, code: 'identity', labels: { en: 'Personal identity' } }]}
        value={{ percentage: 67, categories: [{ category_id: 1, code: 'identity', required: 3, provided: 1, complete: false }], declaration: { accepted: false } }}
      />
    )

    expect(screen.getByText('67% complete')).toBeInTheDocument()
    expect(screen.getByText('Recommended next step')).toBeInTheDocument()
    expect(screen.getAllByText('Personal identity')).toHaveLength(2)
    expect(screen.getAllByText('Add 2 more file(s)')).toHaveLength(2)
  })

  it('names the missing work experience, which the API counts as its own item', () => {
    // Every category, the level and the declaration are done; only the work
    // experience is missing, so the API reports 5 of 6. Before, the meter showed
    // 83% with nothing listed and no next step.
    render(
      <CompletenessMeter
        language="en"
        categories={[{ id: 1, code: 'identity', labels: { en: 'Personal identity' } }]}
        value={{ percentage: 83.33, categories: [{ category_id: 1, code: 'identity', required: 1, provided: 1, complete: true }], work_experience: { required: 1, provided: 0, complete: false }, declaration: { accepted: true } }}
      />
    )

    expect(screen.getByText('83% complete')).toBeInTheDocument()
    expect(screen.getByText('Recommended next step')).toBeInTheDocument()
    expect(screen.getByText('Still required for 100%')).toBeInTheDocument()
    expect(screen.getAllByText('Work experience')).toHaveLength(2)
    expect(screen.getAllByText('Add at least one work experience to the profile')).toHaveLength(2)
    expect(screen.queryByText('Personal identity')).not.toBeInTheDocument()
  })

  it('lists the work experience after the files and before the declaration, in every language', () => {
    const value = { percentage: 50, categories: [{ category_id: 1, code: 'identity', required: 1, provided: 0, complete: false }], work_experience: { required: 1, provided: 0, complete: false }, declaration: { accepted: false } }
    const { unmount } = render(<CompletenessMeter language="en" categories={[{ id: 1, code: 'identity', labels: { en: 'Personal identity' } }]} value={value} />)

    const rows = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(rows).toEqual(['Personal identityAdd 1 more file(s)', 'Work experienceAdd at least one work experience to the profile', 'Final declarationAccept the declaration'])
    unmount()

    for (const [language, label, action] of [['ar', 'الخبرة العملية', 'أضف خبرة عملية واحدة على الأقل إلى الملف الشخصي']]) {
      const view = render(<CompletenessMeter language={language} value={{ percentage: 83, categories: [], work_experience: { required: 1, provided: 0, complete: false }, declaration: { accepted: true } }} />)
      expect(screen.getAllByText(label)).toHaveLength(2)
      expect(screen.getAllByText(action)).toHaveLength(2)
      view.unmount()
    }
  })

  it('names a CV or an experience letter as ONE missing item, met by either (owner, 17 Oct 2026)', () => {
    const categories = [
      { id: 1, code: 'identity', labels: { en: 'Personal identity', ar: 'الهوية الشخصية' } },
      { id: 2, code: 'curriculum_vitae', labels: { en: 'Curriculum vitae', ar: 'السيرة الذاتية' } },
      { id: 3, code: 'professional_experience', labels: { en: 'Professional experience', ar: 'الخبرة المهنية' } },
    ]
    const group = (complete, provided = 0) => ({ code: 'experience_document', complete, any_of: [{ category_id: 2, code: 'curriculum_vitae', required: 1, provided, complete }, { category_id: 3, code: 'professional_experience', required: 1, provided: 0, complete: false }] })
    const value = { percentage: 75, categories: [{ category_id: 1, code: 'identity', required: 1, provided: 1, complete: true }], evidence_groups: [group(false)], work_experience: { required: 0, provided: 0, complete: true }, declaration: { accepted: true } }
    const { unmount } = render(<CompletenessMeter language="en" categories={categories} value={value} />)

    expect(screen.getAllByText('Curriculum vitae or Professional experience')).toHaveLength(2)
    expect(screen.getAllByText('Add one file to either')).toHaveLength(2)
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Curriculum vitae or Professional experienceAdd one file to either'])
    expect(screen.queryByText('Work experience')).not.toBeInTheDocument()
    unmount()

    const arabic = render(<CompletenessMeter language="ar" categories={categories} value={value} />)
    expect(screen.getAllByText('السيرة الذاتية أو الخبرة المهنية')).toHaveLength(2)
    expect(screen.getAllByText('أضف ملفاً واحداً إلى أيٍّ منهما')).toHaveLength(2)
    arabic.unmount()

    // The CV alone meets it: nothing is left to list.
    render(<CompletenessMeter language="en" categories={categories} value={{ ...value, percentage: 100, evidence_groups: [group(true, 1)] }} />)
    expect(screen.queryByText('Still required for 100%')).not.toBeInTheDocument()
    expect(screen.getByText('The portfolio is complete and ready for the next step.')).toBeInTheDocument()
  })

  it('lists the files, then the either-one item, then the declaration', () => {
    const value = { percentage: 25, categories: [{ category_id: 1, code: 'identity', required: 1, provided: 0, complete: false }], evidence_groups: [{ code: 'experience_document', complete: false, any_of: [{ category_id: 2, code: 'curriculum_vitae', required: 1, provided: 0, complete: false }, { category_id: 3, code: 'professional_experience', required: 1, provided: 0, complete: false }] }], declaration: { accepted: false } }
    render(<CompletenessMeter language="en" categories={[{ id: 1, code: 'identity', labels: { en: 'Personal identity' } }]} value={value} />)

    // A member the reference data does not name falls back to its readable code.
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Personal identityAdd 1 more file(s)', 'Curriculum Vitae or Professional ExperienceAdd one file to either', 'Final declarationAccept the declaration',
    ])
  })

  it('says how many files the either-one item still needs when staff raised a member minimum (review round 2)', () => {
    const categories = [
      { id: 2, code: 'curriculum_vitae', labels: { en: 'Curriculum vitae', ar: 'السيرة الذاتية' } },
      { id: 3, code: 'professional_experience', labels: { en: 'Professional experience', ar: 'الخبرة المهنية' } },
    ]
    const valueWith = (cv, letter) => ({
      percentage: 75,
      categories: [],
      evidence_groups: [{ code: 'experience_document', complete: false, any_of: [
        { category_id: 2, code: 'curriculum_vitae', required: 2, provided: cv, complete: false },
        { category_id: 3, code: 'professional_experience', required: 2, provided: letter, complete: false },
      ] }],
      declaration: { accepted: true },
    })
    const action = (language, cv, letter) => {
      const view = render(<CompletenessMeter language={language} categories={categories} value={valueWith(cv, letter)} />)
      const rows = screen.getAllByRole('listitem').map((item) => item.textContent)
      view.unmount()
      return rows
    }

    // One CV of two, no letter: the CV needs one more, the letter two. Before, both read "Add one file to either".
    expect(action('en', 1, 0)).toEqual(['Curriculum vitae or Professional experienceCurriculum vitae: add 1 more file(s) or Professional experience: add 2 more file(s)'])
    expect(action('ar', 1, 0)).toEqual(['السيرة الذاتية أو الخبرة المهنيةالسيرة الذاتية: أضف ١ ملف(اً) أخر أو الخبرة المهنية: أضف ٢ ملف(اً) أخر'])
    // Nothing yet: two files to either.
    expect(action('en', 0, 0)).toEqual(['Curriculum vitae or Professional experienceAdd 2 more file(s) to either'])
    expect(action('ar', 0, 0)).toEqual(['السيرة الذاتية أو الخبرة المهنيةأضف ٢ ملف(اً) أخر إلى أيٍّ منهما'])
    // One of each: one more file to either completes it.
    expect(action('en', 1, 1)).toEqual(['Curriculum vitae or Professional experienceAdd one file to either'])

    // The next-step box says the same.
    render(<CompletenessMeter language="en" categories={categories} value={valueWith(0, 0)} />)
    expect(screen.getAllByText('Add 2 more file(s) to either')).toHaveLength(2)
  })

  it('names a category the case still counts but its standard no longer lists from the reference list, never by its English code on an Arabic screen', () => {
    // The live standard lists only the letter now; the case froze the CV with it, and a single frozen category the standard dropped.
    const live = [{ id: 3, code: 'professional_experience', labels: { en: 'Professional experience', ar: 'الخبرة المهنية' } }]
    const reference = [
      { id: 2, code: 'curriculum_vitae', name: { en: 'Curriculum vitae', ar: 'السيرة الذاتية' }, is_active: false },
      { id: 3, code: 'professional_experience', name: { en: 'Professional experience', ar: 'الخبرة المهنية' } },
      { id: 4, code: 'recommendation', name: { en: 'Recommendation letter', ar: 'خطاب توصية' } },
    ]
    const value = {
      percentage: 50,
      categories: [{ category_id: 4, code: 'recommendation', required: 1, provided: 0, complete: false }],
      evidence_groups: [{ code: 'experience_document', complete: false, any_of: [
        { category_id: 2, code: 'curriculum_vitae', required: 1, provided: 0, complete: false },
        { category_id: 3, code: 'professional_experience', required: 1, provided: 0, complete: false },
      ] }],
      declaration: { accepted: true },
    }

    const arabic = render(<CompletenessMeter language="ar" categories={live} referenceCategories={reference} value={value} />)
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'خطاب توصيةأضف ١ ملف(اً) أخر', 'السيرة الذاتية أو الخبرة المهنيةأضف ملفاً واحداً إلى أيٍّ منهما',
    ])
    expect(screen.queryByText(/Curriculum/)).not.toBeInTheDocument()
    arabic.unmount()

    // Without the reference list the code is all there is, readable.
    render(<CompletenessMeter language="ar" categories={live} value={value} />)
    expect(screen.getByText('Curriculum Vitae أو الخبرة المهنية')).toBeInTheDocument()
    expect(screen.getAllByText('Recommendation')).toHaveLength(2)
  })

  it('shows no work-experience row when the item is met or not part of the case', () => {
    // A case submitted before the release has no work-experience item: required 0, complete.
    render(<CompletenessMeter language="en" value={{ percentage: 100, categories: [], work_experience: { required: 0, provided: 0, complete: true }, declaration: { accepted: true } }} />)

    expect(screen.queryByText('Work experience')).not.toBeInTheDocument()
    expect(screen.queryByText('Still required for 100%')).not.toBeInTheDocument()
    expect(screen.getByText('The portfolio is complete and ready for the next step.')).toBeInTheDocument()
  })

  it('uses a concise accessible presentation in compact tables', () => {
    render(<CompletenessMeter compact language="en" value={100} />)

    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Portfolio completeness: 100%' })).toBeInTheDocument()
  })
})
