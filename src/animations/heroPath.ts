import { Matrix4, Quaternion, Vector3 } from 'three'
import type { PoseName } from './poses'

/**
 * Spider-Man's arrival, authored as pendulum arcs joined by smooth Hermite
 * flights. Everything is a pure function of time so GSAP can scrub it, skip it
 * or replay it deterministically.
 */

export const HERO_SCALE = 1.3
/** Hips height (stand pose) in world units — the point the body rotates around in flight. */
export const PIVOT_HEIGHT = 1.0 * HERO_SCALE
const GRAVITY = -30

const LANDING = new Vector3(0, 64, -171)

// ── authoring helpers ─────────────────────────────────────────────

interface ArcSeg {
  kind: 'arc'
  t0: number
  t1: number
  anchor: Vector3
  d0: Vector3
  d1: Vector3
  l0: number
  l1: number
  /** 'pendulum': slow ends, fast bottom. 'drop': starts at rest, fastest at the end. */
  ease: 'pendulum' | 'drop'
  k: number
}

interface HermiteSeg {
  kind: 'hermite'
  t0: number
  t1: number
  p0: Vector3
  v0: Vector3
  p1: Vector3
  v1: Vector3
}

/** Gravity arc, nudged so it touches down exactly on `target`. */
interface BallisticSeg {
  kind: 'ballistic'
  t0: number
  t1: number
  p0: Vector3
  v0: Vector3
  correction: Vector3
}

type Segment = ArcSeg | HermiteSeg | BallisticSeg

const tmpB = new Vector3()

function slerpUnit(a: Vector3, b: Vector3, t: number, out: Vector3) {
  const d = Math.min(1, Math.max(-1, a.dot(b)))
  const omega = Math.acos(d)
  if (omega < 1e-5) return out.copy(a)
  const s = Math.sin(omega)
  const wa = Math.sin((1 - t) * omega) / s
  const wb = Math.sin(t * omega) / s
  return out.set(a.x * wa + b.x * wb, a.y * wa + b.y * wb, a.z * wa + b.z * wb)
}

function arcParam(seg: ArcSeg, tau: number) {
  if (seg.ease === 'drop') return 1 - Math.cos((tau * Math.PI) / 2)
  return tau - (seg.k * Math.sin(2 * Math.PI * tau)) / (2 * Math.PI)
}

function arcAt(seg: ArcSeg, u: number, out: Vector3) {
  slerpUnit(seg.d0, seg.d1, u, out)
  return out.multiplyScalar(seg.l0 + (seg.l1 - seg.l0) * u).add(seg.anchor)
}

function evalSeg(seg: Segment, t: number, out: Vector3) {
  const T = seg.t1 - seg.t0
  const tau = Math.min(1, Math.max(0, (t - seg.t0) / T))
  if (seg.kind === 'arc') return arcAt(seg, arcParam(seg, tau), out)
  if (seg.kind === 'ballistic') {
    const dt = tau * T
    const c = tau * tau * (3 - 2 * tau)
    return out
      .copy(seg.p0)
      .addScaledVector(seg.v0, dt)
      .add(tmpB.set(0, 0.5 * GRAVITY * dt * dt, 0))
      .addScaledVector(seg.correction, c)
  }
  const s = tau
  const s2 = s * s
  const s3 = s2 * s
  const h00 = 2 * s3 - 3 * s2 + 1
  const h10 = s3 - 2 * s2 + s
  const h01 = -2 * s3 + 3 * s2
  const h11 = s3 - s2
  return out
    .copy(seg.p0)
    .multiplyScalar(h00)
    .addScaledVector(seg.v0, h10 * T)
    .addScaledVector(seg.p1, h01)
    .addScaledVector(seg.v1, h11 * T)
}

const tmpC = new Vector3()
function velocityOf(seg: Segment, t: number, out: Vector3) {
  const e = 1e-3
  const a = Math.max(seg.t0, t - e)
  const b = Math.min(seg.t1, t + e)
  evalSeg(seg, a, tmpC)
  evalSeg(seg, b, out)
  return out.sub(tmpC).divideScalar(b - a)
}

/** Direction of travel along an arc, valid even where the speed is zero. */
function arcTangent(seg: ArcSeg, t: number, out: Vector3) {
  const tau = Math.min(1, Math.max(0, (t - seg.t0) / (seg.t1 - seg.t0)))
  const u = arcParam(seg, tau)
  const e = 1e-3
  arcAt(seg, Math.min(1, u + e), out)
  arcAt(seg, Math.max(0, u - e), tmpC)
  return out.sub(tmpC)
}

function arc(t0: number, t1: number, anchor: Vector3, from: Vector3, to: Vector3, ease: ArcSeg['ease'], k = 0.5): ArcSeg {
  const d0 = from.clone().sub(anchor)
  const d1 = to.clone().sub(anchor)
  return { kind: 'arc', t0, t1, anchor, l0: d0.length(), l1: d1.length(), d0: d0.normalize(), d1: d1.normalize(), ease, k }
}

// ── the choreography ──────────────────────────────────────────────

export const PATH_TIMES = {
  shoot1: 0,
  swing1: 0.35,
  release1: 3.15,
  shoot2: 3.2,
  swing2: 3.45,
  release2: 4.85,
  land: 6.05,
}

// Swing 1: in from the upper right, down across the avenue and back up.
const A1 = new Vector3(6, 128, -100)
const E1 = new Vector3(3.5, 93.5, -127)
const S1 = A1.clone().add(new Vector3(14, -30, 30).setLength(E1.distanceTo(A1)))
const swing1 = arc(PATH_TIMES.swing1, PATH_TIMES.release1, A1, S1, E1, 'pendulum', 0.5)

// Short hop to the apex where the second web catches him.
const S2 = new Vector3(2, 96, -131)
const vE1 = velocityOf(swing1, PATH_TIMES.release1 - 1e-3, new Vector3())
const fly1: HermiteSeg = {
  kind: 'hermite',
  t0: PATH_TIMES.release1,
  t1: PATH_TIMES.swing2,
  p0: E1,
  v0: vE1,
  p1: S2,
  v1: new Vector3(0, -1, -3),
}

// Swing 2: drop into a short, fast arc and let go at the bottom.
const R = new Vector3(1, 88, -146)
const L2 = S2.distanceToSquared(R) / (2 * (S2.y - R.y))
const A2 = R.clone().add(new Vector3(0, L2, 0))
const swing2 = arc(PATH_TIMES.swing2, PATH_TIMES.release2, A2, S2, R, 'drop')

// Release → soaring flip → rooftop.
const pivotLanding = LANDING.clone().add(new Vector3(0, PIVOT_HEIGHT, 0))
const vR = velocityOf(swing2, PATH_TIMES.release2 - 1e-3, new Vector3())
const flightT = PATH_TIMES.land - PATH_TIMES.release2
const ballisticEnd = R.clone().addScaledVector(vR, flightT).add(new Vector3(0, 0.5 * GRAVITY * flightT * flightT, 0))
const finalFlight: BallisticSeg = {
  kind: 'ballistic',
  t0: PATH_TIMES.release2,
  t1: PATH_TIMES.land,
  p0: R,
  v0: vR,
  correction: pivotLanding.clone().sub(ballisticEnd),
}

const SEGMENTS: Segment[] = [swing1, fly1, swing2, finalFlight]

export const ANCHORS = { web1: A1, web2: A2 }
export const PATH_DEBUG = { S1, E1, S2, R, vR, correction: finalFlight.correction }

// ── evaluation ────────────────────────────────────────────────────

export interface StrandState {
  visible: boolean
  attached: boolean
  /** 0..1 how far the strand has shot from the hand toward the anchor. */
  extend: number
  anchor: Vector3
  /** Free end of a released strand. */
  loose: Vector3
  opacity: number
}

export interface PathState {
  pivot: Vector3
  root: Vector3
  quaternion: Quaternion
  velocity: Vector3
  weights: Record<PoseName, number>
  strands: [StrandState, StrandState]
  landed: boolean
  /** Seconds since touchdown (negative before). */
  sinceLanding: number
}

export function createPathState(): PathState {
  const strand = (): StrandState => ({
    visible: false,
    attached: false,
    extend: 0,
    anchor: new Vector3(),
    loose: new Vector3(),
    opacity: 0,
  })
  return {
    pivot: new Vector3(),
    root: new Vector3(),
    quaternion: new Quaternion(),
    velocity: new Vector3(),
    weights: { stand: 0, swing: 0, soar: 0, tuck: 0, land: 0, crouch: 0, perch: 0 },
    strands: [strand(), strand()],
    landed: false,
    sinceLanding: -1,
  }
}

const UP = new Vector3(0, 1, 0)
const m4 = new Matrix4()
const vx = new Vector3()
const vy = new Vector3()
const vz = new Vector3()
const qa = new Quaternion()
const qb = new Quaternion()
const qFlip = new Quaternion()
const X_AXIS = new Vector3(1, 0, 0)

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function basisFrom(up: Vector3, forward: Vector3, out: Quaternion) {
  vy.copy(up).normalize()
  vz.copy(forward).addScaledVector(vy, -forward.dot(vy))
  if (vz.lengthSq() < 1e-6) vz.set(0, 0, -1).addScaledVector(vy, vy.z)
  vz.normalize()
  vx.crossVectors(vy, vz)
  m4.makeBasis(vx, vy, vz)
  return out.setFromRotationMatrix(m4)
}

const tanV = new Vector3()
const upV = new Vector3()
function orientationOnSwing(seg: ArcSeg, t: number, out: Quaternion) {
  evalSeg(seg, t, upV)
  upV.multiplyScalar(-1).add(seg.anchor)
  arcTangent(seg, t, tanV)
  return basisFrom(upV, tanV, out)
}

function setWeights(w: Record<PoseName, number>, entries: Partial<Record<PoseName, number>>) {
  for (const k in w) w[k as PoseName] = 0
  for (const k in entries) w[k as PoseName] = entries[k as PoseName] ?? 0
}

const releaseHeading = (() => {
  const v = arcTangent(swing2, PATH_TIMES.release2 - 1e-3, new Vector3())
  return Math.atan2(v.x, v.z)
})()
const qYaw = new Quaternion()
const Y_AXIS = new Vector3(0, 1, 0)

export function evaluatePath(t: number, s: PathState): PathState {
  const T = PATH_TIMES
  const [w1, w2] = s.strands

  // position
  let seg: Segment = SEGMENTS[0]
  for (const candidate of SEGMENTS) if (t >= candidate.t0) seg = candidate
  if (t >= T.land) s.pivot.copy(pivotLanding)
  else evalSeg(seg, Math.max(t, T.swing1), s.pivot)
  if (t < T.land) velocityOf(seg, Math.max(t, T.swing1), s.velocity)
  else s.velocity.set(0, 0, 0)

  // orientation + pose weights
  if (t < T.release1) {
    orientationOnSwing(swing1, Math.max(t, T.swing1), s.quaternion)
    setWeights(s.weights, { swing: 1 })
  } else if (t < T.swing2) {
    const k = smooth(T.release1, T.swing2, t)
    orientationOnSwing(swing1, T.release1 - 1e-3, qa)
    orientationOnSwing(swing2, T.swing2 + 1e-3, qb)
    s.quaternion.slerpQuaternions(qa, qb, k)
    const soar = Math.sin(Math.PI * k)
    setWeights(s.weights, { swing: 1 - soar, soar })
  } else if (t < T.release2) {
    orientationOnSwing(swing2, t, s.quaternion)
    setWeights(s.weights, { swing: 1 })
  } else if (t < T.land) {
    const f = (t - T.release2) / (T.land - T.release2)
    // Half-twist from travel heading to face the camera while flipping forward.
    qYaw.setFromAxisAngle(Y_AXIS, releaseHeading * (1 - smooth(0.08, 0.85, f)))
    qFlip.setFromAxisAngle(X_AXIS, smooth(0.12, 0.78, f) * Math.PI * 2)
    s.quaternion.copy(qYaw).multiply(qFlip)
    const toSoar = smooth(0, 0.12, f)
    const toTuck = smooth(0.12, 0.3, f) * (1 - smooth(0.62, 0.82, f))
    const toLand = smooth(0.62, 0.82, f)
    setWeights(s.weights, {
      swing: (1 - toSoar) * (1 - toTuck) * (1 - toLand),
      soar: toSoar * (1 - toTuck) * (1 - toLand),
      tuck: toTuck,
      land: toLand,
    })
  } else {
    s.quaternion.identity()
    const c = smooth(T.land, T.land + 0.12, t)
    setWeights(s.weights, { land: 1 - c, crouch: c })
  }

  s.landed = t >= T.land
  s.sinceLanding = t - T.land

  // root (feet) from pivot (hips) through the current orientation
  vy.copy(UP).applyQuaternion(s.quaternion).multiplyScalar(PIVOT_HEIGHT)
  s.root.copy(s.pivot).sub(vy)

  // web strands
  updateStrand(w1, t, T.shoot1, T.swing1, T.release1, swing1.anchor)
  updateStrand(w2, t, T.shoot2, T.swing2, T.release2, swing2.anchor)
  return s
}

function updateStrand(w: StrandState, t: number, shoot: number, attach: number, release: number, anchor: Vector3) {
  w.anchor.copy(anchor)
  const fadeTime = 0.7
  if (t < shoot || t > release + fadeTime) {
    w.visible = false
    w.opacity = 0
    return
  }
  w.visible = true
  if (t < release) {
    w.attached = true
    w.extend = smooth(shoot, attach, t)
    w.opacity = 1
  } else {
    w.attached = false
    w.extend = 1
    const age = t - release
    // Slack strand: the loose end keeps a little momentum then drops.
    const seg = t < PATH_TIMES.swing2 ? swing1 : swing2
    evalSeg(seg, release, w.loose)
    w.loose.y += 2.2 + 0.5 * GRAVITY * 0.35 * age * age
    w.opacity = 1 - smooth(0, fadeTime, age)
  }
}
