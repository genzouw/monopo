import { describe, it, expect } from 'vitest'
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, shuffleCards } from '../cards'

describe('CHANCE_CARDS', () => {
  it('16枚ある', () => {
    expect(CHANCE_CARDS).toHaveLength(16)
  })
  it('すべてchanceタイプ', () => {
    CHANCE_CARDS.forEach((card) => {
      expect(card.type).toBe('chance')
    })
  })
  it('すべてテキストとアクションがある', () => {
    CHANCE_CARDS.forEach((card) => {
      expect(card.text.length).toBeGreaterThan(0)
      expect(card.action).toBeDefined()
    })
  })
})
describe('COMMUNITY_CHEST_CARDS', () => {
  it('16枚ある', () => {
    expect(COMMUNITY_CHEST_CARDS).toHaveLength(16)
  })
  it('すべてcommunityChestタイプ', () => {
    COMMUNITY_CHEST_CARDS.forEach((card) => {
      expect(card.type).toBe('communityChest')
    })
  })
})
describe('shuffleCards', () => {
  it('同じ枚数のカードを返す', () => {
    expect(shuffleCards(CHANCE_CARDS)).toHaveLength(CHANCE_CARDS.length)
  })
  it('元の配列を変更しない', () => {
    const original = [...CHANCE_CARDS]
    shuffleCards(CHANCE_CARDS)
    expect(CHANCE_CARDS).toEqual(original)
  })
})
