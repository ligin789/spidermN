import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { director } from './animations/director'
import { rig } from './animations/rig'
import { useExperience } from './state/store'
import { audio } from './audio/AudioEngine'

// Handy for tweaking shots from the browser console during development.
if (import.meta.env.DEV) Object.assign(window, { __spidey: { director, rig, store: useExperience, audio } })

const PoseLab = import.meta.env.DEV ? lazy(() => import('./components/PoseLab')) : null
const lab = PoseLab && new URLSearchParams(location.search).has('poselab')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {lab && PoseLab ? (
      <Suspense fallback={null}>
        <PoseLab />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
