import { party } from '../config/party'

/**
 * Procedural sound design on the Web Audio API: a cinematic score, rooftop
 * wind and city ambience, web "thwips", whooshes, the landing impact, and the
 * final spoken greeting with a slight echo. No audio files are required —
 * only the optional pre-recorded greeting. Every public method is safe to
 * call before unlock, while muted, or in browsers without Web Audio.
 */

export type Mood = 'off' | 'quiet' | 'tension' | 'hero' | 'calm'

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

type Song = Exclude<Mood, 'off' | 'quiet'>
type Note = [at: number, midi: number, length: number]

const CHORDS = {
  D: { bass: 38, notes: [50, 54, 57, 62] },
  A: { bass: 33, notes: [49, 52, 57, 61] },
  Bm: { bass: 35, notes: [50, 54, 59, 62] },
  G: { bass: 31, notes: [50, 55, 59, 62] },
}
type ChordName = keyof typeof CHORDS

const NOTE_NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** Parses a tune like "D5/2 -/2 F#5/4 |" into notes; lengths are sixteenths, "-" rests, "|" is decoration. */
function tune(src: string) {
  const out: Note[] = []
  let at = 0
  for (const tok of src.trim().split(/\s+/)) {
    const m = /^(?:-|([A-G])(#?)(\d))\/(\d+)$/.exec(tok)
    if (!m) continue
    if (m[1]) out.push([at, 12 * (Number(m[3]) + 1) + NOTE_NAMES[m[1]] + (m[2] ? 1 : 0), Number(m[4])])
    at += Number(m[4])
  }
  return new Map(out.map((n) => [n[0], n]))
}

/**
 * The score, on a sixteenth-note grid. `length` is the loop in sixteenths and
 * `start` is where a cue enters it (the birthday song begins on its pickup).
 */
const SONGS: Record<Song, { bpm: number; length: number; start: number; level: number }> = {
  tension: { bpm: 108, length: 64, start: 0, level: 0.85 },
  hero: { bpm: 124, length: 64, start: 0, level: 1 },
  calm: { bpm: 92, length: 96, start: 92, level: 0.85 },
}

/** "Swing" — a driving arpeggio build under the fly-in, one chord per bar. */
const TENSION_BARS: ChordName[] = ['Bm', 'G', 'D', 'A']

/** "Party" — bright four-on-the-floor pop with a hook, for the title reveal. */
const HERO_BARS: ChordName[] = ['D', 'A', 'Bm', 'G']
const HERO_HOOK = tune(`
  D5/2 -/2 F#5/2 -/2 A5/2 -/2 F#5/2 A5/2 |
  B5/4 A5/4 E5/8 |
  D5/2 -/2 F#5/2 -/2 B5/2 -/2 A5/2 F#5/2 |
  G5/4 F#5/4 E5/4 F#5/2 E5/2
`)

/** "Happy Birthday" (public domain) as a music-box waltz in D, 3/4, one chord per beat. */
const BIRTHDAY_BEATS = 'D D D A A A A A A D D D D D D G G G D D A D D D'.split(' ') as ChordName[]
const BIRTHDAY_TUNE = tune(`
  B4/4 A4/4 D5/4 | C#5/8 A4/3 A4/1 |
  B4/4 A4/4 E5/4 | D5/8 A4/3 A4/1 |
  A5/4 F#5/4 D5/4 | C#5/4 B4/4 G5/3 G5/1 |
  F#5/4 D5/4 E5/4 | D5/8 A4/3 A4/1
`)

class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private musicDuck!: GainNode
  private ambBus!: GainNode
  private sfxBus!: GainNode
  private voiceBus!: GainNode
  private reverb!: ConvolverNode
  private reverbSend!: GainNode
  private noise!: AudioBuffer
  private muted = false
  private greetingRaw: ArrayBuffer | null = null
  private greetingBuffer: AudioBuffer | null = null
  private ambience: { stop: () => void } | null = null
  private mood: Mood = 'off'
  private scheduler: number | null = null
  private nextStep = 0
  private step = 0
  private padStops: (() => void)[] = []
  private drone: { stop: () => void } | null = null

  get ready() {
    return !!this.ctx
  }

  /** Fetch (not decode) the optional greeting recording during loading. */
  async prefetchGreeting(): Promise<boolean> {
    for (const url of party.greetingAudio) {
      try {
        const res = await fetch(url)
        if (!res.ok) continue
        const type = res.headers.get('content-type') ?? ''
        if (type.includes('text/html')) continue // SPA fallback page, not audio
        this.greetingRaw = await res.arrayBuffer()
        return true
      } catch {
        /* try the next candidate */
      }
    }
    return false
  }

  /** Must be called from a user gesture (the Enter button). */
  async unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => undefined)
      return
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor({ latencyHint: 'interactive' })
      this.ctx = ctx
      this.build(ctx)
      await ctx.resume().catch(() => undefined)
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return
        if (document.hidden) this.ctx.suspend().catch(() => undefined)
        else this.ctx.resume().catch(() => undefined)
      })
      if (this.greetingRaw) {
        const raw = this.greetingRaw.slice(0)
        this.greetingBuffer = await ctx.decodeAudioData(raw).catch(() => null)
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[audio] unlock failed', err)
      this.ctx = null
    }
  }

  private build(ctx: AudioContext) {
    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.9
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 3
    comp.attack.value = 0.01
    comp.release.value = 0.25
    this.master.connect(comp).connect(ctx.destination)

    this.reverb = ctx.createConvolver()
    this.reverb.buffer = this.impulse(ctx, 2.6, 2.4)
    this.reverbSend = ctx.createGain()
    this.reverbSend.gain.value = 0.35
    this.reverbSend.connect(this.reverb).connect(this.master)

    this.musicDuck = ctx.createGain()
    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = 0
    this.musicBus.connect(this.musicDuck).connect(this.master)
    this.musicDuck.connect(this.reverbSend)

    this.ambBus = ctx.createGain()
    this.ambBus.gain.value = 0
    this.ambBus.connect(this.master)

    this.sfxBus = ctx.createGain()
    this.sfxBus.gain.value = 0.8
    this.sfxBus.connect(this.master)
    this.sfxBus.connect(this.reverbSend)

    // Voice: dry + slap-back echo + hall.
    this.voiceBus = ctx.createGain()
    this.voiceBus.gain.value = 1.15
    this.voiceBus.connect(this.master)
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.24
    const feedback = ctx.createGain()
    feedback.gain.value = 0.3
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 2800
    const wet = ctx.createGain()
    wet.gain.value = 0.32
    this.voiceBus.connect(delay)
    delay.connect(tone).connect(feedback).connect(delay)
    tone.connect(wet).connect(this.master)
    const hall = ctx.createGain()
    hall.gain.value = 0.55
    this.voiceBus.connect(hall).connect(this.reverbSend)

    const len = ctx.sampleRate * 2
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }

  private impulse(ctx: AudioContext, seconds: number, decay: number) {
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
    return buf
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (typeof speechSynthesis !== 'undefined' && muted) speechSynthesis.cancel()
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setTargetAtTime(muted ? 0 : 0.9, t, 0.08)
  }

  // ── helpers ──────────────────────────────────────────────────────

  private noiseSource(loop = false) {
    const src = this.ctx!.createBufferSource()
    src.buffer = this.noise
    src.loop = loop
    if (loop) src.loopStart = Math.random()
    return src
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  }

  private safe(fn: (ctx: AudioContext) => void) {
    if (!this.ctx) return
    try {
      fn(this.ctx)
    } catch {
      /* never let sound break the show */
    }
  }

  // ── ambience ─────────────────────────────────────────────────────

  startAmbience(level = 1) {
    this.safe((ctx) => {
      const t = ctx.currentTime
      this.ambBus.gain.cancelScheduledValues(t)
      this.ambBus.gain.setTargetAtTime(0.55 * level, t, 1.2)
      if (this.ambience) return

      // distant traffic rumble
      const rumble = this.noiseSource(true)
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 180
      const rg = ctx.createGain()
      rg.gain.value = 0.55
      rumble.connect(lp).connect(rg).connect(this.ambBus)

      // rooftop wind: band-passed noise with slow swells
      const wind = this.noiseSource(true)
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = 0.7
      bp.frequency.value = 500
      const wg = ctx.createGain()
      wg.gain.value = 0.18
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.07
      const lfoAmt = ctx.createGain()
      lfoAmt.gain.value = 260
      lfo.connect(lfoAmt).connect(bp.frequency)
      const lfo2 = ctx.createOscillator()
      lfo2.frequency.value = 0.11
      const lfo2Amt = ctx.createGain()
      lfo2Amt.gain.value = 0.1
      lfo2.connect(lfo2Amt).connect(wg.gain)
      wind.connect(bp).connect(wg).connect(this.ambBus)

      rumble.start()
      wind.start()
      lfo.start()
      lfo2.start()
      this.ambience = {
        stop: () => {
          for (const n of [rumble, wind, lfo, lfo2]) {
            try {
              n.stop()
            } catch {
              /* already stopped */
            }
          }
        },
      }
      const scheduleCityEvent = () => {
        window.setTimeout(() => {
          if (Math.random() > 0.45) this.horn()
          else this.siren()
          scheduleCityEvent()
        }, 5000 + Math.random() * 9000)
      }
      scheduleCityEvent()
    })
  }

  setAmbienceLevel(level: number, seconds = 1.5) {
    this.safe((ctx) => this.ambBus.gain.setTargetAtTime(0.55 * level, ctx.currentTime, seconds / 3))
  }

  private horn() {
    this.safe((ctx) => {
      const t = ctx.currentTime
      const pan = ctx.createStereoPanner()
      pan.pan.value = Math.random() * 1.6 - 0.8
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 900
      const g = ctx.createGain()
      g.gain.value = 0
      lp.connect(g).connect(pan).connect(this.ambBus)
      pan.connect(this.reverbSend)
      const honks = Math.random() > 0.5 ? 2 : 1
      for (const f of [349, 440]) {
        const o = ctx.createOscillator()
        o.type = 'square'
        o.frequency.value = f * (0.97 + Math.random() * 0.06)
        o.connect(lp)
        o.start(t)
        o.stop(t + 0.9)
      }
      for (let h = 0; h < honks; h++) {
        const s = t + h * 0.32
        g.gain.setValueAtTime(0, s)
        g.gain.linearRampToValueAtTime(0.035, s + 0.02)
        g.gain.setValueAtTime(0.035, s + 0.2)
        g.gain.linearRampToValueAtTime(0, s + 0.26)
      }
    })
  }

  private siren() {
    this.safe((ctx) => {
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      o.type = 'sine'
      const g = ctx.createGain()
      const pan = ctx.createStereoPanner()
      pan.pan.value = Math.random() > 0.5 ? 0.7 : -0.7
      o.frequency.setValueAtTime(620, t)
      for (let i = 0; i < 4; i++) {
        o.frequency.linearRampToValueAtTime(880, t + i * 1.2 + 0.6)
        o.frequency.linearRampToValueAtTime(620, t + i * 1.2 + 1.2)
      }
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.012, t + 1.5)
      g.gain.linearRampToValueAtTime(0, t + 4.8)
      o.connect(g).connect(pan).connect(this.ambBus)
      pan.connect(this.reverbSend)
      o.start(t)
      o.stop(t + 5)
    })
  }

  // ── score ────────────────────────────────────────────────────────

  setMood(mood: Mood, fade = 2) {
    this.safe((ctx) => {
      if (mood === this.mood) return
      this.mood = mood
      const t = ctx.currentTime
      const target = mood === 'off' ? 0 : mood === 'quiet' ? 0.14 : 0.3 * SONGS[mood].level
      this.musicBus.gain.cancelScheduledValues(t)
      this.musicBus.gain.setTargetAtTime(target, t, fade / 3)
      // The low drone belongs to the night-time build; the party and the birthday song play without it.
      const wantsDrone = mood === 'tension' || mood === 'quiet'
      if (wantsDrone && !this.drone) this.startDrone()
      if (!wantsDrone && this.drone) {
        this.drone.stop()
        this.drone = null
      }
      if (mood === 'off' || mood === 'quiet') {
        this.stopScheduler()
        return
      }
      this.step = SONGS[mood].start
      this.nextStep = Math.max(this.nextStep, ctx.currentTime + 0.1)
      this.startScheduler()
    })
  }

  /** Temporarily lower the music (e.g. under the spoken greeting). */
  duck(level: number, seconds = 1.5) {
    this.safe((ctx) => {
      const t = ctx.currentTime
      this.musicDuck.gain.cancelScheduledValues(t)
      this.musicDuck.gain.setTargetAtTime(level, t, seconds / 3)
    })
  }

  private startDrone() {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.value = 0
    g.gain.setTargetAtTime(0.25, ctx.currentTime, 1.5)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 260
    const oscs = [midi(26), midi(38), midi(38) * 1.003].map((f, i) => {
      const o = ctx.createOscillator()
      o.type = i === 0 ? 'sine' : 'sawtooth'
      o.frequency.value = f
      o.connect(lp)
      o.start()
      return o
    })
    lp.connect(g).connect(this.musicBus)
    this.drone = {
      stop: () => {
        const t = ctx.currentTime
        g.gain.setTargetAtTime(0, t, 0.6)
        oscs.forEach((o) => o.stop(t + 3))
      },
    }
  }

  private startScheduler() {
    if (this.scheduler !== null) return
    this.scheduler = window.setInterval(() => this.tick(), 50)
  }

  private stopScheduler() {
    if (this.scheduler !== null) window.clearInterval(this.scheduler)
    this.scheduler = null
    const stops = this.padStops
    this.padStops = []
    stops.forEach((s) => s())
  }

  private tick() {
    const ctx = this.ctx
    if (!ctx || this.mood === 'off' || this.mood === 'quiet') return
    const song = SONGS[this.mood]
    const sixteenth = 60 / song.bpm / 4
    while (this.nextStep < ctx.currentTime + 0.25) {
      const at = this.step % song.length
      const loop = Math.floor(this.step / song.length)
      if (this.mood === 'tension') this.playTension(at, loop, this.nextStep, sixteenth)
      else if (this.mood === 'hero') this.playParty(at, loop, this.nextStep, sixteenth)
      else this.playBirthdaySong(at, loop, this.nextStep, sixteenth)
      this.nextStep += sixteenth
      this.step++
    }
  }

  private playTension(at: number, loop: number, t: number, s16: number) {
    const chord = CHORDS[TENSION_BARS[Math.floor(at / 16)]]
    const i = at % 16
    if (i === 0) {
      this.pad(chord.notes.slice(0, 3), t, s16 * 16, 1200)
      this.pluck(midi(chord.bass), t, s16 * 14, 0.13, 420)
    }
    // sixteenth-note arpeggio whose filter opens across the four bars
    const tones = chord.notes.map((n) => n + 12)
    const arp = [0, 1, 2, 3, 2, 1, 2, 3][i % 8]
    this.pluck(midi(tones[arp]), t, s16 * 0.9, i % 4 === 0 ? 0.075 : 0.045, 900 + 1700 * (at / 64))
    if (i === 0 || i === 10) this.kick(t, 0.5)
    if (at >= 48 && (i === 12 || i === 14)) this.kick(t, 0.32, 210, 95)
    if (loop > 0 && (i === 4 || i === 12)) this.snare(t)
    if (i % 4 === 2) this.hat(t, false, 0.022)
  }

  private playParty(at: number, loop: number, t: number, s16: number) {
    const chord = CHORDS[HERO_BARS[Math.floor(at / 16)]]
    const i = at % 16
    if (i === 0) this.pad(chord.notes, t, s16 * 16, 2200, 0.06)
    if (i % 4 === 0) this.kick(t, 0.6)
    if (i === 4 || i === 12) this.clap(t)
    if (i % 4 === 2) this.hat(t, true, 0.035)
    else if (i % 2 === 1) this.hat(t, false, 0.016)
    if (i % 2 === 0) {
      // octave-bouncing disco bass
      const root = chord.bass < 36 ? chord.bass + 12 : chord.bass
      this.pluck(midi(i % 4 === 0 ? root : root + 12), t, s16 * 1.6, 0.12, 950)
    }
    if (i === 6 || i === 14) this.stab(chord.notes.map((n) => n + 12), t, s16 * 1.5)
    const note = HERO_HOOK.get(at)
    if (note) this.lead(midi(note[1]), t, note[2] * s16, 0.05)
    if (loop > 0 && i % 2 === 0) this.bell(midi(chord.notes[(i / 2) % 4] + 24), t, 0.014, 0.35)
  }

  private playBirthdaySong(at: number, loop: number, t: number, s16: number) {
    const chord = CHORDS[BIRTHDAY_BEATS[Math.floor(at / 4)]]
    if (at % 12 === 0) {
      this.pad(chord.notes.slice(0, 3), t, s16 * 12, 1100, 0.04)
      this.pluck(midi(chord.bass + 12), t, s16 * 10, 0.08, 380)
    } else if (at % 4 === 0) {
      // the "pah-pah" of the waltz
      for (const n of chord.notes.slice(1, 3)) this.bell(midi(n + 12), t, 0.012, 0.5)
    }
    const note = BIRTHDAY_TUNE.get(at)
    if (!note) return
    this.bell(midi(note[1] + 12), t, 0.065, 1.8)
    if (loop % 2 === 0) this.bell(midi(note[1]), t, 0.03, 1.3)
  }

  private pad(notes: number[], t: number, dur: number, cutoff: number, peak = 0.09) {
    const ctx = this.ctx!
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(cutoff * 0.6, t)
    lp.frequency.linearRampToValueAtTime(cutoff, t + dur * 0.5)
    lp.frequency.linearRampToValueAtTime(cutoff * 0.7, t + dur)
    lp.Q.value = 0.6
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak, t + Math.min(1.4, dur * 0.3))
    g.gain.setValueAtTime(peak, t + dur - 0.2)
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.6)
    lp.connect(g).connect(this.musicBus)
    const oscs: OscillatorNode[] = []
    for (const n of notes) {
      for (const detune of [-7, 7]) {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = midi(n)
        o.detune.value = detune
        o.connect(lp)
        o.start(t)
        o.stop(t + dur + 1.8)
        oscs.push(o)
      }
    }
    this.padStops.push(() => {
      const now = ctx.currentTime
      g.gain.cancelScheduledValues(now)
      g.gain.setTargetAtTime(0, now, 0.5)
      oscs.forEach((o) => {
        try {
          o.stop(now + 2)
        } catch {
          /* already ended */
        }
      })
    })
    if (this.padStops.length > 6) this.padStops.splice(0, this.padStops.length - 6)
  }

  private pluck(freq: number, t: number, dur: number, vol: number, cutoff: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = freq
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(cutoff * 1.6, t)
    lp.frequency.exponentialRampToValueAtTime(Math.max(120, cutoff * 0.3), t + dur)
    const g = ctx.createGain()
    this.env(g, t, vol, 0.006, dur)
    o.connect(lp).connect(g).connect(this.musicBus)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  /** Punchy pitch-dropping kick; higher `from`/`to` makes a tom for fills. */
  private kick(t: number, vol: number, from = 150, to = 45) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(from, t)
    o.frequency.exponentialRampToValueAtTime(to, t + 0.12)
    const g = ctx.createGain()
    this.env(g, t, vol, 0.004, 0.38)
    o.connect(g).connect(this.musicBus)
    o.start(t)
    o.stop(t + 0.45)
  }

  private snare(t: number) {
    const ctx = this.ctx!
    const n = this.noiseSource()
    const hp = ctx.createBiquadFilter()
    hp.type = 'bandpass'
    hp.frequency.value = 1800
    hp.Q.value = 0.8
    const g = ctx.createGain()
    this.env(g, t, 0.07, 0.004, 0.22)
    n.connect(hp).connect(g).connect(this.musicBus)
    n.start(t, Math.random())
    n.stop(t + 0.3)
  }

  /** Hand clap: three quick noise slaps and a short tail. */
  private clap(t: number) {
    const ctx = this.ctx!
    const n = this.noiseSource()
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1300
    bp.Q.value = 0.9
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    for (const d of [0, 0.011, 0.022]) {
      g.gain.setValueAtTime(0.16, t + d)
      g.gain.exponentialRampToValueAtTime(0.03, t + d + 0.009)
    }
    g.gain.setValueAtTime(0.13, t + 0.033)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
    n.connect(bp).connect(g).connect(this.musicBus)
    n.start(t, Math.random())
    n.stop(t + 0.25)
  }

  private hat(t: number, open: boolean, vol: number) {
    const ctx = this.ctx!
    const n = this.noiseSource()
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 7200
    const g = ctx.createGain()
    this.env(g, t, vol, 0.002, open ? 0.16 : 0.04)
    n.connect(hp).connect(g).connect(this.musicBus)
    n.start(t, Math.random())
    n.stop(t + (open ? 0.2 : 0.06))
  }

  /** Short bright chord on the off-beat. */
  private stab(notes: number[], t: number, dur: number) {
    const ctx = this.ctx!
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(3200, t)
    lp.frequency.exponentialRampToValueAtTime(900, t + dur)
    const g = ctx.createGain()
    this.env(g, t, 0.05, 0.005, dur)
    lp.connect(g).connect(this.musicBus)
    for (const n of notes) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = midi(n)
      o.connect(lp)
      o.start(t)
      o.stop(t + dur + 0.05)
    }
  }

  /** The party hook's voice: a soft square lead with a late vibrato. */
  private lead(freq: number, t: number, dur: number, vol: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.type = 'square'
    o.frequency.value = freq
    const vib = ctx.createOscillator()
    vib.frequency.value = 5.5
    const vibAmt = ctx.createGain()
    vibAmt.gain.setValueAtTime(0, t)
    vibAmt.gain.linearRampToValueAtTime(freq * 0.006, t + Math.max(0.05, dur))
    vib.connect(vibAmt).connect(o.frequency)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2800
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
    g.gain.setTargetAtTime(vol * 0.6, t + 0.05, 0.08)
    g.gain.setTargetAtTime(0.0001, t + dur * 0.92, 0.04)
    o.connect(lp).connect(g).connect(this.musicBus)
    o.start(t)
    vib.start(t)
    o.stop(t + dur + 0.3)
    vib.stop(t + dur + 0.3)
  }

  private bell(freq: number, t: number, vol: number, decay: number, out?: AudioNode) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    this.env(g, t, vol, 0.004, decay)
    g.connect(out ?? this.musicBus)
    for (const [ratio, amp] of [
      [1, 1],
      [2.01, 0.35],
      [3.02, 0.12],
    ]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq * ratio
      const og = ctx.createGain()
      og.gain.value = amp
      o.connect(og).connect(g)
      o.start(t)
      o.stop(t + decay + 0.1)
    }
  }

  // ── effects ──────────────────────────────────────────────────────

  thwip(pan = 0.3) {
    this.safe((ctx) => {
      const t = ctx.currentTime
      const p = ctx.createStereoPanner()
      p.pan.value = pan
      p.connect(this.sfxBus)
      const n = this.noiseSource()
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = 5
      bp.frequency.setValueAtTime(5200, t)
      bp.frequency.exponentialRampToValueAtTime(900, t + 0.16)
      const g = ctx.createGain()
      this.env(g, t, 0.55, 0.004, 0.17)
      n.connect(bp).connect(g).connect(p)
      n.start(t, Math.random())
      n.stop(t + 0.25)
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.setValueAtTime(2400, t)
      o.frequency.exponentialRampToValueAtTime(380, t + 0.12)
      const og = ctx.createGain()
      this.env(og, t, 0.12, 0.002, 0.11)
      o.connect(og).connect(p)
      o.start(t)
      o.stop(t + 0.15)
    })
  }

  whoosh(duration = 0.9, from = -0.7, to = 0.7, vol = 0.5) {
    this.safe((ctx) => {
      const t = ctx.currentTime
      const n = this.noiseSource()
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = 1.1
      bp.frequency.setValueAtTime(260, t)
      bp.frequency.exponentialRampToValueAtTime(1900, t + duration * 0.55)
      bp.frequency.exponentialRampToValueAtTime(380, t + duration)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(vol, t + duration * 0.5)
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
      const p = ctx.createStereoPanner()
      p.pan.setValueAtTime(from, t)
      p.pan.linearRampToValueAtTime(to, t + duration)
      n.connect(bp).connect(g).connect(p).connect(this.sfxBus)
      n.start(t, Math.random())
      n.stop(t + duration + 0.05)
    })
  }

  impact() {
    this.safe((ctx) => {
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(110, t)
      o.frequency.exponentialRampToValueAtTime(30, t + 0.45)
      const og = ctx.createGain()
      this.env(og, t, 1, 0.005, 0.8)
      o.connect(og).connect(this.sfxBus)
      o.start(t)
      o.stop(t + 0.9)
      const n = this.noiseSource()
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(1400, t)
      lp.frequency.exponentialRampToValueAtTime(200, t + 0.5)
      const ng = ctx.createGain()
      this.env(ng, t, 0.7, 0.003, 0.55)
      n.connect(lp).connect(ng).connect(this.sfxBus)
      n.start(t, Math.random())
      n.stop(t + 0.7)
      // gravel crunch
      const c = this.noiseSource()
      const hp = ctx.createBiquadFilter()
      hp.type = 'bandpass'
      hp.frequency.value = 2600
      hp.Q.value = 1.5
      const cg = ctx.createGain()
      this.env(cg, t + 0.02, 0.2, 0.002, 0.3)
      c.connect(hp).connect(cg).connect(this.sfxBus)
      c.start(t, Math.random())
      c.stop(t + 0.4)
    })
  }

  riser(duration = 2.5) {
    this.safe((ctx) => {
      const t = ctx.currentTime
      const n = this.noiseSource()
      const hp = ctx.createBiquadFilter()
      hp.type = 'bandpass'
      hp.Q.value = 2
      hp.frequency.setValueAtTime(300, t)
      hp.frequency.exponentialRampToValueAtTime(5000, t + duration)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.28, t + duration)
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.25)
      n.connect(hp).connect(g).connect(this.sfxBus)
      n.start(t, Math.random())
      n.stop(t + duration + 0.3)
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(110, t)
      o.frequency.exponentialRampToValueAtTime(440, t + duration)
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1200
      const og = ctx.createGain()
      og.gain.setValueAtTime(0.0001, t)
      og.gain.exponentialRampToValueAtTime(0.06, t + duration)
      og.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.2)
      o.connect(lp).connect(og).connect(this.sfxBus)
      o.start(t)
      o.stop(t + duration + 0.3)
    })
  }

  /** Soft web stretch shimmer for the spreading web. */
  shimmer(duration = 2.2) {
    this.safe((ctx) => {
      const t = ctx.currentTime
      for (let i = 0; i < 7; i++) {
        const f = midi(86 + [0, 3, 7, 10, 12, 15, 19][i])
        this.bell(f, t + i * (duration / 8), 0.03, 1.4, this.sfxBus)
      }
      const n = this.noiseSource()
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 6000
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.05, t + duration * 0.6)
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
      n.connect(hp).connect(g).connect(this.sfxBus)
      n.start(t, Math.random())
      n.stop(t + duration + 0.1)
    })
  }

  chime(index: number) {
    this.safe((ctx) => {
      const scale = [74, 78, 81, 86, 90, 93]
      this.bell(midi(scale[index % scale.length]), ctx.currentTime, 0.12, 1.6, this.sfxBus)
    })
  }

  celebrate() {
    this.safe((ctx) => {
      const t = ctx.currentTime
      ;[74, 78, 81, 86, 90].forEach((n, i) => this.bell(midi(n), t + i * 0.07, 0.11, 1.8, this.sfxBus))
      for (let i = 0; i < 14; i++) this.bell(midi(96 + Math.floor(Math.random() * 12)), t + 0.25 + Math.random() * 1.2, 0.025, 0.5, this.sfxBus)
      this.pop()
    })
  }

  pop() {
    this.safe((ctx) => {
      const t = ctx.currentTime
      const n = this.noiseSource()
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 900
      const g = ctx.createGain()
      this.env(g, t, 0.5, 0.002, 0.14)
      n.connect(hp).connect(g).connect(this.sfxBus)
      n.start(t, Math.random())
      n.stop(t + 0.2)
      const o = ctx.createOscillator()
      o.frequency.setValueAtTime(700, t)
      o.frequency.exponentialRampToValueAtTime(160, t + 0.12)
      const og = ctx.createGain()
      this.env(og, t, 0.25, 0.002, 0.14)
      o.connect(og).connect(this.sfxBus)
      o.start(t)
      o.stop(t + 0.2)
    })
  }

  // ── the greeting ─────────────────────────────────────────────────

  /**
   * Plays the spoken greeting ("Happy Birthday, Ray Baby!") once. Resolves with the line's length in
   * seconds (an estimate for speech synthesis).
   */
  playGreeting(): number {
    if (this.ctx && this.greetingBuffer) {
      try {
        const src = this.ctx.createBufferSource()
        src.buffer = this.greetingBuffer
        src.connect(this.voiceBus)
        src.start(this.ctx.currentTime + 0.05)
        return this.greetingBuffer.duration
      } catch {
        /* fall through to speech */
      }
    }
    return this.speak()
  }

  private speak(): number {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return 1.8
    try {
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(party.spokenGreeting)
      const voices = speechSynthesis.getVoices()
      const preferred = ['Daniel', 'Google UK English Male', 'Google US English', 'Microsoft Guy', 'Microsoft Ryan', 'Aaron', 'Alex', 'Samantha']
      u.voice =
        preferred.map((p) => voices.find((v) => v.name.includes(p))).find(Boolean) ??
        voices.find((v) => v.lang.startsWith('en')) ??
        null
      u.rate = 1.0
      u.pitch = 1.05
      u.volume = this.muted ? 0 : 1
      speechSynthesis.speak(u)
    } catch {
      /* speech is optional */
    }
    return 1.8
  }

  /** Stop music and one-shots (used on replay). Ambience keeps running. */
  reset() {
    this.setMood('off', 0.5)
    this.duck(1, 0.3)
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  }
}

export const audio = new AudioEngine()
