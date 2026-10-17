import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MoneyInput from './MoneyInput'

/*
 * THE MONEY FIELD (owner decisions of 17 Oct 2026). Pinned: a text field, never
 * a number field; "$" before dollars, "SYP" / "ل.س" after pounds; the field
 * reads left to right on an Arabic page; and blur turns Arabic-Indic digits into
 * Latin and gives a valid amount its fixed scale.
 */

function Harness({ currency, language = 'en', initial = '' }) {
  const [value, setValue] = useState(initial)
  return <div dir={language === 'ar' ? 'rtl' : 'ltr'}><MoneyInput label="Amount" currency={currency} language={language} value={value} onChange={setValue} /></div>
}

describe('MoneyInput', () => {
  it('is a text field with a dollar prefix and a decimal keyboard for US dollars', () => {
    render(<Harness currency="USD" />)

    const input = screen.getByLabelText('Amount')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('inputmode', 'decimal')
    expect(input).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('$')).toBeInTheDocument()
    expect(screen.queryByText('SYP')).not.toBeInTheDocument()
  })

  it('takes a pound suffix in each language, with a numeric keyboard', () => {
    const { unmount } = render(<Harness currency="SYP" />)
    expect(screen.getByText('SYP')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toHaveAttribute('inputmode', 'numeric')
    unmount()

    render(<Harness currency="SYP" language="ar" />)
    expect(screen.getByText('ل.س')).toBeInTheDocument()
    expect(screen.queryByText('$')).not.toBeInTheDocument()
  })

  it('keeps the field and its adornment left to right on an Arabic page', () => {
    render(<Harness currency="USD" language="ar" />)

    const input = screen.getByLabelText('Amount')
    expect(input.closest('[dir="ltr"]')).not.toBeNull()
    expect(screen.getByText('$').closest('[dir="ltr"]')).not.toBeNull()
  })

  it('normalises on blur: Arabic-Indic digits, then the fixed scale', () => {
    render(<Harness currency="USD" />)

    const input = screen.getByLabelText('Amount')
    fireEvent.change(input, { target: { value: '٤٩٫٩' } })
    expect(input).toHaveValue('٤٩٫٩')
    fireEvent.blur(input)
    expect(input).toHaveValue('49.90')
  })

  it('leaves what is not an amount as typed, in Latin digits, for the caller to refuse', () => {
    render(<Harness currency="SYP" />)

    const input = screen.getByLabelText('Amount')
    fireEvent.change(input, { target: { value: '١٫٥' } })
    fireEvent.blur(input)
    expect(input).toHaveValue('1.5')
  })
})
