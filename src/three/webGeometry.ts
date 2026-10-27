import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  LineCurve3,
  QuadraticBezierCurve3,
  TubeGeometry,
  Vector3,
  type Curve,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32 } from '../utils/random'

function tube(curve: Curve<Vector3>, segments: number, radius: number, reveal: (t: number) => number) {
  const g = new TubeGeometry(curve, segments, radius, 4, false)
  // TubeGeometry lays out (segments + 1) rings of (radial + 1) vertices
  const count = g.getAttribute('position').count
  const perRing = count / (segments + 1)
  const data = new Float32Array(count)
  for (let i = 0; i < count; i++) data[i] = reveal(Math.floor(i / perRing) / segments)
  g.setAttribute('aReveal', new Float32BufferAttribute(data, 1))
  g.deleteAttribute('uv')
  return g
}

export interface RadialWebOptions {
  spokes: number
  rings: number
  radius: number
  thickness: number
  /** Angular extent (radians); 2π for a full web. */
  arc?: number
  startAngle?: number
  seed?: number
}

/**
 * Orb-weaver web in the XY plane: straight spokes plus sagging spiral arcs,
 * merged into one geometry. `aReveal` (0..1) lets a shader grow it outward.
 */
export function buildRadialWeb(o: RadialWebOptions): BufferGeometry {
  const rng = mulberry32(o.seed ?? 3)
  const arc = o.arc ?? Math.PI * 2
  const full = arc >= Math.PI * 2 - 1e-3
  const n = o.spokes
  const start = o.startAngle ?? 0
  const dirs: Vector3[] = []
  const lens: number[] = []
  for (let i = 0; i < n; i++) {
    const a = start + (arc * (i + (full ? rng() * 0.35 : 0))) / (full ? n : n - 1)
    dirs.push(new Vector3(Math.cos(a), Math.sin(a), 0))
    lens.push(o.radius * (0.9 + rng() * 0.18))
  }
  const parts: BufferGeometry[] = []
  const hub = o.radius * 0.06
  dirs.forEach((d, i) => {
    const a = d.clone().multiplyScalar(hub)
    const b = d.clone().multiplyScalar(lens[i])
    parts.push(tube(new LineCurve3(a, b), 6, o.thickness, (t) => t * 0.55))
  })
  const pairs = full ? n : n - 1
  for (let r = 0; r < o.rings; r++) {
    const f = Math.pow((r + 1) / (o.rings + 0.6), 1.08)
    for (let i = 0; i < pairs; i++) {
      const j = (i + 1) % n
      const p0 = dirs[i].clone().multiplyScalar(lens[i] * f)
      const p1 = dirs[j].clone().multiplyScalar(lens[j] * f)
      const mid = p0.clone().add(p1).multiplyScalar(0.5)
      const ctrl = mid.multiplyScalar(0.86 + rng() * 0.05)
      const reveal = 0.22 + 0.78 * f
      parts.push(tube(new QuadraticBezierCurve3(p0, ctrl, p1), 6, o.thickness * 0.75, (t) => reveal + t * 0.03))
    }
  }
  // tiny hub spiral
  const hubPts: Vector3[] = []
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI * 4
    const rr = hub * (0.4 + (k / 24) * 0.9)
    hubPts.push(new Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 0))
  }
  parts.push(tube(new CatmullRomCurve3(hubPts), 24, o.thickness * 0.6, () => 0))
  const merged = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  return merged
}

/** A sagging strand between two points (catenary-ish), as a tube. */
export function buildStrand(a: Vector3, b: Vector3, sag: number, thickness: number): BufferGeometry {
  const mid = a.clone().lerp(b, 0.5)
  mid.y -= sag
  const curve = new CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).setY(a.y - sag * 0.75), mid, b.clone().lerp(mid, 0.5).setY(b.y - sag * 0.75), b])
  return tube(curve, 32, thickness, (t) => t)
}
