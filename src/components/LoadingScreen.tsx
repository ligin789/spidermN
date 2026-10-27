import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { useExperience } from '../state/store'
import { SpiderEmblem } from './SpiderEmblem'

/** Mission-prep loader: rotating 3D emblem, thin red progress line, live percentage. */
export function LoadingScreen() {
  const phase = useExperience((s) => s.phase)
  const progress = useExperience((s) => s.loadProgress)
  const spring = useSpring(0, { stiffness: 60, damping: 18 })
  const width = useTransform(spring, (v) => `${Math.round(v * 100)}%`)
  const label = useTransform(spring, (v) => `${String(Math.round(v * 100)).padStart(2, '0')}%`)

  useEffect(() => {
    spring.set(progress)
  }, [progress, spring])

  return (
    <AnimatePresence>
      {phase === 'loading' && (
        <motion.div
          key="loader"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.9, ease: 'easeInOut' } }}
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(224,24,43,0.12),transparent_60%)]" />
          <SpiderEmblem className="h-40 w-40 sm:h-48 sm:w-48" />
          <p className="mt-6 font-label text-[13px] font-semibold uppercase tracking-[0.42em] text-silver/80 sm:text-sm">
            Preparing your birthday mission...
          </p>
          <div className="mt-5 h-px w-56 overflow-hidden bg-white/10 sm:w-72">
            <motion.div className="h-full bg-spidey-hot shadow-[0_0_12px_rgba(255,46,68,0.9)]" style={{ width }} />
          </div>
          <motion.span className="mt-3 font-label text-xs tabular-nums tracking-[0.3em] text-white/40">{label}</motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
