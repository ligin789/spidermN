import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  CapsuleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  MathUtils,
  MeshStandardMaterial,
  PointLight,
  Quaternion,
  Shape,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { makePoseWeights, rig } from '../animations/rig'
import { HERO_SCALE, evaluatePath } from '../animations/heroPath'
import { JOINTS, POSES, POSE_NAMES, WAVE_ARM, type Joint, type PoseName } from '../animations/poses'
import { getSuitTextures } from '../three/textures'
import { useExperience } from '../state/store'

/**
 * Original, procedurally-built web-slinger: capsule anatomy on a 16-joint rig,
 * painted suit textures with raised web lines, and glossy lens eyes.
 * Driven entirely from `rig.hero` inside useFrame (no React re-renders).
 */

const Y_AXIS = new Vector3(0, 1, 0)
const tmp = new Vector3()
const tmp2 = new Vector3()
const qYaw = new Quaternion()

function eyeShape() {
  const s = new Shape()
  s.moveTo(-0.032, -0.004)
  s.bezierCurveTo(-0.016, 0.022, 0.018, 0.04, 0.038, 0.03)
  s.bezierCurveTo(0.052, 0.02, 0.048, -0.016, 0.032, -0.026)
  s.bezierCurveTo(0.012, -0.036, -0.018, -0.026, -0.032, -0.004)
  return s
}

function useHeroAssets() {
  return useMemo(() => {
    const tex = getSuitTextures()
    const suit = (pair: { map: MeshStandardMaterial['map']; bump: MeshStandardMaterial['bumpMap'] }, rough = 0.48) =>
      new MeshStandardMaterial({
        map: pair.map,
        bumpMap: pair.bump,
        bumpScale: 2.2,
        roughness: rough,
        metalness: 0.08,
        envMapIntensity: 0.9,
      })
    const materials = {
      head: suit(tex.head, 0.42),
      chest: suit(tex.chest),
      abs: suit(tex.abs),
      red: suit(tex.limb),
      blue: suit(tex.blue, 0.55),
      lens: new MeshStandardMaterial({
        color: '#eef3fb',
        emissive: '#a9c8ff',
        emissiveIntensity: 0.55,
        roughness: 0.12,
        metalness: 0.25,
      }),
      lensRim: new MeshStandardMaterial({ color: '#060608', roughness: 0.35, metalness: 0.4 }),
    }

    const head = new SphereGeometry(0.118, 40, 28)
    head.rotateX(Math.PI / 2) // pole faces forward → web lines fan out from the face
    const eye = new ExtrudeGeometry(eyeShape(), {
      depth: 0.004,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.002,
      bevelSegments: 2,
      curveSegments: 14,
    })
    const eyeRim = eye.clone()
    eyeRim.scale(1.3, 1.36, 1)
    eyeRim.translate(0.002, 0, -0.004)

    const geometries = {
      head,
      eye,
      eyeRim,
      neck: new CylinderGeometry(0.058, 0.068, 0.12, 16),
      chest: new CapsuleGeometry(0.165, 0.12, 8, 24),
      abs: new CapsuleGeometry(0.132, 0.08, 8, 24),
      pelvis: new SphereGeometry(0.15, 24, 16),
      deltoid: new SphereGeometry(0.08, 18, 12),
      joint: new SphereGeometry(1, 16, 10),
      upperArm: new CapsuleGeometry(0.058, 0.19, 6, 16),
      forearm: new CapsuleGeometry(0.05, 0.17, 6, 16),
      hand: new RoundedBoxGeometry(0.085, 0.105, 0.062, 3, 0.025),
      thigh: new CapsuleGeometry(0.088, 0.28, 6, 18),
      shin: new CapsuleGeometry(0.064, 0.29, 6, 16),
      foot: new RoundedBoxGeometry(0.105, 0.078, 0.25, 3, 0.032),
    }
    return { materials, geometries }
  }, [])
}

interface LabProps {
  /** Dev pose lab: render a fixed pose instead of following the rig. */
  lab?: { pose: PoseName; position: [number, number, number]; yaw?: number; wave?: number }
}

const labWeights = makePoseWeights()

export function HeroCharacter({ lab }: LabProps = {}) {
  const quality = useExperience((s) => s.quality)
  const shadows = quality === 'high'
  const { materials: m, geometries: g } = useHeroAssets()

  const root = useRef<Group>(null)
  const joints = useRef({} as Record<Joint, Group>)
  const handR = useRef<Group>(null)
  const redLight = useRef<PointLight>(null)
  const blueLight = useRef<PointLight>(null)
  const j = (name: Joint) => (el: Group | null) => {
    if (el) joints.current[name] = el
  }

  useEffect(
    () => () => {
      Object.values(g).forEach((geo: BufferGeometry) => geo.dispose())
      Object.values(m).forEach((mat: Material) => mat.dispose())
    },
    [g, m],
  )

  useFrame((state) => {
    const group = root.current
    if (!group) return
    const hero = lab
      ? { ...rig.hero, usePath: false, visible: true, wave: lab.wave ?? 0, headLook: 0, impact: 0, hop: 0 }
      : rig.hero
    if (lab) {
      for (const k in labWeights) labWeights[k as PoseName] = k === lab.pose ? 1 : 0
      hero.weights = labWeights
      hero.pos = new Vector3(...lab.position)
      hero.yaw = lab.yaw ?? 0
    }
    group.visible = hero.visible
    if (!hero.visible) return

    const t = state.clock.elapsedTime
    const J = joints.current
    let weights = hero.weights
    let impact = hero.impact

    if (hero.usePath) {
      const p = evaluatePath(hero.pathT, hero.path)
      group.position.copy(p.root)
      group.quaternion.copy(p.quaternion)
      weights = p.weights
      if (p.landed) impact = Math.max(impact, 1 - Math.min(1, p.sinceLanding / 0.45))
    } else {
      group.position.copy(hero.pos)
      group.position.y += hero.hop
      qYaw.setFromAxisAngle(Y_AXIS, hero.yaw)
      group.quaternion.copy(qYaw)
    }

    // ── blend poses ──
    let total = 0
    for (const name of POSE_NAMES) total += weights[name]
    if (total < 1e-4) total = 1
    let hipsY = 0
    for (const name of POSE_NAMES) hipsY += (POSES[name].hipsY * weights[name]) / total
    for (const joint of JOINTS) {
      let x = 0
      let y = 0
      let z = 0
      for (const name of POSE_NAMES) {
        const w = weights[name]
        if (w <= 0) continue
        const r = POSES[name].r[joint]
        if (!r) continue
        x += r[0] * w
        y += r[1] * w
        z += r[2] * w
      }
      J[joint].rotation.set(x / total, y / total, z / total)
    }

    // ── additive layers ──
    J.hips.position.y = hipsY - impact * 0.09
    J.spine.rotation.x += impact * 0.12
    const calm = hero.usePath ? (hero.path.landed ? 1 : 0) : 1
    J.chest.rotation.x += Math.sin(t * 1.7) * 0.018 * calm
    J.head.rotation.z += Math.sin(t * 0.6) * 0.02 * calm

    if (hero.wave > 0) {
      const w = hero.wave
      for (const joint of ['shoulderR', 'elbowR', 'wristR'] as const) {
        const target = WAVE_ARM[joint]!
        const r = J[joint].rotation
        r.set(
          MathUtils.lerp(r.x, target[0], w),
          MathUtils.lerp(r.y, target[1], w),
          MathUtils.lerp(r.z, target[2], w),
        )
      }
      J.elbowR.rotation.z += Math.sin(t * 9) * 0.32 * w
      J.wristR.rotation.z += Math.sin(t * 9 - 0.6) * 0.18 * w
      J.chest.rotation.z += 0.05 * w
    }

    group.updateMatrixWorld(true)

    // Head tracks the camera (turning toward the viewer).
    if (hero.headLook > 0) {
      const head = J.head
      const parent = head.parent!
      tmp.copy(state.camera.position)
      parent.worldToLocal(tmp)
      tmp.sub(head.position)
      const yaw = MathUtils.clamp(Math.atan2(tmp.x, tmp.z), -1.1, 1.1)
      const pitch = MathUtils.clamp(Math.atan2(tmp.y - 0.12, Math.hypot(tmp.x, tmp.z)), -0.9, 0.9)
      head.rotation.y = MathUtils.lerp(head.rotation.y, yaw, hero.headLook)
      head.rotation.x = MathUtils.lerp(head.rotation.x, -pitch, hero.headLook)
      head.updateMatrixWorld(true)
    }

    if (lab) return

    // Publish world-space anchors for the web strands, camera and lights.
    hero.worldPos.copy(group.position)
    J.hips.getWorldPosition(hero.pivot)
    handR.current?.getWorldPosition(hero.handR)
    J.head.getWorldPosition(hero.head)

    // Red / blue rim lights sit behind the hero relative to the camera.
    tmp.subVectors(hero.pivot, state.camera.position).setY(0).normalize()
    tmp2.crossVectors(tmp, Y_AXIS).normalize()
    const rim = rig.lights.rim
    if (redLight.current) {
      redLight.current.position.copy(hero.pivot).addScaledVector(tmp, 2.2).addScaledVector(tmp2, -2.4).add(Y_AXIS)
      redLight.current.intensity = 26 * rim
    }
    if (blueLight.current) {
      blueLight.current.position.copy(hero.pivot).addScaledVector(tmp, 2.2).addScaledVector(tmp2, 2.4).add(Y_AXIS)
      blueLight.current.intensity = 30 * rim
    }
  }, -2)

  const limb = (props: { geometry: BufferGeometry; material: Material; position: [number, number, number] }) => (
    <mesh castShadow={shadows} {...props} />
  )

  const arm = (side: 1 | -1) => {
    const L = side === 1
    return (
      <group ref={j(L ? 'shoulderL' : 'shoulderR')} position={[0.215 * side, 0.22, 0]}>
        {limb({ geometry: g.deltoid, material: m.red, position: [0, -0.01, 0] })}
        {limb({ geometry: g.upperArm, material: m.blue, position: [0, -0.145, 0] })}
        <group ref={j(L ? 'elbowL' : 'elbowR')} position={[0, -0.29, 0]}>
          <mesh castShadow={shadows} geometry={g.joint} material={m.red} scale={0.054} />
          {limb({ geometry: g.forearm, material: m.red, position: [0, -0.125, 0] })}
          <group ref={L ? j('wristL') : (el) => { j('wristR')(el); handR.current = el }} position={[0, -0.26, 0]}>
            {limb({ geometry: g.hand, material: m.red, position: [0, -0.045, 0] })}
          </group>
        </group>
      </group>
    )
  }

  const leg = (side: 1 | -1) => {
    const L = side === 1
    return (
      <group ref={j(L ? 'hipL' : 'hipR')} position={[0.095 * side, -0.06, 0]}>
        {limb({ geometry: g.thigh, material: m.blue, position: [0, -0.21, 0] })}
        <group ref={j(L ? 'kneeL' : 'kneeR')} position={[0, -0.44, 0]}>
          <mesh castShadow={shadows} geometry={g.joint} material={m.red} scale={0.07} />
          {limb({ geometry: g.shin, material: m.red, position: [0, -0.2, 0] })}
          <group ref={j(L ? 'ankleL' : 'ankleR')} position={[0, -0.42, 0]}>
            {limb({ geometry: g.foot, material: m.red, position: [0, -0.04, 0.06] })}
          </group>
        </group>
      </group>
    )
  }

  const eye = (side: 1 | -1) => (
    <group position={[0.045 * side, 0.135, 0.104]} rotation={[-0.14, 0.42 * side, 0.08 * side]} scale={[side, 1, 1]}>
      <mesh geometry={g.eyeRim} material={m.lensRim} />
      <mesh geometry={g.eye} material={m.lens} position={[0, 0, 0.002]} />
    </group>
  )

  return (
    <>
    <group ref={root} scale={HERO_SCALE} visible={false}>
      <group ref={j('hips')} position={[0, 1, 0]}>
        <mesh castShadow={shadows} geometry={g.pelvis} material={m.red} scale={[1.12, 0.8, 0.86]} />
        <group ref={j('spine')} position={[0, 0.08, 0]}>
          <mesh castShadow={shadows} geometry={g.abs} material={m.abs} position={[0, 0.11, 0]} scale={[1.04, 1, 0.8]} />
          <group ref={j('chest')} position={[0, 0.2, 0]}>
            <mesh castShadow={shadows} geometry={g.chest} material={m.chest} position={[0, 0.12, 0]} scale={[1.24, 1, 0.82]} />
            <mesh castShadow={shadows} geometry={g.neck} material={m.red} position={[0, 0.3, 0]} />
            <group ref={j('head')} position={[0, 0.3, 0]} rotation-order="YXZ">
              <mesh castShadow={shadows} geometry={g.head} material={m.head} position={[0, 0.118, 0.004]} scale={[0.93, 1.12, 1]} />
              {eye(1)}
              {eye(-1)}
            </group>
            {arm(1)}
            {arm(-1)}
          </group>
        </group>
        {leg(1)}
        {leg(-1)}
      </group>
    </group>
    <pointLight ref={redLight} color="#ff2236" intensity={0} distance={9} decay={1.6} />
    <pointLight ref={blueLight} color="#2f6bff" intensity={0} distance={9} decay={1.6} />
    </>
  )
}
