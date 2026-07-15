import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { OperationsModal } from './OperationsUI'

function ModalHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open dialog</button>
      <OperationsModal
        open={open}
        title="Accessible dialog"
        onClose={() => setOpen(false)}
        footer={<button type="button">Last action</button>}
      >
        <button type="button">First action</button>
      </OperationsModal>
    </>
  )
}

describe('OperationsModal accessibility', () => {
  it('moves focus inside, traps Tab, closes with Escape, and restores focus', async () => {
    render(<ModalHarness />)
    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Accessible dialog' })
    const first = within(dialog).getAllByRole('button')[0]
    const last = screen.getByRole('button', { name: 'Last action' })
    await waitFor(() => expect(dialog).toContainElement(document.activeElement))

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(first).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
