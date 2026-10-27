import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw, Volume2 } from 'lucide-react'
import { director } from '../animations/director'
import { NAME_UPPER } from '../config/party'
import { useExperience } from '../state/store'
import { PhotoFrame } from './BirthdayPhoto'
import { HeroButton } from './ui/HeroButton'

/** Scene 6/7 controls: the closing message, replay greeting, replay everything. */
export function FinalGreeting() {
  const phase = useExperience((s) => s.phase)
  const showFinal = useExperience((s) => s.showFinal)
  const greetingPlayed = useExperience((s) => s.greetingPlayed)
  const subtitle = useExperience((s) => s.subtitle)

  return (
    <AnimatePresence>
      {phase === 'end' && showFinal && (
        <motion.div
          key="final"
          className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-between px-5 pb-[max(6vh,24px)] pt-[9vh] text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 1.2 } }}
          exit={{ opacity: 0 }}
        >
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 180, damping: 14 } }}
              className="mb-4"
            >
              <PhotoFrame web={false} className="w-[clamp(68px,11vmin,104px)]" />
            </motion.div>
            <motion.h2
              initial={{ y: 26, opacity: 0, letterSpacing: '0.25em' }}
              animate={{ y: 0, opacity: 1, letterSpacing: '0.02em' }}
              transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-chrome font-display text-[clamp(2.2rem,8.5vw,6rem)] uppercase leading-[0.95]"
            >
              Stay amazing, <span className="text-hero-red">{NAME_UPPER}!</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.7, duration: 1 } }}
              className="mx-auto mt-4 max-w-xl font-body text-base leading-relaxed text-white/80 sm:text-lg"
            >
              Your friendly neighborhood Spider-Man wishes you the <span className="font-display tracking-wider text-white">BEST</span> birthday
              ever!
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 1.3, duration: 0.8 } }}
            className="pointer-events-auto flex flex-col items-center gap-3 sm:flex-row"
          >
            <HeroButton icon={<RotateCcw className="h-5 w-5" />} onClick={() => director.replay()}>
              Replay experience
            </HeroButton>
            {greetingPlayed && (
              <HeroButton
                variant="ghost"
                size="md"
                icon={<Volume2 className="h-4 w-4" />}
                onClick={() => director.replayGreeting()}
                disabled={!!subtitle}
              >
                Replay birthday greeting
              </HeroButton>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
