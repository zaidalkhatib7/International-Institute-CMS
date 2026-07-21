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

  it('uses a concise accessible presentation in compact tables', () => {
    render(<CompletenessMeter compact language="en" value={100} />)

    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Portfolio completeness: 100%' })).toBeInTheDocument()
  })
})
