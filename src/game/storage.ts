import type { GameState } from './types';

const STORAGE_KEY = 'monopoly-save';

export function saveGame(state: GameState): void {
  if (state.phase !== 'playing') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

export function loadGame(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const state = JSON.parse(saved) as GameState;
    // Basic validation
    if (state.phase !== 'playing' || !state.players?.length) return null;
    return state;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently fail
  }
}
