import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { mulberry32 } from '../utils/random'

/**
 * Procedural textures, painted once on 2D canvases. Everything the suit,
 * particles and fog need is generated here so the site has no binary assets
 * to download.
 */

const cache = new Map<string, Texture>()

function cached<T extends Texture>(key: string, make: () => T): T {
  const hit = cache.get(key)
  if (hit) return hit as T
  const tex = make()
  cache.set(key, tex)
  return tex
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  return { c, ctx }
}

function toTexture(c: HTMLCanvasElement, srgb = true, repeat = false) {
  const t = new CanvasTexture(c)
  if (srgb) t.colorSpace = SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping
  t.anisotropy = 4
  t.needsUpdate = true
  return t
}

export const SUIT = {
  red: '#c3121f',
  redDeep: '#8e0a15',
  blue: '#163a8c',
  blueDeep: '#0d2459',
  line: '#16060a',
}

interface WebOpts {
  radial: number
  rings: number
  /** Ring arcs bow toward v = 1 (true) or v = 0. */
  sagUp: boolean
  sag: number
  /** Optional u-ranges painted blue instead of red (torso side panels). */
  blue?: (u: number) => boolean
  emblem?: { u: number; v: number; size: number }
  ringStart?: number
}

/** Paints a red suit panel with web lines; returns [color, bump] canvases. */
function paintWeb(w: number, h: number, o: WebOpts) {
  const color = canvas(w, h)
  const bump = canvas(w, h)
  const c = color.ctx
  const b = bump.ctx

  // base colour with soft vertical shading + fabric noise
  const grad = c.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, SUIT.red)
  grad.addColorStop(1, '#b30f1b')
  c.fillStyle = grad
  c.fillRect(0, 0, w, h)
  b.fillStyle = '#808080'
  b.fillRect(0, 0, w, h)

  // fine fabric grain
  const rng = mulberry32(w * 7 + h)
  for (let i = 0; i < (w * h) / 40; i++) {
    const x = rng() * w
    const y = rng() * h
    c.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.05)'
    c.fillRect(x, y, 1.5, 1.5)
  }

  const lineW = Math.max(1.6, w / 420)
  const drawLines = (ctx: CanvasRenderingContext2D, stroke: string, width: number) => {
    ctx.strokeStyle = stroke
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    // radial (constant-u) lines
    for (let i = 0; i <= o.radial; i++) {
      const x = (i / o.radial) * w
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    // ring arcs between radials, bowing like a real web
    const start = o.ringStart ?? 0.04
    for (let r = 0; r < o.rings; r++) {
      const v = start + ((1 - start * 2) * (r + 0.5)) / o.rings
      const y = (1 - v) * h
      const sag = o.sag * (h / o.rings) * (o.sagUp ? -1 : 1)
      for (let i = 0; i < o.radial; i++) {
        const x0 = (i / o.radial) * w
        const x1 = ((i + 1) / o.radial) * w
        ctx.beginPath()
        ctx.moveTo(x0, y)
        ctx.quadraticCurveTo((x0 + x1) / 2, y + sag, x1, y)
        ctx.stroke()
      }
    }
  }

  // web lines only over red areas: draw everywhere, then repaint blue on top
  drawLines(c, SUIT.line, lineW)
  drawLines(b, '#ffffff', lineW * 1.6)

  if (o.blue) {
    for (let x = 0; x < w; x++) {
      if (!o.blue(x / w)) continue
      c.fillStyle = SUIT.blue
      c.fillRect(x, 0, 1, h)
      b.fillStyle = '#7a7a7a'
      b.fillRect(x, 0, 1, h)
    }
    // subtle rib texture on the blue panels
    c.fillStyle = 'rgba(255,255,255,0.035)'
    for (let x = 0; x < w; x++) {
      if (!o.blue(x / w)) continue
      for (let y = 0; y < h; y += 6) c.fillRect(x, y, 1, 1)
    }
  }

  if (o.emblem) drawEmblem(c, o.emblem.u * w, (1 - o.emblem.v) * h, o.emblem.size * h, w / h)
  return { color: color.c, bump: bump.c }
}

/** Classic chest spider, drawn with a horizontal squash to undo UV stretch. */
function drawEmblem(c: CanvasRenderingContext2D, cx: number, cy: number, size: number, squash: number) {
  c.save()
  c.translate(cx, cy)
  c.scale(1 / Math.max(1, squash * 0.62), 1)
  c.fillStyle = '#0b0b0f'
  c.strokeStyle = '#0b0b0f'
  c.lineCap = 'round'
  c.lineJoin = 'round'
  const s = size
  // body
  c.beginPath()
  c.ellipse(0, s * 0.18, s * 0.12, s * 0.22, 0, 0, Math.PI * 2)
  c.fill()
  c.beginPath()
  c.ellipse(0, -s * 0.12, s * 0.09, s * 0.11, 0, 0, Math.PI * 2)
  c.fill()
  c.beginPath()
  c.arc(0, -s * 0.27, s * 0.055, 0, Math.PI * 2)
  c.fill()
  // legs
  c.lineWidth = s * 0.045
  const legs: [number, number, number, number, number, number][] = [
    [0.06, -0.16, 0.3, -0.36, 0.34, -0.62],
    [0.08, -0.08, 0.38, -0.12, 0.5, -0.34],
    [0.08, 0.0, 0.38, 0.12, 0.5, 0.36],
    [0.06, 0.08, 0.3, 0.34, 0.36, 0.64],
  ]
  for (const side of [-1, 1]) {
    for (const [x0, y0, x1, y1, x2, y2] of legs) {
      c.beginPath()
      c.moveTo(side * x0 * s, y0 * s)
      c.lineTo(side * x1 * s, y1 * s)
      c.lineTo(side * x2 * s, y2 * s)
      c.stroke()
    }
  }
  c.restore()
}

export interface TexPair {
  map: Texture
  bump: Texture
}

const pairCache = new Map<string, TexPair>()
function pair(key: string, make: () => { color: HTMLCanvasElement; bump: HTMLCanvasElement }): TexPair {
  const hit = pairCache.get(key)
  if (hit) return hit
  const p = make()
  const out = { map: toTexture(p.color), bump: toTexture(p.bump, false) }
  pairCache.set(key, out)
  return out
}

// CapsuleGeometry / SphereGeometry UVs: u = 0 at -X, 0.25 at +Z (front), 0.5 at +X, 0.75 at back.
const sidePanel = (halfWidth: number) => (u: number) =>
  Math.abs(u - 0.5) < halfWidth || u < halfWidth || u > 1 - halfWidth

export function getSuitTextures() {
  return {
    /** Head sphere is rotated so its pole faces forward: radial lines fan out from the face. */
    head: pair('head', () => paintWeb(1024, 512, { radial: 22, rings: 11, sagUp: true, sag: 0.38, ringStart: 0.0 })),
    chest: pair('chest', () =>
      paintWeb(1024, 512, {
        radial: 26,
        rings: 7,
        sagUp: false,
        sag: 0.3,
        blue: sidePanel(0.085),
        emblem: { u: 0.25, v: 0.6, size: 0.42 },
      }),
    ),
    abs: pair('abs', () =>
      paintWeb(1024, 256, { radial: 26, rings: 3, sagUp: false, sag: 0.3, blue: sidePanel(0.12) }),
    ),
    limb: pair('limb', () => paintWeb(512, 512, { radial: 12, rings: 8, sagUp: false, sag: 0.3 })),
    blue: pair('blue', () => paintBlue(512, 512)),
  }
}

function paintBlue(w: number, h: number) {
  const color = canvas(w, h)
  const bump = canvas(w, h)
  const c = color.ctx
  const grad = c.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, SUIT.blue)
  grad.addColorStop(1, SUIT.blueDeep)
  c.fillStyle = grad
  c.fillRect(0, 0, w, h)
  bump.ctx.fillStyle = '#808080'
  bump.ctx.fillRect(0, 0, w, h)
  // diagonal knit
  for (let y = 0; y < h; y += 4) {
    c.fillStyle = 'rgba(255,255,255,0.04)'
    c.fillRect(0, y, w, 1)
    bump.ctx.fillStyle = '#909090'
    bump.ctx.fillRect(0, y, w, 1)
  }
  return { color: color.c, bump: bump.c }
}

/** Soft round sprite for particles / glows. */
export function getSoftDot(): Texture {
  return cached('dot', () => {
    const { c, ctx } = canvas(128, 128)
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.65)')
    g.addColorStop(0.6, 'rgba(255,255,255,0.12)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return toTexture(c, false)
  })
}

/** Wispy fog card texture (fractal value noise, alpha only). */
export function getFogTexture(): Texture {
  return cached('fog', () => {
    const size = 256
    const { c, ctx } = canvas(size, size)
    const img = ctx.createImageData(size, size)
    const rng = mulberry32(42)
    const grid = (n: number) => {
      const g: number[] = []
      for (let i = 0; i < (n + 1) * (n + 1); i++) g.push(rng())
      return (x: number, y: number) => {
        const gx = x * n
        const gy = y * n
        const x0 = Math.floor(gx)
        const y0 = Math.floor(gy)
        const fx = gx - x0
        const fy = gy - y0
        const sx = fx * fx * (3 - 2 * fx)
        const sy = fy * fy * (3 - 2 * fy)
        const at = (i: number, j: number) => g[(j % n) * (n + 1) + (i % n)]
        const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx
        const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx
        return a + (b - a) * sy
      }
    }
    const octaves = [grid(4), grid(8), grid(16), grid(32)]
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size
        const v = y / size
        let n = 0
        let amp = 0.55
        for (const o of octaves) {
          n += o(u, v) * amp
          amp *= 0.5
        }
        const dx = u - 0.5
        const dy = v - 0.5
        const falloff = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2)
        const a = Math.max(0, n - 0.35) * 1.8 * falloff * falloff
        const i = (y * size + x) * 4
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255
        img.data[i + 3] = Math.min(255, a * 255)
      }
    }
    ctx.putImageData(img, 0, 0)
    return toTexture(c, false)
  })
}

/** Weathered wooden staves for the rooftop water tower. */
export function getWoodTexture(): Texture {
  return cached('wood', () => {
    const { c, ctx } = canvas(512, 256)
    ctx.fillStyle = '#3b2a20'
    ctx.fillRect(0, 0, 512, 256)
    const rng = mulberry32(7)
    for (let x = 0; x < 512; x += 16) {
      const shade = 40 + rng() * 25
      ctx.fillStyle = `rgb(${shade + 22},${shade + 6},${shade - 6})`
      ctx.fillRect(x, 0, 15, 256)
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(x + 15, 0, 1, 256)
    }
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rng() * 0.15})`
      ctx.fillRect(rng() * 512, rng() * 256, 1, 4 + rng() * 20)
    }
    return toTexture(c, true, true)
  })
}

/** Concrete roof with tar seams. */
export function getRoofTexture(): Texture {
  return cached('roof', () => {
    const { c, ctx } = canvas(512, 512)
    ctx.fillStyle = '#2a2d34'
    ctx.fillRect(0, 0, 512, 512)
    const rng = mulberry32(11)
    for (let i = 0; i < 9000; i++) {
      const v = 30 + rng() * 30
      ctx.fillStyle = `rgba(${v},${v + 2},${v + 8},0.35)`
      ctx.fillRect(rng() * 512, rng() * 512, 2, 2)
    }
    ctx.strokeStyle = 'rgba(8,8,10,0.55)'
    ctx.lineWidth = 2
    for (let i = 0; i <= 512; i += 128) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 512)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(512, i)
      ctx.stroke()
    }
    return toTexture(c, true, true)
  })
}
