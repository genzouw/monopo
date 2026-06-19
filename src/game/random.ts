/**
 * Security Enhancement: Use cryptographically secure random number generation
 * instead of Math.random() to prevent predictability and ensure fair gameplay.
 */
const MAX_UINT32 = 0xffffffff;
const UINT32_RANGE = MAX_UINT32 + 1;
const randomBuffer = new Uint32Array(1);

export function getSecureRandom(): number {
  crypto.getRandomValues(randomBuffer);
  return randomBuffer[0] / UINT32_RANGE;
}

export function getSecureRandomInt(min: number, max: number): number {
  const range = max - min + 1;
  const limit = Math.floor(UINT32_RANGE / range) * range;

  let x: number;
  do {
    crypto.getRandomValues(randomBuffer);
    x = randomBuffer[0];
  } while (x >= limit);

  return min + (x % range);
}

// ── P3 拡張: シード付き擬似乱数（再現性が必要な暗号資産価格計算に使用） ──

// mulberry32: 高速・軽量なシード付き PRNG（暗号論的安全性不要な用途）
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

// 文字列を非負整数ハッシュに変換（DJB2系）
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // 符号なし 32bit に正規化
}

// Box-Muller 変換で標準正規分布 N(0,1) の1サンプルを生成
// u1, u2: (0,1] の一様乱数（u1 が 0 のとき log が -Inf になるため小さな値で回避）
export function boxMuller(u1: number, u2: number): number {
  const safe = u1 <= 0 ? 1e-10 : u1;
  return Math.sqrt(-2 * Math.log(safe)) * Math.cos(2 * Math.PI * u2);
}
