import gsap from 'gsap'
import { audio } from '../audio/AudioEngine'
import { ui, type Phase } from '../state/store'
import { birthdayReveal } from './birthdayReveal'
import type { SceneContext } from './context'
import { finaleEnd, finalGreeting, replayGreetingTimeline } from './finalGreeting'
import { heroEntrance } from './heroEntrance'
import { introTimeline } from './introTimeline'
import { celebrateTimeline } from './celebrate'
import { resetRig, rig, WORLD } from './rig'
import { shootWebTimeline, webReveal } from './webReveal'

type Factory = (ctx: SceneContext) => gsap.core.Timeline

const SCENES: Partial<Record<Phase, Factory>> = {
  intro: introTimeline,
  arrival: heroEntrance,
  reveal: webReveal,
  birthday: birthdayReveal,
  celebrate: celebrateTimeline,
  finale: finalGreeting,
  end: finaleEnd,
}

/** Where "skip" jumps to from each cinematic scene. */
const SKIP_TO: Partial<Record<Phase, Phase>> = {
  intro: 'reveal',
  arrival: 'reveal',
  birthday: 'celebrate',
  finale: 'end',
}

let main: gsap.core.Timeline | null = null
let side: gsap.core.Timeline | null = null

const ctx: SceneContext = {
  next: (phase) => director.go(phase),
  get reducedMotion() {
    return ui.get().reducedMotion
  },
}

function killAll() {
  main?.kill()
  side?.kill()
  main = side = null
}

export const director = {
  go(phase: Phase) {
    killAll()
    ui.set({
      phase,
      caption: null,
      showHey: false,
      showShootButton: false,
      showPhoto: false,
      showFinal: false,
      subtitle: null,
      showTitleFallback: phase === 'birthday' || phase === 'celebrate' ? ui.get().showTitleFallback : false,
    })
    if (phase !== 'intro') gsap.set('#curtain', { opacity: 0 })
    const factory = SCENES[phase]
    if (factory) main = factory(ctx)
  },

  /** First run, called from the Enter button. */
  async begin() {
    await audio.unlock()
    audio.setMuted(ui.get().muted)
    resetRig()
    director.go('intro')
  },

  skip() {
    const target = SKIP_TO[ui.get().phase]
    if (!target) return
    audio.whoosh(0.7, 0, 0, 0.3)
    if (target === 'reveal') {
      // Land him instantly so the reveal starts from the rooftop.
      rig.hero.visible = true
      rig.camera.pos.copy(WORLD.roofCam)
      rig.camera.snap = true
      rig.env.fog = 0.0027
      rig.env.windows = 1
      audio.startAmbience(1)
    }
    director.go(target)
  },

  shootWeb() {
    if (ui.get().phase !== 'reveal') return
    main?.kill()
    main = shootWebTimeline(ctx)
  },

  replayGreeting() {
    side?.kill()
    side = replayGreetingTimeline()
  },

  /** Dev helper: jump to a scene and freeze it `time` seconds in. */
  seek(phase: Phase, time: number) {
    resetRig()
    director.go(phase)
    main?.pause(time)
  },

  resume() {
    main?.play()
  },

  replay() {
    killAll()
    audio.reset()
    resetRig()
    ui.set({ greetingPlayed: false, showTitleFallback: false, showPhoto: false })
    director.go('intro')
  },
}
