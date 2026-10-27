import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  ShaderMaterial,
  Vector3,
} from 'three'
import { fx } from '../animations/events'
import { rig } from '../animations/rig'
import { ParticlePool } from '../three/particles'
import { getSoftDot } from '../three/textures'
import { mulberry32 } from '../utils/random'

/** Floating dust motes that always surround the camera, plus landing debris. */
export function Atmosphere({ quality }: { quality: 'high' | 'low' }) {
  return (
    <>
      <DustMotes count={quality === 'low' ? 260 : 700} />
      <ImpactDust />
    </>
  )
}

function DustMotes({ count }: { count: number }) {
  const dpr = useThree((s) => s.viewport.dpr)
  const box = 34
  const { geo, mat } = useMemo(() => {
    const rng = mulberry32(17)
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rng() * box
      pos[i * 3 + 1] = rng() * box
      pos[i * 3 + 2] = rng() * box
      seed[i] = rng()
      // mostly silver dust, a few warm sparks and red/blue motes
      const r = rng()
      const c = r > 0.94 ? [2.4, 1.3, 0.5] : r > 0.88 ? [1.4, 0.2, 0.25] : r > 0.82 ? [0.3, 0.5, 1.6] : [0.7, 0.75, 0.9]
      col.set(c, i * 3)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new Float32BufferAttribute(seed, 1))
    g.setAttribute('aColor', new Float32BufferAttribute(col, 3))
    const m = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uCam: { value: new Vector3() },
        uBox: { value: box },
        uPixelRatio: { value: 1 },
        uMap: { value: getSoftDot() },
        uOpacity: { value: 1 },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uCam;
        uniform float uBox;
        uniform float uPixelRatio;
        attribute float aSeed;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec3 p = position + vec3(
            sin(uTime * 0.21 + aSeed * 31.0) * 1.2,
            uTime * (0.12 + aSeed * 0.25),
            cos(uTime * 0.17 + aSeed * 17.0) * 1.2);
          p = mod(p - uCam + uBox * 0.5, uBox) + uCam - uBox * 0.5;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          float d = -mv.z;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.035 + aSeed * 0.06) * uPixelRatio * 520.0 / max(d, 0.5);
          vAlpha = smoothstep(0.8, 3.5, d) * (1.0 - smoothstep(uBox * 0.3, uBox * 0.5, d));
          vAlpha *= 0.55 + 0.45 * sin(uTime * (0.8 + aSeed) + aSeed * 40.0);
          vColor = aColor;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a * vAlpha * uOpacity * 0.6;
          gl_FragColor = vec4(vColor * a, a);
        }
      `,
    })
    return { geo: g, mat: m }
  }, [count])
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat])
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uCam.value.copy(state.camera.position)
    mat.uniforms.uPixelRatio.value = dpr
  })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

function ImpactDust() {
  const dpr = useThree((s) => s.viewport.dpr)
  const pool = useMemo(() => {
    const p = new ParticlePool(220)
    p.gravity = 0.6
    p.drag = 2.2
    p.grow = 2.2
    return p
  }, [])
  const ring = useRef<Mesh>(null)
  const ringAge = useRef(10)
  const ringAt = useMemo(() => new Vector3(), [])
  const ringGeo = useMemo(() => new RingGeometry(0.92, 1, 64).rotateX(-Math.PI / 2), [])
  const ringMat = useMemo(
    () => new MeshBasicMaterial({ color: new Color(1.6, 1.7, 2.2), transparent: true, depthWrite: false, blending: AdditiveBlending }),
    [],
  )

  useEffect(() => {
    const rng = mulberry32(3)
    return fx.on((e) => {
      if (e.type !== 'impact') return
      pool.spawn(e.at, 150, (_i, v, c) => {
        const a = rng() * Math.PI * 2
        const s = 2 + rng() * 7
        v.set(Math.cos(a) * s, 0.4 + rng() * 2.4, Math.sin(a) * s)
        const g = 0.45 + rng() * 0.3
        c.set(g, g * 1.05, g * 1.25)
        return { life: 0.9 + rng() * 1.2, size: 0.18 + rng() * 0.3, offset: new Vector3(Math.cos(a) * 0.4, 0.1, Math.sin(a) * 0.4) }
      })
      ringAt.copy(e.at)
      ringAge.current = 0
    })
  }, [pool, ringAt])

  useEffect(() => () => (pool.dispose(), ringGeo.dispose(), ringMat.dispose()), [pool, ringGeo, ringMat])

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05)
    pool.material.uniforms.uPixelRatio.value = dpr
    pool.update(step)
    ringAge.current += step
    const r = ring.current
    if (!r) return
    const age = ringAge.current
    r.visible = age < 0.7 && rig.hero.visible
    if (r.visible) {
      r.position.copy(ringAt).setY(ringAt.y + 0.06)
      r.scale.setScalar(0.5 + age * 11)
      ringMat.opacity = (1 - age / 0.7) * 0.55
    }
  })

  return (
    <>
      <points geometry={pool.geometry} material={pool.material} frustumCulled={false} />
      <mesh ref={ring} geometry={ringGeo} material={ringMat} visible={false} />
    </>
  )
}
