import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ExtrudeGeometry, Group, MeshStandardMaterial, Shape, Vector2 } from 'three'

/** Rotating extruded spider emblem shown while the mission loads. */
function emblemShapes() {
  const shapes: Shape[] = []
  const ellipse = (cx: number, cy: number, rx: number, ry: number) => {
    const s = new Shape()
    s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, 0)
    shapes.push(s)
  }
  ellipse(0, -0.3, 0.28, 0.55) // abdomen
  ellipse(0, 0.42, 0.22, 0.27) // thorax
  ellipse(0, 0.82, 0.13, 0.13) // head

  const segment = (a: Vector2, b: Vector2, w: number) => {
    const d = b.clone().sub(a)
    const n = new Vector2(-d.y, d.x).normalize().multiplyScalar(w / 2)
    const e = d.clone().normalize().multiplyScalar(w * 0.35)
    const a2 = a.clone().sub(e)
    const b2 = b.clone().add(e)
    const s = new Shape([a2.clone().add(n), b2.clone().add(n), b2.clone().sub(n), a2.clone().sub(n)])
    shapes.push(s)
  }
  const legs: [number, number][][] = [
    [
      [0.16, 0.55],
      [0.62, 0.95],
      [0.72, 1.55],
    ],
    [
      [0.2, 0.42],
      [0.9, 0.55],
      [1.25, 1.05],
    ],
    [
      [0.2, 0.3],
      [0.9, 0.05],
      [1.25, -0.5],
    ],
    [
      [0.16, 0.12],
      [0.62, -0.45],
      [0.78, -1.2],
    ],
  ]
  for (const side of [-1, 1]) {
    for (const leg of legs) {
      const pts = leg.map(([x, y]) => new Vector2(x * side, y))
      segment(pts[0], pts[1], 0.1)
      segment(pts[1], pts[2], 0.08)
    }
  }
  return shapes
}

function Emblem() {
  const group = useRef<Group>(null)
  const { geo, mat } = useMemo(() => {
    const g = new ExtrudeGeometry(emblemShapes(), {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.025,
      bevelSegments: 3,
      curveSegments: 24,
    })
    g.center()
    const m = new MeshStandardMaterial({ color: '#d0121f', metalness: 0.75, roughness: 0.28, emissive: '#3a0006' })
    return { geo: g, mat: m }
  }, [])
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat])
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const t = clock.elapsedTime
    g.rotation.y = t * 1.1
    g.rotation.x = Math.sin(t * 0.8) * 0.15
  })
  return (
    <group ref={group} scale={0.95}>
      <mesh geometry={geo} material={mat} />
    </group>
  )
}

export function SpiderEmblem({ className = '' }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 4.2], fov: 40 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.25} />
        <directionalLight position={[2, 3, 4]} intensity={2.2} />
        <pointLight position={[-3, 0, 2]} color="#ff2a3a" intensity={22} />
        <pointLight position={[3, -1, -2]} color="#3a72ff" intensity={30} />
        <Emblem />
      </Canvas>
    </div>
  )
}
