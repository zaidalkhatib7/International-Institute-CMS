import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './Card'

/*
 * A CARD'S OWN SURFACE GIVES WAY TO THE ONE IT IS GIVEN (platform walk, 17 Oct
 * 2026, UI-01).
 *
 * The case workspace header is a Card with className
 * "border-0 bg-[var(--color-primary)] text-white". Card put its base "bg-white"
 * beside it, cn() only joins strings, and Tailwind's generated order made
 * bg-white win: white text on a white card, so the client's name, e-mail and
 * case reference could not be read. Both classes on one element is the bug,
 * whatever order the stylesheet happens to emit them in.
 */

const classesOf = (element) => element.className.split(/\s+/).filter(Boolean)

describe('Card surface overrides', () => {
  it('drops its white background when a background is given', () => {
    render(<Card data-testid="card" className="border-0 bg-[var(--color-primary)] text-white">x</Card>)
    const classes = classesOf(screen.getByTestId('card'))

    expect(classes).toContain('bg-[var(--color-primary)]')
    expect(classes).not.toContain('bg-white')
  })

  it('drops its border when border-0 is given, and its border colour when another colour is', () => {
    render(<><Card data-testid="flat" className="border-0">x</Card><Card data-testid="red" className="border-red-200 bg-red-50/30">y</Card></>)
    const flat = classesOf(screen.getByTestId('flat'))
    const red = classesOf(screen.getByTestId('red'))

    expect(flat).toContain('border-0')
    expect(flat).not.toContain('border')
    expect(red).toContain('border-red-200')
    expect(red).not.toContain('border-[var(--color-border)]')
    expect(red).not.toContain('bg-white')
  })

  it('keeps its own white surface and border when nothing overrides them', () => {
    render(<Card data-testid="plain" className="w-full">x</Card>)
    const classes = classesOf(screen.getByTestId('plain'))

    expect(classes).toEqual(expect.arrayContaining(['bg-white', 'border', 'border-[var(--color-border)]', 'w-full']))
  })
})
