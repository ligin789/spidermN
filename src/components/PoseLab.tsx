import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { POSE_NAMES, type PoseName } from '../animations/poses'
import { HeroCharacter } from './HeroCharacter'

/** Dev-only pose inspector: ?poselab&pose=crouch shows front + side (+ wave with &wave). */
export default function PoseLab() {
  const params = new URLSearchParams(location.search)
  const pose = (params.get('pose') ?? 'stand') as PoseName
  const wave = params.has('wave') ? 1 : 0
  const valid = POSE_NAMES.includes(pose) ? pose : 'stand'
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#2a2d36' }}>
      <Canvas camera={{ position: [0, 1.3, 6.2], fov: 38 }}>
        <hemisphereLight args={['#ffffff', '#444444', 2.2]} />
        <directionalLight position={[3, 6, 5]} intensity={2.2} />
        <gridHelper args={[20, 40, '#777', '#444']} />
        <HeroCharacter lab={{ pose: valid, position: [-1.3, 0, 0], wave }} />
        <HeroCharacter lab={{ pose: valid, position: [1.4, 0, 0], yaw: Math.PI / 2, wave }} />
        <OrbitControls target={[0, 1, 0]} />
      </Canvas>
      <div style={{ position: 'fixed', top: 8, left: 12, color: '#fff', font: '600 20px sans-serif' }}>{valid}</div>
    </div>
  )
}
