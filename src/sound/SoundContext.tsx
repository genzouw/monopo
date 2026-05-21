import { useState, useCallback, type ReactNode } from 'react'
import { SoundEffects, initAudio } from './sounds'
import { SoundContext } from './soundContextDef'

export { SoundContext } from './soundContextDef'

export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const play = useCallback(
    (sound: keyof typeof SoundEffects) => {
      if (muted) return
      if (!initialized) {
        initAudio()
        setInitialized(true)
      }
      SoundEffects[sound]()
    },
    [muted, initialized],
  )
  const toggleMute = useCallback(() => {
    if (!initialized) {
      initAudio()
      setInitialized(true)
    }
    setMuted((m) => !m)
  }, [initialized])
  return (
    <SoundContext.Provider value={{ muted, toggleMute, play }}>
      {children}
    </SoundContext.Provider>
  )
}
