import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LanguageSlider from './LanguageSlider'

/*
 * Arabic and English only (owner, 13 Oct 2026). The slider is the one place a
 * person picks the interface language, in the top bar and on the Settings page.
 */
describe('LanguageSlider', () => {
  it('offers exactly Arabic and English', () => {
    render(<LanguageSlider value="ar" onChange={() => {}} />)

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(radios.map((radio) => radio.textContent)).toEqual(['العربية', 'English'])
    expect(screen.getByRole('radio', { name: 'العربية' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText(/Nederlands/)).not.toBeInTheDocument()
  })

  it('shows the two short codes in the compact top-bar form and switches to English', () => {
    const onChange = vi.fn()
    render(<LanguageSlider compact value="ar" onChange={onChange} />)

    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual(['AR', 'EN'])
    fireEvent.click(screen.getByRole('radio', { name: 'EN' }))
    expect(onChange).toHaveBeenCalledWith('en')
  })
})
