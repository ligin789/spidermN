import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import { WebCorner } from './ui/WebCorner'

interface Splat {
  id: number
  x: number
  y: number
}

/** A soft red ring that trails the mouse, and a tiny web splat on every click. */
export function CustomCursor() {
  const [enabled] = useState(() => window.matchMedia?.('(pointer: fine)').matches ?? false)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.6 })
  const [hover, setHover] = useState(false)
  const [splats, setSplats] = useState<Splat[]>([])

  useEffect(() => {
    if (!enabled) return
    let id = 0
    const move = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setHover(!!(e.target as HTMLElement | null)?.closest?.('button'))
    }
    const down = (e: PointerEvent) => {
      const s = { id: ++id, x: e.clientX, y: e.clientY }
      setSplats((list) => [...list.slice(-4), s])
      window.setTimeout(() => setSplats((list) => list.filter((l) => l.id !== s.id)), 900)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', down)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
    }
  }, [enabled, x, y])

  if (!enabled) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true">
      <motion.div
        className="absolute left-0 top-0 rounded-full border border-spidey-hot/70 shadow-[0_0_14px_rgba(255,46,68,0.5)]"
        style={{ x: sx, y: sy, translateX: '-50%', translateY: '-50%' }}
        animate={{ width: hover ? 46 : 26, height: hover ? 46 : 26, opacity: hover ? 1 : 0.7 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      />
      <AnimatePresence>
        {splats.map((s) => (
          <motion.div
            key={s.id}
            className="absolute text-white/70"
            style={{ left: s.x, top: s.y }}
            initial={{ scale: 0.2, opacity: 0.9, x: '-50%', y: '-50%', rotate: (s.id * 47) % 360 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
          >
            <div className="grid h-16 w-16 grid-cols-2 grid-rows-2">
              <WebCorner className="h-8 w-8" flip="scale(-1,-1)" />
              <WebCorner className="h-8 w-8" flip="scaleY(-1)" />
              <WebCorner className="h-8 w-8" flip="scaleX(-1)" />
              <WebCorner className="h-8 w-8" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
