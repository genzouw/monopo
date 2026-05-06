import type { GameState } from './types'
import { TOKENS } from './types'

const STORAGE_KEY = 'monopoly-save'
const SETUP_KEY = 'monopoly-setup'

export type SetupConfig = {
  playerCount: number
  names: string[]
  tokens: string[]
}

export function saveGame(state: GameState): void {
  if (state.phase !== 'playing') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

export function loadGame(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const state = JSON.parse(saved) as GameState
    // Basic validation
    if (state.phase !== 'playing' || !state.players?.length) return null
    return state
  } catch {
    return null
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // silently fail
  }
}

export function saveSetupConfig(config: SetupConfig): void {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(config))
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

export function loadSetupConfig(): SetupConfig | null {
  try {
    const saved = localStorage.getItem(SETUP_KEY)
    if (!saved) return null
    const config = JSON.parse(saved) as Partial<SetupConfig>
    if (
      typeof config.playerCount !== 'number' ||
      config.playerCount < 2 ||
      config.playerCount > 4 ||
      !Array.isArray(config.names) ||
      !Array.isArray(config.tokens) ||
      config.names.length !== 4 ||
      config.tokens.length !== 4 ||
      !config.names.every((n) => typeof n === 'string') ||
      !config.tokens.every(
        (t) =>
          typeof t === 'string' && (TOKENS as readonly string[]).includes(t),
      )
    ) {
      return null
    }
    return {
      playerCount: config.playerCount,
      names: config.names,
      tokens: config.tokens,
    }
  } catch {
    return null
  }
}
