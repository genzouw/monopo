/**
 * Security Enhancement: Use cryptographically secure random number generation
 * instead of Math.random() to prevent predictability and ensure fair gameplay.
 */
const MAX_UINT32 = 0xffffffff
const UINT32_RANGE = MAX_UINT32 + 1
const randomBuffer = new Uint32Array(1)

export function getSecureRandom(): number {
  crypto.getRandomValues(randomBuffer)
  return randomBuffer[0] / UINT32_RANGE
}

export function getSecureRandomInt(min: number, max: number): number {
  const range = max - min + 1
  const limit = Math.floor(UINT32_RANGE / range) * range

  let x: number
  do {
    crypto.getRandomValues(randomBuffer)
    x = randomBuffer[0]
  } while (x >= limit)

  return min + (x % range)
}
