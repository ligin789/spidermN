import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  ConeGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  TorusGeometry,
} from 'three'
import { WORLD } from '../animations/rig'
import { getRoofTexture, getWoodTexture } from '../three/textures'
import { useExperience } from '../state/store'

/**
 * The hero's rooftop: tar-and-concrete deck, stone parapet, a classic wooden
 * water tower, HVAC units, a stair bulkhead with a warm lamp and a beacon mast.
 */
export function Rooftop() {
  const quality = useExperience((s) => s.quality)
  const shadows = quality === 'high'
  const { minX, maxX, minZ, maxZ } = WORLD.heroBuilding
  const y = WORLD.roofY
  const w = maxX - minX
  const d = maxZ - minZ
  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2

  const mats = useMemo(() => {
    const roofMap = getRoofTexture().clone()
    roofMap.wrapS = roofMap.wrapT = RepeatWrapping
    roofMap.repeat.set(5, 5)
    roofMap.needsUpdate = true
    const wood = getWoodTexture().clone()
    wood.wrapS = wood.wrapT = RepeatWrapping
    wood.repeat.set(3, 1)
    wood.needsUpdate = true
    return {
      roof: new MeshStandardMaterial({ map: roofMap, roughness: 0.93, metalness: 0.02, color: '#9aa0b4' }),
      stone: new MeshStandardMaterial({ color: '#4a4c58', roughness: 0.85 }),
      cap: new MeshStandardMaterial({ color: '#6d6f7c', roughness: 0.7 }),
      steel: new MeshStandardMaterial({ color: '#5d6472', roughness: 0.45, metalness: 0.75 }),
      darkSteel: new MeshStandardMaterial({ color: '#23262e', roughness: 0.6, metalness: 0.6 }),
      wood: new MeshStandardMaterial({ map: wood, color: '#a08672', roughness: 0.88 }),
      door: new MeshStandardMaterial({ color: '#2b1d1a', roughness: 0.6, metalness: 0.3 }),
      lamp: new MeshBasicMaterial({ color: new Color(3.2, 2.2, 1.2) }),
      beacon: new MeshBasicMaterial({ color: new Color(4, 0.2, 0.2) }),
    }
  }, [])

  const geos = useMemo(
    () => ({
      box: new BoxGeometry(1, 1, 1),
      cyl: new CylinderGeometry(1, 1, 1, 24),
      cylLow: new CylinderGeometry(1, 1, 1, 10),
      cone: new ConeGeometry(1, 1, 24),
      band: new TorusGeometry(1, 0.035, 6, 40),
    }),
    [],
  )

  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose())
      Object.values(mats).forEach((m) => {
        m.map?.dispose()
        m.dispose()
      })
    },
    [geos, mats],
  )

  const beacon = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (beacon.current) beacon.current.visible = Math.sin(clock.elapsedTime * 3) > 0.2
  })

  const B = (props: {
    p: [number, number, number]
    s: [number, number, number]
    m: keyof typeof mats
    r?: [number, number, number]
    cast?: boolean
  }) => (
    <mesh
      geometry={geos.box}
      material={mats[props.m]}
      position={props.p}
      scale={props.s}
      rotation={props.r}
      castShadow={shadows && props.cast !== false}
      receiveShadow={shadows}
    />
  )

  const parapetH = 1.05
  const t = 0.5
  const tower = { x: -8.5, z: -186 }
  const legs: [number, number][] = [
    [2.1, 2.1],
    [-2.1, 2.1],
    [2.1, -2.1],
    [-2.1, -2.1],
  ]

  return (
    <group>
      {/* deck */}
      <mesh geometry={geos.box} material={mats.roof} position={[cx, y - 0.15, cz]} scale={[w - 0.2, 0.3, d - 0.2]} receiveShadow={shadows} />

      {/* parapet + coping */}
      {B({ p: [cx, y + parapetH / 2, maxZ - t / 2], s: [w, parapetH, t], m: 'stone' })}
      {B({ p: [cx, y + parapetH / 2, minZ + t / 2], s: [w, parapetH, t], m: 'stone' })}
      {B({ p: [minX + t / 2, y + parapetH / 2, cz], s: [t, parapetH, d], m: 'stone' })}
      {B({ p: [maxX - t / 2, y + parapetH / 2, cz], s: [t, parapetH, d], m: 'stone' })}
      {B({ p: [cx, y + parapetH + 0.06, maxZ - t / 2], s: [w + 0.2, 0.12, t + 0.2], m: 'cap' })}
      {B({ p: [cx, y + parapetH + 0.06, minZ + t / 2], s: [w + 0.2, 0.12, t + 0.2], m: 'cap' })}
      {B({ p: [minX + t / 2, y + parapetH + 0.06, cz], s: [t + 0.2, 0.12, d + 0.2], m: 'cap' })}
      {B({ p: [maxX - t / 2, y + parapetH + 0.06, cz], s: [t + 0.2, 0.12, d + 0.2], m: 'cap' })}

      {/* water tower */}
      <group position={[tower.x, y, tower.z]}>
        {legs.map(([x, z], i) => (
          <mesh key={i} geometry={geos.box} material={mats.darkSteel} position={[x, 2, z]} scale={[0.28, 4, 0.28]} castShadow={shadows} />
        ))}
        {B({ p: [0, 2.2, 0], s: [4.6, 0.12, 0.12], m: 'darkSteel', r: [0, Math.PI / 4, 0] })}
        {B({ p: [0, 2.2, 0], s: [4.6, 0.12, 0.12], m: 'darkSteel', r: [0, -Math.PI / 4, 0] })}
        <mesh geometry={geos.cyl} material={mats.darkSteel} position={[0, 4.05, 0]} scale={[3.3, 0.18, 3.3]} castShadow={shadows} receiveShadow={shadows} />
        <mesh geometry={geos.cyl} material={mats.wood} position={[0, 6.9, 0]} scale={[3, 5.5, 3]} castShadow={shadows} receiveShadow={shadows} />
        {[4.9, 6.6, 8.3].map((h) => (
          <mesh key={h} geometry={geos.band} material={mats.steel} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[3.02, 3.02, 1]} />
        ))}
        <mesh geometry={geos.cone} material={mats.wood} position={[0, 10.75, 0]} scale={[3.3, 2.2, 3.3]} castShadow={shadows} />
        <mesh geometry={geos.cylLow} material={mats.steel} position={[0, 12.1, 0]} scale={[0.12, 0.6, 0.12]} />
        {/* ladder */}
        {B({ p: [0.35, 6.5, 3.15], s: [0.08, 9, 0.08], m: 'steel', cast: false })}
        {B({ p: [-0.35, 6.5, 3.15], s: [0.08, 9, 0.08], m: 'steel', cast: false })}
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} geometry={geos.box} material={mats.steel} position={[0, 2.4 + i * 0.6, 3.15]} scale={[0.7, 0.05, 0.05]} />
        ))}
      </group>

      {/* HVAC units */}
      {(
        [
          [9.5, -190.5, 0],
          [12, -184.5, 0.1],
          [-12.2, -171.5, -0.05],
        ] as const
      ).map(([x, z, r], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, r, 0]}>
          {B({ p: [0, 0.75, 0], s: [2.6, 1.5, 1.9], m: 'steel' })}
          <mesh geometry={geos.cyl} material={mats.darkSteel} position={[0, 1.52, 0]} scale={[0.7, 0.06, 0.7]} />
          {B({ p: [0, 0.75, 0.96], s: [2.2, 1.1, 0.04], m: 'darkSteel', cast: false })}
        </group>
      ))}

      {/* vents & pipes */}
      {(
        [
          [5.5, -178, 0.35, 1.6],
          [-2.5, -192, 0.5, 1.2],
          [3.2, -191, 0.28, 2.1],
        ] as const
      ).map(([x, z, r, h], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh geometry={geos.cylLow} material={mats.steel} position={[0, h / 2, 0]} scale={[r, h, r]} castShadow={shadows} />
          <mesh geometry={geos.cone} material={mats.darkSteel} position={[0, h + 0.2, 0]} scale={[r * 1.6, 0.4, r * 1.6]} />
        </group>
      ))}
      <mesh geometry={geos.cylLow} material={mats.darkSteel} position={[2, y + 0.35, -186]} rotation={[0, 0, Math.PI / 2]} scale={[0.18, 18, 0.18]} castShadow={shadows} />

      {/* stair bulkhead with a warm lamp */}
      <group position={[10.5, y, -175]}>
        {B({ p: [0, 1.7, 0], s: [4.2, 3.4, 4.6], m: 'stone' })}
        {B({ p: [0, 3.46, 0], s: [4.5, 0.14, 4.9], m: 'cap' })}
        {B({ p: [-2.13, 1.15, 0.6], s: [0.06, 2.2, 1.1], m: 'door', cast: false })}
        <mesh geometry={geos.box} material={mats.lamp} position={[-2.2, 2.6, 0.6]} scale={[0.12, 0.18, 0.3]} />
        <pointLight position={[-2.8, 2.6, 0.6]} color="#ffb36b" intensity={9} distance={9} decay={1.8} />
      </group>

      {/* beacon mast */}
      <group position={[13.5, y, -193.5]}>
        <mesh geometry={geos.cylLow} material={mats.steel} position={[0, 6, 0]} scale={[0.12, 12, 0.12]} castShadow={shadows} />
        <mesh ref={beacon} geometry={geos.box} material={mats.beacon} position={[0, 12.1, 0]} scale={0.3} />
      </group>
    </group>
  )
}
