# Ryan's Birthday Mission

A cinematic 3D birthday invitation: night-time New York, an original web-slinging
hero who swings in and lands on a rooftop, a 3D "HAPPY BIRTHDAY RYAN" reveal, the
birthday boy's photo popping in with confetti, and a spoken "Happy Birthday, Ray Baby!"
to finish (the subtitle reads "Happy Birthday, Ryan!").

Built with React, Vite, TypeScript, Three.js, React Three Fiber, drei,
postprocessing, GSAP, Framer Motion, Tailwind CSS and Lucide.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

## Make it yours

Everything personal lives in **`src/config/party.ts`**:

| Field | What it does |
| --- | --- |
| `name` | Name in the 3D title and on the end screen |
| `photo` | The birthday photo (`public/images/ray-baby.jpg`, a square crop) |
| `greeting` | The greeting as written in the subtitle |
| `spokenGreeting` | The words the voice says, used by the text-to-speech fallback |
| `greetingAudio` | Recordings tried in order before falling back to speech |

If you change `spokenGreeting`, also re-record the greeting (below) so the voice matches.

### The greeting voice

`public/audio/happy-birthday-ray-baby.wav` is pre-rendered with the macOS speech
engine (voice "Daniel") so every browser hears the same line. It is played
through a slight echo and reverb. To replace it:

- drop your own recording at `public/audio/happy-birthday-ray-baby.mp3` (it is
  tried first), or
- re-render with `npm run make:voice` (macOS only; `VOICE=Samantha npm run make:voice`
  picks another voice).

If no file loads, the browser's speech synthesis reads `spokenGreeting` instead.
No celebrity or film actor voices the line.

### The 3D title font

`public/fonts/anton.typeface.json` is generated from the Anton webfont (SIL Open
Font License) by `npm run make:font`. Add characters to `scripts/make-typeface.mjs`
if the name needs any outside A–Z.

## How it's put together

```
src/
  config/party.ts          editable party details
  state/store.ts           UI state (zustand) — phases, captions, buttons, mute
  animations/
    rig.ts                 mutable values GSAP writes and the 3D scene reads each frame
    director.ts            runs one scene timeline at a time; skip, replay, buttons
    introTimeline.ts       Scene 1  dateline, fog reveal, fly up the avenue
    heroEntrance.ts        Scene 2  web, two swings, twisting flip, landing
    webReveal.ts           Scene 3  "HEY, SPIDER-MAN FAN!", glowing web, shoot web
    birthdayReveal.ts      Scene 4  HAPPY BIRTHDAY + name pulled in by webs
    celebrate.ts           Scene 5  the photo pops in with a confetti cannon
    finalGreeting.ts       Scenes 6–7  the turn, wave and greeting; the perch
    heroPath.ts            pendulum/ballistic swing path (pure function of time)
    poses.ts               joint-angle pose library for the procedural hero
  audio/AudioEngine.ts     Web Audio score (a driving build, a party track, and a
                           music-box "Happy Birthday"), ambience, effects, voice + echo
  components/              Canvas scene parts (city, rooftop, hero, webs, title,
                           celebration, post-processing) and the HTML overlays
  three/                   procedural textures, city layout, shaders, geometry
```

Everything visual is procedural: the skyline, window lighting, suit textures,
webs, balloons and particles are generated in code, and all sound except the
greeting is synthesised, so there are no large assets to download.

## Behaviour notes

- Sound starts only after **Enter the Spider-Verse** (browser autoplay rules).
  The mute button is always available; the choice is remembered per browser.
- Every cinematic scene has a **Skip** button; the end screen offers
  **Replay experience** and **Replay birthday greeting**.
- Phones and low-power devices get a lighter tier automatically (fewer
  buildings and particles, no shadows or depth of field). Force a tier with
  `?quality=low` or `?quality=high`.
- `prefers-reduced-motion` turns off camera shake, parallax and the card float.
- Without WebGL, a 2D version shows the title, photo and greeting button.

## Development helpers (dev server only)

- `?poselab&pose=crouch` shows one hero pose from the front and side
  (`stand`, `swing`, `soar`, `tuck`, `land`, `crouch`, `perch`; add `&wave`).
- `window.__spidey.director.seek('birthday', 4)` freezes any scene at a time;
  `.resume()` plays on.
