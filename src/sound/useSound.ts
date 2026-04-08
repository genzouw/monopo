import { useContext } from 'react'
import { SoundContext } from './SoundContext'

export function useSound() {
  return useContext(SoundContext)
}
