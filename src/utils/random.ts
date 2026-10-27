/** Small seeded PRNG so the procedural city looks identical on every visit. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = ReturnType<typeof mulberry32>

export const range = (rng: Rng, min: number, max: number) => min + (max - min) * rng()
export const pick = <T,>(rng: Rng, items: readonly T[]) => items[Math.floor(rng() * items.length)]

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** Frame-rate independent exponential smoothing. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt))
