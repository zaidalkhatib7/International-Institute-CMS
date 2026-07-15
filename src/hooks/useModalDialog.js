import { useEffect, useRef } from 'react'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function visibleFocusableElements(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(focusableSelector)).filter((element) => {
    const style = window.getComputedStyle(element)
    return !element.hasAttribute('hidden')
      && element.getAttribute('aria-hidden') !== 'true'
      && style.display !== 'none'
      && style.visibility !== 'hidden'
  })
}

/**
 * Provides the keyboard, focus, and scroll behavior expected from a modal dialog.
 * The returned ref belongs on the element carrying role="dialog".
 */
export function useModalDialog(open, onClose) {
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    const dialog = dialogRef.current
    document.body.style.overflow = 'hidden'

    const focusDialog = () => {
      const elements = visibleFocusableElements(dialog)
      ;(elements[0] || dialog)?.focus({ preventScroll: true })
    }
    const frame = window.requestAnimationFrame(focusDialog)

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const elements = visibleFocusableElements(dialog)
      if (elements.length === 0) {
        event.preventDefault()
        dialog?.focus({ preventScroll: true })
        return
      }

      const first = elements[0]
      const last = elements[elements.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialog?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialog?.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [open])

  return dialogRef
}
