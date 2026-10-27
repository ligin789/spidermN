/**
 * ───────────────────────────────────────────────────────────────
 *  EDIT ME — everything personal about the invitation lives here.
 * ───────────────────────────────────────────────────────────────
 */

export interface PartyDetails {
  /** Birthday hero's name, shown in the 3D title and on the end screen. */
  name: string
  /** Photo of the birthday hero, shown after the title and on the end screen. */
  photo: string
  /** The greeting as written in the on-screen subtitle. */
  greeting: string
  /** Exact words the voice says (read by the text-to-speech fallback). */
  spokenGreeting: string
  /**
   * Pre-recorded greeting files, tried in order. The first that loads wins.
   * If none load, the browser's text-to-speech reads `spokenGreeting` instead.
   * Drop your own recording into /public/audio and list it first.
   */
  greetingAudio: string[]
}

export const party: PartyDetails = {
  name: 'Ryan',
  photo: '/images/ray-baby.jpg',
  greeting: 'Happy Birthday, Ryan!',
  spokenGreeting: 'Happy Birthday, Ray Baby!',
  greetingAudio: ['/audio/happy-birthday-ray-baby.mp3', '/audio/happy-birthday-ray-baby.wav'],
}

export const NAME_UPPER = party.name.toUpperCase()
