/**
 * Security Enhancement: Use cryptographically secure random number generation
 * instead of Math.random() to prevent predictability and ensure fair gameplay.
 */
export function getSecureRandom(): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] / (0xffffffff + 1)
}

export function getSecureRandomInt(min: number, max: number): number {
  const range = max - min + 1
  const limit = Math.floor((0xffffffff + 1) / range) * range
  const buf = new Uint32Array(1)

  let x: number
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= limit)

  return min + (x % range)
}
