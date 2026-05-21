import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SoundProvider } from './sound/SoundContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SoundProvider>
      <App />
    </SoundProvider>
  </StrictMode>,
)
