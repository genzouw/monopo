import { describe, it, expect } from 'vitest';
import { clamp } from '../tradeDialog.utils';

describe('clamp', () => {
  it('範囲内の値はそのまま小数を切り捨てて返す', () => {
    expect(clamp(50, 100)).toBe(50);
    expect(clamp(50.7, 100)).toBe(50);
  });

  it('負の値は0にクランプする', () => {
    expect(clamp(-10, 100)).toBe(0);
  });

  it('最大値を超える値はmaxにクランプする', () => {
    expect(clamp(150, 100)).toBe(100);
  });

  it('境界値（0とmax）を正しく扱う', () => {
    expect(clamp(0, 100)).toBe(0);
    expect(clamp(100, 100)).toBe(100);
  });
});
