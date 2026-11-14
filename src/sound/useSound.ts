import { use } from 'react';
import { SoundContext } from './SoundContext';

export function useSound() {
  return use(SoundContext);
}
