import { AdditiveBlending, BackSide, Color, ShaderMaterial, Vector3 } from 'three'

/**
 * Shared uniforms so a single GSAP tween (fog, window lights…) updates every
 * city material at once.
 */
export const FOG_COLOR = new Color('#192040')
export const cityUniforms = {
  uTime: { value: 0 },
  uFogColor: { value: FOG_COLOR },
  uFogDensity: { value: 0.0026 },
  uWindows: { value: 1 },
  uMoonDir: { value: new Vector3(-0.42, 0.3, -1).normalize() },
}

const FOG_GLSL = /* glsl */ `
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  vec3 applyFog(vec3 col, vec3 worldPos) {
    float dist = length(worldPos - cameraPosition);
    float f = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    float ground = exp(-max(worldPos.y, 0.0) * 0.022) * (1.0 - exp(-dist * 0.005));
    f = clamp(f + ground * 0.6, 0.0, 1.0);
    return mix(col, uFogColor, f);
  }
`

const HASH_GLSL = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
`

export function createBuildingMaterial() {
  return new ShaderMaterial({
    uniforms: cityUniforms,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aCrown;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vSeed;
      varying float vCrown;
      varying float vTop;
      varying float vBase;
      void main() {
        vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vSeed = aSeed;
        vCrown = aCrown;
        vBase = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).y;
        vTop = (modelMatrix * instanceMatrix * vec4(0.0, 1.0, 0.0, 1.0)).y;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uWindows;
      uniform vec3 uMoonDir;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vSeed;
      varying float vCrown;
      varying float vTop;
      varying float vBase;
      ${HASH_GLSL}
      ${FOG_GLSL}

      void main() {
        vec3 n = normalize(vNormalW);
        float tone = hash12(vec2(vSeed * 91.7, 3.1));
        vec3 base = mix(vec3(0.014, 0.018, 0.032), vec3(0.03, 0.034, 0.05), tone);
        vec3 col = base;

        // moonlit edge + faint warm bounce from the street
        col += vec3(0.05, 0.07, 0.13) * max(dot(n, -uMoonDir * vec3(1.0, 0.0, 1.0)), 0.0) * 0.35;
        col += vec3(0.16, 0.08, 0.03) * exp(-max(vWorld.y, 0.0) * 0.07) * 0.25;

        if (abs(n.y) < 0.5) {
          vec2 f = abs(n.x) > 0.5 ? vec2(vWorld.z, vWorld.y) : vec2(vWorld.x, vWorld.y);
          float style = hash12(vec2(vSeed * 13.0, 7.0));
          bool curtain = style > 0.72;
          vec2 cell = curtain
            ? vec2(mix(1.3, 1.7, hash12(vec2(vSeed, 2.0))), mix(3.4, 3.9, hash12(vec2(vSeed, 5.0))))
            : vec2(mix(1.5, 2.1, style), mix(3.1, 3.6, hash12(vec2(vSeed, 5.0))));
          vec2 g = f / cell;
          vec2 id = floor(g);
          vec2 fr = fract(g);
          vec2 fw = fwidth(g);
          float aa = max(fw.x, fw.y);

          // window opening (curtain walls are nearly all glass)
          float wx0 = curtain ? 0.05 : 0.2;
          float wy0 = curtain ? 0.1 : 0.24;
          float wy1 = curtain ? 0.92 : 0.8;
          float wx = smoothstep(wx0, wx0 + fw.x, fr.x) * (1.0 - smoothstep(1.0 - wx0 - fw.x, 1.0 - wx0, fr.x));
          float wy = smoothstep(wy0, wy0 + fw.y, fr.y) * (1.0 - smoothstep(wy1 - fw.y, wy1, fr.y));
          float win = wx * wy;
          // central mullion splits each window into two panes
          float mull = 1.0 - (smoothstep(0.47 - fw.x, 0.47, fr.x) * (1.0 - smoothstep(0.53, 0.53 + fw.x, fr.x))) * 0.85;
          // structural piers: every few bays is solid masonry
          float bays = floor(mix(3.0, 6.0, hash12(vec2(vSeed, 11.0))));
          float pier = curtain ? 1.0 : step(0.5, mod(id.x, bays));
          win *= pier;
          // cornice: no windows right under the roofline, solid plinth at street level
          float cornice = step(vWorld.y, vTop - 2.2);
          float groundFloors = step(vBase + 4.5, vWorld.y);
          win *= cornice;

          float faceId = n.x * 3.0 + n.z * 7.0;
          float floorRand = hash12(vec2(id.y, vSeed * 37.0 + faceId));
          float r = hash12(id + vec2(vSeed * 113.0 + faceId, faceId * 17.0));
          float litProb = mix(0.06, 0.48, floorRand * floorRand) * mix(0.7, 1.1, style);
          float lit = step(r, litProb) * step(r, uWindows * 0.62);

          float warmth = hash12(id * 1.7 + vSeed);
          vec3 wc = warmth > 0.86 ? vec3(0.55, 0.72, 1.0)
                  : warmth > 0.78 ? vec3(1.0, 0.86, 0.66)
                  : mix(vec3(1.0, 0.5, 0.2), vec3(1.0, 0.74, 0.42), warmth);
          float bright = mix(0.45, 1.5, hash12(id + 3.3));
          bright *= 1.0 - 0.6 * step(0.996, r + 0.004 * sin(uTime * 7.0 + id.x));
          // interior: brighter ceiling, some blinds half-drawn
          float interior = 0.7 + 0.45 * smoothstep(wy0, wy1, fr.y);
          float blinds = step(0.62, hash12(id + 9.1));
          interior *= mix(1.0, 0.55 + 0.45 * step(0.5, fract(fr.y * 11.0)), blinds * step(0.55, fr.y));

          vec3 lightCol = wc * bright * interior * lit;
          vec3 sky = vec3(0.025, 0.035, 0.07) * (0.6 + 0.8 * fr.y);
          vec3 darkGlass = curtain ? sky * 1.3 : sky;
          vec3 windowCol = mix(darkGlass, lightCol, lit) * mull;

          // masonry: subtle floor bands and vertical gradient
          vec3 wall = base * (0.85 + 0.3 * smoothstep(0.0, 0.08, abs(fr.y - 0.02)));
          wall *= 0.9 + 0.25 * smoothstep(vBase, vTop, vWorld.y);

          float detail = 1.0 - smoothstep(0.35, 0.9, aa);
          vec3 avg = wall * 0.6 + wc * litProb * min(uWindows * 0.62, 1.0) * 0.22 * (curtain ? 1.2 : 0.75);
          col = mix(col, mix(avg, mix(wall, windowCol, win), detail), groundFloors);

          // street-level storefront glow
          col += vec3(0.9, 0.55, 0.25) * (1.0 - groundFloors) * smoothstep(1.0, 3.0, vWorld.y - vBase) * 0.22 * step(0.4, style);
        }

        // crown lights on landmark tops
        if (vCrown > 0.5) {
          float band = smoothstep(vTop - 7.0, vTop - 1.0, vWorld.y) * step(abs(n.y), 0.5);
          vec3 cc = vCrown < 1.5 ? vec3(2.4, 0.18, 0.22) : vCrown < 2.5 ? vec3(0.3, 0.6, 2.6) : vec3(2.2, 1.7, 1.1);
          col += cc * band * (0.85 + 0.15 * sin(uTime * 1.5 + vSeed * 20.0));
        }

        col = applyFog(col, vWorld);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

export function createSkyMaterial() {
  return new ShaderMaterial({
    uniforms: cityUniforms,
    side: BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uMoonDir;
      uniform vec3 uFogColor;
      varying vec3 vDir;
      float hash13(vec3 p3) {
        p3 = fract(p3 * 0.1031);
        p3 += dot(p3, p3.zyx + 31.32);
        return fract((p3.x + p3.y) * p3.z);
      }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 zenith = vec3(0.002, 0.004, 0.014);
        vec3 mid = vec3(0.012, 0.018, 0.05);
        vec3 col = mix(uFogColor, mid, smoothstep(-0.02, 0.18, h));
        col = mix(col, zenith, smoothstep(0.18, 0.75, h));
        // light pollution: warm magenta glow hugging the skyline
        col += vec3(0.22, 0.07, 0.09) * exp(-max(h, 0.0) * 18.0) * 0.55;

        float md = max(dot(d, uMoonDir), 0.0);
        col += vec3(0.95, 0.97, 1.0) * smoothstep(0.99955, 0.9997, md) * 4.0;
        col += vec3(0.3, 0.42, 0.8) * pow(md, 600.0) * 1.2;
        col += vec3(0.08, 0.12, 0.28) * pow(md, 18.0) * 0.6;

        vec3 sp = d * 420.0;
        vec3 cell = floor(sp);
        float r = hash13(cell);
        vec3 star = cell + vec3(hash13(cell + 1.7), hash13(cell + 7.1), hash13(cell + 3.9));
        float dist = length(sp - star);
        float s = step(0.996, r) * smoothstep(0.35, 0.0, dist) * smoothstep(0.04, 0.3, h);
        col += vec3(0.75, 0.82, 1.0) * s * (0.6 + 0.4 * sin(uTime * (1.0 + r * 3.0) + r * 60.0)) * 1.4;

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

export function createGroundMaterial() {
  return new ShaderMaterial({
    uniforms: cityUniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vWorld;
      ${FOG_GLSL}
      void main() {
        vec3 col = vec3(0.01, 0.011, 0.016);
        // sodium glow along the avenue sidewalks and cross streets
        float ax = abs(vWorld.x);
        float avenue = step(vWorld.z, 180.0) * step(-165.0, vWorld.z);
        col += vec3(0.5, 0.28, 0.1) * exp(-pow(ax - 14.0, 2.0) * 0.05) * 0.28 * avenue;
        col += vec3(0.25, 0.25, 0.32) * exp(-ax * ax * 0.004) * 0.08 * avenue;
        gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

/** GPU-animated head/tail lights and street lamps (no per-frame CPU work). */
export function createLightPointsMaterial(pixelRatio: number) {
  return new ShaderMaterial({
    uniforms: { ...cityUniforms, uPixelRatio: { value: pixelRatio } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute vec3 aDir;
      attribute vec3 aColor;
      attribute vec2 aMotion; // x = speed (0 = static), y = loop length
      attribute float aSize;
      varying vec3 vColor;
      varying float vFog;
      uniform float uFogDensity;
      void main() {
        vec3 p = position;
        if (aMotion.x > 0.0) {
          float travel = mod(uTime * aMotion.x + dot(position, vec3(0.13, 0.0, 0.07)) * 3.0, aMotion.y);
          p += aDir * travel;
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = -mv.z;
        gl_PointSize = clamp(aSize * uPixelRatio * (260.0 / dist), 1.0, 40.0);
        vColor = aColor;
        vFog = exp(-uFogDensity * uFogDensity * dist * dist * 0.6);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vFog;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        a *= a;
        gl_FragColor = vec4(vColor * a * vFog, a);
      }
    `,
  })
}
