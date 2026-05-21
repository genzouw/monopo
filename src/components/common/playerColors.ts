/** プレイヤーごとの所有マス背景色（薄い色） */
export const OWNER_BG: Record<string, string> = {
  'player-0': 'rgba(255, 107, 107, 0.25)',
  'player-1': 'rgba(78, 205, 196, 0.25)',
  'player-2': 'rgba(255, 230, 109, 0.35)',
  'player-3': 'rgba(155, 89, 182, 0.25)',
}

export const OWNER_BG_FALLBACK = 'rgba(150, 150, 150, 0.2)'

export function getOwnerBg(playerId: string | null | undefined): string {
  if (!playerId) return OWNER_BG_FALLBACK
  return OWNER_BG[playerId] ?? OWNER_BG_FALLBACK
}
