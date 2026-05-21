let audioContext: AudioContext | null = null

function getContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}

export function initAudio() {
  getContext()
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
) {
  const ctx = getContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function playNoise(duration: number, volume = 0.1) {
  const ctx = getContext()
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  const gain = ctx.createGain()
  source.buffer = buffer
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  source.connect(gain)
  gain.connect(ctx.destination)
  source.start()
}

export const SoundEffects = {
  diceRoll: () => {
    for (let i = 0; i < 6; i++) setTimeout(() => playNoise(0.05, 0.15), i * 80)
  },
  land: () => {
    playTone(400, 0.15, 'sine', 0.2)
  },
  moneyGain: () => {
    playTone(800, 0.1, 'sine', 0.2)
    setTimeout(() => playTone(1200, 0.15, 'sine', 0.2), 100)
  },
  moneyLoss: () => {
    playTone(400, 0.2, 'sawtooth', 0.1)
  },
  purchase: () => {
    playTone(523, 0.15, 'sine', 0.2)
    setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 150)
    setTimeout(() => playTone(784, 0.2, 'sine', 0.2), 300)
  },
  build: () => {
    playTone(200, 0.08, 'square', 0.15)
    setTimeout(() => playTone(250, 0.08, 'square', 0.15), 150)
  },
  jail: () => {
    playNoise(0.3, 0.2)
    playTone(150, 0.3, 'sawtooth', 0.15)
  },
  card: () => {
    playNoise(0.1, 0.1)
    playTone(600, 0.1, 'sine', 0.1)
  },
  bankrupt: () => {
    playTone(100, 0.5, 'sawtooth', 0.2)
    playTone(80, 0.6, 'sine', 0.15)
  },
  win: () => {
    ;[523, 659, 784, 1047].forEach((freq, i) =>
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.25), i * 200),
    )
  },
}
