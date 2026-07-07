/**
 * COLOR_ORDER に基づいてプロパティをソートするための共通コンパレータ。
 * BuildDialog と SellDialog で共有される。
 */
export function compareByColorOrder(
  aColor: string | undefined,
  bColor: string | undefined,
  colorOrder: readonly string[],
): number {
  const ai = aColor ? colorOrder.indexOf(aColor) : -1;
  const bi = bColor ? colorOrder.indexOf(bColor) : -1;
  const aIndex = ai === -1 ? colorOrder.length : ai;
  const bIndex = bi === -1 ? colorOrder.length : bi;
  return aIndex - bIndex;
}
