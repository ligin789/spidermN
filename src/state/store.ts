import { create } from 'zustand'

export type Phase =
  | 'loading'
  | 'ready'
  | 'intro'
  | 'arrival'
  | 'reveal'
  | 'birthday'
  | 'celebrate'
  | 'finale'
  | 'end'

export type Quality = 'high' | 'low'

/**
 * UI-facing state only. Anything that changes every frame lives in the
 * mutable `rig` (src/animations/rig.ts) so React never re-renders mid-animation.
 */
interface ExperienceState {
  phase: Phase
  /** Scene 1 captions ("NEW YORK CITY • 11:59 PM", …). */
  caption: { id: string; text: string; tone: 'dateline' | 'teaser' } | null
  showHey: boolean
  showShootButton: boolean
  showTitleFallback: boolean
  /** Scene 5: the birthday hero's photo pops in. */
  showPhoto: boolean
  /** Spoken-line subtitle for the greeting. */
  subtitle: string | null
  greetingPlayed: boolean
  showFinal: boolean
  muted: boolean
  quality: Quality
  reducedMotion: boolean
  webglFailed: boolean
  loadProgress: number
  sceneReady: boolean
  fontReady: boolean
  flashKey: number
  set: (patch: Partial<Omit<ExperienceState, 'set'>>) => void
}

export const useExperience = create<ExperienceState>((set) => ({
  phase: 'loading',
  caption: null,
  showHey: false,
  showShootButton: false,
  showTitleFallback: false,
  showPhoto: false,
  subtitle: null,
  greetingPlayed: false,
  showFinal: false,
  muted: false,
  quality: 'high',
  reducedMotion: false,
  webglFailed: false,
  loadProgress: 0,
  sceneReady: false,
  fontReady: false,
  flashKey: 0,
  set: (patch) => set(patch),
}))

export const ui = {
  get: () => useExperience.getState(),
  set: (patch: Partial<Omit<ExperienceState, 'set'>>) => useExperience.getState().set(patch),
}
