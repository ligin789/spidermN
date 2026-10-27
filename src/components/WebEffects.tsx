import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  ShaderMaterial,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { rig, WORLD } from '../animations/rig'
import { buildRadialWeb, buildStrand } from '../three/webGeometry'
import type { StrandState } from '../animations/heroPath'

const Y = new Vector3(0, 1, 0)
const tmp = new Vector3()
const tmp2 = new Vector3()

export function createWebMaterial(opts: { additive?: boolean } = {}) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    ...(opts.additive ? { blending: AdditiveBlending } : {}),
    uniforms: {
      uProgress: { value: 1.2 },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uGlow: { value: 0.4 },
    },
    vertexShader: /* glsl */ `
      attribute float aReveal;
      varying float vReveal;
      varying vec3 vNormalV;
      varying vec3 vViewPos;
      void main() {
        vReveal = aReveal;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = mv.xyz;
        vNormalV = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uProgress;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uGlow;
      varying float vReveal;
      varying vec3 vNormalV;
      varying vec3 vViewPos;
      void main() {
        if (vReveal > uProgress) discard;
        float front = smoothstep(uProgress - 0.09, uProgress, vReveal);
        vec3 n = normalize(vNormalV);
        vec3 v = normalize(-vViewPos);
        float facing = abs(dot(n, v));
        float fres = pow(1.0 - facing, 2.0);
        float spec = pow(facing, 24.0);
        vec3 silver = vec3(0.78, 0.84, 0.98);
        vec3 red = vec3(1.0, 0.07, 0.12);
        float shimmer = 0.5 + 0.5 * sin(vReveal * 46.0 - uTime * 3.2);
        vec3 col = silver * (0.32 + 0.38 * facing) + vec3(1.4) * spec * 0.5;
        col += red * fres * 1.1;
        col += red * front * 2.6;
        col += silver * shimmer * 0.3 * uGlow;
        col *= 0.55 + uGlow * 0.6;
        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  })
}

/** A straight glowing web strand between two points. */
function useStrandMesh() {
  return useMemo(() => {
    const geo = new CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0)
    const mat = new MeshBasicMaterial({ color: new Color(1.35, 1.42, 1.6), transparent: true, depthWrite: false })
    return { geo, mat }
  }, [])
}

function placeStrand(mesh: Mesh, from: Vector3, to: Vector3, radius: number) {
  tmp.subVectors(to, from)
  const len = tmp.length()
  if (len < 1e-4) {
    mesh.visible = false
    return
  }
  mesh.visible = true
  mesh.position.copy(from)
  mesh.quaternion.setFromUnitVectors(Y, tmp.divideScalar(len))
  mesh.scale.set(radius, len, radius)
}

/** The two swing lines that attach Spider-Man's hand to the skyline. */
export function SwingStrands() {
  const a = useStrandMesh()
  const b = useStrandMesh()
  const m1 = useRef<Mesh>(null)
  const m2 = useRef<Mesh>(null)
  useEffect(() => () => [a, b].forEach((s) => (s.geo.dispose(), s.mat.dispose())), [a, b])

  useFrame(() => {
    const strands = rig.hero.path.strands
    const drive = (mesh: Mesh | null, s: StrandState, mat: MeshBasicMaterial) => {
      if (!mesh) return
      if (!rig.hero.visible || !rig.hero.usePath || !s.visible) {
        mesh.visible = false
        return
      }
      if (s.attached) {
        tmp2.copy(rig.hero.handR).lerp(s.anchor, s.extend)
        placeStrand(mesh, rig.hero.handR, tmp2, 0.06)
      } else {
        placeStrand(mesh, s.loose, s.anchor, 0.05)
      }
      mat.opacity = s.opacity
    }
    drive(m1.current, strands[0], a.mat)
    drive(m2.current, strands[1], b.mat)
  })

  return (
    <>
      <mesh ref={m1} geometry={a.geo} material={a.mat} visible={false} frustumCulled={false} />
      <mesh ref={m2} geometry={b.geo} material={b.mat} visible={false} frustumCulled={false} />
    </>
  )
}

/**
 * Scene 3: a full-screen 3D web that spins itself across the view, framing
 * the hero, then rushes past the camera when the visitor shoots a web.
 */
export function RevealWeb({ quality }: { quality: 'high' | 'low' }) {
  const group = useRef<Group>(null)
  const shot = useRef<Mesh>(null)
  const { geo, mat } = useMemo(
    () => ({
      geo: buildRadialWeb({
        spokes: quality === 'low' ? 14 : 18,
        rings: quality === 'low' ? 11 : 15,
        radius: 1,
        thickness: 0.0011,
        seed: 21,
      }),
      mat: createWebMaterial(),
    }),
    [quality],
  )
  const shotMesh = useStrandMesh()
  useEffect(() => () => (geo.dispose(), mat.dispose(), shotMesh.geo.dispose(), shotMesh.mat.dispose()), [geo, mat, shotMesh])

  const center = useMemo(() => new Vector3(), [])
  const wrist = useMemo(() => new Vector3(), [])
  const end = useMemo(() => new Vector3(), [])

  useFrame((state) => {
    const g = group.current
    if (!g) return
    const r = rig.reveal
    const visible = r.web > 0.001 && r.opacity > 0.001
    g.visible = visible
    if (shot.current) shot.current.visible = false
    if (!visible) return
    const cam = state.camera as PerspectiveCamera

    // Sit on the ray toward the hero, facing the camera, big enough to fill the frame.
    // Always in front of the hero so it frames him instead of hiding behind him.
    tmp.copy(rig.hero.pivot).add(tmp2.set(0, 0.3, 0)).sub(cam.position)
    const baseDist = Math.min(9, tmp.length() * 0.55)
    const dist = baseDist * (1 - r.push * 0.93)
    tmp.normalize()
    center.copy(cam.position).addScaledVector(tmp, dist)
    g.position.copy(center)
    g.quaternion.copy(cam.quaternion)
    const halfH = baseDist * Math.tan((cam.fov * Math.PI) / 360)
    const halfW = halfH * cam.aspect
    const radius = Math.hypot(halfW, halfH) * 1.08 * (dist / baseDist)
    g.scale.setScalar(radius)
    g.rotation.z += Math.sin(state.clock.elapsedTime * 0.3) * 0.02

    mat.uniforms.uProgress.value = r.web * 1.08
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uGlow.value = r.glow
    mat.uniforms.uOpacity.value = r.opacity

    // The web-shooter strand from the viewer's wrist to the hub.
    if (shot.current && r.shot > 0 && r.shotFade < 1) {
      wrist.set(0.35, -0.55, -0.6).applyQuaternion(cam.quaternion).add(cam.position)
      end.copy(wrist).lerp(center, Math.min(1, r.shot))
      placeStrand(shot.current, wrist, end, 0.012)
      shotMesh.mat.opacity = 1 - r.shotFade
    }
  })

  return (
    <>
      <group ref={group} visible={false}>
        <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />
      </group>
      <mesh ref={shot} geometry={shotMesh.geo} material={shotMesh.mat} visible={false} frustumCulled={false} renderOrder={6} />
    </>
  )
}

/** Webs strung across the avenue and woven into the rooftop. */
export function DecorWebs() {
  const { strandGeo, cornerGeo, mat, cornerMat } = useMemo(() => {
    const strands = [
      [new Vector3(-17.5, 92, -22), new Vector3(17.5, 78, -30), 6],
      [new Vector3(-17.5, 70, -88), new Vector3(17.5, 84, -76), 5],
    ] as const
    const parts = strands.map(([a, b, sag]) => buildStrand(a, b, sag, 0.03))
    const strandGeo = parts.length === 1 ? parts[0] : mergeAll(parts)
    const cornerGeo = buildRadialWeb({ spokes: 9, rings: 9, radius: 1, thickness: 0.006, arc: Math.PI / 2, seed: 8 })
    const mat = createWebMaterial()
    mat.uniforms.uGlow.value = 0.05
    mat.uniforms.uOpacity.value = 0.55
    const cornerMat = createWebMaterial()
    cornerMat.uniforms.uGlow.value = 0.35
    return { strandGeo, cornerGeo, mat, cornerMat }
  }, [])
  useEffect(() => () => (strandGeo.dispose(), cornerGeo.dispose(), mat.dispose(), cornerMat.dispose()), [strandGeo, cornerGeo, mat, cornerMat])
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
    cornerMat.uniforms.uTime.value = clock.elapsedTime
  })
  const { minX, minZ } = WORLD.heroBuilding
  return (
    <>
      <mesh geometry={strandGeo} material={mat} frustumCulled={false} />
      {/* corner web between the water tower legs */}
      <mesh geometry={cornerGeo} material={cornerMat} position={[-10.6, 64.05, -183.9]} scale={[4.2, 3.8, 1]} />
      {/* corner web in the back-left parapet corner */}
      <mesh
        geometry={cornerGeo}
        material={cornerMat}
        position={[minX + 0.5, WORLD.roofY + 1.17, minZ + 0.5]}
        rotation={[0, Math.PI / 4, 0]}
        scale={[2.4, 2.4, 1]}
      />
    </>
  )
}

function mergeAll(parts: ReturnType<typeof buildStrand>[]) {
  const merged = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  return merged
}
