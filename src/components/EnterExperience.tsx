import { AnimatePresence, motion } from 'framer-motion'
import { Headphones, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { director } from '../animations/director'
import { party } from '../config/party'
import { useExperience } from '../state/store'
import { HeroButton } from './ui/HeroButton'
import { SpiderGlyph } from './ui/SpiderGlyph'

/** The gate: one click unlocks audio and starts the film. */
export function EnterExperience() {
  const phase = useExperience((s) => s.phase)
  const [starting, setStarting] = useState(false)

  const start = async () => {
    if (starting) return
    setStarting(true)
    await director.begin()
  }

  return (
    <AnimatePresence>
      {phase === 'ready' && (
        <motion.div
          key="enter"
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-ink px-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 1 } }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(58,114,255,0.12),transparent_55%)]" />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.9 } }}
            className="flex flex-col items-center"
          >
            <SpiderGlyph className="h-10 w-10 text-spidey-hot drop-shadow-[0_0_12px_rgba(255,46,68,0.7)]" />
            <p className="mt-5 font-label text-xs font-semibold uppercase tracking-[0.5em] text-white/50">Incoming transmission</p>
            <h1 className="mt-3 font-display text-4xl uppercase leading-none tracking-wide text-silver sm:text-6xl">
              A mission <span className="text-hero-red">for {party.name}</span>
            </h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.8, duration: 0.8 } }}
            className="mt-10"
          >
            <HeroButton icon={<Sparkles className="h-5 w-5" />} onClick={start} disabled={starting} autoFocus>
              Enter the Spider-Verse
            </HeroButton>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1.4, duration: 1 } }}
            className="mt-6 flex items-center gap-2 font-label text-xs uppercase tracking-[0.3em] text-white/40"
          >
            <Headphones className="h-4 w-4" /> Sound on for the full experience
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
