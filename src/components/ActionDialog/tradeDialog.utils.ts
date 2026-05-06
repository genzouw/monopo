export const clamp = (val: number, max: number) =>
  Math.max(0, Math.min(Math.floor(val), max))
