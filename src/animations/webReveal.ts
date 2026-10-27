import gsap from 'gsap'
import { audio } from '../audio/AudioEngine'
import { ui } from '../state/store'
import { makePoseWeights, rig, WORLD } from './rig'
import type { SceneContext } from './context'

/** Scene 3 — stillness, a look to camera, and a glowing web spun across the screen. */
export function webReveal(_ctx: SceneContext) {
  const c = rig.camera
  const h = rig.hero
  h.visible = true
  h.usePath = false
  h.pos.copy(WORLD.landing)
  h.yaw = 0
  h.impact = 0
  Object.assign(h.weights, makePoseWeights({ crouch: 1 }))
  c.follow = 0
  c.lookHero = 1
  c.lookOffset.set(0, 0.05, 0)
  c.smooth = 2.4
  c.parallax = 0.5
  if (c.pos.distanceTo(WORLD.roofCam) > 3) c.snap = true
  c.pos.copy(WORLD.roofCam)
  rig.lights.rim = 1.3
  rig.dof = 0.6
  Object.assign(rig.reveal, { web: 0, glow: 0, push: 0, opacity: 1, shot: 0, shotFade: 0 })
  audio.setMood('quiet', 2)
  audio.setAmbienceLevel(0.7)

  const tl = gsap.timeline()
  tl.to(h, { headLook: 1, duration: 1.4, ease: 'power2.inOut' }, 0.6)
  tl.to(c.pos, { x: 2.1, y: 64.95, z: -167.2, duration: 9, ease: 'sine.inOut' }, 0)
  tl.call(() => ui.set({ showHey: true }), [], 1.5)
  tl.call(() => audio.shimmer(2.4), [], 2.7)
  tl.to(rig.reveal, { web: 1, duration: 2.6, ease: 'power2.out' }, 2.7)
  tl.to(rig.reveal, { glow: 0.65, duration: 1.6, ease: 'sine.inOut' }, 3.2)
  tl.call(() => ui.set({ showShootButton: true }), [], 4.6)
  return tl
}

/** Visitor fires a web: strand to the hub, the web rushes past the lens, cut to the reveal. */
export function shootWebTimeline(ctx: SceneContext) {
  ui.set({ showShootButton: false })
  const c = rig.camera
  const tl = gsap.timeline()
  tl.call(() => audio.thwip(0.15), [], 0)
  tl.to(rig.reveal, { shot: 1, duration: 0.2, ease: 'power2.in' }, 0)
  tl.to(rig.reveal, { glow: 2.4, duration: 0.18, ease: 'power2.out' }, 0.18)
  tl.call(() => {
    rig.shake = ctx.reducedMotion ? 0.1 : 0.45
    audio.whoosh(1.1, -0.2, 0.2, 0.6)
    audio.riser(1.4)
  }, [], 0.2)
  tl.to(rig.reveal, { shotFade: 1, duration: 0.3 }, 0.32)
  tl.call(() => ui.set({ showHey: false }), [], 0.3)
  tl.to(rig.reveal, { push: 1, duration: 1.0, ease: 'power3.in' }, 0.3)
  tl.to(rig.reveal, { opacity: 0, duration: 0.35 }, 0.95)
  tl.to(c, { lookHero: 0, duration: 0.9, ease: 'power2.in' }, 0.35)
  tl.to(c.target, { x: 0, y: 72, z: -150, duration: 0.9, ease: 'power2.in' }, 0.35)
  tl.to(c, { fov: 30, duration: 1.0, ease: 'power3.in' }, 0.35)
  tl.call(() => ui.set({ flashKey: ui.get().flashKey + 1 }), [], 1.12)
  tl.call(() => ctx.next('birthday'), [], 1.25)
  return tl
}
