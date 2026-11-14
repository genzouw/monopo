import fc from 'fast-check';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { getSecureRandomInt, mulberry32 } from '../random';

// ── random.ts の性質をランダム生成した入力で検証する（property-based testing） ──

const MAX_UINT32 = 0xffffffff;

/**
 * `crypto.getRandomValues` を差し替え、呼び出しごとに `values` を先頭から順に返す。
 * 値を使い切った後は 0 を返す（棄却サンプリングのループを必ず終わらせるため）。
 *
 * @param values - 返したい 32 ビット符号なし整数の列
 */
function mockRandomValues(values: number[]): void {
  let index = 0;
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
    if (array instanceof Uint32Array) {
      array[0] = values[index] ?? 0;
      index += 1;
    }
    return array;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getSecureRandomInt の性質', () => {
  it('任意の min <= max に対して結果が [min, max] に収まる整数になる', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.array(fc.integer({ min: 0, max: MAX_UINT32 }), {
          minLength: 1,
          maxLength: 4,
        }),
        (min, span, randomValues) => {
          mockRandomValues(randomValues);
          const max = min + span;
          const result = getSecureRandomInt(min, max);
          expect(Number.isInteger(result)).toBe(true);
          expect(result).toBeGreaterThanOrEqual(min);
          expect(result).toBeLessThanOrEqual(max);
          vi.restoreAllMocks();
        },
      ),
    );
  });

  it('min === max のときは常に min を返す', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        fc.integer({ min: 0, max: MAX_UINT32 }),
        (value, randomValue) => {
          mockRandomValues([randomValue]);
          expect(getSecureRandomInt(value, value)).toBe(value);
          vi.restoreAllMocks();
        },
      ),
    );
  });
});

describe('mulberry32 の性質', () => {
  it('同じシードなら同じ数列を返す', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_UINT32 }),
        fc.integer({ min: 1, max: 50 }),
        (seed, length) => {
          const first = mulberry32(seed);
          const second = mulberry32(seed);
          const a = Array.from({ length }, () => first());
          const b = Array.from({ length }, () => second());
          expect(a).toEqual(b);
        },
      ),
    );
  });

  it('すべての値が [0, 1) に収まる', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_UINT32 }),
        fc.integer({ min: 1, max: 50 }),
        (seed, length) => {
          const next = mulberry32(seed);
          for (let i = 0; i < length; i++) {
            const value = next();
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
          }
        },
      ),
    );
  });
});
