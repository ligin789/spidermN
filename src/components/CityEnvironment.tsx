import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  FogExp2,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { rig, WORLD } from '../animations/rig'
import { useExperience } from '../state/store'
import { AVENUE_BLOCKS, CROSS_STREETS, generateCity } from '../three/cityLayout'
import {
  FOG_COLOR,
  cityUniforms,
  createBuildingMaterial,
  createGroundMaterial,
  createLightPointsMaterial,
  createSkyMaterial,
} from '../three/cityMaterials'
import { getFogTexture, getWoodTexture } from '../three/textures'
import { mulberry32, range } from '../utils/random'

/**
 * Night-time Manhattan: instanced procedural skyscrapers with shader-lit
 * windows, a starry sky with a moon, GPU traffic, street lamps and drifting
 * fog banks. A few hundred buildings render in a single draw call.
 */
export function CityEnvironment() {
  const quality = useExperience((s) => s.quality)
  const layout = useMemo(() => generateCity(quality), [quality])
  const scene = useThree((s) => s.scene)

  useLayoutEffect(() => {
    scene.fog = new FogExp2(FOG_COLOR.clone(), cityUniforms.uFogDensity.value)
    scene.background = FOG_COLOR.clone()
    return () => {
      scene.fog = null
    }
  }, [scene])

  useFrame((state) => {
    cityUniforms.uTime.value = state.clock.elapsedTime
    cityUniforms.uFogDensity.value = rig.env.fog
    cityUniforms.uWindows.value = rig.env.windows
    if (scene.fog instanceof FogExp2) scene.fog.density = rig.env.fog * 0.8
  })

  return (
    <group>
      <Sky />
      <Ground />
      <Buildings layout={layout} />
      <Spires layout={layout} />
      <WaterTowers layout={layout} />
      <CityLights layout={layout} quality={quality} />
      <FogBanks quality={quality} />
      <Moonlight shadows={quality === 'high'} />
      <hemisphereLight args={['#5a6fae', '#1a0f0c', 0.5]} />
    </group>
  )
}

function Sky() {
  const geo = useMemo(() => new SphereGeometry(1800, 48, 24), [])
  const mat = useMemo(createSkyMaterial, [])
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat])
  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={-10} />
}

function Ground() {
  const geo = useMemo(() => new PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), [])
  const mat = useMemo(createGroundMaterial, [])
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat])
  return <mesh geometry={geo} material={mat} />
}

function Buildings({ layout }: { layout: ReturnType<typeof generateCity> }) {
  const ref = useRef<InstancedMesh>(null)
  const { geo, mat } = useMemo(() => {
    const g = new BoxGeometry(1, 1, 1)
    g.translate(0, 0.5, 0)
    const count = layout.buildings.length
    const seeds = new Float32Array(count)
    const crowns = new Float32Array(count)
    layout.buildings.forEach((b, i) => {
      seeds[i] = b.seed
      crowns[i] = b.crown
    })
    g.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1))
    g.setAttribute('aCrown', new InstancedBufferAttribute(crowns, 1))
    return { geo: g, mat: createBuildingMaterial() }
  }, [layout])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    layout.buildings.forEach((b, i) => {
      o.position.set(b.x, b.base, b.z)
      o.scale.set(b.w, b.h, b.d)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [layout])

  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat])
  return <instancedMesh ref={ref} args={[geo, mat, layout.buildings.length]} frustumCulled={false} />
}

function Spires({ layout }: { layout: ReturnType<typeof generateCity> }) {
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(() => new CylinderGeometry(0.35, 1, 1, 8).translate(0, 0.5, 0), [])
  const mat = useMemo(() => new MeshStandardMaterial({ color: '#8c94a8', metalness: 0.9, roughness: 0.35 }), [])
  useLayoutEffect(() => {
    const o = new Object3D()
    layout.spires.forEach((s, i) => {
      o.position.set(s.x, s.y, s.z)
      o.scale.set(s.r, s.h, s.r)
      o.updateMatrix()
      ref.current?.setMatrixAt(i, o.matrix)
    })
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
  }, [layout])
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat])
  return <instancedMesh ref={ref} args={[geo, mat, layout.spires.length]} frustumCulled={false} />
}

function WaterTowers({ layout }: { layout: ReturnType<typeof generateCity> }) {
  const ref = useRef<InstancedMesh>(null)
  const { geo, mat } = useMemo(() => {
    const parts: BufferGeometry[] = []
    parts.push(new CylinderGeometry(2.2, 2.2, 4.2, 14, 1).translate(0, 4.6, 0))
    parts.push(new ConeGeometry(2.45, 1.6, 14).translate(0, 7.5, 0))
    for (const [x, z] of [
      [1.5, 1.5],
      [-1.5, 1.5],
      [1.5, -1.5],
      [-1.5, -1.5],
    ])
      parts.push(new BoxGeometry(0.2, 2.6, 0.2).translate(x, 1.3, z))
    const merged = mergeGeometries(parts.map((p) => p.toNonIndexed()))!
    parts.forEach((p) => p.dispose())
    return {
      geo: merged,
      mat: new MeshStandardMaterial({ map: getWoodTexture(), color: '#7d6a5c', roughness: 0.9 }),
    }
  }, [])
  useLayoutEffect(() => {
    const o = new Object3D()
    layout.waterTowers.forEach(([x, y, z, s], i) => {
      o.position.set(x, y, z)
      o.scale.setScalar(s)
      o.rotation.y = i
      o.updateMatrix()
      ref.current?.setMatrixAt(i, o.matrix)
    })
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
  }, [layout])
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat])
  return <instancedMesh ref={ref} args={[geo, mat, layout.waterTowers.length]} frustumCulled={false} />
}

/** Head/tail lights, street lamps and blinking aircraft beacons — one Points draw call. */
function CityLights({ layout, quality }: { layout: ReturnType<typeof generateCity>; quality: string }) {
  const dpr = useThree((s) => s.viewport.dpr)
  const { geo, mat } = useMemo(() => {
    const rng = mulberry32(5)
    const pos: number[] = []
    const dir: number[] = []
    const col: number[] = []
    const motion: number[] = []
    const size: number[] = []
    const push = (p: [number, number, number], d: [number, number, number], c: [number, number, number], m: [number, number], s: number) => {
      pos.push(...p)
      dir.push(...d)
      col.push(...c)
      motion.push(...m)
      size.push(s)
    }
    const head: [number, number, number] = [2.2, 2.1, 1.9]
    const tail: [number, number, number] = [2.4, 0.15, 0.12]
    const carsPerLane = quality === 'low' ? 26 : 44
    const avenueLen = 360
    // Avenue lanes: downtown-bound headlights, uptown-bound taillights.
    const lanes: [number, number][] = [
      [-7, 1],
      [-3.2, 1],
      [3.2, -1],
      [7, -1],
    ]
    for (const [x, d] of lanes) {
      for (let i = 0; i < carsPerLane; i++) {
        const z = d > 0 ? -170 : 185
        const offset = rng() * avenueLen
        const speed = range(rng, 9, 16)
        const c = d > 0 ? head : tail
        for (const side of [-0.45, 0.45]) {
          push([x + side, 0.75, z + d * offset], [0, 0, d], c, [speed, avenueLen], 1.1)
        }
      }
    }
    // Cross streets.
    for (const zc of CROSS_STREETS) {
      for (let i = 0; i < carsPerLane / 2; i++) {
        const d = rng() > 0.5 ? 1 : -1
        const len = 700
        const x0 = d > 0 ? -350 : 350
        const c = d > 0 ? tail : head
        for (const side of [-0.45, 0.45]) {
          push([x0 + d * rng() * len, 0.75, zc + (d > 0 ? 2.5 : -2.5) + side], [d, 0, 0], c, [range(rng, 8, 14), len], 1.0)
        }
      }
    }
    // Street lamps along the avenue sidewalks.
    for (const [zs, ze] of AVENUE_BLOCKS) {
      for (let z = zs; z > ze; z -= 13) {
        for (const x of [-14.5, 14.5]) push([x, 7, z], [0, 0, 0], [1.6, 0.95, 0.5], [0, 1], 2.4)
      }
    }
    // Aircraft beacons (negative speed = blink).
    for (const b of layout.beacons) push(b, [0, 0, 0], [3.2, 0.1, 0.1], [-1, 1], 3.2)

    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('aDir', new Float32BufferAttribute(dir, 3))
    g.setAttribute('aColor', new Float32BufferAttribute(col, 3))
    g.setAttribute('aMotion', new Float32BufferAttribute(motion, 2))
    g.setAttribute('aSize', new Float32BufferAttribute(size, 1))
    const m = createLightPointsMaterial(1)
    m.vertexShader = m.vertexShader.replace(
      'vColor = aColor;',
      'vColor = aMotion.x < 0.0 ? aColor * step(0.55, fract(uTime * 0.6 + position.x * 0.013)) : aColor;',
    )
    return { geo: g, mat: m }
  }, [layout, quality])
  useEffect(() => {
    mat.uniforms.uPixelRatio.value = dpr
  }, [dpr, mat])
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat])
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

/** Big billboarded haze cards drifting between the towers (single instanced draw). */
function FogBanks({ quality }: { quality: string }) {
  const { geo, mat } = useMemo(() => {
    const rng = mulberry32(99)
    const count = quality === 'low' ? 10 : 22
    const base = new PlaneGeometry(1, 1)
    const g = new InstancedBufferGeometry()
    g.index = base.index
    g.setAttribute('position', base.getAttribute('position'))
    g.setAttribute('uv', base.getAttribute('uv'))
    const center: number[] = []
    const sizes: number[] = []
    const alpha: number[] = []
    for (let i = 0; i < count; i++) {
      const z = range(rng, 150, -420)
      const x = range(rng, -60, 60) * (z < -200 ? 3 : 1)
      center.push(x, range(rng, 8, 48), z)
      const s = range(rng, 70, 170)
      sizes.push(s, s * range(rng, 0.35, 0.55))
      alpha.push(range(rng, 0.35, 1))
    }
    g.setAttribute('aCenter', new InstancedBufferAttribute(new Float32Array(center), 3))
    g.setAttribute('aSize', new InstancedBufferAttribute(new Float32Array(sizes), 2))
    g.setAttribute('aAlpha', new InstancedBufferAttribute(new Float32Array(alpha), 1))
    g.instanceCount = count
    const m = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { ...cityUniforms, uMap: { value: getFogTexture() }, uStrength: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        attribute vec3 aCenter;
        attribute vec2 aSize;
        attribute float aAlpha;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 up = vec3(0.0, 1.0, 0.0);
          vec3 c = aCenter + vec3(sin(uTime * 0.03 + aAlpha * 9.0) * 10.0, 0.0, 0.0);
          vec3 p = c + right * position.x * aSize.x + up * position.y * aSize.y;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          float dist = -mv.z;
          vAlpha = aAlpha * smoothstep(12.0, 70.0, dist) * (1.0 - smoothstep(380.0, 600.0, dist));
          vUv = uv;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uStrength;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          float a = texture2D(uMap, vUv).a * vAlpha * uStrength * 0.22;
          gl_FragColor = vec4(vec3(0.16, 0.2, 0.34), a);
          #include <colorspace_fragment>
        }
      `,
    })
    return { geo: g, mat: m }
  }, [quality])
  useFrame(() => {
    mat.uniforms.uStrength.value = 0.6 + Math.min(1.4, rig.env.fog * 120)
  })
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat])
  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={2} />
}

function Moonlight({ shadows }: { shadows: boolean }) {
  const ref = useRef<DirectionalLight>(null)
  const target = useMemo(() => new Object3D(), [])
  useLayoutEffect(() => {
    const light = ref.current
    if (!light) return
    // Moonlight comes from the moon's side, but steeper than the visible moon
    // so rooftop shadows stay short and soft instead of raking across the deck.
    const dir = (cityUniforms.uMoonDir.value as Vector3).clone().setY(0).normalize().multiplyScalar(0.55).setY(1).normalize()
    target.position.copy(WORLD.landing)
    light.position.copy(WORLD.landing).addScaledVector(dir, 70)
    light.target = target
    const cam = light.shadow.camera
    cam.left = -18
    cam.right = 18
    cam.top = 18
    cam.bottom = -18
    cam.near = 30
    cam.far = 110
    cam.updateProjectionMatrix()
    light.shadow.bias = -0.0005
    light.shadow.normalBias = 0.04
    light.shadow.radius = 3
  }, [target])
  useFrame(() => {
    if (ref.current) ref.current.intensity = 1.6 * rig.lights.key
  })
  return (
    <>
      <primitive object={target} />
      <directionalLight
        ref={ref}
        color="#9fb6ff"
        intensity={1.6}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
      />
    </>
  )
}
