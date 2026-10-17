import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Read as text from the project root, where Vitest runs: it does not process CSS imports.
// eslint-disable-next-line no-undef -- the test runner is Node
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

/*
 * EVERY DIALOG IS CENTRED IN THE VIEWPORT (platform walk, 17 Oct 2026, UI-02).
 *
 * The dashboard wraps every page in `.app-page-enter`. Its animation ended on
 * `transform: translateY(0)` and was kept there by `animation-fill-mode: both`
 * (or forwards). A transformed element is the containing block of every
 * `position: fixed` descendant, so each "fixed inset-0" dialog (evidence preview,
 * decline, conflict, configuration delete, governance, …) was centred in the
 * whole page, thousands of pixels tall, and opened off-screen on a scrolled
 * page while the scroll lock kept staff from reaching it.
 *
 * jsdom does no layout, so the rule itself is checked: once the entrance has
 * played, nothing may keep a transform on the page wrapper.
 */

function ruleBody(source, selector) {
  const start = source.indexOf(`${selector} {`)
  if (start < 0) return ''
  return source.slice(start, source.indexOf('}', start))
}

function keyframes(source, name) {
  const start = source.indexOf(`@keyframes ${name}`)
  if (start < 0) return ''
  let depth = 0
  for (let index = source.indexOf('{', start); index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }
  return ''
}

describe('the page entrance animation', () => {
  it('leaves no transform on the page wrapper once it has played', () => {
    const rule = ruleBody(css, '.app-page-enter')
    expect(rule).toMatch(/animation/)

    const keepsEndState = /\b(both|forwards)\b/.test(rule) || /animation-fill-mode\s*:\s*(both|forwards)/.test(rule)
    const endFrame = (keyframes(css, 'app-page-enter').match(/to\s*\{([^}]*)\}/) || [])[1] || ''
    const endsTransformed = /transform\s*:\s*(?!none)/.test(endFrame)

    // Either the end frame is not kept, or it carries no transform: never both.
    expect(keepsEndState && endsTransformed).toBe(false)
  })
})
