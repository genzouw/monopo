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
  return Math.floor(getSecureRandom() * (max - min + 1)) + min
}
