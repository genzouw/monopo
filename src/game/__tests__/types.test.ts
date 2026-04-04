import { describe, it, expect } from 'vitest';
import { createInitialPlayer, TOKENS } from '../types';

describe('createInitialPlayer', () => {
  it('初期資金$1500でプレイヤーを作成する', () => {
    const player = createInitialPlayer('p1', 'たろう', '🚗');
    expect(player.money).toBe(1500);
    expect(player.position).toBe(0);
    expect(player.properties).toEqual([]);
    expect(player.inJail).toBe(false);
    expect(player.isBankrupt).toBe(false);
  });

  it('名前とトークンが正しく設定される', () => {
    const player = createInitialPlayer('p2', 'はなこ', '🎩');
    expect(player.name).toBe('はなこ');
    expect(player.token).toBe('🎩');
    expect(player.id).toBe('p2');
  });
});

describe('TOKENS', () => {
  it('4つ以上のトークンが定義されている', () => {
    expect(TOKENS.length).toBeGreaterThanOrEqual(4);
  });
});
