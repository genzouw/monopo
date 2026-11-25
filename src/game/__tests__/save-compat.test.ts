import { beforeEach, describe, it, expect } from 'vitest';
import { loadGame } from '../storage';
// 過去のバージョンで保存した localStorage の値。作成後は書き換えない。
// このテストが失敗したら、新しいフィールドを v.optional / v.fallback で受けるか、
// loadGame に旧形式からの変換を足す。互換性を捨てる場合は、その判断を PR に書いて該当ファイルを直す。
import saveV1 from './__fixtures__/save-v1.json?raw';

describe('過去のバージョンの保存データ', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it.each([['save-v1.json', saveV1]])('%s を復元できる', (_name, saved) => {
    localStorage.setItem('monopo-save', saved);
    // null でないことに加え、v.fallback で値が undefined に置き換わっていないことも確かめる
    expect(loadGame()).toMatchObject(JSON.parse(saved) as object);
  });
});
