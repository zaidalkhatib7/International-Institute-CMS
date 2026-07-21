import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('presents a useful empty state and optional recovery action', () => {
    render(<EmptyState title="No applications found" description="Clear filters or create a new application." action={<button type="button">Clear filters</button>} />)

    expect(screen.getByRole('heading', { name: 'No applications found' })).toBeInTheDocument()
    expect(screen.getByText('Clear filters or create a new application.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })
})
