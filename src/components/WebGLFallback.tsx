import { motion } from 'framer-motion'
import { RotateCcw, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { audio } from '../audio/AudioEngine'
import { NAME_UPPER, party } from '../config/party'
import { PhotoFrame } from './BirthdayPhoto'
import { HeroButton } from './ui/HeroButton'
import { SpiderGlyph } from './ui/SpiderGlyph'

/** 2D version for browsers without WebGL: same words, same greeting, no 3D. */
export function WebGLFallback() {
  const [speaking, setSpeaking] = useState(false)

  const greet = async () => {
    await audio.unlock()
    const seconds = audio.playGreeting()
    setSpeaking(true)
    window.setTimeout(() => setSpeaking(false), (seconds + 1.2) * 1000)
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[radial-gradient(ellipse_at_50%_110%,#1a2448_0%,#070a16_55%,#04060d_100%)]">
      <Skyline />
      <main className="relative mx-auto flex min-h-full max-w-2xl flex-col items-center px-5 py-14 text-center">
        <SpiderGlyph className="h-10 w-10 text-spidey-hot" />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 font-label text-sm uppercase tracking-[0.45em] text-white/60">
          New York City • 11:59 PM
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 1 } }}
          className="mt-6 font-display uppercase leading-none"
        >
          <span className="text-hero-red block text-[clamp(2rem,8vw,4.5rem)]">Happy Birthday</span>
          <span className="text-chrome block text-[clamp(4.5rem,22vw,10rem)]">{NAME_UPPER}</span>
        </motion.h1>
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, transition: { delay: 0.6, type: 'spring', stiffness: 170, damping: 13 } }}
          className="mt-14"
        >
          <PhotoFrame className="w-[clamp(180px,55vw,300px)]" />
        </motion.div>
        <div className="mt-10 flex flex-col items-center gap-3">
          <HeroButton icon={<Volume2 className="h-5 w-5" />} onClick={greet} disabled={speaking}>
            Play birthday greeting
          </HeroButton>
          {speaking && <p className="font-display text-2xl uppercase text-white">“{party.greeting}”</p>}
          <HeroButton variant="ghost" size="md" icon={<RotateCcw className="h-4 w-4" />} onClick={() => window.location.reload()}>
            Replay experience
          </HeroButton>
        </div>
        <p className="mt-12 font-label text-xs uppercase tracking-[0.3em] text-white/35">
          This browser can’t show the 3D version — everything important is right here.
        </p>
      </main>
    </div>
  )
}

function Skyline() {
  const towers = Array.from({ length: 28 }, (_, i) => ({ h: 18 + ((i * 37) % 45), w: 3 + ((i * 13) % 4) }))
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 flex h-[45vh] items-end gap-[2px] opacity-60">
      {towers.map((t, i) => (
        <div
          key={i}
          className="web-grain flex-1 bg-[#0b1124]"
          style={{ height: `${t.h}vh`, backgroundImage: 'radial-gradient(rgba(255,196,120,0.45) 1px, transparent 1.5px)', backgroundSize: '9px 13px' }}
        />
      ))}
    </div>
  )
}
