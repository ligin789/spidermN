import gsap from 'gsap'
import { audio } from '../audio/AudioEngine'
import { NAME_UPPER } from '../config/party'
import { getTitleFont } from '../three/fontCache'
import { ui } from '../state/store'
import { fx } from './events'
import { makePoseWeights, rig, WORLD } from './rig'
import type { SceneContext } from './context'

/** Scene 4 — HAPPY BIRTHDAY flips up, the name is pulled in by webs, the sky celebrates. */
export function birthdayReveal(ctx: SceneContext) {
  const c = rig.camera
  const h = rig.hero
  Object.assign(rig.reveal, { web: 0, opacity: 0, push: 0, shot: 0, shotFade: 1, glow: 0 })
  h.visible = true
  h.usePath = false
  h.pos.copy(WORLD.landing)
  h.yaw = 0
  h.headLook = 0.5
  Object.assign(h.weights, makePoseWeights({ stand: 1 }))
  c.follow = 0
  c.lookHero = 0
  c.smooth = 0
  c.snap = true
  c.fov = 44
  c.parallax = 1
  c.pos.set(0, 71.1, -125)
  c.target.set(0, 75, -160)
  rig.dof = 0
  rig.lights.rim = 1.2
  rig.env.fog = 0.0025
  Object.assign(rig.title, { visible: true, happy: 0, name: 0, glow: 0, lift: 0, opacity: 1 })
  if (!getTitleFont()) ui.set({ showTitleFallback: true })

  const letters = [...NAME_UPPER].length
  const nameStart = 2.1
  const nameDur = 2.2 + letters * 0.18
  const span = 1 + 0.42 * (letters - 1)
  // overshoot slightly so every letter finishes and its web strand snaps away
  const nameEnd = (span + 0.25) / span

  const tl = gsap.timeline()
  tl.call(() => audio.setMood('hero', 1.2), [], 0)
  tl.to(c.pos, { x: 0, y: 71.5, z: -128.5, duration: 14, ease: 'sine.inOut' }, 0)
  tl.to(rig.lights, { beams: 1, duration: 2.5, ease: 'sine.inOut' }, 0.2)
  tl.to(rig.celebrate, { particles: 1, duration: 2.5 }, 0.3)
  tl.call(() => audio.whoosh(1.2, -0.5, 0.5, 0.4), [], 0.35)
  tl.to(rig.title, { happy: 1, duration: 1.6, ease: 'power1.out' }, 0.45)
  for (let i = 0; i < 5; i++) tl.call(() => audio.chime(i), [], 0.5 + i * 0.28)

  tl.to(rig.title, { name: nameEnd, duration: nameDur, ease: 'none' }, nameStart)
  const timeAt = (local: number, i: number) => nameStart + (nameDur * ((0.42 * i + local) / span)) / nameEnd
  for (let i = 0; i < letters; i++) {
    const startAt = timeAt(0, i)
    const landAt = timeAt(0.72, i)
    tl.call(() => audio.thwip((i / Math.max(1, letters - 1)) * 1.2 - 0.6), [], startAt)
    tl.call(() => audio.chime(i + 1), [], landAt)
  }

  const boom = nameStart + nameDur + 0.1
  tl.call(
    () => {
      audio.celebrate()
      rig.shake = ctx.reducedMotion ? 0.1 : 0.35
      fx.emit({ type: 'sparks', at: WORLD.titleCenter, count: 220 })
      fx.emit({ type: 'confetti', at: WORLD.titleCenter.clone().setY(WORLD.titleCenter.y + 6), count: 180 })
    },
    [],
    boom,
  )
  tl.to(rig.title, { glow: 1, duration: 0.5, ease: 'power2.out' }, boom)
  tl.to(rig.celebrate, { rain: 1, duration: 1 }, boom + 0.2)
  tl.to(rig.celebrate, { balloons: 1, duration: 3.4, ease: 'power2.out' }, boom + 0.1)
  tl.call(() => ctx.next('celebrate'), [], boom + 3.4)
  return tl
}
