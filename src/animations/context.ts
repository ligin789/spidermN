import type { Phase } from '../state/store'

export interface SceneContext {
  /** Advance to another scene (the director kills the current timeline first). */
  next: (phase: Phase) => void
  reducedMotion: boolean
}
