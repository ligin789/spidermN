import { mulberry32, range } from '../utils/random'
import type { Quality } from '../state/store'

export interface BuildingSpec {
  /** Center x/z, footprint w (x) × d (z), height h above base. */
  x: number
  z: number
  w: number
  d: number
  h: number
  base: number
  seed: number
  /** Crown light: 0 none, 1 red, 2 blue, 3 warm white. */
  crown: number
}

export interface SpireSpec {
  x: number
  z: number
  y: number
  h: number
  r: number
}

export interface CityLayout {
  buildings: BuildingSpec[]
  spires: SpireSpec[]
  /** Red aircraft-warning beacons on the tallest roofs. */
  beacons: [number, number, number][]
  /** Wooden water towers on mid-rise roofs (x, roofY, z, scale). */
  waterTowers: [number, number, number, number][]
}

/** Cross-street centre lines (z) along the avenue; traffic and street lamps use these too. */
export const CROSS_STREETS = [118, 60, 2, -56, -114, -158]
export const AVENUE_BLOCKS: [number, number][] = [
  [175, 124],
  [112, 66],
  [54, 8],
  [-4, -50],
  [-62, -108],
  [-120, -152],
]

export function generateCity(quality: Quality): CityLayout {
  const rng = mulberry32(1987)
  const buildings: BuildingSpec[] = []
  const spires: SpireSpec[] = []
  const beacons: [number, number, number][] = []
  const waterTowers: [number, number, number, number][] = []
  const lite = quality === 'low'

  const add = (x: number, z: number, w: number, d: number, h: number, base = 0, crown = 0) => {
    buildings.push({ x, z, w, d, h, base, seed: rng(), crown })
    const top = base + h
    if (top > 150 && rng() > 0.4) beacons.push([x, top + 1.5, z])
    else if (base === 0 && h > 22 && h < 70 && w > 12 && d > 12 && rng() > 0.72)
      waterTowers.push([x + range(rng, -w * 0.25, w * 0.25), top, z + range(rng, -d * 0.25, d * 0.25), range(rng, 0.8, 1.1)])
  }

  // The hero's building and its neighbours frame the rooftop shots.
  buildings.push({ x: 0, z: -180, w: 32, d: 32, h: 64, base: 0, seed: 0.37, crown: 0 })
  add(-32, -184, 28, 40, 96)
  add(33, -186, 30, 44, 82)
  add(-32, -228, 26, 30, 58)
  add(32, -232, 28, 30, 66)

  // Avenue canyon — two rows of buildings each side.
  for (const side of [-1, 1]) {
    for (const [zs, ze] of AVENUE_BLOCKS) {
      let z = zs
      while (z > ze + 4) {
        const len = Math.min(z - ze, range(rng, 10, 22))
        const depth = range(rng, 14, 26)
        const front = 17.5 + rng() * 1.5
        let h = rng() < 0.18 ? range(rng, 95, 140) : range(rng, 24, 88)
        // Leave the hero's swing corridor open on the right side of the avenue.
        if (side === 1 && z < -30 && z > -100) h = Math.min(h, 84)
        add(side * (front + depth / 2), z - len / 2, depth, len - 0.8, h)
        const backW = range(rng, 16, 28)
        add(side * (front + depth + 8 + backW / 2), z - len / 2, backW, len - 0.8, range(rng, 30, 150))
        z -= len
      }
    }
  }

  // Midtown skyline beyond the rooftop.
  const cellW = lite ? 46 : 36
  const cellD = lite ? 44 : 34
  for (let z = -250; z > -980; z -= cellD) {
    for (let x = -560; x < 560; x += cellW) {
      const dist = -z - 205
      if (rng() < (lite ? 0.35 : 0.18)) continue
      const w = range(rng, cellW * 0.45, cellW * 0.85)
      const d = range(rng, cellD * 0.45, cellD * 0.85)
      const cx = x + range(rng, -4, 4)
      const cz = z + range(rng, -4, 4)
      const midtown = Math.exp(-Math.pow((cx + 40) / 260, 2)) * range(rng, 30, 150)
      let h = range(rng, 30, 80) + dist * range(rng, 0.03, 0.16) + midtown
      // Keep a lower view corridor right behind the hero so the skyline reads in the finale.
      if (Math.abs(cx) < 80 && cz > -330) h = Math.min(h, 54)
      const crown = h > 170 && rng() > 0.5 ? 1 + Math.floor(rng() * 3) : 0
      add(cx, cz, w, d, h, 0, crown)
      if (h > 120 && rng() > 0.55) {
        // setback tower
        const h2 = range(rng, 25, 70)
        add(cx, cz, w * 0.62, d * 0.62, h2, h, crown)
      }
    }
  }

  // Side districts so camera pans never reveal empty ground.
  const sideStep = lite ? 40 : 30
  for (const side of [-1, 1]) {
    for (let z = 180; z > -250; z -= sideStep) {
      for (let x = 82; x < 420; x += sideStep) {
        if (rng() < 0.3) continue
        const w = range(rng, 12, sideStep * 0.8)
        const d = range(rng, 12, sideStep * 0.8)
        add(side * (x + range(rng, -3, 3)), z + range(rng, -3, 3), w, d, range(rng, 18, 110))
      }
    }
  }

  // Landmarks: stepped art-deco giant and a couple of supertalls.
  const deco = (x: number, z: number) => {
    const steps: [number, number, number, number][] = [
      [34, 0, 78, 0],
      [26, 78, 80, 0],
      [19, 158, 46, 0],
      [13, 204, 24, 1],
      [8, 228, 16, 2],
    ]
    for (const [s, base, h, crown] of steps) buildings.push({ x, z, w: s, d: s, h, base, seed: 0.81, crown })
    spires.push({ x, z, y: 244, h: 52, r: 1.1 })
    beacons.push([x, 297, z])
  }
  deco(-120, -560)
  buildings.push({ x: 150, z: -470, w: 22, d: 22, h: 300, base: 0, seed: 0.12, crown: 3 })
  spires.push({ x: 150, z: -470, y: 300, h: 34, r: 0.8 })
  beacons.push([150, 335, -470])
  buildings.push({ x: -270, z: -430, w: 28, d: 28, h: 214, base: 0, seed: 0.55, crown: 0 })
  buildings.push({ x: -270, z: -430, w: 17, d: 17, h: 40, base: 214, seed: 0.55, crown: 2 })
  buildings.push({ x: 70, z: -740, w: 34, d: 30, h: 268, base: 0, seed: 0.66, crown: 1 })
  beacons.push([70, 270, -740])

  return { buildings, spires, beacons, waterTowers }
}
