import { AnimatePresence, motion } from 'framer-motion'
import { party } from '../config/party'
import { useExperience } from '../state/store'
import { WebCorner } from './ui/WebCorner'

// Warm the cache during loading so the photo pops in without a blank frame.
if (typeof window !== 'undefined') new Image().src = party.photo

/** Round, glowing photo with a spider-web spun behind it — reused by the end screen and the fallback. */
export function PhotoFrame({ className = '', web = true }: { className?: string; web?: boolean }) {
  return (
    <div className={`relative aspect-square ${className}`}>
      {web && (
        <div className="pointer-events-none absolute -inset-[22%] grid grid-cols-2 grid-rows-2 text-white/20">
          <WebCorner className="h-full w-full" flip="scale(-1,-1)" />
          <WebCorner className="h-full w-full" flip="scaleY(-1)" />
          <WebCorner className="h-full w-full" flip="scaleX(-1)" />
          <WebCorner className="h-full w-full" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-[-6%] rounded-full bg-spidey/45 blur-2xl" />
      <div className="relative h-full w-full rounded-full bg-[conic-gradient(from_200deg,#ff2e44,#3a72ff,#ffffff,#ff2e44)] p-[4px] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(224,24,43,0.5)]">
        <img src={party.photo} alt={party.name} draggable={false} className="h-full w-full select-none rounded-full bg-night object-cover" />
      </div>
    </div>
  )
}

/** Scene 5 — the birthday hero's photo springs in under the lifted 3D title. */
export function BirthdayPhoto() {
  const show = useExperience((s) => s.showPhoto)
  const reduced = useExperience((s) => s.reducedMotion)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="photo"
          className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center px-4 pt-[18vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
        >
          <motion.div
            initial={{ scale: 0.3, rotate: reduced ? 0 : -14, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1, transition: { type: 'spring', stiffness: 170, damping: 13 } }}
            exit={{ scale: 0.9, y: -30, opacity: 0, filter: 'blur(8px)', transition: { duration: 0.6 } }}
          >
            <motion.div
              animate={reduced ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PhotoFrame className="w-[clamp(190px,46vmin,360px)]" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
