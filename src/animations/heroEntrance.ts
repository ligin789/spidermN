import gsap from 'gsap'
import { audio } from '../audio/AudioEngine'
import { fx } from './events'
import { PATH_TIMES, PIVOT_HEIGHT } from './heroPath'
import { rig, WORLD } from './rig'
import type { SceneContext } from './context'

/** Scene 2 — the web, two swings, a twisting flip and a three-point landing. */
export function heroEntrance(ctx: SceneContext) {
  const P = PATH_TIMES
  const c = rig.camera
  const h = rig.hero
  h.visible = true
  h.usePath = true
  h.pathT = 0
  h.headLook = 0
  h.wave = 0
  rig.lights.rim = 0.5
  c.smooth = 3.2
  c.follow = 0
  c.lookHero = 0
  c.lookOffset.set(0, 0.6, 0)
  c.followOffset.set(-8, 2, 7)
  c.parallax = 0.3
  rig.env.fog = 0.0027
  rig.env.windows = 1

  const settle = 2.6
  const tl = gsap.timeline()
  tl.to(h, { pathT: P.land + settle, duration: P.land + settle, ease: 'none' }, 0)

  // Look up as the first web streaks in from above.
  tl.to(c.target, { x: 10, y: 98, z: -92, duration: 1.3, ease: 'power2.inOut' }, 0)
  tl.to(c.pos, { x: -5, y: 60, z: -30, duration: 1.6, ease: 'power2.inOut' }, 0)
  tl.to(c, { lookHero: 1, duration: 1.1, ease: 'sine.inOut' }, 1.0)
  // Then fly alongside him: left-side profile through both swings.
  tl.to(c, { follow: 1, duration: 1.6, ease: 'sine.inOut' }, 1.3)
  tl.to(c.followOffset, { x: -6, y: 1.2, z: 7, duration: 1.6, ease: 'sine.inOut' }, 3.0)
  // Track the flip down onto the roof and settle into a low rooftop shot.
  tl.to(c.followOffset, {
    x: WORLD.roofCam.x - WORLD.landing.x,
    y: WORLD.roofCam.y - WORLD.landing.y - PIVOT_HEIGHT,
    z: WORLD.roofCam.z - WORLD.landing.z,
    duration: P.land - P.release2 + 0.1,
    ease: 'power1.inOut',
  }, P.release2 - 0.05)
  tl.to(c.lookOffset, { x: 0, y: 0.05, z: 0, duration: 1.2 }, P.release2)

  // Sound + impact beats.
  tl.call(() => audio.thwip(0.4), [], P.shoot1 + 0.05)
  tl.call(() => audio.whoosh(1.6, 0.6, -0.4, 0.45), [], 1.0)
  tl.call(() => audio.thwip(-0.1), [], P.shoot2)
  tl.call(() => audio.whoosh(1.2, -0.3, 0.3, 0.5), [], P.swing2 + 0.2)
  tl.call(() => audio.whoosh(0.9, 0.2, -0.2, 0.35), [], P.release2 + 0.1)
  tl.call(
    () => {
      audio.impact()
      rig.shake = ctx.reducedMotion ? 0.2 : 1.1
      fx.emit({ type: 'impact', at: WORLD.landing })
    },
    [],
    P.land,
  )
  tl.to(rig.lights, { rim: 2.6, duration: 0.12, ease: 'power2.out' }, P.land)
  tl.to(rig.lights, { rim: 1.3, duration: 1.4, ease: 'power2.inOut' }, P.land + 0.15)
  tl.call(() => audio.setMood('quiet', 2.5), [], P.land + 0.4)
  tl.call(() => ctx.next('reveal'), [], P.land + settle)
  return tl
}
