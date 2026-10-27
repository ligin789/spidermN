import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import { rig } from '../animations/rig'
import { damp } from '../utils/random'
import { useExperience } from '../state/store'

/**
 * Applies the authored camera (rig.camera) every frame, layering in hero
 * follow, mouse parallax, portrait-aware FOV and decaying camera shake.
 */
export function CameraRig() {
  const reducedMotion = useExperience((s) => s.reducedMotion)
  const state = useMemo(
    () => ({
      pos: new Vector3(),
      target: new Vector3(),
      desiredPos: new Vector3(),
      desiredTarget: new Vector3(),
      tmp: new Vector3(),
      px: 0,
      py: 0,
      initialized: false,
    }),
    [],
  )

  useFrame((three, delta) => {
    const cam = three.camera as PerspectiveCamera
    const c = rig.camera
    const dt = Math.min(delta, 1 / 20)
    const s = state

    s.desiredPos.copy(c.pos)
    s.desiredTarget.copy(c.target)
    if (c.follow > 0) {
      s.tmp.copy(rig.hero.pivot).add(c.followOffset)
      s.desiredPos.lerp(s.tmp, c.follow)
    }
    if (c.lookHero > 0) {
      s.tmp.copy(rig.hero.pivot).add(c.lookOffset)
      s.desiredTarget.lerp(s.tmp, c.lookHero)
    }

    if (c.snap || !s.initialized || c.smooth <= 0) {
      s.pos.copy(s.desiredPos)
      s.target.copy(s.desiredTarget)
      c.snap = false
      s.initialized = true
    } else {
      const k = c.smooth
      s.pos.set(damp(s.pos.x, s.desiredPos.x, k, dt), damp(s.pos.y, s.desiredPos.y, k, dt), damp(s.pos.z, s.desiredPos.z, k, dt))
      const kt = k * 1.8
      s.target.set(
        damp(s.target.x, s.desiredTarget.x, kt, dt),
        damp(s.target.y, s.desiredTarget.y, kt, dt),
        damp(s.target.z, s.desiredTarget.z, kt, dt),
      )
    }

    cam.position.copy(s.pos)

    // Gentle pointer parallax (disabled for reduced motion).
    const par = reducedMotion ? 0 : c.parallax
    s.px = damp(s.px, three.pointer.x, 2.5, dt)
    s.py = damp(s.py, three.pointer.y, 2.5, dt)
    cam.lookAt(s.target)
    if (par > 0) {
      cam.translateX(s.px * 0.35 * par)
      cam.translateY(s.py * 0.2 * par)
    }

    // Shake: layered sines, decays on its own.
    if (rig.shake > 0.0005) {
      const t = three.clock.elapsedTime
      const a = rig.shake * (reducedMotion ? 0.15 : 1)
      cam.translateX((Math.sin(t * 47) + Math.sin(t * 83) * 0.5) * 0.12 * a)
      cam.translateY((Math.sin(t * 59 + 1) + Math.sin(t * 97) * 0.5) * 0.12 * a)
      cam.rotateZ(Math.sin(t * 31) * 0.012 * a)
      rig.shake *= Math.exp(-dt * 4.5)
    }
    if (c.roll) cam.rotateZ(c.roll)

    // Keep framing on portrait screens by widening the vertical FOV.
    const aspect = cam.aspect
    let fov = c.fov
    if (aspect < 1.25) {
      const t = Math.tan((fov * Math.PI) / 360) * Math.pow(1.25 / aspect, 0.62)
      fov = Math.min(82, (Math.atan(t) * 360) / Math.PI)
    }
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }

    rig.focus.copy(c.lookHero > 0.5 ? rig.hero.pivot : s.target)
  }, -1)

  return null
}
