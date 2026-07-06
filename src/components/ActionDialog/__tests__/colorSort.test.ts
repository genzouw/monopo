import { describe, it, expect } from 'vitest';
import { compareByColorOrder } from '../colorSort';

describe('compareByColorOrder', () => {
  const ORDER = ['brown', 'lightblue', 'pink'] as const;

  it('colorOrder内の色を順序通りに並べる', () => {
    expect(compareByColorOrder('pink', 'brown', ORDER)).toBeGreaterThan(0);
    expect(compareByColorOrder('brown', 'pink', ORDER)).toBeLessThan(0);
    expect(compareByColorOrder('brown', 'lightblue', ORDER)).toBeLessThan(0);
  });

  it('同じ色は0を返す', () => {
    expect(compareByColorOrder('brown', 'brown', ORDER)).toBe(0);
  });

  it('未定義の色をリスト末尾に配置する', () => {
    expect(compareByColorOrder(undefined, 'brown', ORDER)).toBeGreaterThan(0);
    expect(compareByColorOrder('brown', undefined, ORDER)).toBeLessThan(0);
    expect(compareByColorOrder(undefined, undefined, ORDER)).toBe(0);
  });

  it('colorOrderに存在しない色を末尾に配置する', () => {
    expect(compareByColorOrder('unknown', 'brown', ORDER)).toBeGreaterThan(0);
    expect(compareByColorOrder('brown', 'unknown', ORDER)).toBeLessThan(0);
    expect(compareByColorOrder('unknown', 'unknown', ORDER)).toBe(0);
  });

  it('colorOrderに存在しない色とundefinedは同等に扱われる', () => {
    expect(compareByColorOrder('unknown', undefined, ORDER)).toBe(0);
    expect(compareByColorOrder(undefined, 'unknown', ORDER)).toBe(0);
  });
});
