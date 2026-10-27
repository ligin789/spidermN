import { useCallback, useEffect } from 'react'
import { audio } from '../audio/AudioEngine'
import { useExperience } from '../state/store'

const KEY = 'ryan-bday-muted'

/** Mute state, remembered per browser (best effort). */
export function useAudio() {
  const muted = useExperience((s) => s.muted)
  const set = useExperience((s) => s.set)

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === '1') set({ muted: true })
    } catch {
      /* storage unavailable — ignore */
    }
  }, [set])

  useEffect(() => {
    audio.setMuted(muted)
  }, [muted])

  const toggle = useCallback(() => {
    const next = !useExperience.getState().muted
    set({ muted: next })
    try {
      localStorage.setItem(KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [set])

  return { muted, toggle }
}
