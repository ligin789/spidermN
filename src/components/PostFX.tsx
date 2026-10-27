import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing'
import { rig } from '../animations/rig'

/** Cinematic finishing: bloom on lights, optional depth of field, grain, vignette, ACES. */
export function PostFX({ quality }: { quality: 'high' | 'low' }) {
  const dof = useRef<DepthOfFieldEffect>(null)
  useFrame(() => {
    const e = dof.current
    if (!e) return
    if (e.target) e.target.copy(rig.focus)
    e.bokehScale = rig.dof * 3.2
  })
  const high = quality === 'high'
  return (
    <EffectComposer multisampling={high ? 4 : 0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={high ? 1.05 : 0.9} luminanceThreshold={0.82} luminanceSmoothing={0.22} radius={0.78} />
      <>{high ? <DepthOfField ref={dof} target={[0, 0, 0]} focusRange={6} bokehScale={0} resolutionScale={0.5} /> : null}</>
      <Vignette offset={0.22} darkness={0.82} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.16} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
