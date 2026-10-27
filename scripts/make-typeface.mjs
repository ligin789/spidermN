// Converts the Anton webfont (OFL, via @fontsource/anton) into a three.js
// typeface JSON so the birthday title can be extruded into real 3D letters.
// Usage: npm run make:font
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import opentype from 'opentype.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'node_modules/@fontsource/anton/files/anton-latin-400-normal.woff')
const out = resolve(root, 'public/fonts/anton.typeface.json')

const buf = readFileSync(src)
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !'’&.,-?"
const scale = 1000 / font.unitsPerEm
const r = (v) => Math.round(v * scale)
const glyphs = {}

for (const ch of chars) {
  const g = font.charToGlyph(ch)
  if (!g) continue
  let o = ''
  for (const c of g.path.commands) {
    if (c.type === 'Z') continue
    const t = c.type === 'C' ? 'b' : c.type.toLowerCase()
    o += t + ' '
    if (c.x !== undefined) o += r(c.x) + ' ' + r(c.y) + ' '
    if (c.x1 !== undefined) o += r(c.x1) + ' ' + r(c.y1) + ' '
    if (c.x2 !== undefined) o += r(c.x2) + ' ' + r(c.y2) + ' '
  }
  const bb = g.getBoundingBox()
  glyphs[ch] = { ha: r(g.advanceWidth), x_min: r(bb.x1), x_max: r(bb.x2), o: o.trim() }
}

const head = font.tables.head
const data = {
  glyphs,
  familyName: font.names.fontFamily?.en ?? 'Anton',
  ascender: r(font.ascender),
  descender: r(font.descender),
  underlinePosition: r(font.tables.post.underlinePosition),
  underlineThickness: r(font.tables.post.underlineThickness),
  boundingBox: { yMin: r(head.yMin), xMin: r(head.xMin), yMax: r(head.yMax), xMax: r(head.xMax) },
  resolution: 1000,
  original_font_information: { format: 0, copyright: 'Anton (SIL Open Font License 1.1)' },
  cssFontWeight: 'normal',
  cssFontStyle: 'normal',
}

writeFileSync(out, JSON.stringify(data))
console.log(`wrote ${out} (${Object.keys(glyphs).length} glyphs)`)
