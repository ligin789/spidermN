import { Vector3 } from 'three'
import type { PoseName } from './poses'
import { createPathState } from './heroPath'

/** Fixed world landmarks shared by the city, the hero and the timelines. */
export const WORLD = {
  roofY: 64,
  /** Hero building footprint (x/z extents) — the rooftop where he lands. */
  heroBuilding: { minX: -16, maxX: 16, minZ: -196, maxZ: -164 },
  landing: new Vector3(0, 64, -171),
  /** Front parapet, where he perches at the end. */
  ledge: new Vector3(0, 65.17, -164.3),
  /** Low rooftop camera used for the landing and the web reveal. */
  roofCam: new Vector3(2.7, 65.05, -166.1),
  /** Where the 3D birthday title floats. */
  titleCenter: new Vector3(0, 75, -150),
}

export function makePoseWeights(initial: Partial<Record<PoseName, number>> = {}): Record<PoseName, number> {
  return { stand: 0, swing: 0, soar: 0, tuck: 0, land: 0, crouch: 0, perch: 0, ...initial }
}

/**
 * The rig is the single mutable object GSAP timelines write into and the
 * R3F components read from inside useFrame. Nothing here triggers React renders.
 */
export const rig = {
  camera: {
    pos: new Vector3(0, 24, 150),
    target: new Vector3(0, 36, -60),
    fov: 48,
    /** 0..1 — blend camera position toward `hero + followOffset`. */
    follow: 0,
    followOffset: new Vector3(-12, 3, 16),
    /** 0..1 — blend look target toward the hero. */
    lookHero: 0,
    lookOffset: new Vector3(0, 1.4, 0),
    /** Damping applied on top of the authored values (0 = exact). */
    smooth: 0,
    snap: true,
    roll: 0,
    parallax: 1,
  },
  shake: 0,
  dof: 0,
  focus: new Vector3(0, 66, -171),
  hero: {
    visible: false,
    usePath: true,
    pathT: 0,
    pos: WORLD.landing.clone(),
    yaw: 0,
    hop: 0,
    weights: makePoseWeights({ crouch: 1 }),
    wave: 0,
    headLook: 0,
    impact: 0,
    /** Evaluated swing path (written by HeroCharacter, read by the web strands). */
    path: createPathState(),
    // ─ outputs written by HeroCharacter every frame ─
    worldPos: new Vector3(),
    pivot: new Vector3(),
    handR: new Vector3(),
    head: new Vector3(),
  },
  lights: {
    rim: 0.4,
    key: 1,
    flash: 0,
    beams: 0,
    spot: 0,
  },
  env: {
    fog: 0.03,
    windows: 0,
    exposure: 1,
  },
  reveal: {
    web: 0,
    glow: 0,
    push: 0,
    opacity: 1,
    shot: 0,
    shotFade: 0,
  },
  title: {
    visible: false,
    happy: 0,
    name: 0,
    glow: 0,
    lift: 0,
    opacity: 1,
  },
  celebrate: {
    particles: 0,
    balloons: 0,
    balloonsAway: 0,
    rain: 0,
  },
}

export type Rig = typeof rig

/** Neutral starting point every scene builds on (also used by replay/skip). */
export function resetRig() {
  const c = rig.camera
  c.follow = 0
  c.lookHero = 0
  c.lookOffset.set(0, 1.4, 0)
  c.followOffset.set(-12, 3, 16)
  c.smooth = 0
  c.snap = true
  c.roll = 0
  c.parallax = 1
  c.fov = 46
  rig.shake = 0
  rig.dof = 0
  const h = rig.hero
  h.visible = false
  h.usePath = true
  h.pathT = 0
  h.pos.copy(WORLD.landing)
  h.yaw = 0
  h.hop = 0
  h.wave = 0
  h.headLook = 0
  h.impact = 0
  Object.assign(h.weights, makePoseWeights({ crouch: 1 }))
  Object.assign(rig.lights, { rim: 0.4, key: 1, flash: 0, beams: 0, spot: 0 })
  Object.assign(rig.env, { fog: 0.0027, windows: 1, exposure: 1 })
  Object.assign(rig.reveal, { web: 0, glow: 0, push: 0, opacity: 1, shot: 0, shotFade: 0 })
  Object.assign(rig.title, { visible: false, happy: 0, name: 0, glow: 0, lift: 0, opacity: 1 })
  Object.assign(rig.celebrate, { particles: 0, balloons: 0, balloonsAway: 0, rain: 0 })
}
