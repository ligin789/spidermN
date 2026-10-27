import { Component, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import type { Object3D } from 'three'
import { useExperience, ui } from '../state/store'
import { loadTitleFont } from '../three/fontCache'
import { BirthdayTitle } from './BirthdayTitle'
import { Atmosphere } from './Atmosphere'
import { CameraRig } from './CameraRig'
import { Celebration } from './Celebration'
import { CityEnvironment } from './CityEnvironment'
import { HeroCharacter } from './HeroCharacter'
import { PostFX } from './PostFX'
import { Rooftop } from './Rooftop'
import { DecorWebs, RevealWeb, SwingStrands } from './WebEffects'

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    ui.set({ webglFailed: true })
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** The one persistent WebGL canvas that hosts every scene of the experience. */
export default function SceneManager() {
  const quality = useExperience((s) => s.quality)
  const [maxDpr, setMaxDpr] = useState(quality === 'high' ? 1.75 : 1.35)
  return (
    <CanvasBoundary>
      <Canvas
        className="scene-canvas"
        dpr={[1, maxDpr]}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false }}
        camera={{ fov: 46, near: 0.1, far: 4200, position: [0, 19, 168] }}
        shadows={quality === 'high' ? 'percentage' : false}
        eventSource={document.getElementById('root') ?? undefined}
        eventPrefix="client"
        onCreated={(state) => {
          const { gl } = state
          if (import.meta.env.DEV) Object.assign(window, { __r3f: state })
          gl.setClearColor('#04060d')
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
        }}
      >
        <PerformanceMonitor onDecline={() => setMaxDpr((d) => Math.max(1, d - 0.35))} />
        <Suspense fallback={null}>
          <SceneContents quality={quality} />
        </Suspense>
      </Canvas>
    </CanvasBoundary>
  )
}

function SceneContents({ quality }: { quality: 'high' | 'low' }) {
  return (
    <>
      <CameraRig />
      <Environment resolution={128} frames={1} environmentIntensity={0.5}>
        <color attach="background" args={['#04060d']} />
        <Lightformer form="rect" intensity={4} color="#ff2a3a" position={[-6, 1.5, 4]} scale={[3, 9, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={4.5} color="#3a72ff" position={[6, 1.5, 4]} scale={[3, 9, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.6} color="#ffffff" position={[0, 7, 5]} scale={[9, 1.2, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#9fb0e0" position={[0, -5, -6]} scale={[14, 2, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2} color="#ffd29a" position={[0, 3, -8]} scale={[10, 1.2, 1]} target={[0, 0, 0]} />
        {/* soft front box so camera-facing chrome reads as bright silver */}
        <Lightformer form="rect" intensity={1.6} color="#dfe8ff" position={[0, 2.5, 9]} scale={[14, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.7} color="#ffffff" position={[0, -3, 9]} scale={[14, 2, 1]} target={[0, 0, 0]} />
      </Environment>
      <CityEnvironment />
      <Rooftop />
      <DecorWebs />
      <HeroCharacter />
      <SwingStrands />
      <RevealWeb quality={quality} />
      <BirthdayTitle />
      <Celebration quality={quality} />
      <Atmosphere quality={quality} />
      <PostFX quality={quality} />
      <Warmup />
    </>
  )
}

/**
 * Pre-compiles every shader (including hidden objects) once the title font is
 * in, so the first reveal of each scene doesn't hitch. Then reports ready.
 */
function Warmup() {
  const { gl, scene, camera } = useThree()
  const fontReady = useExperience((s) => s.fontReady)
  const [fontSettled, setFontSettled] = useState(false)

  useEffect(() => {
    let alive = true
    loadTitleFont().then((f) => {
      if (!alive) return
      ui.set({ fontReady: !!f })
      setFontSettled(true)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!fontSettled) return
    let raf = 0
    let frames = 0
    const run = () => {
      if (++frames < 3) {
        raf = requestAnimationFrame(run)
        return
      }
      const hidden: Object3D[] = []
      scene.traverse((o) => {
        if (!o.visible) {
          hidden.push(o)
          o.visible = true
        }
      })
      const finish = () => {
        hidden.forEach((o) => (o.visible = false))
        ui.set({ sceneReady: true })
      }
      try {
        gl.compileAsync(scene, camera).then(finish, finish)
      } catch {
        finish()
      }
    }
    raf = requestAnimationFrame(run)
    return () => cancelAnimationFrame(raf)
  }, [fontSettled, fontReady, gl, scene, camera])

  return null
}
