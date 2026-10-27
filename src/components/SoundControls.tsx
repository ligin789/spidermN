import { AnimatePresence, motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import { useAudio } from '../hooks/useAudio'
import { useExperience } from '../state/store'

/** Persistent mute/unmute toggle. */
export function SoundControls() {
  const phase = useExperience((s) => s.phase)
  const { muted, toggle } = useAudio()
  const visible = phase !== 'loading'
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="sound"
          type="button"
          onClick={toggle}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="fixed right-4 top-[max(16px,env(safe-area-inset-top))] z-[60] grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/45 text-white/85 backdrop-blur-md transition-colors hover:border-spidey-hot/70 hover:text-white sm:right-6 sm:top-6"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          {!muted && (
            <span className="pointer-events-none absolute inset-0 animate-ping rounded-full border border-spidey-hot/30 [animation-duration:2.4s]" />
          )}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
