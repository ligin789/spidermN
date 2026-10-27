import gsap from 'gsap'
import { audio } from '../audio/AudioEngine'
import { party } from '../config/party'
import { ui } from '../state/store'
import { makePoseWeights, rig, WORLD } from './rig'
import type { SceneContext } from './context'

/** Scene 6 — back on the rooftop. He turns, waves, and the greeting plays (once). */
export function finalGreeting(ctx: SceneContext) {
  const c = rig.camera
  const h = rig.hero
  h.visible = true
  h.usePath = false
  h.pos.copy(WORLD.landing)
  h.hop = 0
  h.yaw = Math.PI - 0.25
  h.headLook = 0
  h.wave = 0
  Object.assign(h.weights, makePoseWeights({ stand: 1 }))
  c.follow = 0
  c.lookHero = 0
  c.smooth = 0
  c.parallax = 0.5
  rig.dof = 0
  rig.lights.rim = 1.2

  const tl = gsap.timeline()
  // Fly from the title stage down to a low, heroic angle behind him.
  tl.call(() => audio.whoosh(1.6, 0.6, -0.6, 0.45), [], 0)
  tl.to(c.pos, { x: 1.9, y: 65.4, z: -165.0, duration: 2.2, ease: 'power3.inOut' }, 0)
  tl.to(c.target, { x: 0, y: 65.75, z: -172, duration: 2.2, ease: 'power3.inOut' }, 0)
  tl.to(c, { fov: 40, duration: 2.2, ease: 'power2.inOut' }, 0)
  tl.to(rig.title, { opacity: 0, duration: 0.8 }, 0)
  tl.set(rig.title, { visible: false }, 0.9)
  tl.to(rig.celebrate, { rain: 0, particles: 0.35, duration: 1.5 }, 0)
  tl.to(rig.celebrate, { balloonsAway: 1, duration: 9, ease: 'power1.in' }, 0)
  tl.to(rig.lights, { beams: 0.45, duration: 2 }, 0)
  tl.to(rig, { dof: 0.8, duration: 2 }, 1.6)
  tl.call(() => audio.setMood('calm', 2.5), [], 0.2)
  tl.call(() => audio.duck(0.45, 3), [], 0.4)

  // Slow push-in while he turns to face the viewer.
  tl.to(c.pos, { x: 1.2, y: 65.3, z: -166.6, duration: 7, ease: 'sine.inOut' }, 2.2)
  tl.to(h, { yaw: 0, duration: 1.5, ease: 'power2.inOut' }, 2.4)
  tl.to(h, { headLook: 1, duration: 1.2, ease: 'power2.inOut' }, 2.9)
  tl.call(() => audio.duck(0.12, 1.2), [], 3.2)
  tl.to(h, { wave: 1, duration: 0.55, ease: 'back.out(1.6)' }, 3.9)

  const lineAt = 4.3
  tl.call(() => {
    audio.playGreeting()
    ui.set({ subtitle: party.greeting, greetingPlayed: true })
  }, [], lineAt)
  tl.to(rig.lights, { rim: 2.2, duration: 0.4, ease: 'power2.out' }, lineAt)
  tl.to(rig.lights, { rim: 1.3, duration: 2, ease: 'sine.inOut' }, lineAt + 0.5)
  tl.to(h, { wave: 0, duration: 0.7, ease: 'power2.inOut' }, lineAt + 2.6)
  tl.call(() => ui.set({ subtitle: null }), [], lineAt + 3.2)
  tl.call(() => ctx.next('end'), [], lineAt + 3.6)
  return tl
}

/** Scene 7 — he hops onto the ledge and perches; the camera pulls back to the skyline. */
export function finaleEnd(_ctx: SceneContext) {
  const c = rig.camera
  const h = rig.hero
  h.visible = true
  h.usePath = false
  h.yaw = 0
  h.headLook = 1
  Object.assign(h.weights, makePoseWeights({ stand: 1 }))
  c.follow = 0
  c.lookHero = 0
  c.smooth = 0
  rig.title.visible = false
  rig.celebrate.rain = 0
  rig.celebrate.balloonsAway = 1

  const tl = gsap.timeline()
  // hop
  tl.to(h.pos, { x: WORLD.ledge.x, y: WORLD.ledge.y, z: WORLD.ledge.z, duration: 0.75, ease: 'power1.inOut' }, 0.2)
  tl.to(h, { hop: 1.3, duration: 0.38, ease: 'power2.out' }, 0.2)
  tl.to(h, { hop: 0, duration: 0.37, ease: 'power2.in' }, 0.58)
  tl.to(h.weights, { stand: 0, soar: 1, duration: 0.25 }, 0.2)
  tl.to(h.weights, { soar: 0, perch: 1, duration: 0.35, ease: 'power2.out' }, 0.62)
  tl.call(() => audio.thwip(0), [], 0.2)

  // camera steps aside and up, then floats out past the parapet to face him
  tl.to(c.pos, { x: 3.4, y: 68.2, z: -163, duration: 1.3, ease: 'power2.inOut' }, 0)
  tl.to(c.target, { x: 0, y: 66.4, z: -166, duration: 1.3, ease: 'power2.inOut' }, 0)
  tl.to(c.pos, { x: 2.8, y: 64.95, z: -158.3, duration: 2.4, ease: 'power2.inOut' }, 1.3)
  tl.to(c.target, { x: 0.2, y: 66.5, z: -165, duration: 2.4, ease: 'power2.inOut' }, 1.3)
  tl.to(c, { fov: 46, duration: 3, ease: 'sine.inOut' }, 0.8)
  tl.to(rig, { dof: 0.5, duration: 2 }, 1.4)
  tl.call(() => audio.duck(0.8, 3), [], 1.2)
  tl.call(() => ui.set({ showFinal: true }), [], 2.4)
  // slow idle drift forever after
  tl.to(c.pos, { x: 3.5, y: 65.2, z: -158.9, duration: 12, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 3.8)
  return tl
}

/** Replay the spoken line on demand, with a wave. */
export function replayGreetingTimeline() {
  const h = rig.hero
  const tl = gsap.timeline()
  tl.call(() => audio.duck(0.12, 0.6), [], 0)
  tl.to(h, { wave: 1, headLook: 1, duration: 0.45, ease: 'back.out(1.6)' }, 0)
  tl.call(() => {
    audio.playGreeting()
    ui.set({ subtitle: party.greeting })
  }, [], 0.3)
  tl.to(rig.lights, { rim: 2.2, duration: 0.3 }, 0.3)
  tl.to(rig.lights, { rim: 1.3, duration: 1.6 }, 0.7)
  tl.to(h, { wave: 0, duration: 0.6, ease: 'power2.inOut' }, 2.8)
  tl.call(() => ui.set({ subtitle: null }), [], 3.2)
  tl.call(() => audio.duck(ui.get().phase === 'end' ? 0.8 : 0.45, 2), [], 3.4)
  return tl
}
