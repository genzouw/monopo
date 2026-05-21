import { createContext } from 'react'
import { SoundEffects } from './sounds'

export type SoundContextType = {
  muted: boolean
  toggleMute: () => void
  play: (sound: keyof typeof SoundEffects) => void
}

export const SoundContext = createContext<SoundContextType>({
  muted: false,
  toggleMute: () => {},
  play: () => {},
})
