import gsap from 'gsap'
import { audio } from '../audio/AudioEngine'
import { ui } from '../state/store'
import { rig } from './rig'
import type { SceneContext } from './context'

/** Scene 1 — black screen, dateline, the skyline emerging from fog as we glide up the avenue. */
export function introTimeline(ctx: SceneContext) {
  const c = rig.camera
  c.pos.set(0, 19, 168)
  c.target.set(0, 30, -40)
  c.fov = 44
  c.parallax = 0.6
  c.snap = true
  rig.env.fog = 0.0125
  rig.env.windows = 0
  rig.hero.visible = false
  ui.set({ caption: null })
  gsap.set('#curtain', { opacity: 1 })

  const tl = gsap.timeline()
  tl.call(() => audio.startAmbience(1), [], 0)
  tl.call(() => audio.setMood('tension', 4), [], 0.4)
  tl.call(() => ui.set({ caption: { id: 'dateline', text: 'NEW YORK CITY • 11:59 PM', tone: 'dateline' } }), [], 0.7)
  tl.to('#curtain', { opacity: 0, duration: 3.6, ease: 'power2.inOut' }, 2.3)
  tl.to(rig.env, { fog: 0.0027, duration: 7.5, ease: 'power2.out' }, 1.6)
  tl.to(rig.env, { windows: 1, duration: 6, ease: 'power1.inOut' }, 2.0)
  tl.to(c.pos, { x: 0, y: 47, z: -36, duration: 11, ease: 'power2.inOut' }, 0)
  tl.to(c.target, { x: 0, y: 72, z: -170, duration: 11, ease: 'power2.inOut' }, 0)
  tl.call(() => ui.set({ caption: null }), [], 3.9)
  tl.call(() => ui.set({ caption: { id: 'teaser', text: 'Something AMAZING is about to happen...', tone: 'teaser' } }), [], 5.3)
  tl.call(() => ui.set({ caption: null }), [], 9.0)
  tl.call(() => ctx.next('arrival'), [], 10.4)
  return tl
}
