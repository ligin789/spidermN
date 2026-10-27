import type { Quality } from '../state/store'

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return !!gl
  } catch {
    return false
  }
}

export function detectQuality(): Quality {
  if (typeof window === 'undefined') return 'high'
  const forced = new URLSearchParams(window.location.search).get('quality')
  if (forced === 'low' || forced === 'high') return forced
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const small = Math.min(window.innerWidth, window.innerHeight) < 600
  const cores = navigator.hardwareConcurrency || 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  return coarse || small || cores <= 4 || memory <= 4 ? 'low' : 'high'
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
}
