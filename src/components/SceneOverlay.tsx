import { AnimatePresence, motion } from 'framer-motion'
import { ChevronsRight, Zap } from 'lucide-react'
import { director } from '../animations/director'
import { NAME_UPPER } from '../config/party'
import { useExperience } from '../state/store'
import { HeroButton } from './ui/HeroButton'

const CINEMATIC = new Set(['intro', 'arrival', 'birthday', 'finale'])

/** Everything typographic that sits over the 3D film, per scene. */
export function SceneOverlay() {
  const phase = useExperience((s) => s.phase)
  const caption = useExperience((s) => s.caption)
  const showHey = useExperience((s) => s.showHey)
  const showShoot = useExperience((s) => s.showShootButton)
  const subtitle = useExperience((s) => s.subtitle)
  const flashKey = useExperience((s) => s.flashKey)
  const showTitleFallback = useExperience((s) => s.showTitleFallback)

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {/* fade-from-black curtain, driven by GSAP in the intro timeline */}
      <div id="curtain" className="absolute inset-0 bg-black" />

      {/* letterbox bars during the opening */}
      <AnimatePresence>
        {(phase === 'intro' || phase === 'arrival') && (
          <>
            <motion.div key="lt" className="letterbox-top" initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ duration: 1.2, ease: 'easeInOut' }} />
            <motion.div key="lb" className="letterbox-bottom" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 1.2, ease: 'easeInOut' }} />
          </>
        )}
      </AnimatePresence>

      {/* Scene 1 captions */}
      <div className="absolute inset-x-0 bottom-[17vh] flex justify-center px-6 text-center" aria-live="polite">
        <AnimatePresence mode="wait">
          {caption && (
            <motion.p
              key={caption.id}
              initial={{ opacity: 0, y: 10, filter: 'blur(8px)', letterSpacing: caption.tone === 'dateline' ? '0.7em' : '0.08em' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: caption.tone === 'dateline' ? '0.45em' : '0.04em' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(6px)' }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              className={
                caption.tone === 'dateline'
                  ? 'font-label text-sm font-semibold uppercase text-white/85 sm:text-lg'
                  : 'font-body text-lg font-light italic text-white/90 sm:text-2xl'
              }
            >
              {caption.tone === 'teaser' ? (
                <>
                  Something <span className="font-display not-italic tracking-wider text-spidey-hot">AMAZING</span> is about to happen...
                </>
              ) : (
                caption.text
              )}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Scene 3: HEY, SPIDER-MAN FAN! */}
      <AnimatePresence>
        {showHey && (
          <motion.div
            key="hey"
            className="absolute inset-x-0 top-[13vh] flex flex-col items-center px-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)', transition: { duration: 0.5 } }}
          >
            <motion.h2
              initial={{ y: 30, opacity: 0, letterSpacing: '0.3em' }}
              animate={{ y: 0, opacity: 1, letterSpacing: '0.03em' }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-chrome font-display text-[clamp(2.4rem,9vw,6.5rem)] uppercase leading-none"
            >
              Hey, Spider-Man fan!
            </motion.h2>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.9, ease: 'easeOut' }}
              className="mt-4 h-[2px] w-[min(60vw,420px)] origin-center bg-gradient-to-r from-transparent via-spidey-hot to-transparent"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShoot && (
          <motion.div
            key="shoot"
            className="pointer-events-auto absolute inset-x-0 bottom-[12vh] flex justify-center px-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
          >
            <HeroButton icon={<Zap className="h-5 w-5" />} onClick={() => director.shootWeb()} autoFocus>
              Shoot web to continue
            </HeroButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DOM title if the 3D font could not load */}
      <AnimatePresence>
        {showTitleFallback && (phase === 'birthday' || phase === 'celebrate') && (
          <motion.div
            key="title-fallback"
            className="absolute inset-x-0 top-[16vh] text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: phase === 'celebrate' ? 0.3 : 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            <p className="text-hero-red font-display text-[clamp(1.8rem,6vw,4rem)] uppercase">Happy Birthday</p>
            <p className="text-chrome font-display text-[clamp(4rem,18vw,12rem)] uppercase leading-none">{NAME_UPPER}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* spoken-line subtitle */}
      <div
        className={`absolute inset-x-0 flex justify-center px-6 ${phase === 'end' ? 'bottom-[calc(max(6vh,24px)+150px)] sm:bottom-[calc(max(6vh,24px)+84px)]' : 'bottom-[17vh] sm:bottom-[10vh]'}`}
        aria-live="assertive"
      >
        <AnimatePresence>
          {subtitle && (
            <motion.p
              key="sub"
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(6px)' }}
              transition={{ duration: 0.6 }}
              className="rounded-full bg-black/45 px-6 py-3 font-display text-2xl uppercase tracking-wide text-white backdrop-blur-sm sm:text-4xl"
            >
              <span className="text-white/50">“</span>
              {subtitle}
              <span className="text-white/50">”</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* white-red flash on the web transition */}
      <AnimatePresence>
        {flashKey > 0 && (
          <motion.div
            key={flashKey}
            className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.95),rgba(255,46,68,0.6)_55%,rgba(0,0,0,0)_100%)]"
            initial={{ opacity: 0.95 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* never trap the visitor: skip any cinematic */}
      <AnimatePresence>
        {CINEMATIC.has(phase) && (
          <motion.div
            key="skip"
            className="pointer-events-auto absolute bottom-[calc(7vh+14px)] left-4 sm:left-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1.5 } }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              onClick={() => director.skip()}
              className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-4 font-label text-xs font-semibold uppercase tracking-[0.3em] text-white/70 backdrop-blur-md transition hover:border-white/40 hover:text-white"
            >
              Skip <ChevronsRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
