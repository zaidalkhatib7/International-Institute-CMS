import { describe, expect, it } from 'vitest'
import { parseCommaSeparatedIds } from './utils'

describe('parseCommaSeparatedIds', () => {
  it('keeps only positive integer media identifiers', () => {
    expect(parseCommaSeparatedIds('1, 2, invalid, -3, 4.5, 7, , 0')).toEqual([1, 2, 7])
  })

  it('returns an empty collection for an empty value', () => {
    expect(parseCommaSeparatedIds()).toEqual([])
    expect(parseCommaSeparatedIds('')).toEqual([])
  })
})
