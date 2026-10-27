import { useEffect } from 'react'
import { useExperience } from '../state/store'

/** Mirrors the OS "reduce motion" preference into the store. */
export function useReducedMotion() {
  const set = useExperience((s) => s.set)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const apply = () => set({ reducedMotion: mq.matches })
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [set])
  return useExperience((s) => s.reducedMotion)
}
