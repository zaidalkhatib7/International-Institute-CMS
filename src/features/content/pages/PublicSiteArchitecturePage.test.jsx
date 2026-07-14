import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import PublicSiteArchitecturePage from './PublicSiteArchitecturePage'

describe('PublicSiteArchitecturePage', () => {
  beforeEach(() => {
    localStorage.setItem('icpc_admin_language', 'en')
  })

  it('renders the complete architecture without losing long section titles', () => {
    render(<PublicSiteArchitecturePage />)

    expect(screen.getByRole('heading', { name: 'Public Website Architecture' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Professional accreditation and certificates' })).toBeInTheDocument()
    expect(screen.getAllByText(/Section \d/)).toHaveLength(8)
    expect(screen.getByText('This map represents the public website information architecture only. Applicant journeys and role dashboards begin after login.')).toBeInTheDocument()
  })
})
