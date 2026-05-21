/**
 * Limits a value to a range between 0 and the given maximum.
 * The value is floored before being clamped.
 *
 * @param val - The value to clamp.
 * @param max - The maximum allowed value.
 * @returns The clamped integer value.
 */
export const clamp = (val: number, max: number) =>
  Math.max(0, Math.min(Math.floor(val), max))
