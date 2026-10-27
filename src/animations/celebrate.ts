import gsap from 'gsap'
import { audio } from '../audio/AudioEngine'
import { ui } from '../state/store'
import { fx } from './events'
import { rig } from './rig'
import type { SceneContext } from './context'
import { Vector3 } from 'three'

const forward = new Vector3()

/** Scene 5 — the title lifts, the birthday hero's photo pops in with a confetti cannon, then on to the finale. */
export function celebrateTimeline(ctx: SceneContext) {
  Object.assign(rig.title, { visible: true, happy: 1, name: 1.5, glow: 1 })
  rig.celebrate.balloons = 1
  rig.celebrate.particles = 1
  rig.lights.beams = 1
  const c = rig.camera
  const tl = gsap.timeline()
  tl.to(rig.title, { lift: 0.45, opacity: 0.7, glow: 0.7, duration: 1.2, ease: 'power2.inOut' }, 0)
  tl.to(rig.celebrate, { rain: 0.35, duration: 1.5 }, 0)
  tl.call(() => ui.set({ showPhoto: true }), [], 0.5)
  tl.call(() => audio.whoosh(0.8, 0, 0, 0.25), [], 0.5)
  tl.call(() => {
    forward.subVectors(c.target, c.pos).normalize()
    const at = c.pos.clone().addScaledVector(forward, 10).add(new Vector3(0, -1.2, 0))
    fx.emit({ type: 'confetti', at, count: 420 })
    fx.emit({ type: 'sparks', at, count: 200 })
    rig.shake = ctx.reducedMotion ? 0.15 : 0.7
    audio.celebrate()
    audio.pop()
  }, [], 0.9)
  tl.to(rig.title, { glow: 1.4, duration: 0.25, yoyo: true, repeat: 1 }, 0.9)
  tl.to(rig.celebrate, { rain: 1, duration: 0.4 }, 0.9)
  tl.call(() => ui.set({ showPhoto: false }), [], 5.4)
  tl.call(() => ctx.next('finale'), [], 6)
  return tl
}
