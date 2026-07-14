import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RouteScrollReset from './RouteScrollReset'

function NavigationHarness() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <>
      <p>{location.pathname}</p>
      <button type="button" onClick={() => navigate('/content/architecture')}>
        Open architecture
      </button>
    </>
  )
}

describe('RouteScrollReset', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns every newly opened CMS page to the top', async () => {
    const onRouteChange = vi.fn()

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <RouteScrollReset onRouteChange={onRouteChange} />
        <NavigationHarness />
      </MemoryRouter>
    )

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' })
    fireEvent.click(screen.getByRole('button', { name: 'Open architecture' }))

    await waitFor(() => expect(screen.getByText('/content/architecture')).toBeInTheDocument())
    expect(window.scrollTo).toHaveBeenCalledTimes(2)
    expect(onRouteChange).toHaveBeenCalledTimes(2)
  })
})
