import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, NormalBlending, ShaderMaterial, Vector3 } from 'three'
import { getSoftDot } from './textures'

/**
 * Fixed-size CPU particle pool rendered as one Points draw call. Used for
 * landing dust and golden sparks — short bursts where a few hundred
 * particles are plenty.
 */
export class ParticlePool {
  readonly geometry = new BufferGeometry()
  readonly material: ShaderMaterial
  private pos: Float32Array
  private vel: Float32Array
  private life: Float32Array
  private maxLife: Float32Array
  private size: Float32Array
  private baseSize: Float32Array
  private alpha: Float32Array
  private color: Float32Array
  private cursor = 0
  readonly count: number
  gravity = -2
  drag = 1.2
  grow = 1.5

  constructor(count: number, opts: { additive?: boolean } = {}) {
    this.count = count
    this.pos = new Float32Array(count * 3)
    this.vel = new Float32Array(count * 3)
    this.life = new Float32Array(count)
    this.maxLife = new Float32Array(count).fill(1)
    this.size = new Float32Array(count)
    this.baseSize = new Float32Array(count)
    this.alpha = new Float32Array(count)
    this.color = new Float32Array(count * 3)
    this.geometry.setAttribute('position', new Float32BufferAttribute(this.pos, 3))
    this.geometry.setAttribute('aSize', new Float32BufferAttribute(this.size, 1))
    this.geometry.setAttribute('aAlpha', new Float32BufferAttribute(this.alpha, 1))
    this.geometry.setAttribute('aColor', new Float32BufferAttribute(this.color, 3))
    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: opts.additive ? AdditiveBlending : NormalBlending,
      uniforms: { uMap: { value: getSoftDot() }, uPixelRatio: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float uPixelRatio;
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(aSize * uPixelRatio * 420.0 / max(-mv.z, 0.1), 160.0);
          vAlpha = aAlpha;
          vColor = aColor;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
          if (a < 0.003) discard;
          gl_FragColor = vec4(vColor, a);
        }
      `,
    })
  }

  spawn(
    at: Vector3,
    n: number,
    init: (i: number, vel: Vector3, color: Vector3) => { life: number; size: number; offset?: Vector3 },
  ) {
    const v = new Vector3()
    const c = new Vector3()
    for (let k = 0; k < n; k++) {
      const i = this.cursor
      this.cursor = (this.cursor + 1) % this.count
      v.set(0, 0, 0)
      c.set(1, 1, 1)
      const o = init(k, v, c)
      const off = o.offset
      this.pos[i * 3] = at.x + (off?.x ?? 0)
      this.pos[i * 3 + 1] = at.y + (off?.y ?? 0)
      this.pos[i * 3 + 2] = at.z + (off?.z ?? 0)
      this.vel[i * 3] = v.x
      this.vel[i * 3 + 1] = v.y
      this.vel[i * 3 + 2] = v.z
      this.color[i * 3] = c.x
      this.color[i * 3 + 1] = c.y
      this.color[i * 3 + 2] = c.z
      this.life[i] = o.life
      this.maxLife[i] = o.life
      this.baseSize[i] = o.size
    }
  }

  update(dt: number) {
    const d = Math.exp(-this.drag * dt)
    let any = false
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) {
        if (this.alpha[i] !== 0) {
          this.alpha[i] = 0
          any = true
        }
        continue
      }
      any = true
      this.life[i] -= dt
      const t = 1 - Math.max(0, this.life[i]) / this.maxLife[i]
      this.vel[i * 3] *= d
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d + this.gravity * dt
      this.vel[i * 3 + 2] *= d
      this.pos[i * 3] += this.vel[i * 3] * dt
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt
      this.size[i] = this.baseSize[i] * (1 + t * this.grow)
      this.alpha[i] = Math.sin(Math.min(1, t * 6) * Math.PI * 0.5) * (1 - t)
    }
    if (!any) return
    for (const name of ['position', 'aSize', 'aAlpha', 'aColor']) this.geometry.getAttribute(name).needsUpdate = true
  }

  clear() {
    this.life.fill(0)
    this.alpha.fill(0)
    this.geometry.getAttribute('aAlpha').needsUpdate = true
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
