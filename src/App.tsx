import { Suspense, lazy, useEffect } from 'react'
import { audio } from './audio/AudioEngine'
import { BirthdayPhoto } from './components/BirthdayPhoto'
import { CustomCursor } from './components/CustomCursor'
import { EnterExperience } from './components/EnterExperience'
import { FinalGreeting } from './components/FinalGreeting'
import { LoadingScreen } from './components/LoadingScreen'
import { SceneOverlay } from './components/SceneOverlay'
import { SoundControls } from './components/SoundControls'
import { WebGLFallback } from './components/WebGLFallback'
import { useReducedMotion } from './hooks/useReducedMotion'
import { useExperience } from './state/store'
import { detectQuality, detectWebGL } from './utils/device'

// The 3D scene (three.js, post-processing, every scene component) loads as its own chunk.
const SceneManager = lazy(() => import('./components/SceneManager'))

const MIN_LOADING_MS = 1800
const MAX_LOADING_MS = 15000

/** Tracks real loading work (fonts, title font, greeting audio, shader warm-up). */
function usePreload() {
  const set = useExperience((s) => s.set)
  useEffect(() => {
    let done = 0
    const weights = { fonts: 0.15, audio: 0.15, scene: 0.7 }
    const started = performance.now()
    const complete = (key: keyof typeof weights) => {
      done += weights[key]
      set({ loadProgress: Math.min(1, done) })
    }
    const fonts = (document.fonts?.ready ?? Promise.resolve()).then(() => complete('fonts'))
    const greeting = audio.prefetchGreeting().then(() => complete('audio'))
    const scene = new Promise<void>((resolve) => {
      if (useExperience.getState().sceneReady) return resolve()
      const unsub = useExperience.subscribe((s) => {
        if (s.sceneReady) {
          unsub()
          resolve()
        }
      })
    }).then(() => complete('scene'))

    // A gentle trickle so the bar never looks frozen while shaders compile.
    const trickle = window.setInterval(() => {
      const s = useExperience.getState()
      if (s.loadProgress < 0.9) set({ loadProgress: Math.min(0.9, s.loadProgress + 0.012) })
    }, 120)

    const timeout = new Promise<void>((r) => window.setTimeout(r, MAX_LOADING_MS))
    Promise.race([Promise.all([fonts, greeting, scene]), timeout]).then(() => {
      window.clearInterval(trickle)
      set({ loadProgress: 1 })
      const wait = Math.max(0, MIN_LOADING_MS - (performance.now() - started))
      window.setTimeout(() => {
        if (useExperience.getState().phase === 'loading') set({ phase: 'ready' })
      }, wait + 450)
    })
    return () => window.clearInterval(trickle)
  }, [set])
}

export default function App() {
  const webglFailed = useExperience((s) => s.webglFailed)
  const set = useExperience((s) => s.set)
  useReducedMotion()

  useEffect(() => {
    set({ quality: detectQuality(), webglFailed: !detectWebGL() })
  }, [set])

  usePreload()

  if (webglFailed) return <WebGLFallback />

  return (
    <>
      <Suspense fallback={null}>
        <SceneManager />
      </Suspense>
      <SceneOverlay />
      <BirthdayPhoto />
      <FinalGreeting />
      <EnterExperience />
      <LoadingScreen />
      <SoundControls />
      <CustomCursor />
    </>
  )
}
