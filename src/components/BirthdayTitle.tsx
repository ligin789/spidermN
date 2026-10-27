import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Vector3,
  type BufferGeometry,
} from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { rig, WORLD } from '../animations/rig'
import { NAME_UPPER } from '../config/party'
import { getTitleFont } from '../three/fontCache'
import { getSoftDot } from '../three/textures'
import { useExperience } from '../state/store'

interface Letter {
  geometry: BufferGeometry
  final: Vector3
  start: Vector3
  anchor: Vector3
  spin: number
}

const UP = new Vector3(0, 1, 0)
/** World-size multiplier for the whole title block. */
const TITLE_SCALE = 1.6
const tmp = new Vector3()
const pos = new Vector3()

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const easeOutBack = (x: number, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2)
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)

function layoutWord(font: Font, text: string, size: number, depth: number, bevel: number, y: number, tracking: number) {
  const data = font.data as unknown as { glyphs: Record<string, { ha: number }>; resolution: number }
  const scale = size / data.resolution
  const advances = [...text].map((ch) => (data.glyphs[ch]?.ha ?? data.glyphs['A']?.ha ?? 500) * scale + tracking * size)
  const width = advances.reduce((a, b) => a + b, 0) - tracking * size
  let x = -width / 2
  const letters: Letter[] = []
  ;[...text].forEach((ch, i) => {
    if (ch.trim()) {
      const geometry = new TextGeometry(ch, {
        font,
        size,
        depth,
        curveSegments: 5,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel * 0.7,
        bevelSegments: 3,
      })
      geometry.computeBoundingBox()
      const c = new Vector3()
      geometry.boundingBox!.getCenter(c)
      geometry.translate(-c.x, -c.y, -c.z)
      const final = new Vector3(x + c.x, y + c.y, 0)
      letters.push({ geometry, final, start: final.clone(), anchor: final.clone(), spin: 0 })
    }
    x += advances[i]
  })
  return { letters, width }
}

/** "HAPPY BIRTHDAY" + the name, extruded in metal and pulled into place by webs. */
export function BirthdayTitle() {
  const fontReady = useExperience((s) => s.fontReady)
  const font = fontReady ? getTitleFont() : null
  const built = useMemo(() => {
    if (!font) return null
    const happy = layoutWord(font, 'HAPPY BIRTHDAY', 0.98, 0.26, 0.035, 2.55, 0.07)
    const name = layoutWord(font, NAME_UPPER, 3.1, 0.62, 0.07, -0.6, 0.05)
    // Each name letter is yanked in from a different direction by its own web.
    const dirs = [
      new Vector3(-1, 0.35, 0.25),
      new Vector3(-0.35, 1, 0.1),
      new Vector3(0.35, 1, 0.1),
      new Vector3(1, 0.35, 0.25),
      new Vector3(0, -1, 0.2),
      new Vector3(-1, -0.6, 0.2),
      new Vector3(1, -0.6, 0.2),
    ]
    name.letters.forEach((l, i) => {
      const d = dirs[i % dirs.length].clone().normalize()
      l.start.copy(l.final).addScaledVector(d, 13).add(new Vector3(0, 0, -4))
      l.anchor.copy(l.final).addScaledVector(d, 40)
      l.spin = (i % 2 ? 1 : -1) * 1.4
    })
    return { happy, name }
  }, [font])

  const mats = useMemo(
    () => ({
      silver: new MeshPhysicalMaterial({
        color: '#eef2fa',
        metalness: 1,
        roughness: 0.24,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        envMapIntensity: 2.4,
        transparent: true,
      }),
      red: new MeshStandardMaterial({
        color: '#c20f1d',
        metalness: 0.7,
        roughness: 0.26,
        emissive: '#ff1a2e',
        emissiveIntensity: 0.18,
        envMapIntensity: 1.4,
        transparent: true,
      }),
      strand: new MeshBasicMaterial({ color: new Color(2.2, 2.3, 2.6), transparent: true, depthWrite: false }),
      auraBlue: new MeshBasicMaterial({ map: getSoftDot(), color: new Color(0.25, 0.5, 1.8), transparent: true, depthWrite: false, blending: AdditiveBlending }),
      auraRed: new MeshBasicMaterial({ map: getSoftDot(), color: new Color(1.6, 0.12, 0.2), transparent: true, depthWrite: false, blending: AdditiveBlending }),
    }),
    [],
  )
  const strandGeo = useMemo(() => new CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0), [])
  const plane = useMemo(() => new PlaneGeometry(1, 1), [])

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose())
      strandGeo.dispose()
      plane.dispose()
    },
    [mats, strandGeo, plane],
  )
  useEffect(
    () => () => {
      built?.happy.letters.forEach((l) => l.geometry.dispose())
      built?.name.letters.forEach((l) => l.geometry.dispose())
    },
    [built],
  )

  const group = useRef<Group>(null)
  const happyRefs = useRef<(Mesh | null)[]>([])
  const nameRefs = useRef<(Mesh | null)[]>([])
  const strandRefs = useRef<(Mesh | null)[]>([])
  const auraBlue = useRef<Mesh>(null)
  const auraRed = useRef<Mesh>(null)
  const key = useRef<PointLight>(null)
  const back = useRef<PointLight>(null)

  useFrame((state) => {
    const g = group.current
    if (!g || !built) return
    const T = rig.title
    g.visible = T.visible
    if (!T.visible) return
    const t = state.clock.elapsedTime
    const cam = state.camera as PerspectiveCamera

    // Fit the title to narrow (portrait) screens.
    const dist = cam.position.distanceTo(WORLD.titleCenter)
    const halfW = dist * Math.tan((cam.fov * Math.PI) / 360) * cam.aspect
    const fit = Math.min(1, halfW / (4.6 * TITLE_SCALE))
    g.scale.setScalar(TITLE_SCALE * fit * (1 - T.lift * 0.3))
    g.position.copy(WORLD.titleCenter).add(tmp.set(0, T.lift * 6.5 * fit, 0))

    const opacity = T.opacity
    for (const m of [mats.silver, mats.red]) m.opacity = opacity

    // HAPPY BIRTHDAY: letters flip up into place one after another.
    const hn = built.happy.letters.length
    built.happy.letters.forEach((l, i) => {
      const mesh = happyRefs.current[i]
      if (!mesh) return
      const local = clamp01(T.happy * 1.7 - (i / Math.max(1, hn - 1)) * 0.7)
      const e = easeOutBack(local, 1.4)
      mesh.visible = local > 0
      mesh.scale.setScalar(Math.max(0.001, easeOutCubic(local)))
      mesh.position.set(l.final.x, l.final.y - (1 - e) * 1.6 + Math.sin(t * 1.3 + i * 0.5) * 0.03 * local, l.final.z)
      mesh.rotation.set((1 - easeOutCubic(local)) * 1.8, 0, 0)
    })

    // NAME: each letter rides in on its own web strand, then the strand snaps.
    built.name.letters.forEach((l, i) => {
      const mesh = nameRefs.current[i]
      const strand = strandRefs.current[i]
      if (!mesh || !strand) return
      const local = Math.max(0, T.name * (1 + 0.42 * (built.name.letters.length - 1)) - i * 0.42)
      const pull = clamp01(local)
      const e = easeOutBack(pull, 1.25)
      mesh.visible = local > 0
      pos.lerpVectors(l.start, l.final, e)
      pos.y += Math.sin(t * 1.1 + i) * 0.05 * clamp01(local - 1)
      mesh.position.copy(pos)
      mesh.rotation.set(0, (1 - easeOutCubic(pull)) * l.spin, (1 - easeOutCubic(pull)) * l.spin * 0.25)
      mesh.scale.setScalar(0.55 + 0.45 * easeOutCubic(pull))

      const strandAlpha = local > 0 ? 1 - clamp01((local - 0.95) / 0.2) : 0
      strand.visible = strandAlpha > 0.01
      if (strand.visible) {
        tmp.subVectors(l.anchor, pos)
        const len = tmp.length()
        strand.position.copy(pos)
        strand.quaternion.setFromUnitVectors(UP, tmp.divideScalar(len))
        strand.scale.set(0.04, len, 0.04)
      }
    })
    mats.strand.opacity = 1

    const glow = T.glow * opacity
    mats.red.emissiveIntensity = 0.18 + glow * 0.6 + Math.sin(t * 2.2) * 0.08 * glow
    if (auraBlue.current) {
      auraBlue.current.visible = glow > 0.01
      mats.auraBlue.opacity = glow * 0.32
      auraBlue.current.scale.set(17 + Math.sin(t * 0.8) * 0.8, 8, 1)
    }
    if (auraRed.current) {
      auraRed.current.visible = glow > 0.01
      mats.auraRed.opacity = glow * 0.14
    }
    if (key.current) key.current.intensity = 70 * opacity * Math.max(T.happy, Math.min(1, T.name))
    if (back.current) back.current.intensity = 110 * glow
  })

  if (!built) return null

  return (
    <group ref={group} visible={false}>
      <mesh ref={auraBlue} geometry={plane} material={mats.auraBlue} position={[0, -0.4, -2.2]} renderOrder={-1} />
      <mesh ref={auraRed} geometry={plane} material={mats.auraRed} position={[0, 2.4, -2.4]} scale={[13, 3.5, 1]} renderOrder={-1} />
      {built.happy.letters.map((l, i) => (
        <mesh
          key={`h${i}`}
          ref={(el) => {
            happyRefs.current[i] = el
          }}
          geometry={l.geometry}
          material={[mats.silver, mats.red]}
          visible={false}
        />
      ))}
      {built.name.letters.map((l, i) => (
        <group key={`n${i}`}>
          <mesh
            ref={(el) => {
              nameRefs.current[i] = el
            }}
            geometry={l.geometry}
            material={[mats.silver, mats.red]}
            visible={false}
          />
          <mesh
            ref={(el) => {
              strandRefs.current[i] = el
            }}
            geometry={strandGeo}
            material={mats.strand}
            visible={false}
            frustumCulled={false}
          />
        </group>
      ))}
      <pointLight ref={key} position={[-9, 9, 12]} color="#ffffff" intensity={0} distance={34} decay={1.6} />
      <pointLight ref={back} position={[0, 0.5, -3.5]} color="#3d7bff" intensity={0} distance={18} decay={1.6} />
      <pointLight position={[-7, 1, 2]} color="#ff2a3a" intensity={30} distance={14} decay={1.6} />
      <pointLight position={[7, 1, 2]} color="#2a62ff" intensity={30} distance={14} decay={1.6} />
    </group>
  )
}
