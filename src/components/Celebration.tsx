import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LatheGeometry,
  Line,
  LineBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import { fx } from '../animations/events'
import { rig, WORLD } from '../animations/rig'
import { ParticlePool } from '../three/particles'
import { getSoftDot, getSuitTextures } from '../three/textures'
import { mulberry32, range } from '../utils/random'

/** Balloons, confetti, golden sparks, floating motes and sweeping light beams. */
export function Celebration({ quality }: { quality: 'high' | 'low' }) {
  return (
    <>
      <LightBeams />
      <StageMotes count={quality === 'low' ? 160 : 420} />
      <Balloons />
      <Confetti count={quality === 'low' ? 220 : 520} />
      <Sparks count={quality === 'low' ? 160 : 360} />
    </>
  )
}

// ── searchlight beams ───────────────────────────────────────────────

function LightBeams() {
  const { geo, mat } = useMemo(() => {
    const g = new ConeGeometry(1, 1, 32, 1, true).translate(0, -0.5, 0).rotateX(Math.PI)
    const m = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      uniforms: { uColor: { value: new Color() }, uIntensity: { value: 0 } },
      vertexShader: /* glsl */ `
        varying float vH;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vH = position.y;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying float vH;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float edge = pow(abs(dot(normalize(vN), normalize(vV))), 3.0);
          float along = smoothstep(0.0, 0.12, vH) * (1.0 - smoothstep(0.15, 0.85, vH));
          gl_FragColor = vec4(uColor * edge * along * uIntensity, 1.0);
        }
      `,
    })
    return { geo: g, mat: m }
  }, [])
  const beams = useMemo(
    () =>
      [
        { x: -48, z: -235, color: '#bcd0ff', phase: 0 },
        { x: 46, z: -240, color: '#ff4655', phase: 1.7 },
        { x: -95, z: -300, color: '#ff4655', phase: 3.1 },
        { x: 100, z: -290, color: '#bcd0ff', phase: 4.4 },
      ].map((b) => ({ ...b, mat: mat.clone() })),
    [mat],
  )
  const refs = useRef<(Group | null)[]>([])
  useEffect(() => () => (geo.dispose(), mat.dispose(), beams.forEach((b) => b.mat.dispose())), [geo, mat, beams])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const I = rig.lights.beams
    beams.forEach((b, i) => {
      const g = refs.current[i]
      if (!g) return
      g.visible = I > 0.01
      g.rotation.z = Math.sin(t * 0.35 + b.phase) * 0.38
      g.rotation.x = -0.12 + Math.cos(t * 0.27 + b.phase) * 0.12
      b.mat.uniforms.uIntensity.value = I * 0.22
      ;(b.mat.uniforms.uColor.value as Color).set(b.color)
    })
  })
  return (
    <>
      {beams.map((b, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          position={[b.x, 30, b.z]}
          visible={false}
        >
          <mesh geometry={geo} material={b.mat} scale={[16, 260, 16]} frustumCulled={false} />
        </group>
      ))}
    </>
  )
}

// ── floating red/blue motes around the title stage ──────────────────

function StageMotes({ count }: { count: number }) {
  const dpr = useThree((s) => s.viewport.dpr)
  const { geo, mat } = useMemo(() => {
    const rng = mulberry32(31)
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const col = new Float32Array(count * 3)
    const c = WORLD.titleCenter
    for (let i = 0; i < count; i++) {
      pos[i * 3] = c.x + range(rng, -22, 22)
      pos[i * 3 + 1] = c.y + range(rng, -12, 12)
      pos[i * 3 + 2] = c.z + range(rng, -14, 22)
      seed[i] = rng()
      const r = rng()
      col.set(r < 0.45 ? [1.8, 0.15, 0.22] : r < 0.85 ? [0.25, 0.5, 2.0] : [2.2, 1.6, 0.7], i * 3)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new Float32BufferAttribute(seed, 1))
    g.setAttribute('aColor', new Float32BufferAttribute(col, 3))
    const m = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 }, uMap: { value: getSoftDot() } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float aSeed;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vTw;
        void main() {
          vec3 p = position + vec3(sin(uTime * 0.4 + aSeed * 40.0) * 1.5, mod(uTime * (0.4 + aSeed * 0.6) + aSeed * 24.0, 24.0) - 12.0, cos(uTime * 0.3 + aSeed * 20.0) * 1.5);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.08 + aSeed * 0.16) * uPixelRatio * 520.0 / max(-mv.z, 0.5);
          vColor = aColor;
          vTw = 0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 50.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vTw;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a * uOpacity * (0.4 + 0.6 * vTw);
          gl_FragColor = vec4(vColor * a, a);
        }
      `,
    })
    return { geo: g, mat: m }
  }, [count])
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat])
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uOpacity.value = rig.celebrate.particles
    mat.uniforms.uPixelRatio.value = dpr
  })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

// ── balloons ────────────────────────────────────────────────────────

function balloonGeometry() {
  const pts: Vector2[] = []
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    const a = t * Math.PI
    // teardrop: narrow at the knot, round at the top
    const r = Math.sin(a) * (0.62 + 0.38 * t) * 0.62
    const y = -Math.cos(a) * 0.82 + 0.1 * Math.sin(a)
    pts.push(new Vector2(Math.max(0.001, r), y))
  }
  return new LatheGeometry(pts, 32)
}

function Balloons() {
  const { geo, knot, mats, strings } = useMemo(() => {
    const tex = getSuitTextures()
    const webRed = new MeshPhysicalMaterial({ map: tex.limb.map, color: '#ffffff', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 })
    const blue = new MeshPhysicalMaterial({ color: '#1d4fd6', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 })
    const silver = new MeshStandardMaterial({ color: '#dfe5f0', metalness: 1, roughness: 0.18, envMapIntensity: 1.8 })
    const gold = new MeshStandardMaterial({ color: '#f1b84a', metalness: 1, roughness: 0.22, envMapIntensity: 1.6 })
    const red = new MeshPhysicalMaterial({ color: '#d9182a', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 })
    const lineMat = new LineBasicMaterial({ color: '#c8cfe0', transparent: true, opacity: 0.6 })
    const strings = Array.from({ length: 8 }, (_, i) => {
      const g = new BufferGeometry()
      const p: number[] = []
      for (let k = 0; k <= 12; k++) {
        const t = k / 12
        p.push(Math.sin(t * 5 + i) * 0.12 * t, -0.86 - t * 3.6, Math.cos(t * 4 + i) * 0.1 * t)
      }
      g.setAttribute('position', new Float32BufferAttribute(p, 3))
      return new Line(g, lineMat)
    })
    return {
      geo: balloonGeometry(),
      knot: new ConeGeometry(0.07, 0.12, 10).translate(0, -0.86, 0),
      mats: [webRed, blue, gold, red, silver, webRed, blue, gold],
      strings,
    }
  }, [])
  const items = useMemo(() => {
    const c = WORLD.titleCenter
    const rng = mulberry32(12)
    const spots: [number, number, number][] = [
      [-8.6, 2.6, -1.5],
      [-6.6, -2.8, 1.2],
      [-10.5, -0.8, -4],
      [8.4, 3.2, -1],
      [6.9, -2.4, 1.4],
      [10.8, 0.2, -3.6],
      [-4.2, 5.4, -5],
      [4.6, 5.8, -5.5],
    ]
    return spots.map(([x, y, z], i) => ({
      base: new Vector3(c.x + x * 1.55, c.y + y * 1.4, c.z + z),
      phase: rng() * Math.PI * 2,
      scale: range(rng, 1.3, 1.8),
      mat: i,
    }))
  }, [])
  const refs = useRef<(Group | null)[]>([])
  useEffect(
    () => () => {
      geo.dispose()
      knot.dispose()
      new Set(mats).forEach((m) => m.dispose())
      strings.forEach((s) => s.geometry.dispose())
      ;(strings[0].material as LineBasicMaterial).dispose()
    },
    [geo, knot, mats, strings],
  )
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const show = rig.celebrate.balloons
    const away = rig.celebrate.balloonsAway
    items.forEach((b, i) => {
      const g = refs.current[i]
      if (!g) return
      g.visible = show > 0.001
      if (!g.visible) return
      const rise = (1 - show) * -16 + away * (30 + i * 4)
      g.position.set(
        b.base.x + Math.sin(t * 0.5 + b.phase) * 0.35 + away * (i % 2 ? 6 : -6),
        b.base.y + rise + Math.sin(t * 0.8 + b.phase) * 0.4,
        b.base.z,
      )
      g.rotation.z = Math.sin(t * 0.6 + b.phase) * 0.12
      g.rotation.y = t * 0.2 + b.phase
    })
  })
  return (
    <>
      {items.map((b, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          scale={b.scale}
          visible={false}
        >
          <mesh geometry={geo} material={mats[b.mat]} />
          <mesh geometry={knot} material={mats[b.mat]} />
          <primitive object={strings[i]} />
        </group>
      ))}
    </>
  )
}

// ── confetti ────────────────────────────────────────────────────────

const PALETTE = ['#e0182b', '#ff3b4c', '#1f4fe0', '#4d86ff', '#f5c04a', '#ffffff', '#c7cfdf']

function Confetti({ count }: { count: number }) {
  const ref = useRef<InstancedMesh>(null)
  const sim = useMemo(() => {
    const rng = mulberry32(77)
    return {
      rng,
      pos: new Float32Array(count * 3),
      vel: new Float32Array(count * 3),
      rot: new Float32Array(count * 3),
      spin: new Float32Array(count * 3),
      life: new Float32Array(count),
      cursor: 0,
      spawnAcc: 0,
    }
  }, [count])
  const { geo, mat } = useMemo(
    () => ({
      geo: new PlaneGeometry(0.11, 0.2),
      mat: new MeshStandardMaterial({ side: DoubleSide, metalness: 0.45, roughness: 0.35, emissive: '#222', envMapIntensity: 1.4 }),
    }),
    [],
  )
  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const c = new Color()
    for (let i = 0; i < count; i++) {
      c.set(PALETTE[i % PALETTE.length])
      mesh.setColorAt(i, c)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [count])
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat])

  const spawn = (at: Vector3, v: Vector3, life: number) => {
    const i = sim.cursor
    sim.cursor = (sim.cursor + 1) % count
    sim.pos.set([at.x, at.y, at.z], i * 3)
    sim.vel.set([v.x, v.y, v.z], i * 3)
    sim.rot.set([sim.rng() * 6, sim.rng() * 6, sim.rng() * 6], i * 3)
    sim.spin.set([range(sim.rng, -9, 9), range(sim.rng, -9, 9), range(sim.rng, -6, 6)], i * 3)
    sim.life[i] = life
  }

  useEffect(
    () =>
      fx.on((e) => {
        if (e.type !== 'confetti') return
        const n = Math.min(count, e.count ?? 260)
        const v = new Vector3()
        for (let k = 0; k < n; k++) {
          const a = sim.rng() * Math.PI * 2
          const up = range(sim.rng, -0.2, 1)
          const s = range(sim.rng, 5, 15)
          v.set(Math.cos(a) * s * 0.8, up * s + 4, Math.sin(a) * s * 0.5 + 3)
          spawn(e.at, v, range(sim.rng, 3, 5.5))
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, sim],
  )

  const o = useMemo(() => new Object3D(), [])
  const at = useMemo(() => new Vector3(), [])
  const vel = useMemo(() => new Vector3(), [])
  useFrame((state, delta) => {
    const mesh = ref.current
    if (!mesh) return
    const dt = Math.min(delta, 0.05)
    // gentle confetti rain over the title while celebrating
    if (rig.celebrate.rain > 0) {
      sim.spawnAcc += dt * 70 * rig.celebrate.rain
      const c = WORLD.titleCenter
      while (sim.spawnAcc > 1) {
        sim.spawnAcc -= 1
        at.set(c.x + range(sim.rng, -16, 16), c.y + 12, c.z + range(sim.rng, -6, 14))
        vel.set(range(sim.rng, -0.6, 0.6), range(sim.rng, -2, -0.5), range(sim.rng, -0.3, 0.6))
        spawn(at, vel, 7)
      }
    }
    const t = state.clock.elapsedTime
    let alive = 0
    for (let i = 0; i < count; i++) {
      if (sim.life[i] <= 0) {
        o.scale.setScalar(0)
        o.updateMatrix()
        mesh.setMatrixAt(i, o.matrix)
        continue
      }
      alive++
      sim.life[i] -= dt
      const k = i * 3
      // air drag + gravity + flutter
      const drag = Math.exp(-1.8 * dt)
      sim.vel[k] = sim.vel[k] * drag + Math.sin(t * 3 + i) * 0.6 * dt
      sim.vel[k + 1] = sim.vel[k + 1] * drag - 6 * dt
      sim.vel[k + 2] = sim.vel[k + 2] * drag
      sim.vel[k + 1] = Math.max(sim.vel[k + 1], -2.6)
      sim.pos[k] += sim.vel[k] * dt
      sim.pos[k + 1] += sim.vel[k + 1] * dt
      sim.pos[k + 2] += sim.vel[k + 2] * dt
      sim.rot[k] += sim.spin[k] * dt
      sim.rot[k + 1] += sim.spin[k + 1] * dt
      sim.rot[k + 2] += sim.spin[k + 2] * dt
      o.position.set(sim.pos[k], sim.pos[k + 1], sim.pos[k + 2])
      o.rotation.set(sim.rot[k], sim.rot[k + 1], sim.rot[k + 2])
      o.scale.setScalar(Math.min(1, sim.life[i] * 2))
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    }
    mesh.visible = alive > 0
    mesh.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}

// ── golden sparks ───────────────────────────────────────────────────

function Sparks({ count }: { count: number }) {
  const dpr = useThree((s) => s.viewport.dpr)
  const pool = useMemo(() => {
    const p = new ParticlePool(count, { additive: true })
    p.gravity = -3
    p.drag = 1.1
    p.grow = -0.6
    return p
  }, [count])
  useEffect(() => () => pool.dispose(), [pool])
  useEffect(() => {
    const rng = mulberry32(55)
    return fx.on((e) => {
      if (e.type !== 'sparks') return
      pool.spawn(e.at, Math.min(count, e.count ?? 140), (_i, v, c) => {
        const a = rng() * Math.PI * 2
        const b = Math.acos(range(rng, -1, 1))
        const s = range(rng, 3, 13)
        v.set(Math.cos(a) * Math.sin(b) * s, Math.cos(b) * s + 2, Math.sin(a) * Math.sin(b) * s * 0.6)
        const warm = rng()
        c.set(2.6, 1.5 + warm * 0.6, 0.4 + warm * 0.3)
        return { life: range(rng, 0.7, 1.8), size: range(rng, 0.05, 0.12) }
      })
    })
  }, [pool, count])
  useFrame((_, dt) => {
    pool.material.uniforms.uPixelRatio.value = dpr
    pool.update(Math.min(dt, 0.05))
  })
  return <points geometry={pool.geometry} material={pool.material} frustumCulled={false} />
}
