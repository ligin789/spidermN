import { Vector3 } from 'three'

/** One-shot effect triggers (dust burst, confetti burst…) fired from timelines. */
type FxEvent =
  | { type: 'impact'; at: Vector3 }
  | { type: 'confetti'; at: Vector3; count?: number }
  | { type: 'sparks'; at: Vector3; count?: number }

type Listener = (e: FxEvent) => void
const listeners = new Set<Listener>()

export const fx = {
  emit(e: FxEvent) {
    listeners.forEach((l) => l(e))
  },
  on(l: Listener) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}
