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

    for (const [language, label, action] of [['ar', 'الخبرة العملية', 'أضف خبرة عملية واحدة على الأقل إلى الملف الشخصي'], ['nl', 'Werkervaring', 'Voeg ten minste één werkervaring toe aan het profiel']]) {
      const view = render(<CompletenessMeter language={language} value={{ percentage: 83, categories: [], work_experience: { required: 1, provided: 0, complete: false }, declaration: { accepted: true } }} />)
      expect(screen.getAllByText(label)).toHaveLength(2)
      expect(screen.getAllByText(action)).toHaveLength(2)
      view.unmount()
    }
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
